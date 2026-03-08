# Writeup

## Approach

### 1. Product Research

Reading the brief, two things stood out to me in the brief immediately:
- "Payment Element, not Stripe Checkout"
- Explicit requirements: Payment Element, `pi_` ID, confirmation page

Curiosity led me wonder about these two products mentioned. I started with youtube. This YouTube I found ([link](https://www.youtube.com/watch?v=aW6AcSR1Oyg)). It gave me a clear idea of the Stripe product landscape, and helped orient me — the product quadrant at 15:01 explained the differences and distinctions well, and the integration option matrix at 15:06 made the trade-offs concrete.

From there I went to the API docs. The [Elements comparison page](https://docs.stripe.com/payments/elements) settled my remaining questions about PaymentIntents API vs Checkout Sessions API.

I chose **Checkout Sessions API** because the line-items model maps naturally to a retail transaction, and because the extension paths a real business would want — subscriptions, tax, discounts — are native to Sessions rather than bolted on. The `pi_` requirement adds one `expand` parameter to the retrieve call: a reasonable cost.

### 2. Functional and Non Functional Requirements Analysis

Beyond the explicit requirements, the brief has implicit ones. These are where integrations typically fail:

- Price must originate server-side — never from URL params or client input
- Payment confirmation must come from Stripe, not reconstructed from query strings
- Code structure must support live extension without major refactoring

I mapped both sets before writing any code.

### 3. Architecture Before Code

Architecture came before code. I started with establishing trust boundaries first, then the middleware ordering constraint (webhook before `express.json()` — a hard rule, not a convention), then the client-side state machine.

Getting the middleware order wrong causes silent signature verification failures that surface as Stripe errors with no obvious cause. Identifying that constraint early prevented a debugging session during the build.

### 4. Phased Build with TDD

I phased the project into steps with explicit dependency ordering and conflict checks, organized by Must Have / Should Have / Nice to Have priority. Each phase built on verified outputs from the last — pure functions first, then routes, then client-side JS, then the webhook.

Tests were written alongside each module rather than after, so regressions surfaced immediately and the test suite served as a living spec.

### 5.README strategy
Before writing README.md, I asked myself a question who potentially will be reading it, and what do helps them the most. I indentified two roles, evaluator on the business side and developer. I ensure this doc is useful to them by including the potential questions they might have about this App.

---

## Challenges

### Stripe API doc being too GOOD, and Stripe AI Assistant 

The [Checkout Sessions AP Quickstart](https://docs.stripe.com/payments/quickstart-checkout-sessions) comphrehensiveness and "Integrate in vs code" didn't help with the urge/tendency to jump in the code and start building immediately. When I applied the code in the boilerplate code, fortunately it didn't work with simple copy-paste. 

**Resolution:** After 2-3 fix attempts, I took a step back and started thinking how I should REALLY approach this problem. What are the steps to take to arrive a clarity of what to build.

### Conventions from boilerplate code
After the Architecture is done, I mapped out the file structure. By looking at the existing code structure, did I learn the conventional structure for express-handlebars, and iterated my file structure. 

**Resolution:** 
Fortunately, the file structure I have designed overall extends the existing code. There will be a decision to make had the boilerplate code been much more different from my idea file structure. It might require an additional step to restrcuture the exisiting files first.

### Middleware ordering for webhook signature verification

`stripe.webhooks.constructEvent()` requires the raw, unparsed request body. `express.json()` was already present in the boilerplate and consumes the body before the route handler sees it. If the webhook route is registered after `express.json()`, `constructEvent()` always throws — but the error message points at the signature, not the body parser. The root cause is not obvious.

**Resolution:** Register the webhook route with `express.raw({ type: 'application/json' })` in `app.js` above the existing `express.json()` line. In production, this failure mode means webhook events are silently rejected with no alert unless you monitor response codes in the Dashboard.

### Stripe SDK version incompatibility

The boilerplate ships with `stripe@^8.137.0` (2021). The `ui_mode: 'custom'` parameter on Checkout Sessions was introduced after v8. Calling `sessions.create({ ui_mode: 'custom' })` on v8 throws `"Received unknown parameter: ui_mode"` — a confusing error that looks like a typo rather than a version issue.

**Resolution:** `npm install stripe@latest` upgrades to v17, which supports the full Checkout Sessions API. The boilerplate's `express-handlebars@^5.2.1` was deliberately not upgraded — its v5 constructor API (`exphbs()`) is used directly in `app.js` and v6 is a breaking change.

### Stripe.js client API — `initCheckout` is now synchronous

The Stripe.js docs show `stripe.initCheckout()` as synchronous in the current version, but older examples and some third-party implementations still `await` it. More importantly, `createPaymentElement()` lives on the `checkout` object directly, while `confirm()` and `updateEmail()` live on the `actions` object returned by the async `checkout.loadActions()`. Conflating these two objects causes either a missing Payment Element (if you call `actions.createPaymentElement()`) or an uncallable confirm (if you skip `loadActions()`). The split is intentional: Element creation can happen before actions are loaded; confirmation must wait for them.

### Bridging server values to static client JavaScript

The checkout page is server-rendered (Handlebars), but `public/checkout.js` is a static file that cannot read template variables directly. `publishableKey` and `bookId` must reach the client without being hardcoded in a public asset.

**Resolution:** The server renders both values as `data-*` attributes on the form element; `checkout.js` reads them from the DOM on load.

---

## Documentation Used

**Custom checkout — `ui_mode: 'custom'`**
Confirmed `ui_mode: 'custom'` as the correct parameter for embedding a Payment Element on a custom page, distinct from hosted Stripe Checkout. Confirmed the current client-side API: `stripe.initCheckout()` is synchronous; `checkout.createPaymentElement()` lives on the checkout object; `checkout.loadActions()` is async and gates `actions.confirm()` and `actions.updateEmail()`.

**Checkout Session object reference**
`https://docs.stripe.com/api/checkout/sessions/object`
Located `session.status` values (`'complete'`, `'open'`) and confirmed that `payment_intent` is a string ID without expand — an object only when `expand: ['payment_intent']` is passed. This distinction is invisible in test mocks, which is why the expand parameter is explicitly asserted in the test suite.

**Checkout Sessions create reference**
`https://docs.stripe.com/api/checkout/sessions/create`
Confirmed `metadata`, `return_url` template variable (`{CHECKOUT_SESSION_ID}`), `ui_mode: 'custom'`, and `line_items` with `price_data` as the correct pattern for dynamic pricing without pre-creating Price objects.

**Stripe.js custom checkout changelog**
`https://docs.stripe.com/checkout/elements-with-checkout-sessions-api/changelog`
Critical: confirmed that `initCheckout()` became synchronous in a recent breaking change. Also confirmed error shape for `actions.confirm()`: `{ type: 'error', error }`.


**Test card numbers**
`https://docs.stripe.com/testing`
Cards used: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline), `4000 0000 0000 3155` (3DS).
