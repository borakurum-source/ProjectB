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
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              AEO / GEO Page Extractability Analyzer
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
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
              className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:outline-hidden focus:border-[#111827]"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="px-5 py-2 bg-[#111827] hover:bg-black disabled:bg-[#D1D5DB] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center justify-center gap-2"
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
      </div>

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3F4F6] pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#111827] truncate">
                    {currentAnalysis.url}
                  </h3>
                  <a
                    href={currentAnalysis.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9CA3AF] hover:text-[#111827]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  Analyzed on {new Date(currentAnalysis.analyzedAt).toLocaleString()} • Client Domain: {client.domain}
                </div>
              </div>

              {/* Extractability Score Pill */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold">Extractability Score</div>
                  <div className="text-2xl font-bold font-mono text-[#111827]">
                    {currentAnalysis.extractabilityScore} <span className="text-xs text-[#9CA3AF]">/ 100</span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 flex items-center justify-center font-mono font-bold text-sm border ${
                    currentAnalysis.extractabilityScore >= 80
                      ? 'border-[#A7F3D0] text-[#065F46] bg-[#ECFDF5]'
                      : currentAnalysis.extractabilityScore >= 50
                      ? 'border-[#FDE68A] text-[#D97706] bg-[#FEF3C7]'
                      : 'border-[#FECACA] text-[#DC2626] bg-[#FEF2F2]'
                  }`}
                >
                  {currentAnalysis.extractabilityScore}
                </div>
              </div>
            </div>

            {/* 4 Core Extractability Checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Schema Check */}
              <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Schema (JSON-LD)</span>
                  {currentAnalysis.hasSchemaMarkup ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                  )}
                </div>
                <div className="mt-2 text-xs text-[#111827] font-mono font-semibold">
                  {currentAnalysis.hasSchemaMarkup
                    ? currentAnalysis.detectedSchemaTypes.join(', ') || 'Detected'
                    : 'Missing Schema'}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  Structured data enables direct grounding resolution
                </div>
              </div>

              {/* Comparison Tables */}
              <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Data / HTML Tables</span>
                  {currentAnalysis.hasComparisonTables ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  )}
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827]">
                  {currentAnalysis.hasComparisonTables ? 'Tables Present' : 'No Semantic Tables'}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  Models prefer structured &lt;table&gt; data for comparative queries
                </div>
              </div>

              {/* Clear Heading Answers */}
              <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Heading Q&A Structure</span>
                  {currentAnalysis.hasClearHeadingAnswers ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  )}
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827]">
                  {currentAnalysis.hasClearHeadingAnswers ? 'Clear Direct Answers' : 'Marketing Fluff Detected'}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  1-2 sentence factual answers immediately under H2 tags
                </div>
              </div>

              {/* Entity Clarity */}
              <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Entity Clarity</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider border ${
                      currentAnalysis.entityClarityStatus === 'Strong'
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                        : currentAnalysis.entityClarityStatus === 'Adequate'
                        ? 'bg-[#F3F4F6] text-[#111827] border-[#D1D5DB]'
                        : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                    }`}
                  >
                    {currentAnalysis.entityClarityStatus}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-[#111827] truncate">
                  Brand: {client.brandName}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  Unambiguous product name & domain positioning
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] mb-3 pb-2 border-b border-[#F3F4F6]">
              Actionable Page Enhancements for AI Visibility
            </h3>

            <div className="space-y-3">
              {currentAnalysis.actionableRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 bg-[#111827] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-[#111827] leading-relaxed font-medium">{rec}</p>
                  </div>
                  {onSaveActionFromPage && (
                    <button
                      onClick={() => onSaveActionFromPage(rec)}
                      className="px-3 py-1 bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#111827] rounded text-xs font-bold uppercase tracking-wider shrink-0 transition-colors shadow-xs"
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
    </div>
  );
}
