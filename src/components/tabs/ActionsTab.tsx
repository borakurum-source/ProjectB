import { useState, FormEvent } from 'react';
import { ActionItem, Client, ActionStatus, Prompt } from '../../types';
import { BeforeAfterDiffChart } from '../charts/BeforeAfterDiffChart';
import { Plus, Play, XCircle } from 'lucide-react';

interface ActionsTabProps {
  actions: ActionItem[];
  client: Client;
  prompts: Prompt[];
  onUpdateActionStatus: (actionId: string, status: ActionStatus) => void;
  onRetestAction: (action: ActionItem) => void;
  onCreateAction: (action: Omit<ActionItem, 'id' | 'createdAt'>) => void;
  isRetestingActionId?: string | null;
}

export function ActionsTab({
  actions,
  client,
  prompts,
  onUpdateActionStatus,
  onRetestAction,
  onCreateAction,
  isRetestingActionId,
}: ActionsTabProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New action form state
  const [newTitle, setNewTitle] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newExactRec, setNewExactRec] = useState('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newEffort, setNewEffort] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [selectedPromptId, setSelectedPromptId] = useState<string>(prompts[0]?.id || '');

  const filteredActions = actions.filter((a) => {
    if (selectedStatus === 'ALL') return true;
    return a.status === selectedStatus;
  });

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newExactRec.trim()) return;

    onCreateAction({
      ownerId: client.ownerId,
      clientId: client.id,
      promptIds: selectedPromptId ? [selectedPromptId] : [],
      title: newTitle.trim(),
      why: newWhy.trim() || 'Observed grounding gap in model answers',
      evidence: {
        observedFact: 'Identified during GEO audit',
      },
      exactRecommendation: newExactRec.trim(),
      priority: newPriority,
      impact: 'High',
      effort: newEffort,
      validation: 'Execute retest cycle and verify brand mention & citation rates',
      status: 'Todo',
    });

    setNewTitle('');
    setNewWhy('');
    setNewExactRec('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              Implementable Action Items & Retest Verification
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Strict loop: Diagnose gap → Implement concrete changes → Retest identical prompts → Verify Before/After diff.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold uppercase tracking-wider text-[#374151]"
            >
              <option value="ALL">All Statuses ({actions.length})</option>
              <option value="Todo">Todo ({actions.filter((a) => a.status === 'Todo').length})</option>
              <option value="In Progress">In Progress ({actions.filter((a) => a.status === 'In Progress').length})</option>
              <option value="Implemented">Implemented ({actions.filter((a) => a.status === 'Implemented').length})</option>
              <option value="Retested">Retested / Verified ({actions.filter((a) => a.status === 'Retested').length})</option>
            </select>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Action
            </button>
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] p-12 text-center text-[#6B7280] text-xs">
            No actions match the selected filter.
          </div>
        ) : (
          filteredActions.map((action) => {
            const isRetesting = isRetestingActionId === action.id;
            const isRetested = action.status === 'Retested';

            return (
              <div
                key={action.id}
                className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4"
              >
                {/* Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F3F4F6] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          action.status === 'Retested'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : action.status === 'Implemented'
                            ? 'bg-[#111827] text-white border-[#111827]'
                            : action.status === 'In Progress'
                            ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                            : 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                        }`}
                      >
                        {action.status}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          action.priority === 'Critical'
                            ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                            : action.priority === 'High'
                            ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                            : 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                        }`}
                      >
                        {action.priority} Priority
                      </span>

                      <h3 className="text-sm font-bold text-[#111827]">{action.title}</h3>
                    </div>

                    <div className="text-xs text-[#6B7280] flex items-center gap-3">
                      <span>Effort: <strong className="text-[#111827] font-semibold">{action.effort}</strong></span>
                      <span>•</span>
                      <span>Target Prompts: <strong className="text-[#111827] font-mono font-semibold">{action.promptIds.join(', ') || 'Global'}</strong></span>
                      {action.pageUrl && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">URL: {action.pageUrl}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Workflow Status Controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={action.status}
                      onChange={(e) => onUpdateActionStatus(action.id, e.target.value as ActionStatus)}
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#D1D5DB] bg-[#F9FAFB] text-[#111827] rounded shadow-xs"
                    >
                      <option value="Todo">Mark: Todo</option>
                      <option value="In Progress">Mark: In Progress</option>
                      <option value="Implemented">Mark: Implemented</option>
                      <option value="Retested">Mark: Retested</option>
                    </select>

                    {/* Retest Trigger Button */}
                    {action.status === 'Implemented' && (
                      <button
                        onClick={() => onRetestAction(action)}
                        disabled={isRetesting}
                        className="px-3.5 py-1.5 bg-[#065F46] hover:bg-[#047857] disabled:bg-[#D1D5DB] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        {isRetesting ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Retesting...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" /> Retest Visibility Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Recommendation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                      Observed Gap & Root Cause
                    </div>
                    <p className="text-[#374151]">{action.why}</p>
                    {action.evidence?.observedFact && (
                      <div className="mt-2 text-[11px] text-[#111827] font-mono bg-white p-2 border border-[#E5E7EB]">
                        {action.evidence.observedFact}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#111827] mb-1">
                      Exact Implementation Directive
                    </div>
                    <p className="text-[#111827] font-semibold">{action.exactRecommendation}</p>
                    <div className="mt-2 text-[11px] text-[#6B7280]">
                      <strong>Validation:</strong> {action.validation}
                    </div>
                  </div>
                </div>

                {/* Fixed Chart 4: Before / After Diff Comparison (Shown when action is Retested) */}
                {isRetested && (
                  <BeforeAfterDiffChart action={action} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Action Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">Create Action Item</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Action Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Add Kubernetes Comparison Table with OpenTelemetry support"
                  className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Observed Gap / Why</label>
                <textarea
                  rows={2}
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                  placeholder="e.g. Competitors are cited because their landing pages contain clear structured comparison tables."
                  className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Exact Recommendation</label>
                <textarea
                  required
                  rows={3}
                  value={newExactRec}
                  onChange={(e) => setNewExactRec(e.target.value)}
                  placeholder="e.g. Implement an HTML <table> on /kubernetes-monitoring comparing Datadog, Dynatrace, and Acme Analytics."
                  className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#111827] focus:bg-white focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Target Prompt</label>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-[#111827]"
                  >
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-[#111827]"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1">Effort</label>
                  <select
                    value={newEffort}
                    onChange={(e) => setNewEffort(e.target.value as any)}
                    className="w-full p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-semibold text-[#111827]"
                  >
                    <option value="Low">Low (&lt; 1 day)</option>
                    <option value="Medium">Medium (1-3 days)</option>
                    <option value="High">High (&gt; 1 week)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] rounded text-xs font-bold uppercase tracking-wider text-[#374151] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Create Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
