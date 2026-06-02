const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./database/db');
const { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = require('./services/embeddingService');
const chatRoutes = require('./routes/chat');

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

app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/feedback', feedbackRoutes);


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

      console.log(`  Suggestions:     GET  /api/suggestions`);
      console.log(`  Feedback:        POST /api/feedback`);
      console.log(`  Admin Correct:   POST /api/feedback/:id/correct`);
      console.log(`  Admin Review:    GET  /api/feedback/review`);
      console.log(`  Analytics:       GET  /api/feedback/analytics`);

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  RAG: pgvector + ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d)`);
      console.log(`  Learning: 👍 few-shot + 👎 corrections + anti-patterns`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
