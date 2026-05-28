/**
 * Learning Service — Few-Shot Learning Engine
 * 
 * Loads learned examples (from 👍 feedback) for a specific agent
 * and formats them as few-shot examples for the Gemini prompt.
 * 
 * This is how the AI "learns" over time:
 * 1. User asks a question → Agent answers
 * 2. User gives 👍 → Q&A saved in learned_examples table
 * 3. Next time that agent runs → it loads these examples
 * 4. Examples are included in the prompt → Gemini gives similar quality answers
 */

const { pool } = require('../database/db');

/**
 * Get learned examples for a specific agent.
 * Returns the top 5 most-used good examples to include as few-shot context.
 * 
 * @param {string} agentName - The agent name (onboarding, features, faq, roles)
 * @returns {Promise<string>} Formatted few-shot examples string
 */
async function getLearnedExamples(agentName) {
  try {
    const result = await pool.query(
      `SELECT user_question, good_response 
       FROM learned_examples 
       WHERE agent = $1 
       ORDER BY usage_count DESC, created_at DESC 
       LIMIT 5`,
      [agentName]
    );

    if (result.rows.length === 0) {
      return ''; // No learned examples yet
    }

    let examples = '\n## Previously Successful Answers (learn from these)\n';
    result.rows.forEach((ex, i) => {
      examples += `\nExample ${i + 1}:\n`;
      examples += `User asked: "${ex.user_question}"\n`;
      examples += `Good answer: ${ex.good_response}\n`;
    });

    console.log(`   📚 Loaded ${result.rows.length} learned examples for "${agentName}" agent`);
    return examples;
  } catch (error) {
    // Don't break the flow if learning fails
    console.log(`   ⚠️ Could not load learned examples: ${error.message}`);
    return '';
  }
}

module.exports = { getLearnedExamples };
