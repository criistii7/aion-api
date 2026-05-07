const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');
const analyzeCtrl = require('../controllers/analyzeController');

router.post('/ask', ctrl.ask);
router.post('/analyze', analyzeCtrl.analyze);

module.exports = router;
