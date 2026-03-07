const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const formatAmount = require('../lib/formatAmount');

router.get('/', async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId) {
    return res.redirect('/');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent']
  });

  if (session.status !== 'complete') {
    return res.redirect('/');
  }

  res.render('success', {
    pi_id: session.payment_intent.id,
    amount: formatAmount(session.payment_intent.amount)
  });
});

module.exports = router;
