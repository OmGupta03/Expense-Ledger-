const express = require('express');
const router = express.Router();
const {
  addExpense,
  getGroupExpenses,
  getExpenseDetails,
  deleteExpense
} = require('../controllers/expenseController');

router.post('/', addExpense);
router.get('/group/:groupId', getGroupExpenses);
router.get('/:expenseId', getExpenseDetails);
router.delete('/:expenseId', deleteExpense);

module.exports = router;
