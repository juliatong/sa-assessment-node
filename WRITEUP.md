### Approach

#### 1. read brief and research products
In the brief, two thing jump out to me immediately
- "Payment Element, not Stripe Checkout".
- explicit requirements — Payment Element, `pi_` ID, confirmation page

I had no knowledge on Stripe Element or Stripe Checkout. Curiosity led me to wanting to know the products.
I research on Stripe Element by youtube it. Managed to find https://www.youtube.com/watch?v=aW6AcSR1Oyg. At timestap , the product quadrant enlightened me. It explaine well the difference and distince of a number of products, and also point out the most recommended product and the trend Stripe is asking client to adopt.
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
