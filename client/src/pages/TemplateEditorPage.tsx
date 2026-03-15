import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Eye, Copy, CheckCircle2, AlertCircle, RefreshCw,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image, Table, Code, X, ChevronDown, ChevronLeft,
  FileText, Layout, Grid, Hash, Minus,
  Mail, Monitor,
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { templatesApi, businessUnitsApi } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  '{{displayName}}', '{{firstName}}', '{{lastName}}',
  '{{jobTitle}}', '{{department}}', '{{company}}',
  '{{email}}', '{{phone}}', '{{mobilePhone}}', '{{businessPhone}}',
  '{{officeLocation}}', '{{website}}', '{{logoUrl}}',
  '{{bannerUrl}}', '{{bannerLink}}', '{{primaryColor}}',
  '{{accentColor}}', '{{legalDisclaimer}}', '{{qrCodeUrl}}', '{{photoUrl}}',
];

const FONT_FAMILIES = ['Arial', 'Georgia', 'Helvetica', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36'];

const DEFAULT_TEMPLATE = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:600px;">
  <tr>
    <td style="padding-right:16px;border-right:3px solid #0078d4;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a1a;">{{displayName}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#0078d4;font-weight:600;">{{jobTitle}}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#666;">{{department}} | {{company}}</p>
    </td>
    <td style="padding-left:16px;vertical-align:top;">
      <p style="margin:0;font-size:12px;color:#555;">📧 {{email}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555;">📞 {{businessPhone}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555;">📍 {{officeLocation}}</p>
    </td>
  </tr>
</table>`;

type RibbonTab = 'main' | 'email-layout' | 'formatting' | 'table' | 'placeholder';

// ─── Ribbon components ────────────────────────────────────────────────────────

function RSep() { return <div className="w-px h-10 bg-gray-200 mx-0.5 shrink-0" />; }

function RBtn({ icon: Icon, label, onClick, active, disabled }: {
  icon: React.ElementType; label: string; onClick?: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded transition-colors shrink-0
        ${active
          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[10px] leading-none whitespace-nowrap font-medium">{label}</span>
    </button>
  );
}

function RSmallBtn({ icon: Icon, label, onClick, active }: {
  icon: React.ElementType; label: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={label}
      className={`flex items-center justify-center w-7 h-7 rounded transition-colors shrink-0
        ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function RDrop({ label, options, onSelect }: { label: string; options: string[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200 h-7">
        <span className="max-w-[72px] truncate">{label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[130px] max-h-48 overflow-y-auto py-1">
          {options.map((o) => (
            <button key={o} onClick={() => { onSelect(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TemplateEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;
  const editorRef = useRef<any>(null);

  const [form, setForm] = useState({
    name: '', description: '', businessUnit: '', layout: 'standard',
    htmlTemplate: DEFAULT_TEMPLATE,
    hasBannerZone: false, hasQrCode: false, hasPhoto: false, isDefault: false, locale: 'en',
  });

  const [activeTab, setActiveTab] = useState<RibbonTab>('main');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState('');
  const [showPanel, setShowPanel] = useState(true);

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => templatesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data.data),
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || '', description: template.description || '',
        businessUnit: template.businessUnit?._id || template.businessUnit || '',
        layout: template.layout || 'standard', htmlTemplate: template.htmlTemplate || DEFAULT_TEMPLATE,
        hasBannerZone: !!template.hasBannerZone, hasQrCode: !!template.hasQrCode,
        hasPhoto: !!template.hasPhoto, isDefault: !!template.isDefault, locale: template.locale || 'en',
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => isNew ? templatesApi.create(data) : templatesApi.update(id!, data),
    onMutate: () => { setSaveStatus('saving'); setSaveError(''); },
    onSuccess: (res) => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (isNew) navigate(`/templates/${res.data._id}/edit`, { replace: true });
    },
    onError: (err: any) => {
      setSaveStatus('error');
      setSaveError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Save failed.');
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) { setSaveStatus('error'); setSaveError('Template name is required.'); return; }
    if (!form.businessUnit) { setSaveStatus('error'); setSaveError('Please select a business unit.'); return; }
    if (!form.htmlTemplate.trim()) { setSaveStatus('error'); setSaveError('HTML template cannot be empty.'); return; }
    saveMutation.mutate(form);
  };

  const handlePreview = useCallback(async () => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const { data } = await templatesApi.preview(id, { htmlTemplate: form.htmlTemplate } as any);
      setPreviewHtml(data.html);
      setShowPreview(true);
    } catch (e: any) {
      setSaveError('Preview failed: ' + (e?.response?.data?.error || e.message));
    } finally { setPreviewLoading(false); }
  }, [id, form.htmlTemplate]);

  const insertAtCursor = (text: string) => {
    const ed = editorRef.current;
    if (!ed) { navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1500); return; }
    const sel = ed.getSelection();
    ed.executeEdits('', [{ range: sel, text, forceMoveMarkers: true }]);
    ed.focus();
  };

  const wrapSelection = (before: string, after: string) => {
    const ed = editorRef.current; if (!ed) return;
    const sel = ed.getSelection();
    const selected = ed.getModel().getValueInRange(sel);
    ed.executeEdits('', [{ range: sel, text: before + (selected || 'text') + after, forceMoveMarkers: true }]);
    ed.focus();
  };

  const copyPlaceholder = (ph: string) => {
    navigator.clipboard.writeText(ph); setCopied(ph); setTimeout(() => setCopied(''), 1500);
  };

  const canSave = !saveMutation.isPending && form.name.trim() && form.businessUnit && form.htmlTemplate.trim();

  const TABS: { id: RibbonTab; label: string }[] = [
    { id: 'main', label: 'Main' },
    { id: 'email-layout', label: 'Email layout' },
    { id: 'formatting', label: 'Formatting' },
    { id: 'table', label: 'Table layout' },
    { id: 'placeholder', label: 'Placeholder' },
  ];

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {/* ── Dark ribbon tab bar (matches CodeTwo exactly) ── */}
      <div className="flex items-stretch bg-[#1c2128] shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center justify-center px-4 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Back to Signatures"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Tabs */}
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors shrink-0
              ${activeTab === tab.id
                ? 'border-blue-400 text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status + Save */}
        <div className="flex items-center gap-3 pr-4">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && saveError && (
            <span className="flex items-center gap-1 text-red-400 text-xs max-w-xs truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {saveError}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Action toolbar (white bar) ── */}
      <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-gray-200 shrink-0 min-h-[52px] overflow-x-auto">

        {activeTab === 'main' && (
          <>
            <RBtn icon={Save} label="Apply & Close" onClick={() => { handleSave(); setTimeout(() => navigate('/templates'), 800); }} />
            <RSep />
            <RBtn icon={Eye} label="Signature preview"
              onClick={showPreview ? () => setShowPreview(false) : handlePreview}
              active={showPreview}
              disabled={isNew || previewLoading}
            />
            <RBtn icon={Mail} label="Sample email"
              onClick={showPreview ? () => setShowPreview(false) : handlePreview}
              disabled={isNew}
            />
            <RSep />
            <RBtn icon={Code} label="HTML source" active={true} />
            <RBtn icon={FileText} label="Plain text" />
            <RSep />
            <RBtn
              icon={ChevronLeft}
              label={showPanel ? 'Hide panel' : 'Show panel'}
              onClick={() => setShowPanel((v) => !v)}
            />
          </>
        )}

        {activeTab === 'email-layout' && (
          <>
            <RBtn icon={Monitor} label="Standard" onClick={() => setForm({ ...form, layout: 'standard' })} active={form.layout === 'standard'} />
            <RBtn icon={Layout} label="With disclaimer" onClick={() => setForm({ ...form, layout: 'rich', hasBannerZone: true })} active={form.layout === 'rich'} />
            <RBtn icon={Layout} label="Two column" onClick={() => setForm({ ...form, layout: 'two-column' })} active={form.layout === 'two-column'} />
            <RBtn icon={Monitor} label="Minimal" onClick={() => setForm({ ...form, layout: 'minimal' })} active={form.layout === 'minimal'} />
            <RSep />
            <div className="flex flex-col gap-1 px-2">
              {([['hasBannerZone', 'Banner zone'], ['hasQrCode', 'QR Code'], ['hasPhoto', 'Profile photo']] as const).map(([key, lbl]) => (
                <label key={key} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600" />
                  {lbl}
                </label>
              ))}
            </div>
          </>
        )}

        {activeTab === 'formatting' && (
          <>
            <RDrop label="Font family" options={FONT_FAMILIES} onSelect={(f) => wrapSelection(`<span style="font-family:${f};">`, '</span>')} />
            <RDrop label="Font size" options={FONT_SIZES} onSelect={(s) => wrapSelection(`<span style="font-size:${s}px;">`, '</span>')} />
            <RSep />
            <RSmallBtn icon={Bold} label="Bold" onClick={() => wrapSelection('<strong>', '</strong>')} />
            <RSmallBtn icon={Italic} label="Italic" onClick={() => wrapSelection('<em>', '</em>')} />
            <RSmallBtn icon={Underline} label="Underline" onClick={() => wrapSelection('<u>', '</u>')} />
            <RSmallBtn icon={Strikethrough} label="Strikethrough" onClick={() => wrapSelection('<s>', '</s>')} />
            <RSep />
            <RSmallBtn icon={AlignLeft} label="Align left" onClick={() => wrapSelection('<div style="text-align:left;">', '</div>')} />
            <RSmallBtn icon={AlignCenter} label="Align center" onClick={() => wrapSelection('<div style="text-align:center;">', '</div>')} />
            <RSmallBtn icon={AlignRight} label="Align right" onClick={() => wrapSelection('<div style="text-align:right;">', '</div>')} />
            <RSep />
            <RSmallBtn icon={List} label="Bullet list" onClick={() => wrapSelection('<ul><li>', '</li></ul>')} />
            <RSmallBtn icon={ListOrdered} label="Numbered list" onClick={() => wrapSelection('<ol><li>', '</li></ol>')} />
            <RSep />
            <RBtn icon={Link} label="Link" onClick={() => wrapSelection('<a href="URL">', '</a>')} />
            <RBtn icon={Image} label="Picture" onClick={() => insertAtCursor('<img src="URL" alt="" style="max-width:200px;" />')} />
            <RBtn icon={Minus} label="Divider" onClick={() => insertAtCursor('<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />')} />
          </>
        )}

        {activeTab === 'table' && (
          <>
            <RBtn icon={Table} label="Insert table"
              onClick={() => insertAtCursor('<table cellpadding="4" cellspacing="0" border="0" style="border-collapse:collapse;">\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>\n</table>')} />
            <RBtn icon={Table} label="1-column"
              onClick={() => insertAtCursor('<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">\n  <tr><td style="padding:8px;">&nbsp;</td></tr>\n</table>')} />
            <RSep />
            <RBtn icon={Table} label="Add row ↓"
              onClick={() => insertAtCursor('\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>')} />
            <RBtn icon={Table} label="Add col →"
              onClick={() => insertAtCursor('<td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>')} />
            <RSep />
            <RBtn icon={Grid} label="2×2 grid"
              onClick={() => insertAtCursor('<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;">\n  <tr>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;width:50%;">&nbsp;</td>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;width:50%;">&nbsp;</td>\n  </tr>\n  <tr>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;">&nbsp;</td>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;">&nbsp;</td>\n  </tr>\n</table>')} />
          </>
        )}

        {activeTab === 'placeholder' && (
          <div className="flex items-center gap-1 flex-wrap py-1">
            {PLACEHOLDERS.map((ph) => (
              <button key={ph} onClick={() => insertAtCursor(ph)} title={`Insert ${ph} at cursor`}
                className="px-2 py-1 text-[10px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors">
                {ph}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left settings panel */}
        {showPanel && (
          <div className="w-60 shrink-0 border-r border-gray-200 flex flex-col overflow-y-auto bg-white">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Settings</p>
                <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaveStatus('idle'); }}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!form.name.trim() && saveStatus === 'error' ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="e.g. Corporate Standard"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Unit *</label>
                <select
                  value={form.businessUnit}
                  onChange={(e) => { setForm({ ...form, businessUnit: e.target.value }); setSaveStatus('idle'); }}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!form.businessUnit && saveStatus === 'error' ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select business unit...</option>
                  {(businessUnits || []).map((bu: any) => (
                    <option key={bu._id} value={bu._id}>{bu.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Layout</label>
                <select value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm">
                  {['standard', 'minimal', 'rich', 'two-column', 'custom'].map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1">
                {([
                  ['hasBannerZone', 'Banner zone'],
                  ['hasQrCode', 'QR Code'],
                  ['hasPhoto', 'Profile photo'],
                  ['isDefault', 'Set as default'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" checked={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Placeholders */}
            <div className="p-4 flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Placeholders</p>
              <p className="text-[10px] text-gray-400 mb-3">Click to copy · Use Placeholder tab to insert at cursor</p>
              <div className="space-y-0.5">
                {PLACEHOLDERS.map((ph) => (
                  <button key={ph} onClick={() => copyPlaceholder(ph)}
                    className={`flex items-center justify-between w-full text-xs font-mono px-2 py-1 rounded text-left transition-colors ${
                      copied === ph ? 'bg-green-50 text-green-700' : 'text-blue-600 hover:bg-blue-50'}`}>
                    {ph}
                    {copied === ph
                      ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                      : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Editor header bar */}
          <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-1.5 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">HTML Template (Handlebars)</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400">{form.htmlTemplate.length} chars</span>
              {!showPanel && (
                <button onClick={() => setShowPanel(true)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                  Show panel
                </button>
              )}
            </div>
          </div>

          {/* Monaco */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="html"
              value={form.htmlTemplate}
              onChange={(val) => { setForm((f) => ({ ...f, htmlTemplate: val || '' })); setSaveStatus('idle'); }}
              theme="vs"
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on',
                wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, formatOnPaste: true,
              }}
            />
          </div>

          {/* Preview panel */}
          {showPreview && previewHtml && (
            <div className="h-80 shrink-0 flex flex-col border-t border-gray-200">
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-1.5 shrink-0">
                <span className="text-xs font-medium text-gray-500">Signature preview — sample data</span>
                <div className="flex items-center gap-3">
                  <button onClick={handlePreview} disabled={previewLoading}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                    <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                  <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                <div className="bg-white border border-gray-200 rounded p-6 shadow-sm max-w-2xl">
                  <div className="border-b border-gray-100 pb-3 mb-4 space-y-1">
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="w-12 font-medium shrink-0">From:</span>
                      <span className="text-gray-700">Jane Smith &lt;jane.smith@company.com&gt;</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="w-12 font-medium shrink-0">To:</span>
                      <span className="text-gray-700">client@example.com</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="w-12 font-medium shrink-0">Subject:</span>
                      <span className="text-gray-700 font-medium">Following up on our conversation</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                    Hi,<br /><br />Thank you for your time today.<br /><br />Best regards,
                  </p>
                  <div className="border-t border-gray-100 pt-4">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
