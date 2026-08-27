import React, { useState } from 'react';
import { ExternalLink, BookOpen, Layers, Cpu, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, User, Globe, ArrowUpRight } from 'lucide-react';

interface AboutRagSignalSectionProps {
  initialOpen?: boolean;
}

export const AboutRagSignalSection: React.FC<AboutRagSignalSectionProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <section 
      aria-label="About RAG Signal and Adaptive RAG Methodology" 
      className="w-full max-w-3xl mt-6 border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 sm:p-6 transition-all shadow-xs"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-[#D33A2C]/10 dark:bg-[#D33A2C]/20 border border-[#D33A2C]/30 flex items-center justify-center text-[#D33A2C] font-black text-xs">
            RS
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              About RAG Signal &amp; Adaptive RAG
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              "We don't do visibility. We do retrieval." — Open-source Citation Engineering
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>{isOpen ? 'Collapse Details' : 'Read Methodology'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-6 text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
          
          {/* Main Statement */}
          <div className="p-4 bg-[#F8FAFC] dark:bg-[#090D16] border-l-2 border-[#D33A2C]">
            <p className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] italic">
              "Most agencies sell promises. We published the methodology. The Adaptive RAG whitepaper is open source — because the math speaks for itself. Multi-source weighting, temporal freshness scoring, hybrid ranking."
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              <span>— <strong>Bora Kurum</strong>, Founder &amp; Author</span>
              <a 
                href="https://ragsignal.com/about/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#D33A2C] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                Official About Page <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Why RAG & Why Signal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1120]">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider text-[#D33A2C]">
                <Cpu className="w-3.5 h-3.5 text-[#D33A2C]" /> Why RAG? (Retrieval-Augmented Generation)
              </h3>
              <p className="text-[#64748B] dark:text-[#94A3B8]">
                Retrieval-Augmented Generation is the technical mechanism that powers AI answers. When a user asks a question, the model doesn't just guess — it retrieves relevant knowledge, then generates a response. If your brand isn't in that retrieved set, it cannot appear in the answer. We work directly in the <strong>retrieval layer</strong>.
              </p>
            </div>

            <div className="p-4 border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1120]">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider text-[#D33A2C]">
                <Layers className="w-3.5 h-3.5 text-[#D33A2C]" /> Why Signal?
              </h3>
              <p className="text-[#64748B] dark:text-[#94A3B8]">
                In information theory, a signal is structured data transmitted through a channel, distinct from noise. AI models swim in an ocean of undifferentiated content. A brand that gets cited emits a clear, consistent, machine-readable signal. Our job is to amplify your signal so AI models treat it as ground truth.
              </p>
            </div>
          </div>

          {/* 7-Dimension Signal Scoring Engine */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                The 7-Dimension Signal Scoring Algorithm
              </h3>
              <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">Weights: Total 100%</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">25%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Source Authority</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Publication quality &amp; training citations</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">20%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Factual Consistency</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Corroboration across independent sources</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">15%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Entity Linkage</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Machine-readable named entity structures</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">12%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Cross-Model Persistence</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Consistency across Gemini, Perplexity, Claude</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">12%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Temporal Freshness</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Recency and decay prevention</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">10%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Citation Frequency</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Compounding retrieval likelihood</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div className="text-[#D33A2C] font-mono font-bold text-sm">6%</div>
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-[11px]">Competitive Diff</div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Clear differentiation in prompt landscape</div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#090D16] border border-[#D33A2C]/40 flex flex-col justify-center items-center text-center">
                <span className="text-[#D33A2C] font-bold text-xs uppercase tracking-wider">5-Phase RAG</span>
                <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Map → Build → Weight → Reinforce → Measure</span>
              </div>
            </div>
          </div>

          {/* Founder & Methodology Authority Section */}
          <div className="p-4 bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-xs">Bora Kurum</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#E2E8F0] dark:bg-[#1E293B] font-mono text-[#475569] dark:text-[#CBD5E1]">Founder &amp; Trainer</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Author of 5 published books on Digital Marketing, AI &amp; SEO with 15+ years experience in search &amp; content architecture.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://borakurum.com.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#D33A2C] transition-colors inline-flex items-center gap-1"
              >
                <span>borakurum.com.tr</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
              <a
                href="https://ragsignal.com/whitepaper/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-[11px] font-bold bg-[#D33A2C] text-white hover:bg-[#B92B1E] transition-colors inline-flex items-center gap-1"
              >
                <span>Read Whitepaper</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Deep Navigation Backlinks */}
          <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">Explore ragsignal.com:</span>
            <div className="flex flex-wrap items-center gap-3">
              <a href="https://ragsignal.com/methodology/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D33A2C] transition-colors">Methodology</a>
              <span>•</span>
              <a href="https://ragsignal.com/pricing/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D33A2C] transition-colors">AI Presence Audit</a>
              <span>•</span>
              <a href="https://ragsignal.com/results/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D33A2C] transition-colors">Results</a>
              <span>•</span>
              <a href="https://ragsignal.com/about/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D33A2C] transition-colors">About</a>
              <span>•</span>
              <a href="https://ragsignal.com/contact/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D33A2C] transition-colors">Contact</a>
            </div>
          </div>

        </div>
      )}
    </section>
  );
};
