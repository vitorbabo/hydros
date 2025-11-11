import React, { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Zap, Droplet, DollarSign, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useDashboardStore } from '../../store/dashboardStore';

export const EfficiencyMetrics: React.FC = () => {
  const navigate = useNavigate();
  const { efficiencyMetrics, fetchEfficiencyMetrics } = useAnalyticsStore();
  const { sites } = useDashboardStore();
  const [selectedSite, setSelectedSite] = useState<string>('');

  useEffect(() => {
    const siteIds = Object.keys(sites);
    if (siteIds.length > 0 && !selectedSite) {
      setSelectedSite(siteIds[0]);
    }
  }, [sites, selectedSite]);

  useEffect(() => {
    if (selectedSite) {
      fetchEfficiencyMetrics(selectedSite, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      });
    }
  }, [selectedSite, fetchEfficiencyMetrics]);

  const siteMetrics = efficiencyMetrics[selectedSite];

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
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Efficiency Metrics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track energy consumption, costs, and operational efficiency
          </p>
        </div>
      </div>

      {/* Site Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Site</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sites).map(([siteId, site]) => (
            <button
              key={siteId}
              onClick={() => setSelectedSite(siteId)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedSite === siteId
                  ? 'bg-[#135bec] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {siteMetrics ? (
        <>
          {/* Overall Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Efficiency Trend</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Last 30 days performance</p>
              </div>
              <div className="flex items-center gap-3">
                {getTrendIcon(siteMetrics.trend)}
                <span className={`text-2xl font-bold ${getTrendColor(siteMetrics.trend)}`}>
                  {siteMetrics.trend.charAt(0).toUpperCase() + siteMetrics.trend.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Energy Consumption */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Zap className="text-yellow-600 dark:text-yellow-400" size={28} />
                </div>
                {getTrendIcon('improving')}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {siteMetrics.energyConsumption.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">kWh/day</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                Energy Consumption
              </div>
              <div className={`text-xs mt-1 ${getTrendColor('improving')}`}>
                ↓ 3.2% from last month
              </div>
            </div>

            {/* Water Loss */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Droplet className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
                {getTrendIcon('improving')}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {siteMetrics.waterLoss.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">of total volume</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                Water Loss
              </div>
              <div className={`text-xs mt-1 ${getTrendColor('improving')}`}>
                ↓ 0.5% reduction
              </div>
            </div>

            {/* Chemical Efficiency */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Percent className="text-green-600 dark:text-green-400" size={28} />
                </div>
                {getTrendIcon('stable')}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {siteMetrics.chemicalEfficiency.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">utilization rate</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                Chemical Efficiency
              </div>
              <div className={`text-xs mt-1 ${getTrendColor('stable')}`}>
                → No significant change
              </div>
            </div>

            {/* Operating Cost */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <DollarSign className="text-orange-600 dark:text-orange-400" size={28} />
                </div>
                {getTrendIcon('improving')}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                ${(siteMetrics.operatingCost / 1000).toFixed(1)}k
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">per month</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                Operating Cost
              </div>
              <div className={`text-xs mt-1 ${getTrendColor('improving')}`}>
                ↓ 5.8% cost reduction
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Energy Consumption Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Energy Consumption Breakdown
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Pumps & Motors</span>
                    <span className="font-medium text-gray-900 dark:text-white">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-[#135bec] h-3 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Filtration System</span>
                    <span className="font-medium text-gray-900 dark:text-white">30%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-green-600 h-3 rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Disinfection</span>
                    <span className="font-medium text-gray-900 dark:text-white">15%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-yellow-600 h-3 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Monitoring & Control</span>
                    <span className="font-medium text-gray-900 dark:text-white">10%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Operating Cost Breakdown
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Energy</span>
                    <span className="font-medium text-gray-900 dark:text-white">$2.4k</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-orange-600 h-3 rounded-full" style={{ width: '48%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Chemicals</span>
                    <span className="font-medium text-gray-900 dark:text-white">$1.5k</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-green-600 h-3 rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Maintenance</span>
                    <span className="font-medium text-gray-900 dark:text-white">$800</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full" style={{ width: '16%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Labor</span>
                    <span className="font-medium text-gray-900 dark:text-white">$300</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full" style={{ width: '6%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              AI-Powered Optimization Recommendations
            </h2>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      Optimize Pump Schedule
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Shifting 30% of pumping operations to off-peak hours could reduce energy costs by approximately $720/month.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Droplet className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      Reduce Water Loss
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Implementing predictive leak detection could reduce water loss by 0.8%, saving approximately $400/month.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Percent className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-purple-900 dark:text-purple-100">
                      Optimize Chemical Dosing
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      Real-time pH-based dosing adjustments could improve chemical efficiency by 5-7% and reduce waste.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-600 dark:text-gray-400">
            Select a site to view efficiency metrics
          </div>
        </div>
      )}
    </div>
  );
};

export default EfficiencyMetrics;
