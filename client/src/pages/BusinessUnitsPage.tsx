import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Globe, Phone } from 'lucide-react';
import { businessUnitsApi } from '../services/api';

export function BusinessUnitsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      d._id ? businessUnitsApi.update(d._id, d) : businessUnitsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessUnitsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-units'] }),
  });

  const units = data?.data || [];

  return (
    <div className="px-8 py-6 space-y-6 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Units</h1>
          <p className="text-gray-500 mt-1">{units.length} business units configured</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Business Unit
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {units.map((unit: any) => (
            <div key={unit._id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {unit.branding?.logoUrl ? (
                    <img src={unit.branding.logoUrl} alt={unit.name} className="h-10 w-auto object-contain" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: unit.branding?.primaryColor || '#2563eb' }}
                    >
                      {unit.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                    <p className="text-xs text-gray-500">{unit.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(unit); setShowForm(true); }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.confirm('Deactivate this business unit?') && deleteMutation.mutate(unit._id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                {unit.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <a href={unit.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                      {unit.website}
                    </a>
                  </div>
                )}
                {unit.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {unit.phone}
                  </div>
                )}
              </div>

              {/* Color swatches */}
              <div className="flex gap-2 mt-4">
                {['primaryColor', 'secondaryColor', 'accentColor'].map((key) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: unit.branding?.[key] }}
                      title={unit.branding?.[key]}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <BusinessUnitForm
          initial={editing}
          onSave={(d) => saveMutation.mutate(d)}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function BusinessUnitForm({ initial, onSave, onClose, saving }: {
  initial: any; onSave: (d: any) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    _id: initial?._id || undefined,
    name: initial?.name || '',
    description: initial?.description || '',
    website: initial?.website || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    legalDisclaimer: initial?.legalDisclaimer || '',
    emailDomains: (initial?.emailDomains || []).join(', '),
    branding: {
      primaryColor: initial?.branding?.primaryColor || '#000000',
      secondaryColor: initial?.branding?.secondaryColor || '#ffffff',
      accentColor: initial?.branding?.accentColor || '#0078d4',
      fontFamily: initial?.branding?.fontFamily || 'Arial, sans-serif',
      logoUrl: initial?.branding?.logoUrl || '',
      logoAltText: initial?.branding?.logoAltText || '',
      logoWidth: initial?.branding?.logoWidth || 150,
      logoHeight: initial?.branding?.logoHeight || 50,
    },
  });

  const handleSubmit = () => {
    onSave({
      ...form,
      emailDomains: form.emailDomains.split(',').map((s: string) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{form._id ? 'Edit Business Unit' : 'New Business Unit'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              ['name', 'Name *', 'text'],
              ['website', 'Website', 'url'],
              ['phone', 'Phone', 'text'],
              ['emailDomains', 'Email Domains (comma-separated)', 'text'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type as string}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Disclaimer</label>
            <textarea
              value={form.legalDisclaimer}
              onChange={(e) => setForm({ ...form, legalDisclaimer: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-3">Branding</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  value={form.branding.logoUrl}
                  onChange={(e) => setForm({ ...form, branding: { ...form.branding, logoUrl: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              {['primaryColor', 'secondaryColor', 'accentColor'].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(form.branding as any)[key]}
                        onChange={(e) => setForm({ ...form, branding: { ...form.branding, [key]: e.target.value } })}
                        className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={(form.branding as any)[key]}
                        onChange={(e) => setForm({ ...form, branding: { ...form.branding, [key]: e.target.value } })}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
