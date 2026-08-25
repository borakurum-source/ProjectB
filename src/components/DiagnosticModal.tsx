import { useState } from 'react';
import { Prompt, Diagnostic, ActionItem, Client, DiagnosisDimension, DiagnosisStatus } from '../types';
import { X, Sparkles, ShieldAlert, Check } from 'lucide-react';

interface DiagnosticModalProps {
  prompt: Prompt;
  diagnostic: Diagnostic | null;
  client: Client;
  isLoading: boolean;
  onGenerate: () => void;
  onSaveAction?: (action: ActionItem) => void;
  onClose: () => void;
}

const DIMENSIONS: DiagnosisDimension[] = [
  'Intent Match',
  'Entity Clarity',
  'Answer Extractability',
  'Content Coverage',
  'Evidence / Authority',
  'Structured Information',
];

const STATUS_CONFIG: Record<DiagnosisStatus, { bg: string; text: string; border: string }> = {
  Strong: { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' },
  Adequate: { bg: 'bg-[#F3F4F6]', text: 'text-[#111827]', border: 'border-[#D1D5DB]' },
  Weak: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#FDE68A]' },
  Missing: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', border: 'border-[#FECACA]' },
  Unknown: { bg: 'bg-[#F9FAFB]', text: 'text-[#6B7280]', border: 'border-[#E5E7EB]' },
};

export function DiagnosticModal({
  prompt,
  diagnostic,
  client,
  isLoading,
  onGenerate,
  onSaveAction,
  onClose,
}: DiagnosticModalProps) {
  const [actionAdded, setActionAdded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] dark:bg-[#6366F1] text-white">
                6-Dimension GEO Diagnostic
              </span>
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">Methodological Non-Speculative Diagnosis</span>
            </div>
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">{prompt.text}</h2>
            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Client: <strong>{client.brandName}</strong> ({client.domain}) • Intent: {prompt.intentLayer}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC] p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#111827] dark:border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">Evaluating 6 Observable Dimensions...</div>
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-md mx-auto">
                Synthesizing observed groundings, cited sources, entity clarity, and extracting implementable actions.
              </div>
            </div>
          ) : !diagnostic ? (
            <div className="py-12 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-[#9CA3AF] dark:text-[#64748B] mx-auto" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
                No diagnostic generated for this prompt yet.
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-md mx-auto">
                Generate an evidence-backed evaluation across Intent Match, Entity Clarity, Answer Extractability, Content Coverage, Evidence/Authority, and Structured Information.
              </p>
              <button
                onClick={onGenerate}
                className="px-4 py-2 bg-[#111827] dark:bg-[#6366F1] hover:bg-black dark:hover:bg-[#4F46E5] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Run 6-Dimension Diagnostic Now
              </button>
            </div>
          ) : (
            <>
              {/* Methodological Evidence & Gap Synthesis Banner */}
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                    Observed Evidence (Factual Synthesis)
                  </div>
                  <p className="text-xs text-[#111827] dark:text-[#F8FAFC] leading-relaxed font-mono bg-white dark:bg-[#0F172A] p-2.5 border border-[#E5E7EB] dark:border-[#334155]">
                    {diagnostic.observedEvidence}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                      Likely Gap
                    </div>
                    <p className="text-xs text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] p-2.5 border border-[#E5E7EB] dark:border-[#334155]">
                      {diagnostic.likelyGap}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                        Confidence & Validation
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          diagnostic.confidence === 'High'
                            ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                            : 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#78350F]'
                        }`}
                      >
                        {diagnostic.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] p-2.5 border border-[#E5E7EB] dark:border-[#334155]">
                      <strong>Validation:</strong> {diagnostic.validationMethod}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6 Dimensions Grid */}
              <div>
                <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-widest mb-3">
                  Evaluation Across Exactly 6 Dimensions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DIMENSIONS.map((dim) => {
                    const evalData = diagnostic.dimensions?.[dim] || {
                      status: 'Unknown',
                      explanation: 'No dimension data available.',
                    };
                    const style = STATUS_CONFIG[evalData.status] || STATUS_CONFIG.Unknown;

                    return (
                      <div
                        key={dim}
                        className={`p-3.5 border ${style.border} ${style.bg} dark:bg-[#1E293B] dark:border-[#334155] transition-all`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">{dim}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${style.border} bg-white dark:bg-[#0F172A] ${style.text} dark:text-[#CBD5E1]`}
                          >
                            {evalData.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#374151] dark:text-[#CBD5E1] leading-relaxed">{evalData.explanation}</p>
                        {evalData.evidenceQuote && (
                          <div className="mt-2 text-[11px] text-[#4B5563] dark:text-[#94A3B8] bg-white/80 dark:bg-[#0F172A] p-2 border border-[#E5E7EB] dark:border-[#334155] italic">
                            "{evalData.evidenceQuote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Action Box */}
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" />
                    <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                      Recommended Implementable Action
                    </h3>
                  </div>
                  {onSaveAction && (
                    <button
                      onClick={() => {
                        onSaveAction({
                          id: `action-${Date.now()}`,
                          ownerId: client.ownerId,
                          clientId: client.id,
                          diagnosticId: diagnostic.id,
                          promptIds: [prompt.id],
                          title: `Optimize content for: "${prompt.text}"`,
                          why: diagnostic.likelyGap,
                          evidence: {
                            observedFact: diagnostic.observedEvidence,
                          },
                          exactRecommendation: diagnostic.recommendedActionSummary,
                          priority: 'High',
                          impact: 'High',
                          effort: 'Medium',
                          validation: diagnostic.validationMethod,
                          status: 'Todo',
                          createdAt: new Date().toISOString(),
                        });
                        setActionAdded(true);
                      }}
                      disabled={actionAdded}
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5 shadow-xs ${
                        actionAdded
                          ? 'bg-[#065F46] text-white'
                          : 'bg-[#111827] dark:bg-[#6366F1] hover:bg-black dark:hover:bg-[#4F46E5] text-white'
                      }`}
                    >
                      {actionAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added to Actions
                        </>
                      ) : (
                        <>Add to Actions Tracker</>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#111827] dark:text-[#F8FAFC] font-semibold leading-relaxed">
                  {diagnostic.recommendedActionSummary}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
            {diagnostic?.createdAt ? `Evaluated on ${new Date(diagnostic.createdAt).toLocaleString()}` : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111827] dark:bg-[#6366F1] hover:bg-black dark:hover:bg-[#4F46E5] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}
