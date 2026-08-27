interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function Logo({ className = '', size = 'md', showSubtitle = true }: LogoProps) {
  const textSizes = {
    sm: 'text-base tracking-tighter',
    md: 'text-lg sm:text-xl tracking-tighter',
    lg: 'text-2xl sm:text-3xl tracking-tighter',
  };

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <div 
        className={`font-black uppercase leading-none text-[#111827] dark:text-[#F8FAFC] ${textSizes[size]}`}
        style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 900 }}
      >
        RAGSIGNAL
      </div>
      {showSubtitle && (
        <div 
          className="text-[9px] text-[#6B7280] dark:text-[#94A3B8] tracking-wider uppercase mt-1 font-extrabold"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          AEO & GEO Intelligence
        </div>
      )}
    </div>
  );
}
