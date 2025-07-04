"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createCheckoutSession = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe_1 = require("stripe");
admin.initializeApp();
const stripe = new stripe_1.default(functions.config().stripe.secret_key, {
    apiVersion: '2023-10-16',
});
// Create Stripe checkout session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
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
        // Check if customer exists in Firestore
        const customerDoc = await admin.firestore().collection('customers').doc(userId).get();
        let customerId;
        if (customerDoc.exists) {
            customerId = customerDoc.data().stripeCustomerId;
        }
        else {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                    firebaseUID: userId,
                },
            });
            customerId = customer.id;
            // Save customer ID to Firestore
            await admin.firestore().collection('customers').doc(userId).set({
                stripeCustomerId: customerId,
                email: userEmail,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: quantity,
                },
            ],
            mode: mode,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                firebaseUID: userId,
                quantity: quantity.toString(),
            },
        });
        return { url: session.url };
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        throw new functions.https.HttpsError('internal', 'Unable to create checkout session');
    }
});
// Handle Stripe webhooks
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = functions.config().stripe.webhook_secret;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Webhook processing failed');
    }
});
async function handleCheckoutSessionCompleted(session) {
    var _a;
    const firebaseUID = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
    if (!firebaseUID)
        return;
    // For one-time payments, record the purchase
    if (session.mode === 'payment') {
        await recordPurchase(firebaseUID, session);
    }
}
async function handlePaymentSucceeded(paymentIntent) {
    console.log('Payment succeeded for payment intent:', paymentIntent.id);
    // Additional logic for successful payments can be added here
}
async function handlePaymentFailed(paymentIntent) {
    console.log('Payment failed for payment intent:', paymentIntent.id);
    // Additional logic for failed payments can be added here
}
async function recordPurchase(userId, session) {
    var _a;
    const purchaseData = {
        sessionId: session.id,
        customerId: session.customer,
        amountTotal: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        quantity: parseInt(((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.quantity) || '1'),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Create a new purchase document
    await admin.firestore().collection('purchases').add(Object.assign({ userId }, purchaseData));
    // Also add to user's purchases subcollection for easy querying
    await admin.firestore()
        .collection('customers')
        .doc(userId)
        .collection('purchases')
        .doc(session.id)
        .set(purchaseData);
}
//# sourceMappingURL=index.js.map