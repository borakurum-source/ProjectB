import { useState, FormEvent } from 'react';
import { ActionItem, Client, ActionStatus, Prompt } from '../../types';
import { BeforeAfterDiffChart } from '../charts/BeforeAfterDiffChart';
import { Plus, Play, XCircle, RotateCw, CheckCircle2, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

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
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'Ticimax' | 'Shopify' | 'WooCommerce' | 'Custom'>('Ticimax');

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
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              Implementable Action Items & Retest Verification
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Strict loop: Diagnose gap → Implement concrete changes → Retest identical prompts → Verify Before/After diff.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1]"
            >
              <option value="ALL">All Statuses ({actions.length})</option>
              <option value="Todo">Todo ({actions.filter((a) => a.status === 'Todo').length})</option>
              <option value="In Progress">In Progress ({actions.filter((a) => a.status === 'In Progress').length})</option>
              <option value="Implemented">Implemented ({actions.filter((a) => a.status === 'Implemented').length})</option>
              <option value="Retested">Retested / Verified ({actions.filter((a) => a.status === 'Retested').length})</option>
            </select>

            <button
              onClick={() => setShowPlaybookModal(true)}
              className="px-3.5 py-2 sm:py-1.5 bg-[#EEF2FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#E0E7FF] border border-[#C7D2FE] dark:border-[#4338CA] hover:bg-[#E0E7FF] dark:hover:bg-[#3730A3] rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5" /> Platform Playbook
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 sm:py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Action
            </button>
          </div>
        </div>

        {/* Retest Pipeline Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#F3F4F6] dark:border-[#1E293B] text-xs">
          <div className="p-2.5 bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xs border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-[#94A3B8]">Total Actions</div>
            <div className="text-lg font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">{actions.length}</div>
          </div>
          <div className="p-2.5 bg-[#FEF3C7]/40 dark:bg-[#78350F]/20 rounded-xs border border-[#FDE68A] dark:border-[#B45309]">
            <div className="text-[10px] uppercase font-bold text-[#92400E] dark:text-[#FDE68A]">In Progress</div>
            <div className="text-lg font-bold font-mono text-[#92400E] dark:text-[#FDE68A]">
              {actions.filter((a) => a.status === 'In Progress').length}
            </div>
          </div>
          <div className="p-2.5 bg-[#EEF2FF] dark:bg-[#1E1B4B]/40 rounded-xs border border-[#C7D2FE] dark:border-[#3730A3]">
            <div className="text-[10px] uppercase font-bold text-[#4338CA] dark:text-[#A5B4FC]">Ready for Retest</div>
            <div className="text-lg font-bold font-mono text-[#4338CA] dark:text-[#A5B4FC]">
              {actions.filter((a) => a.status === 'Implemented').length}
            </div>
          </div>
          <div className="p-2.5 bg-[#ECFDF5] dark:bg-[#064E3B]/30 rounded-xs border border-[#A7F3D0] dark:border-[#065F46]">
            <div className="text-[10px] uppercase font-bold text-[#065F46] dark:text-[#A7F3D0]">Verified / Retested</div>
            <div className="text-lg font-bold font-mono text-[#065F46] dark:text-[#A7F3D0]">
              {actions.filter((a) => a.status === 'Retested').length}
            </div>
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-12 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
            No actions match the selected filter.
          </div>
        ) : (
          filteredActions.map((action) => {
            const isRetesting = isRetestingActionId === action.id;
            const isRetested = action.status === 'Retested';

            return (
              <div
                key={action.id}
                className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4"
              >
                {/* Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F3F4F6] dark:border-[#1E293B] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          action.status === 'Retested'
                            ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                            : action.status === 'Implemented'
                            ? 'bg-[#111827] dark:bg-[#312E81] text-white border-[#111827] dark:border-[#4338CA]'
                            : action.status === 'In Progress'
                            ? 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#B45309]'
                            : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]'
                        }`}
                      >
                        {action.status}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          action.priority === 'Critical'
                            ? 'bg-[#FEF2F2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#991B1B]'
                            : action.priority === 'High'
                            ? 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#B45309]'
                            : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]'
                        }`}
                      >
                        {action.priority} Priority
                      </span>

                      <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">{action.title}</h3>
                    </div>

                    <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-3">
                      <span>Effort: <strong className="text-[#111827] dark:text-[#F8FAFC] font-semibold">{action.effort}</strong></span>
                      <span>•</span>
                      <span>Target Prompts: <strong className="text-[#111827] dark:text-[#F8FAFC] font-mono font-semibold">{action.promptIds.join(', ') || 'Global'}</strong></span>
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
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] rounded shadow-xs"
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
                        className="px-3.5 py-1.5 bg-[#065F46] dark:bg-[#059669] hover:bg-[#047857] dark:hover:bg-[#10B981] disabled:bg-[#D1D5DB] dark:disabled:bg-[#334155] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
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
                  <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1">
                      Observed Gap & Root Cause
                    </div>
                    <p className="text-[#374151] dark:text-[#CBD5E1]">{action.why}</p>
                    {action.evidence?.observedFact && (
                      <div className="mt-2 text-[11px] text-[#111827] dark:text-[#F8FAFC] font-mono bg-white dark:bg-[#0F172A] p-2 border border-[#E5E7EB] dark:border-[#334155]">
                        {action.evidence.observedFact}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] mb-1">
                      Exact Implementation Directive
                    </div>
                    <p className="text-[#111827] dark:text-[#F8FAFC] font-semibold">{action.exactRecommendation}</p>
                    <div className="mt-2 text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
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
        <div className="fixed inset-0 z-50 bg-[#111827]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-lg overflow-hidden shadow-2xl rounded-lg">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">Create Action Item</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Action Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Add Kubernetes Comparison Table with OpenTelemetry support"
                  className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Observed Gap / Why</label>
                <textarea
                  rows={2}
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                  placeholder="e.g. Competitors are cited because their landing pages contain clear structured comparison tables."
                  className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Exact Recommendation</label>
                <textarea
                  required
                  rows={3}
                  value={newExactRec}
                  onChange={(e) => setNewExactRec(e.target.value)}
                  placeholder="e.g. Implement an HTML <table> on /kubernetes-monitoring comparing Datadog, Dynatrace, and Acme Analytics."
                  className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Target Prompt</label>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]"
                  >
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">Effort</label>
                  <select
                    value={newEffort}
                    onChange={(e) => setNewEffort(e.target.value as any)}
                    className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]"
                  >
                    <option value="Low">Low (&lt; 1 day)</option>
                    <option value="Medium">Medium (1-3 days)</option>
                    <option value="High">High (&gt; 1 week)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] rounded text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs"
                >
                  Create Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform AEO Foundation Playbook Modal */}
      {showPlaybookModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-xl overflow-hidden shadow-2xl rounded-lg">
            <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4338CA] dark:text-[#A5B4FC]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                  AEO / GEO Platform Foundation Playbook
                </h3>
              </div>
              <button
                onClick={() => setShowPlaybookModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                Select your e-commerce or website platform infrastructure to automatically import tailored, 4-stage foundational AEO/GEO action items into your actionable queue.
              </p>

              {/* Platform Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Ticimax', 'Shopify', 'WooCommerce', 'Custom'] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatform(plat)}
                    className={`p-3 border text-xs font-bold uppercase tracking-wider rounded text-center transition-all ${
                      selectedPlatform === plat
                        ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA] shadow-xs'
                        : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F3F4F6] dark:hover:bg-[#334155]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {/* Playbook Items Preview */}
              <div className="p-4 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs space-y-3">
                <div className="font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center justify-between">
                  <span>{selectedPlatform} First-Wave Optimization Actions (4 Items):</span>
                  <span className="text-[10px] font-mono text-[#4338CA] dark:text-[#A5B4FC] bg-[#EEF2FF] dark:bg-[#312E81] px-2 py-0.5 rounded">
                    Ready to Import
                  </span>
                </div>

                <ul className="space-y-2 text-[11px] text-[#374151] dark:text-[#CBD5E1] list-disc pl-4">
                  {selectedPlatform === 'Ticimax' && (
                    <>
                      <li><strong>[Bot Check & Robots.txt]</strong> Add explicit Allow rules for Google-Extended & GPTBot + append Sitemap URL in Ticimax SEO panel.</li>
                      <li><strong>[Schema & Entity Clarity]</strong> Inject LocalBusiness / FoodEstablishment JSON-LD via Ticimax Head Scripts.</li>
                      <li><strong>[Answer Extractability]</strong> Add SSS / FAQ HTML blocks to key category pages (Evde Catering, Party Snacks).</li>
                      <li><strong>[Entity Positioning]</strong> Optimize product titles & category descriptions with brand context.</li>
                    </>
                  )}
                  {selectedPlatform === 'Shopify' && (
                    <>
                      <li><strong>[Bot Check & Robots.txt]</strong> Update liquid theme or Robots.txt.liquid to allow Google-Extended / GPTBot crawling.</li>
                      <li><strong>[Schema & Entity]</strong> Add Organization & LocalBusiness JSON-LD snippet via Liquid theme code.</li>
                      <li><strong>[Extractability]</strong> Add Metafields for FAQ schema & tabular specs on Collection pages.</li>
                      <li><strong>[Retest Verification]</strong> Trigger 12-run cycle to measure citation rate improvement.</li>
                    </>
                  )}
                  {selectedPlatform === 'WooCommerce' && (
                    <>
                      <li><strong>[Bot Check]</strong> Configure Yoast/RankMath Robots.txt settings to explicitly allow AI crawlers.</li>
                      <li><strong>[Schema.org]</strong> Deploy JSON-LD Schema markup for LocalBusiness & Products.</li>
                      <li><strong>[Extractability]</strong> Insert FAQ blocks and comparison HTML tables into category descriptions.</li>
                      <li><strong>[Retest Verification]</strong> Verify brand mention rate across prompt suite.</li>
                    </>
                  )}
                  {selectedPlatform === 'Custom' && (
                    <>
                      <li><strong>[Robots & WAF]</strong> Ensure Cloudflare/WAF permits Google-Extended and GPTBot user agents.</li>
                      <li><strong>[Entity Schema]</strong> Deploy Next.js/React Head JSON-LD for Organization and Product schemas.</li>
                      <li><strong>[Structured Tables]</strong> Render HTML comparison tables in page SSR output.</li>
                      <li><strong>[Retest Loop]</strong> Execute retest cycle on RAG Signal to measure Before/After diff.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlaybookModal(false)}
                  className="px-3.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] rounded text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Generate 4 platform actions
                    const targetPromptId = prompts[0]?.id || '';
                    const platformItems = [
                      {
                        title: `[${selectedPlatform}] Configure AI Bot Allow Rules & Sitemap in Robots.txt`,
                        why: `Ensure Gemini (Google-Extended), GPTBot, and PerplexityBot are explicitly permitted in ${selectedPlatform} SEO settings, and that Sitemap is declared.`,
                        exactRecommendation: `Go to ${selectedPlatform} Admin -> SEO Settings -> Robots.txt. Add User-agent: Google-Extended Allow: / and append Sitemap: https://${client.domain || 'domain.com'}/sitemap.xml.`,
                        priority: 'Critical' as const,
                        effort: 'Low' as const,
                      },
                      {
                        title: `[${selectedPlatform}] Inject LocalBusiness & Entity Schema.org JSON-LD`,
                        why: `Model answers require explicit entity definitions to associate ${client.brandName} with local service offerings and area coverage.`,
                        exactRecommendation: `In ${selectedPlatform} Head Scripts / Liquid theme, insert JSON-LD <script type="application/ld+json"> with LocalBusiness, areaServed, and sameAs links.`,
                        priority: 'High' as const,
                        effort: 'Low' as const,
                      },
                      {
                        title: `[${selectedPlatform}] Add Answer Extractability FAQ & Comparison Tables`,
                        why: `LLM generative models prioritize structured HTML tables and SSS (FAQ) blocks over plain product grids when recommending providers.`,
                        exactRecommendation: `On main collection/category pages in ${selectedPlatform}, add HTML FAQ blocks covering lead times, minimum orders, and package details.`,
                        priority: 'High' as const,
                        effort: 'Medium' as const,
                      },
                      {
                        title: `[${selectedPlatform}] Retest & Verify Before/After Visibility Diff`,
                        why: `Validate if the foundation optimizations resulted in increased Mention Rate and Citation Rate across active prompt suite.`,
                        exactRecommendation: `Run a new 12-run cycle on RAG Signal and compare Before/After metrics on the Actions tab.`,
                        priority: 'Medium' as const,
                        effort: 'Low' as const,
                      },
                    ];

                    platformItems.forEach((item) => {
                      onCreateAction({
                        ownerId: client.ownerId,
                        clientId: client.id,
                        promptIds: targetPromptId ? [targetPromptId] : [],
                        title: item.title,
                        why: item.why,
                        evidence: {
                          observedFact: `${selectedPlatform} AEO Foundation Audit for ${client.brandName}`,
                        },
                        exactRecommendation: item.exactRecommendation,
                        priority: item.priority,
                        impact: 'High',
                        effort: item.effort,
                        validation: 'Execute retest cycle and verify brand mention & citation rates',
                        status: 'Todo',
                      });
                    });

                    setShowPlaybookModal(false);
                  }}
                  className="px-4 py-1.5 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> Import 4 {selectedPlatform} Actions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
