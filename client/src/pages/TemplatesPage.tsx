import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit2, Copy, Trash2, Eye, CheckCircle2, ChevronRight,
  TestTube2, Download, ArrowUp, ArrowDown, EyeOff, X,
  MoreHorizontal, Search, LayoutGrid, Cloud, Monitor, Mail,
  Flag, Layout, Save, AlertCircle, RefreshCw,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Link, Image, Table, Code, FileText, Grid,
  Hash, ChevronDown, Minus, Users, UserCheck, Clock, Share2, Calendar,
  MousePointer, GitBranch, Type, Trash, Code2,
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { templatesApi, businessUnitsApi } from '../services/api';
import { useState, useEffect, useMemo, useRef } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

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

const DEFAULT_HTML = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:600px;">
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

const TEMPLATE_STEPS = [
  { id: 'name',       icon: Flag,      label: 'Name' },
  { id: 'senders',    icon: Users,     label: 'Senders' },
  { id: 'recipients', icon: UserCheck, label: 'Recipients' },
  { id: 'scheduler',  icon: Clock,     label: 'Scheduler' },
  { id: 'design',     icon: Layout,    label: 'Design' },
] as const;

type TemplateStepId = (typeof TEMPLATE_STEPS)[number]['id'];
type DesignTab = 'main' | 'email-layout' | 'formatting' | 'table' | 'placeholder';
type DesignView = 'visual' | 'html';
type SectionKey = 'cloud' | 'outlook' | 'autoresponders';

// ── Ribbon helpers ────────────────────────────────────────────────────────────

function RSep() { return <div className="w-px h-8 bg-gray-300 mx-0.5 shrink-0" />; }

function RBtn({ icon: Icon, label, onClick, active, disabled }: {
  icon: React.ElementType; label: string; onClick?: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] px-1.5 py-1.5 rounded text-xs transition-colors shrink-0
        ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[9px] leading-none whitespace-nowrap font-medium">{label}</span>
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

function RDrop({ label, options, onSelect, width = '72px' }: {
  label: string; options: string[]; onSelect: (v: string) => void; width?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded border border-gray-300 h-7 font-medium bg-white">
        <span className="truncate" style={{ maxWidth: width }}>{label}</span>
        <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[120px] max-h-48 overflow-y-auto py-1">
          {options.map((o) => (
            <button key={o} onClick={() => { onSelect(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function RGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Tag list (for Senders / Recipients) ───────────────────────────────────────

function TagList({ label, sublabel, items, onAdd, onRemove }: {
  label: string; sublabel?: string; items: string[];
  onAdd: (v: string) => void; onRemove: (v: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (v && !items.includes(v)) { onAdd(v); setDraft(''); } };
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
      {sublabel && <p className="text-xs text-gray-500 mb-2">{sublabel}</p>}
      <div className="border border-gray-300 rounded-lg min-h-[90px] bg-white mb-2 overflow-y-auto max-h-36">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No entries yet</p>
        ) : items.map((item) => (
          <div key={item} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 group border-b border-gray-100 last:border-0">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{item}</span>
            <button onClick={() => onRemove(item)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Enter email or group name..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={add} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-green-600 hover:bg-green-50 font-medium">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ── Preview thumbnail ─────────────────────────────────────────────────────────

function PreviewThumbnailInline({ id, compact }: { id: string; compact: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    templatesApi.preview(id).then(({ data }) => setHtml(data.html)).catch(() => setHtml(''));
  }, [id]);
  if (html === null) return (
    <div className="absolute inset-0 flex flex-col gap-1 p-2 animate-pulse">
      <div className="h-2 bg-gray-200 rounded w-3/4" /><div className="h-1.5 bg-gray-100 rounded w-1/2" />
    </div>
  );
  if (!html) return <div className="absolute inset-0 flex items-center justify-center bg-gray-50"><Eye className="w-4 h-4 text-gray-300" /></div>;
  const scale = compact ? 0.13 : 0.213;
  return (
    <div style={{ width: '600px', height: '360px', transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', pointerEvents: 'none' }}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

// ── Template wizard panel ─────────────────────────────────────────────────────

function TemplateWizardPanel({ id, isNew, onClose, onSaved }: {
  id: string | null; isNew: boolean; onClose: () => void; onSaved: (newId: string) => void;
}) {
  const queryClient = useQueryClient();
  const editorRef = useRef<any>(null);

  const [step, setStep] = useState<TemplateStepId>('name');
  const [designTab, setDesignTab] = useState<DesignTab>('main');
  const [designView, setDesignView] = useState<DesignView>('visual');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', businessUnit: '', layout: 'standard',
    htmlTemplate: DEFAULT_HTML,
    hasBannerZone: false, hasQrCode: false, hasPhoto: false, isDefault: false, locale: 'en',
    senderIncludes: [] as string[], senderExcludes: [] as string[],
    recipientIncludes: [] as string[], recipientExcludes: [] as string[],
    activeFrom: '', activeUntil: '',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
  });

  const { data: template } = useQuery({
    queryKey: ['template', id],
    queryFn: () => templatesApi.get(id!).then((r) => r.data),
    enabled: !!id && !isNew,
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data.data),
  });

  useEffect(() => {
    if (template) {
      setForm((f) => ({
        ...f,
        name: template.name || '',
        description: template.description || '',
        businessUnit: template.businessUnit?._id || template.businessUnit || '',
        layout: template.layout || 'standard',
        htmlTemplate: template.htmlTemplate || DEFAULT_HTML,
        hasBannerZone: !!template.hasBannerZone,
        hasQrCode: !!template.hasQrCode,
        hasPhoto: !!template.hasPhoto,
        isDefault: !!template.isDefault,
        locale: template.locale || 'en',
      }));
    }
  }, [template]);

  useEffect(() => {
    setStep('name');
    setDesignTab('main');
    setDesignView('visual');
    setSaveStatus('idle');
    setSaveError('');
    setPreviewHtml('');
    if (isNew) {
      setForm({
        name: '', description: '', businessUnit: '', layout: 'standard',
        htmlTemplate: DEFAULT_HTML, hasBannerZone: false, hasQrCode: false,
        hasPhoto: false, isDefault: false, locale: 'en',
        senderIncludes: [], senderExcludes: [],
        recipientIncludes: [], recipientExcludes: [],
        activeFrom: '', activeUntil: '',
        activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      });
    }
  }, [id, isNew]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      isNew ? templatesApi.create(data) : templatesApi.update(id!, data),
    onMutate: () => { setSaveStatus('saving'); setSaveError(''); },
    onSuccess: (res) => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (isNew) onSaved(res.data._id);
    },
    onError: (err: any) => {
      setSaveStatus('error');
      setSaveError(err?.response?.data?.error || err?.message || 'Save failed.');
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) { setSaveStatus('error'); setSaveError('Template name is required.'); setStep('name'); return; }
    if (!form.businessUnit) { setSaveStatus('error'); setSaveError('Please select a business unit.'); setStep('name'); return; }
    saveMutation.mutate(form);
  };

  const handlePreview = async () => {
    if (!id || isNew) return;
    setPreviewLoading(true);
    try {
      const { data } = await templatesApi.preview(id, { htmlTemplate: form.htmlTemplate } as any);
      setPreviewHtml(data.html);
    } catch {}
    finally { setPreviewLoading(false); }
  };

  const insertAtCursor = (text: string) => {
    const ed = editorRef.current; if (!ed) return;
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

  const currentIdx = TEMPLATE_STEPS.findIndex((s) => s.id === step);

  const frameContent = `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#fff;">${form.htmlTemplate}</body></html>`;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} title="Close"
            className="flex items-center justify-center p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded shrink-0">
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
            {isNew ? 'New signature' : (form.name || '...')}
          </span>
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600 text-xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === 'error' && saveError && (
            <span className="flex items-center gap-1 text-red-500 text-xs truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {saveError}
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded text-sm font-semibold shrink-0">
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left step nav */}
        <div className="w-[180px] shrink-0 bg-[#f8f9fa] border-r border-gray-200 flex flex-col">
          {TEMPLATE_STEPS.map((s) => {
            const isActive = s.id === step;
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className={`flex items-center gap-3 px-5 py-5 text-left border-b border-gray-200 transition-all
                  ${isActive
                    ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                    : 'border-l-[3px] border-l-transparent hover:bg-gray-100'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* ── Name step ── */}
          {step === 'name' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <p className="text-sm text-gray-600 mb-6">
                  This signature template will be used in rules to add email signatures. Start by naming this template and configure its basic settings.
                </p>
                <div className="max-w-xl space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Template name *</label>
                    <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaveStatus('idle'); }}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!form.name.trim() && saveStatus === 'error' ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="e.g. Corporate Standard" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Business Unit *</label>
                    <select value={form.businessUnit} onChange={(e) => { setForm({ ...form, businessUnit: e.target.value }); setSaveStatus('idle'); }}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!form.businessUnit && saveStatus === 'error' ? 'border-red-400' : 'border-gray-300'}`}>
                      <option value="">Select business unit...</option>
                      {(businessUnits || []).map((bu: any) => (
                        <option key={bu._id} value={bu._id}>{bu.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Description (optional)</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4} placeholder="Describe what this template is for..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Layout</label>
                    <select value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['standard', 'minimal', 'rich', 'two-column', 'custom'].map((l) => (
                        <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3 pt-1">
                    {([
                      ['hasBannerZone', 'Include banner zone'],
                      ['hasQrCode', 'Include QR code'],
                      ['hasPhoto', 'Include profile photo'],
                      ['isDefault', 'Set as default template'],
                    ] as const).map(([key, lbl]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input type="checkbox" checked={(form as any)[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <StepNav currentIdx={currentIdx} onBack={() => {}} onNext={() => setStep('senders')} onSave={handleSave} isPending={saveMutation.isPending} />
            </>
          )}

          {/* ── Senders step ── */}
          {step === 'senders' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <p className="text-sm text-gray-600 mb-6">Select which users trigger this signature and get it added to their emails.</p>
                <div className="max-w-2xl">
                  <TagList label="Add the signature to emails sent by these users:"
                    sublabel="Enter individual email addresses or group names."
                    items={form.senderIncludes}
                    onAdd={(v) => setForm({ ...form, senderIncludes: [...form.senderIncludes, v] })}
                    onRemove={(v) => setForm({ ...form, senderIncludes: form.senderIncludes.filter((x) => x !== v) })} />
                  <TagList label="Do not add the signature to emails sent by these users (exceptions):"
                    items={form.senderExcludes}
                    onAdd={(v) => setForm({ ...form, senderExcludes: [...form.senderExcludes, v] })}
                    onRemove={(v) => setForm({ ...form, senderExcludes: form.senderExcludes.filter((x) => x !== v) })} />
                </div>
              </div>
              <StepNav currentIdx={currentIdx} onBack={() => setStep('name')} onNext={() => setStep('recipients')} onSave={handleSave} isPending={saveMutation.isPending} />
            </>
          )}

          {/* ── Recipients step ── */}
          {step === 'recipients' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <p className="text-sm text-gray-600 mb-6">This signature template can apply to emails sent to anyone or to specific recipients only.</p>
                <div className="max-w-2xl">
                  <TagList label="Add the signature to emails sent to these recipients:"
                    sublabel='Use "All recipients" for no restriction.'
                    items={form.recipientIncludes.length === 0 ? ['All recipients'] : form.recipientIncludes}
                    onAdd={(v) => { const list = form.recipientIncludes.filter((x) => x !== 'All recipients'); setForm({ ...form, recipientIncludes: [...list, v] }); }}
                    onRemove={(v) => { if (v === 'All recipients') return; setForm({ ...form, recipientIncludes: form.recipientIncludes.filter((x) => x !== v) }); }} />
                  <TagList label="Do not add the signature to emails sent to these recipients (exceptions):"
                    items={form.recipientExcludes}
                    onAdd={(v) => setForm({ ...form, recipientExcludes: [...form.recipientExcludes, v] })}
                    onRemove={(v) => setForm({ ...form, recipientExcludes: form.recipientExcludes.filter((x) => x !== v) })} />
                </div>
              </div>
              <StepNav currentIdx={currentIdx} onBack={() => setStep('senders')} onNext={() => setStep('scheduler')} onSave={handleSave} isPending={saveMutation.isPending} />
            </>
          )}

          {/* ── Scheduler step ── */}
          {step === 'scheduler' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <p className="text-sm text-gray-600 mb-6">Optionally limit when this signature is active. Leave blank to always apply.</p>
                <div className="max-w-xl space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Active from:</label>
                      <input type="datetime-local" value={form.activeFrom}
                        onChange={(e) => setForm({ ...form, activeFrom: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Active until:</label>
                      <input type="datetime-local" value={form.activeUntil}
                        onChange={(e) => setForm({ ...form, activeUntil: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Active days of the week:</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <button key={day}
                          onClick={() => { const days = form.activeDays; setForm({ ...form, activeDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] }); }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.activeDays.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <StepNav currentIdx={currentIdx} onBack={() => setStep('recipients')} onNext={() => setStep('design')} onSave={handleSave} isPending={saveMutation.isPending} />
            </>
          )}

          {/* ── Design step ── */}
          {step === 'design' && (
            <div className="flex flex-col flex-1 min-h-0">

              {/* Dark ribbon tab bar */}
              <div className="flex items-stretch bg-[#2d2d2d] shrink-0">
                {(['Main', 'Email layout', 'Formatting'] as const).map((tab) => {
                  const id2tab: Record<string, DesignTab> = { 'Main': 'main', 'Email layout': 'email-layout', 'Formatting': 'formatting' };
                  const tabId = id2tab[tab] || 'main';
                  return (
                    <button key={tab} onClick={() => setDesignTab(tabId)}
                      className={`flex items-center px-5 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0
                        ${designTab === tabId
                          ? 'border-blue-400 text-white'
                          : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                      {tab}
                    </button>
                  );
                })}
                <div className="flex-1" />
                <button onClick={onClose} className="px-4 text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Ribbon actions (white bar with groups) ── */}
              <div className="flex items-end gap-2 px-3 py-1.5 bg-white border-b border-gray-200 shrink-0 overflow-x-auto">

                {designTab === 'main' && (
                  <>
                    {/* Template group */}
                    <RGroup label="Template">
                      <RBtn icon={Save} label="Apply & Close" onClick={() => { handleSave(); setTimeout(onClose, 800); }} />
                      <RBtn icon={FileText} label="Templates" />
                    </RGroup>
                    <RSep />

                    {/* Format group */}
                    <RGroup label="Format">
                      <RBtn icon={Code} label="HTML" onClick={() => setDesignView('html')} active={designView === 'html'} />
                      <RBtn icon={FileText} label="Plain text" />
                      <RBtn icon={FileText} label="HTML to plain text" />
                    </RGroup>
                    <RSep />

                    {/* View group */}
                    <RGroup label="View">
                      <RBtn icon={Eye} label="Signature preview"
                        onClick={handlePreview} disabled={isNew || previewLoading}
                        active={!!previewHtml && designView === 'visual'} />
                      <RBtn icon={Code2} label="HTML source"
                        onClick={() => setDesignView(designView === 'html' ? 'visual' : 'html')}
                        active={designView === 'html'} />
                      <RBtn icon={Mail} label="Show sample email thread" />
                    </RGroup>
                    <RSep />

                    {/* Font group */}
                    <RGroup label="Font">
                      <div className="flex items-center gap-1">
                        <RDrop label="Arial" options={FONT_FAMILIES} onSelect={(f) => wrapSelection(`<span style="font-family:${f};">`, '</span>')} width="60px" />
                        <RDrop label="10" options={FONT_SIZES} onSelect={(s) => wrapSelection(`<span style="font-size:${s}px;">`, '</span>')} width="28px" />
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <RSmallBtn icon={Bold} label="Bold" onClick={() => wrapSelection('<strong>', '</strong>')} />
                        <RSmallBtn icon={Italic} label="Italic" onClick={() => wrapSelection('<em>', '</em>')} />
                        <RSmallBtn icon={Underline} label="Underline" onClick={() => wrapSelection('<u>', '</u>')} />
                        <RSmallBtn icon={Strikethrough} label="Strikethrough" onClick={() => wrapSelection('<s>', '</s>')} />
                      </div>
                    </RGroup>
                    <RSep />

                    {/* Alignment group */}
                    <RGroup label="Alignment">
                      <div className="flex items-center gap-0.5">
                        <RSmallBtn icon={AlignLeft} label="Align left" onClick={() => wrapSelection('<div style="text-align:left;">', '</div>')} />
                        <RSmallBtn icon={AlignCenter} label="Align center" onClick={() => wrapSelection('<div style="text-align:center;">', '</div>')} />
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <RSmallBtn icon={AlignRight} label="Align right" onClick={() => wrapSelection('<div style="text-align:right;">', '</div>')} />
                        <RSmallBtn icon={AlignJustify} label="Justify" onClick={() => wrapSelection('<div style="text-align:justify;">', '</div>')} />
                      </div>
                    </RGroup>
                    <RSep />

                    {/* Insert group */}
                    <RGroup label="Insert">
                      <RBtn icon={Table} label="Table" onClick={() => { setDesignView('html'); insertAtCursor('<table cellpadding="4" cellspacing="0" border="0" style="border-collapse:collapse;">\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>\n</table>'); }} />
                      <RBtn icon={Image} label="Picture" onClick={() => { setDesignView('html'); insertAtCursor('<img src="URL" alt="" style="max-width:200px;" />'); }} />
                      <RBtn icon={Link} label="Link" onClick={() => { setDesignView('html'); wrapSelection('<a href="URL">', '</a>'); }} />
                      <RBtn icon={Share2} label="Social link" />
                      <RBtn icon={Calendar} label="Meeting survey" />
                      <RBtn icon={MousePointer} label="One-click survey" />
                      <RBtn icon={Hash} label="Placeholder" onClick={() => setDesignTab('placeholder' as any)} />
                      <RBtn icon={GitBranch} label="Conditional" />
                      <RBtn icon={Trash} label="Remove if blank" />
                      <RBtn icon={Code2} label="HTML snippet" onClick={() => { setDesignView('html'); insertAtCursor('<!-- HTML snippet -->'); }} />
                      <RBtn icon={Type} label="Special character" />
                    </RGroup>
                  </>
                )}

                {designTab === 'email-layout' && (
                  <>
                    <RGroup label="Layout">
                      <RBtn icon={Layout} label="Standard" onClick={() => setForm({ ...form, layout: 'standard' })} active={form.layout === 'standard'} />
                      <RBtn icon={Layout} label="Disclaimer" onClick={() => setForm({ ...form, layout: 'rich', hasBannerZone: true })} active={form.layout === 'rich'} />
                      <RBtn icon={Layout} label="Two column" onClick={() => setForm({ ...form, layout: 'two-column' })} active={form.layout === 'two-column'} />
                      <RBtn icon={Monitor} label="Minimal" onClick={() => setForm({ ...form, layout: 'minimal' })} active={form.layout === 'minimal'} />
                    </RGroup>
                    <RSep />
                    <RGroup label="Options">
                      <div className="flex flex-col gap-1 px-1">
                        {([['hasBannerZone', 'Banner zone'], ['hasQrCode', 'QR Code'], ['hasPhoto', 'Profile photo']] as const).map(([key, lbl]) => (
                          <label key={key} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="w-3 h-3 rounded border-gray-300 text-blue-600" />
                            {lbl}
                          </label>
                        ))}
                      </div>
                    </RGroup>
                  </>
                )}

                {designTab === 'formatting' && (
                  <>
                    <RGroup label="Font">
                      <div className="flex gap-1">
                        <RDrop label="Font family" options={FONT_FAMILIES} onSelect={(f) => wrapSelection(`<span style="font-family:${f};">`, '</span>')} />
                        <RDrop label="Size" options={FONT_SIZES} onSelect={(s) => wrapSelection(`<span style="font-size:${s}px;">`, '</span>')} width="36px" />
                      </div>
                    </RGroup>
                    <RSep />
                    <RGroup label="Style">
                      <div className="flex gap-0.5">
                        <RSmallBtn icon={Bold} label="Bold" onClick={() => wrapSelection('<strong>', '</strong>')} />
                        <RSmallBtn icon={Italic} label="Italic" onClick={() => wrapSelection('<em>', '</em>')} />
                        <RSmallBtn icon={Underline} label="Underline" onClick={() => wrapSelection('<u>', '</u>')} />
                        <RSmallBtn icon={Strikethrough} label="Strikethrough" onClick={() => wrapSelection('<s>', '</s>')} />
                      </div>
                    </RGroup>
                    <RSep />
                    <RGroup label="Lists">
                      <div className="flex gap-0.5">
                        <RSmallBtn icon={List} label="Bullets" onClick={() => wrapSelection('<ul><li>', '</li></ul>')} />
                        <RSmallBtn icon={ListOrdered} label="Numbered" onClick={() => wrapSelection('<ol><li>', '</li></ol>')} />
                        <RSmallBtn icon={Minus} label="Divider" onClick={() => insertAtCursor('<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />')} />
                      </div>
                    </RGroup>
                  </>
                )}

                {/* Placeholder quick-access (shown regardless of tab when user needs it) */}
                {(designTab as string) === 'placeholder' && (
                  <div className="flex items-center gap-1 flex-wrap py-1">
                    {PLACEHOLDERS.map((ph) => (
                      <button key={ph} onClick={() => { setDesignView('html'); insertAtCursor(ph); }} title={`Insert ${ph}`}
                        className="px-2 py-1 text-[10px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors">
                        {ph}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Content area: visual or HTML source ── */}
              <div className="flex-1 min-h-0 flex flex-col">

                {designView === 'visual' ? (
                  /* Visual preview */
                  <div className="flex-1 overflow-auto bg-[#f3f3f3]">
                    <div className="bg-white min-h-full mx-auto max-w-4xl shadow-sm border-x border-gray-200">
                      <iframe
                        srcDoc={previewHtml ? `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;">${previewHtml}</body></html>` : frameContent}
                        title="Signature visual editor"
                        className="w-full"
                        style={{ minHeight: '500px', border: 'none', display: 'block' }}
                        sandbox="allow-same-origin"
                      />
                    </div>
                    {!previewHtml && (
                      <div className="text-center pt-2 pb-4">
                        <p className="text-xs text-gray-400">Showing template HTML preview · <button onClick={() => setDesignView('html')} className="text-blue-500 hover:underline">Switch to HTML source</button> to edit</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Monaco HTML source */
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      language="html"
                      value={form.htmlTemplate}
                      onChange={(val) => setForm((f) => ({ ...f, htmlTemplate: val || '' }))}
                      theme="vs"
                      onMount={(editor) => { editorRef.current = editor; }}
                      options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom nav */}
              <div className="shrink-0 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
                <button onClick={() => setStep('scheduler')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium bg-white">
                  Back
                </button>
                <button onClick={handleSave} disabled={saveMutation.isPending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold">
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Reusable bottom step nav ──────────────────────────────────────────────────

function StepNav({ currentIdx, onBack, onNext, onSave, isPending }: {
  currentIdx: number; onBack: () => void; onNext: () => void; onSave: () => void; isPending: boolean;
}) {
  return (
    <div className="shrink-0 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
      <button onClick={onBack} disabled={currentIdx === 0}
        className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 font-medium bg-white">
        Back
      </button>
      {currentIdx < TEMPLATE_STEPS.length - 1 && (
        <button onClick={onNext}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
          Next
        </button>
      )}
      <button onClick={onSave} disabled={isPending}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold">
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<{ id: string | null; isNew: boolean } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({ cloud: true, outlook: true, autoresponders: true });
  const [search, setSearch] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => templatesApi.clone(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); setSelected(new Set()); },
  });

  const openPreview = async (id: string, name: string) => {
    try {
      const { data } = await templatesApi.preview(id);
      setPreviewHtml(data.html); setPreviewId(id); setPreviewName(name);
    } catch {}
  };

  const openEditor = (id: string) => { setEditing({ id, isNew: false }); setSelected(new Set([id])); };
  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSection = (s: SectionKey) => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const templates: any[] = data?.data || [];
  const filtered = useMemo(() => search.trim() ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : templates, [templates, search]);
  const firstSelected = filtered.find((t: any) => selected.has(t._id));
  const isEditing = !!editing;

  const sections: { key: SectionKey; icon: React.ElementType; label: string; items: any[]; disabled?: boolean }[] = [
    { key: 'cloud', icon: Cloud, label: 'Cloud (server-side) signatures', items: filtered },
    { key: 'outlook', icon: Monitor, label: 'Outlook (client-side) signatures', items: [] },
    { key: 'autoresponders', icon: Mail, label: 'Autoresponders', items: [], disabled: true },
  ];

  return (
    <div className="h-full flex bg-white">

      {/* ── Left: template list ── */}
      <div className={`${isEditing ? 'w-[420px] shrink-0' : 'flex-1'} flex flex-col border-r border-gray-200 overflow-hidden`}>

        {/* Top action bar */}
        {selected.size > 0 ? (
          <div className="flex items-center gap-0 bg-[#3c3c3c] text-white text-sm shrink-0">
            <span className="px-4 py-3 font-medium border-r border-white/20 shrink-0">{selected.size} selected</span>
            {[
              { icon: Edit2, label: 'Edit', action: () => firstSelected && openEditor(firstSelected._id) },
              { icon: Trash2, label: 'Delete', action: () => window.confirm(`Delete ${selected.size} template(s)?`) && [...selected].forEach((id) => deleteMutation.mutate(id)) },
              { icon: EyeOff, label: 'Unpublish', action: () => {} },
              { icon: Download, label: 'Export', action: () => {} },
              { icon: Copy, label: 'Clone', action: () => firstSelected && cloneMutation.mutate(firstSelected._id) },
              { icon: ArrowUp, label: 'Move up', action: () => {} },
              { icon: ArrowDown, label: 'Move down', action: () => {} },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-1.5 px-4 py-3 hover:bg-white/10 border-r border-white/20 transition-colors text-white/80 hover:text-white">
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
            <button onClick={() => { setSelected(new Set()); setEditing(null); }} className="ml-auto px-3 py-3 hover:bg-white/10 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
            <button onClick={() => navigate('/rules/new')}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded text-sm transition-colors">
              <Plus className="w-4 h-4" /> CREATE RULE
            </button>
            <button onClick={() => navigate('/rules')}
              className="flex items-center gap-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold px-4 py-2 rounded text-sm transition-colors">
              <TestTube2 className="w-4 h-4" /> TEST RULES
            </button>
            <div className="relative">
              <button onClick={() => setShowMoreMenu((o) => !o)}
                className="flex items-center justify-center border border-gray-300 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded text-sm transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute left-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1" onMouseLeave={() => setShowMoreMenu(false)}>
                  {['Import templates', 'Export all', 'Reorder signatures'].map((item) => (
                    <button key={item} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">{item}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!isEditing && (
                <button className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded text-sm transition-colors">
                  <LayoutGrid className="w-4 h-4" /> Change view <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 bg-white" />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="w-4 shrink-0" />
              <span className={`${isEditing ? 'w-16' : 'w-32'} shrink-0 pl-1`}>Preview</span>
              <span className="flex-1">Name</span>
              {!isEditing && <span className="w-44 shrink-0">Last edited</span>}
              <span className="w-14 text-center shrink-0">Status</span>
            </div>

            {sections.map(({ key, icon: SectionIcon, label, items, disabled }) => (
              <div key={key}>
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-t border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection(key)}>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openSections[key] ? 'rotate-90' : ''}`} />
                  <SectionIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="text-sm text-gray-400 font-normal">({items.length})</span>
                  {disabled && <span className="text-xs text-gray-400">(disabled)</span>}
                  <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin opacity-40" />
                  {!disabled && items.length > 0 && openSections[key] && (
                    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={items.every((t) => selected.has(t._id))}
                        onChange={() => {
                          if (items.every((t) => selected.has(t._id))) {
                            setSelected((prev) => { const n = new Set(prev); items.forEach((t) => n.delete(t._id)); return n; });
                          } else {
                            setSelected((prev) => { const n = new Set(prev); items.forEach((t) => n.add(t._id)); return n; });
                          }
                        }}
                        className="rounded border-gray-300 w-4 h-4" />
                    </div>
                  )}
                </div>

                {openSections[key] && (
                  items.length === 0 ? (
                    <div className="py-10 text-center bg-white border-b border-gray-100">
                      {disabled ? (
                        <p className="text-sm text-gray-400">This feature is disabled by the administrator.</p>
                      ) : key === 'cloud' ? (
                        <>
                          <p className="text-gray-400 text-sm">No signatures yet.</p>
                          <button onClick={() => setEditing({ id: null, isNew: true })}
                            className="mt-2 text-sm text-blue-600 hover:underline font-medium">+ Create your first signature</button>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">No signatures in this category.</p>
                      )}
                    </div>
                  ) : (
                    items.map((t: any) => (
                      <div key={t._id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors cursor-pointer
                          ${editing?.id === t._id ? 'bg-blue-50 border-l-2 border-l-blue-500' : selected.has(t._id) ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                        onClick={() => openEditor(t._id)}>
                        <input type="checkbox" checked={selected.has(t._id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(t._id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 w-4 h-4 shrink-0" />

                        <div className={`${isEditing ? 'w-16 h-10' : 'w-32 h-20'} border border-gray-200 rounded bg-white overflow-hidden relative shrink-0`}
                          onClick={(e) => { e.stopPropagation(); openPreview(t._id, t.name); }}>
                          <PreviewThumbnailInline id={t._id} compact={isEditing} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                          {t.businessUnit?.name && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.businessUnit.name}</p>}
                          {!isEditing && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {t.hasBannerZone && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Banner</span>}
                              {t.hasQrCode && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">QR</span>}
                              {t.hasPhoto && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium">Photo</span>}
                              {t.isDefault && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Default</span>}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="w-44 shrink-0">
                            <p className="text-xs text-gray-700">{new Date(t.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-xs text-gray-400 mt-0.5">by: {t.updatedBy?.displayName || 'Admin'}</p>
                          </div>
                        )}

                        <div className="w-14 flex flex-col items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <CheckCircle2 className={`w-4 h-4 ${t.isActive ? 'text-green-500' : 'text-gray-300'}`} />
                          <div className="flex gap-0.5">
                            <button onClick={() => openPreview(t._id, t.name)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Preview">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button onClick={() => openEditor(t._id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => cloneMutation.mutate(t._id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Clone">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: wizard panel ── */}
      {editing && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TemplateWizardPanel
            id={editing.id}
            isNew={editing.isNew}
            onClose={() => { setEditing(null); setSelected(new Set()); }}
            onSaved={(newId) => setEditing({ id: newId, isNew: false })}
          />
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewId && previewHtml && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1c2d4a]">
              <div>
                <p className="text-white font-semibold text-sm">{previewName}</p>
                <p className="text-white/50 text-xs">Signature preview</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPreviewId(null); openEditor(previewId); }}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5 rounded">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setPreviewId(null)} className="text-white/60 hover:text-white p-1"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="bg-gray-100 p-8 max-h-[70vh] overflow-y-auto">
              <div className="bg-white border border-gray-200 rounded p-8 shadow-sm">
                <div className="border-b border-gray-100 pb-4 mb-6 space-y-1">
                  <div className="flex gap-2 text-xs text-gray-500"><span className="font-medium w-8">From:</span><span className="text-gray-700">John Smith &lt;john.smith@company.com&gt;</span></div>
                  <div className="flex gap-2 text-xs text-gray-500"><span className="font-medium w-8">To:</span><span className="text-gray-700">client@example.com</span></div>
                  <div className="flex gap-2 text-xs text-gray-500"><span className="font-medium w-8">Sub:</span><span className="text-gray-700 font-medium">Following up on our conversation</span></div>
                </div>
                <p className="text-sm text-gray-700 mb-6 leading-relaxed">Hi,<br /><br />Thank you for taking the time to speak with us.<br /><br />Best regards,</p>
                <div className="border-t border-gray-100 pt-4">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
