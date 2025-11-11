import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, BarChart3, Zap, Droplet, DollarSign, Activity } from 'lucide-react';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useDashboardStore } from '../../store/dashboardStore';
import AIAssistant from '../../components/analytics/AIAssistant';

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isAICollapsed, setIsAICollapsed] = useState(false);
  const { comparisonData, initializeMockData } = useAnalyticsStore();
  const { sites } = useDashboardStore();

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="text-green-500" size={20} />;
      case 'declining':
        return <TrendingDown className="text-red-500" size={20} />;
      default:
        return <Minus className="text-gray-500" size={20} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 dark:text-green-400';
      case 'declining':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const aiContext = {
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    currentView: 'analytics-dashboard',
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 transition-all ${isAICollapsed ? 'mr-0' : 'mr-96'}`}>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Advanced analytics and insights powered by AI
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/analytics/comparison')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#135bec] dark:hover:border-[#135bec] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Compare Sites</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Side-by-side analysis</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/analytics/efficiency')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#135bec] dark:hover:border-[#135bec] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Zap className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Efficiency</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Energy & costs</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/analytics/trends')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#135bec] dark:hover:border-[#135bec] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Trends</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Historical analysis</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setIsAICollapsed(!isAICollapsed)}
            className="p-4 bg-[#135bec] rounded-lg border border-[#135bec] hover:bg-[#0d47c1] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <div className="font-semibold text-white">AI Assistant</div>
                <div className="text-sm text-white/80">Ask questions</div>
              </div>
            </div>
          </button>
        </div>

        {/* Performance Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Site Performance Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.map(site => (
              <div
                key={site.siteId}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/sites/${site.siteId}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{site.siteName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{site.siteId}</p>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(site.scores.overall)}`}>
                    {site.scores.overall.toFixed(0)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Efficiency</span>
                    <span className={`font-medium ${getScoreColor(site.scores.efficiency)}`}>
                      {site.scores.efficiency.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Reliability</span>
                    <span className={`font-medium ${getScoreColor(site.scores.reliability)}`}>
                      {site.scores.reliability.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Quality</span>
                    <span className={`font-medium ${getScoreColor(site.scores.quality)}`}>
                      {site.scores.quality.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Flow Rate</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {site.metrics.flowRate.toFixed(0)} L/s
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Uptime</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {site.metrics.uptime.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Droplet className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              {getTrendIcon('improving')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {comparisonData.reduce((sum, site) => sum + site.metrics.flowRate, 0).toFixed(0)} L/s
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Flow Rate</div>
            <div className={`text-xs mt-1 ${getTrendColor('improving')}`}>
              ↑ 5.2% from last week
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Zap className="text-green-600 dark:text-green-400" size={24} />
              </div>
              {getTrendIcon('improving')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(comparisonData.reduce((sum, site) => sum + site.scores.efficiency, 0) / comparisonData.length).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Efficiency</div>
            <div className={`text-xs mt-1 ${getTrendColor('improving')}`}>
              ↑ 2.1% from last month
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              {getTrendIcon('stable')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(comparisonData.reduce((sum, site) => sum + site.scores.quality, 0) / comparisonData.length).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Water Quality</div>
            <div className={`text-xs mt-1 ${getTrendColor('stable')}`}>
              → Stable
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              {getTrendIcon('declining')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">$24.5k</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Operating Costs</div>
            <div className={`text-xs mt-1 ${getTrendColor('declining')}`}>
              ↓ 3.8% reduction
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            AI-Generated Insights
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    Efficiency Improvement Detected
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Clear Creek WTP shows a 5.2% efficiency improvement over the past week. The optimization of chemical dosing schedules has contributed to this positive trend.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Predictive Maintenance Recommendation
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Based on historical patterns, River Valley Plant's filtration system may require maintenance within the next 7-10 days to maintain optimal performance.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Droplet className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-yellow-900 dark:text-yellow-100">
                    Water Quality Optimization Opportunity
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Mountain View Station could reduce chlorine consumption by 8% by adjusting dosing based on real-time pH measurements, similar to Clear Creek's approach.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {!isAICollapsed && (
        <div className="fixed right-0 top-16 bottom-0 w-96 z-40">
          <AIAssistant
            context={aiContext}
            isCollapsed={isAICollapsed}
            onToggleCollapse={() => setIsAICollapsed(!isAICollapsed)}
          />
        </div>
      )}

      {/* Collapsed AI Button */}
      {isAICollapsed && (
        <AIAssistant
          context={aiContext}
          isCollapsed={isAICollapsed}
          onToggleCollapse={() => setIsAICollapsed(!isAICollapsed)}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;
