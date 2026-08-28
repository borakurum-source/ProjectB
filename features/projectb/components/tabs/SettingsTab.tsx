import { useState, useEffect } from 'react';
import { Client, Prompt } from '../../types';
import { Save, Download, RefreshCw, Check, Sparkles, Server, Terminal, Copy, Languages, AlertTriangle, CheckCircle2, Globe, Trash2 } from 'lucide-react';
import { GoogleIntegrationCard } from '../GoogleIntegrationCard';
import { validateClientLanguage } from '../../lib/languageValidator';

interface SettingsTabProps {
  client: Client;
  prompts?: Prompt[];
  onUpdateClient: (updated: Partial<Client>) => void;
  onDeleteClient?: (clientId: string) => void;
  onClearDemoData?: () => void;
  exportDataJson: () => void;
}

export function SettingsTab({
  client,
  prompts = [],
  onUpdateClient,
  onDeleteClient,
  onClearDemoData,
  exportDataJson,
}: SettingsTabProps) {
  const [brandName, setBrandName] = useState(client.brandName);
  const [domain, setDomain] = useState(client.domain);
  const [industry, setIndustry] = useState(client.industry || '');
  const [market, setMarket] = useState(client.market || '');
  const [language, setLanguage] = useState(client.language || '');
  const [city, setCity] = useState(client.city || '');
  const [shortSummary, setShortSummary] = useState(client.shortSummary || '');
  const [positioning, setPositioning] = useState(client.positioning || '');
  const [detailedDescription, setDetailedDescription] = useState(client.detailedDescription || '');
  const [targetAudience, setTargetAudience] = useState(client.targetAudience || '');
  const [productsServices, setProductsServices] = useState(client.productsServices || '');
  const [keyDifferentiators, setKeyDifferentiators] = useState(client.keyDifferentiators || '');
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [aliases, setAliases] = useState(client.aliases.join(', '));
  const [competitorBrands, setCompetitorBrands] = useState(client.competitorBrands.join(', '));
  const [competitorDomains, setCompetitorDomains] = useState(client.competitorDomains.join(', '));
  const [defaultN, setDefaultN] = useState<number>(client.defaultRunsPerPrompt || 3);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [firecrawlConfigured, setFirecrawlConfigured] = useState(false);

  // Gemini Model State
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');

  // MCP Server State
  const [mcpInfo, setMcpInfo] = useState<any>(null);
  const [testingMcp, setTestingMcp] = useState(false);
  const [copiedMcpSnippet, setCopiedMcpSnippet] = useState(false);

  const fetchMcpInfo = async () => {
    setTestingMcp(true);
    try {
      const res = await fetch('/api/mcp/info');
      const data = await res.json();
      setMcpInfo(data);
    } catch (err) {
      console.error('Failed to fetch MCP info', err);
    } finally {
      setTestingMcp(false);
    }
  };

  // Sync local input states when client prop updates
  useEffect(() => {
    setBrandName(client.brandName);
    setDomain(client.domain);
    setIndustry(client.industry || '');
    setMarket(client.market || '');
    setLanguage(client.language || '');
    setCity(client.city || '');
    setShortSummary(client.shortSummary || '');
    setPositioning(client.positioning || '');
    setDetailedDescription(client.detailedDescription || '');
    setTargetAudience(client.targetAudience || '');
    setProductsServices(client.productsServices || '');
    setKeyDifferentiators(client.keyDifferentiators || '');
    setAliases(client.aliases.join(', '));
    setCompetitorBrands(client.competitorBrands.join(', '));
    setCompetitorDomains(client.competitorDomains.join(', '));
    setDefaultN(client.defaultRunsPerPrompt || 3);
  }, [client]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.firecrawlApiKeyConfigured) {
          setFirecrawlConfigured(true);
        }
        if (data?.geminiModel) {
          setGeminiModel(data.geminiModel);
        }
      })
      .catch(() => {});
    fetchMcpInfo();
  }, []);

  const handleGenerateProfile = async () => {
    if (!brandName || !domain) {
      alert("Please enter a Primary Brand Name and Primary Domain first.");
      return;
    }
    setGeneratingProfile(true);
    try {
      const res = await fetch('/api/client/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, domain, language, market, industry }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to auto-generate brand profile.');
        return;
      }
      if (data.profile) {
        const p = data.profile;

        const aliasesArray = Array.isArray(p.aliases) ? p.aliases : [];
        const compBrandsArray = Array.isArray(p.competitorBrands) ? p.competitorBrands : [];
        const compDomainsArray = Array.isArray(p.competitorDomains) ? p.competitorDomains : [];

        const updatedFields: Record<string, any> = {
          shortSummary: p.shortSummary || shortSummary,
          positioning: p.positioning || positioning,
          detailedDescription: p.detailedDescription || detailedDescription,
          targetAudience: p.targetAudience || targetAudience,
          productsServices: p.productsServices || productsServices,
          keyDifferentiators: p.keyDifferentiators || keyDifferentiators,
          industry: p.industry || industry,
          city: p.city || city,
          market: p.market || market,
          language: p.language || language,
        };

        // Only auto-fill competitors for a brand-new client with none tracked yet.
        // A regenerate click must never clobber an already-curated competitor
        // list with a handful of freshly AI-guessed names — that's exactly what
        // desynced competitorBrands/competitorDomains from categorizedCompetitors
        // in production once already.
        const hasExistingCompetitors = client.competitorBrands.length > 0;
        if (aliasesArray.length > 0) updatedFields.aliases = aliasesArray;
        if (compBrandsArray.length > 0 && !hasExistingCompetitors) {
          updatedFields.competitorBrands = compBrandsArray;
          updatedFields.competitorDomains = compDomainsArray;
          updatedFields.categorizedCompetitors = compBrandsArray.map((brand: string, idx: number) => ({
            brand,
            domain: compDomainsArray[idx] || '',
            category: 'NO ECOMMERCE' as const,
          }));
        }

        if (p.shortSummary) setShortSummary(p.shortSummary);
        if (p.positioning) setPositioning(p.positioning);
        if (p.detailedDescription) setDetailedDescription(p.detailedDescription);
        if (p.targetAudience) setTargetAudience(p.targetAudience);
        if (p.productsServices) setProductsServices(p.productsServices);
        if (p.keyDifferentiators) setKeyDifferentiators(p.keyDifferentiators);
        if (p.industry) setIndustry(p.industry);
        if (p.city) setCity(p.city);
        if (p.market) setMarket(p.market);
        if (p.language) setLanguage(p.language);
        if (aliasesArray.length > 0) setAliases(aliasesArray.join(', '));
        if (compBrandsArray.length > 0 && !hasExistingCompetitors) {
          setCompetitorBrands(compBrandsArray.join(', '));
          setCompetitorDomains(compDomainsArray.join(', '));
        }

        // Automatically persist auto-generated profile to client state/Firestore
        onUpdateClient(updatedFields);

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error('Failed to generate profile', err);
      alert('Error generating profile: ' + (err?.message || 'Network error'));
    } finally {
      setGeneratingProfile(false);
    }
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    const brandsArray = competitorBrands.split(',').map((c) => c.trim()).filter(Boolean);
    const domainsArray = competitorDomains.split(',').map((d) => d.trim()).filter(Boolean);

    // Keep categorizedCompetitors (used by the Competitors tab for the
    // Ecommerce/No Ecommerce badge) in lockstep with the two flat text fields
    // above — otherwise editing brands/domains here silently desyncs it, since
    // this was the only place that could change them without touching it too.
    // Existing entries keep their known category (matched by brand name);
    // brand-new entries default to 'NO ECOMMERCE' since there's no reliable way
    // to infer it from a name/domain alone.
    const categorizedCompetitors = brandsArray.map((brand, idx) => {
      const existing = client.categorizedCompetitors?.find(
        (c) => c.brand.toLowerCase() === brand.toLowerCase()
      );
      return {
        brand,
        domain: domainsArray[idx] || existing?.domain || '',
        category: existing?.category || ('NO ECOMMERCE' as const),
      };
    });

    onUpdateClient({
      brandName: brandName.trim(),
      domain: domain.trim(),
      industry: industry.trim(),
      market: market.trim(),
      language: language.trim(),
      city: city.trim(),
      shortSummary: shortSummary.trim(),
      positioning: positioning.trim(),
      detailedDescription: detailedDescription.trim(),
      targetAudience: targetAudience.trim(),
      productsServices: productsServices.trim(),
      keyDifferentiators: keyDifferentiators.trim(),
      aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
      competitorBrands: brandsArray,
      competitorDomains: domainsArray,
      categorizedCompetitors,
      defaultRunsPerPrompt: defaultN,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const draftClient: Client = {
    ...client,
    brandName,
    domain,
    industry,
    market,
    language,
    city,
    shortSummary,
    positioning,
    detailedDescription,
    targetAudience,
    productsServices,
    keyDifferentiators,
  };

  const validationReport = validateClientLanguage(draftClient, prompts);

  return (
    <div className="space-y-6">
      {/* Client Profile Settings */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] dark:border-[#1E293B] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              Client Brand Profile & Domain Grounding
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Exact string matching aliases and publisher domains used for deterministic citation resolution.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateProfile}
              disabled={generatingProfile || !brandName || !domain}
              className="px-3 py-1.5 bg-[#EEF2FF] dark:bg-[#312E81] hover:bg-[#E0E7FF] dark:hover:bg-[#3730A3] border border-[#C7D2FE] dark:border-[#4338CA] text-[#4338CA] dark:text-[#A5B4FC] disabled:opacity-50 rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${generatingProfile ? 'animate-spin' : ''}`} />
              {generatingProfile ? 'Generating...' : 'Auto-Generate via AI'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Primary Brand Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Primary Domain (Grounding)
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. B2B Software, E-commerce"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Language
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. English, Turkish"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Target Country / Market
            </label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. US, Turkey, Germany, Global"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Target City / Location (Local GEO)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Istanbul, London, New York"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Short Summary
            </label>
            <textarea
              rows={2}
              value={shortSummary}
              onChange={(e) => setShortSummary(e.target.value)}
              placeholder="Brief overview of the brand..."
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Positioning / Value Prop
            </label>
            <textarea
              rows={2}
              value={positioning}
              onChange={(e) => setPositioning(e.target.value)}
              placeholder="Brand positioning statement..."
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
            Detailed Description
          </label>
          <textarea
            rows={3}
            value={detailedDescription}
            onChange={(e) => setDetailedDescription(e.target.value)}
            placeholder="Comprehensive description of the brand..."
            className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Target Audience
            </label>
            <textarea
              rows={3}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Who is this for?"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Products & Services
            </label>
            <textarea
              rows={3}
              value={productsServices}
              onChange={(e) => setProductsServices(e.target.value)}
              placeholder="Main offerings..."
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Key Differentiators
            </label>
            <textarea
              rows={3}
              value={keyDifferentiators}
              onChange={(e) => setKeyDifferentiators(e.target.value)}
              placeholder="What makes the brand unique?"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
            Brand Aliases (Comma-separated)
          </label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="e.g. Acme, Acme Analytics Inc, AcmeAPM"
            className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
          />
          <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Used during semantic extraction to count mentions even if the model uses an abbreviation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Tracked Competitor Brands (Comma-separated)
            </label>
            <input
              type="text"
              value={competitorBrands}
              onChange={(e) => setCompetitorBrands(e.target.value)}
              placeholder="e.g. Datadog, Dynatrace, New Relic"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
              Tracked Competitor Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={competitorDomains}
              onChange={(e) => setCompetitorDomains(e.target.value)}
              placeholder="e.g. datadoghq.com, dynatrace.com, newrelic.com"
              className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
            Default Measurement Sample Size (Runs per Prompt N)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDefaultN(n)}
                className={`py-1.5 px-4 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors border ${
                  defaultN === n
                    ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA] shadow-xs'
                    : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F3F4F6] dark:hover:bg-[#334155]'
                }`}
              >
                N={n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Industry standard B2B AEO measurement recommends N=3 to stabilize variance.
          </p>
        </div>
      </form>

      {/* Language Consistency & AI Output Validation Card */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F3F4F6] dark:border-[#1E293B] pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-[#4338CA] dark:text-[#818CF8]" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                AI Language Consistency & Alignment Indicator
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Validates that auto-generated brand profile fields and research prompts match target locale (<strong className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{validationReport.targetLanguageLabel}</strong>).
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {validationReport.isMatching ? (
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Language Aligned ({validationReport.targetLanguageLabel})
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-xs font-bold inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {validationReport.deviations.length} Language Deviation(s)
              </span>
            )}
          </div>
        </div>

        {validationReport.isMatching ? (
          <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            All {validationReport.totalChecked} checked client profile fields and prompts adhere strictly to {validationReport.targetLanguageLabel}.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded text-xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Deviating Content Detected ({validationReport.deviations.length} of {validationReport.totalChecked} checked items)
                </p>
                <button
                  type="button"
                  onClick={handleGenerateProfile}
                  disabled={generatingProfile}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs self-start sm:self-auto"
                >
                  <Sparkles className={`w-3 h-3 ${generatingProfile ? 'animate-spin' : ''}`} />
                  Re-Generate Profile in {validationReport.targetLanguageLabel}
                </button>
              </div>
              <ul className="divide-y divide-amber-200/80 dark:divide-amber-800/50 text-[11px]">
                {validationReport.deviations.map((dev, idx) => (
                  <li key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-950 dark:text-amber-100">{dev.label}</span>
                      <p className="text-amber-800/90 dark:text-amber-300/90 italic mt-0.5 font-mono text-[10px]">"{dev.snippet}"</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded text-[10px] font-medium border border-amber-300 dark:border-amber-700">
                        Detected: {dev.detectedLanguage} (Expected: {dev.expectedLanguage})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Engine Adapters & Credentials */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
            AI Visibility Engines & Model Adapters
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Engines are measured independently to prevent deceptive cross-engine averaging.
          </p>
        </div>

        <div className="space-y-3">
          {/* Gemini Grounded */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#111827] dark:bg-[#312E81] flex items-center justify-center text-white font-bold text-xs">
                  G
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">Gemini Grounded with Google Search</span>
                    <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                      ACTIVE
                    </span>
                    {geminiModel === 'gemini-2.5-flash' && (
                      <span className="text-[10px] bg-[#EEF2FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#4338CA] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        GEMINI 2.5
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                    Model: <code className="text-[#111827] dark:text-[#F8FAFC] font-mono font-bold">{geminiModel}</code> • Tool: Google Search Grounding
                  </div>
                </div>
              </div>
              <div className="text-xs text-[#065F46] dark:text-[#34D399] font-bold uppercase tracking-wider shrink-0">Auto-configured via AI Studio</div>
            </div>

            <p className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8]">Model and credential selection is managed through the private runtime configuration; values are never accepted from or revealed to the browser.</p>
          </div>

          {/* Firecrawl Scrape, Search & Map */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#C2410C] flex items-center justify-center text-white font-bold text-xs">
                  FC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">Firecrawl Scrape, Search & Map API</span>
                    {firecrawlConfigured ? (
                      <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#FFFBEB] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        OPTIONAL / KEY REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                    Clean Markdown Scraper • Domain Sitemap Discovery (`/map`) • Live Web Search (`/search`)
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-wider">
                {firecrawlConfigured ? (
                  <span className="text-[#065F46] dark:text-[#34D399]">Configured & Ready</span>
                ) : (
                  <span className="text-[#9CA3AF] dark:text-[#64748B]">Ask an administrator to configure it</span>
                )}
              </div>
            </div>

            <p className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] text-xs text-[#6B7280] dark:text-[#94A3B8]">The Firecrawl key is held only in the server runtime and cannot be viewed or replaced here.</p>
          </div>
        </div>
      </div>

      {/* Google Integrations */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
            Google Search Console (GSC) & Google Analytics 4 (GA4) Integrations
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Connect your Google account to fetch Search Console organic clicks/impressions and GA4 AI referral traffic.
          </p>
        </div>

        <GoogleIntegrationCard clientDomain={client.domain} clientBrandName={client.brandName} />
      </div>

      {/* MCP (Model Context Protocol) Server */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] dark:border-[#1E293B] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4338CA] flex items-center justify-center text-white rounded font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                  Model Context Protocol (MCP) Server
                </h3>
                <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-2 py-0.5 font-bold uppercase tracking-wider rounded">
                  ONLINE & LISTENING
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                Expose RAG Signal AEO/GEO visibility metrics, share of voice, citations, and prompts to external AI clients (Cursor, Claude Desktop, Auto-agents).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchMcpInfo}
            disabled={testingMcp}
            className="px-3 py-1.5 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded text-xs font-bold uppercase tracking-wider border border-[#D1D5DB] dark:border-[#334155] inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            {testingMcp ? 'Testing...' : 'Test MCP Capabilities'}
          </button>
        </div>

        {/* Endpoints Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase">SSE Stream Endpoint</span>
              <button
                type="button"
                onClick={() => {
                  const sseUrl = mcpInfo?.endpoints?.sse || `${window.location.origin}/api/mcp/sse`;
                  navigator.clipboard.writeText(sseUrl);
                  setCopiedMcpSnippet(true);
                  setTimeout(() => setCopiedMcpSnippet(false), 2000);
                }}
                className="text-[10px] font-bold text-[#4338CA] dark:text-[#818CF8] hover:underline inline-flex items-center gap-1"
                title="Copy SSE URL"
              >
                <Copy className="w-3 h-3" /> Copy URL
              </button>
            </div>
            <div className="font-mono text-xs font-bold text-[#4338CA] dark:text-[#818CF8] mt-1 select-all break-all">
              {mcpInfo?.endpoints?.sse || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/sse`}
            </div>
          </div>
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded">
            <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase">Message Postback Endpoint</span>
            <div className="font-mono text-xs font-bold text-[#059669] dark:text-[#34D399] mt-1 select-all break-all">
              {mcpInfo?.endpoints?.messages || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/messages`}
            </div>
          </div>
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded">
            <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase">Direct JSON-RPC Endpoint</span>
            <div className="font-mono text-xs font-bold text-[#D97706] dark:text-[#FBBF24] mt-1 select-all break-all">
              {mcpInfo?.endpoints?.rpc || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/rpc`}
            </div>
          </div>
        </div>

        {/* Available MCP Tools & Capabilities */}
        <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded space-y-2">
          <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
            Exposed MCP Tools ({mcpInfo?.capabilities?.tools?.length || 7}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(mcpInfo?.capabilities?.tools || [
              'list_clients',
              'get_client_overview',
              'list_prompts',
              'get_share_of_voice',
              'get_citation_leaderboard',
              'get_latest_diagnostics',
              'list_action_items',
            ]).map((toolName: string) => (
              <span key={toolName} className="font-mono text-[11px] bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] px-2 py-0.5 rounded text-[#374151] dark:text-[#CBD5E1]">
                🛠️ {toolName}
              </span>
            ))}
          </div>
        </div>

        {/* Configuration Code Blocks */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">Cursor / Claude Desktop Integration Code:</span>
            <button
              type="button"
              onClick={() => {
                const textToCopy = JSON.stringify(mcpInfo?.configInstructions || {
                  claudeDesktop: {
                    mcpServers: {
                      'rag-signal': {
                        url: mcpInfo?.endpoints?.sse || `${window.location.origin}/api/mcp/sse`,
                      },
                    },
                  },
                }, null, 2);
                navigator.clipboard.writeText(textToCopy);
                setCopiedMcpSnippet(true);
                setTimeout(() => setCopiedMcpSnippet(false), 2000);
              }}
              className="text-xs text-[#4338CA] dark:text-[#818CF8] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedMcpSnippet ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMcpSnippet ? 'Copied to Clipboard!' : 'Copy Config JSON'}
            </button>
          </div>

          <pre className="p-3 bg-[#0F172A] text-[#F8FAFC] font-mono text-xs rounded overflow-x-auto border border-[#1E293B]">
            {JSON.stringify(
              mcpInfo?.configInstructions?.claudeDesktop || {
                mcpServers: {
                  'rag-signal': {
                    url: `${mcpInfo?.endpoints?.sse || 'https://.../api/mcp/sse'}`,
                  },
                },
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>

      {/* Data Export & Reset */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
            Data Management & Calibration Backup
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Export all client measurement logs, aggregates, and diagnostic history as structured JSON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportDataJson}
            className="px-3.5 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-[#D1D5DB] dark:border-[#334155] shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Workspace Data (JSON)
          </button>

          {onClearDemoData && (
            <button
              onClick={onClearDemoData}
              className="px-3.5 py-2 bg-white dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-[#D1D5DB] dark:border-[#334155] shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Demo Workspace
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone: Brand Deletion */}
      {onDeleteClient && (
        <div className="bg-white dark:bg-[#0F172A] border border-[#FCA5A5] dark:border-[#7F1D1D] p-5 shadow-xs space-y-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-[#EF4444]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#DC2626] dark:text-[#EF4444]">
              Danger Zone — Brand Workspace Management
            </h3>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Delete Brand: <span className="font-bold">{client.brandName}</span> ({client.domain})
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5 max-w-xl">
                Permanently delete this brand workspace, including all associated research prompts, scheduled run cycles, and visibility analytics history. This action cannot be undone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete "${client.brandName}" (${client.domain})?\n\nThis will remove all research prompts, run cycles, and analytics associated with this brand.`)) {
                  onDeleteClient(client.id);
                }
              }}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {client.brandName} Brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
