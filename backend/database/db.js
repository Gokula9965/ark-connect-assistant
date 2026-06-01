const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ark_connect_assistant',
  user: process.env.DB_USER || 'ark_admin',
  password: process.env.DB_PASSWORD || 'ArkConnect2026!',
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Enable pgvector extension for vector similarity search
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled');

    await client.query(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        purpose TEXT NOT NULL,
        steps JSONB DEFAULT '[]',
        permissions JSONB DEFAULT '[]',
        keywords TEXT NOT NULL,
        related_questions JSONB DEFAULT '[]',
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        keywords TEXT NOT NULL,
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS onboarding_steps (
        id SERIAL PRIMARY KEY,
        flow_name VARCHAR(255) NOT NULL,
        step_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles_permissions (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        capabilities JSONB DEFAULT '[]',
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_feedback (
        id SERIAL PRIMARY KEY,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        is_helpful BOOLEAN,
        agent VARCHAR(50),
        intent VARCHAR(50),
        correction TEXT,
        correction_note TEXT,
        reviewed BOOLEAN DEFAULT FALSE,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS learned_examples (
        id SERIAL PRIMARY KEY,
        agent VARCHAR(50) NOT NULL,
        user_question TEXT NOT NULL,
        good_response TEXT NOT NULL,
        source VARCHAR(50) DEFAULT 'user_feedback',
        usage_count INTEGER DEFAULT 0,
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vector similarity search indexes (IVFFlat for fast ANN)
    // These use cosine distance (<=>)
    const indexes = [
      { table: 'features', name: 'idx_features_embedding' },
      { table: 'faqs', name: 'idx_faqs_embedding' },
      { table: 'onboarding_steps', name: 'idx_onboarding_embedding' },
      { table: 'roles_permissions', name: 'idx_roles_embedding' },
      { table: 'learned_examples', name: 'idx_learned_embedding' },
    ];

    for (const idx of indexes) {
      // Use HNSW index for better recall on small datasets
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${idx.name}
        ON ${idx.table}
        USING hnsw (embedding vector_cosine_ops)
      `);
    }
    console.log('✅ Vector indexes created');

    // Create GIN indexes for keyword full-text search fallback
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_features_keywords_fts
      ON features USING gin(to_tsvector('english', COALESCE(keywords, '')));

      CREATE INDEX IF NOT EXISTS idx_faqs_keywords_fts
      ON faqs USING gin(to_tsvector('english', COALESCE(keywords, '')));
    `);
    console.log('✅ Full-text search indexes created');

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
