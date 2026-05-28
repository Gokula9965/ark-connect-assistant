const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT question, category FROM faqs ORDER BY RANDOM() LIMIT 6');
      const suggestions = result.rows.map(r => ({ question: r.question, category: r.category }));
      res.json({ suggestions });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Suggestions error:', error.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

module.exports = router;
