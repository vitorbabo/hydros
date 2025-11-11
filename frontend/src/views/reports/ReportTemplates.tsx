import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, TrendingUp, Zap, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import { useReportStore } from '../../store/reportStore';

const categoryIcons: Record<string, any> = {
  Operations: Activity,
  Compliance: AlertCircle,
  Maintenance: Zap,
  Alerts: AlertCircle,
  Efficiency: TrendingUp,
  Comparison: BarChart3,
};

const categoryColors: Record<string, string> = {
  Operations: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  Compliance: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  Maintenance: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  Alerts: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  Efficiency: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  Comparison: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
};

export const ReportTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { templates } = useReportStore();

  const categorizedTemplates = useMemo(() => {
    const grouped: Record<string, typeof templates> = {};
    templates.forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [templates]);

  const categories = Object.keys(categorizedTemplates);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reports')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="text-gray-600 dark:text-gray-400" size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Report Templates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose from pre-built templates or create custom reports
          </p>
        </div>
      </div>

      {/* Template Categories */}
      {categories.map(category => {
        const Icon = categoryIcons[category] || FileText;
        const colorClass = categoryColors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        const categoryTemplates = categorizedTemplates[category];

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon size={24} />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{category}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => navigate(`/reports/builder?template=${template.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:border-[#135bec] dark:hover:border-[#135bec] hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {template.description}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">Metrics:</span>{' '}
                          {template.metrics.length} included
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">Default Range:</span>{' '}
                          {template.defaultDateRange.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {template.chartTypes.map(chartType => (
                          <span
                            key={chartType}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {chartType}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/reports/builder?template=${template.id}`);
                    }}
                    className="mt-4 w-full px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-[#0d47c1] transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportTemplates;
