/**
 * Features Agent — RAG-Enhanced
 * 
 * Specialized agent for app feature walkthroughs and how-to guides.
 * 
 * RAG flow:
 *   1. User question → embed with text-embedding-004
 *   2. Cosine similarity search on `features` table via pgvector
 *   3. Top-5 relevant features injected into prompt
 *   4. Learned examples (👍) + correction patterns (👎) added
 *   5. Gemini generates grounded response
 */

const { callGemini } = require('../services/geminiService');
const { retrieveFeatures } = require('../services/retrievalService');
const { getFullLearningContext } = require('../services/learningService');

const AGENT_PROMPT = `You are a friendly Features Guide for Ark Connect. Help users understand and use app features.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided features data — do not make up features
- Always mention which roles can access the feature
- If the retrieved context doesn't cover the question, say you don't have that information

IMPORTANT - Vary your response style each time:
- Sometimes start with a brief explanation, then give steps
- Sometimes give a quick summary first, then detailed steps
- Sometimes use a conversational tone like you're chatting with a friend
- Sometimes add helpful tips or common mistakes to avoid
- Don't always start with the same heading format
- Be creative with how you present the information while keeping it accurate`;

/**
 * Build context from semantically retrieved features
 */
function formatRetrievedFeatures(rows) {
  let context = '';
  rows.forEach(f => {
    context += `\n### ${f.name} [${f.category}]`;
    if (f.similarity) context += ` (relevance: ${(f.similarity * 100).toFixed(0)}%)`;
    context += '\n';
    context += `Purpose: ${f.purpose}\n`;
    const steps = typeof f.steps === 'string' ? JSON.parse(f.steps) : f.steps;
    steps.forEach((s, i) => { context += `${i + 1}. ${s}\n`; });
    const perms = typeof f.permissions === 'string' ? JSON.parse(f.permissions) : f.permissions;
    context += `Roles: ${perms.join(', ')}\n`;
  });
  return context;
}

async function handle(question, history = []) {
  console.log('   🚀 Features Agent → Semantic search on features');

  // RAG retrieval: embed query → cosine similarity → top-5
  const { rows, method } = await retrieveFeatures(question);
  const knowledge = formatRetrievedFeatures(rows);
  console.log(`   📊 Retrieved ${rows.length} features via ${method}`);

  // Feedback-driven learning context
  const learned = await getFullLearningContext('features');

  // Build prompt with retrieved context + learning + history
  let prompt = `## Retrieved Features (${method} search)\n${knowledge}${learned}`;
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
