### Approach

#### 1. read brief and research products
In the brief, two thing jump out to me immediately
- "Payment Element, not Stripe Checkout".
- "explicit requirements — Payment Element, `pi_` ID, confirmation page"

Curiosity led me to know the Stripe Element or Stripe Checkout products.
I research on Stripe Element by youtube it. Managed to find https://www.youtube.com/watch?v=aW6AcSR1Oyg. At timestamp , the product quadrant enlightened me. It explaine well the difference and distince of a number of products, and also point out the most recommended product and the trend Stripe is asking client to adopt.
Following the clue, I navigated myself to the API doc. In https://docs.stripe.com/payments/elements, the bottom of the comparison bettween 
PaymentIntents API and the Checkout Sessions API was super clear to me. My doubts on the distinct of these 2 products are cleared. 

I evaluated them,and weighed pros and cons. 
Checkout Sessions was chosen because the line-items model maps naturally to a retail transaction, and because the extension paths a real business would want — subscriptions, tax, discounts — are native to Sessions rather than bolted on. The `pi_` requirement adds one `expand` parameter to the retrieve call: a reasonable cost. 

To ensure no misjudgement., I confirmed my understanding by google AI the distinct of two products. https://dashboard.stripe.com/acct_1Rk60rP1ydvD7zzq/apikeys, 

Continue the exploration, I navigated and arrived at this link.
https://docs.stripe.com/payments/quickstart-checkout-sessions?lang=node

#### 2. FR and NFR Analysis

#### 3a. Architecture came before code
Architecture came before code. I established trust boundaries first, then the middleware ordering constraint (webhook before `express.json()` — a hard rule, not a convention), then the client-side state machine. Getting the middleware order wrong causes silent signature verification failures that surface as Stripe errors with no obvious cause. Identifying that constraint early prevented a debugging session during the build.

#### 3b. Establish the trust boundaries
#### 3c. Data flows
#### 3d. Folder Structure
#### 3e. Key Design Decisions

#### 4a. Phase the project in a build sequence with steps
#### 4b. Dependency check, Conflict check. Reorganise move steps
#### 4c. Prioritization of Must Have, Should Have and Nice to Have
#### 4d. Incorporate Test Driven Development

#### 5. README strategy


The brief has implicit ones. The implicit requirements are where integrations fail: price must be server-side, confirmation must come from Stripe not URL params, and the code structure must support live extension. I mapped both sets before writing any code, then verified that the architecture satisfied each one.

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
