import { useState } from 'react';
import { Client, IntentLayer, OpportunityPrompt } from '../types';
import { X, Sparkles, Plus, Check, Loader2 } from 'lucide-react';

interface OpportunityModalProps {
  client: Client;
  onAddPrompts: (prompts: { text: string; intentLayer: IntentLayer; category: string }[]) => void;
  onClose: () => void;
}

export function OpportunityModal({ client, onAddPrompts, onClose }: OpportunityModalProps) {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityPrompt[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch opportunities' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const list: OpportunityPrompt[] = data.prompts || [];
      setOpportunities(list);
      // Select all by default
      setSelectedIndices(new Set(list.map((_, i) => i)));
    } catch (err: any) {
      setError(err?.message || 'Opportunity discovery encountered an error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleConfirmAdd = () => {
    const toAdd = opportunities
      .filter((_, i) => selectedIndices.has(i))
      .map((op) => ({
        text: op.text,
        intentLayer: op.intentLayer,
        category: op.category,
      }));
    onAddPrompts(toAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-white" /> Opportunity Discovery
              </span>
              <span className="text-xs text-[#6B7280] font-mono">Max 20 High-Intent Prompts</span>
            </div>
            <h2 className="text-sm font-bold text-[#111827]">
              Find Strategic Prompts for {client.brandName}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Generates candidate evaluation queries across Informational, Commercial, and Comparative buyer intent layers.
            </p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111827] p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {opportunities.length === 0 && !loading && (
            <div className="text-center py-12 space-y-4 border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8">
              <div className="w-10 h-10 bg-[#111827] text-white flex items-center justify-center mx-auto rounded-none">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-bold text-[#111827]">Analyze Domain & Competitors</h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Discover 20 search prompts that B2B buyers ask generative models about {client.brandName} and competitors ({client.competitorBrands.join(', ')}).
                </p>
              </div>
              {error && <div className="text-xs text-[#DC2626] font-mono">{error}</div>}
              <button
                onClick={fetchOpportunities}
                className="px-4 py-2 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate 20 Candidate Prompts
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#111827]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                Synthesizing high-intent B2B search queries...
              </div>
              <p className="text-xs text-[#6B7280] font-mono">
                Matching intent layers against {client.industry} category landscape
              </p>
            </div>
          )}

          {opportunities.length > 0 && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5E7EB]">
                <span className="font-bold text-[#111827]">
                  Discovered {opportunities.length} Candidate Prompts ({selectedIndices.size} selected)
                </span>
                <button
                  onClick={() => {
                    if (selectedIndices.size === opportunities.length) setSelectedIndices(new Set());
                    else setSelectedIndices(new Set(opportunities.map((_, i) => i)));
                  }}
                  className="text-[11px] font-bold uppercase tracking-wider text-[#111827] hover:underline"
                >
                  {selectedIndices.size === opportunities.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {opportunities.map((op, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3 border transition-colors cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'border-[#111827] bg-[#F9FAFB]'
                          : 'border-[#E5E7EB] bg-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 text-[#111827] focus:ring-[#111827]"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-bold text-[#111827]">{op.text}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.2 bg-[#E5E7EB] text-[10px] font-mono uppercase font-bold text-[#374151]">
                            {op.intentLayer}
                          </span>
                          <span className="text-[11px] text-[#6B7280]">{op.category}</span>
                        </div>
                        <p className="text-[11px] text-[#4B5563] mt-1.5 italic font-sans">{op.rationale}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {opportunities.length > 0 && !loading && (
          <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
            <button
              onClick={fetchOpportunities}
              className="text-xs text-[#6B7280] hover:text-[#111827] font-bold uppercase tracking-wider"
            >
              Re-generate
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 border border-[#D1D5DB] hover:bg-[#F3F4F6] text-xs font-bold uppercase tracking-wider text-[#374151]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={selectedIndices.size === 0}
                className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white disabled:bg-[#D1D5DB] text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {selectedIndices.size} Prompts to Tracking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
