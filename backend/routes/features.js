const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, name, category, purpose FROM features ORDER BY category, name');
      const grouped = {};
      result.rows.forEach(f => {
        if (!grouped[f.category]) grouped[f.category] = [];
        grouped[f.category].push({ id: f.id, name: f.name, purpose: f.purpose });
      });
      res.json({ features: grouped });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Features error:', error.message);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

module.exports = router;
