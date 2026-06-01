/**
 * Onboarding Agent — RAG-Enhanced
 * 
 * Specialized agent for church/member onboarding queries.
 * 
 * RAG flow:
 *   1. User question → embed with the configured Gemini embedding model
 *   2. Cosine similarity search on `onboarding_steps` table via pgvector
 *   3. Top-5 relevant steps injected into prompt
 *   4. Learned examples (👍) + correction patterns (👎) added
 *   5. Gemini generates grounded response
 */

const { callGemini } = require('../services/geminiService');
const { retrieveOnboarding } = require('../services/retrievalService');
const { getFullLearningContext } = require('../services/learningService');

// Concise system prompt — optimized for fewer tokens
const AGENT_PROMPT = `You are the Onboarding Agent for Ark Connect. You ONLY handle church/member onboarding.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided onboarding data — do not make up steps
- Number steps clearly
- If the retrieved steps don't cover the question, say you don't have that information
- Use emojis sparingly (✅, 📌)`;

/**
 * Build context from semantically retrieved onboarding steps
 */
function formatRetrievedOnboarding(rows) {
  let context = '';
  let currentFlow = '';
  rows.forEach(step => {
    if (step.flow_name !== currentFlow) {
      currentFlow = step.flow_name;
      context += `\n## ${currentFlow}\n`;
    }
    context += `${step.step_number}. ${step.title}: ${step.description}`;
    if (step.requirements) context += ` (Requires: ${step.requirements})`;
    if (step.similarity) context += ` [relevance: ${(step.similarity * 100).toFixed(0)}%]`;
    context += '\n';
  });
  return context;
}

async function handle(question, history = []) {
  console.log('   🚀 Onboarding Agent → Semantic search on onboarding_steps');

  // RAG retrieval: embed query → cosine similarity → top-5
  const { rows, method } = await retrieveOnboarding(question);
  const knowledge = formatRetrievedOnboarding(rows);
  console.log(`   📊 Retrieved ${rows.length} onboarding steps via ${method}`);

  // Feedback-driven learning context
  const learned = await getFullLearningContext('onboarding');

  let prompt = `## Retrieved Onboarding Steps (${method} search)\n${knowledge}${learned}`;
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
