# Firebase Setup Instructions

## Prerequisites
Before running the commands, make sure you have:
1. A Stripe account with your secret key and webhook secret
2. Node.js installed on your local machine
3. Access to your Firebase project console

## Step-by-Step Setup

### 1. Install Firebase CLI
```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```
This will open a browser window for you to authenticate with Google.

### 3. Initialize Firebase in Your Project
```bash
firebase init
```
When prompted:
- Select "Functions" and "Hosting"
- Choose "Use an existing project" and select "slop-shop"
- For Functions:
  - Choose TypeScript
  - Use ESLint: Yes
  - Install dependencies: Yes
- For Hosting:
  - Public directory: `dist`
  - Single-page app: Yes
  - Set up automatic builds: No

### 4. Install Function Dependencies
```bash
cd functions
npm install
cd ..
```

### 5. Set Stripe Configuration
Replace `your_stripe_secret_key` and `your_stripe_webhook_secret` with your actual values:

```bash
firebase functions:config:set stripe.secret_key="sk_test_..." stripe.webhook_secret="whsec_..."
```

### 6. Deploy Functions
```bash
firebase deploy --only functions
```

### 7. Configure Stripe Webhook
After deployment, you'll get a function URL like:
`https://us-central1-slop-shop.cloudfunctions.net/stripeWebhook`

Add this URL as a webhook endpoint in your Stripe Dashboard:
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint with the URL above
3. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 8. Create Stripe Product and Price
In your Stripe Dashboard:
1. Go to Products > Add Product
2. Create a product called "AI Generated T-Shirt"
3. Set price to £20.00 (one-time payment)
4. Copy the Price ID (starts with `price_`) and update it in `src/stripe-config.ts`

### 9. Enable Firebase Services
In your Firebase Console (https://console.firebase.google.com/project/slop-shop):

#### Authentication:
1. Go to Authentication > Sign-in method
2. Enable "Email/Password" provider

#### Firestore Database:
1. Go to Firestore Database
2. Create database in production mode
3. Set rules to:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own customer data
    match /customers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read their own purchase data
    match /customers/{userId}/purchases/{purchaseId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only functions can write purchase data
    }
    
    // Global purchases collection (functions only)
    match /purchases/{purchaseId} {
      allow read, write: if false; // Only functions can access
    }
  }
}
```

### 10. Deploy Your Web App
```bash
npm run build
firebase deploy --only hosting
```

## Testing Your Setup

1. **Test Authentication**: Try signing up with a new email
2. **Test Purchase**: Add items to cart and complete a purchase
3. **Check Firestore**: Verify customer and purchase documents are created
4. **Check Stripe**: Verify customers and payments appear in Stripe Dashboard

## Key Changes for Single Purchase Model

- **No Subscriptions**: Removed all subscription-related code
- **One-time Payments**: Changed to `mode: 'payment'` in Stripe config
- **Purchase History**: Added component to track individual purchases
- **Quantity Support**: Added support for multiple items in single purchase
- **Simplified Webhooks**: Only handle payment success/failure events

## Troubleshooting

### Common Issues:
- **Functions deployment fails**: Make sure billing is enabled on your Firebase project
- **Stripe webhook fails**: Verify the webhook URL and selected events
- **Authentication doesn't work**: Check that Email/Password is enabled in Firebase Auth
- **Firestore permission denied**: Verify your security rules are set correctly

### Useful Commands:
```bash
# View function logs
firebase functions:log

# Test functions locally
firebase emulators:start

# View current config
firebase functions:config:get
```