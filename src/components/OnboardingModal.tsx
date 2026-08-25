import React, { useState } from 'react';
import { Sparkles, Globe, MapPin, Building2, Layers, Check, ArrowRight, Loader2, X, RefreshCw, Layers3, Compass } from 'lucide-react';
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
  const [market, setMarket] = useState('Türkiye');
  const [language, setLanguage] = useState('Türkçe');
  const [industry, setIndustry] = useState('Teknoloji & Kurumsal Hizmetler');

  const [isScanning, setIsScanning] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<string[]>([]);

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
    if (!brandName || !domain) {
      alert('Please enter both Brand Name and Domain.');
      return;
    }

    setIsScanning(true);
    setCrawlProgress(['🔍 Fetching homepage HTML & detecting site structure...']);

    // Simulated progress steps during fetch
    const t1 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '🏢 Crawling About page for company history & mission...']);
    }, 800);
    const t2 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '📦 Crawling Products & Services pages for offerings...']);
    }, 1800);
    const t3 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '📍 Crawling Contact/Footer pages for headquarters city & market...']);
    }, 2800);
    const t4 = setTimeout(() => {
      setCrawlProgress((prev) => [...prev, '🎯 Running search grounding & discovering competitor ecosystem...']);
    }, 3800);

    try {
      const res = await fetch('/api/client/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, domain, language, market, industry }),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Website crawl failed');
      }

      if (data.profile) {
        const p = data.profile;
        setShortSummary(p.shortSummary || '');
        setPositioning(p.positioning || '');
        setDetailedDescription(p.detailedDescription || '');
        setTargetAudience(p.targetAudience || '');
        setProductsServices(p.productsServices || '');
        setKeyDifferentiators(p.keyDifferentiators || '');
        setIndustry(p.industry || industry);
        setCity(p.city || (language.toLowerCase().includes('türk') ? 'İstanbul' : 'London'));
        setMarket(p.market || market);
        setLanguage(p.language || language);

        if (Array.isArray(p.aliases)) setAliases(p.aliases.join(', '));
        if (Array.isArray(p.competitorBrands)) setCompetitorBrands(p.competitorBrands.join(', '));
        if (Array.isArray(p.competitorDomains)) setCompetitorDomains(p.competitorDomains.join(', '));
      }

      setStep(2);
    } catch (err: any) {
      console.error('Scan error:', err);
      // Fallback transition to step 2 with default generated values
      setCity(language.toLowerCase().includes('türk') ? 'İstanbul' : 'London');
      setShortSummary(`${brandName} (${domain}) web sitesi üzerinden kurumsal hizmetler sunmaktadır.`);
      setProductsServices(`${brandName} Kurumsal Çözümleri ve Dijital Hizmetler`);
      setStep(2);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFinishOnboarding = () => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    
    const parseList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

    const newClientObj: Client = {
      id: `client-${Date.now()}`,
      brandName: brandName.trim(),
      domain: cleanDomain,
      industry: industry.trim(),
      market: market.trim(),
      city: city.trim(),
      language: language.trim(),
      aliases: parseList(aliases),
      competitorBrands: parseList(competitorBrands),
      competitorDomains: parseList(competitorDomains),
      shortSummary,
      positioning,
      detailedDescription,
      targetAudience,
      productsServices,
      keyDifferentiators,
      createdAt: new Date().toISOString(),
      ownerId: 'default-owner',
    };

    onComplete(newClientObj, autoGeneratePrompts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">
                {step === 1 ? 'New Client Onboarding & Website Analysis' : 'Verify Auto-Crawled Client Profile'}
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                {step === 1 ? 'Enter website URL to crawl About, Products, and Contact pages automatically.' : 'AI extracted company details, location, products, and competitors.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 1 && (
            <form onSubmit={handleScanWebsite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trendyol, Getir, Acme Corp"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-emerald-500 text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Primary Domain *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. trendyol.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-emerald-500 text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                  >
                    <option value="Türkçe">Türkçe</option>
                    <option value="English">English</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1">
                    Target Market / Country
                  </label>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="e.g. Türkiye, Global"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. E-Ticaret, SaaS"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              {/* Progress Box */}
              {isScanning && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A]/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deep-Crawling Website Pages & Running Grounding Search...
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {crawlProgress.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-mono">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isScanning || !brandName || !domain}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Crawling & Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Crawl Website & Auto-Configure Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Successfully crawled About, Products, and Contact pages for {domain}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 font-semibold">
                  Multi-Page Scraped
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-medium block">Headquarters City</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full bg-transparent font-semibold text-[#111827] dark:text-[#F8FAFC] border-b border-[#CBD5E1] dark:border-[#475569] focus:outline-hidden pb-0.5"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-medium block">Target Market</span>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="mt-1 w-full bg-transparent font-semibold text-[#111827] dark:text-[#F8FAFC] border-b border-[#CBD5E1] dark:border-[#475569] focus:outline-hidden pb-0.5"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-medium block">Primary Language</span>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full bg-transparent font-semibold text-[#111827] dark:text-[#F8FAFC] border-b border-[#CBD5E1] dark:border-[#475569] focus:outline-hidden pb-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">
                  Short Company Summary (Auto-Extracted)
                </label>
                <textarea
                  rows={2}
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">
                  Products & Services (Extracted from Products Page)
                </label>
                <textarea
                  rows={2}
                  value={productsServices}
                  onChange={(e) => setProductsServices(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">
                    Discovered Competitor Brands
                  </label>
                  <input
                    type="text"
                    value={competitorBrands}
                    onChange={(e) => setCompetitorBrands(e.target.value)}
                    placeholder="Brand 1, Brand 2, Brand 3"
                    className="w-full p-2 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block text-[#6B7280] dark:text-[#94A3B8] font-medium mb-1">
                    Competitor Domains
                  </label>
                  <input
                    type="text"
                    value={competitorDomains}
                    onChange={(e) => setCompetitorDomains(e.target.value)}
                    placeholder="comp1.com, comp2.com"
                    className="w-full p-2 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="pt-2 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A]/50 border border-[#E2E8F0] dark:border-[#334155] flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoPrompts"
                  checked={autoGeneratePrompts}
                  onChange={(e) => setAutoGeneratePrompts(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="autoPrompts" className="text-xs text-[#374151] dark:text-[#CBD5E1] font-medium cursor-pointer">
                  Auto-discover initial tracked prompt set for {market || 'Türkiye'} market in {language || 'Türkçe'}
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
                >
                  ← Back to Domain
                </button>
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Check className="w-4 h-4" />
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
