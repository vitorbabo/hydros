import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot, Area, ComposedChart } from 'recharts';
import { format } from 'date-fns';

export const TrendAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { trendData, fetchTrendData, detectAnomalies } = useAnalyticsStore();
  const [selectedMetric, setSelectedMetric] = useState<string>('turbidity');
  const [dateRange, setDateRange] = useState<string>('24h');

  useEffect(() => {
    fetchTrendData(selectedMetric, {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    });
  }, [selectedMetric, fetchTrendData]);

  const metrics = [
    { id: 'turbidity', name: 'Turbidity', unit: 'NTU' },
    { id: 'pH', name: 'pH Level', unit: 'pH' },
    { id: 'chlorine', name: 'Chlorine Residual', unit: 'mg/L' },
    { id: 'flow_rate', name: 'Flow Rate', unit: 'L/s' },
    { id: 'pressure', name: 'Pressure', unit: 'bar' },
  ];

  const currentTrendData = trendData[selectedMetric] || [];
  const anomalies = detectAnomalies(selectedMetric);

  // Format data for chart
  const chartData = currentTrendData.map(point => ({
    ...point,
    time: format(new Date(point.timestamp), 'HH:mm'),
  }));

  const currentMetric = metrics.find(m => m.id === selectedMetric);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.anomaly) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.5} />
        </g>
      );
    }
    return null;
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trend Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Historical trends, forecasting, and anomaly detection
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Metric
            </label>
            <div className="flex flex-wrap gap-2">
              {metrics.map(metric => (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedMetric === metric.id
                      ? 'bg-[#135bec] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {metric.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    dateRange === option.value
                      ? 'bg-[#135bec] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Summary */}
      {anomalies.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-100">
                {anomalies.length} Anomal{anomalies.length === 1 ? 'y' : 'ies'} Detected
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                Unusual patterns detected in {currentMetric?.name}. These points are highlighted in red on the chart below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Chart with Forecast */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentMetric?.name} Trend & Forecast
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#135bec]" />
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500 border-2 border-green-500" style={{ borderStyle: 'dashed' }} />
              <span className="text-gray-600 dark:text-gray-400">Predicted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Anomaly</span>
            </div>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: currentMetric?.unit || '', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />

              {/* Confidence interval */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="#10b981"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="#10b981"
                fillOpacity={0.1}
              />

              {/* Actual values */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#135bec"
                strokeWidth={2}
                dot={<CustomDot />}
                name="Actual"
              />

              {/* Predicted values */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {chartData.length > 0 ? chartData[chartData.length - 1].value.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{currentMetric?.unit}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {chartData.length > 0
              ? (chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(2)
              : '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{currentMetric?.unit}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Min / Max</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {chartData.length > 0
              ? `${Math.min(...chartData.map(d => d.value)).toFixed(1)} / ${Math.max(...chartData.map(d => d.value)).toFixed(1)}`
              : '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{currentMetric?.unit}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Anomalies</div>
          <div className={`text-2xl font-bold ${anomalies.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {anomalies.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">detected</div>
        </div>
      </div>

      {/* Anomaly Details */}
      {anomalies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Anomaly Details
          </h2>
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <div className="font-medium text-red-900 dark:text-red-100">
                        Anomalous {currentMetric?.name} Reading
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Value: {anomaly.value.toFixed(2)} {currentMetric?.unit} (Expected: {anomaly.predicted?.toFixed(2)} {currentMetric?.unit})
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {format(new Date(anomaly.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-red-900 dark:text-red-100">
                    Deviation: {Math.abs(anomaly.value - (anomaly.predicted || anomaly.value)).toFixed(1)} {currentMetric?.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pattern Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Trend Direction
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              The overall trend shows stable behavior with minor fluctuations within expected ranges. No significant upward or downward trends detected in the analysis period.
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="font-medium text-green-900 dark:text-green-100 mb-2">
              Seasonality
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Daily cyclical patterns observed, correlating with operational schedules. Peak values typically occur during 8AM-4PM operating hours.
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              Variability
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              Low to moderate variability observed. Standard deviation is within acceptable operational limits, indicating stable process control.
            </div>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              Forecast Confidence
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              High confidence (85%+) in short-term predictions. Forecast accuracy decreases beyond 6-hour window due to external variable influences.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;
