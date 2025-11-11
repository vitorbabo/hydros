import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { useReportStore } from '../../store/reportStore';
import { formatDistanceToNow } from 'date-fns';

export const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    reports,
    scheduledReports,
    templates,
    deleteReport,
    exportReport,
    toggleScheduledReport,
    deleteScheduledReport,
    initializeMockData,
  } = useReportStore();

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  const handleExport = (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    exportReport(reportId, format);
    // Show success message
    alert(`Report exported as ${format.toUpperCase()}`);
  };

  const handleDeleteReport = (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      deleteReport(reportId);
    }
  };

  const handleDeleteScheduled = (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      deleteScheduledReport(reportId);
    }
  };

  const getTemplateById = (templateId: string) => {
    return templates.find(t => t.id === templateId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate, schedule, and export comprehensive reports
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reports/templates')}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Browse Templates
          </button>
          <button
            onClick={() => navigate('/reports/builder')}
            className="px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-[#0d47c1] transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Create Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {reports.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Reports</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Calendar className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {scheduledReports.filter(r => r.enabled).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Schedules</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Templates Available</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Download className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {reports.length * 2}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Exports</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Reports</h2>
          </div>
          <div className="p-6 space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No reports generated yet
              </div>
            ) : (
              reports.slice(0, 5).map(report => {
                const template = getTemplateById(report.templateId);
                return (
                  <div
                    key={report.id}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template?.name || 'Unknown Template'} • {report.siteIds.length} site(s)
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Generated {formatDistanceToNow(new Date(report.generatedAt))} ago
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExport(report.id, 'pdf')}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Download PDF"
                      >
                        <Download size={16} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scheduled Reports
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {scheduledReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No scheduled reports configured
              </div>
            ) : (
              scheduledReports.map(scheduled => {
                const template = getTemplateById(scheduled.templateId);
                return (
                  <div
                    key={scheduled.id}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                        <Calendar className="text-green-600 dark:text-green-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {scheduled.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template?.name || 'Unknown Template'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock size={14} className="text-gray-500 dark:text-gray-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {scheduled.schedule.charAt(0).toUpperCase() + scheduled.schedule.slice(1)} at {scheduled.time}
                          </span>
                          <span
                            className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                              scheduled.enabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {scheduled.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleScheduledReport(scheduled.id)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          scheduled.enabled
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {scheduled.enabled ? 'Pause' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteScheduled(scheduled.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quick Report Templates
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.slice(0, 6).map(template => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#135bec] dark:hover:border-[#135bec] transition-colors cursor-pointer"
              onClick={() => navigate(`/reports/builder?template=${template.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.description}
                  </div>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
