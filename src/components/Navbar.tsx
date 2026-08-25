import { useState } from 'react';
import { Client, EngineId } from '../types';
import { Logo } from './Logo';
import {
  Plus,
  Play,
  ChevronDown,
  Check,
  Menu,
  X,
  LayoutDashboard,
  MessageSquareQuote,
  Users,
  FileSearch,
  CheckSquare,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  clients: Client[];
  activeClient: Client;
  onSelectClient: (client: Client) => void;
  onNewClient: () => void;
  activeTab: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'Actions' | 'Settings';
  onSelectTab: (tab: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'Actions' | 'Settings') => void;
  onOpenRunModal: () => void;
  activeEngine: EngineId;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function Navbar({
  clients,
  activeClient,
  onSelectClient,
  onNewClient,
  activeTab,
  onSelectTab,
  onOpenRunModal,
  activeEngine,
  darkMode = false,
  onToggleDarkMode,
}: NavbarProps) {
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: Array<{
    id: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'Actions' | 'Settings';
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'Overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'Prompts', label: 'Prompts', icon: MessageSquareQuote },
    { id: 'Competitors', label: 'Competitors', icon: Users },
    { id: 'Pages', label: 'Pages', icon: FileSearch },
    { id: 'Actions', label: 'Actions', icon: CheckSquare },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sleek Sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 border-r border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex-col h-screen sticky top-0 z-30 transition-colors">
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-[#F3F4F6] dark:border-[#1E293B] flex items-center justify-between">
          <Logo size="md" />
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 rounded-md text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-3 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] font-semibold'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/50 hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#111827] dark:text-[#F8FAFC]' : 'text-[#9CA3AF] dark:text-[#64748B]'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Active Engine Status & Client info at Sidebar Bottom */}
        <div className="p-5 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#9CA3AF] dark:text-[#64748B] mb-2 font-semibold">
              Active Engine
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-xs font-medium text-[#111827] dark:text-[#F8FAFC]">Gemini Grounded</span>
            </div>
          </div>

          {/* Quick Client Switcher */}
          <div className="relative pt-2 border-t border-[#F3F4F6] dark:border-[#1E293B]">
            <div className="text-[10px] uppercase tracking-widest text-[#9CA3AF] dark:text-[#64748B] mb-1.5 font-semibold">
              Workspace
            </div>
            <button
              onClick={() => setShowClientMenu(!showClientMenu)}
              className="w-full flex items-center justify-between p-2 rounded bg-[#F9FAFB] dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155] text-left transition-colors text-xs"
            >
              <div className="truncate">
                <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] block truncate">
                  {activeClient.brandName}
                </span>
                <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono block truncate">
                  {activeClient.domain}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#94A3B8] shrink-0 ml-1" />
            </button>

            {showClientMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded shadow-lg py-1 z-50 divide-y divide-[#F3F4F6] dark:divide-[#334155]">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                  Select Client Brand
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectClient(c);
                        setShowClientMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] transition-colors"
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5 truncate">
                          {c.brandName}
                          {c.isDemo && (
                            <span className="text-[9px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] px-1 py-0.2 rounded font-bold uppercase">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono truncate">{c.domain}</div>
                      </div>
                      {c.id === activeClient.id && <Check className="w-3.5 h-3.5 text-[#111827] dark:text-[#F8FAFC]" />}
                    </button>
                  ))}
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowClientMenu(false);
                      onNewClient();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] hover:bg-[#F9FAFB] dark:hover:bg-[#334155] rounded flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Client Brand
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-white dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#1E293B] sticky top-0 z-40 px-3.5 py-2.5 shadow-xs transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 text-[#4B5563] dark:text-[#94A3B8] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] rounded border border-[#E5E7EB] dark:border-[#334155] min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            )}
            <button
              onClick={onOpenRunModal}
              className="bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded shadow-xs flex items-center gap-1 min-h-[36px]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#4B5563] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] rounded border border-[#E5E7EB] dark:border-[#334155] min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav & Workspace Switcher */}
        {mobileMenuOpen && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] space-y-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Workspace / Client Selector in Mobile Drawer */}
            <div className="bg-[#F9FAFB] dark:bg-[#1E293B] p-2.5 rounded border border-[#E5E7EB] dark:border-[#334155]">
              <div className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-[#94A3B8] tracking-wider mb-1.5">
                Active Client Workspace
              </div>
              <div className="space-y-1">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectClient(c);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center justify-between transition-colors ${
                      c.id === activeClient.id
                        ? 'bg-white dark:bg-[#0F172A] font-bold text-[#111827] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#334155] shadow-xs'
                        : 'text-[#4B5563] dark:text-[#CBD5E1] hover:bg-white/60 dark:hover:bg-[#0F172A]/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
                        {c.brandName}
                        {c.isDemo && (
                          <span className="text-[8px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] px-1 py-0.2 rounded font-bold uppercase">
                            Demo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono">{c.domain}</div>
                    </div>
                    {c.id === activeClient.id && <Check className="w-3.5 h-3.5 text-[#111827] dark:text-[#F8FAFC] shrink-0" />}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNewClient();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#0F172A] rounded flex items-center gap-1.5 font-medium border border-dashed border-[#D1D5DB] dark:border-[#475569] mt-1.5 justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Client Brand
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-[#94A3B8] tracking-wider px-1 mb-1">
                Navigation
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`text-left px-3 py-2.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        isActive
                          ? 'bg-[#111827] dark:bg-[#4338CA] text-white font-semibold'
                          : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#E5E7EB] dark:border-[#334155]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engine Info */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between px-1 text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
              <span>Engine Status:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#111827] dark:text-[#F8FAFC]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Gemini Grounded
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Quick Navigation Bar (Sticky at Bottom on Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#1E293B] px-1 py-1 flex items-center justify-around shadow-lg safe-area-inset-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center transition-colors min-h-[48px] ${
                isActive ? 'text-[#111827] dark:text-[#F8FAFC]' : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  isActive ? 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC]' : 'text-[#9CA3AF] dark:text-[#64748B]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap ${
                  isActive ? 'font-bold text-[#111827] dark:text-[#F8FAFC]' : 'font-medium text-[#6B7280] dark:text-[#94A3B8]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}


