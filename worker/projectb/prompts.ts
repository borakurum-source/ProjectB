type MemorySource = { title: unknown; content: unknown };

export const RAGSIGNAL_SYSTEM_INSTRUCTION = `You are RAGSIGNAL, a B2B AI visibility and answer-engine optimisation analyst. Be precise, concise, and commercially useful. Preserve the supplied language. Never invent facts, statistics, customers, URLs, citations, performance results, or product capabilities. When the supplied evidence is insufficient, state that explicitly.`;

const shared = RAGSIGNAL_SYSTEM_INSTRUCTION;

export function buildPromptDiscoveryPrompt(input: { variant: "discover" | "opportunities"; client: string }) {
  return `${shared}\n\nCreate up to 20 ${input.variant === "opportunities" ? "high-intent opportunity" : "discovery"} prompts for this client:\n${input.client}\n\nWrite prompts as natural user questions, not keyword fragments. Cover relevant informational, commercial, comparative, navigational, and transactional intent only where justified by the client context. Avoid duplicates and unsupported competitor claims. Return JSON only: {"prompts":[{"text":"...","category":"...","intentLayer":"..."}]}.`;
}

export function buildMentionExtractionPrompt(input: { answer: string; brand: string; aliases: unknown; competitors: unknown }) {
  return `${shared}\n\nAnalyse the answer below. Return JSON only with mentionedBrands (array of {name,isClient,isKnownCompetitor,sentiment,verbatimQuote}), orderedList, rankedNames, recommendedEntityType, answerFormat. A brand is mentioned only when it appears in the answer. A rank position is valid only for an explicit ordered recommendation; do not infer one from prose.\n\nClient brand: ${input.brand}\nKnown aliases: ${JSON.stringify(input.aliases)}\nCompetitors: ${JSON.stringify(input.competitors)}\n\nAnswer:\n${input.answer}`;
}

export function buildProfilePrompt(input: { brandName: string; domain: string; industry: string; market: string; language: string }) {
  return `${shared}\n\nCreate a concise initial brand profile for ${input.brandName} (${input.domain}). Context: industry=${input.industry}; market=${input.market}; language=${input.language}. Clearly distinguish verified context from cautious suggestions. Return JSON only with aliases, competitorDomains, competitorBrands, industry, market, language, shortSummary, positioning, detailedDescription, targetAudience, productsServices, keyDifferentiators.`;
}

export function buildFanoutPrompt(prompt: string) {
  return `${shared}\n\nGenerate an AI-search query fan-out for this user prompt: ${prompt}\n\nReturn JSON only with queries (array of strings), intents (array of strings), and reasoning (string). Keep each query a plausible, non-leading user query. Do not add claims about brands or search engines.`;
}

export function buildDiagnosticPrompt(input: { client: string; prompt: string; runs: unknown[] }) {
  return `${shared}\n\nAssess the measurement data below. Report observed evidence separately from likely gaps. Do not claim causation: describe associations only. If the sample is too small or contradictory, use the exact phrase "Insufficient evidence" and lower confidence. Recommendations must be concrete and retestable. Return JSON only as {"diagnostic":{"dimensions":{},"observedEvidence":"","likelyGap":"","confidence":"","recommendedActionSummary":"","validationMethod":""}}.\n\nClient:\n${input.client}\n\nTracked prompt:\n${input.prompt}\n\nRuns:\n${JSON.stringify(input.runs)}`;
}

export function buildAeoPrompt(input: { contentType: string; topic: string; competitor: string; language: string; memories: MemorySource[] }) {
  const sources = input.memories.map((item) => `[${String(item.title)}]\n${String(item.content).slice(0, 5000)}`).join("\n\n");
  return `${shared}\n\nCreate a citation-ready AEO page in ${input.language || "the client language"}. Content type: ${input.contentType}. Target topic or prompt: ${input.topic}. Competitor context: ${input.competitor || "none supplied"}. Use only the supplied Brand Memory as factual support. Do not invent facts, statistics, customers, or citations. If the memory does not support a claim, omit it or mark it for verification. Use direct answers, scannable H2 sections, qualified claims, and appropriate JSON-LD only when it matches the content.\n\nBrand Memory:\n${sources || "No Brand Memory supplied; write only a verification-first framework."}\n\nReturn JSON only: {"title":"","metaDescription":"","targetH2s":[""],"markdownBody":"","structuredDataJsonLd":""}.`;
}

export function buildBrandMemoryAnswerPrompt(input: { question: string; context: string }) {
  return `${shared}\n\nAnswer the question using only the supplied Brand Memory. Attribute uncertainty to missing evidence rather than filling gaps. Do not cite a source that is not in the supplied context.\n\nBrand Memory:\n${input.context}\n\nQuestion: ${input.question}`;
}
