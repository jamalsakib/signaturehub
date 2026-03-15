import { useQuery } from '@tanstack/react-query';
import { Users, FileCode2, Megaphone, MousePointer, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { analyticsApi, syncApi } from '../services/api';
import { useState } from 'react';

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [syncing, setSyncing] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.syncAll();
      refetch();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="px-8 py-6 space-y-8 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your email signature platform</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Users'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.users?.total?.toLocaleString() || 0}
          sub={`${stats.users?.active || 0} active`}
          icon={Users}
          color="bg-blue-600"
        />
        <StatCard
          title="Signature Templates"
          value={stats.templates?.total || 0}
          icon={FileCode2}
          color="bg-purple-600"
        />
        <StatCard
          title="Active Campaigns"
          value={stats.campaigns?.active || 0}
          icon={Megaphone}
          color="bg-orange-500"
        />
        <StatCard
          title="Click-Through Rate"
          value={`${stats.engagement?.ctr || 0}%`}
          sub={`${stats.engagement?.clicks?.toLocaleString() || 0} clicks`}
          icon={MousePointer}
          color="bg-green-600"
        />
      </div>

      {/* Engagement row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by department */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Users by Department</h3>
          <div className="space-y-3">
            {(stats.usersByDepartment || []).map((dept: any) => (
              <div key={dept._id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-36 truncate">{dept._id}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (dept.count / (stats.users?.active || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{dept.count}</span>
              </div>
            ))}
            {!stats.usersByDepartment?.length && (
              <p className="text-sm text-gray-400">No department data available</p>
            )}
          </div>
        </div>

        {/* Engagement summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Campaign Engagement</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Impressions', value: stats.engagement?.impressions?.toLocaleString() || 0, icon: Eye, color: 'text-blue-600 bg-blue-50' },
              { label: 'Clicks', value: stats.engagement?.clicks?.toLocaleString() || 0, icon: MousePointer, color: 'text-green-600 bg-green-50' },
              { label: 'Business Units', value: stats.businessUnits?.total || 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
              { label: 'CTR', value: `${stats.engagement?.ctr || 0}%`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-lg p-4 ${color.split(' ')[1]}`}>
                <Icon className={`w-5 h-5 ${color.split(' ')[0]} mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
