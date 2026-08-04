const express = require('express');
const router = express.Router();
const { getGroupBalances } = require('../controllers/balanceController');

router.get('/:groupId/balances', getGroupBalances);

module.exports = router;
