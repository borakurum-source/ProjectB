import { useState, useEffect, FormEvent } from 'react';
import {
  Link2,
  RefreshCw,
  Unlink,
  ExternalLink,
  ShieldCheck,
  Key,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const domainRoot = normalizeDomain(domain).split('.')[0];
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
  const [copiedUri, setCopiedUri] = useState(false);

  // Credentials config state
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credSavedMsg, setCredSavedMsg] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const redirectUri = googleState?.redirectUri || `${window.location.origin}/auth/google/callback`;

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

      let site = data.selectedGscSite || '';
      let prop = data.selectedGa4PropertyId || '';
      let autoMatched = false;

      if (clientDomain && data.availableGscSites?.length) {
        const matched = bestMatchingGscSite(data.availableGscSites, clientDomain);
        if (matched) {
          if (!site || normalizeDomain(site) !== normalizeDomain(clientDomain)) {
            site = matched;
            autoMatched = true;
          }
        } else if (site && normalizeDomain(site) !== normalizeDomain(clientDomain)) {
          site = '';
        }
      }

      if (clientDomain && data.availableGa4Properties?.length) {
        const matched = bestMatchingGa4Property(data.availableGa4Properties, clientDomain, clientBrandName);
        if (matched) {
          if (!prop) {
            prop = matched;
            autoMatched = true;
          }
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
        setActionError(null);
        fetchStatus();
      } else if (e.data?.type === 'GOOGLE_AUTH_ERROR') {
        setActionError('Google OAuth failed or was cancelled. Check your credentials and redirect URI.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [clientDomain, clientBrandName]);

  const handleConnectGoogle = async () => {
    setActionError(null);

    // If client ID / Secret are not configured, guide the user to input them first
    if (!googleState?.clientIdConfigured) {
      setShowCredentialsForm(true);
      setActionError('Please configure your Google OAuth Client ID and Client Secret below before connecting.');
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to retrieve Google OAuth authorization URL.');
      }

      // Open Google OAuth popup directly with the provider URL
      const popup = window.open(data.url, 'google_oauth', 'width=600,height=700');
      if (!popup) {
        setActionError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to initiate Google OAuth connection.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveCredentials = async (e: FormEvent) => {
    e.preventDefault();
    const newClientId = clientIdInput.trim();
    const newClientSecret = clientSecretInput.trim();

    if (!newClientId && !newClientSecret) {
      setActionError('Please provide a Google Client ID or Client Secret to update.');
      return;
    }

    setSavingCreds(true);
    setActionError(null);
    try {
      const res = await fetch('/api/settings/google-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newClientId || undefined,
          clientSecret: newClientSecret || undefined,
        }),
      });
      const data = await res.json();
      if (data.configured) {
        setCredSavedMsg('Google OAuth credentials saved and configured successfully!');
        setTimeout(() => setCredSavedMsg(''), 4000);
        setShowCredentialsForm(false);
        setClientIdInput('');
        setClientSecretInput('');
        fetchStatus();
      } else if (data.hasClientSecret && !data.hasClientId) {
        setCredSavedMsg('Client Secret saved. Please also enter your Google Client ID.');
        setTimeout(() => setCredSavedMsg(''), 5000);
        fetchStatus();
      } else {
        setCredSavedMsg('Credentials updated.');
        setTimeout(() => setCredSavedMsg(''), 3000);
        fetchStatus();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error saving Google credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console & GA4?')) return;
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      fetchStatus();
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
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

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  if (loading) {
    return <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] py-2">Loading Google Integration status...</div>;
  }

  const isConnected = googleState?.gscConnected || googleState?.ga4Connected;
  const isCredentialsConfigured = Boolean(googleState?.clientIdConfigured);

  return (
    <div className="space-y-4">
      {/* Account Link Status Header */}
      <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#4285F4] text-white flex items-center justify-center font-bold text-sm rounded-xs shrink-0">
            G
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                Google Search Console & Analytics 4
              </span>
              {isConnected ? (
                <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> CONNECTED
                </span>
              ) : isCredentialsConfigured ? (
                <span className="text-[10px] bg-[#EFF6FF] dark:bg-[#1E3A8A] text-[#1D4ED8] dark:text-[#BFDBFE] border border-[#BFDBFE] dark:border-[#1D4ED8] px-1.5 py-0.5 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Key className="w-3 h-3" /> CREDENTIALS READY
                </span>
              ) : (
                <span className="text-[10px] bg-[#F3F4F6] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                  NOT CONFIGURED
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
                : isCredentialsConfigured
                ? 'OAuth credentials configured. Click Connect to link your live Search Console and GA4 properties.'
                : 'Configure Google OAuth Client ID & Secret to sync organic search clicks and GA4 AI referrals.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 bg-white dark:bg-[#1E293B] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
            >
              <Unlink className="w-3.5 h-3.5" /> Disconnect Account
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                className="px-3 py-1.5 bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5" /> {isCredentialsConfigured ? 'Edit Credentials' : 'Set Credentials'}
                {showCredentialsForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                onClick={handleConnectGoogle}
                disabled={connecting}
                className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" /> {connecting ? 'Connecting...' : 'Connect Google Account'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action / Error Banner */}
      {actionError && (
        <div className="text-xs text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#7F1D1D]/40 p-3 border border-[#FECACA] dark:border-[#991B1B] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{actionError}</div>
        </div>
      )}

      {googleState?.error && (
        <div className="text-xs text-[#DC2626] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#7F1D1D]/40 p-3 border border-[#FECACA] dark:border-[#991B1B]">
          {googleState.error}
        </div>
      )}

      {/* Inline Credentials Configuration Form */}
      {showCredentialsForm && (
        <div className="p-4 border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6] dark:border-[#1E293B]">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
                Google OAuth Credentials Configuration
              </h4>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                Provide your Google Cloud OAuth 2.0 Web Application credentials to enable live GSC and GA4 sync.
              </p>
            </div>
            {isCredentialsConfigured && (
              <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                Configured
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1 flex items-center justify-between">
                <span>Google Client ID</span>
                {googleState?.hasClientId && (
                  <span className="text-[10px] text-[#059669] dark:text-[#34D399] font-normal lowercase">configured</span>
                )}
              </label>
              <input
                type="text"
                placeholder={googleState?.hasClientId ? "Client ID is configured (Enter new to replace)" : "e.g. 1234567890-abc123xyz.apps.googleusercontent.com"}
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1 flex items-center justify-between">
                <span>Google Client Secret</span>
                {googleState?.hasClientSecret && (
                  <span className="text-[10px] text-[#059669] dark:text-[#34D399] font-normal lowercase">GOCSPX key configured</span>
                )}
              </label>
              <input
                type="password"
                placeholder={googleState?.hasClientSecret ? "Client Secret (GOCSPX-...) is configured (Enter new to replace)" : "e.g. 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"}
                value={clientSecretInput}
                onChange={(e) => setClientSecretInput(e.target.value)}
                className="w-full p-2 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs text-[#111827] dark:text-[#F8FAFC] font-mono focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#111827] dark:focus:border-[#6366F1] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {credSavedMsg ? (
                <span className="text-xs font-bold text-[#065F46] dark:text-[#34D399]">{credSavedMsg}</span>
              ) : (
                <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                  Values can also be defined via GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCredentialsForm(false)}
                  className="px-3 py-1.5 text-xs text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="px-3 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" /> {savingCreds ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          </form>
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
                Select property IDs to sync with RAG Signal dashboards and Search Insights.
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

      {/* OAuth Configuration Instructions & Callback URI Box */}
      <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] bg-[#F9FAFB] dark:bg-[#1E293B] p-3.5 border border-[#E5E7EB] dark:border-[#334155] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[#374151] dark:text-[#CBD5E1] uppercase tracking-wider text-[10px]">
            Google OAuth 2.0 Setup Guide
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#4285F4] hover:underline font-bold inline-flex items-center gap-1"
          >
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <ol className="list-decimal list-inside space-y-1 text-[11px]">
          <li>
            In Google Cloud Console, open your <strong>OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).
          </li>
          <li>
            Under <strong>Authorized Redirect URIs</strong> (Yetkili Yönlendirme URI'leri), you <strong>MUST add both URIs</strong> below (both Dev and Published versions) to prevent <code>redirect_uri_mismatch</code> errors:
          </li>
        </ol>

        <div className="space-y-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#4B5563] dark:text-[#CBD5E1] uppercase tracking-wider block">
              1. Current Environment Redirect URI:
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-[#0F172A] p-2 border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] font-mono text-[11px] select-all overflow-x-auto">
                {redirectUri}
              </code>
              <button
                type="button"
                onClick={copyRedirectUri}
                className="px-2.5 py-2 bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                title="Copy Redirect URI"
              >
                {copiedUri ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUri ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {!redirectUri.includes('ais-pre-') && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4B5563] dark:text-[#CBD5E1] uppercase tracking-wider block">
                2. Published App Redirect URI (For Shared / Published Site):
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-[#0F172A] p-2 border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] font-mono text-[11px] select-all overflow-x-auto">
                  https://ais-pre-krsjodwghxcqccmldrfsxj-675717062651.europe-west2.run.app/auth/google/callback
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://ais-pre-krsjodwghxcqccmldrfsxj-675717062651.europe-west2.run.app/auth/google/callback');
                    setCopiedUri(true);
                    setTimeout(() => setCopiedUri(false), 2000);
                  }}
                  className="px-2.5 py-2 bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] rounded text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                  title="Copy Published Redirect URI"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] text-[#4B5563] dark:text-[#94A3B8] pt-1">
          <strong>Required APIs to enable in Google Cloud:</strong> Google Search Console API (<code>webmasters.readonly</code>), Google Analytics Admin API, and Google Analytics Data API (<code>analytics.readonly</code>).
        </div>
      </div>
    </div>
  );
}
