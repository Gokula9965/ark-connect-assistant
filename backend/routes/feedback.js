/**
 * Feedback Route — Enhanced Feedback-Driven Learning
 * 
 * Supports both user feedback and admin corrections:
 * 
 * POST /api/feedback — User submits 👍 or 👎
 *   👍 → Saves as learned example (with semantic dedup)
 *   👎 → Saves for admin review + optional correction
 * 
 * POST /api/feedback/:id/correct — Admin corrects a bad answer
 *   → Saves correction in chat_feedback
 *   → Promotes correction to learned_examples
 * 
 * GET /api/feedback/review — Get pending negative feedback for admin review
 * 
 * GET /api/feedback/analytics — Feedback analytics per agent
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { checkSemanticDuplicate } = require('../services/learningService');

/**
 * POST / — Submit user feedback (👍 or 👎)
 */
router.post('/', async (req, res) => {
  try {
    const { user_message, ai_response, is_helpful, agent, intent } = req.body;

    // Save feedback (with new correction columns defaulting to NULL)
    await pool.query(
      'INSERT INTO chat_feedback (user_message, ai_response, is_helpful, agent, intent) VALUES ($1, $2, $3, $4, $5)',
      [user_message, ai_response, is_helpful, agent || null, intent || null]
    );

    // If 👍 — save as a learned example for the agent (with semantic dedup)
    if (is_helpful && agent) {
      const { isDuplicate, existingId, similarity } = await checkSemanticDuplicate(agent, user_message);

      if (isDuplicate && existingId) {
        // Semantically similar example exists — increment usage count
        await pool.query(
          'UPDATE learned_examples SET usage_count = usage_count + 1 WHERE id = $1',
          [existingId]
        );
        console.log(`🧠 Similar example exists (sim: ${similarity.toFixed(2)}), incremented usage`);
      } else {
        // New learned example — truncate response to save tokens
        const shortResponse = ai_response.length > 500
          ? ai_response.substring(0, 500) + '...'
          : ai_response;

        // Try to generate embedding for the learned example
        let embedding = null;
        try {
          const { generateEmbedding } = require('../services/embeddingService');
          embedding = await generateEmbedding(user_message);
        } catch (embErr) {
          console.log(`   ⚠️ Could not embed learned example: ${embErr.message}`);
        }

        await pool.query(
          `INSERT INTO learned_examples (agent, user_question, good_response, source, embedding) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            agent,
            user_message,
            shortResponse,
            'user_feedback',
            embedding ? `[${embedding.join(',')}]` : null,
          ]
        );
        console.log(`🧠 Learned: New good example saved for "${agent}" agent`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error.message);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * POST /:id/correct — Admin corrects a bad answer
 * 
 * Body: { correction: string, correction_note?: string }
 * 
 * This promotes the corrected answer to learned_examples so the
 * agent actively uses it in future responses.
 */
router.post('/:id/correct', async (req, res) => {
  try {
    const { id } = req.params;
    const { correction, correction_note } = req.body;

    if (!correction) {
      return res.status(400).json({ error: 'Correction text is required' });
    }

    // Update the feedback record with the correction
    const result = await pool.query(
      `UPDATE chat_feedback 
       SET correction = $1, correction_note = $2, reviewed = true, reviewed_at = NOW()
       WHERE id = $3
       RETURNING user_message, agent`,
      [correction, correction_note || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const { user_message, agent } = result.rows[0];

    // Promote the correction to learned_examples
    if (agent) {
      const shortCorrection = correction.length > 500
        ? correction.substring(0, 500) + '...'
        : correction;

      // Generate embedding for the corrected answer
      let embedding = null;
      try {
        const { generateEmbedding } = require('../services/embeddingService');
        embedding = await generateEmbedding(user_message);
      } catch (embErr) {
        console.log(`   ⚠️ Could not embed correction: ${embErr.message}`);
      }

      // Check if a learned example already exists for this question
      const existing = await pool.query(
        'SELECT id FROM learned_examples WHERE agent = $1 AND user_question = $2',
        [agent, user_message]
      );

      if (existing.rows.length > 0) {
        // Update existing with the admin correction (higher quality)
        await pool.query(
          `UPDATE learned_examples 
           SET good_response = $1, source = 'admin_correction', embedding = $2
           WHERE id = $3`,
          [shortCorrection, embedding ? `[${embedding.join(',')}]` : null, existing.rows[0].id]
        );
      } else {
        // Insert new learned example from admin correction
        await pool.query(
          `INSERT INTO learned_examples (agent, user_question, good_response, source, embedding) 
           VALUES ($1, $2, $3, 'admin_correction', $4)`,
          [agent, user_message, shortCorrection, embedding ? `[${embedding.join(',')}]` : null]
        );
      }

      console.log(`✅ Admin correction promoted to learned_examples for "${agent}"`);
    }

    res.json({ success: true, message: 'Correction saved and promoted to knowledge base' });
  } catch (error) {
    console.error('Correction error:', error.message);
    res.status(500).json({ error: 'Failed to save correction' });
  }
});

/**
 * GET /review — Get negative feedback pending admin review
 * 
 * Query params:
 *   agent (optional) — filter by agent
 *   limit (optional) — max results (default 20)
 */
router.get('/review', async (req, res) => {
  try {
    const { agent, limit = 20 } = req.query;

    let query = `
      SELECT id, user_message, ai_response, agent, intent, 
             correction, correction_note, reviewed, created_at
      FROM chat_feedback
      WHERE is_helpful = false
    `;
    const params = [];

    if (agent) {
      params.push(agent);
      query += ` AND agent = $${params.length}`;
    }

    query += ` ORDER BY reviewed ASC, created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      feedback: result.rows,
    });
  } catch (error) {
    console.error('Review fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch feedback for review' });
  }
});

/**
 * GET /analytics — Feedback analytics per agent
 * 
 * Returns satisfaction rate, total feedback count, learned examples count,
 * and correction count per agent.
 */
router.get('/analytics', async (req, res) => {
  try {
    const feedbackStats = await pool.query(`
      SELECT 
        agent,
        COUNT(*) AS total_feedback,
        COUNT(*) FILTER (WHERE is_helpful = true) AS positive,
        COUNT(*) FILTER (WHERE is_helpful = false) AS negative,
        COUNT(*) FILTER (WHERE is_helpful = false AND reviewed = true) AS corrected,
        ROUND(
          COUNT(*) FILTER (WHERE is_helpful = true)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 1
        ) AS satisfaction_rate
      FROM chat_feedback
      WHERE agent IS NOT NULL
      GROUP BY agent
      ORDER BY agent
    `);

    const learnedStats = await pool.query(`
      SELECT 
        agent,
        COUNT(*) AS total_examples,
        COUNT(*) FILTER (WHERE source = 'user_feedback') AS from_feedback,
        COUNT(*) FILTER (WHERE source = 'admin_correction') AS from_corrections
      FROM learned_examples
      GROUP BY agent
      ORDER BY agent
    `);

    res.json({
      feedback: feedbackStats.rows,
      learned_examples: learnedStats.rows,
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
