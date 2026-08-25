import { useState, useEffect } from 'react';
import { Link2, RefreshCw, Unlink, ExternalLink, ShieldCheck } from 'lucide-react';
import { GoogleIntegrationState } from '../types';

interface GoogleIntegrationCardProps {
  clientDomain?: string;
  clientBrandName?: string;
}

// GSC site URLs come as either "sc-domain:example.com" (domain property) or
// "https://example.com/" (URL-prefix property) — normalize both down to the
// bare registrable domain so they can be compared to the client's domain.
function normalizeDomain(value: string): string {
  return value
    .replace(/^sc-domain:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();
}

function bestMatchingGscSite(sites: { siteUrl: string }[], domain: string): string | undefined {
  const target = normalizeDomain(domain);
  const exact = sites.find((s) => normalizeDomain(s.siteUrl) === target);
  return exact?.siteUrl;
}

function bestMatchingGa4Property(
  props: { propertyId: string; displayName: string }[],
  domain: string,
  brandName?: string
): string | undefined {
  const domainRoot = normalizeDomain(domain).split('.')[0]; // "snacksforparty.com" -> "snacksforparty"
  const brandWords = (brandName || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainMatch = props.find((p) => norm(p.displayName).includes(norm(domainRoot)));
  if (domainMatch) return domainMatch.propertyId;

  const brandMatch = props.find((p) => {
    const label = p.displayName.toLowerCase();
    return brandWords.length > 0 && brandWords.every((w) => label.includes(w));
  });
  return brandMatch?.propertyId;
}

export function GoogleIntegrationCard({ clientDomain, clientBrandName }: GoogleIntegrationCardProps) {
  const [googleState, setGoogleState] = useState<GoogleIntegrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedProp, setSelectedProp] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const saveSelection = (site: string, prop: string) => {
    fetch('/api/integrations/google/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedGscSite: site, selectedGa4PropertyId: prop, connected: true }),
    }).catch((e) => console.error('Failed to auto-save matched Google properties:', e));
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google/status');
      const data = await res.json();
      setGoogleState(data);

      // If nothing has been explicitly selected yet, don't let the <select>
      // silently fall back to whatever property happens to be first in the
      // connected Google account's list (that account often manages many
      // unrelated sites) — auto-pick the one matching this client's domain.
      let site = data.selectedGscSite || '';
      let prop = data.selectedGa4PropertyId || '';
      let autoMatched = false;

      if (!site && clientDomain && data.availableGscSites?.length) {
        const matched = bestMatchingGscSite(data.availableGscSites, clientDomain);
        if (matched) {
          site = matched;
          autoMatched = true;
        }
      }
      if (!prop && clientDomain && data.availableGa4Properties?.length) {
        const matched = bestMatchingGa4Property(data.availableGa4Properties, clientDomain, clientBrandName);
        if (matched) {
          prop = matched;
          autoMatched = true;
        }
      }

      setSelectedSite(site);
      setSelectedProp(prop);
      if (autoMatched && (site || prop)) {
        saveSelection(site, prop);
      }
    } catch (err) {
      console.error('Failed to fetch Google Integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        fetchStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      const popup = window.open(url, 'google_oauth', 'width=600,height=700');
      if (!popup) {
        alert('Please allow popups for this site to connect your Google account.');
      }
    } catch {
      alert('Failed to initiate Google OAuth connection.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console & GA4?')) return;
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      fetchStatus();
    } catch {
      // ignore
    }
  };

  const handleSaveConfig = async () => {
    try {
      await fetch('/api/integrations/google/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedGscSite: selectedSite,
          selectedGa4PropertyId: selectedProp,
          connected: true,
        }),
      });
      setSavedMsg('Google properties updated successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
      fetchStatus();
    } catch {
      setSavedMsg('Failed to save settings.');
    }
  };

  if (loading) {
    return <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] py-2">Loading Google Integration status...</div>;
  }

  const isConnected = googleState?.gscConnected || googleState?.ga4Connected;

  return (
    <div className="space-y-4">
      {/* Account Link Status Header */}
      <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#4285F4] text-white flex items-center justify-center font-bold text-sm rounded-xs">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">Google Search Console & Analytics 4</span>
              {isConnected ? (
                <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> CONNECTED
                </span>
              ) : (
                <span className="text-[10px] bg-[#F3F4F6] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                  NOT CONNECTED
                </span>
              )}
            </div>
            <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              {isConnected
                ? `Account: ${googleState?.userEmail || '(email unavailable)'}${
                    googleState?.lastSyncAt
                      ? ` • Last sync: ${new Date(googleState.lastSyncAt).toLocaleTimeString()}`
                      : ''
                  }`
                : 'Grant read-only access to view organic search metrics alongside AI Visibility.'}
            </div>
          </div>
        </div>

        <div>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 bg-white dark:bg-[#1E293B] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
            >
              <Unlink className="w-3.5 h-3.5" /> Disconnect Account
            </button>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" /> {connecting ? 'Connecting...' : 'Connect Google Account'}
            </button>
          )}
        </div>
      </div>

      {googleState?.error && (
        <div className="text-xs text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#7F1D1D] p-3 border border-[#FECACA] dark:border-[#991B1B]">
          {googleState.error}
        </div>
      )}

      {/* Property Selectors when Connected */}
      {isConnected && (
        <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                Google Search Console Property
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
              >
                <option value="">— Select property —</option>
                {(googleState?.availableGscSites || []).map((s) => (
                  <option key={s.siteUrl} value={s.siteUrl}>
                    {s.siteUrl} ({s.permissionLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                Google Analytics 4 Property
              </label>
              <select
                value={selectedProp}
                onChange={(e) => setSelectedProp(e.target.value)}
                className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
              >
                <option value="">— Select property —</option>
                {(googleState?.availableGa4Properties || []).map((p) => (
                  <option key={p.propertyId} value={p.propertyId}>
                    {p.displayName} ({p.propertyId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] dark:border-[#1E293B]">
            {savedMsg ? (
              <span className="text-xs font-bold text-[#065F46] dark:text-[#34D399] animate-fade-in">{savedMsg}</span>
            ) : (
              <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                Select property IDs to sync with RAG Signal dashboards.
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              className="px-3 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Save Property Settings
            </button>
          </div>
        </div>
      )}

      {/* OAuth Configuration Instructions */}
      <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] bg-[#F9FAFB] dark:bg-[#1E293B] p-3 border border-[#E5E7EB] dark:border-[#334155] space-y-1">
        <div className="font-bold text-[#374151] dark:text-[#CBD5E1] uppercase tracking-wider text-[10px]">Google OAuth Setup Info:</div>
        <p>
          To connect live production Google APIs, configure <code className="text-[#111827] dark:text-[#F8FAFC]">GOOGLE_CLIENT_ID</code> and{' '}
          <code className="text-[#111827] dark:text-[#F8FAFC]">GOOGLE_CLIENT_SECRET</code> in environment variables. Authorized Redirect URI:
        </p>
        <code className="block bg-white dark:bg-[#0F172A] p-1 border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] font-mono select-all">
          {window.location.origin}/auth/google/callback
        </code>
      </div>
    </div>
  );
}
