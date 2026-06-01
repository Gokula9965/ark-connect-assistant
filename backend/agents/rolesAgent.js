/**
 * Roles Agent — RAG-Enhanced
 * 
 * Specialized agent for role and permission queries.
 * 
 * RAG flow:
 *   1. User question → embed with the configured Gemini embedding model
 *   2. Cosine similarity search on `roles_permissions` table via pgvector
 *   3. Top relevant roles injected into prompt
 *   4. Learned examples (👍) + correction patterns (👎) added
 *   5. Gemini generates grounded response
 */

const { callGemini } = require('../services/geminiService');
const { retrieveRoles } = require('../services/retrievalService');
const { getFullLearningContext } = require('../services/learningService');

const AGENT_PROMPT = `You are the Roles & Permissions Agent for Ark Connect. You ONLY handle role/permission questions.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep role names (Admin, Moderator, etc.) in English
- ONLY use the provided roles data — do not invent permissions
- Compare roles clearly when asked
- If the retrieved data doesn't cover the question, say you don't have that information
- Use emojis sparingly (✅, ❌)`;

/**
 * Build context from semantically retrieved roles
 */
function formatRetrievedRoles(rows) {
  let context = '';
  rows.forEach(role => {
    context += `\n### ${role.role_name}`;
    if (role.similarity) context += ` (relevance: ${(role.similarity * 100).toFixed(0)}%)`;
    context += '\n';
    context += `${role.description}\n`;
    const caps = typeof role.capabilities === 'string' ? JSON.parse(role.capabilities) : role.capabilities;
    context += `Can: ${caps.join(', ')}\n`;
  });
  return context;
}

async function handle(question, history = []) {
  console.log('   🚀 Roles Agent → Semantic search on roles_permissions');

  // RAG retrieval: embed query → cosine similarity → top-4
  const { rows, method } = await retrieveRoles(question);
  const knowledge = formatRetrievedRoles(rows);
  console.log(`   📊 Retrieved ${rows.length} roles via ${method}`);

  // Feedback-driven learning context
  const learned = await getFullLearningContext('roles');

  let prompt = `## Retrieved Roles Data (${method} search)\n${knowledge}${learned}`;
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
