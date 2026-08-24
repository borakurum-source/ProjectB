import { useState, FormEvent } from 'react';
import { Prompt, PromptAggregate, Client, IntentLayer } from '../../types';
import { Plus, Search, AlertCircle, CheckCircle2, XCircle, Sparkles, Eye, Upload, Trash2 } from 'lucide-react';

interface PromptsTabProps {
  prompts: Prompt[];
  promptAggregates: PromptAggregate[];
  client: Client;
  onAddPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => void;
  onBulkAddPrompts: (prompts: Omit<Prompt, 'id' | 'createdAt'>[]) => void;
  onToggleActive: (promptId: string) => void;
  onDeletePrompt: (promptId: string) => void;
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
  onDeletePrompt,
  onInspectPrompt,
  onDiagnosePrompt,
  onOpenOpportunities,
}: PromptsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // New prompt form state
  const [newText, setNewText] = useState('');
  const [newIntent, setNewIntent] = useState<IntentLayer>('Comparative');
  const [newCategory, setNewCategory] = useState('');

  // Bulk prompts state
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState('Core Product');
  const [bulkIntent, setBulkIntent] = useState<IntentLayer>('Commercial');

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
      <div className="bg-white border border-[#E5E7EB] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search prompts by query keywords or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-hidden focus:border-[#111827]"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Intent Filter */}
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold uppercase tracking-wider text-[#374151]"
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
              className="px-2.5 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold uppercase tracking-wider text-[#374151]"
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
                className="px-3 py-1.5 bg-white hover:bg-[#F3F4F6] border border-[#111827] text-[#111827] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#111827]" /> Find Opportunities
              </button>
            )}

            {/* Bulk Import */}
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#111827] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Import
            </button>

            {/* Add Single Prompt */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Track Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white border border-[#E5E7EB] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] min-w-[300px]">
                  Prompt Query
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Category
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Intent
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Sample (n)
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Mention Rate
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Citation Rate
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Rank
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Status
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-right min-w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6B7280]">
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
                    <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#111827]">{p.text}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono">
                          ID: {p.id} • Active: {p.active ? 'Yes' : 'Paused'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#374151]">
                        <span className="bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[#6B7280]">
                        <span className="font-mono text-[10px] text-[#374151]">{p.intentLayer}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[#6B7280]">
                        n={runsCount}
                      </td>

                      {/* Mention Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 border ${
                            mentionRate >= 0.8
                              ? 'bg-[#111827] text-white border-[#111827]'
                              : mentionRate >= 0.5
                              ? 'bg-[#F3F4F6] text-[#111827] border-[#9CA3AF]'
                              : mentionRate > 0
                              ? 'bg-[#F9FAFB] text-[#374151] border-[#E5E7EB]'
                              : 'bg-white text-[#9CA3AF] border-transparent'
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
                              ? 'bg-[#065F46] text-white border-[#065F46]'
                              : citationRate >= 0.5
                              ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                              : citationRate > 0
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                              : 'bg-white text-[#9CA3AF] border-transparent'
                          }`}
                        >
                          {Math.round(citationRate * 100)}% ({agg?.citationCount ?? 0}/{runsCount})
                        </span>
                      </td>

                      {/* Rank Position */}
                      <td className="py-2.5 px-2 text-center font-mono text-[#111827]">
                        {agg?.avgPosition !== null && agg?.avgPosition !== undefined ? (
                          <span className="font-bold text-[#111827]">#{agg.avgPosition}</span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Volatility / Stability Status */}
                      <td className="py-2.5 px-2 text-center">
                        {runsCount === 0 ? (
                          <span className="text-[#9CA3AF] text-[10px]">Unmeasured</span>
                        ) : agg?.volatility ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3 text-[#D97706]" /> Volatile
                          </span>
                        ) : mentionRate === 1 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" /> Stable (100%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider">
                            <XCircle className="w-3 h-3 text-[#9CA3AF]" /> Missing (0%)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onInspectPrompt(p.id)}
                          className="px-2.5 py-1 bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Inspect raw runs, search queries, and extractions"
                        >
                          <Eye className="w-3 h-3 text-[#6B7280]" /> Inspect Runs
                        </button>
                        <button
                          onClick={() => onDiagnosePrompt(p)}
                          className="px-2.5 py-1 bg-[#111827] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          title="Run 6-dimension diagnostic"
                        >
                          <Sparkles className="w-3 h-3" /> Diagnose
                        </button>
                        <button
                          onClick={() => onDeletePrompt(p.id)}
                          className="p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
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
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
                Track New Prompt Query
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                  Verbatim Prompt Text
                </label>
                <p className="text-[11px] text-[#6B7280] mb-1.5">
                  Enter the exact question a prospective enterprise buyer would ask an AI assistant.
                </p>
                <textarea
                  required
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g. Best cloud observability tools for Kubernetes microservices 2026"
                  className="w-full p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                    Intent Layer
                  </label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value as IntentLayer)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-[#111827]"
                  >
                    <option value="Informational">Informational</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Comparative">Comparative</option>
                    <option value="Navigational">Navigational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Kubernetes, APM, Cost"
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] rounded text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F3F4F6]"
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
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
                Bulk Import Prompts
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                  Prompts (One per line)
                </label>
                <textarea
                  required
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Top APM software for AWS lambda&#10;Datadog alternatives for high throughput logs&#10;How to monitor microservices traces with OpenTelemetry"
                  className="w-full p-2.5 font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                    Default Intent
                  </label>
                  <select
                    value={bulkIntent}
                    onChange={(e) => setBulkIntent(e.target.value as IntentLayer)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-[#111827]"
                  >
                    <option value="Informational">Informational</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Comparative">Comparative</option>
                    <option value="Navigational">Navigational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">
                    Default Category
                  </label>
                  <input
                    type="text"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] rounded text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Import Prompts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
