import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3, Pause, Play, Trash2 } from 'lucide-react';
import { campaignsApi } from '../services/api';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-600',
};

export function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list({ limit: 100 }).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      campaignsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const campaigns = data?.data || [];

  return (
    <div className="px-8 py-6 space-y-6 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Campaigns</h1>
          <p className="text-gray-500 mt-1">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Impressions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Clicks</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CTR</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c: any) => {
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.businessUnit?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(c.startDate), 'MMM d')} – {format(new Date(c.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[c.status] || '')}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{ctr}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/campaigns/${c._id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        {c.status === 'active' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: c._id, status: 'paused' })}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : c.status === 'paused' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: c._id, status: 'active' })}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => window.confirm('Delete this campaign?') && deleteMutation.mutate(c._id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!campaigns.length && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No campaigns yet.{' '}
                    <button onClick={() => setShowCreate(true)} className="text-blue-600 hover:underline">Create your first campaign</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create campaign modal */}
      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} onSave={() => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); setShowCreate(false); }} />}
    </div>
  );
}

function CreateCampaignModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '', bannerImageUrl: '', redirectUrl: '', priority: 5,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => campaignsApi.create(d),
    onSuccess: onSave,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">New Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
            <input value={form.bannerImageUrl} onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
              placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URL</label>
            <input value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
              placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name || !form.startDate || !form.endDate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
          >
            {mutation.isPending ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
