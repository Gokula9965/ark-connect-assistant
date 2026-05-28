const express = require('express');
const router = express.Router();
const { routeToAgent } = require('../services/orchestrator');

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Agentic flow with conversation context
    const result = await routeToAgent(message, history || []);

    res.json({
      response: result.response,
      agent: result.agent,
      intent: result.intent,
    });

  } catch (error) {
    console.error('Chat error:', error.message);

    res.status(500).json({
      error: 'Failed to process your question',
      response: 'Sorry, something went wrong. Please try again.',
    });
  }
});

module.exports = router;
