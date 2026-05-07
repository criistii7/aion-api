const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);

module.exports = router;
