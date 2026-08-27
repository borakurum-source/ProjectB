import { useState } from 'react';
import { Client, EngineId } from '../types';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
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
  Search,
  Settings,
  Sun,
  Moon,
  LineChart,
  LogOut,
  User as UserIcon,
  Brain,
  Sparkles,
  RefreshCw,
  Cloud,
  Trash2,
  Building2,
  Globe,
  Settings2,
  AlertTriangle,
} from 'lucide-react';

interface NavbarProps {
  clients: Client[];
  activeClient: Client;
  onSelectClient: (client: Client) => void;
  onNewClient: () => void;
  onDeleteClient?: (clientId: string) => void;
  activeTab: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'BrandMemory' | 'AeoStudio' | 'MarketTrends' | 'SearchInsights' | 'Actions' | 'Settings';
  onSelectTab: (tab: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'BrandMemory' | 'AeoStudio' | 'MarketTrends' | 'SearchInsights' | 'Actions' | 'Settings') => void;
  onOpenRunModal: () => void;
  activeEngine: EngineId;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  isOnline?: boolean;
}

export function Navbar({
  clients,
  activeClient,
  onSelectClient,
  onNewClient,
  onDeleteClient,
  activeTab,
  onSelectTab,
  onOpenRunModal,
  activeEngine,
  darkMode = false,
  onToggleDarkMode,
  onManualSync,
  isSyncing = false,
  isOnline = true,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showManageBrandsModal, setShowManageBrandsModal] = useState(false);
  const [confirmDeleteBrand, setConfirmDeleteBrand] = useState<Client | null>(null);


  const tabs: Array<{
    id: 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'BrandMemory' | 'AeoStudio' | 'MarketTrends' | 'SearchInsights' | 'Actions' | 'Settings';
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'Overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'Prompts', label: 'Prompts', icon: MessageSquareQuote },
    { id: 'Competitors', label: 'Competitors', icon: Users },
    { id: 'Pages', label: 'Pages', icon: FileSearch },
    { id: 'BrandMemory', label: 'Brand Memory', icon: Brain },
    { id: 'AeoStudio', label: 'AEO Studio', icon: Sparkles },
    { id: 'MarketTrends', label: 'Market Trends', icon: LineChart },
    { id: 'SearchInsights', label: 'Search Insights', icon: Search },
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
          <div className="flex items-center gap-1">
            {onManualSync && (
              <button
                onClick={onManualSync}
                disabled={isSyncing}
                className={`p-1.5 rounded-md transition-colors ${
                  isSyncing
                    ? 'text-emerald-500 animate-spin'
                    : !isOnline
                    ? 'text-rose-500 opacity-60'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]'
                }`}
                title={isSyncing ? 'Syncing with Cloud SQL & Firestore...' : !isOnline ? 'Offline - Click to Retry' : 'Force Refresh from Cloud'}
              >
                {isSyncing ? <RefreshCw className="w-4 h-4" /> : <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              </button>
            )}
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
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-lg shadow-xl py-1.5 z-50 divide-y divide-[#F3F4F6] dark:divide-[#334155]">
                <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider">
                  <span>Client Workspaces ({clients.length})</span>
                  <button
                    onClick={() => {
                      setShowClientMenu(false);
                      setShowManageBrandsModal(true);
                    }}
                    className="text-[#4338CA] dark:text-[#818CF8] hover:underline flex items-center gap-1 font-semibold normal-case text-xs cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" /> Manage
                  </button>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto divide-y divide-[#F3F4F6]/60 dark:divide-[#334155]/60">
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between px-3 py-2 text-xs hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition-colors ${
                        c.id === activeClient.id ? 'bg-[#EEF2FF]/60 dark:bg-[#312E81]/20' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectClient(c);
                          setShowClientMenu(false);
                        }}
                        className="flex-1 text-left min-w-0 pr-2 cursor-pointer"
                      >
                        <div className="font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5 truncate">
                          <span className="truncate">{c.brandName}</span>
                          {c.isDemo && (
                            <span className="text-[8px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] px-1 py-0.2 rounded font-bold uppercase shrink-0">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono truncate">{c.domain}</div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {c.id === activeClient.id && <Check className="w-3.5 h-3.5 text-[#4338CA] dark:text-[#818CF8]" />}
                        {onDeleteClient && (
                          <button
                            type="button"
                            title={`Delete ${c.brandName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClientMenu(false);
                              setConfirmDeleteBrand(c);
                            }}
                            className="p-1 text-[#9CA3AF] hover:text-[#DC2626] dark:text-[#64748B] dark:hover:text-[#EF4444] rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowClientMenu(false);
                      setShowManageBrandsModal(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#4B5563] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-[#6366F1]" />
                    Manage All Brand Workspaces
                  </button>
                  <button
                    onClick={() => {
                      setShowClientMenu(false);
                      onNewClient();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#111827] dark:text-[#F8FAFC] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] rounded flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                    Add New Client Brand
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Authenticated User Account info & Logout */}
          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B]">
            <div className="flex items-center justify-between bg-[#F8FAFC] dark:bg-[#1E293B] p-2 rounded border border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-[#D33A2C] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="w-3 h-3" />}
                </div>
                <div className="truncate">
                  <span className="text-[11px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] block truncate">
                    {user?.displayName || user?.email || 'Authenticated User'}
                  </span>
                  <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8] block truncate">
                    {user?.isAnonymous ? 'Guest Session' : 'Workspace Member'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 text-[#64748B] hover:text-[#D33A2C] dark:text-[#94A3B8] dark:hover:text-[#D33A2C] transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#1E293B] px-1.5 py-1 flex items-center justify-between overflow-x-auto no-scrollbar shadow-lg safe-area-inset-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`shrink-0 px-2.5 py-1.5 flex flex-col items-center justify-center transition-colors min-h-[44px] rounded-sm ${
                isActive
                  ? 'text-[#111827] dark:text-[#F8FAFC]'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <div
                className={`p-1 rounded transition-colors ${
                  isActive ? 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4338CA] dark:text-[#818CF8]' : 'text-[#9CA3AF] dark:text-[#64748B]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[9.5px] tracking-tight mt-0.5 whitespace-nowrap ${
                  isActive ? 'font-bold text-[#111827] dark:text-[#F8FAFC]' : 'font-medium text-[#6B7280] dark:text-[#94A3B8]'
                }`}
              >
                {tab.id === 'SearchInsights' ? 'Insights' : tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Manage Brands Modal */}
      {showManageBrandsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#1E293B] pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#EEF2FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#818CF8] rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#111827] dark:text-[#F8FAFC]">
                    Manage Brand Workspaces
                  </h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    View, switch, or delete brand workspaces tracked in this account ({clients.length} brands)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManageBrandsModal(false)}
                className="p-1 text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] rounded hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {clients.map((c) => {
                const isActive = c.id === activeClient.id;
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#4338CA] dark:border-[#818CF8] shadow-xs'
                        : 'bg-white dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#D1D5DB] dark:hover:border-[#334155]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">
                          {c.brandName}
                        </span>
                        {c.isDemo && (
                          <span className="text-[9px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] px-1.5 py-0.5 rounded font-bold uppercase">
                            Demo Data
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[9px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#047857] dark:text-[#A7F3D0] px-1.5 py-0.5 rounded font-bold uppercase border border-[#A7F3D0] dark:border-[#065F46]">
                            Active Workspace
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>{c.domain}</span>
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] dark:text-[#64748B] flex items-center gap-3 pt-0.5 flex-wrap">
                        {c.industry && <span>Industry: {c.industry}</span>}
                        {c.language && <span>Language: {c.language}</span>}
                        {c.market && <span>Market: {c.market}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSelectClient(c);
                            setShowManageBrandsModal(false);
                          }}
                          className="px-3 py-1.5 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          Switch To Brand
                        </button>
                      )}
                      {onDeleteClient && (
                        <button
                          onClick={() => {
                            setShowManageBrandsModal(false);
                            setConfirmDeleteBrand(c);
                          }}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[#DC2626] dark:text-[#EF4444] text-xs font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setShowManageBrandsModal(false);
                  onNewClient();
                }}
                className="px-4 py-2 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#10B981]" />
                Add New Client Brand
              </button>

              <button
                onClick={() => setShowManageBrandsModal(false)}
                className="px-4 py-2 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Brand Modal */}
      {confirmDeleteBrand && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#DC2626] dark:text-[#EF4444]">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F8FAFC]">
                  Delete Brand Workspace?
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-[#F9FAFB] dark:bg-[#1E293B] p-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] space-y-1">
              <div className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
                {confirmDeleteBrand.brandName}
              </div>
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
                Domain: {confirmDeleteBrand.domain}
              </div>
            </div>

            <p className="text-xs text-[#4B5563] dark:text-[#CBD5E1] leading-relaxed">
              Deleting this brand will permanently remove all tracked research prompts, run cycles, and visibility analytics history associated with <strong className="text-[#111827] dark:text-[#F8FAFC]">{confirmDeleteBrand.brandName}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E7EB] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => setConfirmDeleteBrand(null)}
                className="px-4 py-2 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteClient && confirmDeleteBrand) {
                    onDeleteClient(confirmDeleteBrand.id);
                  }
                  setConfirmDeleteBrand(null);
                }}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Brand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


