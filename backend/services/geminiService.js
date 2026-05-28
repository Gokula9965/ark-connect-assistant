const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
];

/**
 * Create and return a Google GenAI client.
 */
function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Call Gemini with model fallback and exponential backoff.
 *
 * @param {string} systemPrompt - System instruction for the model
 * @param {string} userPrompt - User-facing prompt with context
 * @returns {Promise<string>} Generated response text
 */
async function callGemini(systemPrompt, userPrompt) {
  const client = createClient();
  let lastError = null;

  for (let i = 0; i < MODELS_TO_TRY.length; i++) {
    const modelName = MODELS_TO_TRY[i];
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.9,
          maxOutputTokens: 4096,
        },
      });
      console.log(`   ✅ Generated using: ${modelName}`);
      return response.text;
    } catch (error) {
      lastError = error;
      const errorStr = error.message || String(error);
      console.log(`   ⚠️ ${modelName} failed: ${errorStr.slice(0, 80)}...`);
      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        const waitTime = 3 * (i + 1);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
      continue;
    }
  }
  throw new Error(`All models failed. Last error: ${String(lastError).slice(0, 200)}`);
}

module.exports = { callGemini };
