import { pgTable, text, timestamp, boolean, integer, jsonb, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  displayName: text('display_name'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  brandName: text('brand_name').notNull(),
  aliases: jsonb('aliases').notNull(), // string[]
  domain: text('domain').notNull(),
  competitorDomains: jsonb('competitor_domains').notNull(), // string[]
  competitorBrands: jsonb('competitor_brands').notNull(), // string[]
  categorizedCompetitors: jsonb('categorized_competitors'), // CategorizedCompetitor[]
  industry: text('industry').notNull(),
  market: text('market').notNull(),
  language: text('language').notNull(),
  city: text('city'),
  shortSummary: text('short_summary'),
  positioning: text('positioning'),
  detailedDescription: text('detailed_description'),
  targetAudience: text('target_audience'),
  productsServices: text('products_services'),
  keyDifferentiators: text('key_differentiators'),
  isDemo: boolean('is_demo').default(false),
  defaultRunsPerPrompt: integer('default_runs_per_prompt').default(3),
  scheduledCycleFrequency: text('scheduled_cycle_frequency').default('off'),
  autoRunIntervalDays: integer('auto_run_interval_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  text: text('text').notNull(),
  intentLayer: text('intent_layer').notNull(),
  category: text('category').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const runCycles = pgTable('run_cycles', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  engines: jsonb('engines').notNull(), // EngineId[]
  runsPerPrompt: integer('runs_per_prompt').notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed' | 'partial'
  callCount: integer('call_count').default(0).notNull(),
  error: text('error'),
  isRetest: boolean('is_retest').default(false),
  retestedActionId: text('retested_action_id'),
});

export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  cycleId: text('cycle_id').notNull(),
  promptId: text('prompt_id').notNull(),
  engine: text('engine').notNull(),
  model: text('model').notNull(),
  runIndex: integer('run_index').notNull(),
  runAt: timestamp('run_at').defaultNow().notNull(),
  answerText: text('answer_text').notNull(),
  groundingSources: jsonb('grounding_sources').notNull(),
  groundingChunks: jsonb('grounding_chunks'),
  webSearchQueries: jsonb('web_search_queries').notNull(),
  brandMentioned: boolean('brand_mentioned').notNull(),
  brandCited: boolean('brand_cited').notNull(),
  position: integer('position'),
  prominence: doublePrecision('prominence'),
  mentionedBrands: jsonb('mentioned_brands').notNull(),
  orderedList: boolean('ordered_list').default(false),
  rankedNames: jsonb('ranked_names'),
  recommendedEntityType: text('recommended_entity_type'),
  answerFormat: text('answer_format'),
  error: text('error'),
});

export const diagnostics = pgTable('diagnostics', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  promptId: text('prompt_id').notNull(),
  cycleId: text('cycle_id').notNull(),
  dimensions: jsonb('dimensions').notNull(),
  observedEvidence: text('observed_evidence').notNull(),
  likelyGap: text('likely_gap').notNull(),
  confidence: text('confidence').notNull(),
  recommendedActionSummary: text('recommended_action_summary').notNull(),
  validationMethod: text('validation_method').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const actions = pgTable('actions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  diagnosticId: text('diagnostic_id'),
  promptIds: jsonb('prompt_ids').notNull(), // string[]
  title: text('title').notNull(),
  why: text('why').notNull(),
  evidence: jsonb('evidence').notNull(),
  exactRecommendation: text('exact_recommendation').notNull(),
  priority: text('priority').notNull(),
  impact: text('impact').notNull(),
  effort: text('effort').notNull(),
  validation: text('validation').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  pageUrl: text('page_url'),
  implementedAt: timestamp('implemented_at'),
  baselineMentionRate: doublePrecision('baseline_mention_rate'),
  retestMentionRate: doublePrecision('retest_mention_rate'),
  baselineCitationRate: doublePrecision('baseline_citation_rate'),
  retestCitationRate: doublePrecision('retest_citation_rate'),
  baselinePosition: integer('baseline_position'),
  retestPosition: integer('retest_position'),
  retestDate: timestamp('retest_date'),
});

export const pageAnalyses = pgTable('page_analyses', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  clientId: text('client_id').notNull(),
  url: text('url').notNull(),
  targetPrompt: text('target_prompt'),
  analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
  extractabilityScore: doublePrecision('extractability_score'),
  extractabilityStatus: text('extractability_status'),
  hasSchemaMarkup: boolean('has_schema_markup'),
  hasStructuredSchema: boolean('has_structured_schema'),
  detectedSchemaTypes: jsonb('detected_schema_types'),
  hasComparisonTables: boolean('has_comparison_tables'),
  hasComparisonTable: boolean('has_comparison_table'),
  hasClearHeadingAnswers: boolean('has_clear_heading_answers'),
  entityClarityStatus: text('entity_clarity_status').notNull(),
  actionableRecommendations: jsonb('actionable_recommendations'),
  contentLength: integer('content_length'),
  h1: text('h1'),
  h2Count: integer('h2_count'),
  findings: jsonb('findings'),
});

export const brandMemories = pgTable('brand_memories', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  title: text('title').notNull(),
  entityType: text('entity_type').notNull(),
  sourceUrl: text('source_url'),
  sourceType: text('source_type').default('crawler'),
  content: text('content').notNull(),
  keyFacts: jsonb('key_facts').notNull(), // string[]
  embedding: jsonb('embedding'), // number[]
  relevanceScore: doublePrecision('relevance_score'),
  confidence: text('confidence').default('High'),
  tags: jsonb('tags').notNull(), // string[]
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aeoContents = pgTable('aeo_contents', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  targetPromptText: text('target_prompt_text'),
  contentType: text('content_type').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  metaDescription: text('meta_description'),
  targetH2s: jsonb('target_h2s'), // string[]
  markdownBody: text('markdown_body').notNull(),
  structuredDataJsonLd: text('structured_data_json_ld'),
  usedMemoryIds: jsonb('used_memory_ids'), // string[]
  usedMemoryTitles: jsonb('used_memory_titles'), // string[]
  factCheckStatus: text('fact_check_status').default('Verified with Brand Memory'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  defaultRunsPerPrompt: integer('default_runs_per_prompt').default(3),
  activeEngine: text('active_engine').default('gemini-grounded'),
  scheduledCycleFrequency: text('scheduled_cycle_frequency').default('off'),
  firecrawlApiKey: text('firecrawl_api_key'),
  perplexityApiKey: text('perplexity_api_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const googleIntegrations = pgTable('google_integrations', {
  id: text('id').primaryKey(), // ownerId or 'global'
  ownerId: text('owner_id').notNull(),
  gscConnected: boolean('gsc_connected').default(false),
  ga4Connected: boolean('ga4_connected').default(false),
  userEmail: text('user_email'),
  selectedGscSite: text('selected_gsc_site'),
  selectedGa4PropertyId: text('selected_ga4_property_id'),
  availableGscSites: jsonb('available_gsc_sites'),
  availableGa4Properties: jsonb('available_ga4_properties'),
  lastSyncAt: timestamp('last_sync_at'),
  clientId: text('client_id'),
  clientSecret: text('client_secret'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

