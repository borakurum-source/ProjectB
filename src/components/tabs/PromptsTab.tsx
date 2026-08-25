import { useState, FormEvent } from 'react';
import { Prompt, PromptAggregate, Client, IntentLayer } from '../../types';
import { Plus, Search, AlertCircle, CheckCircle2, XCircle, Sparkles, Eye, Upload, Trash2, Pencil, Check, X } from 'lucide-react';

interface PromptsTabProps {
  prompts: Prompt[];
  promptAggregates: PromptAggregate[];
  client: Client;
  onAddPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => void;
  onBulkAddPrompts: (prompts: Omit<Prompt, 'id' | 'createdAt'>[]) => void;
  onToggleActive: (promptId: string) => void;
  onDeletePrompt: (promptId: string) => void;
  onUpdatePrompt?: (promptId: string, updatedFields: Partial<Prompt>) => void;
  onInspectPrompt: (promptId: string) => void;
  onDiagnosePrompt: (prompt: Prompt) => void;
  onOpenOpportunities?: () => void;
}

export function PromptsTab({
  prompts,
  promptAggregates,
  client,
  onAddPrompt,
  onBulkAddPrompts,
  onToggleActive,
  onDeletePrompt,
  onUpdatePrompt,
  onInspectPrompt,
  onDiagnosePrompt,
  onOpenOpportunities,
}: PromptsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Inline prompt editing state
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const handleStartEditing = (prompt: Prompt) => {
    setEditingPromptId(prompt.id);
    setEditingText(prompt.text);
  };

  const handleSaveInlineEdit = (promptId: string) => {
    const trimmed = editingText.trim();
    if (trimmed && onUpdatePrompt) {
      onUpdatePrompt(promptId, { text: trimmed });
    }
    setEditingPromptId(null);
    setEditingText('');
  };

  const handleCancelInlineEdit = () => {
    setEditingPromptId(null);
    setEditingText('');
  };

  // New prompt form state
  const [newText, setNewText] = useState('');
  const [newIntent, setNewIntent] = useState<IntentLayer>('Comparative');
  const [newCategory, setNewCategory] = useState('');

  // Bulk prompts state
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState('Core Product');
  const [bulkIntent, setBulkIntent] = useState<IntentLayer>('Commercial');

  // Query Fan-Out Simulator State
  const [fanoutModalPrompt, setFanoutModalPrompt] = useState<Prompt | null>(null);
  const [fanoutData, setFanoutData] = useState<any | null>(null);
  const [loadingFanout, setLoadingFanout] = useState(false);

  // AI Prompt Discovery State
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredPrompts, setDiscoveredPrompts] = useState<any[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [addedPromptsMap, setAddedPromptsMap] = useState<Record<string, boolean>>({});

  const handleRunFanout = async (prompt: Prompt) => {
    setFanoutModalPrompt(prompt);
    setFanoutData(null);
    setLoadingFanout(true);
    try {
      const res = await fetch('/api/prompts/fanout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.text }),
      });
      const data = await res.json();
      setFanoutData(data);
    } catch (err) {
      console.error('Fanout error', err);
    } finally {
      setLoadingFanout(false);
    }
  };

  const handleDiscoverPrompts = async () => {
    setShowDiscoveryModal(true);
    setLoadingDiscovery(true);
    setDiscoveredPrompts([]);
    try {
      const res = await fetch('/api/prompts/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: client.brandName,
          industry: client.industry,
          domain: client.domain,
          language: client.language,
          market: client.market,
        }),
      });
      const data = await res.json();
      setDiscoveredPrompts(data.discoveredPrompts || []);
    } catch (err) {
      console.error('Failed to discover prompts', err);
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleAddDiscoveredPrompt = (item: any) => {
    onAddPrompt({
      ownerId: client.ownerId,
      clientId: client.id,
      text: item.text,
      category: item.category || 'General',
      intentLayer: item.intentLayer || 'Informational',
      active: true,
    });
    setAddedPromptsMap((prev) => ({ ...prev, [item.text]: true }));
  };

  // Filter prompts
  const filteredPrompts = prompts.filter((p) => {
    const agg = promptAggregates.find((a) => a.promptId === p.id);
    const matchesSearch = p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIntent = selectedIntent === 'ALL' || p.intentLayer === selectedIntent;

    let matchesStatus = true;
    if (selectedStatus === 'MENTIONED') {
      matchesStatus = (agg?.mentionRate ?? 0) > 0;
    } else if (selectedStatus === 'CITED') {
      matchesStatus = (agg?.citationRate ?? 0) > 0;
    } else if (selectedStatus === 'VOLATILE') {
      matchesStatus = Boolean(agg?.volatility);
    } else if (selectedStatus === 'MISSING') {
      matchesStatus = (agg?.mentionRate ?? 0) === 0;
    }

    return matchesSearch && matchesIntent && matchesStatus;
  });

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddPrompt({
      ownerId: client.ownerId,
      clientId: client.id,
      text: newText.trim(),
      intentLayer: newIntent,
      category: newCategory.trim() || 'General',
      active: true,
    });
    setNewText('');
    setNewCategory('');
    setShowAddModal(false);
  };

  const handleBulkSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const newItems: Omit<Prompt, 'id' | 'createdAt'>[] = lines.map((line) => ({
      ownerId: client.ownerId,
      clientId: client.id,
      text: line,
      intentLayer: bulkIntent,
      category: bulkCategory,
      active: true,
    }));
    onBulkAddPrompts(newItems);
    setBulkText('');
    setShowBulkModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Filters, and Add Buttons */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] dark:text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search prompts by query keywords or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#0F172A] focus:outline-hidden focus:border-[#111827] dark:focus:border-[#6366F1]"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Intent Filter */}
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1]"
            >
              <option value="ALL">All Intents</option>
              <option value="Informational">Informational</option>
              <option value="Commercial">Commercial</option>
              <option value="Comparative">Comparative</option>
              <option value="Navigational">Navigational</option>
              <option value="Transactional">Transactional</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1]"
            >
              <option value="ALL">All Visibility</option>
              <option value="MENTIONED">Brand Mentioned (&gt;0%)</option>
              <option value="CITED">Domain Cited (&gt;0%)</option>
              <option value="VOLATILE">Volatile Presence</option>
              <option value="MISSING">Missing (0% mentions)</option>
            </select>

            {/* Find Opportunities */}
            {onOpenOpportunities && (
              <button
                onClick={onOpenOpportunities}
                className="px-3 py-1.5 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#111827] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#111827] dark:text-[#818CF8]" /> Find Opportunities
              </button>
            )}

            {/* Discover AI Prompts */}
            <button
              onClick={handleDiscoverPrompts}
              className="px-3 py-1.5 bg-[#EEF2FF] dark:bg-[#1E1B4B] hover:bg-[#E0E7FF] dark:hover:bg-[#312E81] border border-[#C7D2FE] dark:border-[#3730A3] text-[#4338CA] dark:text-[#A5B4FC] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Discover AI Prompts
            </button>

            {/* Bulk Import */}
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Import
            </button>

            {/* Add Single Prompt */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Track Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] min-w-[300px]">
                  Prompt Query
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Category
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Intent
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Sample (n)
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Mention Rate
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Citation Rate
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Rank
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Status
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-right min-w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6B7280] dark:text-[#94A3B8]">
                    No prompts match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((p) => {
                  const agg = promptAggregates.find((a) => a.promptId === p.id);
                  const mentionRate = agg?.mentionRate ?? 0;
                  const citationRate = agg?.citationRate ?? 0;
                  const runsCount = agg?.runsCount ?? 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] transition-colors">
                      <td className="py-2.5 px-3">
                        {editingPromptId === p.id ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveInlineEdit(p.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelInlineEdit();
                                  }
                                }}
                                className="w-full px-2.5 py-1 bg-white border-2 border-[#4338CA] rounded text-xs font-semibold text-[#111827] focus:outline-hidden shadow-xs"
                                placeholder="Enter prompt text..."
                              />
                              <button
                                onClick={() => handleSaveInlineEdit(p.id)}
                                className="p-1.5 bg-[#111827] hover:bg-black text-white rounded shadow-xs shrink-0 cursor-pointer"
                                title="Save title change (Enter)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelInlineEdit}
                                className="p-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded shrink-0 cursor-pointer"
                                title="Cancel (Esc)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-[#4338CA] font-mono">
                              Press Enter to save • Esc to cancel
                            </div>
                          </div>
                        ) : (
                          <div className="group">
                            <div
                              onClick={() => handleStartEditing(p)}
                              className="font-semibold text-[#111827] hover:text-[#4338CA] cursor-pointer inline-flex items-center gap-1.5 transition-colors group-hover:underline"
                              title="Click to edit prompt text directly inline"
                            >
                              <span>{p.text}</span>
                              <Pencil className="w-3 h-3 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <div className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono flex items-center gap-2">
                              <span>ID: {p.id}</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => onToggleActive(p.id)}
                                title={p.active ? 'Click to pause this prompt' : 'Click to reactivate this prompt'}
                                className={`hover:underline ${p.active ? 'text-[#059669] dark:text-[#34D399]' : 'text-[#D97706] dark:text-[#FBBF24]'}`}
                              >
                                Active: {p.active ? 'Yes' : 'Paused'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[#374151] dark:text-[#CBD5E1]">
                        <span className="bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#6B7280] dark:text-[#94A3B8]">
                        <span className="font-mono text-[10px] text-[#374151] dark:text-[#CBD5E1]">{p.intentLayer}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[#6B7280] dark:text-[#94A3B8]">
                        n={runsCount}
                      </td>

                      {/* Mention Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 border ${
                            mentionRate >= 0.8
                              ? 'bg-[#111827] dark:bg-[#6366F1] text-white border-[#111827] dark:border-[#6366F1]'
                              : mentionRate >= 0.5
                              ? 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] border-[#9CA3AF] dark:border-[#334155]'
                              : mentionRate > 0
                              ? 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]'
                              : 'bg-white dark:bg-[#0F172A] text-[#9CA3AF] dark:text-[#64748B] border-transparent'
                          }`}
                        >
                          {Math.round(mentionRate * 100)}% ({agg?.mentionCount ?? 0}/{runsCount})
                        </span>
                      </td>

                      {/* Citation Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 border ${
                            citationRate >= 0.8
                              ? 'bg-[#065F46] dark:bg-[#064E3B] text-white border-[#065F46]'
                              : citationRate >= 0.5
                              ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                              : citationRate > 0
                              ? 'bg-[#F0FDF4] dark:bg-[#064E3B]/40 text-[#15803D] dark:text-[#A7F3D0] border-[#BBF7D0] dark:border-[#065F46]'
                              : 'bg-white dark:bg-[#0F172A] text-[#9CA3AF] dark:text-[#64748B] border-transparent'
                          }`}
                        >
                          {Math.round(citationRate * 100)}% ({agg?.citationCount ?? 0}/{runsCount})
                        </span>
                      </td>

                      {/* Rank Position */}
                      <td className="py-2.5 px-2 text-center font-mono text-[#111827] dark:text-[#F8FAFC]">
                        {agg?.avgPosition !== null && agg?.avgPosition !== undefined ? (
                          <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">#{agg.avgPosition}</span>
                        ) : (
                          <span className="text-[#9CA3AF] dark:text-[#64748B]">—</span>
                        )}
                      </td>

                      {/* Volatility / Stability Status */}
                      <td className="py-2.5 px-2 text-center">
                        {runsCount === 0 ? (
                          <span className="text-[#9CA3AF] dark:text-[#64748B] text-[10px]">Unmeasured</span>
                        ) : agg?.volatility ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#78350F] text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" /> Volatile
                          </span>
                        ) : mentionRate === 1 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-[#059669] dark:text-[#34D399]" /> Stable (100%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] text-[10px] font-bold uppercase tracking-wider">
                            <XCircle className="w-3 h-3 text-[#9CA3AF] dark:text-[#64748B]" /> Missing (0%)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onInspectPrompt(p.id)}
                          className="px-2.5 py-1 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] border border-[#D1D5DB] dark:border-[#334155] text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Inspect raw runs, search queries, and extractions"
                        >
                          <Eye className="w-3 h-3 text-[#6B7280] dark:text-[#94A3B8]" /> Inspect Runs
                        </button>
                        <button
                          onClick={() => onDiagnosePrompt(p)}
                          className="px-2.5 py-1 bg-[#111827] dark:bg-[#6366F1] hover:bg-black dark:hover:bg-[#4F46E5] text-white text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Run 6-dimension diagnostic"
                        >
                          <Sparkles className="w-3 h-3" /> Diagnose
                        </button>
                        <button
                          onClick={() => handleRunFanout(p)}
                          className="px-2.5 py-1 bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3] text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Simulate query fan-out"
                        >
                          Fan-Out
                        </button>
                        <button
                          onClick={() => onDeletePrompt(p.id)}
                          className="p-1 text-[#9CA3AF] dark:text-[#64748B] hover:text-[#DC2626] dark:hover:text-[#F87171] transition-colors"
                          title="Delete prompt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Prompt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                Track New Prompt Query
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] dark:text-[#64748B] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                  Verbatim Prompt Text
                </label>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                  Enter the exact question a prospective enterprise buyer would ask an AI assistant.
                </p>
                <textarea
                  required
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g. Best cloud observability tools for Kubernetes microservices 2026"
                  className="w-full p-2.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Intent Layer
                  </label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value as IntentLayer)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]"
                  >
                    <option value="Informational">Informational</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Comparative">Comparative</option>
                    <option value="Navigational">Navigational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Kubernetes, APM, Cost"
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] rounded text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Add Tracked Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Prompts Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                Bulk Import Prompts
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-[#9CA3AF] dark:text-[#64748B] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                  Prompts (One per line)
                </label>
                <textarea
                  required
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Top APM software for AWS lambda&#10;Datadog alternatives for high throughput logs&#10;How to monitor microservices traces with OpenTelemetry"
                  className="w-full p-2.5 font-mono bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Default Intent
                  </label>
                  <select
                    value={bulkIntent}
                    onChange={(e) => setBulkIntent(e.target.value as IntentLayer)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]"
                  >
                    <option value="Informational">Informational</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Comparative">Comparative</option>
                    <option value="Navigational">Navigational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Default Category
                  </label>
                  <input
                    type="text"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] rounded text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Import Prompts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Prompt Discovery Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1E293B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4338CA] dark:text-[#818CF8]" />
                <div>
                  <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">AI Prompt Research Engine</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">AI-discovered high-intent prompts for {client.brandName}</p>
                </div>
              </div>
              <button onClick={() => setShowDiscoveryModal(false)} className="px-2 py-1 text-xs font-bold text-[#6B7280] dark:text-[#CBD5E1] hover:text-[#111827] dark:hover:text-[#F8FAFC] bg-[#E5E7EB] dark:bg-[#334155] rounded cursor-pointer">
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {loadingDiscovery ? (
                <div className="p-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-[#4338CA] dark:text-[#818CF8] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]">Analyzing buyers' search intent with Gemini...</p>
                </div>
              ) : discoveredPrompts.length > 0 ? (
                <div className="space-y-3">
                  {discoveredPrompts.map((item, idx) => (
                    <div key={idx} className="p-3 border border-[#E5E7EB] dark:border-[#1E293B] rounded bg-white dark:bg-[#1E293B]/50 hover:border-[#C7D2FE] dark:hover:border-[#6366F1] transition-colors flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium text-xs text-[#111827] dark:text-[#F8FAFC]">"{item.text}"</div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4338CA] dark:text-[#A5B4FC] px-1.5 py-0.5 rounded font-bold uppercase">{item.category}</span>
                          <span className="bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] px-1.5 py-0.5 rounded">{item.intentLayer}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{item.relevanceReason}</div>
                      </div>

                      <button
                        onClick={() => handleAddDiscoveredPrompt(item)}
                        disabled={addedPromptsMap[item.text]}
                        className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 transition-colors flex items-center gap-1 ${
                          addedPromptsMap[item.text] ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#047857] dark:text-[#A7F3D0]' : 'bg-[#111827] dark:bg-[#4338CA] text-white hover:bg-black dark:hover:bg-[#3730A3]'
                        }`}
                      >
                        {addedPromptsMap[item.text] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {addedPromptsMap[item.text] ? 'Added' : 'Track'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Query Fan-Out Modal */}
      {fanoutModalPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#1E293B]">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-[#4338CA] dark:text-[#818CF8]" />
                <div>
                  <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">Query Fan-Out Simulator</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">How AI engines break down this prompt</p>
                </div>
              </div>
              <button onClick={() => setFanoutModalPrompt(null)} className="px-2 py-1 text-xs font-bold text-[#6B7280] dark:text-[#CBD5E1] hover:text-[#111827] dark:hover:text-[#F8FAFC] bg-[#E5E7EB] dark:bg-[#334155] rounded cursor-pointer">
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-[#EEF2FF] dark:bg-[#1E1B4B] border border-[#C7D2FE] dark:border-[#3730A3] rounded text-sm text-[#111827] dark:text-[#F8FAFC] font-medium">
                "{fanoutModalPrompt.text}"
              </div>

              {loadingFanout ? (
                <div className="p-8 text-center">
                  <Search className="w-6 h-6 text-[#4338CA] dark:text-[#818CF8] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Simulating AI search behavior...</p>
                </div>
              ) : fanoutData ? (
                <div className="space-y-4">
                  <p className="text-xs text-[#374151] dark:text-[#CBD5E1]">{fanoutData.fanoutSummary}</p>
                  {fanoutData.engines?.map((eng: any, eIdx: number) => (
                    <div key={eIdx} className="border border-[#E5E7EB] dark:border-[#1E293B] rounded overflow-hidden">
                      <div className="bg-[#F9FAFB] dark:bg-[#1E293B] px-3 py-2 border-b border-[#E5E7EB] dark:border-[#1E293B] font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                        {eng.engine}
                      </div>
                      <div className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
                        {eng.queries?.map((q: any, qIdx: number) => (
                          <div key={qIdx} className="p-3 space-y-1">
                            <div className="font-mono text-xs text-[#4338CA] dark:text-[#818CF8] font-medium">{q.query}</div>
                            <div className="flex items-center justify-between text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                              <span className="uppercase">{q.intent}</span>
                              <span>{q.purpose}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
