/**
 * Client-side checkout state machine using Stripe Custom Checkout.
 *
 * Phase 1 (sync): initCheckout → createPaymentElement → mount
 * Phase 2 (async): loadActions → actions.updateEmail / actions.confirm
 */
(async function () {
  const form = document.getElementById('payment-form');
  const publishableKey = form.dataset.publishableKey;
  const bookId = form.dataset.bookId;
  const errorEl = document.getElementById('payment-error');
  const submitBtn = document.getElementById('submit-btn');

  // Create a Checkout Session and get the clientSecret
  const response = await fetch('/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId })
  });
  const { clientSecret, error: serverError } = await response.json();

  if (serverError) {
    showError(serverError);
    return;
  }

  // Phase 1: sync init
  const stripe = Stripe(publishableKey);
  const checkout = await stripe.initCheckout({ clientSecret });

  const paymentElement = checkout.createPaymentElement();
  paymentElement.mount('#payment-element');

  // Phase 2: load actions
  let actions
  const loadActionsResult = await checkout.loadActions();
  if (loadActionsResult.type === 'success') {
    actions = loadActionsResult.actions;
  }  
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    hideError();

    // Update email
    const email = document.getElementById('email').value;
    const { error: emailError } = await actions.updateEmail(email);
    if (emailError) {
      showError(emailError.message);
      submitBtn.disabled = false;
      return;
    }

    // Confirm payment
    const { type, error: confirmError } = await actions.confirm();
    if (type === 'error') {
      showError(confirmError.message);
      submitBtn.disabled = false;
      return;
    }
    // On success, Stripe redirects to return_url automatically
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function hideError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
})();
