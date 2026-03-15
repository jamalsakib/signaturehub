import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

export function AnalyticsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const { data: campaignStats } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: () => analyticsApi.campaigns({ days: 30 }).then((r) => r.data),
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => analyticsApi.users().then((r) => r.data),
  });

  const deptData = (dashboard?.usersByDepartment || []).map((d: any) => ({
    name: d._id,
    users: d.count,
  }));

  const roleData = (userStats?.byRole || []).map((r: any) => ({
    name: r._id,
    value: r.count,
  }));

  const topCampaigns = (campaignStats?.data || []).slice(0, 5);

  return (
    <div className="px-8 py-6 space-y-8 max-w-screen-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Platform-wide metrics and campaign performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by department */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="users" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">No data</p>
          )}
        </div>

        {/* Users by role */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }>
                  {roleData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">No data</p>
          )}
        </div>
      </div>

      {/* Top campaigns */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaign Performance (Last 30 Days)</h3>
        {topCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Campaign', 'Business Unit', 'Status', 'Impressions', 'Clicks', 'CTR'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topCampaigns.map((c: any) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.businessUnit || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No campaign data in the last 30 days</p>
        )}
      </div>

      {/* Business unit breakdown */}
      {userStats?.byBusinessUnit?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Business Unit</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userStats.byBusinessUnit}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
