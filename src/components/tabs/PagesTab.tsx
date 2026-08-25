import { useState, FormEvent } from 'react';
import { PageAnalysis, Client } from '../../types';
import { Globe, CheckCircle2, AlertTriangle, XCircle, Sparkles, ExternalLink } from 'lucide-react';

interface PagesTabProps {
  client: Client;
  savedAnalyses: PageAnalysis[];
  onAnalyzePage: (url: string, rawHtml?: string) => Promise<PageAnalysis>;
  onSaveActionFromPage?: (recommendation: string) => void;
}

export function PagesTab({
  client,
  savedAnalyses,
  onAnalyzePage,
  onSaveActionFromPage,
}: PagesTabProps) {
  const [urlInput, setUrlInput] = useState(`https://${client.domain}/kategori/parti-kutulari`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<PageAnalysis | null>(
    savedAnalyses[0] || null
  );

  // Check Crawlability State
  const [showCrawlModal, setShowCrawlModal] = useState(false);
  const [crawlData, setCrawlData] = useState<any | null>(null);
  const [loadingCrawl, setLoadingCrawl] = useState(false);

  // Schema Inspector State
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaData, setSchemaData] = useState<any | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  const handleCheckCrawlability = async () => {
    if (!urlInput.trim()) return;
    setShowCrawlModal(true);
    setLoadingCrawl(true);
    setCrawlData(null);
    try {
      const res = await fetch('/api/pages/check-crawlability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      setCrawlData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCrawl(false);
    }
  };

  const handleCheckSchema = async () => {
    if (!urlInput.trim()) return;
    setShowSchemaModal(true);
    setLoadingSchema(true);
    setSchemaData(null);
    try {
      const res = await fetch('/api/pages/check-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      setSchemaData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await onAnalyzePage(urlInput.trim());
      setCurrentAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input & Analysis Trigger */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              AEO / GEO Page Extractability Analyzer
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Evaluate your landing pages and docs for direct AI model citation and grounding extractability.
            </p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
            <input
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://yourbrand.com/product-comparison"
              className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1]"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="px-5 py-2 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] disabled:bg-[#D1D5DB] dark:disabled:bg-[#334155] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing Extractability...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Analyze Page
              </>
            )}
          </button>
        </form>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleCheckCrawlability}
            disabled={!urlInput.trim()}
            className="px-3 py-1.5 bg-[#EEF2FF] dark:bg-[#1E1B4B] hover:bg-[#E0E7FF] dark:hover:bg-[#312E81] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3] disabled:bg-[#F3F4F6] dark:disabled:bg-[#1E293B] disabled:text-[#9CA3AF] dark:disabled:text-[#64748B] disabled:border-[#E5E7EB] dark:disabled:border-[#334155] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
          >
            <Globe className="w-3.5 h-3.5" /> Crawlability Checker
          </button>
          <button
            type="button"
            onClick={handleCheckSchema}
            disabled={!urlInput.trim()}
            className="px-3 py-1.5 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] border border-[#D1D5DB] dark:border-[#334155] disabled:bg-[#F3F4F6] dark:disabled:bg-[#1E293B] disabled:text-[#9CA3AF] dark:disabled:text-[#64748B] disabled:border-[#E5E7EB] dark:disabled:border-[#334155] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> Schema Inspector
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3F4F6] dark:border-[#1E293B] pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] truncate">
                    {currentAnalysis.url}
                  </h3>
                  <a
                    href={currentAnalysis.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9CA3AF] dark:text-[#64748B] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                  Analyzed on {new Date(currentAnalysis.analyzedAt).toLocaleString()} • Client Domain: {client.domain}
                </div>
              </div>

              {/* Extractability Score Pill */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] font-bold">Extractability Score</div>
                  <div className="text-2xl font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
                    {currentAnalysis.extractabilityScore} <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">/ 100</span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 flex items-center justify-center font-mono font-bold text-sm border ${
                    currentAnalysis.extractabilityScore >= 80
                      ? 'border-[#A7F3D0] dark:border-[#065F46] text-[#065F46] dark:text-[#A7F3D0] bg-[#ECFDF5] dark:bg-[#064E3B]'
                      : currentAnalysis.extractabilityScore >= 50
                      ? 'border-[#FDE68A] dark:border-[#78350F] text-[#D97706] dark:text-[#FDE68A] bg-[#FEF3C7] dark:bg-[#78350F]'
                      : 'border-[#FECACA] dark:border-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#7F1D1D]'
                  }`}
                >
                  {currentAnalysis.extractabilityScore}
                </div>
              </div>
            </div>

            {/* 4 Core Extractability Checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Schema Check */}
              <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Schema (JSON-LD)</span>
                  {currentAnalysis.hasSchemaMarkup ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626] dark:text-[#F87171]" />
                  )}
                </div>
                <div className="mt-2 text-xs text-[#111827] dark:text-[#F8FAFC] font-mono font-semibold">
                  {currentAnalysis.hasSchemaMarkup
                    ? currentAnalysis.detectedSchemaTypes.join(', ') || 'Detected'
                    : 'Missing Schema'}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Structured data enables direct grounding resolution
                </div>
              </div>

              {/* Comparison Tables */}
              <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Data / HTML Tables</span>
                  {currentAnalysis.hasComparisonTables ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
                  )}
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">
                  {currentAnalysis.hasComparisonTables ? 'Tables Present' : 'No Semantic Tables'}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Models prefer structured &lt;table&gt; data for comparative queries
                </div>
              </div>

              {/* Clear Heading Answers */}
              <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Heading Q&A Structure</span>
                  {currentAnalysis.hasClearHeadingAnswers ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
                  )}
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">
                  {currentAnalysis.hasClearHeadingAnswers ? 'Clear Direct Answers' : 'Marketing Fluff Detected'}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  1-2 sentence factual answers immediately under H2 tags
                </div>
              </div>

              {/* Entity Clarity */}
              <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Entity Clarity</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider border ${
                      currentAnalysis.entityClarityStatus === 'Strong'
                        ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                        : currentAnalysis.entityClarityStatus === 'Adequate'
                        ? 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] border-[#D1D5DB] dark:border-[#334155]'
                        : 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#78350F]'
                    }`}
                  >
                    {currentAnalysis.entityClarityStatus}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827] dark:text-[#F8FAFC] truncate">
                  Brand: {client.brandName}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1">
                  Unambiguous product name & domain positioning
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC] mb-3 pb-2 border-b border-[#F3F4F6] dark:border-[#1E293B]">
              Actionable Page Enhancements for AI Visibility
            </h3>

            <div className="space-y-3">
              {currentAnalysis.actionableRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-[#111827] dark:bg-[#4338CA] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-[#111827] dark:text-[#F8FAFC] leading-relaxed font-medium">{rec}</p>
                  </div>
                  {onSaveActionFromPage && (
                    <button
                      onClick={() => onSaveActionFromPage(rec)}
                      className="px-3 py-1 bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded text-xs font-bold uppercase tracking-wider shrink-0 transition-colors shadow-xs"
                    >
                      Track as Action
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Crawlability Modal */}
      {showCrawlModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1E293B]">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#4338CA] dark:text-[#818CF8]" />
                <div>
                  <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">AI Bot Crawlability Checker</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">robots.txt + a live fetch per bot for {urlInput}</p>
                </div>
              </div>
              <button onClick={() => setShowCrawlModal(false)} className="px-2 py-1 text-xs font-bold text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] bg-[#E5E7EB] dark:bg-[#334155] rounded cursor-pointer">
                Close
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {loadingCrawl ? (
                <div className="p-12 text-center space-y-3">
                  <Globe className="w-8 h-8 text-[#4338CA] dark:text-[#818CF8] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]">Checking robots.txt and live-fetching as each bot (this takes a few seconds)...</p>
                </div>
              ) : crawlData ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-2">Server Access Check</h4>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-2">{crawlData.serverAccessCaveat}</p>
                    <div className="border border-[#E5E7EB] dark:border-[#334155] rounded overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#334155] max-h-72 overflow-y-auto">
                      {crawlData.serverAccessResults?.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A]">
                          <div>
                            <div className="font-bold text-[#111827] dark:text-[#F8FAFC] text-sm">{b.name}</div>
                            <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">{b.owner}{b.httpStatus ? ` • HTTP ${b.httpStatus}` : ''}</div>
                          </div>
                          <div>
                            {b.status === 'ALLOWED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-xs font-bold uppercase tracking-wider rounded">
                                <CheckCircle2 className="w-4 h-4" /> Allowed
                              </span>
                            ) : b.status === 'BLOCKED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] dark:bg-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D] text-xs font-bold uppercase tracking-wider rounded">
                                <XCircle className="w-4 h-4" /> Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] text-xs font-bold uppercase tracking-wider rounded">
                                <AlertTriangle className="w-4 h-4" /> Error
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-2">robots.txt Check</h4>
                    <div className="border border-[#E5E7EB] dark:border-[#334155] rounded overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#334155] max-h-72 overflow-y-auto">
                      {crawlData.botStatus?.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A]">
                          <div>
                            <div className="font-bold text-[#111827] dark:text-[#F8FAFC] text-sm">{b.name}</div>
                            <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">{b.owner}</div>
                            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">{b.reason}</div>
                          </div>
                          <div>
                            {b.status === 'ALLOWED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-xs font-bold uppercase tracking-wider rounded">
                                <CheckCircle2 className="w-4 h-4" /> Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] dark:bg-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D] text-xs font-bold uppercase tracking-wider rounded">
                                <XCircle className="w-4 h-4" /> Blocked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-2">Recommendations</h4>
                    <ul className="list-disc pl-5 text-sm text-[#111827] dark:text-[#F8FAFC] space-y-1">
                      {crawlData.recommendations?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Schema Inspector Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1E293B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4338CA] dark:text-[#818CF8]" />
                <div>
                  <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">Schema & JSON-LD Inspector</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Analyzing {urlInput}</p>
                </div>
              </div>
              <button onClick={() => setShowSchemaModal(false)} className="px-2 py-1 text-xs font-bold text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] bg-[#E5E7EB] dark:bg-[#334155] rounded cursor-pointer">
                Close
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {loadingSchema ? (
                <div className="p-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-[#4338CA] dark:text-[#818CF8] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]">Extracting schemas and generating AEO report...</p>
                </div>
              ) : schemaData ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[#E5E7EB] dark:border-[#1E293B] pb-4">
                    <div className="text-4xl font-black text-[#111827] dark:text-[#F8FAFC]">{schemaData.analysis?.score}</div>
                    <div>
                      <div className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">AEO Schema Score</div>
                      <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">{schemaData.analysis?.summary}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-2">Detected Schemas ({schemaData.extractedCount})</h4>
                    <div className="space-y-2">
                      {schemaData.analysis?.presentSchemas?.map((s: any, idx: number) => (
                        <div key={idx} className="p-3 border border-[#E5E7EB] dark:border-[#334155] rounded bg-[#F9FAFB] dark:bg-[#1E293B]">
                          <div className="font-mono text-xs font-bold text-[#4338CA] dark:text-[#818CF8] mb-1">{s.type}</div>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className={`font-bold ${s.status === 'Valid' ? 'text-[#059669] dark:text-[#34D399]' : 'text-[#D97706] dark:text-[#FBBF24]'}`}>{s.status}</span>
                          </div>
                          <div className="text-xs text-[#374151] dark:text-[#CBD5E1]">{s.notes}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {schemaData.analysis?.missingSchemas?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#991B1B] dark:text-[#FCA5A5] mb-2">Missing Important Schemas</h4>
                      <ul className="list-disc pl-5 text-xs text-[#111827] dark:text-[#F8FAFC] space-y-1">
                        {schemaData.analysis.missingSchemas.map((m: string, idx: number) => (
                          <li key={idx} className="font-mono">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-2">Recommendations</h4>
                    <ul className="list-disc pl-5 text-sm text-[#111827] dark:text-[#F8FAFC] space-y-1">
                      {schemaData.analysis?.recommendations?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
