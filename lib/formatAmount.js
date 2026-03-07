/**
 * Formats a Stripe amount (integer cents) as a dollar string.
 * e.g. 2300 → "$23.00"
 */
function formatAmount(cents) {
  return '$' + (cents / 100).toFixed(2);
}

module.exports = formatAmount;
