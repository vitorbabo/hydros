import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export const CrossSiteComparison: React.FC = () => {
  const navigate = useNavigate();
  const { comparisonData, fetchComparisonData, initializeMockData } = useAnalyticsStore();
  const { sites } = useDashboardStore();
  const [selectedMetric, setSelectedMetric] = useState<string>('overall');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  useEffect(() => {
    initializeMockData();
    const siteIds = Object.keys(sites);
    if (siteIds.length > 0) {
      setSelectedSites(siteIds);
      fetchComparisonData(siteIds, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      });
    }
  }, [sites, fetchComparisonData, initializeMockData]);

  const toggleSite = (siteId: string) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const filteredData = comparisonData.filter(site => selectedSites.includes(site.siteId));

  // Prepare data for bar chart
  const barChartData = filteredData.map(site => ({
    name: site.siteName,
    Efficiency: site.scores.efficiency,
    Reliability: site.scores.reliability,
    Quality: site.scores.quality,
    Overall: site.scores.overall,
  }));

  // Prepare data for radar chart
  const radarData = [
    {
      metric: 'Efficiency',
      ...Object.fromEntries(filteredData.map(site => [site.siteName, site.scores.efficiency])),
    },
    {
      metric: 'Reliability',
      ...Object.fromEntries(filteredData.map(site => [site.siteName, site.scores.reliability])),
    },
    {
      metric: 'Quality',
      ...Object.fromEntries(filteredData.map(site => [site.siteName, site.scores.quality])),
    },
    {
      metric: 'Flow Rate',
      ...Object.fromEntries(filteredData.map(site => [site.siteName, (site.metrics.flowRate / 15)])), // Normalized
    },
    {
      metric: 'Uptime',
      ...Object.fromEntries(filteredData.map(site => [site.siteName, site.metrics.uptime])),
    },
  ];

  const colors = ['#135bec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="text-gray-600 dark:text-gray-400" size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cross-Site Comparison</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Compare performance metrics across multiple sites
          </p>
        </div>
      </div>

      {/* Site Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Sites to Compare</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sites).map(([siteId, site]) => (
            <button
              key={siteId}
              onClick={() => toggleSite(siteId)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedSites.includes(siteId)
                  ? 'bg-[#135bec] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Scores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Overall
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reliability
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Flow Rate
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Uptime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((site, index) => (
                <tr key={site.siteId} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{site.siteName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{site.siteId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-2xl font-bold text-[#135bec]">
                      {site.scores.overall.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {site.scores.efficiency.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {site.scores.reliability.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {site.scores.quality.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {site.metrics.flowRate.toFixed(0)} L/s
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {site.metrics.uptime.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Score Comparison (Bar Chart)
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Bar dataKey="Efficiency" fill="#10b981" />
              <Bar dataKey="Reliability" fill="#3b82f6" />
              <Bar dataKey="Quality" fill="#8b5cf6" />
              <Bar dataKey="Overall" fill="#135bec" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar Chart Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Multi-Metric Comparison (Radar Chart)
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              {filteredData.map((site, index) => (
                <Radar
                  key={site.siteId}
                  name={site.siteName}
                  dataKey={site.siteName}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Overall Performance Ranking
          </h2>
          <div className="space-y-3">
            {[...filteredData]
              .sort((a, b) => b.scores.overall - a.scores.overall)
              .map((site, index) => (
                <div
                  key={site.siteId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#135bec] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{site.siteName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{site.siteId}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#135bec]">
                    {site.scores.overall.toFixed(0)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Efficiency Ranking
          </h2>
          <div className="space-y-3">
            {[...filteredData]
              .sort((a, b) => b.scores.efficiency - a.scores.efficiency)
              .map((site, index) => (
                <div
                  key={site.siteId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{site.siteName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{site.siteId}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {site.scores.efficiency.toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossSiteComparison;
