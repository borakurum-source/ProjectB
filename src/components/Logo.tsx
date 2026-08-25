interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function Logo({ className = '', size = 'md', showSubtitle = true }: LogoProps) {
  const textSizes = {
    sm: 'text-sm tracking-[0.18em]',
    md: 'text-base tracking-[0.2em]',
    lg: 'text-xl tracking-[0.22em]',
  };

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div 
        className={`font-black uppercase leading-none text-[#0F172A] dark:text-[#F8FAFC] ${textSizes[size]}`}
        style={{ fontFamily: "'Syne', 'Space Grotesk', sans-serif" }}
      >
        RAG <span className="text-[#4338CA] dark:text-[#818CF8]">SIGNAL</span>
      </div>
      {showSubtitle && (
        <div className="text-[9px] text-[#64748B] dark:text-[#94A3B8] tracking-[0.22em] uppercase font-mono mt-1 font-bold">
          AEO & GEO Intelligence
        </div>
      )}
    </div>
  );
}
