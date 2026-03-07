# Stripe Bookstore — SA Take-Home

> **Evaluating this submission?** Start at [How It Works](#how-it-works)
> **Setting up the app?** Jump to [Setup](#setup)

---

## Technical Overview


---

### Approach

The brief has explicit requirements — Payment Element, `pi_` ID, confirmation page — and implicit ones. The implicit requirements are where integrations fail: price must be server-side, confirmation must come from Stripe not URL params, and the code structure must support live extension. I mapped both sets before writing any code, then verified that the architecture satisfied each one.

I evaluated the PaymentIntents API and the Checkout Sessions API against the brief. Both satisfy "Payment Element, not hosted Checkout" — that distinction is about UI, not backend API. Checkout Sessions was chosen because the line-items model maps naturally to a retail transaction, and because the extension paths a real business would want — subscriptions, tax, discounts — are native to Sessions rather than bolted on. The `pi_` requirement adds one `expand` parameter to the retrieve call: a reasonable cost.

Architecture came before code. I established trust boundaries first, then the middleware ordering constraint (webhook before `express.json()` — a hard rule, not a convention), then the client-side state machine. Getting the middleware order wrong causes silent signature verification failures that surface as Stripe errors with no obvious cause. Identifying that constraint early prevented a debugging session during the build.

---

### Overview

A server-rendered Node.js bookstore that processes payments using Stripe's Checkout Sessions API with `ui_mode: 'custom'`, embedding a Payment Element on a custom-branded checkout page.

Checkout Sessions was chosen over the PaymentIntents API directly because it models the purchase as a line-items transaction from the start — meaning subscriptions, tax, and discounts become configuration changes rather than rewrites. The `pi_` ID the brief requires is accessible via `expand: ['payment_intent']` on session retrieval: a one-parameter addition rather than a reason to avoid the API.

The implementation exposes the full payment lifecycle deliberately: server-side session creation enforces price integrity, client-side Element mounting keeps card data off our servers, and server-side result verification means the confirmation page cannot be spoofed by crafting a fake success URL.

Order fulfillment is stubbed. In production it belongs in the `checkout.session.completed` webhook handler — not in the redirect — because the redirect is not guaranteed to complete if the browser closes after payment.

---

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  BROWSER                                                 │
│                                                          │
│  views/index.hbs         catalog                         │
│  views/checkout.hbs      shell + data attrs + Element    │
│  views/success.hbs       pi_ ID + amount                 │
│  views/error.hbs         fatal error display             │
│                                                          │
│  public/checkout.js      client-side state machine       │
│  https://js.stripe.com/v3/  Stripe.js (CDN, PCI)         │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼───────────────────────────────────┐
│  EXPRESS SERVER                                          │
│                                                          │
│  app.js          middleware stack, route mounting        │
│  server.js       app.listen() only                       │
│                                                          │
│  routes/catalog.js    GET /                              │
│  routes/checkout.js   GET /checkout + POST /checkout     │
│  routes/success.js    GET /success                       │
│  routes/webhook.js    POST /webhook                      │
│                                                          │
│  data/books.js        catalog + getBookById()            │
│  lib/formatAmount.js  cents → "$23.00"                   │
│  config/stripe.js     Stripe SDK singleton               │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS (Stripe Node SDK)
┌──────────────────────▼───────────────────────────────────┐
│  STRIPE                                                  │
│  Checkout Sessions API   create + retrieve               │
│  Payment Element         iframe, rendered client-side    │
│  Webhooks                checkout.session.completed      │
└──────────────────────────────────────────────────────────┘
```

**The trust boundary between the Application and Browser layers is the most important line in the diagram.** Everything the server trusts — prices, session status, payment amounts — lives above it. Everything that could be manipulated by a user lives below it.

**Design decisions:**

**D1 — app.js / server.js split.**
`app.listen()` lives in `server.js` only. Tests import `app.js` directly without starting a real server — no port conflicts, no test pollution.

**D2 — config/stripe.js singleton.**
One Stripe initialisation shared by all routes. One `jest.mock('../config/stripe')` call intercepts all routes simultaneously.

**D3 — Data attributes for server-to-client bridging.**
`publishableKey` and `bookId` are injected as `data-*` attributes by the Handlebars template. `public/checkout.js` reads them from the DOM. Neither value is hardcoded in a static file.

**D4 — Session created on page load, not Pay click.**
`stripe.initCheckout()` is synchronous, but `checkout.loadActions()` — which gates the Pay button — takes time. Triggering the full sequence on Pay click forces a visible delay after the user clicks. Orphaned sessions from page refreshes expire in 24 hours. The UX cost outweighs the Dashboard noise.

**D5 — `metadata: { bookId }` on every session.**
Stored at session creation so the success route can redirect back to the correct checkout page when `session.status` is `'open'`. Zero extra API calls.

**D6 — `formatAmount` isolated in `lib/`.**
Pure function, no Stripe dependency, unit testable in isolation. Single call site: the success route.

---

### How It Works

Stripe is not a payment form you submit. It is a state machine you coordinate with. A Checkout Session is a server-side object that exists before the user sees any payment UI. The application's job is to create that object, hand the client a token to interact with it, and verify the result server-side. Everything flows from this model.

**1. User selects a book**

The catalog renders from `data/books.js` on the server. Prices never reach the client — they are looked up server-side at session creation time. A user editing a request in DevTools cannot change the amount Stripe charges because the client never sends a price.

**2. Checkout page loads as a shell**

The server renders the page with book details and two critical data attributes on a container div: `data-publishable-key` and `data-book-id`. These bridge server template values to the static client-side JavaScript file without hardcoding either value in a public asset.

**3. Session creation (on page load)**

Client-side JavaScript reads the data attributes and calls `POST /checkout` with the `bookId`. The server looks up the price, creates a Checkout Session with `ui_mode: 'custom'`, and returns the `client_secret`. The `client_secret` travels in a JSON response body only — never in a URL, HTML attribute, or log.

```
POST /checkout { bookId: "1" }
→ stripe.checkout.sessions.create({
    ui_mode: 'custom',
    line_items: [{ price_data: { unit_amount: 2300, ... }, quantity: 1 }],
    mode: 'payment',
    metadata: { bookId },
    return_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`
  })
→ { clientSecret: "cs_test_..." }
```

**4. Payment Element mounts**

The client calls `stripe.initCheckout({ clientSecret })` (synchronous), then `checkout.createPaymentElement()` and mounts it. `checkout.loadActions()` is then called asynchronously — the Pay button is enabled only after this resolves successfully. Card data never touches our server.

**5. Payment submission**

User enters email and card details, then clicks Pay. The client calls `actions.updateEmail(email)` followed by `actions.confirm()`. Stripe processes the payment and redirects the browser to the `return_url`, replacing `{CHECKOUT_SESSION_ID}` with the actual `cs_xxx` value.

**6. Server-side confirmation**

```
GET /success?session_id=cs_xxx
→ stripe.checkout.sessions.retrieve(session_id, {
    expand: ['payment_intent']
  })
→ session.status === 'complete'
→ render success with:
    pi_id:  session.payment_intent.id    // pi_xxx
    amount: formatAmount(session.payment_intent.amount)  // "$23.00"
```

Both values come from Stripe's API. A user crafting a fake `/success?session_id=fake` URL would see an error because the session status would not be `'complete'`.

**7. Webhook (fulfillment path)**

Stripe fires `checkout.session.completed` independently of the browser redirect. In production, this is where order fulfillment lives. The handler is stubbed here with an explanation — not omitted.

---


### Documentation Used

**Custom checkout — ui_mode: 'custom'**
`https://docs.stripe.com/checkout/custom`
Confirmed `ui_mode: 'custom'` as the correct parameter for embedding a Payment Element on a custom page, distinct from hosted Stripe Checkout. Confirmed the current client-side API: `stripe.initCheckout()` is synchronous; `checkout.createPaymentElement()` lives on the checkout object; `checkout.loadActions()` is async and gates `actions.confirm()` and `actions.updateEmail()`.

**Checkout Session object reference**
`https://docs.stripe.com/api/checkout/sessions/object`
Located `session.status` values (`'complete'`, `'open'`) and confirmed that `payment_intent` is a string ID without expand — an object only when `expand: ['payment_intent']` is passed. This distinction is invisible in test mocks, which is why the expand parameter is explicitly asserted in the test suite.

**Checkout Sessions create reference**
`https://docs.stripe.com/api/checkout/sessions/create`
Confirmed `metadata`, `return_url` template variable (`{CHECKOUT_SESSION_ID}`), `ui_mode: 'custom'`, and `line_items` with `price_data` as the correct pattern for dynamic pricing without pre-creating Price objects.

**Stripe.js custom checkout changelog**
`https://docs.stripe.com/checkout/elements-with-checkout-sessions-api/changelog`
Critical: confirmed that `initCheckout()` became synchronous in a recent breaking change. Without this, `await stripe.initCheckout()` still works but masks the architecture. Also confirmed error shape for `actions.confirm()`: `{ type: 'error', error }`.

**Webhook signature verification**
`https://docs.stripe.com/webhooks/signature-verification`
Confirmed `express.raw()` body parser requirement before `constructEvent()`. Located `stripe.webhooks.generateTestHeaderString()` for test suite.

**Test card numbers**
`https://docs.stripe.com/testing`
Cards used: `4242...` (success), `4000...0002` (decline), `4000...3155` (3DS).

---

### Challenges

**Middleware ordering for webhook signature verification**

`stripe.webhooks.constructEvent()` requires the raw unparsed request body. `express.json()` was already present in the boilerplate and consumes the body before the route handler sees it. If the webhook route is registered after `express.json()`, `constructEvent()` always throws — but the error message points at the signature, not the body parser. The root cause is not obvious. Resolution: register the webhook route with `express.raw({ type: 'application/json' })` in `app.js` above the existing `express.json()` line. In production, this failure mode means webhook events are silently rejected with no alert unless you are monitoring response codes in the Dashboard.

**Stripe SDK version incompatibility**

The boilerplate ships with `stripe@^8.137.0` (2021). The `ui_mode: 'custom'` parameter on Checkout Sessions was introduced after v8. `sessions.create({ ui_mode: 'custom' })` on v8 throws `"Received unknown parameter: ui_mode"` — a confusing error that looks like a typo rather than a version issue. Resolution: `npm install stripe@latest` upgrades to v17 which supports the full Checkout Sessions API. The boilerplate's `express-handlebars@^5.2.1` was deliberately not upgraded — its v5 constructor API (`exphbs()`) is used directly in `app.js` and v6 is a breaking change.

**Stripe.js client API — initCheckout is now synchronous**

The Stripe.js docs show `stripe.initCheckout()` as synchronous in the current version, but older examples and some third-party implementations still use `await`. More importantly, `createPaymentElement()` lives on the `checkout` object directly, while `confirm()` and `updateEmail()` live on the `actions` object returned by the async `checkout.loadActions()`. Conflating these two objects causes either a missing Payment Element (if you call `actions.createPaymentElement()`) or an uncallable confirm (if you skip `loadActions()`). The split is intentional: Element creation can happen before actions are loaded; confirmation must wait for them.

**Bridging server values to static client JavaScript**

The checkout page is server-rendered (Handlebars), but `public/checkout.js` is a static file that cannot read template variables directly. `publishableKey` and `bookId` must reach the client without being hardcoded in a public asset. Resolution: the server renders both values as `data-*` attributes on a container div; `checkout.js` reads them from the DOM on `DOMContentLoaded`.

---

### Extending This App

**Webhook fulfillment**
The `routes/webhook.js` handler is stubbed. Adding fulfillment — receipt email, database write, inventory update — means adding code in one place under `checkout.session.completed`. Add an idempotency check first: Stripe may deliver the same event more than once.

**Subscriptions**
Change `mode: 'payment'` to `'subscription'` in `routes/checkout.js` and update `line_items` to reference a recurring Price object. Add `customer` or `customer_email` to the session. The success route, webhook handler, and all frontend code are unchanged.

**Automatic tax**
Add `automatic_tax: { enabled: true }` to `sessions.create()`. One line. Stripe handles rate lookup and calculation. Configure tax settings in the Dashboard.

**Radar fraud rules**
`metadata: { bookId }` is already on every session. Radar rules in the Dashboard can act on metadata values with no code changes.

**Stripe Connect (marketplace)**
Add `application_fee_amount` and `transfer_data: { destination: connectedAccountId }` to `sessions.create()`. Everything else is unchanged.

---

### Production Considerations

**Fulfillment belongs in the webhook, not the redirect.**
This application renders a success page on the `/success` redirect. In production, order fulfillment must be triggered by `checkout.session.completed`. The browser may close after payment but before the redirect completes. The webhook fires regardless.

**Webhook secret rotation.**
The `whsec_` from `stripe listen` changes every time the CLI restarts. In production, use the signing secret from the Stripe Dashboard (Developers → Webhooks → your endpoint). Store it in a secrets manager.

**Idempotency.**
Stripe may deliver the same webhook event more than once. The `checkout.session.completed` handler must be idempotent — check whether the order has already been fulfilled before processing.

**HTTPS.**
Stripe requires HTTPS for the `return_url` and webhook endpoint in production. Update `BASE_URL` to the production domain.

---

## Setup and Running

---

### Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | v18 or higher |
| Stripe account | Free — test mode is sufficient |
| Stripe CLI | Required for local webhook testing |

Get Stripe CLI: https://docs.stripe.com/stripe-cli

---

### Setup

```bash
git clone <repository-url>
cd <repository-name>
npm install
cp sample.env .env
```

Open `.env` and fill in your Stripe test API keys:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # see Local Webhooks below
BASE_URL=http://localhost:3000
```

Get your API keys from the Stripe Dashboard → Developers → API Keys.

```bash
npm start
```

Visit `http://localhost:3000`

---

### Running Tests

```bash
npm test
```

Tests mock the Stripe SDK — no `.env` file required. All tests pass on a clean clone without any environment setup.

| File | What it covers |
|---|---|
| `tests/unit/books.test.js` | Catalog lookup, edge cases, type coercion |
| `tests/unit/formatAmount.test.js` | Cents-to-dollars formatting |
| `tests/integration/catalog.test.js` | GET / renders correctly |
| `tests/integration/checkout.test.js` | GET and POST /checkout, price integrity |
| `tests/integration/success.test.js` | Session status handling, expand param assertion |
| `tests/integration/webhook.test.js` | Signature verification |

---

### Local Webhooks

```bash
stripe login
stripe listen --forward-to localhost:3000/webhook
```

Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in your `.env` file. Restart `npm start`.

> **Note:** The `whsec_` value changes every time you restart `stripe listen`. Re-paste it each time.

```bash
stripe trigger checkout.session.completed
# Terminal should show: POST /webhook 200
```

---

### Test Cards

Use any future expiry date and any 3-digit CVC.

| Card Number | Scenario | Expected Behaviour |
|---|---|---|
| `4242 4242 4242 4242` | Success | Redirects to success page with `pi_` and amount |
| `4000 0000 0000 0002` | Card declined | Error message in checkout page, Pay button re-enabled |
| `4000 0025 0000 3155` | 3DS required | Auth modal; complete → success, cancel → error |

Full test card reference: https://docs.stripe.com/testing
