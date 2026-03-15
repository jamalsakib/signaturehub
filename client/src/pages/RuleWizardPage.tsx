import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag, Users, UserCheck, Type, Clock, GitMerge, Layout,
  Plus, X, CheckCircle2, AlertCircle, RefreshCw,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image, Table, Code, FileText, Grid, Hash, ChevronDown,
  Minus, Save, ArrowLeft, Pencil, HelpCircle,
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { rulesApi, templatesApi, businessUnitsApi } from '../services/api';

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'name',       icon: Flag,      label: 'Name' },
  { id: 'senders',    icon: Users,     label: 'Senders' },
  { id: 'recipients', icon: UserCheck, label: 'Recipients' },
  { id: 'keywords',   icon: Type,      label: 'Keywords' },
  { id: 'scheduler',  icon: Clock,     label: 'Scheduler' },
  { id: 'logic',      icon: GitMerge,  label: 'Logic' },
  { id: 'design',     icon: Layout,    label: 'Design' },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type DesignTab = 'main' | 'email-layout' | 'formatting' | 'table' | 'placeholder';

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
const FIELD_OPTIONS = ['department', 'company', 'emailDomain', 'group', 'jobTitle', 'officeLocation', 'country'];
const OPERATOR_OPTIONS = ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'in'];

// ─── Ribbon helpers ───────────────────────────────────────────────────────────

function RSep() { return <div className="w-px h-8 bg-gray-300 mx-1 shrink-0" />; }

function RBtn({ icon: Icon, label, onClick, active, disabled }: {
  icon?: React.ElementType; label?: string; onClick?: () => void;
  active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded text-xs transition-colors shrink-0
        ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {label && <span className="text-[10px] leading-none whitespace-nowrap font-medium">{label}</span>}
    </button>
  );
}

function RSmallBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0">
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
        <span className="truncate max-w-[80px]">{label}</span>
        <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400" />
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
      <div className="border border-gray-300 rounded-lg min-h-[100px] bg-white mb-2 overflow-y-auto max-h-40">
        {items.length === 0 ? <p className="text-sm text-gray-400 p-4">No entries yet</p> : items.map((item) => (
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
        <button onClick={() => items.length && onRemove(items[items.length - 1])} disabled={!items.length}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-red-500 hover:bg-red-50 disabled:opacity-40 font-medium">
          <X className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepName({ form, setForm }: any) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">This rule will add a signature to emails in your organisation based on the conditions you set up. To start, name this rule and go to the next step.</p>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Rule name:</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. All Employees — Corporate Standard" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Rule description (optional):</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6} placeholder="Describe what this rule does..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>
    </div>
  );
}

function StepSenders({ form, setForm }: any) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">Select which users trigger this signature rule and get the signature in their emails.</p>
      <TagList label="Add the signature to emails sent by these users:"
        sublabel="Enter individual email addresses or group names."
        items={form.senderIncludes}
        onAdd={(v) => setForm({ ...form, senderIncludes: [...form.senderIncludes, v] })}
        onRemove={(v) => setForm({ ...form, senderIncludes: form.senderIncludes.filter((x: string) => x !== v) })} />
      <TagList label="Do not add the signature to emails sent by these users (exceptions):"
        items={form.senderExcludes}
        onAdd={(v) => setForm({ ...form, senderExcludes: [...form.senderExcludes, v] })}
        onRemove={(v) => setForm({ ...form, senderExcludes: form.senderExcludes.filter((x: string) => x !== v) })} />
    </div>
  );
}

function StepRecipients({ form, setForm }: any) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">This signature rule can apply to emails sent to anyone or to specific recipients only.</p>
      <TagList label="Add the signature to emails sent to these recipients:"
        sublabel='Use "All recipients" for no restriction.'
        items={form.recipientIncludes.length === 0 ? ['All recipients'] : form.recipientIncludes}
        onAdd={(v) => { const list = form.recipientIncludes.filter((x: string) => x !== 'All recipients'); setForm({ ...form, recipientIncludes: [...list, v] }); }}
        onRemove={(v) => { if (v === 'All recipients') return; setForm({ ...form, recipientIncludes: form.recipientIncludes.filter((x: string) => x !== v) }); }} />
      <TagList label="Do not add the signature to emails sent to these recipients (exceptions):"
        items={form.recipientExcludes}
        onAdd={(v) => setForm({ ...form, recipientExcludes: [...form.recipientExcludes, v] })}
        onRemove={(v) => setForm({ ...form, recipientExcludes: form.recipientExcludes.filter((x: string) => x !== v) })} />
    </div>
  );
}

function StepKeywords({ form, setForm }: any) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">Optionally restrict this rule to only apply when the email subject or body contains specific keywords.</p>
      <TagList label="Apply rule only when email contains these keywords (leave empty for no restriction):"
        sublabel="Each keyword can be a word or phrase."
        items={form.keywords}
        onAdd={(v) => setForm({ ...form, keywords: [...form.keywords, v] })}
        onRemove={(v) => setForm({ ...form, keywords: form.keywords.filter((x: string) => x !== v) })} />
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 font-medium mb-2">Keyword matching</p>
        <div className="flex gap-4">
          {['Any keyword matches', 'All keywords match'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="keywordMatch" checked={form.keywordMatch === opt}
                onChange={() => setForm({ ...form, keywordMatch: opt })} className="text-blue-600" />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepScheduler({ form, setForm }: any) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">Optionally limit when this rule is active. Leave blank to always apply.</p>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Active from:</label>
            <input type="datetime-local" value={form.activeFrom} onChange={(e) => setForm({ ...form, activeFrom: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Active until:</label>
            <input type="datetime-local" value={form.activeUntil} onChange={(e) => setForm({ ...form, activeUntil: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Active days of the week:</label>
          <div className="flex gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <button key={day}
                onClick={() => { const days: string[] = form.activeDays || []; setForm({ ...form, activeDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] }); }}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${(form.activeDays || []).includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {day}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Priority:</label>
          <p className="text-xs text-gray-500 mb-2">Lower number = evaluated first. Default is 100.</p>
          <input type="number" value={form.priority} min={1} max={999}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  );
}

function StepLogic({ form, setForm }: any) {
  const addCondition = () => setForm({ ...form, conditions: [...form.conditions, { field: 'department', operator: 'equals', value: '' }] });
  const removeCondition = (i: number) => setForm({ ...form, conditions: form.conditions.filter((_: any, idx: number) => idx !== i) });
  const updateCondition = (i: number, key: string, value: string) => {
    const conditions = [...form.conditions]; conditions[i] = { ...conditions[i], [key]: value }; setForm({ ...form, conditions });
  };
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-600 mb-6">Define conditions that must be met for this rule to apply.</p>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Condition logic:</label>
          <div className="flex gap-6">
            {['AND', 'OR'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="logic" checked={form.logic === opt} onChange={() => setForm({ ...form, logic: opt })} className="text-blue-600" />
                <span><strong>{opt}</strong> — {opt === 'AND' ? 'all conditions must match' : 'any condition must match'}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-800">Conditions:</label>
            <button onClick={addCondition} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add condition
            </button>
          </div>
          <div className="space-y-2">
            {form.conditions.map((c: any, i: number) => (
              <div key={i} className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
                <span className="text-xs text-gray-400 font-medium w-5 text-center">{i + 1}</span>
                <select value={c.field} onChange={(e) => updateCondition(i, 'field', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={c.operator} onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {OPERATOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input value={c.value} onChange={(e) => updateCondition(i, 'value', e.target.value)} placeholder="value"
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {!form.conditions.length && (
              <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
                No conditions — rule will apply to all users
              </div>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 w-4 h-4" />
          Rule is active
        </label>
      </div>
    </div>
  );
}

// ─── Design step ──────────────────────────────────────────────────────────────

function DesignEditorPanel({
  templateHtml, setTemplateHtml, designTab, setDesignTab, editorRef,
  previewHtml, previewLoading, onPreview, onClose,
}: any) {
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

  const TABS: { id: DesignTab; label: string; icon: React.ElementType }[] = [
    { id: 'main', label: 'Main', icon: FileText },
    { id: 'email-layout', label: 'Email layout', icon: Layout },
    { id: 'formatting', label: 'Formatting', icon: Code },
    { id: 'table', label: 'Table layout', icon: Grid },
    { id: 'placeholder', label: 'Placeholder', icon: Hash },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Ribbon tab bar — dark, matching CodeTwo */}
      <div className="flex items-stretch bg-[#1c2128] shrink-0">
        <button onClick={onClose}
          className="flex items-center justify-center px-4 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Back to preview">
          <ArrowLeft className="w-4 h-4" />
        </button>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setDesignTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors shrink-0
              ${designTab === tab.id
                ? 'border-blue-400 text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pr-4">
          <button onClick={onPreview} disabled={previewLoading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-semibold">
            {previewLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            Preview
          </button>
        </div>
      </div>

      {/* Ribbon actions */}
      <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-gray-200 shrink-0 min-h-[52px] overflow-x-auto">
        {designTab === 'main' && (
          <>
            <RBtn icon={Save} label="Apply & Close" onClick={onClose} />
            <RSep />
            <RBtn icon={FileText} label="Signature preview" onClick={onPreview} disabled={previewLoading} />
            <RSep />
            <RBtn icon={Code} label="HTML source" active />
            <RBtn icon={FileText} label="Plain text" />
          </>
        )}
        {designTab === 'email-layout' && (
          <>
            <RBtn icon={Layout} label="Standard" />
            <RBtn icon={Layout} label="With disclaimer" />
            <RBtn icon={Layout} label="Two column" />
            <RBtn icon={Layout} label="Minimal" />
          </>
        )}
        {designTab === 'formatting' && (
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
        {designTab === 'table' && (
          <>
            <RBtn icon={Table} label="Insert table" onClick={() => insertAtCursor('<table cellpadding="4" cellspacing="0" border="0" style="border-collapse:collapse;">\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>\n  <tr>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n    <td style="border:1px solid #e5e7eb;padding:4px 8px;">&nbsp;</td>\n  </tr>\n</table>')} />
            <RBtn icon={Table} label="Add row ↓" onClick={() => insertAtCursor('\n  <tr>\n    <td style="padding:4px 8px;">&nbsp;</td>\n    <td style="padding:4px 8px;">&nbsp;</td>\n  </tr>')} />
            <RBtn icon={Grid} label="2×2 grid" onClick={() => insertAtCursor('<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;">\n  <tr>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;width:50%;">&nbsp;</td>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;width:50%;">&nbsp;</td>\n  </tr>\n  <tr>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;">&nbsp;</td>\n    <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;">&nbsp;</td>\n  </tr>\n</table>')} />
          </>
        )}
        {designTab === 'placeholder' && (
          <div className="flex items-center gap-1 flex-wrap">
            {PLACEHOLDERS.map((ph) => (
              <button key={ph} onClick={() => insertAtCursor(ph)} title={`Insert ${ph}`}
                className="px-2 py-1 text-[10px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors">
                {ph}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="html"
          value={templateHtml}
          onChange={(val) => setTemplateHtml(val || '')}
          theme="vs"
          onMount={(editor) => { editorRef.current = editor; }}
          options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }}
        />
      </div>

      {/* Preview panel (if active) */}
      {previewHtml && (
        <div className="h-64 shrink-0 flex flex-col border-t border-gray-200">
          <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-1.5 shrink-0">
            <span className="text-xs font-medium text-gray-500">Signature preview</span>
            <button onClick={() => {}} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
            <div className="bg-white border border-gray-200 rounded p-5 shadow-sm inline-block min-w-full">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDesign({ form, setForm, templates, businessUnits, templateHtml, setTemplateHtml, designTab, setDesignTab, editorRef, previewHtml, setPreviewHtml, previewLoading, onPreview }: any) {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);

  // Auto-preview when template is selected and not in edit mode
  useEffect(() => {
    if (form.assignTemplate && previewHtml === '' && !editMode) {
      onPreview();
    }
  }, [form.assignTemplate]);

  if (editMode) {
    return (
      <DesignEditorPanel
        templateHtml={templateHtml}
        setTemplateHtml={setTemplateHtml}
        designTab={designTab}
        setDesignTab={setDesignTab}
        editorRef={editorRef}
        previewHtml={previewHtml}
        previewLoading={previewLoading}
        onPreview={onPreview}
        onClose={() => { setEditMode(false); onPreview(); }}
      />
    );
  }

  // ── Preview / default mode ──
  return (
    <div className="overflow-y-auto h-full px-8 py-6">
      <p className="text-sm text-gray-600 mb-6">
        Design the signature for this rule. You can use the built-in and custom templates from within the editor to give yourself a head start.
      </p>

      {/* Conversation appearance */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Choose how you want the signature to appear in email conversations:
        </label>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-lg w-full">
          <option>The same signature in every email (most common scenario)</option>
          <option>Only on the first email in a conversation</option>
          <option>Different signatures for new vs. reply emails</option>
        </select>
      </div>

      {/* Plain text option */}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-5">
        <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 w-4 h-4" />
        Convert plain text emails to HTML (recommended)
        <HelpCircle className="w-4 h-4 text-gray-400" />
      </label>

      {/* Template selector */}
      <div className="mb-5 max-w-lg">
        <label className="block text-sm font-semibold text-gray-800 mb-2">Signature template *</label>
        <div className="flex gap-2">
          <select value={form.assignTemplate} onChange={(e) => { setForm({ ...form, assignTemplate: e.target.value }); setPreviewHtml(''); }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select a template —</option>
            {templates.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <select value={form.assignBusinessUnit} onChange={(e) => setForm({ ...form, assignBusinessUnit: e.target.value })}
            className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">No business unit</option>
            {businessUnits.map((bu: any) => <option key={bu._id} value={bu._id}>{bu.name}</option>)}
          </select>
        </div>
      </div>

      {/* Edit signature button */}
      {form.assignTemplate && (
        <button
          onClick={() => setEditMode(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold mb-6 shadow-sm"
        >
          <Pencil className="w-4 h-4" />
          Edit signature
        </button>
      )}

      {/* Signature preview box */}
      {form.assignTemplate && (
        <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white max-w-3xl">
          {previewLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : previewHtml ? (
            <>
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Signature preview</span>
                <button onClick={onPreview} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="p-6">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Layout className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">Click refresh to load preview</p>
              <button onClick={onPreview} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Load preview
              </button>
            </div>
          )}
        </div>
      )}

      {!form.assignTemplate && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center h-48 max-w-3xl text-gray-400">
          <Layout className="w-10 h-10 mb-2 text-gray-300" />
          <p className="text-sm font-medium">Select a template above to preview it here</p>
          <button onClick={() => navigate('/templates/new')} className="mt-2 text-xs text-blue-600 hover:underline">
            + Create a new template
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', description: '', logic: 'AND', priority: 100, isActive: true,
  conditions: [] as any[], assignTemplate: '', assignBusinessUnit: '',
  senderIncludes: [] as string[], senderExcludes: [] as string[],
  recipientIncludes: [] as string[], recipientExcludes: [] as string[],
  keywords: [] as string[], keywordMatch: 'Any keyword matches',
  activeFrom: '', activeUntil: '',
  activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
};

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function RuleWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isNew = !id;
  const editorRef = useRef<any>(null);

  const [step, setStep] = useState<StepId>('name');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [templateHtml, setTemplateHtml] = useState('');
  const [designTab, setDesignTab] = useState<DesignTab>('main');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list().then((r) => r.data.data) });
  const { data: businessUnitsData } = useQuery({ queryKey: ['business-units'], queryFn: () => businessUnitsApi.list().then((r) => r.data.data) });

  useQuery({
    queryKey: ['rule', id],
    queryFn: () => rulesApi.get(id!).then((r) => r.data),
    enabled: !!id,
    onSuccess: (data: any) => {
      setForm({ ...EMPTY_FORM, name: data.name || '', description: data.description || '', logic: data.logic || 'AND', priority: data.priority || 100, isActive: data.isActive !== false, conditions: data.conditions || [], assignTemplate: data.assignTemplate?._id || data.assignTemplate || '', assignBusinessUnit: data.assignBusinessUnit?._id || data.assignBusinessUnit || '', senderIncludes: data.senderIncludes || [], senderExcludes: data.senderExcludes || [], recipientIncludes: data.recipientIncludes || [], recipientExcludes: data.recipientExcludes || [], keywords: data.keywords || [] });
    },
  } as any);

  // Load template HTML when assignTemplate changes
  useEffect(() => {
    if (form.assignTemplate) {
      setPreviewHtml('');
      templatesApi.get(form.assignTemplate).then((r) => setTemplateHtml(r.data.htmlTemplate || '')).catch(() => setTemplateHtml(''));
    } else {
      setTemplateHtml('');
    }
  }, [form.assignTemplate]);

  const mutation = useMutation({
    mutationFn: async (d: any) => {
      if (form.assignTemplate && templateHtml) {
        try {
          const tplRes = await templatesApi.get(form.assignTemplate);
          if (tplRes.data.htmlTemplate !== templateHtml) {
            await templatesApi.update(form.assignTemplate, { htmlTemplate: templateHtml });
          }
        } catch {}
      }
      return isNew ? rulesApi.create(d) : rulesApi.update(id!, d);
    },
    onMutate: () => { setSaveStatus('saving'); setSaveError(''); },
    onSuccess: () => { setSaveStatus('saved'); queryClient.invalidateQueries({ queryKey: ['rules'] }); queryClient.invalidateQueries({ queryKey: ['templates'] }); setTimeout(() => navigate('/rules'), 1000); },
    onError: (err: any) => { setSaveStatus('error'); setSaveError(err?.response?.data?.error || err?.message || 'Save failed'); },
  });

  const handleSave = () => {
    if (!form.name.trim()) { setSaveStatus('error'); setSaveError('Rule name is required.'); setStep('name'); return; }
    if (!form.assignTemplate) { setSaveStatus('error'); setSaveError('Please select a signature template.'); setStep('design'); return; }
    mutation.mutate({ ...form });
  };

  const handlePreview = async () => {
    if (!form.assignTemplate) return;
    setPreviewLoading(true);
    try {
      const { data } = await templatesApi.preview(form.assignTemplate, { htmlTemplate: templateHtml } as any);
      setPreviewHtml(data.html);
    } catch {}
    finally { setPreviewLoading(false); }
  };

  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const isDesign = step === 'design';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/rules')} className="flex items-center justify-center p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Back to rules">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800">{isNew ? 'New rule' : `Edit: ${form.name || '...'}`}</span>
          {saveStatus === 'saved' && <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
          {saveStatus === 'error' && saveError && <span className="flex items-center gap-1 text-red-600 text-xs max-w-xs truncate"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {saveError}</span>}
        </div>
        <button onClick={handleSave} disabled={mutation.isPending}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded text-sm font-semibold">
          <Save className="w-3.5 h-3.5" />
          {mutation.isPending ? 'Saving...' : 'Save & Publish'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left step nav — matches CodeTwo exactly */}
        <div className="w-[210px] shrink-0 bg-[#f8f9fa] border-r border-gray-200 flex flex-col">
          {STEPS.map((s) => {
            const isActive = s.id === step;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-3 px-5 py-5 text-left border-b border-gray-200 transition-all relative
                  ${isActive
                    ? 'bg-blue-50 border-l-[3px] border-l-blue-500 text-blue-700'
                    : 'border-l-[3px] border-l-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isDesign ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <StepDesign
                form={form} setForm={setForm}
                templates={templates || []} businessUnits={businessUnitsData || []}
                templateHtml={templateHtml} setTemplateHtml={setTemplateHtml}
                designTab={designTab} setDesignTab={setDesignTab}
                editorRef={editorRef}
                previewHtml={previewHtml} setPreviewHtml={setPreviewHtml}
                previewLoading={previewLoading} onPreview={handlePreview}
              />
            </div>
          ) : (
            <>
              <div className="px-8 pt-6 pb-1 shrink-0">
                <h2 className="text-xl font-bold text-gray-900">{STEPS.find((s) => s.id === step)?.label}</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-4">
                {step === 'name'       && <StepName form={form} setForm={setForm} />}
                {step === 'senders'    && <StepSenders form={form} setForm={setForm} />}
                {step === 'recipients' && <StepRecipients form={form} setForm={setForm} />}
                {step === 'keywords'   && <StepKeywords form={form} setForm={setForm} />}
                {step === 'scheduler'  && <StepScheduler form={form} setForm={setForm} />}
                {step === 'logic'      && <StepLogic form={form} setForm={setForm} />}
              </div>
            </>
          )}

          {/* Bottom nav */}
          <div className="shrink-0 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
            <button
              onClick={() => currentIdx > 0 && setStep(STEPS[currentIdx - 1].id)}
              disabled={currentIdx === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 font-medium bg-white"
            >
              Back
            </button>
            {currentIdx < STEPS.length - 1 && (
              <button
                onClick={() => setStep(STEPS[currentIdx + 1].id)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                Next
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold"
            >
              {mutation.isPending ? 'Saving...' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
