/**
 * FAQ Agent
 * 
 * Specialized agent for frequently asked questions.
 * Data Source: `faqs` table in PostgreSQL
 */

const { pool } = require('../database/db');
const { callGemini } = require('../services/geminiService');
const { getLearnedExamples } = require('../services/learningService');

const AGENT_PROMPT = `You are the FAQ Agent for Ark Connect. You ONLY handle frequently asked questions.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided FAQ data
- Give clear, concise answers
- Use emojis sparingly (✅, 📌)`;

/**
 * Fetch FAQ knowledge from the database
 */
async function getKnowledge() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT question, answer, category FROM faqs ORDER BY category'
    );

    let context = '';
    result.rows.forEach(faq => {
      context += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    });

    return context;
  } finally {
    client.release();
  }
}

async function handle(question, history = []) {
  console.log('   🚀 FAQ Agent → DB: faqs');
  const knowledge = await getKnowledge();
  const learned = await getLearnedExamples('faq');

  let prompt = `## FAQ Data\n${knowledge}${learned}`;
  if (history.length > 0) {
    prompt += '\n\n## Previous Conversation\n';
    history.slice(-6).forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}\n`;
    });
  }
  prompt += `\n\n## Current Question\n${question}`;

  const response = await callGemini(AGENT_PROMPT, prompt);
  return { response, agent: 'faq' };
}

module.exports = { handle };
