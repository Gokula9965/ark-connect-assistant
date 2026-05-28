/**
 * Feedback Route — Enables the AI to learn from user feedback
 * 
 * When a user gives 👍 (is_helpful = true):
 *   → The Q&A pair is saved as a "learned example" for that agent
 *   → Next time the same agent handles a question, it includes
 *     these good examples in its prompt (few-shot learning)
 * 
 * When a user gives 👎 (is_helpful = false):
 *   → Saved for admin review to identify weak areas
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.post('/', async (req, res) => {
  try {
    const { user_message, ai_response, is_helpful, agent, intent } = req.body;

    // Save feedback
    await pool.query(
      'INSERT INTO chat_feedback (user_message, ai_response, is_helpful, agent, intent) VALUES ($1, $2, $3, $4, $5)',
      [user_message, ai_response, is_helpful, agent || null, intent || null]
    );

    // If 👍 — save as a learned example for the agent (few-shot learning)
    if (is_helpful && agent) {
      // Check if this exact question already exists as a learned example
      const existing = await pool.query(
        'SELECT id FROM learned_examples WHERE agent = $1 AND user_question = $2',
        [agent, user_message]
      );

      if (existing.rows.length === 0) {
        // New learned example — truncate response to save tokens
        const shortResponse = ai_response.length > 500 
          ? ai_response.substring(0, 500) + '...' 
          : ai_response;

        await pool.query(
          'INSERT INTO learned_examples (agent, user_question, good_response) VALUES ($1, $2, $3)',
          [agent, user_message, shortResponse]
        );
        console.log(`🧠 Learned: New good example saved for "${agent}" agent`);
      } else {
        // Already learned — increment usage count
        await pool.query(
          'UPDATE learned_examples SET usage_count = usage_count + 1 WHERE id = $1',
          [existing.rows[0].id]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error.message);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

module.exports = router;
