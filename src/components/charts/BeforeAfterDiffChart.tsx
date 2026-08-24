import { useState } from 'react';
import { ActionItem } from '../../types';
import { Table, BarChart2, TrendingUp } from 'lucide-react';

interface BeforeAfterDiffChartProps {
  action: ActionItem;
}

export function BeforeAfterDiffChart({ action }: BeforeAfterDiffChartProps) {
  const [showTable, setShowTable] = useState(false);

  const baselineMention = action.baselineMentionRate ?? 0;
  const retestMention = action.retestMentionRate ?? 0;
  const baselineCitation = action.baselineCitationRate ?? 0;
  const retestCitation = action.retestCitationRate ?? 0;

  const mentionDiff = Math.round((retestMention - baselineMention) * 100);
  const citationDiff = Math.round((retestCitation - baselineCitation) * 100);

  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-bold text-[#111827] uppercase tracking-wider">
              Before / After Implementation Verification
            </h4>
            <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#059669]" /> Visibility improved after implementation
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Retested on {action.retestDate ? new Date(action.retestDate).toLocaleDateString() : 'recent cycle'} across tracked prompts: {action.promptIds.join(', ')}
          </p>
        </div>
        <button
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] rounded shadow-xs transition-colors"
        >
          {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          {showTable ? 'Paired Bars' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-xs text-left bg-white border border-[#E5E7EB]">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">Metric</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">Baseline Run</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">Retest Run</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            <tr>
              <td className="py-2 px-3 font-medium text-[#111827]">Brand Mention Rate</td>
              <td className="py-2 px-3 font-mono text-[#6B7280]">{Math.round(baselineMention * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46]">{Math.round(retestMention * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46]">+{mentionDiff}% pts</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium text-[#111827]">Domain Citation Rate</td>
              <td className="py-2 px-3 font-mono text-[#6B7280]">{Math.round(baselineCitation * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46]">{Math.round(retestCitation * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46]">+{citationDiff}% pts</td>
            </tr>
            {action.baselinePosition !== undefined && action.retestPosition !== undefined && (
              <tr>
                <td className="py-2 px-3 font-medium text-[#111827]">Rank Position (Ordered Lists)</td>
                <td className="py-2 px-3 font-mono text-[#6B7280]">
                  {action.baselinePosition ? `#${action.baselinePosition}` : 'Unranked'}
                </td>
                <td className="py-2 px-3 font-mono font-semibold text-[#065F46]">
                  {action.retestPosition ? `#${action.retestPosition}` : 'Unranked'}
                </td>
                <td className="py-2 px-3 font-mono text-[#6B7280]">
                  {action.retestPosition ? 'Ranked position captured' : 'N/A'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-[#E5E7EB] p-4">
          {/* Mention Rate Paired Bars */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#111827]">Mention Rate</span>
              <span className="font-mono text-[#065F46] font-semibold">+{mentionDiff}% pts</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#6B7280] mb-0.5">
                  <span>Baseline</span>
                  <span className="font-mono">{Math.round(baselineMention * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 border border-[#E5E7EB] overflow-hidden">
                  <div
                    className="bg-[#9CA3AF] h-full"
                    style={{ width: `${Math.max(2, baselineMention * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#111827] font-medium mb-0.5">
                  <span>Retest</span>
                  <span className="font-mono text-[#065F46] font-semibold">{Math.round(retestMention * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 border border-[#E5E7EB] overflow-hidden">
                  <div
                    className="bg-[#10B981] h-full"
                    style={{ width: `${Math.max(2, retestMention * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Citation Rate Paired Bars */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#111827]">Citation Rate</span>
              <span className="font-mono text-[#065F46] font-semibold">+{citationDiff}% pts</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#6B7280] mb-0.5">
                  <span>Baseline</span>
                  <span className="font-mono">{Math.round(baselineCitation * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 border border-[#E5E7EB] overflow-hidden">
                  <div
                    className="bg-[#9CA3AF] h-full"
                    style={{ width: `${Math.max(2, baselineCitation * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#111827] font-medium mb-0.5">
                  <span>Retest</span>
                  <span className="font-mono text-[#065F46] font-semibold">{Math.round(retestCitation * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] h-3 border border-[#E5E7EB] overflow-hidden">
                  <div
                    className="bg-[#111827] h-full"
                    style={{ width: `${Math.max(2, retestCitation * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
