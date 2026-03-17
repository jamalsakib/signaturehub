import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Shield, Mail, Users, GitBranch, Bell, Key, Server, Loader2 } from 'lucide-react';
import { syncApi, authApi, settingsApi } from '../services/api';

type Tab = 'azure' | 'mailflow' | 'sync' | 'notifications' | 'api';

function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'warning' }) {
  if (status === 'connected') return (
    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3" /> Connected
    </span>
  );
  if (status === 'warning') return (
    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
      <AlertCircle className="w-3 h-3" /> Warning
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
      <XCircle className="w-3 h-3" /> Not configured
    </span>
  );
}

function Field({ label, value, type = 'text', placeholder, hint }: {
  label: string; value: string; type?: string; placeholder?: string; hint?: string;
}) {
  const [val, setVal] = useState(value);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('azure');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Azure config form state
  const [azureConfig, setAzureConfig] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    redirectUri: `${window.location.origin}/auth/callback`,
  });

  // Load current Azure config from server on mount
  useEffect(() => {
    settingsApi.getAzureConfig().then(({ data }) => {
      setAzureConfig((prev) => ({
        ...prev,
        tenantId: data.tenantId || '',
        clientId: data.clientId || '',
        redirectUri: data.redirectUri || prev.redirectUri,
      }));
    }).catch(() => {/* ignore — fields stay empty */});
  }, []);

  const handleSaveAzure = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await settingsApi.saveAzureConfig({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret || undefined,
        redirectUri: azureConfig.redirectUri,
      });
      setSaveResult({ success: true, message: 'Azure configuration saved.' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed';
      setSaveResult({ success: false, message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await authApi.testConnection();
      setTestResult({ success: data.success, message: data.message || 'Connected successfully' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Connection failed';
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncApi.syncAll();
      setSyncMsg('Sync completed successfully. All users updated from Microsoft 365.');
    } catch {
      setSyncMsg('Sync failed. Check your Azure configuration and try again.');
    } finally {
      setSyncing(false);
    }
  };

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'azure', icon: Shield, label: 'Azure AD / M365' },
    { id: 'mailflow', icon: Mail, label: 'Mail Flow' },
    { id: 'sync', icon: Users, label: 'User Sync' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'api', icon: Key, label: 'API & Security' },
  ];

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Status overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Azure AD</p>
            <p className="text-sm font-semibold text-gray-900">App Registration</p>
          </div>
          <StatusBadge status={testResult ? (testResult.success ? 'connected' : 'disconnected') : azureConfig.clientId ? 'connected' : 'disconnected'} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Microsoft Graph</p>
            <p className="text-sm font-semibold text-gray-900">API Access</p>
          </div>
          <StatusBadge status={testResult?.success ? 'connected' : azureConfig.clientId ? 'warning' : 'disconnected'} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Mail Flow</p>
            <p className="text-sm font-semibold text-gray-900">Transport Rules</p>
          </div>
          <StatusBadge status="disconnected" />
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-5">

        {/* Azure AD / M365 */}
        {activeTab === 'azure' && (
          <>
            <Section title="Azure App Registration">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    value={azureConfig.tenantId}
                    onChange={(e) => setAzureConfig((p) => ({ ...p, tenantId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Your Azure AD tenant ID</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={azureConfig.clientId}
                    onChange={(e) => setAzureConfig((p) => ({ ...p, clientId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Application (client) ID</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={azureConfig.clientSecret}
                  onChange={(e) => setAzureConfig((p) => ({ ...p, clientSecret: e.target.value }))}
                  placeholder="Leave blank to keep existing secret"
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Store securely — never commit to source control</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URI</label>
                <input
                  type="text"
                  value={azureConfig.redirectUri}
                  onChange={(e) => setAzureConfig((p) => ({ ...p, redirectUri: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Register this exact URI in your Azure App Registration</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Required API Permissions</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700 text-xs">
                  <li>User.Read.All — Read all users' full profiles</li>
                  <li>Group.Read.All — Read all groups</li>
                  <li>Mail.ReadWrite — Required for transport rule injection</li>
                  <li>Exchange.ManageAsApp — Exchange Online management</li>
                </ul>
              </div>
              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}
              {saveResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${saveResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {saveResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {saveResult.message}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-60 px-4 py-2 rounded-lg"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSaveAzure}
                  disabled={saving}
                  className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </Section>

            <Section title="Microsoft 365 Integration">
              <div className="space-y-3">
                {[
                  { label: 'Server-side signature injection', desc: 'Apply signatures via Exchange transport rules (requires Exchange.ManageAsApp)', enabled: false },
                  { label: 'Auto-sync users on login', desc: 'Refresh user profile from Graph API on every sign-in', enabled: true },
                  { label: 'Sync profile photos', desc: 'Download and store user photos from Microsoft 365', enabled: false },
                  { label: 'Honour out-of-office signatures', desc: 'Apply different signature when auto-reply is active', enabled: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Mail Flow */}
        {activeTab === 'mailflow' && (
          <>
            <Section title="Exchange Transport Rules">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-2">
                <p className="font-semibold mb-1">Setup Required</p>
                <p className="text-xs text-yellow-700">
                  Server-side signature injection requires Exchange Online and the Exchange.ManageAsApp permission.
                  Configure Azure AD first, then connect Exchange below.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Exchange Online Domain" value="" placeholder="yourdomain.onmicrosoft.com" />
                <Field label="Transport Rule Name Prefix" value="SignatureHub-" hint="All managed rules will use this prefix" />
              </div>
              <div className="flex justify-end gap-3">
                <button className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg">Test Exchange Connection</button>
                <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">Save & Connect</button>
              </div>
            </Section>

            <Section title="Signature Injection Method">
              <div className="space-y-3">
                {[
                  { id: 'transport', label: 'Exchange Transport Rules (recommended)', desc: 'Server-side injection via Exchange Online. Works with all email clients including mobile. Requires Exchange.ManageAsApp permission.' },
                  { id: 'addin', label: 'Outlook Add-in', desc: 'Client-side insertion via the SignatureHub Outlook Add-in. Requires add-in deployment via M365 admin center.' },
                  { id: 'api', label: 'Graph API (Send Mail)', desc: 'Intercept outgoing mail via Graph API webhook. Preview-only mode.' },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="injection" defaultChecked={opt.id === 'transport'} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Mail Flow Workflow">
              <div className="relative">
                {[
                  { icon: Mail, label: 'User sends email', color: 'bg-blue-100 text-blue-600' },
                  { icon: Server, label: 'Exchange Online receives message', color: 'bg-purple-100 text-purple-600' },
                  { icon: GitBranch, label: 'Transport rule evaluates sender', color: 'bg-orange-100 text-orange-600' },
                  { icon: Shield, label: 'SignatureHub rule engine matches template', color: 'bg-yellow-100 text-yellow-600' },
                  { icon: CheckCircle2, label: 'Signature injected into message footer', color: 'bg-green-100 text-green-600' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-gray-700">{step.label}</p>
                    {i < 4 && <div className="absolute left-4 mt-8 w-0.5 h-5 bg-gray-200" style={{ marginTop: `${(i + 1) * 40 + 8}px` }} />}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* User Sync */}
        {activeTab === 'sync' && (
          <>
            <Section title="Microsoft 365 User Sync">
              <p className="text-sm text-gray-600">Synchronise user profiles, departments, and organisational data from Microsoft 365 via the Graph API.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sync Schedule</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option>Every hour</option>
                    <option>Every 6 hours</option>
                    <option selected>Every 24 hours</option>
                    <option>Manual only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sync Scope</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option selected>All licensed users</option>
                    <option>Specific groups only</option>
                    <option>Specific domains only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Sync display name & job title', enabled: true },
                  { label: 'Sync department & company', enabled: true },
                  { label: 'Sync phone numbers', enabled: true },
                  { label: 'Sync office location', enabled: true },
                  { label: 'Sync profile photos', enabled: false },
                  { label: 'Auto-assign templates on sync', enabled: true },
                  { label: 'Disable users removed from M365', enabled: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>

              {syncMsg && (
                <div className={`p-3 rounded-lg text-sm ${syncMsg.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {syncMsg}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg">Save Schedule</button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </Section>

            <Section title="Sync Fields Mapping">
              <p className="text-xs text-gray-500 mb-3">Map Microsoft 365 Graph API fields to SignatureHub signature placeholders.</p>
              <div className="space-y-2">
                {[
                  { m365: 'displayName', placeholder: '{{displayName}}' },
                  { m365: 'givenName', placeholder: '{{firstName}}' },
                  { m365: 'surname', placeholder: '{{lastName}}' },
                  { m365: 'jobTitle', placeholder: '{{jobTitle}}' },
                  { m365: 'department', placeholder: '{{department}}' },
                  { m365: 'companyName', placeholder: '{{company}}' },
                  { m365: 'mail', placeholder: '{{email}}' },
                  { m365: 'mobilePhone', placeholder: '{{mobilePhone}}' },
                  { m365: 'businessPhones[0]', placeholder: '{{businessPhone}}' },
                  { m365: 'officeLocation', placeholder: '{{officeLocation}}' },
                ].map((row) => (
                  <div key={row.m365} className="flex items-center gap-3 text-xs">
                    <span className="w-40 font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded">{row.m365}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded">{row.placeholder}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <Section title="Alert & Notification Settings">
            <div className="space-y-3">
              {[
                { label: 'Sync failure alerts', desc: 'Email when user sync fails', enabled: true },
                { label: 'New user alerts', desc: 'Notify when new M365 users are synced', enabled: false },
                { label: 'Template change alerts', desc: 'Notify admins when signatures are modified', enabled: true },
                { label: 'Campaign performance reports', desc: 'Weekly summary of banner campaign stats', enabled: false },
                { label: 'Transport rule errors', desc: 'Alert when Exchange transport rules fail', enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
            <Field label="Admin notification email" value="" placeholder="admin@yourcompany.com" />
            <div className="flex justify-end">
              <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">Save</button>
            </div>
          </Section>
        )}

        {/* API & Security */}
        {activeTab === 'api' && (
          <>
            <Section title="API Keys">
              <p className="text-sm text-gray-600 mb-2">API keys are used for the Outlook Add-in and external integrations.</p>
              <div className="space-y-2">
                {['Outlook Add-in', 'External Integration'].map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                      <p className="font-mono text-xs text-gray-400 mt-0.5">sig_••••••••••••••••••••••••••••••••</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline">Reveal</button>
                      <button className="text-xs text-red-400 hover:underline">Revoke</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg">Generate New API Key</button>
            </Section>

            <Section title="Security Settings">
              <div className="space-y-3">
                {[
                  { label: 'Require MFA for admin access', desc: 'Enforce multi-factor authentication for all admin users', enabled: false },
                  { label: 'Session timeout (30 minutes)', desc: 'Auto sign-out inactive admin sessions', enabled: true },
                  { label: 'Audit logging', desc: 'Log all admin actions to the audit trail', enabled: true },
                  { label: 'IP allowlist', desc: 'Restrict admin panel to specific IP ranges', enabled: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
