/**
 * Roles Agent
 * 
 * Specialized agent for role and permission queries.
 * Data Source: `roles_permissions` table in PostgreSQL
 */

const { pool } = require('../database/db');
const { callGemini } = require('../services/geminiService');
const { getLearnedExamples } = require('../services/learningService');

const AGENT_PROMPT = `You are the Roles & Permissions Agent for Ark Connect. You ONLY handle role/permission questions.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep role names (Admin, Moderator, etc.) in English
- ONLY use the provided roles data
- Compare roles clearly when asked
- Use emojis sparingly (✅, ❌)`;

/**
 * Fetch roles knowledge from the database
 */
async function getKnowledge() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT role_name, description, capabilities FROM roles_permissions'
    );

    let context = '';
    result.rows.forEach(role => {
      context += `\n### ${role.role_name}\n`;
      context += `${role.description}\n`;
      const caps = typeof role.capabilities === 'string' ? JSON.parse(role.capabilities) : role.capabilities;
      context += `Can: ${caps.join(', ')}\n`;
    });

    return context;
  } finally {
    client.release();
  }
}

async function handle(question, history = []) {
  console.log('   🚀 Roles Agent → DB: roles_permissions');
  const knowledge = await getKnowledge();
  const learned = await getLearnedExamples('roles');

  let prompt = `## Roles Data\n${knowledge}${learned}`;
  if (history.length > 0) {
    prompt += '\n\n## Previous Conversation\n';
    history.slice(-6).forEach(m => {
      prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}\n`;
    });
  }
  prompt += `\n\n## Current Question\n${question}`;

  const response = await callGemini(AGENT_PROMPT, prompt);
  return { response, agent: 'roles' };
}

module.exports = { handle };
