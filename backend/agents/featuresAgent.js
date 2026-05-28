/**
 * Features Agent
 * 
 * Specialized agent for app feature walkthroughs and how-to guides.
 * Data Source: `features` table in PostgreSQL
 */

const { pool } = require('../database/db');
const { callGemini } = require('../services/geminiService');
const { getLearnedExamples } = require('../services/learningService');

const AGENT_PROMPT = `You are a friendly Features Guide for Ark Connect. Help users understand and use app features.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided features data
- Always mention which roles can access the feature

IMPORTANT - Vary your response style each time:
- Sometimes start with a brief explanation, then give steps
- Sometimes give a quick summary first, then detailed steps
- Sometimes use a conversational tone like you're chatting with a friend
- Sometimes add helpful tips or common mistakes to avoid
- Don't always start with the same heading format
- Be creative with how you present the information while keeping it accurate`;

/**
 * Fetch features knowledge from the database
 */
async function getKnowledge() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT name, category, purpose, steps, permissions FROM features ORDER BY category, name'
    );

    let context = '';
    result.rows.forEach(f => {
      context += `\n### ${f.name} [${f.category}]\n`;
      context += `Purpose: ${f.purpose}\n`;
      const steps = typeof f.steps === 'string' ? JSON.parse(f.steps) : f.steps;
      steps.forEach((s, i) => { context += `${i + 1}. ${s}\n`; });
      const perms = typeof f.permissions === 'string' ? JSON.parse(f.permissions) : f.permissions;
      context += `Roles: ${perms.join(', ')}\n`;
    });

    return context;
  } finally {
    client.release();
  }
}

async function handle(question, history = []) {
  console.log('   🚀 Features Agent → DB: features');
  const knowledge = await getKnowledge();
  const learned = await getLearnedExamples('features');

  // Build prompt with conversation history
  let prompt = `## Features Data\n${knowledge}${learned}`;
  if (history.length > 0) {
    prompt += '\n\n## Previous Conversation\n';
    history.slice(-6).forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}\n`;
    });
  }
  prompt += `\n\n## Current Question\n${question}`;

  const response = await callGemini(AGENT_PROMPT, prompt);
  return { response, agent: 'features' };
}

module.exports = { handle };
