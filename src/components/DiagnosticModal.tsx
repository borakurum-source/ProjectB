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
    <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] text-white">
                6-Dimension GEO Diagnostic
              </span>
              <span className="text-xs text-[#6B7280] font-mono">Methodological Non-Speculative Diagnosis</span>
            </div>
            <h2 className="text-sm font-bold text-[#111827]">{prompt.text}</h2>
            <div className="text-xs text-[#6B7280] mt-0.5">
              Client: <strong>{client.brandName}</strong> ({client.domain}) • Intent: {prompt.intentLayer}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#111827] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827]">Evaluating 6 Observable Dimensions...</div>
              <div className="text-xs text-[#6B7280] max-w-md mx-auto">
                Synthesizing observed groundings, cited sources, entity clarity, and extracting implementable actions.
              </div>
            </div>
          ) : !diagnostic ? (
            <div className="py-12 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-[#9CA3AF] mx-auto" />
              <div className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                No diagnostic generated for this prompt yet.
              </div>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Generate an evidence-backed evaluation across Intent Match, Entity Clarity, Answer Extractability, Content Coverage, Evidence/Authority, and Structured Information.
              </p>
              <button
                onClick={onGenerate}
                className="px-4 py-2 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Run 6-Dimension Diagnostic Now
              </button>
            </div>
          ) : (
            <>
              {/* Methodological Evidence & Gap Synthesis Banner */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                    Observed Evidence (Factual Synthesis)
                  </div>
                  <p className="text-xs text-[#111827] leading-relaxed font-mono bg-white p-2.5 border border-[#E5E7EB]">
                    {diagnostic.observedEvidence}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                      Likely Gap
                    </div>
                    <p className="text-xs text-[#111827] bg-white p-2.5 border border-[#E5E7EB]">
                      {diagnostic.likelyGap}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                        Confidence & Validation
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          diagnostic.confidence === 'High'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                        }`}
                      >
                        {diagnostic.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs text-[#111827] bg-white p-2.5 border border-[#E5E7EB]">
                      <strong>Validation:</strong> {diagnostic.validationMethod}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6 Dimensions Grid */}
              <div>
                <h3 className="text-xs font-bold text-[#111827] uppercase tracking-widest mb-3">
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
                        className={`p-3.5 border ${style.border} ${style.bg} transition-all`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-[#111827]">{dim}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${style.border} bg-white ${style.text}`}
                          >
                            {evalData.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#374151] leading-relaxed">{evalData.explanation}</p>
                        {evalData.evidenceQuote && (
                          <div className="mt-2 text-[11px] text-[#4B5563] bg-white/80 p-2 border border-[#E5E7EB] italic">
                            "{evalData.evidenceQuote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Action Box */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#111827]" />
                    <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
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
                          : 'bg-[#111827] hover:bg-black text-white'
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
                <p className="text-xs text-[#111827] font-semibold leading-relaxed">
                  {diagnostic.recommendedActionSummary}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <div className="text-xs text-[#6B7280] font-mono">
            {diagnostic?.createdAt ? `Evaluated on ${new Date(diagnostic.createdAt).toLocaleString()}` : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}
