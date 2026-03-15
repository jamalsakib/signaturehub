import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersApi, templatesApi, businessUnitsApi } from '../services/api';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signatureHtml, setSignatureHtml] = useState('');
  const [form, setForm] = useState({ role: '', assignedTemplate: '', businessUnit: '' });

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id!).then((r) => r.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data.data),
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data.data),
  });

  useEffect(() => {
    if (user) {
      setForm({
        role: user.role || 'viewer',
        assignedTemplate: user.assignedTemplate?._id || '',
        businessUnit: user.businessUnit?._id || '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => usersApi.sync(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
  });

  const loadSignature = async () => {
    try {
      const { data } = await usersApi.getSignature(id!, true);
      setSignatureHtml(data.html);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <div className="text-gray-500">User not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Re-sync
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* User attributes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Azure AD Attributes</h2>
          {[
            ['Job Title', user.jobTitle],
            ['Department', user.department],
            ['Company', user.company],
            ['Office Location', user.officeLocation],
            ['Business Phone', user.businessPhone],
            ['Mobile', user.mobilePhone],
            ['City', user.city],
            ['Country', user.country],
            ['Last Synced', user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Platform settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Platform Settings</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
            <select
              value={form.businessUnit}
              onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Auto-assigned by rules</option>
              {(businessUnits || []).map((bu: any) => (
                <option key={bu._id} value={bu._id}>{bu.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Template Override</label>
            <select
              value={form.assignedTemplate}
              onChange={(e) => setForm({ ...form, assignedTemplate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Auto-assigned by rules</option>
              {(templates || []).map((t: any) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Signature preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Signature Preview</h2>
          <button
            onClick={loadSignature}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Load Preview
          </button>
        </div>
        {signatureHtml ? (
          <div
            className="border border-gray-200 rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: signatureHtml }}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
            Click "Load Preview" to render this user's signature
          </div>
        )}
      </div>
    </div>
  );
}
