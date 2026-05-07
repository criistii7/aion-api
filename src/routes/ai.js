const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');

router.post('/ask', ctrl.ask);

module.exports = router;
