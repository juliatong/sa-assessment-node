# Take home project
A simple e-commerce application using Stripe Custom Checkout with the Payment Element.

## Application overview
Written in Node.js with the [Express framework](https://expressjs.com/). Uses Stripe's Custom Checkout (`ui_mode: 'custom'`) to render the Payment Element and collect payments.

## Setup

### Prerequisites
- Node.js
- A Stripe account with test API keys ([sign up free](https://dashboard.stripe.com/register))

### Installation

Clone and install dependencies:

```
git clone https://github.com/mattmitchell6/sa-takehome-project-node && cd sa-takehome-project-node
npm install
```

Copy `sample.env` to `.env` and populate with your Stripe test API keys:

```
cp sample.env .env
```

Your `.env` file needs:
- `STRIPE_SECRET_KEY` — from the Stripe Dashboard → Developers → API keys
- `STRIPE_PUBLISHABLE_KEY` — from the Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from the Stripe CLI or Dashboard webhook endpoint
- `BASE_URL` — `http://localhost:3000` for local development

### Run the app

```
npm start
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the shop.

### Run tests

```
npm test
```

## Webhook setup

To test webhooks locally, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```
stripe listen --forward-to localhost:3000/webhook
```

Copy the webhook signing secret output by the CLI into your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Test card

Use Stripe's test card number to complete a payment:

| Field | Value |
|-------|-------|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date |
| CVC | Any 3 digits |
