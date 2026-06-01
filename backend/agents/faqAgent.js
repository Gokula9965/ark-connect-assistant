/**
 * FAQ Agent — RAG-Enhanced
 * 
 * Specialized agent for frequently asked questions.
 * 
 * RAG flow:
 *   1. User question → embed with the configured Gemini embedding model
 *   2. Cosine similarity search on `faqs` table via pgvector
 *   3. Top-5 relevant FAQs injected into prompt
 *   4. Learned examples (👍) + correction patterns (👎) added
 *   5. Gemini generates grounded response
 */

const { callGemini } = require('../services/geminiService');
const { retrieveFAQs } = require('../services/retrievalService');
const { getFullLearningContext } = require('../services/learningService');

const AGENT_PROMPT = `You are the FAQ Agent for Ark Connect. You ONLY handle frequently asked questions.

Rules:
- Respond in the user's language (Tamil→Tamil, Hindi→Hindi, English→English)
- Keep feature names/buttons in English
- ONLY use the provided FAQ data — do not invent answers
- Give clear, concise answers
- If the retrieved FAQs don't cover the question, say you'll forward it to support
- Use emojis sparingly (✅, 📌)`;

/**
 * Build context from semantically retrieved FAQs
 */
function formatRetrievedFAQs(rows) {
  let context = '';
  rows.forEach(faq => {
    context += `Q: ${faq.question}`;
    if (faq.similarity) context += ` (relevance: ${(faq.similarity * 100).toFixed(0)}%)`;
    context += `\nA: ${faq.answer}\n\n`;
  });
  return context;
}

async function handle(question, history = []) {
  console.log('   🚀 FAQ Agent → Semantic search on faqs');

  // RAG retrieval: embed query → cosine similarity → top-5
  const { rows, method } = await retrieveFAQs(question);
  const knowledge = formatRetrievedFAQs(rows);
  console.log(`   📊 Retrieved ${rows.length} FAQs via ${method}`);

  // Feedback-driven learning context
  const learned = await getFullLearningContext('faq');

  let prompt = `## Retrieved FAQs (${method} search)\n${knowledge}${learned}`;
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
