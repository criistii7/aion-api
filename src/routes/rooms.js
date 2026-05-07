const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roomController');

router.get('/', ctrl.getAll);
router.get('/:id/stats', ctrl.getStats);
router.get('/:id', ctrl.getOne);

module.exports = router;
