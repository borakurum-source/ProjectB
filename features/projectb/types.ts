export type EngineId = 'gemini-grounded';

export interface VisibilityEngineInfo {
  id: EngineId;
  label: string;
  supportsGrounding: boolean;
  enabled: boolean;
  description: string;
}

export type IntentLayer = 'Informational' | 'Commercial' | 'Comparative' | 'Navigational' | 'Transactional';

export type CompetitorCategory = 'ECOMMERCE' | 'NO ECOMMERCE';

export interface CategorizedCompetitor {
  brand: string;
  domain: string;
  category: CompetitorCategory;
}

export interface Client {
  id: string;
  ownerId: string;
  brandName: string;
  aliases: string[];
  domain: string;
  competitorDomains: string[];
  competitorBrands: string[];
  categorizedCompetitors?: CategorizedCompetitor[];
  industry: string;
  market: string;
  language: string;
  city?: string;
  shortSummary?: string;
  positioning?: string;
  detailedDescription?: string;
  targetAudience?: string;
  productsServices?: string;
  keyDifferentiators?: string;
  isDemo?: boolean;
  defaultRunsPerPrompt?: number;
  scheduledCycleFrequency?: 'off' | 'weekly' | 'biweekly' | 'monthly';
  autoRunIntervalDays?: number;
  createdAt: string;
}

export interface Prompt {
  id: string;
  ownerId: string;
  clientId: string;
  text: string;
  intentLayer: IntentLayer;
  category: string;
  active: boolean;
  createdAt: string;
}

export interface GroundingSource {
  uri?: string;
  redirectUri?: string;
  displayTitle: string;
  resolvedDomain: string | null;
  snippet?: string;
  supportedClaims?: string[];
}

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'Positive' | 'Neutral' | 'Negative';

export interface MentionedBrand {
  name: string;
  isClient: boolean;
  isKnownCompetitor: boolean;
  sentiment: Sentiment;
  verbatimQuote: string;
}

export interface RawEngineResult {
  engineId: EngineId;
  model: string;
  answerText: string;
  groundingSources: GroundingSource[];
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } } | any>;
  webSearchQueries: string[];
  error?: string | null;
}

export interface VisibilityEngine {
  id: EngineId;
  label: string;
  supportsGrounding: boolean;
  run(prompt: string): Promise<RawEngineResult>;
}

export interface StructuredExtractionResult {
  mentionedBrands: MentionedBrand[];
  orderedList: boolean;
  rankedNames: string[];
  recommendedEntityType?: string;
  answerFormat: 'list' | 'prose' | 'table' | 'steps';
}

export interface Run {
  id: string;
  ownerId: string;
  clientId: string;
  cycleId: string;
  promptId: string;
  engine: EngineId;
  model: string;
  runIndex: number;
  runAt: string;
  answerText: string;
  groundingSources: GroundingSource[];
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } } | any>;
  webSearchQueries: string[];
  brandMentioned: boolean;
  brandCited: boolean;
  position: number | null; // integer position ONLY when ordered list, else null
  prominence: number | null; // firstMentionOffset / answerLength (labeled experimental)
  mentionedBrands: MentionedBrand[];
  orderedList: boolean;
  rankedNames: string[];
  recommendedEntityType?: string;
  answerFormat: 'list' | 'prose' | 'table' | 'steps';
  error: string | null;
}

export interface RunCycle {
  id: string;
  ownerId: string;
  clientId: string;
  startedAt: string;
  completedAt?: string;
  engines: EngineId[];
  runsPerPrompt: number;
  expectedRunCount: number;
  expectedCallCount: number;
  completedRunCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  callCount: number;
  error?: string;
  isRetest?: boolean;
  retestedActionId?: string;
}

export type DiagnosisDimension =
  | 'Intent Match'
  | 'Entity Clarity'
  | 'Answer Extractability'
  | 'Content Coverage'
  | 'Evidence / Authority'
  | 'Structured Information';

export type DiagnosisStatus = 'Strong' | 'Adequate' | 'Weak' | 'Missing' | 'Unknown';

export interface DimensionEvaluation {
  status: DiagnosisStatus;
  explanation: string;
  evidenceQuote?: string;
}

export interface Diagnostic {
  id: string;
  ownerId: string;
  clientId: string;
  promptId: string;
  cycleId: string;
  dimensions: Record<DiagnosisDimension, DimensionEvaluation>;
  observedEvidence: string;
  likelyGap: string;
  confidence: 'High' | 'Medium' | 'Low';
  recommendedActionSummary: string;
  validationMethod: string;
  createdAt: string;
}

export type ActionPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ActionImpact = 'High' | 'Medium' | 'Low';
export type ActionEffort = 'High' | 'Medium' | 'Low';
export type ActionStatus = 'Todo' | 'In Progress' | 'Implemented' | 'Retested';

export interface ActionItem {
  id: string;
  ownerId: string;
  clientId: string;
  diagnosticId?: string;
  promptIds: string[];
  title: string;
  why: string;
  evidence: {
    sourceUrl?: string;
    quote?: string;
    observedFact: string;
  };
  exactRecommendation: string;
  priority: ActionPriority;
  impact: ActionImpact;
  effort: ActionEffort;
  validation: string;
  status: ActionStatus;
  createdAt: string;
  pageUrl?: string;
  implementedAt?: string;
  baselineMentionRate?: number;
  retestMentionRate?: number;
  baselineCitationRate?: number;
  retestCitationRate?: number;
  baselinePosition?: number | null;
  retestPosition?: number | null;
  retestDate?: string;
}

export interface PageAnalysisFinding {
  dimension: string;
  observation: string;
  concreteSuggestion: string;
}

export interface PageAnalysis {
  id: string;
  ownerId: string;
  clientId: string;
  url: string;
  targetPrompt?: string;
  analyzedAt: string;
  extractabilityScore?: number;
  extractabilityStatus?: DiagnosisStatus;
  hasSchemaMarkup?: boolean;
  hasStructuredSchema?: boolean;
  detectedSchemaTypes?: string[];
  hasComparisonTables?: boolean;
  hasComparisonTable?: boolean;
  hasClearHeadingAnswers?: boolean;
  entityClarityStatus: DiagnosisStatus;
  actionableRecommendations?: string[];
  contentLength?: number;
  h1?: string;
  h2Count?: number;
  findings?: PageAnalysisFinding[];
}

export interface AppSettings {
  defaultRunsPerPrompt: number;
  activeEngine: EngineId;
  scheduledCycleFrequency?: 'off' | 'weekly' | 'biweekly' | 'monthly';
  firecrawlApiKey?: string;
  perplexityApiKey?: string;
}

export type SnapshotProvider =
  | 'gemini-grounded'
  | 'firecrawl';

export type ProviderSnapshotStatus =
  | 'available'
  | 'not_configured'
  | 'unavailable'
  | 'failed';

export interface ProviderSnapshot {
  id?: string;
  clientId: string;
  provider: SnapshotProvider;
  status: ProviderSnapshotStatus;
  capturedAt: string;
  promptSetFingerprint?: string;
  promptCount?: number;
  runsPerPrompt?: number;
  engineLabel?: string;
  metrics?: Record<string, number | string | boolean | null>;
  rawPayload?: Record<string, unknown>;
  sourceUrl?: string;
  error?: string;
}

export interface GoogleIntegrationState {
  gscConnected: boolean;
  ga4Connected: boolean;
  userEmail?: string;
  selectedGscSite?: string;
  selectedGa4PropertyId?: string;
  availableGscSites?: Array<{ siteUrl: string; permissionLevel: string }>;
  availableGa4Properties?: Array<{ propertyId: string; displayName: string }>;
  lastSyncAt?: string;
  clientIdConfigured?: boolean;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  redirectUri?: string;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connected?: boolean;
  clientId?: string;
  clientSecret?: string;
}

export interface GscPerformanceData {
  siteUrl: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Ga4AiReferralData {
  propertyId: string;
  date: string;
  sourceDomain: string; // e.g. chatgpt.com, gemini.google.com, perplexity.ai
  sessions: number;
  users: number;
  conversions: number;
}

// Derived deterministic metric interfaces with explicit sample sizes
export interface MetricValue<T = number> {
  value: T;
  sampleSize: number;
  display: string;
}

export interface PromptAggregate {
  promptId: string;
  promptText: string;
  category: string;
  intentLayer: IntentLayer;
  runsCount: number;
  mentionRate: number; // 0 to 1
  mentionCount: number;
  citationRate: number; // 0 to 1
  citationCount: number;
  volatility: boolean; // true if mentionRate > 0 && mentionRate < 1
  avgPosition: number | null;
  prominence: number | null;
  competitorMentionRates: Record<string, { rate: number; count: number }>;
  topSourceDomains: { domain: string; count: number }[];
  lastRunAt?: string;
}

export interface CycleAggregate {
  cycleId: string;
  clientId: string;
  engine: EngineId;
  startedAt: string;
  totalRuns: number;
  promptsCount: number;
  runsPerPrompt?: number;
  overallMentionRate: number;
  overallCitationRate: number;
  shareOfVoice: Record<string, { share: number; mentionCount: number }>;
  volatilityCount: number;
  leaderboardDomains: { domain: string; count: number; citationRate: number; sampleSize: number }[];
}

export interface OpportunityPrompt {
  text: string;
  intentLayer: IntentLayer;
  category: string;
  rationale: string;
  targetCompetitor?: string;
}

export type BrandMemoryEntityType = 
  | 'company_overview'
  | 'product_feature'
  | 'pricing_plan'
  | 'competitor_diff'
  | 'use_case'
  | 'citation_source'
  | 'target_audience'
  | 'faq_fact'
  | 'ai_perception_insight'
  | 'gsc_demand_query'
  | 'ga4_engagement_signal';

export interface BrandMemoryItem {
  id: string;
  clientId: string;
  title: string;
  entityType: BrandMemoryEntityType;
  sourceUrl?: string;
  sourceType: 'crawler' | 'manual' | 'diagnostic_discovery' | 'file_upload' | 'run_cycle_insight' | 'gsc_sync' | 'ga4_sync' | 'ai_synthesized';
  content: string;
  keyFacts: string[];
  embedding?: number[];
  relevanceScore?: number;
  confidence: 'High' | 'Medium' | 'Low';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandGraphNode {
  id: string;
  label: string;
  type: 'brand' | 'product' | 'feature' | 'pricing' | 'competitor' | 'source' | 'gsc_query' | 'ai_insight' | 'synapse';
  val: number; // size / importance
  color?: string;
  details?: string;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface BrandGraphLink {
  source: string;
  target: string;
  label?: string;
  strength?: number;
}

export interface BrandKnowledgeGraph {
  nodes: BrandGraphNode[];
  links: BrandGraphLink[];
}

export interface BrandMemoryQueryMatch {
  item: BrandMemoryItem;
  similarity: number;
}

export type AeoContentType = 
  | 'comparison_table'
  | 'faq_schema_page'
  | 'product_capability_guide'
  | 'industry_solution_page'
  | 'pricing_transparency_page'
  | 'citation_booster_article';

export interface AeoGeneratedContent {
  id: string;
  clientId: string;
  targetPromptText?: string;
  contentType: AeoContentType;
  title: string;
  slug: string;
  metaDescription: string;
  targetH2s: string[];
  markdownBody: string;
  structuredDataJsonLd: string; // JSON-LD Schema (FAQPage, Product, etc.)
  usedMemoryIds: string[];
  usedMemoryTitles: string[];
  factCheckStatus: 'Verified with Brand Memory' | 'Requires Verification';
  createdAt: string;
}
