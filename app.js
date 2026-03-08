const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');

var app = express();

app.locals.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

// view engine setup (Handlebars)
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

// Webhook must be before express.json() — needs raw body for signature verification
app.use('/webhook', require('./routes/webhook'));

app.use(express.urlencoded({ extended: true }))
app.use(express.json({}));

app.use('/', require('./routes/catalog'));

app.use('/checkout', require('./routes/checkout'));

app.use('/success', require('./routes/success'));

// Fatal error handler — renders error.hbs
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: err.message || 'An unexpected error occurred.' });
});

module.exports = app;
