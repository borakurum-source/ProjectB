import Markdown from 'react-markdown';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export function FormattedMarkdown({ content, className = '' }: FormattedMarkdownProps) {
  if (!content) {
    return <span className="text-[#9CA3AF] dark:text-[#64748B] italic">No content.</span>;
  }

  return (
    <div className={`formatted-markdown text-sm leading-relaxed text-[#1F2937] dark:text-[#F3F4F6] ${className}`}>
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-[#111827] dark:text-white mt-4 mb-2 first:mt-0 tracking-tight border-b border-[#E5E7EB] dark:border-[#334155] pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] mt-3.5 mb-1.5 first:mt-0 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider mt-3 mb-1 first:mt-0 text-[#1F2937] dark:text-[#E2E8F0]">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mt-2 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 text-xs sm:text-[13px] leading-relaxed text-[#374151] dark:text-[#CBD5E1]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-xs sm:text-[13px] text-[#374151] dark:text-[#CBD5E1]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-xs sm:text-[13px] text-[#374151] dark:text-[#CBD5E1]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 text-[#374151] dark:text-[#CBD5E1]">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[#111827] dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#4B5563] dark:text-[#E2E8F0]">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#111827] dark:border-[#6366F1] pl-3 my-2 text-xs italic text-[#4B5563] dark:text-[#94A3B8] bg-[#F9FAFB] dark:bg-[#1E293B] py-1">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[11px] bg-[#F3F4F6] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#334155]">
              {children}
            </code>
          ),
          hr: () => (
            <hr className="my-3 border-[#E5E7EB] dark:border-[#334155]" />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
