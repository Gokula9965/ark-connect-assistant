/**
 * Database Migration — Upgrade to RAG + Feedback v2
 * 
 * Run this ONCE to add pgvector columns and feedback correction columns
 * to an existing database without losing data.
 * 
 * Usage: node database/migrate.js
 * 
 * What it does:
 *   1. Enables pgvector extension
 *   2. Adds embedding VECTOR(768) column to all knowledge tables
 *   3. Adds correction/review columns to chat_feedback
 *   4. Adds source/embedding columns to learned_examples
 *   5. Creates HNSW vector indexes
 *   6. Creates GIN full-text search indexes
 *   7. Re-embeds all existing knowledge rows
 */

const { pool } = require('./db');
const { generateEmbedding, buildEmbeddingText } = require('../services/embeddingService');

async function migrate() {
  console.log('🔄 Starting RAG migration...\n');

  const client = await pool.connect();
  try {
    // Step 1: Enable pgvector
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled');

    // Step 2: Add embedding columns (idempotent — IF NOT EXISTS not supported for columns, so use a check)
    const addColumnIfNotExists = async (table, column, type) => {
      const check = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (check.rows.length === 0) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`   ✅ Added ${column} to ${table}`);
      } else {
        console.log(`   ⏭️  ${column} already exists in ${table}`);
      }
    };

    // Knowledge table embedding columns
    await addColumnIfNotExists('features', 'embedding', 'VECTOR(768)');
    await addColumnIfNotExists('faqs', 'embedding', 'VECTOR(768)');
    await addColumnIfNotExists('onboarding_steps', 'embedding', 'VECTOR(768)');
    await addColumnIfNotExists('roles_permissions', 'embedding', 'VECTOR(768)');
    await addColumnIfNotExists('learned_examples', 'embedding', 'VECTOR(768)');

    // Feedback correction columns
    await addColumnIfNotExists('chat_feedback', 'correction', 'TEXT');
    await addColumnIfNotExists('chat_feedback', 'correction_note', 'TEXT');
    await addColumnIfNotExists('chat_feedback', 'reviewed', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfNotExists('chat_feedback', 'reviewed_at', 'TIMESTAMP');

    // Learned examples source column
    await addColumnIfNotExists('learned_examples', 'source', "VARCHAR(50) DEFAULT 'user_feedback'");

    console.log('');

    // Step 3: Create indexes
    const indexes = [
      { table: 'features', name: 'idx_features_embedding' },
      { table: 'faqs', name: 'idx_faqs_embedding' },
      { table: 'onboarding_steps', name: 'idx_onboarding_embedding' },
      { table: 'roles_permissions', name: 'idx_roles_embedding' },
      { table: 'learned_examples', name: 'idx_learned_embedding' },
    ];

    for (const idx of indexes) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${idx.name}
        ON ${idx.table}
        USING hnsw (embedding vector_cosine_ops)
      `);
    }
    console.log('✅ Vector indexes created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_features_keywords_fts
      ON features USING gin(to_tsvector('english', COALESCE(keywords, '')));

      CREATE INDEX IF NOT EXISTS idx_faqs_keywords_fts
      ON faqs USING gin(to_tsvector('english', COALESCE(keywords, '')));
    `);
    console.log('✅ Full-text search indexes created\n');

    // Step 4: Generate embeddings for existing rows that don't have them
    console.log('📊 Generating embeddings for existing knowledge...\n');

    // Features
    const features = await client.query('SELECT id, name, category, purpose, keywords FROM features WHERE embedding IS NULL');
    for (const f of features.rows) {
      const text = buildEmbeddingText({ name: f.name, category: f.category, purpose: f.purpose, keywords: f.keywords });
      try {
        const emb = await generateEmbedding(text);
        await client.query('UPDATE features SET embedding = $1 WHERE id = $2', [`[${emb.join(',')}]`, f.id]);
        console.log(`   ✅ Embedded feature: ${f.name}`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.log(`   ⚠️ Failed: ${f.name} — ${err.message}`);
      }
    }

    // FAQs
    const faqs = await client.query('SELECT id, question, answer, category, keywords FROM faqs WHERE embedding IS NULL');
    for (const faq of faqs.rows) {
      const text = buildEmbeddingText({ question: faq.question, answer: faq.answer, category: faq.category, keywords: faq.keywords });
      try {
        const emb = await generateEmbedding(text);
        await client.query('UPDATE faqs SET embedding = $1 WHERE id = $2', [`[${emb.join(',')}]`, faq.id]);
        console.log(`   ✅ Embedded FAQ: ${faq.question.substring(0, 50)}`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.log(`   ⚠️ Failed: ${faq.question.substring(0, 50)} — ${err.message}`);
      }
    }

    // Onboarding steps
    const steps = await client.query('SELECT id, flow_name, title, description, requirements FROM onboarding_steps WHERE embedding IS NULL');
    for (const s of steps.rows) {
      const text = buildEmbeddingText({ flow: s.flow_name, title: s.title, description: s.description, requirements: s.requirements });
      try {
        const emb = await generateEmbedding(text);
        await client.query('UPDATE onboarding_steps SET embedding = $1 WHERE id = $2', [`[${emb.join(',')}]`, s.id]);
        console.log(`   ✅ Embedded step: ${s.flow_name} #${s.title}`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.log(`   ⚠️ Failed: ${s.title} — ${err.message}`);
      }
    }

    // Roles
    const roles = await client.query('SELECT id, role_name, description, capabilities FROM roles_permissions WHERE embedding IS NULL');
    for (const r of roles.rows) {
      const caps = typeof r.capabilities === 'string' ? JSON.parse(r.capabilities) : r.capabilities;
      const text = buildEmbeddingText({ role: r.role_name, description: r.description, capabilities: caps });
      try {
        const emb = await generateEmbedding(text);
        await client.query('UPDATE roles_permissions SET embedding = $1 WHERE id = $2', [`[${emb.join(',')}]`, r.id]);
        console.log(`   ✅ Embedded role: ${r.role_name}`);
        await new Promise(r2 => setTimeout(r2, 200));
      } catch (err) {
        console.log(`   ⚠️ Failed: ${r.role_name} — ${err.message}`);
      }
    }

    console.log('\n🎉 Migration complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Features embedded:   ${features.rows.length}`);
    console.log(`FAQs embedded:       ${faqs.rows.length}`);
    console.log(`Steps embedded:      ${steps.rows.length}`);
    console.log(`Roles embedded:      ${roles.rows.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
