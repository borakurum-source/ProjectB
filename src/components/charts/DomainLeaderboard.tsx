import { useState } from 'react';
import { Table, BarChart2, Globe, ExternalLink } from 'lucide-react';
import { matchDomain } from '../../utils/metrics';

interface DomainLeaderboardProps {
  leaderboard: { domain: string; count: number; citationRate: number }[];
  totalRuns: number;
  clientDomain: string;
  competitorDomains: string[];
}

export function DomainLeaderboard({
  leaderboard,
  totalRuns,
  clientDomain,
  competitorDomains,
}: DomainLeaderboardProps) {
  const [showTable, setShowTable] = useState(false);

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
        No citation sources recorded across runs.
      </div>
    );
  }

  const maxCount = Math.max(...leaderboard.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              Citation Domain Leaderboard
            </h3>
            <span className="text-[10px] text-[#4B5563] dark:text-[#CBD5E1] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              n={totalRuns} total runs
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Frequency of publisher domains cited by grounding search across all executed runs
          </p>
        </div>
        <button
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
        >
          {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          {showTable ? 'View Bars' : 'Table View'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-12">
                  Rank
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Source Domain
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Category
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-right">
                  Runs Cited
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-right">
                  Citation Frequency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {leaderboard.map((item, idx) => {
                const isClient = matchDomain(item.domain, clientDomain);
                const isCompetitor = competitorDomains.some((cd) => matchDomain(item.domain, cd));
                return (
                  <tr key={item.domain} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/50 transition-colors">
                    <td className="py-2.5 px-3 text-[#9CA3AF] dark:text-[#64748B] font-mono">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#64748B]" />
                        <span>{item.domain}</span>
                        {isClient && (
                          <span className="text-[10px] bg-[#111827] dark:bg-[#6366F1] text-white px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-wider">
                            Client Domain
                          </span>
                        )}
                        {isCompetitor && (
                          <span className="text-[10px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] px-1.5 py-0.5 rounded-[2px] font-bold uppercase tracking-wider">
                            Competitor Domain
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#6B7280] dark:text-[#94A3B8]">
                      {isClient ? 'Owned Domain' : isCompetitor ? 'Competitor Site' : 'Third-Party / Review / Media'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#374151] dark:text-[#CBD5E1]">
                      {item.count} / {totalRuns} runs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#111827] dark:text-[#F8FAFC]">
                      {Math.round(item.citationRate * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leaderboard.map((item, idx) => {
            const isClient = matchDomain(item.domain, clientDomain);
            const isCompetitor = competitorDomains.some((cd) => matchDomain(item.domain, cd));
            const widthPct = Math.max(8, (item.count / maxCount) * 100);

            return (
              <div key={item.domain} className="flex items-center gap-3 text-xs">
                <span className="w-6 text-[#9CA3AF] dark:text-[#64748B] font-mono text-right">#{idx + 1}</span>
                <div className="w-44 truncate flex items-center gap-1.5 font-medium text-[#111827] dark:text-[#F8FAFC]" title={item.domain}>
                  <Globe className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#64748B] shrink-0" />
                  <span className="truncate">{item.domain}</span>
                </div>
                <div className="flex-1 bg-[#F3F4F6] dark:bg-[#1E293B] h-6 relative overflow-hidden flex items-center border border-[#E5E7EB] dark:border-[#334155]">
                  <div
                    className={`h-full transition-all flex items-center justify-end px-2 ${
                      isClient
                        ? 'bg-[#111827] dark:bg-[#6366F1]'
                        : isCompetitor
                        ? 'bg-[#D97706] dark:bg-[#F59E0B]'
                        : 'bg-[#6B7280] dark:bg-[#64748B]'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
                    <span className={`font-mono text-[10px] font-semibold ${widthPct > 35 ? 'text-white' : 'text-[#374151] dark:text-[#E2E8F0]'}`}>
                      {item.count} runs ({Math.round(item.citationRate * 100)}%)
                    </span>
                    {isClient && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-black/40 dark:bg-black/60 px-1 py-0.5">
                        Client
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
