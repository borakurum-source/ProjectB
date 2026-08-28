import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Table, 
  HelpCircle, 
  CheckCircle2, 
  Copy, 
  Trash2, 
  Code2, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  Database,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Client, AeoGeneratedContent, AeoContentType } from '../../types';

interface AeoStudioTabProps {
  client: Client;
}

const CONTENT_TYPES: Array<{
  id: AeoContentType;
  label: string;
  desc: string;
  icon: typeof Table;
}> = [
  {
    id: 'comparison_table',
    label: 'Head-to-Head Comparison Page',
    desc: 'Structured comparison vs competitor with clear feature matrix and data tables.',
    icon: Table,
  },
  {
    id: 'faq_schema_page',
    label: 'High-Extractability FAQ Page',
    desc: 'Dense, direct question-answer pairings formatted for zero-click AI overviews.',
    icon: HelpCircle,
  },
  {
    id: 'pricing_transparency_page',
    label: 'Transparent Pricing & Tiers',
    desc: 'Factual breakdown of packages, unit costs, and delivery terms.',
    icon: Zap,
  },
  {
    id: 'product_capability_guide',
    label: 'Core Capability / Service Guide',
    desc: 'Deep breakdown of menu items, hygiene standards, and logistics.',
    icon: BookOpen,
  },
  {
    id: 'citation_booster_article',
    label: 'Authority / Editorial Article',
    desc: 'Thought leadership piece answering broad industry queries with cited facts.',
    icon: FileText,
  },
];

export function AeoStudioTab({ client }: AeoStudioTabProps) {
  const [contents, setContents] = useState<AeoGeneratedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<AeoGeneratedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [selectedType, setSelectedType] = useState<AeoContentType>('comparison_table');
  const [targetPrompt, setTargetPrompt] = useState('İstanbul kokteyl catering şirketleri');
  const [customTopic, setCustomTopic] = useState('');
  const [targetCompetitor, setTargetCompetitor] = useState(client.competitorBrands?.[0] || 'Misafirliq');

  const fetchContents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/aeo-content/${client.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load AEO content (HTTP ${res.status})`);
      }
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setContents(items);
      setSelectedContent(items[0] || null);
      setActionError(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to load AEO content.');
      setContents([]);
      setSelectedContent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedContent(null);
    setContents([]);
    setActionError(null);
    fetchContents();
  }, [client.id]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setActionError(null);
      const res = await fetch('/api/aeo-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          contentType: selectedType,
          targetPromptText: targetPrompt,
          customTopic,
          targetCompetitor,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `AEO generation failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data.content) throw new Error('AEO generation returned no content.');
      setContents(prev => [data.content, ...prev]);
      setSelectedContent(data.content);
    } catch (err: any) {
      setActionError(err?.message || 'Error generating AEO content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this generated AEO page?')) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/aeo-content/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `AEO document deletion failed (HTTP ${res.status})`);
      }
      setContents(prev => {
        const next = prev.filter(c => c.id !== id);
        setSelectedContent(current => current?.id === id ? (next[0] || null) : current);
        return next;
      });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete AEO document.');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div role="alert" className="border border-[#FCA5A5] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#450A0A]/40 px-3 py-2 text-xs text-[#991B1B] dark:text-[#FCA5A5]">
          {actionError}
        </div>
      )}
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#6B7280] dark:text-[#94A3B8] mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Grounded Content Generation Engine</span>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
              AEO Content Studio
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5 max-w-3xl leading-relaxed">
              Generate structured, zero-hallucination web pages & comparison matrices engineered for direct model citations. Every claim is strictly grounded in {client.brandName}&apos;s verified Brand Memory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[11px] font-medium text-[#4B5563] dark:text-[#CBD5E1] inline-flex items-center gap-1.5 shrink-0">
              <Database className="w-3 h-3 text-[#6B7280] dark:text-[#94A3B8]" />
              Brand Memory Grounded
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Form & Past Documents */}
        <div className="lg:col-span-5 space-y-6">
          {/* Generation Config Card */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Generate New AEO Page
            </h4>

            <div className="space-y-3.5">
              {/* Type Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#94A3B8] mb-1.5">
                  Optimization Template Archetype
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {CONTENT_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`text-left p-2.5 rounded border transition-colors flex items-start gap-2.5 ${
                          isSelected 
                            ? 'bg-[#F9FAFB] dark:bg-[#1E293B] border-[#111827] dark:border-[#6366F1]' 
                            : 'bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#9CA3AF] dark:hover:border-[#334155]'
                        }`}
                      >
                        <div className={`p-1.5 rounded mt-0.5 ${isSelected ? 'bg-[#111827] text-white dark:bg-[#6366F1]' : 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#1E293B] dark:text-[#94A3B8]'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold ${isSelected ? 'text-[#111827] dark:text-[#F8FAFC]' : 'text-[#374151] dark:text-[#CBD5E1]'}`}>
                            {type.label}
                          </div>
                          <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5 leading-snug">
                            {type.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Prompt Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#94A3B8] mb-1">
                  Target AI Query / Prompt
                </label>
                <input
                  type="text"
                  value={targetPrompt}
                  onChange={e => setTargetPrompt(e.target.value)}
                  placeholder="e.g. İstanbul kokteyl catering şirketleri"
                  className="w-full bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded px-3 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1]"
                />
              </div>

              {/* Target Competitor (if comparison table) */}
              {selectedType === 'comparison_table' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#94A3B8] mb-1">
                    Primary Benchmark Competitor
                  </label>
                  <input
                    type="text"
                    value={targetCompetitor}
                    onChange={e => setTargetCompetitor(e.target.value)}
                    placeholder="e.g. Misafirliq, Hub Catering"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded px-3 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1]"
                  />
                </div>
              )}

              {/* Custom Topic / Angle */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#94A3B8] mb-1">
                  Optional Angle / Special Focus (Optional)
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="e.g. Vegan seçenekler, minimum sipariş limitleri"
                  className="w-full bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded px-3 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2 px-4 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] disabled:bg-[#D1D5DB] dark:disabled:bg-[#334155] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Querying Memory & Writing Page...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Grounded AEO Page
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Past Documents List */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC] mb-3">
              Generated AEO Documents ({contents.length})
            </h4>

            {loading ? (
              <div className="py-8 flex justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : contents.length === 0 ? (
              <div className="py-6 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
                No AEO documents generated yet. Select a template and click generate.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {contents.map(item => {
                  const isSelected = selectedContent?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedContent(item)}
                      className={`p-2.5 rounded border cursor-pointer transition-colors flex items-start justify-between gap-2.5 ${
                        isSelected 
                          ? 'bg-[#F9FAFB] dark:bg-[#1E293B] border-[#111827] dark:border-[#6366F1]' 
                          : 'bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#9CA3AF] dark:hover:border-[#334155]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] truncate">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8] mt-1 font-mono uppercase tracking-wider">
                          <span className="font-semibold text-[#4B5563] dark:text-[#CBD5E1]">{item.contentType.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        title="Delete document"
                        className="text-[#9CA3AF] hover:text-[#DC2626] dark:hover:text-[#F87171] p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Content Preview & Schema Output */}
        <div className="lg:col-span-7">
          {selectedContent ? (
            <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs">
              {/* Header Bar */}
              <div className="p-5 border-b border-[#E5E7EB] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                      {selectedContent.factCheckStatus}
                    </span>
                    <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
                      /{selectedContent.slug}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
                    {selectedContent.title}
                  </h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                    {selectedContent.metaDescription}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(selectedContent.markdownBody, 'markdown')}
                    className="px-2.5 py-1.5 rounded bg-white dark:bg-[#1E293B] hover:bg-[#F9FAFB] dark:hover:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedSection === 'markdown' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'markdown' ? 'Copied' : 'Copy MD'}
                  </button>
                  <button
                    onClick={() => handleCopy(selectedContent.structuredDataJsonLd, 'schema')}
                    className="px-2.5 py-1.5 rounded bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedSection === 'schema' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Code2 className="w-3.5 h-3.5" />}
                    {copiedSection === 'schema' ? 'Copied' : 'Copy JSON-LD'}
                  </button>
                </div>
              </div>

              {/* Memory Grounding Sources */}
              {selectedContent.usedMemoryTitles?.length > 0 && (
                <div className="bg-[#F9FAFB] dark:bg-[#1E293B]/60 border-b border-[#E5E7EB] dark:border-[#1E293B] px-5 py-2 flex items-center gap-2 text-xs text-[#4B5563] dark:text-[#CBD5E1] overflow-x-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider shrink-0 text-[#6B7280] dark:text-[#94A3B8]">Grounded in Memory:</span>
                  <div className="flex items-center gap-1.5">
                    {selectedContent.usedMemoryTitles.map((t, idx) => (
                      <span key={idx} className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Body Preview */}
              <div className="p-6 max-h-[640px] overflow-y-auto space-y-6">
                <div className="prose dark:prose-invert max-w-none prose-sm prose-headings:font-bold prose-headings:text-[#111827] dark:prose-headings:text-[#F8FAFC] prose-p:text-[#374151] dark:prose-p:text-[#CBD5E1] prose-p:leading-relaxed prose-table:border prose-table:border-[#E5E7EB] dark:prose-table:border-[#1E293B] prose-th:bg-[#F9FAFB] dark:prose-th:bg-[#1E293B] prose-th:p-2.5 prose-th:text-xs prose-th:font-bold prose-th:text-[#111827] dark:prose-th:text-[#F8FAFC] prose-td:p-2.5 prose-td:border-t prose-td:border-[#E5E7EB] dark:prose-td:border-[#1E293B] prose-td:text-xs prose-td:text-[#374151] dark:prose-td:text-[#CBD5E1]">
                  <ReactMarkdown>{selectedContent.markdownBody}</ReactMarkdown>
                </div>

                {/* Structured JSON-LD Schema Box */}
                <div className="pt-5 border-t border-[#E5E7EB] dark:border-[#1E293B]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#94A3B8]" />
                      Schema.org JSON-LD (Ready for HTML Injection)
                    </span>
                    <button
                      onClick={() => handleCopy(selectedContent.structuredDataJsonLd, 'schema-bottom')}
                      className="text-xs text-[#6B7280] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-white inline-flex items-center gap-1 font-semibold uppercase tracking-wider"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedSection === 'schema-bottom' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-[#F9FAFB] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B] rounded p-3.5 text-[11px] text-[#374151] dark:text-[#94A3B8] font-mono overflow-x-auto leading-relaxed">
                    {selectedContent.structuredDataJsonLd}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0F172A] border border-dashed border-[#E5E7EB] dark:border-[#1E293B] p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <FileText className="w-8 h-8 text-[#9CA3AF] mb-2" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
                No AEO Document Selected
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-sm mt-1">
                Select an existing document from the left or generate a new high-authority page tailored for AI Engines.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
