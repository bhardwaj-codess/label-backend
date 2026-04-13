// const router = require('express').Router();
// const { generatePdf } = require('../controllers/labelController');
// const auth = require('../middleware/auth');
// router.post('/pdf', auth, generatePdf);
// module.exports = router;


// routes/labelRoutes.js  (or wherever you keep routes)
const express = require('express');
const router  = express.Router();
const auth = require('../middleware/auth');
const { generatePdf } = require('../controllers/labelController');

router.post('/pdf', auth, generatePdf);   // same endpoint, new body shape

module.exports = router;