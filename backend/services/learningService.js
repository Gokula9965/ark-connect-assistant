/**
 * Learning Service — Feedback-Driven Learning Engine (v2)
 * 
 * Enhanced learning service that uses BOTH positive and negative feedback:
 * 
 * 👍 Positive feedback:
 *   - Saved as few-shot examples for the agent
 *   - Agent mimics the style/quality of good answers
 * 
 * 👎 Negative feedback:
 *   - Saved with optional corrections
 *   - Agent learns what to AVOID (anti-patterns)
 *   - Corrections become "gold standard" answers
 * 
 * Semantic dedup:
 *   - Before saving a new learned example, checks vector similarity
 *   - If a similar example exists (>0.85 similarity), merges instead of duplicating
 * 
 * How it works:
 *   1. User asks question → Agent answers
 *   2. User gives 👍 → Q&A saved in learned_examples (source: 'user_feedback')
 *   3. User gives 👎 → saved in feedback_corrections for admin review
 *   4. Admin corrects → saved in learned_examples (source: 'admin_correction')
 *   5. Next time agent runs → loads good examples + avoidance patterns
 *   6. Examples are included in the prompt → Gemini gives better answers
 */

const { pool } = require('../database/db');
const { generateEmbedding, toVectorLiteral } = require('./embeddingService');

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

/**
 * Get negative feedback patterns for a specific agent.
 * Returns formatted "what to avoid" instructions based on 👎 feedback.
 * 
 * @param {string} agentName - The agent name
 * @returns {Promise<string>} Formatted avoidance patterns string
 */
async function getNegativeFeedbackPatterns(agentName) {
  try {
    const result = await pool.query(
      `SELECT user_message, ai_response, correction, correction_note
       FROM chat_feedback
       WHERE agent = $1 
         AND is_helpful = false
         AND (correction IS NOT NULL OR correction_note IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT 3`,
      [agentName]
    );

    if (result.rows.length === 0) {
      return '';
    }

    let patterns = '\n## Feedback-Based Improvements (learn from past mistakes)\n';
    result.rows.forEach((fb, i) => {
      patterns += `\nCorrection ${i + 1}:\n`;
      patterns += `User asked: "${fb.user_message}"\n`;
      patterns += `Bad answer (DO NOT repeat): ${fb.ai_response.substring(0, 200)}...\n`;
      if (fb.correction) {
        patterns += `Correct answer: ${fb.correction}\n`;
      }
      if (fb.correction_note) {
        patterns += `Note: ${fb.correction_note}\n`;
      }
    });

    console.log(`   🔄 Loaded ${result.rows.length} correction patterns for "${agentName}" agent`);
    return patterns;
  } catch (error) {
    console.log(`   ⚠️ Could not load negative patterns: ${error.message}`);
    return '';
  }
}

/**
 * Get uncorrected negative feedback summaries to influence agent tone.
 * Even without explicit corrections, the agent can learn from patterns
 * of what users disliked.
 * 
 * @param {string} agentName - The agent name
 * @returns {Promise<string>} Formatted avoidance hints
 */
async function getNegativeHints(agentName) {
  try {
    const result = await pool.query(
      `SELECT user_message, 
              LEFT(ai_response, 150) as short_response
       FROM chat_feedback
       WHERE agent = $1 
         AND is_helpful = false
         AND correction IS NULL
       ORDER BY created_at DESC
       LIMIT 3`,
      [agentName]
    );

    if (result.rows.length === 0) {
      return '';
    }

    let hints = '\n## Answers Users Disliked (avoid similar responses)\n';
    result.rows.forEach((fb, i) => {
      hints += `- When asked "${fb.user_message}", this type of answer was NOT helpful: "${fb.short_response}..."\n`;
    });

    console.log(`   ⚠️ Loaded ${result.rows.length} negative hints for "${agentName}" agent`);
    return hints;
  } catch (error) {
    console.log(`   ⚠️ Could not load negative hints: ${error.message}`);
    return '';
  }
}

/**
 * Get ALL learning context for an agent — combines positive examples,
 * corrected patterns, and negative hints into a single context block.
 * 
 * @param {string} agentName - The agent name
 * @returns {Promise<string>} Combined learning context
 */
async function getFullLearningContext(agentName) {
  const [examples, corrections, hints] = await Promise.all([
    getLearnedExamples(agentName),
    getNegativeFeedbackPatterns(agentName),
    getNegativeHints(agentName),
  ]);

  return examples + corrections + hints;
}

/**
 * Check for semantically similar learned examples using vector similarity.
 * Prevents duplicate examples that say the same thing differently.
 * 
 * @param {string} agentName - The agent name
 * @param {string} question - The user question to check
 * @returns {Promise<{isDuplicate: boolean, existingId: number|null, similarity: number}>}
 */
async function checkSemanticDuplicate(agentName, question) {
  try {
    // Check if the learned_examples table has embedding column
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'learned_examples' AND column_name = 'embedding'`
    );

    if (colCheck.rows.length === 0) {
      // No embedding column — fall back to exact match
      const exact = await pool.query(
        'SELECT id FROM learned_examples WHERE agent = $1 AND user_question = $2',
        [agentName, question]
      );
      return {
        isDuplicate: exact.rows.length > 0,
        existingId: exact.rows.length > 0 ? exact.rows[0].id : null,
        similarity: exact.rows.length > 0 ? 1.0 : 0.0,
      };
    }

    // Generate embedding for the question
    const embedding = await generateEmbedding(question);
    const vecLiteral = toVectorLiteral(embedding);

    const result = await pool.query(
      `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
       FROM learned_examples
       WHERE agent = $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vecLiteral, agentName]
    );

    if (result.rows.length > 0 && result.rows[0].similarity > 0.85) {
      return {
        isDuplicate: true,
        existingId: result.rows[0].id,
        similarity: result.rows[0].similarity,
      };
    }

    return { isDuplicate: false, existingId: null, similarity: 0 };
  } catch (error) {
    console.log(`   ⚠️ Semantic dedup check failed: ${error.message}`);
    // Fall back to exact match
    const exact = await pool.query(
      'SELECT id FROM learned_examples WHERE agent = $1 AND user_question = $2',
      [agentName, question]
    );
    return {
      isDuplicate: exact.rows.length > 0,
      existingId: exact.rows.length > 0 ? exact.rows[0].id : null,
      similarity: exact.rows.length > 0 ? 1.0 : 0.0,
    };
  }
}

module.exports = {
  getLearnedExamples,
  getNegativeFeedbackPatterns,
  getNegativeHints,
  getFullLearningContext,
  checkSemanticDuplicate,
};
