import React, { useState, useEffect } from 'react';
import {
  Brain,
  Network,
  Globe,
  Plus,
  Trash2,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Tag,
  HelpCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Zap,
  DollarSign,
  ShieldCheck,
  Send,
  Sliders,
  Save,
  Activity,
  Radio,
  Eye
} from 'lucide-react';
import { Client, BrandMemoryItem, BrandKnowledgeGraph, BrandMemoryEntityType } from '../../types';
import { BrandNeuralBrain3D } from '../BrandNeuralBrain3D';
import { buildBrandKnowledgeGraph } from '../../services/brandMemoryGraph';

interface BrandMemoryTabProps {
  client: Client;
  onRefreshClient?: () => void;
}

const ENTITY_CONFIG: Record<BrandMemoryEntityType, { label: string; color: string; bg: string; border: string }> = {
  company_overview: { label: 'Company Overview', color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  product_feature: { label: 'Product & Features', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  pricing_plan: { label: 'Pricing & Plans', color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
  competitor_diff: { label: 'Competitor Diff (USP)', color: '#EF4444', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800' },
  use_case: { label: 'Target & Use Cases', color: '#8B5CF6', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800' },
  citation_source: { label: 'Citation Source', color: '#6366F1', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800' },
  target_audience: { label: 'Audience Persona', color: '#EC4899', bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800' },
  faq_fact: { label: 'Verified FAQ & Fact', color: '#06B6D4', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
  ai_perception_insight: { label: 'AI Engine Perception', color: '#A855F7', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800' },
  gsc_demand_query: { label: 'GSC Search Demand', color: '#0EA5E9', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800' },
  ga4_engagement_signal: { label: 'GA4 Intent Signal', color: '#14B8A6', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800' },
};

export const BrandMemoryTab: React.FC<BrandMemoryTabProps> = ({ client }) => {
  const [items, setItems] = useState<BrandMemoryItem[]>([]);
  const [graph, setGraph] = useState<BrandKnowledgeGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [crawling, setCrawling] = useState<boolean>(false);
  const [syncingCrossFunctional, setSyncingCrossFunctional] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [crawlUrl, setCrawlUrl] = useState<string>(client.domain ? `https://${client.domain}` : '');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<BrandMemoryItem | null>(null);

  // Manual Ingestion State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<BrandMemoryEntityType>('product_feature');
  const [manualContent, setManualContent] = useState('');
  const [manualFacts, setManualFacts] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Ask Brand Memory State
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askSources, setAskSources] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);

  const [activeTab, setActiveTab] = useState<'graph' | 'units' | 'ask'>('graph');

  const handleSyncCrossFunctional = async () => {
    setSyncingCrossFunctional(true);
    setSyncNotice(null);
    setMemoryError(null);
    try {
      const res = await fetch('/api/brand-memory/sync-cross-functional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Cross-functional sync failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      setSyncNotice(data.message || 'Synced cross-functional neural insights into Brand Memory.');
      await fetchBrandMemory();
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      setMemoryError(err?.message || 'Cross-functional sync failed.');
    } finally {
      setSyncingCrossFunctional(false);
    }
  };

  const fetchBrandMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand-memory/${client.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Brand Memory load failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      // The memory endpoint persists units, not a graph document. Derive the
      // connected 3D projection deterministically so the canvas always gets
      // real nodes and synapse links from the current collection.
      setGraph(buildBrandKnowledgeGraph(client, nextItems));
      setSelectedItem(current => current && nextItems.some(item => item.id === current.id) ? current : (nextItems[0] || null));
      setMemoryError(null);
    } catch (err: any) {
      setMemoryError(err?.message || 'Failed to load Brand Memory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedItem(null);
    setSelectedEntity('all');
    setSearchQuery('');
    setCrawlUrl(client.domain ? `https://${client.domain}` : '');
    setMemoryError(null);
    fetchBrandMemory();
  }, [client.id]);

  // Crawl and index URL
  const handleCrawlAndIndex = async () => {
    if (!crawlUrl) return;
    setCrawling(true);
    setMemoryError(null);
    try {
      const res = await fetch('/api/brand-memory/crawl-and-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          url: crawlUrl,
          sourceType: 'crawler',
        }),
      });
      if (res.ok) {
        await fetchBrandMemory();
      } else {
        const errData = await res.json();
        setMemoryError(errData.error || 'Failed to crawl.');
      }
    } catch (err: any) {
      setMemoryError(`Crawl failed: ${err.message}`);
    } finally {
      setCrawling(false);
    }
  };

  // Save manual entry
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualContent) return;
    setSavingManual(true);
    setMemoryError(null);
    try {
      const factsArray = manualFacts
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const res = await fetch('/api/brand-memory/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: manualTitle,
          entityType: manualType,
          content: manualContent,
          keyFacts: factsArray,
          tags: [manualType],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Manual fact save failed (HTTP ${res.status})`);
      }
      setShowAddModal(false);
      setManualTitle('');
      setManualContent('');
      setManualFacts('');
      await fetchBrandMemory();
    } catch (err: any) {
      setMemoryError(err?.message || 'Manual fact save failed.');
    } finally {
      setSavingManual(false);
    }
  };

  // Delete memory item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory unit?')) return;
    try {
      setMemoryError(null);
      const res = await fetch(`/api/brand-memory/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Memory unit deletion failed (HTTP ${res.status})`);
      }
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      setMemoryError(err?.message || 'Memory unit deletion failed.');
    }
  };

  // Ask Brand Memory Question
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;
    setAsking(true);
    setAskAnswer(null);
    setAskSources([]);
    setMemoryError(null);
    try {
      const res = await fetch('/api/brand-memory/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          question: askQuestion,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Brand Memory query failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      setAskAnswer(data.answer);
      setAskSources(data.sources || []);
    } catch (err: any) {
      setMemoryError(err?.message || 'Brand Memory query failed.');
    } finally {
      setAsking(false);
    }
  };

  const filteredItems = items.filter(i => {
    const matchType = selectedEntity === 'all' || i.entityType === selectedEntity;
    const matchSearch =
      searchQuery === '' ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.keyFacts.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stat Cards */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        {memoryError && (
          <div role="alert" className="border border-[#FCA5A5] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#450A0A]/40 p-3 text-xs text-[#991B1B] dark:text-[#FCA5A5]">
            {memoryError}
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#F9FAFB] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#334155] rounded flex items-center gap-1">
                <Brain className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                Adaptive RAG • Brand Memory Core
              </span>
              <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#94A3B8]">
                Gemini-grounded memory index
              </span>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
              {client.brandName} Knowledge Brain &amp; Neural Synapses Matrix
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-3xl leading-relaxed">
              Bu beyin, markanızın doğrulanmış ürün, fiyat, USP (ayrışma noktası) ve rakip farkı kayıtlarını saklar. Firecrawl kaynakları, manuel gerçekler, profil sinyalleri ve ölçülmüş Gemini Grounded run kanıtlarıyla beslenir; Brand Memory ise AEO üretimi ve RAG Q&amp;A yanıtlarını kaynaklandırır.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCrossFunctional}
              disabled={syncingCrossFunctional}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              title="Sync the client profile and observed Gemini Grounded run evidence into Brand Brain"
            >
              <Activity className={`w-3.5 h-3.5 ${syncingCrossFunctional ? 'animate-spin' : ''}`} />
              {syncingCrossFunctional ? 'Syncing Signals...' : 'Sync Profile & Run Evidence'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Verified Fact
            </button>
            <button
              onClick={fetchBrandMemory}
              disabled={loading}
              className="p-1.5 text-[#6B7280] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-white border border-[#E5E7EB] dark:border-[#334155] rounded bg-white dark:bg-[#1E293B] cursor-pointer"
              title="Refresh Memory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {syncNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Crawl & Ingestion Bar */}
        <div className="bg-white dark:bg-[#1E293B] p-3 border border-[#E2E8F0] dark:border-[#334155] rounded flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 flex-1 w-full">
            <Globe className="w-4 h-4 text-[#4338CA] shrink-0" />
            <input
              type="url"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              placeholder="https://example.com/pricing or /about"
              className="w-full text-xs bg-transparent border-0 focus:ring-0 text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8]"
            />
          </div>
          <button
            onClick={handleCrawlAndIndex}
            disabled={crawling || !crawlUrl}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#4338CA] hover:bg-[#3730A3] text-white rounded transition-colors disabled:opacity-50 shrink-0"
          >
            {crawling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Crawling & indexing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Crawl & Ingest into Brand Brain
              </>
            )}
          </button>
        </div>

        {/* 4 Stats Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-white dark:bg-[#1E293B] p-3 border border-[#E2E8F0] dark:border-[#334155] rounded">
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#4338CA]" />
              Indexed Memory Units
            </div>
            <div className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {items.length} Units
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-3 border border-[#E2E8F0] dark:border-[#334155] rounded">
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-[#10B981]" />
              3D Neural Nodes
            </div>
            <div className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
              {Math.max(0, (graph?.nodes.length || 1) - 1)} Nodes ({graph?.links.length || 0} Synapses)
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-3 border border-[#E2E8F0] dark:border-[#334155] rounded">
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-[#0EA5E9]" />
              Signal Sources
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 truncate">
              {Array.from(new Set(items.map((item) => item.sourceType))).length > 0
                ? Array.from(new Set(items.map((item) => item.sourceType))).join(' + ')
                : 'No indexed sources'}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-3 border border-[#E2E8F0] dark:border-[#334155] rounded">
            <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Factual Grounding
            </div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Source-backed facts
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'graph'
                ? 'bg-[#4338CA] text-white'
                : 'text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            3D Neural Synapses Matrix
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'units'
                ? 'bg-[#4338CA] text-white'
                : 'text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Memory Units ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'ask'
                ? 'bg-[#4338CA] text-white'
                : 'text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Ask Brand Brain (RAG Q&A)
          </button>
        </div>
      </div>

      {/* TAB 1: 3D KNOWLEDGE GRAPH & SYNAPSE MATRIX */}
      {activeTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 3D Neural Brain Visualizer */}
          <div className="lg:col-span-2">
            <BrandNeuralBrain3D
              graph={graph}
              items={items}
              selectedItem={selectedItem}
              onSelectItem={(item) => setSelectedItem(item)}
            />
          </div>

          {/* Selected Entity Inspector Panel */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] dark:border-[#1E293B] pb-2 flex items-center justify-between">
              <span>Selected Neural Memory</span>
              {selectedItem && (
                <span className="text-[10px] text-slate-400 font-mono">ID: {selectedItem.id.slice(0, 8)}</span>
              )}
            </h3>

            {selectedItem ? (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        ENTITY_CONFIG[selectedItem.entityType]?.bg || 'bg-slate-100'
                      } ${ENTITY_CONFIG[selectedItem.entityType]?.border || 'border-slate-300'}`}
                      style={{ color: ENTITY_CONFIG[selectedItem.entityType]?.color }}
                    >
                      {ENTITY_CONFIG[selectedItem.entityType]?.label || selectedItem.entityType}
                    </span>
                    <span className="text-[10px] text-[#64748B]">Confidence: {selectedItem.confidence}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {selectedItem.title}
                  </h4>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-3 rounded border border-[#E2E8F0] dark:border-[#334155] text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                  {selectedItem.content}
                </div>

                {selectedItem.keyFacts?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">
                      Verified Facts (AI Extractables):
                    </div>
                    <ul className="space-y-1">
                      {selectedItem.keyFacts.map((fact, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[#475569] dark:text-[#94A3B8]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedItem.sourceUrl && (
                  <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Source:</span>
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#4338CA] dark:text-[#818CF8] hover:underline flex items-center gap-1 truncate max-w-[200px]"
                    >
                      {selectedItem.sourceUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="text-rose-600 hover:text-rose-700 text-[11px] flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Unit
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#94A3B8] text-xs">
                Grafikteki veya listedeki bir nöral düğüme tıklayarak detayları inceleyin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEMORY UNITS GRID */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#0F172A] p-3 border border-[#E2E8F0] dark:border-[#1E293B] rounded">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => setSelectedEntity('all')}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedEntity === 'all'
                    ? 'bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                All ({items.length})
              </button>
              {(Object.keys(ENTITY_CONFIG) as BrandMemoryEntityType[]).map((type) => {
                const count = items.filter(i => i.entityType === type).length;
                if (count === 0 && selectedEntity !== type) return null;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedEntity(type)}
                    className={`px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 ${
                      selectedEntity === type
                        ? 'bg-[#4338CA] text-white'
                        : 'text-[#64748B] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {ENTITY_CONFIG[type].label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search facts or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#CBD5E1] dark:border-[#334155] rounded bg-transparent text-[#0F172A] dark:text-[#F8FAFC]"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 border rounded cursor-pointer transition-all bg-white dark:bg-[#0F172A] ${
                  selectedItem?.id === item.id
                    ? 'border-[#4338CA] shadow-md ring-1 ring-[#4338CA]'
                    : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      ENTITY_CONFIG[item.entityType]?.bg || 'bg-slate-100'
                    } ${ENTITY_CONFIG[item.entityType]?.border || 'border-slate-300'}`}
                    style={{ color: ENTITY_CONFIG[item.entityType]?.color }}
                  >
                    {ENTITY_CONFIG[item.entityType]?.label || item.entityType}
                  </span>
                  <span className="text-[10px] text-[#64748B]">{item.sourceType}</span>
                </div>

                <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5 line-clamp-1">
                  {item.title}
                </h4>

                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-3 mb-3 leading-relaxed">
                  {item.content}
                </p>

                {item.keyFacts?.length > 0 && (
                  <div className="text-[11px] text-[#475569] dark:text-[#CBD5E1] font-medium flex items-center gap-1 border-t border-[#F1F5F9] dark:border-[#1E293B] pt-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{item.keyFacts.length} verified facts extracted</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASK BRAND BRAIN (RAG Q&A TEST) */}
      {activeTab === 'ask' && (
        <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-md p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                RAG Q&A Console
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Marka Beynine Soru Sorun (Grounding & Fact Check)
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Yapay zeka modellerinin markanız hakkında ne bildiğini test edin. Model uydurma veri üretmeden yalnızca Marka Hafızanızdaki doğrulanmış verilerle yanıt verir.
            </p>
          </div>

          {/* Quick Prompts */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-[#64748B] font-medium">Örnek Test Soruları:</span>
            {[
              `${client.brandName} fiyatlandırması ve paketleri nelerdir?`,
              `Rakiplerimize göre en büyük farklarımız ve avantajlarımız neler?`,
              `Temel ürün özellikleri ve entegrasyonlarımız neler?`,
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => setAskQuestion(q)}
                className="px-2.5 py-1 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] text-[#334155] dark:text-[#CBD5E1] rounded text-[11px] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              placeholder="Markanızla ilgili herhangi bir soru sorun..."
              className="flex-1 text-xs px-3.5 py-2.5 border border-[#CBD5E1] dark:border-[#334155] rounded bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] focus:ring-1 focus:ring-[#4338CA]"
            />
            <button
              type="submit"
              disabled={asking || !askQuestion.trim()}
              className="px-5 py-2.5 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
            >
              {asking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Sor
            </button>
          </form>

          {/* Answer Box */}
          {askAnswer && (
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E1B4B] dark:text-[#E0E7FF]">
                  <Brain className="w-4 h-4 text-[#4338CA]" />
                  Brand Memory Grounded Response
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Grounded in stored memory
                </span>
              </div>

              <div className="text-xs text-[#1E293B] dark:text-[#F1F5F9] leading-relaxed whitespace-pre-wrap">
                {askAnswer}
              </div>

              {askSources.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#334155] text-[11px] text-[#64748B]">
                  <span className="font-semibold">Kullanılan Hafıza Parçacıkları: </span>
                  {askSources.join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Manual Fact Ingestion */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#4338CA]" />
                Add Verified Brand Memory Fact
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#334155] dark:text-[#CBD5E1]">
                  Title / Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Enterprise Pricing & SLA Guarantee"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#334155] rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#334155] dark:text-[#CBD5E1]">
                  Entity Type
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as BrandMemoryEntityType)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#334155] rounded bg-white dark:bg-[#1E293B]"
                >
                  {(Object.keys(ENTITY_CONFIG) as BrandMemoryEntityType[]).map((type) => (
                    <option key={type} value={type}>
                      {ENTITY_CONFIG[type].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#334155] dark:text-[#CBD5E1]">
                  Factual Paragraph (Full Context)
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed description with exact numbers, metrics, or technical specifications..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#334155] rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#334155] dark:text-[#CBD5E1]">
                  Key Facts (One fact per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="99.99% Uptime Guarantee&#10;SOC-2 Certified&#10;Unlimited Run Cycles"
                  value={manualFacts}
                  onChange={(e) => setManualFacts(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#334155] rounded bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-[#64748B] hover:bg-[#F1F5F9] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold rounded flex items-center gap-1"
                >
                  {savingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save & Embed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
