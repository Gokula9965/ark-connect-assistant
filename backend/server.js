const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./database/db');
const chatRoutes = require('./routes/chat');
const featuresRoutes = require('./routes/features');
const suggestionsRoutes = require('./routes/suggestions');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check — includes RAG status
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./database/db');

    // Check if pgvector is available
    const vecCheck = await pool.query(
      `SELECT COUNT(*) AS embedded FROM features WHERE embedding IS NOT NULL`
    );
    const embeddedCount = parseInt(vecCheck.rows[0].embedded);

    // Check learned examples
    const learnedCheck = await pool.query(
      `SELECT COUNT(*) AS total FROM learned_examples`
    );

    // Check feedback counts
    const feedbackCheck = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE is_helpful = true) AS positive,
         COUNT(*) FILTER (WHERE is_helpful = false) AS negative,
         COUNT(*) FILTER (WHERE correction IS NOT NULL) AS corrected
       FROM chat_feedback`
    );

    res.json({
      status: 'ok',
      service: 'ark-connect-backend',
      rag: {
        enabled: embeddedCount > 0,
        embedded_features: embeddedCount,
        search_method: embeddedCount > 0 ? 'vector_cosine_similarity' : 'keyword_fallback',
        embedding_model: 'text-embedding-004',
        vector_dimensions: 768,
      },
      learning: {
        total_examples: parseInt(learnedCheck.rows[0].total),
        feedback_positive: parseInt(feedbackCheck.rows[0].positive),
        feedback_negative: parseInt(feedbackCheck.rows[0].negative),
        corrections_applied: parseInt(feedbackCheck.rows[0].corrected),
      },
    });
  } catch (error) {
    res.json({
      status: 'ok',
      service: 'ark-connect-backend',
      rag: { enabled: false, error: error.message },
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Ark Connect Backend running on http://localhost:${PORT}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Chat API:        POST /api/chat`);
      console.log(`  Features:        GET  /api/features`);
      console.log(`  Suggestions:     GET  /api/suggestions`);
      console.log(`  Feedback:        POST /api/feedback`);
      console.log(`  Admin Correct:   POST /api/feedback/:id/correct`);
      console.log(`  Admin Review:    GET  /api/feedback/review`);
      console.log(`  Analytics:       GET  /api/feedback/analytics`);
      console.log(`  Health:          GET  /api/health`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  RAG: pgvector + text-embedding-004 (768d)`);
      console.log(`  Learning: 👍 few-shot + 👎 corrections + anti-patterns`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
