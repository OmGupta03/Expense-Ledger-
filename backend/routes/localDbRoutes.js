const express = require('express');
const router = express.Router();
const localDb = require('../localDb');

router.post('/supabase-query', async (req, res) => {
  try {
    const data = await localDb.executeQuery(req.body);
    res.json({ data, error: null });
  } catch (error) {
    console.error('Error executing local query:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
