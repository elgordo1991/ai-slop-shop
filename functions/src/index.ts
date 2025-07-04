import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-08-16',
});

// Create Stripe checkout session
export const createCheckoutSession = functions
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { priceId, mode, successUrl, cancelUrl, quantity = 1 } = data;

    if (!priceId || !mode || !successUrl || !cancelUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    try {
      const userId = context.auth.uid;
      const userEmail = context.auth.token.email;

      const customerDoc = await admin.firestore().collection('customers').doc(userId).get();
      let customerId: string;

      if (customerDoc.exists) {
        customerId = customerDoc.data()!.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            firebaseUID: userId,
          },
        });

        customerId = customer.id;

        await admin.firestore().collection('customers').doc(userId).set({
          stripeCustomerId: customerId,
          email: userEmail,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: quantity,
          },
        ],
        mode: mode as 'payment' | 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          firebaseUID: userId,
          quantity: quantity.toString(),
        },
      });

      return { url: session.url };
    } catch (error: any) {
  console.error('🔥 Stripe session creation failed:', error.message, error.stack);
  throw new functions.https.HttpsError('internal', 'Unable to create checkout session');
}
  });

// Handle Stripe webhooks
export const stripeWebhook = functions
  .https.onRequest(async (req: functions.Request, res: functions.Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = functions.config().stripe.webhook_secret;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Webhook processing failed');
    }
  });

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const firebaseUID = session.metadata?.firebaseUID;
  if (!firebaseUID) return;

  if (session.mode === 'payment') {
    await recordPurchase(firebaseUID, session);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded for payment intent:', paymentIntent.id);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed for payment intent:', paymentIntent.id);
}

async function recordPurchase(userId: string, session: Stripe.Checkout.Session) {
  const purchaseData = {
    sessionId: session.id,
    customerId: session.customer,
    amountTotal: session.amount_total,
    currency: session.currency,
    status: session.payment_status,
    quantity: parseInt(session.metadata?.quantity || '1'),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection('purchases').add({
    userId,
    ...purchaseData,
  });

  await admin.firestore()
    .collection('customers')
    .doc(userId)
    .collection('purchases')
    .doc(session.id)
    .set(purchaseData);
}