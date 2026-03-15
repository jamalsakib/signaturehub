import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, Copy } from 'lucide-react';
import { assetsApi, businessUnitsApi } from '../services/api';
import { cn } from '../utils/cn';

const TYPE_OPTIONS = ['logo', 'banner', 'icon', 'photo', 'other'];
const TYPE_BADGE: Record<string, string> = {
  logo: 'bg-blue-100 text-blue-700',
  banner: 'bg-green-100 text-green-700',
  icon: 'bg-purple-100 text-purple-700',
  photo: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

export function AssetsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [uploadType, setUploadType] = useState('logo');
  const [uploadBu, setUploadBu] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', typeFilter],
    queryFn: () => assetsApi.list({ type: typeFilter || undefined, limit: 100 }).then((r) => r.data),
  });

  const { data: businessUnits } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);
        if (uploadBu) formData.append('businessUnit', uploadBu);
        await assetsApi.upload(formData);
      }
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [uploadType, uploadBu]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] },
    multiple: true,
  });

  const assets = data?.data || [];

  return (
    <div className="px-8 py-6 space-y-6 max-w-screen-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Library</h1>
        <p className="text-gray-500 mt-1">Logos, banners, and icons used in signatures</p>
      </div>

      {/* Upload area */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Upload Asset</h3>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Business Unit</label>
            <select value={uploadBu} onChange={(e) => setUploadBu(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">Global</option>
              {(businessUnits || []).map((bu: any) => <option key={bu._id} value={bu._id}>{bu.name}</option>)}
            </select>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          {uploading ? (
            <p className="text-sm text-blue-600 font-medium">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-sm text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Drag & drop files, or click to select</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP, SVG — max 10MB</p>
            </>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', ...TYPE_OPTIONS].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map((asset: any) => (
            <div key={asset._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
              <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="max-w-full max-h-full object-contain p-2"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(asset.url); }}
                    className="p-1.5 bg-white rounded-lg"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => window.confirm('Delete this asset?') && deleteMutation.mutate(asset._id)}
                    className="p-1.5 bg-white rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-gray-800 truncate">{asset.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', TYPE_BADGE[asset.type] || TYPE_BADGE.other)}>
                    {asset.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {asset.width && asset.height ? `${asset.width}×${asset.height}` : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!assets.length && (
            <div className="col-span-5 text-center py-12 text-gray-400">No assets uploaded yet</div>
          )}
        </div>
      )}
    </div>
  );
}
