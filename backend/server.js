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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ark-connect-backend' });
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
      console.log(`  Health:          GET  /api/health`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
