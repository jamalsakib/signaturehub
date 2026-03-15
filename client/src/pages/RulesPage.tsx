import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, PlayCircle, XCircle } from 'lucide-react';
import { rulesApi, templatesApi, businessUnitsApi } from '../services/api';

const FIELD_OPTIONS = ['department', 'company', 'emailDomain', 'group', 'jobTitle', 'officeLocation', 'country'];
const OPERATOR_OPTIONS = ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'in'];

export function RulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('');

  const { data: rulesData } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesApi.list().then((r) => r.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data.data),
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  });

  const reapplyMutation = useMutation({
    mutationFn: () => rulesApi.reapply(),
  });

  const rules = rulesData?.data || [];

  return (
    <div className="px-8 py-6 space-y-6 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signature Rules</h1>
          <p className="text-gray-500 mt-1">Auto-assign templates based on user attributes. Evaluated in priority order.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => reapplyMutation.mutate()}
            disabled={reapplyMutation.isPending}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm"
          >
            <PlayCircle className="w-4 h-4" />
            {reapplyMutation.isPending ? 'Applying...' : 'Re-apply All Rules'}
          </button>
          <button
            onClick={() => navigate('/rules/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>
      </div>

      {reapplyMutation.data && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {(reapplyMutation.data as any).data?.message}
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {rules.map((rule: any, idx: number) => (
          <div key={rule._id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <p className="text-xs text-gray-500">
                    → {rule.assignTemplate?.name} {rule.assignBusinessUnit ? `| ${rule.assignBusinessUnit?.name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => navigate(`/rules/${rule._id}/edit`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded ml-1">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.confirm('Delete this rule?') && deleteMutation.mutate(rule._id)}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 font-medium py-0.5">IF</span>
              {rule.conditions.map((c: any, i: number) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  {c.field} {c.operator} "{Array.isArray(c.value) ? c.value.join(', ') : c.value}"
                </span>
              ))}
              <span className="text-xs text-gray-500 font-medium">[{rule.logic}]</span>
            </div>
          </div>
        ))}
        {!rules.length && (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
            No rules defined. Create your first rule to auto-assign signatures.
          </div>
        )}
      </div>

      {showForm && (
        <RuleForm
          initial={editing}
          templates={templates || []}
          businessUnits={businessUnits || []}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['rules'] });
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RuleForm({ initial, templates, businessUnits, onClose, onSave }: any) {
  const [form, setForm] = useState({
    _id: initial?._id,
    name: initial?.name || '',
    logic: initial?.logic || 'AND',
    priority: initial?.priority || 100,
    assignTemplate: initial?.assignTemplate?._id || initial?.assignTemplate || '',
    assignBusinessUnit: initial?.assignBusinessUnit?._id || initial?.assignBusinessUnit || '',
    conditions: initial?.conditions || [{ field: 'department', operator: 'equals', value: '' }],
    isActive: initial?.isActive !== false,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => d._id ? rulesApi.update(d._id, d) : rulesApi.create(d),
    onSuccess: onSave,
  });

  const addCondition = () =>
    setForm({ ...form, conditions: [...form.conditions, { field: 'department', operator: 'equals', value: '' }] });

  const removeCondition = (i: number) =>
    setForm({ ...form, conditions: form.conditions.filter((_: any, idx: number) => idx !== i) });

  const updateCondition = (i: number, key: string, value: string) => {
    const conditions = [...form.conditions];
    conditions[i] = { ...conditions[i], [key]: value };
    setForm({ ...form, conditions });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold">{form._id ? 'Edit Rule' : 'New Rule'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logic</label>
              <select value={form.logic} onChange={(e) => setForm({ ...form, logic: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="AND">AND (all must match)</option>
                <option value="OR">OR (any must match)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (lower = first)</label>
              <input type="number" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Conditions</label>
              <button onClick={addCondition} className="text-xs text-blue-600 hover:text-blue-700">+ Add condition</button>
            </div>
            <div className="space-y-2">
              {form.conditions.map((c: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={c.field} onChange={(e) => updateCondition(i, 'field', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs flex-1">
                    {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={c.operator} onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs flex-1">
                    {OPERATOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input value={c.value} onChange={(e) => updateCondition(i, 'value', e.target.value)}
                    placeholder="value"
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs flex-1" />
                  <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Template *</label>
            <select value={form.assignTemplate} onChange={(e) => setForm({ ...form, assignTemplate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select template...</option>
              {templates.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Business Unit (optional)</label>
            <select value={form.assignBusinessUnit} onChange={(e) => setForm({ ...form, assignBusinessUnit: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">None</option>
              {businessUnits.map((bu: any) => <option key={bu._id} value={bu._id}>{bu.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name || !form.assignTemplate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
          >
            {mutation.isPending ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
