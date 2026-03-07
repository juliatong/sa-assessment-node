const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const books = require('../data/books');

router.get('/', (req, res) => {
  const bookId = parseInt(req.query.bookId, 10);
  const book = books.find(b => b.id === bookId);

  if (!book) {
    return res.status(404).render('index', { books, error: 'Book not found.' });
  }

  res.render('checkout', {
    bookId: book.id,
    title: book.title,
    amount: book.price,
    publishableKey: req.app.locals.publishableKey
  });
});

router.post('/', async (req, res) => {
  const bookId = parseInt(req.body.bookId, 10);
  const book = books.find(b => b.id === bookId);

  if (!book) {
    return res.status(400).json({ error: 'Book not found.' });
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'custom',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: book.title },
          unit_amount: book.price
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    return_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`
  });

  res.json({ clientSecret: session.client_secret });
});

module.exports = router;
