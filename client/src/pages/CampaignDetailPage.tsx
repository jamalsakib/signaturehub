import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MousePointer, Eye, TrendingUp } from 'lucide-react';
import { campaignsApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => campaignsApi.analytics(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (!campaign) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ctr = analytics?.campaign?.ctr || 0;
  const clickData = analytics?.clicksByDay || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-gray-500">{campaign.businessUnit?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Impressions', value: campaign.impressions?.toLocaleString() || 0, icon: Eye, color: 'bg-blue-600' },
          { label: 'Clicks', value: campaign.clicks?.toLocaleString() || 0, icon: MousePointer, color: 'bg-green-600' },
          { label: 'CTR', value: `${ctr}%`, icon: TrendingUp, color: 'bg-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Click chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Clicks Over Time</h3>
        {analyticsLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clickData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={clickData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-12">No click data yet</p>
        )}
      </div>

      {/* Campaign details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaign Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Status', campaign.status],
            ['Start Date', campaign.startDate ? format(new Date(campaign.startDate), 'MMM d, yyyy') : '—'],
            ['End Date', campaign.endDate ? format(new Date(campaign.endDate), 'MMM d, yyyy') : '—'],
            ['Priority', campaign.priority],
            ['Redirect URL', campaign.redirectUrl],
            ['UTM Campaign', campaign.utmCampaign || '—'],
            ['Target Departments', campaign.targetDepartments?.join(', ') || 'All'],
            ['Target Groups', campaign.targetGroups?.join(', ') || 'All'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-gray-500 text-xs">{label}</span>
              <span className="font-medium text-gray-800 truncate">{value}</span>
            </div>
          ))}
        </div>

        {campaign.bannerImageUrl && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Banner Image</p>
            <img
              src={campaign.bannerImageUrl}
              alt={campaign.bannerAltText || 'Banner'}
              className="max-w-full rounded-lg border border-gray-200"
              style={{ maxHeight: 120 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
