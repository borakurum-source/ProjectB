import { useState, useEffect, FormEvent } from 'react';
import { Client } from '../../types';
import { Save, Download, RefreshCw, Check, Key, Sparkles } from 'lucide-react';
import { GoogleIntegrationCard } from '../GoogleIntegrationCard';

interface SettingsTabProps {
  client: Client;
  onUpdateClient: (updated: Partial<Client>) => void;
  onResetDemoData: () => void;
  onClearDemoData?: () => void;
  exportDataJson: () => void;
}

export function SettingsTab({
  client,
  onUpdateClient,
  onResetDemoData,
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

  // Perplexity API Key state
  const [perplexityKeyInput, setPerplexityKeyInput] = useState('');
  const [perplexityConfigured, setPerplexityConfigured] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaveMsg, setKeySaveMsg] = useState('');

  // Firecrawl API Key state
  const [firecrawlKeyInput, setFirecrawlKeyInput] = useState('');
  const [firecrawlConfigured, setFirecrawlConfigured] = useState(false);
  const [savingFirecrawlKey, setSavingFirecrawlKey] = useState(false);
  const [firecrawlSaveMsg, setFirecrawlSaveMsg] = useState('');

  // Gemini Model State
  const [geminiModel, setGeminiModel] = useState('gemini-3.7-flash');

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
        if (data?.perplexityApiKeyConfigured) {
          setPerplexityConfigured(true);
        }
        if (data?.firecrawlApiKeyConfigured) {
          setFirecrawlConfigured(true);
        }
        if (data?.geminiModel) {
          setGeminiModel(data.geminiModel);
        }
      })
      .catch(() => {});
  }, []);

  const handleModelChange = async (newModel: string) => {
    setGeminiModel(newModel);
    try {
      await fetch('/api/settings/gemini-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModel }),
      });
    } catch (err) {
      console.error('Failed to update Gemini model', err);
    }
  };

  const handleSavePerplexityKey = async (e: FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setKeySaveMsg('');
    try {
      const res = await fetch('/api/settings/perplexity-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: perplexityKeyInput }),
      });
      const data = await res.json();
      if (data.configured) {
        setPerplexityConfigured(true);
        setKeySaveMsg('Perplexity Sonar engine activated!');
        setPerplexityKeyInput('');
      } else {
        setPerplexityConfigured(false);
        setKeySaveMsg('API Key cleared.');
      }
    } catch {
      setKeySaveMsg('Failed to update API key.');
    } finally {
      setSavingKey(false);
      setTimeout(() => setKeySaveMsg(''), 3000);
    }
  };

  const handleSaveFirecrawlKey = async (e: FormEvent) => {
    e.preventDefault();
    setSavingFirecrawlKey(true);
    setFirecrawlSaveMsg('');
    try {
      const res = await fetch('/api/settings/firecrawl-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: firecrawlKeyInput }),
      });
      const data = await res.json();
      if (data.configured) {
        setFirecrawlConfigured(true);
        setFirecrawlSaveMsg('Firecrawl Scrape & Map API activated!');
        setFirecrawlKeyInput('');
      } else {
        setFirecrawlConfigured(false);
        setFirecrawlSaveMsg('API Key cleared.');
      }
    } catch {
      setFirecrawlSaveMsg('Failed to update Firecrawl API key.');
    } finally {
      setSavingFirecrawlKey(false);
      setTimeout(() => setFirecrawlSaveMsg(''), 3000);
    }
  };

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

        if (aliasesArray.length > 0) updatedFields.aliases = aliasesArray;
        if (compBrandsArray.length > 0) updatedFields.competitorBrands = compBrandsArray;
        if (compDomainsArray.length > 0) updatedFields.competitorDomains = compDomainsArray;

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
        if (compBrandsArray.length > 0) setCompetitorBrands(compBrandsArray.join(', '));
        if (compDomainsArray.length > 0) setCompetitorDomains(compDomainsArray.join(', '));

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
      competitorBrands: competitorBrands.split(',').map((c) => c.trim()).filter(Boolean),
      competitorDomains: competitorDomains.split(',').map((d) => d.trim()).filter(Boolean),
      defaultRunsPerPrompt: defaultN,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
                    {geminiModel === 'gemini-3.7-flash' && (
                      <span className="text-[10px] bg-[#EEF2FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#4338CA] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        GEMINI 3.7
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

            {/* Gemini Model Selector */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">Target Gemini Model:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Recommended)' },
                  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(m.id)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                      geminiModel === m.id
                        ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA]'
                        : 'bg-white dark:bg-[#0F172A] text-[#374151] dark:text-[#CBD5E1] border-[#D1D5DB] dark:border-[#334155] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Perplexity Sonar */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#111827] dark:bg-[#312E81] flex items-center justify-center text-white font-bold text-xs">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">Perplexity Sonar</span>
                    {perplexityConfigured ? (
                      <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#FFFBEB] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        KEY REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                    Model: <code className="text-[#111827] dark:text-[#F8FAFC] font-mono">sonar</code> • Web Grounded Answers & Citations
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-wider">
                {perplexityConfigured ? (
                  <span className="text-[#065F46] dark:text-[#34D399]">Configured & Ready</span>
                ) : (
                  <span className="text-[#9CA3AF] dark:text-[#64748B]">Enter Key Below to Enable</span>
                )}
              </div>
            </div>

            {/* Perplexity Key Form */}
            <form onSubmit={handleSavePerplexityKey} className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="password"
                  value={perplexityKeyInput}
                  onChange={(e) => setPerplexityKeyInput(e.target.value)}
                  placeholder={perplexityConfigured ? "PERPLEXITY_API_KEY is configured (Enter new key to update)" : "Enter PERPLEXITY_API_KEY (pplx-...)"}
                  className="w-full p-2 pl-8 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
                <Key className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#64748B] absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                disabled={savingKey}
                className="px-3.5 py-2 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shrink-0 inline-flex items-center justify-center gap-1"
              >
                {savingKey ? 'Saving...' : 'Save API Key'}
              </button>
            </form>
            {keySaveMsg && (
              <p className="text-xs font-semibold text-[#065F46] dark:text-[#34D399] animate-fade-in">
                {keySaveMsg}
              </p>
            )}
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
                  <span className="text-[#9CA3AF] dark:text-[#64748B]">Enter Key Below to Enable</span>
                )}
              </div>
            </div>

            {/* Firecrawl Key Form */}
            <form onSubmit={handleSaveFirecrawlKey} className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="password"
                  value={firecrawlKeyInput}
                  onChange={(e) => setFirecrawlKeyInput(e.target.value)}
                  placeholder={firecrawlConfigured ? "FIRECRAWL_API_KEY is configured (Enter new key to update)" : "Enter FIRECRAWL_API_KEY (fc-...)"}
                  className="w-full p-2 pl-8 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
                <Key className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#64748B] absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                disabled={savingFirecrawlKey}
                className="px-3.5 py-2 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shrink-0 inline-flex items-center justify-center gap-1"
              >
                {savingFirecrawlKey ? 'Saving...' : 'Save Firecrawl Key'}
              </button>
            </form>
            {firecrawlSaveMsg && (
              <p className="text-xs font-semibold text-[#065F46] dark:text-[#34D399] animate-fade-in">
                {firecrawlSaveMsg}
              </p>
            )}
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

        <GoogleIntegrationCard />
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
              className="px-3.5 py-2 bg-[#EF4444] text-white hover:bg-[#DC2626] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear Mock Data & Setup Real Client
            </button>
          )}

          <button
            onClick={onResetDemoData}
            className="px-3.5 py-2 bg-[#FEF3C7] dark:bg-[#78350F] hover:bg-[#FDE68A] dark:hover:bg-[#B45309] text-[#D97706] dark:text-[#FDE68A] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-[#FDE68A] dark:border-[#B45309] shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Calibrated Demo Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
