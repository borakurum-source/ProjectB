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
    <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
              Before / After Implementation Verification
            </h4>
            <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-2 py-0.5 font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#059669] dark:text-[#34D399]" /> Visibility improved after implementation
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Retested on {action.retestDate ? new Date(action.retestDate).toLocaleDateString() : 'recent cycle'} across tracked prompts: {action.promptIds.join(', ')}
          </p>
        </div>
        <button
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
        >
          {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          {showTable ? 'Paired Bars' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-xs text-left bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
          <thead>
            <tr className="bg-[#F9FAFB] dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]">
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Metric</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Baseline Run</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Retest Run</th>
              <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
            <tr>
              <td className="py-2 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">Brand Mention Rate</td>
              <td className="py-2 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">{Math.round(baselineMention * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46] dark:text-[#34D399]">{Math.round(retestMention * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46] dark:text-[#34D399]">+{mentionDiff}% pts</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">Domain Citation Rate</td>
              <td className="py-2 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">{Math.round(baselineCitation * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46] dark:text-[#34D399]">{Math.round(retestCitation * 100)}%</td>
              <td className="py-2 px-3 font-mono font-semibold text-[#065F46] dark:text-[#34D399]">+{citationDiff}% pts</td>
            </tr>
            {action.baselinePosition !== undefined && action.retestPosition !== undefined && (
              <tr>
                <td className="py-2 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">Rank Position (Ordered Lists)</td>
                <td className="py-2 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">
                  {action.baselinePosition ? `#${action.baselinePosition}` : 'Unranked'}
                </td>
                <td className="py-2 px-3 font-mono font-semibold text-[#065F46] dark:text-[#34D399]">
                  {action.retestPosition ? `#${action.retestPosition}` : 'Unranked'}
                </td>
                <td className="py-2 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">
                  {action.retestPosition ? 'Ranked position captured' : 'N/A'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4">
          {/* Mention Rate Paired Bars */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">Mention Rate</span>
              <span className="font-mono text-[#065F46] dark:text-[#34D399] font-semibold">+{mentionDiff}% pts</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-0.5">
                  <span>Baseline</span>
                  <span className="font-mono">{Math.round(baselineMention * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] dark:bg-[#1E293B] h-3 border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
                  <div
                    className="bg-[#9CA3AF] dark:bg-[#64748B] h-full"
                    style={{ width: `${Math.max(2, baselineMention * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#111827] dark:text-[#F8FAFC] font-medium mb-0.5">
                  <span>Retest</span>
                  <span className="font-mono text-[#065F46] dark:text-[#34D399] font-semibold">{Math.round(retestMention * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] dark:bg-[#1E293B] h-3 border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
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
              <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">Citation Rate</span>
              <span className="font-mono text-[#065F46] dark:text-[#34D399] font-semibold">+{citationDiff}% pts</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-0.5">
                  <span>Baseline</span>
                  <span className="font-mono">{Math.round(baselineCitation * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] dark:bg-[#1E293B] h-3 border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
                  <div
                    className="bg-[#9CA3AF] dark:bg-[#64748B] h-full"
                    style={{ width: `${Math.max(2, baselineCitation * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#111827] dark:text-[#F8FAFC] font-medium mb-0.5">
                  <span>Retest</span>
                  <span className="font-mono text-[#065F46] dark:text-[#34D399] font-semibold">{Math.round(retestCitation * 100)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] dark:bg-[#1E293B] h-3 border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
                  <div
                    className="bg-[#111827] dark:bg-[#6366F1] h-full"
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

