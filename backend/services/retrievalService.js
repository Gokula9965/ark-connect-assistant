/**
 * Retrieval Service — Semantic Vector Search Engine
 * 
 * Core of the RAG pipeline. Given a user query:
 *  1. Embeds the query using the configured Gemini embedding model
 *  2. Performs cosine similarity search via pgvector
 *  3. Returns top-k relevant knowledge chunks
 *  4. Falls back to keyword search if vector search fails
 * 
 * Each agent calls retrieveForAgent() instead of SELECT *
 */

const { pool } = require('../database/db');
const { generateEmbedding, toVectorLiteral } = require('./embeddingService');

/**
 * Retrieve relevant knowledge chunks for a specific agent's table.
 * Uses vector cosine similarity via pgvector's <=> operator.
 * 
 * @param {string} tableName - The knowledge table to search
 * @param {string} query - User's question
 * @param {Object} options
 * @param {string[]} options.selectColumns - Columns to return
 * @param {number} options.topK - Number of results (default 5)
 * @param {number} options.similarityThreshold - Minimum similarity (default 0.3)
 * @returns {Promise<{rows: Array, method: string}>}
 */
async function retrieveRelevant(tableName, query, options = {}) {
  const {
    selectColumns = ['*'],
    topK = 5,
    similarityThreshold = 0.3,
  } = options;

  const client = await pool.connect();
  try {
    // Step 1: Embed the query
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (embError) {
      console.log(`   ⚠️ Embedding failed, falling back to keyword search: ${embError.message}`);
      return keywordFallback(client, tableName, query, selectColumns, topK);
    }

    const vecLiteral = toVectorLiteral(queryEmbedding);
    const cols = selectColumns.join(', ');

    // Step 2: Vector similarity search
    const vectorQuery = `
      SELECT ${cols},
             1 - (embedding <=> $1::vector) AS similarity
      FROM ${tableName}
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await client.query(vectorQuery, [vecLiteral, similarityThreshold, topK]);

    if (result.rows.length > 0) {
      console.log(`   🎯 Vector search: ${result.rows.length} results (top sim: ${result.rows[0].similarity.toFixed(3)})`);
      return { rows: result.rows, method: 'vector' };
    }

    // Step 3: If no vector results, fall back to keyword search
    console.log(`   ⚠️ No vector matches above threshold, falling back to keyword search`);
    return keywordFallback(client, tableName, query, selectColumns, topK);

  } finally {
    client.release();
  }
}

/**
 * Keyword-based fallback using PostgreSQL full-text search.
 * Used when embedding generation fails or no vector matches found.
 */
async function keywordFallback(client, tableName, query, selectColumns, topK) {
  const cols = selectColumns.join(', ');

  // Try full-text search on the keywords column (if it exists)
  try {
    const ftsQuery = `
      SELECT ${cols},
             ts_rank(to_tsvector('english', COALESCE(keywords, '')), plainto_tsquery('english', $1)) AS rank
      FROM ${tableName}
      WHERE to_tsvector('english', COALESCE(keywords, '')) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2
    `;

    const result = await client.query(ftsQuery, [query, topK]);
    if (result.rows.length > 0) {
      console.log(`   🔤 Keyword search: ${result.rows.length} results`);
      return { rows: result.rows, method: 'keyword' };
    }
  } catch {
    // keywords column may not exist on all tables — that's OK
  }

  // Final fallback: return top rows by ID (ensures agent always has some context)
  const fallbackQuery = `SELECT ${cols} FROM ${tableName} ORDER BY id LIMIT $1`;
  const result = await client.query(fallbackQuery, [topK]);
  console.log(`   📋 Fallback: returning top ${result.rows.length} rows`);
  return { rows: result.rows, method: 'fallback' };
}

/**
 * Convenience: retrieve for the features table
 */
async function retrieveFeatures(query, topK = 5) {
  return retrieveRelevant('features', query, {
    selectColumns: ['name', 'category', 'purpose', 'steps', 'permissions'],
    topK,
  });
}

/**
 * Convenience: retrieve for the faqs table
 */
async function retrieveFAQs(query, topK = 5) {
  return retrieveRelevant('faqs', query, {
    selectColumns: ['question', 'answer', 'category'],
    topK,
  });
}

/**
 * Convenience: retrieve for the onboarding_steps table
 */
async function retrieveOnboarding(query, topK = 5) {
  return retrieveRelevant('onboarding_steps', query, {
    selectColumns: ['flow_name', 'step_number', 'title', 'description', 'requirements'],
    topK,
  });
}

/**
 * Convenience: retrieve for the roles_permissions table
 */
async function retrieveRoles(query, topK = 4) {
  return retrieveRelevant('roles_permissions', query, {
    selectColumns: ['role_name', 'description', 'capabilities'],
    topK,
  });
}

module.exports = {
  retrieveRelevant,
  retrieveFeatures,
  retrieveFAQs,
  retrieveOnboarding,
  retrieveRoles,
};
