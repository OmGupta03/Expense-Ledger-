const express = require('express');
const router = express.Router();
const { recordSettlement, getGroupSettlements } = require('../controllers/settlementController');

router.post('/', recordSettlement);
router.get('/group/:groupId', getGroupSettlements);

module.exports = router;
