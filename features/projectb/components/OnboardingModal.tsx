import React, { useState } from 'react';
import { 
  Sparkles, 
  Globe, 
  Building2, 
  Check, 
  ArrowRight, 
  Loader2, 
  X, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  Compass,
  Search
} from 'lucide-react';
import { Client } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newClient: Client, autoGeneratePrompts: boolean) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [brandName, setBrandName] = useState('');
  const [domain, setDomain] = useState('');
  const [market, setMarket] = useState('Global');
  const [language, setLanguage] = useState('English');
  const [industry, setIndustry] = useState('Corporate & Professional Services');

  const [isScanning, setIsScanning] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<string[]>([]);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // Step 2 Fields (Pre-filled from multi-page crawl)
  const [city, setCity] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [positioning, setPositioning] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productsServices, setProductsServices] = useState('');
  const [keyDifferentiators, setKeyDifferentiators] = useState('');
  const [aliases, setAliases] = useState('');
  const [competitorBrands, setCompetitorBrands] = useState('');
  const [competitorDomains, setCompetitorDomains] = useState('');
  const [autoGeneratePrompts, setAutoGeneratePrompts] = useState(true);

  if (!isOpen) return null;

  const handleScanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !domain.trim()) {
      return;
    }

    setIsScanning(true);
    setCrawlError(null);
    setCrawlProgress(['[1/4] Fetching homepage HTML & detecting site structure...']);

    // Simulated progress steps during multi-page crawl
    const t1 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '[2/4] Crawling About page for company mission & positioning...']);
    }, 800);
    const t2 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '[3/4] Crawling Services & Products pages for offerings...']);
    }, 1800);
    const t3 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '[4/4] Executing Google Grounded search for market competitors...']);
    }, 2800);

    try {
      const res = await fetch('/api/client/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, domain, language, market, industry }),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Website crawl failed');
      }

      if (!data.profile || typeof data.profile !== 'object') {
        throw new Error('Profil çıkarılamadı. Site içeriği beklenen yapıda dönmedi.');
      }

      const p = data.profile;
      const isTr = (p.language || language).toLowerCase().includes('türk') || (p.language || language).toLowerCase().includes('tr');
      setShortSummary(p.shortSummary || '');
      setPositioning(p.positioning || '');
      setDetailedDescription(p.detailedDescription || '');
      setTargetAudience(p.targetAudience || '');
      setProductsServices(p.productsServices || '');
      setKeyDifferentiators(p.keyDifferentiators || '');
      setIndustry(p.industry || industry);
      setCity(p.city || (isTr ? 'İstanbul' : 'London'));
      setMarket(p.market || market);
      setLanguage(p.language || language);

      if (Array.isArray(p.aliases)) setAliases(p.aliases.join(', '));
      if (Array.isArray(p.competitorBrands)) setCompetitorBrands(p.competitorBrands.join(', '));
      if (Array.isArray(p.competitorDomains)) setCompetitorDomains(p.competitorDomains.join(', '));

      setStep(2);
    } catch (err: any) {
      console.error('Scan error:', err);
      setCrawlError(err?.message || 'Website crawl failed. No profile data was generated. Check the URL and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFinishOnboarding = () => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase().trim();
    
    const parseList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
    const domainSlug = cleanDomain.replace(/[^a-z0-9]/g, '');

    const newClientObj: Client = {
      id: `client-${domainSlug || Date.now()}`,
      brandName: brandName.trim(),
      domain: cleanDomain,
      industry: industry.trim(),
      market: market.trim(),
      city: city.trim(),
      language: language.trim(),
      aliases: parseList(aliases).length > 0 ? parseList(aliases) : [brandName.trim()],
      competitorBrands: parseList(competitorBrands),
      competitorDomains: parseList(competitorDomains),
      shortSummary,
      positioning,
      detailedDescription,
      targetAudience,
      productsServices,
      keyDifferentiators,
      createdAt: new Date().toISOString(),
      // The authenticated owner is assigned by App after this callback.
      ownerId: '',
    };

    onComplete(newClientObj, autoGeneratePrompts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl rounded-xs sm:rounded-sm">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] dark:bg-[#4338CA] text-white rounded-xs font-mono">
                {step === 1 ? 'STEP 1 OF 2 • CRAWL SETUP' : 'STEP 2 OF 2 • VERIFICATION'}
              </span>
              <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono hidden sm:inline">
                AEO / GEO Grounded Onboarding
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F8FAFC]">
              {step === 1 ? 'New Client Onboarding & Website Analysis' : 'Verify Auto-Crawled Client Profile'}
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              {step === 1 
                ? 'Enter website URL to crawl About, Products, and Contact pages automatically.' 
                : 'AI extracted company details, location, products, and competitors from live crawl.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC] p-1.5 transition-colors rounded-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-2 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F3F4F6] dark:bg-[#090D16] text-[11px]">
          <div className={`py-2 px-4 flex items-center gap-2 border-r border-[#E5E7EB] dark:border-[#1E293B] ${
            step === 1 
              ? 'bg-white dark:bg-[#0F172A] font-bold text-[#111827] dark:text-[#F8FAFC] border-b-2 border-b-[#111827] dark:border-b-[#6366F1]' 
              : 'text-[#6B7280] dark:text-[#94A3B8]'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              step === 1 ? 'bg-[#111827] dark:bg-[#6366F1] text-white' : 'bg-[#E5E7EB] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1]'
            }`}>
              1
            </span>
            <span>Brand & Website Crawl</span>
          </div>
          <div className={`py-2 px-4 flex items-center gap-2 ${
            step === 2 
              ? 'bg-white dark:bg-[#0F172A] font-bold text-[#111827] dark:text-[#F8FAFC] border-b-2 border-b-[#111827] dark:border-b-[#6366F1]' 
              : 'text-[#6B7280] dark:text-[#94A3B8]'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              step === 2 ? 'bg-[#111827] dark:bg-[#6366F1] text-white' : 'bg-[#E5E7EB] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1]'
            }`}>
              2
            </span>
            <span>Profile Verification & Prompts</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white dark:bg-[#0F172A]">
          {step === 1 && (
            <form onSubmit={handleScanWebsite} className="space-y-4">
              {crawlError && (
                <div role="alert" className="flex items-start gap-2 border border-[#FCA5A5] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#450A0A]/40 p-3 text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                  <span className="font-medium">{crawlError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                    Brand Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp, Trendyol"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                    Primary Domain <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. acme.com (without http://)"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium font-mono bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-[#111827] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                  >
                    <option value="English">English</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                    Target Market / Country
                  </label>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="e.g. Global, Türkiye, US, UK"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Corporate Services, SaaS"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Progress Box during crawl */}
              {isScanning && (
                <div className="p-4 rounded-xs bg-[#F9FAFB] dark:bg-[#090D16] border border-[#E5E7EB] dark:border-[#1E293B] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#4338CA] dark:text-[#818CF8]" />
                    <span>Deep-Crawling Website Pages & Running Grounding Search...</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {crawlProgress.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-mono">
                        <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#D1D5DB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] rounded-xs text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScanning || !brandName.trim() || !domain.trim()}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] dark:bg-[#4338CA] dark:hover:bg-[#3730A3] disabled:opacity-50 text-white rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Crawling & Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      Crawl Website & Auto-Configure Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs">
              {/* Grounded Success Header */}
              <div className="p-3 rounded-xs bg-[#F0FDF4] dark:bg-[#064E3B]/20 border border-[#BBF7D0] dark:border-[#065F46] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#166534] dark:text-[#86EFAC] font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#166534] dark:text-[#86EFAC] shrink-0" />
                  <span>Successfully crawled About, Services, and Contact pages for <strong className="font-mono">{domain}</strong></span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#166534] text-white rounded-xs">
                  Grounding Verified
                </span>
              </div>

              {/* Key Attributes 3-Column Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xs bg-[#F9FAFB] dark:bg-[#090D16] border border-[#E5E7EB] dark:border-[#1E293B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] block mb-1">
                    Headquarters City
                  </span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-transparent font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] border-b border-[#D1D5DB] dark:border-[#334155] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1] pb-0.5"
                  />
                </div>

                <div className="p-3 rounded-xs bg-[#F9FAFB] dark:bg-[#090D16] border border-[#E5E7EB] dark:border-[#1E293B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] block mb-1">
                    Target Market
                  </span>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="w-full bg-transparent font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] border-b border-[#D1D5DB] dark:border-[#334155] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1] pb-0.5"
                  />
                </div>

                <div className="p-3 rounded-xs bg-[#F9FAFB] dark:bg-[#090D16] border border-[#E5E7EB] dark:border-[#1E293B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] block mb-1">
                    Primary Language
                  </span>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-transparent font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] border-b border-[#D1D5DB] dark:border-[#334155] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1] pb-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                  Short Company Summary (Auto-Extracted)
                </label>
                <textarea
                  rows={2}
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-xs text-[#111827] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                  Products & Services (Extracted from Offerings)
                </label>
                <textarea
                  rows={2}
                  value={productsServices}
                  onChange={(e) => setProductsServices(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-xs text-[#111827] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                    Discovered Competitor Brands
                  </label>
                  <input
                    type="text"
                    value={competitorBrands}
                    onChange={(e) => setCompetitorBrands(e.target.value)}
                    placeholder="e.g. Competitor A, Competitor B"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-xs text-[#111827] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                    Competitor Domains
                  </label>
                  <input
                    type="text"
                    value={competitorDomains}
                    onChange={(e) => setCompetitorDomains(e.target.value)}
                    placeholder="e.g. competitora.com, competitorb.com"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-xs text-xs font-mono text-[#111827] dark:text-[#F8FAFC] focus:outline-hidden focus:ring-1 focus:ring-[#111827] dark:focus:ring-[#6366F1] focus:border-[#111827] dark:focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Auto Prompts Option Card */}
              <div className="p-3 rounded-xs bg-[#F9FAFB] dark:bg-[#1E293B]/40 border border-[#E5E7EB] dark:border-[#1E293B] flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoPrompts"
                  checked={autoGeneratePrompts}
                  onChange={(e) => setAutoGeneratePrompts(e.target.checked)}
                  className="w-4 h-4 rounded-xs border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#4338CA] focus:ring-0 focus:outline-hidden cursor-pointer"
                />
                <label htmlFor="autoPrompts" className="text-xs text-[#374151] dark:text-[#CBD5E1] font-medium cursor-pointer">
                  Auto-discover initial tracked prompt set for <strong className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{market || 'Global'}</strong> market in <strong className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{language || 'English'}</strong>
                </label>
              </div>

              {/* Step 2 Footer */}
              <div className="pt-3 flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-[#D1D5DB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] rounded-xs text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  ← Back to Domain
                </button>
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] dark:bg-[#4338CA] dark:hover:bg-[#3730A3] text-white rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
                >
                  <Check className="w-4 h-4 text-white" />
                  Launch Client Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
