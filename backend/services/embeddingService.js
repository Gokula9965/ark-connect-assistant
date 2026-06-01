/**
 * Embedding Service — Vector Embedding Generator
 * 
 * Uses Google Gemini's text-embedding-004 model to convert text
 * into 768-dimensional vector embeddings for semantic search.
 * 
 * Used by:
 *  - seed.js         → embed knowledge at ingestion time
 *  - retrievalService → embed user queries at search time
 *  - learningService  → embed learned examples for dedup
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

// Cache the client to avoid re-creating on every call
let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/**
 * Generate embedding vector for a single text string.
 * 
 * @param {string} text - Text to embed (will be truncated to 2048 chars)
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
async function generateEmbedding(text) {
  const client = getClient();

  // Truncate to avoid token limits on embedding model
  const truncated = text.substring(0, 2048);

  try {
    const response = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: truncated,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    return response.embedding.values;
  } catch (error) {
    console.error(`   ❌ Embedding failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts with rate-limit handling.
 * Processes sequentially with a small delay to avoid 429 errors.
 * 
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  const embeddings = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await generateEmbedding(texts[i]);
      embeddings.push(embedding);

      // Rate limit: small delay between calls
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      // On rate limit, wait longer and retry once
      if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        console.log(`   ⏳ Rate limited, waiting 5s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        const embedding = await generateEmbedding(texts[i]);
        embeddings.push(embedding);
      } else {
        throw error;
      }
    }
  }

  return embeddings;
}

/**
 * Convert a text into a rich embedding-ready string.
 * Combines multiple fields into a single searchable text.
 * 
 * @param {Object} fields - Key-value pairs to combine
 * @returns {string} Combined text optimized for embedding
 */
function buildEmbeddingText(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
      return `${k}: ${v}`;
    })
    .join('. ');
}

/**
 * Format a pgvector-compatible vector string from a JS array.
 * @param {number[]} vec - Embedding vector
 * @returns {string} PostgreSQL vector literal e.g. '[0.1,0.2,...]'
 */
function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  buildEmbeddingText,
  toVectorLiteral,
  EMBEDDING_DIMENSIONS,
};
