/**
 * Onboarding Agent
 * 
 * Specialized agent for church/member onboarding queries.
 * Data Source: `onboarding_steps` table in PostgreSQL
 */

const { pool } = require('../database/db');
const { callGemini } = require('../services/geminiService');
const { getLearnedExamples } = require('../services/learningService');

// Concise system prompt — optimized for fewer tokens
const AGENT_PROMPT = `You are the Onboarding Agent for Ark Connect. You ONLY handle church/member onboarding.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided onboarding data
- Number steps clearly
- Use emojis sparingly (✅, 📌)`;

/**
 * Fetch onboarding knowledge from the database
 */
async function getKnowledge() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT flow_name, step_number, title, description, requirements FROM onboarding_steps ORDER BY flow_name, step_number'
    );

    let context = '';
    let currentFlow = '';
    result.rows.forEach(step => {
      if (step.flow_name !== currentFlow) {
        currentFlow = step.flow_name;
        context += `\n## ${currentFlow}\n`;
      }
      context += `${step.step_number}. ${step.title}: ${step.description}`;
      if (step.requirements) context += ` (Requires: ${step.requirements})`;
      context += '\n';
    });

    return context;
  } finally {
    client.release();
  }
}

async function handle(question, history = []) {
  console.log('   🚀 Onboarding Agent → DB: onboarding_steps');
  const knowledge = await getKnowledge();
  const learned = await getLearnedExamples('onboarding');

  let prompt = `## Onboarding Data\n${knowledge}${learned}`;
  if (history.length > 0) {
    prompt += '\n\n## Previous Conversation\n';
    history.slice(-6).forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}\n`;
    });
  }
  prompt += `\n\n## Current Question\n${question}`;

  const response = await callGemini(AGENT_PROMPT, prompt);
  return { response, agent: 'onboarding' };
}

module.exports = { handle };
