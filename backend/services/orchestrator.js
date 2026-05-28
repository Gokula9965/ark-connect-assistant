/**
 * Orchestrator — LLM-based Intent Router with Conversation Memory
 * 
 * Uses Gemini to classify the user's intent and route the query
 * to the appropriate specialized agent. Passes conversation history
 * so agents can understand context from previous messages.
 */

const { callGemini } = require('./geminiService');
const onboardingAgent = require('../agents/onboardingAgent');
const featuresAgent = require('../agents/featuresAgent');
const faqAgent = require('../agents/faqAgent');
const rolesAgent = require('../agents/rolesAgent');

const ROUTING_SYSTEM_PROMPT = `You are an intent classification system. Your ONLY job is to classify the user's question into exactly ONE category.

## Categories
- **onboarding** → Questions about setting up a church, joining an organization, account creation, organization setup, verification, first-time setup, getting started
- **features** → Questions about how to use specific app features (groups, events, messaging, announcements, donations, prayers, settings), how-to guides, step-by-step instructions
- **faq** → General questions, password reset, data security, language support, contacting support, common issues
- **roles** → Questions about user roles (Admin, Global Admin, Moderator, Member), permissions, what roles can/cannot do, access control

## Rules
1. Respond with ONLY the category name — one word, lowercase
2. No explanation, no punctuation, no extra text
3. If unclear, pick the closest match
4. The user may type in ANY language — classify based on MEANING
5. Use the conversation history to understand context (e.g., "what roles can do this?" → look at previous messages to understand "this")

## Examples
- "How to create a group?" → features
- "How do I set up my church?" → onboarding
- "What can an admin do?" → roles
- "How to reset my password?" → faq
- "புதிய குழுவை எப்படி உருவாக்குவது?" → features
- "church ah yeppadi onboard pannurathu" → onboarding
- "நிர்வாகி என்ன செய்ய முடியும்?" → roles`;

const AGENT_MAP = {
  onboarding: onboardingAgent,
  features: featuresAgent,
  faq: faqAgent,
  roles: rolesAgent,
};

/**
 * Format conversation history into a string for the prompt
 */
function formatHistory(history) {
  if (!history || history.length === 0) return '';

  // Take only the last 6 messages to save tokens
  const recent = history.slice(-6);
  let formatted = '\n## Conversation History\n';
  recent.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    // Truncate long messages to save tokens
    const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
    formatted += `${role}: ${content}\n`;
  });
  return formatted;
}

/**
 * Classify the user's intent and route to the appropriate agent.
 * Includes conversation history for context understanding.
 */
async function routeToAgent(question, history = []) {
  console.log('\n🧠 Orchestrator: Classifying intent...');

  const historyContext = formatHistory(history);

  // Step 1: Use LLM to classify intent (with conversation context)
  let intent;
  try {
    const classificationPrompt = historyContext
      ? `${historyContext}\n## Current Question\n${question}`
      : question;

    const classification = await callGemini(ROUTING_SYSTEM_PROMPT, classificationPrompt);
    intent = classification.trim().toLowerCase().replace(/[^a-z]/g, '');
    console.log(`   🏷️  Classified intent: "${intent}"`);
  } catch (error) {
    console.log(`   ⚠️ Classification failed, defaulting to faq: ${error.message}`);
    intent = 'faq';
  }

  // Step 2: Validate and select agent
  if (!AGENT_MAP[intent]) {
    console.log(`   ⚠️ Unknown intent "${intent}", defaulting to faq`);
    intent = 'faq';
  }

  const selectedAgent = AGENT_MAP[intent];
  console.log(`   📡 Routing to: ${intent} agent`);

  // Step 3: Delegate to the selected agent (with conversation history)
  const result = await selectedAgent.handle(question, history);

  return {
    response: result.response,
    agent: result.agent,
    intent: intent,
  };
}

module.exports = { routeToAgent };
