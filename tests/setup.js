// Set required env vars for tests — no .env file needed
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
process.env.BASE_URL = 'http://localhost:3000';
