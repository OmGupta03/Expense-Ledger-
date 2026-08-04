const express = require('express');
const router = express.Router();
const { sendMessage, getExpenseChat } = require('../controllers/chatController');

router.post('/', sendMessage);
router.get('/expense/:expenseId', getExpenseChat);

module.exports = router;
