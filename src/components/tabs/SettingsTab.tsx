import { useState, FormEvent } from 'react';
import { Client } from '../../types';
import { Save, Download, RefreshCw, Check } from 'lucide-react';

interface SettingsTabProps {
  client: Client;
  onUpdateClient: (updated: Partial<Client>) => void;
  onResetDemoData: () => void;
  exportDataJson: () => void;
}

export function SettingsTab({
  client,
  onUpdateClient,
  onResetDemoData,
  exportDataJson,
}: SettingsTabProps) {
  const [brandName, setBrandName] = useState(client.brandName);
  const [domain, setDomain] = useState(client.domain);
  const [aliases, setAliases] = useState(client.aliases.join(', '));
  const [competitorBrands, setCompetitorBrands] = useState(client.competitorBrands.join(', '));
  const [competitorDomains, setCompetitorDomains] = useState(client.competitorDomains.join(', '));
  const [defaultN, setDefaultN] = useState<number>(client.defaultRunsPerPrompt || 3);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onUpdateClient({
      brandName: brandName.trim(),
      domain: domain.trim(),
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
      <form onSubmit={handleSave} className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              Client Brand Profile & Domain Grounding
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Exact string matching aliases and publisher domains used for deterministic citation resolution.
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
              Primary Brand Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
              Primary Domain (Grounding)
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] font-mono focus:bg-white focus:border-[#111827] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
            Brand Aliases (Comma-separated)
          </label>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="e.g. Acme, Acme Analytics Inc, AcmeAPM"
            className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
          />
          <p className="text-[11px] text-[#6B7280] mt-1">
            Used during semantic extraction to count mentions even if the model uses an abbreviation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
              Tracked Competitor Brands (Comma-separated)
            </label>
            <input
              type="text"
              value={competitorBrands}
              onChange={(e) => setCompetitorBrands(e.target.value)}
              placeholder="e.g. Datadog, Dynatrace, New Relic"
              className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
              Tracked Competitor Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={competitorDomains}
              onChange={(e) => setCompetitorDomains(e.target.value)}
              placeholder="e.g. datadoghq.com, dynatrace.com, newrelic.com"
              className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] font-mono focus:bg-white focus:border-[#111827] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
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
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-[#F9FAFB] text-[#374151] border-[#E5E7EB] hover:bg-[#F3F4F6]'
                }`}
              >
                N={n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">
            Industry standard B2B AEO measurement recommends N=3 to stabilize variance.
          </p>
        </div>
      </form>

      {/* Engine Adapters & Credentials */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
            AI Visibility Engines & Model Adapters
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Engines are measured independently to prevent deceptive cross-engine averaging.
          </p>
        </div>

        <div className="space-y-3">
          {/* Gemini Grounded */}
          <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#111827] flex items-center justify-center text-white font-bold text-xs">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#111827]">Gemini Grounded with Google Search</span>
                  <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  Model: <code className="text-[#111827] font-mono">gemini-2.5-flash</code> • Tool: Google Search Grounding
                </div>
              </div>
            </div>
            <div className="text-xs text-[#065F46] font-bold uppercase tracking-wider">Auto-configured via AI Studio</div>
          </div>

          {/* Perplexity Sonar */}
          <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB]/50 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-bold text-xs">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#111827]">Perplexity Sonar</span>
                  <span className="text-[10px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                    STANDBY
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  Model: <code className="text-[#111827] font-mono">sonar</code> • Grounded web index
                </div>
              </div>
            </div>
            <div className="text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">Optional secondary adapter</div>
          </div>
        </div>
      </div>

      {/* Data Export & Reset */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
            Data Management & Calibration Backup
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Export all client measurement logs, aggregates, and diagnostic history as structured JSON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportDataJson}
            className="px-3.5 py-2 bg-white hover:bg-[#F3F4F6] text-[#111827] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-[#D1D5DB] shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Workspace Data (JSON)
          </button>

          <button
            onClick={onResetDemoData}
            className="px-3.5 py-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-[#FDE68A] shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Calibrated Demo Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
