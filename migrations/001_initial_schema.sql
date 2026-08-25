-- Multi-tenant schema for ProjectB

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  brandName VARCHAR(255) NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  domain VARCHAR(255) NOT NULL,
  competitorDomains TEXT[] DEFAULT '{}',
  competitorBrands TEXT[] DEFAULT '{}',
  industry VARCHAR(255),
  market VARCHAR(255),
  language VARCHAR(10) DEFAULT 'en',
  isDemo BOOLEAN DEFAULT false,
  defaultRunsPerPrompt INTEGER DEFAULT 3,
  scheduledCycleFrequency VARCHAR(20) DEFAULT 'weekly',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  intentLayer VARCHAR(50) NOT NULL,
  category VARCHAR(255),
  active BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Run cycles table
CREATE TABLE IF NOT EXISTS run_cycles (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  startedAt TIMESTAMP NOT NULL,
  completedAt TIMESTAMP,
  engines TEXT[] NOT NULL,
  runsPerPrompt INTEGER DEFAULT 3,
  status VARCHAR(50) NOT NULL,
  callCount INTEGER DEFAULT 0,
  error TEXT,
  isRetest BOOLEAN DEFAULT false,
  retestedActionId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Runs table
CREATE TABLE IF NOT EXISTS runs (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycleId VARCHAR(255) NOT NULL REFERENCES run_cycles(id) ON DELETE CASCADE,
  promptId VARCHAR(255) NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  engine VARCHAR(50) NOT NULL,
  model VARCHAR(255),
  runIndex INTEGER,
  runAt TIMESTAMP NOT NULL,
  answerText TEXT,
  groundingSources JSONB DEFAULT '[]',
  groundingChunks JSONB DEFAULT '[]',
  webSearchQueries TEXT[] DEFAULT '{}',
  brandMentioned BOOLEAN DEFAULT false,
  brandCited BOOLEAN DEFAULT false,
  position INTEGER,
  prominence NUMERIC,
  mentionedBrands JSONB DEFAULT '[]',
  orderedList BOOLEAN DEFAULT false,
  rankedNames TEXT[] DEFAULT '{}',
  recommendedEntityType VARCHAR(255),
  answerFormat VARCHAR(50),
  error TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diagnostics table
CREATE TABLE IF NOT EXISTS diagnostics (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  promptId VARCHAR(255) NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  cycleId VARCHAR(255) NOT NULL REFERENCES run_cycles(id) ON DELETE CASCADE,
  dimensions JSONB NOT NULL,
  observedEvidence TEXT,
  likelyGap TEXT,
  confidence VARCHAR(50),
  recommendedActionSummary TEXT,
  validationMethod TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action items table
CREATE TABLE IF NOT EXISTS action_items (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  diagnosticId VARCHAR(255) REFERENCES diagnostics(id) ON DELETE SET NULL,
  promptIds TEXT[] DEFAULT '{}',
  title VARCHAR(255) NOT NULL,
  why TEXT,
  evidence JSONB NOT NULL,
  exactRecommendation TEXT,
  priority VARCHAR(50),
  impact VARCHAR(50),
  effort VARCHAR(50),
  validation TEXT,
  status VARCHAR(50) NOT NULL,
  pageUrl VARCHAR(2048),
  implementedAt TIMESTAMP,
  baselineMentionRate NUMERIC,
  retestMentionRate NUMERIC,
  baselineCitationRate NUMERIC,
  retestCitationRate NUMERIC,
  baselinePosition INTEGER,
  retestPosition INTEGER,
  retestDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page analyses table
CREATE TABLE IF NOT EXISTS page_analyses (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  targetPrompt TEXT,
  analyzedAt TIMESTAMP NOT NULL,
  extractabilityScore INTEGER,
  extractabilityStatus VARCHAR(50),
  hasSchemaMarkup BOOLEAN,
  hasStructuredSchema BOOLEAN,
  detectedSchemaTypes TEXT[] DEFAULT '{}',
  hasComparisonTables BOOLEAN,
  hasClearHeadingAnswers BOOLEAN,
  entityClarityStatus VARCHAR(50),
  actionableRecommendations TEXT[] DEFAULT '{}',
  contentLength INTEGER,
  h1 TEXT,
  h2Count INTEGER,
  findings JSONB DEFAULT '[]',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id VARCHAR(255) PRIMARY KEY,
  ownerId VARCHAR(255),
  defaultRunsPerPrompt INTEGER DEFAULT 3,
  activeEngine VARCHAR(50) DEFAULT 'gemini-grounded',
  perplexityApiKey TEXT,
  scheduledCycleFrequency VARCHAR(20) DEFAULT 'weekly',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ownerId)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(ownerId);
CREATE INDEX IF NOT EXISTS idx_clients_domain ON clients(domain);
CREATE INDEX IF NOT EXISTS idx_prompts_owner_client ON prompts(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_prompts_client_id ON prompts(clientId);
CREATE INDEX IF NOT EXISTS idx_runs_owner_client ON runs(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_runs_cycle_id ON runs(cycleId);
CREATE INDEX IF NOT EXISTS idx_runs_prompt_id ON runs(promptId);
CREATE INDEX IF NOT EXISTS idx_cycles_owner_client ON run_cycles(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON run_cycles(status);
CREATE INDEX IF NOT EXISTS idx_diagnostics_owner_client ON diagnostics(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_actions_owner_client ON action_items(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_actions_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_analyses_owner_client ON page_analyses(ownerId, clientId);
CREATE INDEX IF NOT EXISTS idx_analyses_url ON page_analyses(url);
