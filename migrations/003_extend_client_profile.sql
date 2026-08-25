-- Fix column casing: 001's unquoted CREATE TABLE identifiers were folded to
-- all-lowercase by Postgres (e.g. "ownerId" -> ownerid), but db-repo.ts reads
-- rows with `SELECT *` and expects camelCase JS keys matching src/types.ts.
-- Rename every affected column to its properly-quoted camelCase name so
-- `SELECT *` returns the right keys without per-query aliasing. Safe to run
-- now — all these tables are still empty (never wired to the running app).

ALTER TABLE clients RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE clients RENAME COLUMN brandname TO "brandName";
ALTER TABLE clients RENAME COLUMN competitordomains TO "competitorDomains";
ALTER TABLE clients RENAME COLUMN competitorbrands TO "competitorBrands";
ALTER TABLE clients RENAME COLUMN isdemo TO "isDemo";
ALTER TABLE clients RENAME COLUMN defaultrunsperprompt TO "defaultRunsPerPrompt";
ALTER TABLE clients RENAME COLUMN scheduledcyclefrequency TO "scheduledCycleFrequency";
ALTER TABLE clients RENAME COLUMN createdat TO "createdAt";
ALTER TABLE clients RENAME COLUMN updatedat TO "updatedAt";

-- New client profile fields that saveClient/getClient need but 001 never had
-- (onboarding's /api/client/generate-profile produces all of these).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "categorizedCompetitors" JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "shortSummary" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS positioning TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "detailedDescription" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "targetAudience" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "productsServices" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "keyDifferentiators" TEXT;

ALTER TABLE prompts RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE prompts RENAME COLUMN clientid TO "clientId";
ALTER TABLE prompts RENAME COLUMN intentlayer TO "intentLayer";
ALTER TABLE prompts RENAME COLUMN createdat TO "createdAt";
ALTER TABLE prompts RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE run_cycles RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE run_cycles RENAME COLUMN clientid TO "clientId";
ALTER TABLE run_cycles RENAME COLUMN startedat TO "startedAt";
ALTER TABLE run_cycles RENAME COLUMN completedat TO "completedAt";
ALTER TABLE run_cycles RENAME COLUMN runsperprompt TO "runsPerPrompt";
ALTER TABLE run_cycles RENAME COLUMN callcount TO "callCount";
ALTER TABLE run_cycles RENAME COLUMN isretest TO "isRetest";
ALTER TABLE run_cycles RENAME COLUMN retestedactionid TO "retestedActionId";
ALTER TABLE run_cycles RENAME COLUMN createdat TO "createdAt";
ALTER TABLE run_cycles RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE runs RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE runs RENAME COLUMN clientid TO "clientId";
ALTER TABLE runs RENAME COLUMN cycleid TO "cycleId";
ALTER TABLE runs RENAME COLUMN promptid TO "promptId";
ALTER TABLE runs RENAME COLUMN runindex TO "runIndex";
ALTER TABLE runs RENAME COLUMN runat TO "runAt";
ALTER TABLE runs RENAME COLUMN answertext TO "answerText";
ALTER TABLE runs RENAME COLUMN groundingsources TO "groundingSources";
ALTER TABLE runs RENAME COLUMN groundingchunks TO "groundingChunks";
ALTER TABLE runs RENAME COLUMN websearchqueries TO "webSearchQueries";
ALTER TABLE runs RENAME COLUMN brandmentioned TO "brandMentioned";
ALTER TABLE runs RENAME COLUMN brandcited TO "brandCited";
ALTER TABLE runs RENAME COLUMN mentionedbrands TO "mentionedBrands";
ALTER TABLE runs RENAME COLUMN orderedlist TO "orderedList";
ALTER TABLE runs RENAME COLUMN rankednames TO "rankedNames";
ALTER TABLE runs RENAME COLUMN recommendedentitytype TO "recommendedEntityType";
ALTER TABLE runs RENAME COLUMN answerformat TO "answerFormat";
ALTER TABLE runs RENAME COLUMN createdat TO "createdAt";
ALTER TABLE runs RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE diagnostics RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE diagnostics RENAME COLUMN clientid TO "clientId";
ALTER TABLE diagnostics RENAME COLUMN promptid TO "promptId";
ALTER TABLE diagnostics RENAME COLUMN cycleid TO "cycleId";
ALTER TABLE diagnostics RENAME COLUMN observedevidence TO "observedEvidence";
ALTER TABLE diagnostics RENAME COLUMN likelygap TO "likelyGap";
ALTER TABLE diagnostics RENAME COLUMN recommendedactionsummary TO "recommendedActionSummary";
ALTER TABLE diagnostics RENAME COLUMN validationmethod TO "validationMethod";
ALTER TABLE diagnostics RENAME COLUMN createdat TO "createdAt";
ALTER TABLE diagnostics RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE action_items RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE action_items RENAME COLUMN clientid TO "clientId";
ALTER TABLE action_items RENAME COLUMN diagnosticid TO "diagnosticId";
ALTER TABLE action_items RENAME COLUMN promptids TO "promptIds";
ALTER TABLE action_items RENAME COLUMN exactrecommendation TO "exactRecommendation";
ALTER TABLE action_items RENAME COLUMN pageurl TO "pageUrl";
ALTER TABLE action_items RENAME COLUMN implementedat TO "implementedAt";
ALTER TABLE action_items RENAME COLUMN baselinementionrate TO "baselineMentionRate";
ALTER TABLE action_items RENAME COLUMN retestmentionrate TO "retestMentionRate";
ALTER TABLE action_items RENAME COLUMN baselinecitationrate TO "baselineCitationRate";
ALTER TABLE action_items RENAME COLUMN retestcitationrate TO "retestCitationRate";
ALTER TABLE action_items RENAME COLUMN baselineposition TO "baselinePosition";
ALTER TABLE action_items RENAME COLUMN retestposition TO "retestPosition";
ALTER TABLE action_items RENAME COLUMN retestdate TO "retestDate";
ALTER TABLE action_items RENAME COLUMN createdat TO "createdAt";
ALTER TABLE action_items RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE page_analyses RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE page_analyses RENAME COLUMN clientid TO "clientId";
ALTER TABLE page_analyses RENAME COLUMN targetprompt TO "targetPrompt";
ALTER TABLE page_analyses RENAME COLUMN analyzedat TO "analyzedAt";
ALTER TABLE page_analyses RENAME COLUMN extractabilityscore TO "extractabilityScore";
ALTER TABLE page_analyses RENAME COLUMN extractabilitystatus TO "extractabilityStatus";
ALTER TABLE page_analyses RENAME COLUMN hasschemamarkup TO "hasSchemaMarkup";
ALTER TABLE page_analyses RENAME COLUMN hasstructuredschema TO "hasStructuredSchema";
ALTER TABLE page_analyses RENAME COLUMN detectedschematypes TO "detectedSchemaTypes";
ALTER TABLE page_analyses RENAME COLUMN hascomparisontables TO "hasComparisonTables";
ALTER TABLE page_analyses RENAME COLUMN hasclearheadinganswers TO "hasClearHeadingAnswers";
ALTER TABLE page_analyses RENAME COLUMN entityclaritystatus TO "entityClarityStatus";
ALTER TABLE page_analyses RENAME COLUMN actionablerecommendations TO "actionableRecommendations";
ALTER TABLE page_analyses RENAME COLUMN contentlength TO "contentLength";
ALTER TABLE page_analyses RENAME COLUMN h2count TO "h2Count";
ALTER TABLE page_analyses RENAME COLUMN createdat TO "createdAt";
ALTER TABLE page_analyses RENAME COLUMN updatedat TO "updatedAt";

ALTER TABLE app_settings RENAME COLUMN ownerid TO "ownerId";
ALTER TABLE app_settings RENAME COLUMN defaultrunsperprompt TO "defaultRunsPerPrompt";
ALTER TABLE app_settings RENAME COLUMN activeengine TO "activeEngine";
ALTER TABLE app_settings RENAME COLUMN perplexityapikey TO "perplexityApiKey";
ALTER TABLE app_settings RENAME COLUMN scheduledcyclefrequency TO "scheduledCycleFrequency";
ALTER TABLE app_settings RENAME COLUMN createdat TO "createdAt";
ALTER TABLE app_settings RENAME COLUMN updatedat TO "updatedAt";
