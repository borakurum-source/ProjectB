import { Pool } from 'pg';
import dotenv from 'dotenv';
import {
  DEMO_CLIENT,
  FILMFOLK_CLIENT,
  DEMO_PROMPTS,
  FILMFOLK_PROMPTS,
} from '../data/demoData.ts';

dotenv.config();

const NEON_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_M9fLlxUO4NTi@ep-summer-butterfly-b2v4rkg4-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function migrateNeon() {
  console.log('Connecting to Neon PostgreSQL to initialize all tables...');
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating tables if not exists...');

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        aliases JSONB NOT NULL,
        domain TEXT NOT NULL,
        competitor_domains JSONB NOT NULL,
        competitor_brands JSONB NOT NULL,
        categorized_competitors JSONB,
        industry TEXT NOT NULL,
        market TEXT NOT NULL,
        language TEXT NOT NULL,
        city TEXT,
        short_summary TEXT,
        positioning TEXT,
        detailed_description TEXT,
        target_audience TEXT,
        products_services TEXT,
        key_differentiators TEXT,
        is_demo BOOLEAN DEFAULT FALSE,
        default_runs_per_prompt INTEGER DEFAULT 3,
        scheduled_cycle_frequency TEXT DEFAULT 'off',
        auto_run_interval_days INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Prompts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        text TEXT NOT NULL,
        intent_layer TEXT NOT NULL,
        category TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 4. Run Cycles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS run_cycles (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        engines JSONB NOT NULL,
        runs_per_prompt INTEGER NOT NULL,
        status TEXT NOT NULL,
        call_count INTEGER DEFAULT 0 NOT NULL,
        error TEXT,
        is_retest BOOLEAN DEFAULT FALSE,
        retested_action_id TEXT
      );
    `);

    // 5. Runs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        prompt_id TEXT NOT NULL,
        engine TEXT NOT NULL,
        model TEXT NOT NULL,
        run_index INTEGER NOT NULL,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        answer_text TEXT NOT NULL,
        grounding_sources JSONB NOT NULL,
        grounding_chunks JSONB,
        web_search_queries JSONB NOT NULL,
        brand_mentioned BOOLEAN NOT NULL,
        brand_cited BOOLEAN NOT NULL,
        position INTEGER,
        prominence DOUBLE PRECISION,
        mentioned_brands JSONB NOT NULL,
        ordered_list BOOLEAN DEFAULT FALSE,
        ranked_names JSONB,
        recommended_entity_type TEXT,
        answer_format TEXT,
        error TEXT
      );
    `);

    // 6. Diagnostics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnostics (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        prompt_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        dimensions JSONB NOT NULL,
        observed_evidence TEXT NOT NULL,
        likely_gap TEXT NOT NULL,
        confidence TEXT NOT NULL,
        recommended_action_summary TEXT NOT NULL,
        validation_method TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 7. Actions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        diagnostic_id TEXT,
        prompt_ids JSONB NOT NULL,
        title TEXT NOT NULL,
        why TEXT NOT NULL,
        evidence JSONB NOT NULL,
        exact_recommendation TEXT NOT NULL,
        priority TEXT NOT NULL,
        impact TEXT NOT NULL,
        effort TEXT NOT NULL,
        validation TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        page_url TEXT,
        implemented_at TIMESTAMP WITH TIME ZONE,
        baseline_mention_rate DOUBLE PRECISION,
        retest_mention_rate DOUBLE PRECISION,
        baseline_citation_rate DOUBLE PRECISION,
        retest_citation_rate DOUBLE PRECISION,
        baseline_position INTEGER,
        retest_position INTEGER,
        retest_date TIMESTAMP WITH TIME ZONE
      );
    `);

    // 8. Page Analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_analyses (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        url TEXT NOT NULL,
        target_prompt TEXT,
        analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        extractability_score DOUBLE PRECISION,
        extractability_status TEXT,
        has_schema_markup BOOLEAN,
        has_structured_schema BOOLEAN,
        detected_schema_types JSONB,
        has_comparison_tables BOOLEAN,
        has_comparison_table BOOLEAN,
        has_clear_heading_answers BOOLEAN,
        entity_clarity_status TEXT NOT NULL,
        actionable_recommendations JSONB,
        content_length INTEGER,
        h1 TEXT,
        h2_count INTEGER,
        findings JSONB
      );
    `);

    // 9. Brand Memories table (The Brain / Embeddings & Chunks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_memories (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        source_url TEXT,
        source_type TEXT DEFAULT 'crawler',
        content TEXT NOT NULL,
        key_facts JSONB NOT NULL,
        embedding JSONB,
        relevance_score DOUBLE PRECISION,
        confidence TEXT DEFAULT 'High',
        tags JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 10. AEO Contents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS aeo_contents (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        target_prompt_text TEXT,
        content_type TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        meta_description TEXT,
        target_h2s JSONB,
        markdown_body TEXT NOT NULL,
        structured_data_json_ld TEXT,
        used_memory_ids JSONB,
        used_memory_titles JSONB,
        fact_check_status TEXT DEFAULT 'Verified with Brand Memory',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 11. Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        default_runs_per_prompt INTEGER DEFAULT 3,
        active_engine TEXT DEFAULT 'gemini-grounded',
        scheduled_cycle_frequency TEXT DEFAULT 'off',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 12. Google Integrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_integrations (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        gsc_connected BOOLEAN DEFAULT FALSE,
        ga4_connected BOOLEAN DEFAULT FALSE,
        user_email TEXT,
        selected_gsc_site TEXT,
        selected_ga4_property_id TEXT,
        available_gsc_sites JSONB,
        available_ga4_properties JSONB,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        client_id TEXT,
        client_secret TEXT,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Indexes for high performance queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients (owner_id);
      CREATE INDEX IF NOT EXISTS idx_prompts_client ON prompts (client_id);
      CREATE INDEX IF NOT EXISTS idx_run_cycles_client ON run_cycles (client_id);
      CREATE INDEX IF NOT EXISTS idx_runs_client ON runs (client_id);
      CREATE INDEX IF NOT EXISTS idx_runs_cycle ON runs (cycle_id);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_client ON diagnostics (client_id);
      CREATE INDEX IF NOT EXISTS idx_actions_client ON actions (client_id);
      CREATE INDEX IF NOT EXISTS idx_page_analyses_client ON page_analyses (client_id);
      CREATE INDEX IF NOT EXISTS idx_brand_memories_client ON brand_memories (client_id);
      CREATE INDEX IF NOT EXISTS idx_aeo_contents_client ON aeo_contents (client_id);
    `);

    console.log('Inserting/updating real clients and prompt sets in Neon DB...');

    // Seed/Upsert Snacks For Party Client
    await client.query(`
      INSERT INTO clients (
        id, owner_id, brand_name, aliases, domain, competitor_domains, competitor_brands,
        categorized_competitors, industry, market, language, city, short_summary, positioning,
        detailed_description, target_audience, products_services, key_differentiators,
        is_demo, default_runs_per_prompt, scheduled_cycle_frequency, auto_run_interval_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        aliases = EXCLUDED.aliases,
        domain = EXCLUDED.domain,
        competitor_domains = EXCLUDED.competitor_domains,
        competitor_brands = EXCLUDED.competitor_brands,
        categorized_competitors = EXCLUDED.categorized_competitors,
        industry = EXCLUDED.industry,
        market = EXCLUDED.market,
        language = EXCLUDED.language,
        city = EXCLUDED.city,
        short_summary = EXCLUDED.short_summary,
        positioning = EXCLUDED.positioning,
        detailed_description = EXCLUDED.detailed_description,
        target_audience = EXCLUDED.target_audience,
        products_services = EXCLUDED.products_services,
        key_differentiators = EXCLUDED.key_differentiators;
    `, [
      DEMO_CLIENT.id,
      DEMO_CLIENT.ownerId || 'user-snacksforparty',
      DEMO_CLIENT.brandName,
      JSON.stringify(DEMO_CLIENT.aliases || []),
      DEMO_CLIENT.domain,
      JSON.stringify(DEMO_CLIENT.competitorDomains || []),
      JSON.stringify(DEMO_CLIENT.competitorBrands || []),
      JSON.stringify(DEMO_CLIENT.categorizedCompetitors || null),
      DEMO_CLIENT.industry,
      DEMO_CLIENT.market,
      DEMO_CLIENT.language,
      DEMO_CLIENT.city || null,
      DEMO_CLIENT.shortSummary || null,
      DEMO_CLIENT.positioning || null,
      DEMO_CLIENT.detailedDescription || null,
      DEMO_CLIENT.targetAudience || null,
      DEMO_CLIENT.productsServices || null,
      DEMO_CLIENT.keyDifferentiators || null,
      false,
      DEMO_CLIENT.defaultRunsPerPrompt || 3,
      DEMO_CLIENT.scheduledCycleFrequency || 'off',
      DEMO_CLIENT.autoRunIntervalDays || null,
    ]);

    // Upsert Prompts for Snacks For Party
    for (const p of DEMO_PROMPTS) {
      await client.query(`
        INSERT INTO prompts (id, owner_id, client_id, text, intent_layer, category, active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          intent_layer = EXCLUDED.intent_layer,
          category = EXCLUDED.category,
          active = EXCLUDED.active;
      `, [
        p.id,
        p.ownerId || 'user-snacksforparty',
        p.clientId || DEMO_CLIENT.id,
        p.text,
        p.intentLayer,
        p.category,
        p.active !== false,
        p.createdAt ? new Date(p.createdAt) : new Date(),
      ]);
    }

    // Seed/Upsert FilmFolk Client
    await client.query(`
      INSERT INTO clients (
        id, owner_id, brand_name, aliases, domain, competitor_domains, competitor_brands,
        categorized_competitors, industry, market, language, city, short_summary, positioning,
        detailed_description, target_audience, products_services, key_differentiators,
        is_demo, default_runs_per_prompt, scheduled_cycle_frequency, auto_run_interval_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        aliases = EXCLUDED.aliases,
        domain = EXCLUDED.domain,
        competitor_domains = EXCLUDED.competitor_domains,
        competitor_brands = EXCLUDED.competitor_brands,
        categorized_competitors = EXCLUDED.categorized_competitors,
        industry = EXCLUDED.industry,
        market = EXCLUDED.market,
        language = EXCLUDED.language,
        city = EXCLUDED.city,
        short_summary = EXCLUDED.short_summary,
        positioning = EXCLUDED.positioning,
        detailed_description = EXCLUDED.detailed_description,
        target_audience = EXCLUDED.target_audience,
        products_services = EXCLUDED.products_services,
        key_differentiators = EXCLUDED.key_differentiators;
    `, [
      FILMFOLK_CLIENT.id,
      FILMFOLK_CLIENT.ownerId || 'default-owner',
      FILMFOLK_CLIENT.brandName,
      JSON.stringify(FILMFOLK_CLIENT.aliases || []),
      FILMFOLK_CLIENT.domain,
      JSON.stringify(FILMFOLK_CLIENT.competitorDomains || []),
      JSON.stringify(FILMFOLK_CLIENT.competitorBrands || []),
      JSON.stringify(FILMFOLK_CLIENT.categorizedCompetitors || null),
      FILMFOLK_CLIENT.industry,
      FILMFOLK_CLIENT.market,
      FILMFOLK_CLIENT.language,
      FILMFOLK_CLIENT.city || null,
      FILMFOLK_CLIENT.shortSummary || null,
      FILMFOLK_CLIENT.positioning || null,
      FILMFOLK_CLIENT.detailedDescription || null,
      FILMFOLK_CLIENT.targetAudience || null,
      FILMFOLK_CLIENT.productsServices || null,
      FILMFOLK_CLIENT.keyDifferentiators || null,
      false,
      FILMFOLK_CLIENT.defaultRunsPerPrompt || 3,
      FILMFOLK_CLIENT.scheduledCycleFrequency || 'off',
      FILMFOLK_CLIENT.autoRunIntervalDays || null,
    ]);

    for (const p of FILMFOLK_PROMPTS) {
      await client.query(`
        INSERT INTO prompts (id, owner_id, client_id, text, intent_layer, category, active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          intent_layer = EXCLUDED.intent_layer,
          category = EXCLUDED.category,
          active = EXCLUDED.active;
      `, [
        p.id,
        p.ownerId || 'default-owner',
        p.clientId || FILMFOLK_CLIENT.id,
        p.text,
        p.intentLayer,
        p.category,
        p.active !== false,
        p.createdAt ? new Date(p.createdAt) : new Date(),
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Neon PostgreSQL migration and schema bootstrap completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Neon migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateNeon().catch(err => {
  console.error(err);
  process.exit(1);
});
