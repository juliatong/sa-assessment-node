const express = require('express');
const router = express.Router();
const { books } = require('../data/books');

router.get('/', (req, res) => {
  res.render('index', { books });
});

module.exports = router;
