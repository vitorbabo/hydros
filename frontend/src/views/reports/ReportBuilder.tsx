import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Calendar, Clock, Send } from 'lucide-react';
import { useReportStore, ReportFormat, ScheduleType } from '../../store/reportStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';

export const ReportBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTemplate = searchParams.get('template');

  const { templates, generateReport, scheduleReport, isGenerating } = useReportStore();
  const { sites } = useDashboardStore();
  const { user } = useAuthStore();

  const [selectedTemplate, setSelectedTemplate] = useState<string>(preselectedTemplate || '');
  const [reportName, setReportName] = useState<string>('');
  const [dateRangeType, setDateRangeType] = useState<string>('last_7_days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ReportFormat>('pdf');
  const [shouldSchedule, setShouldSchedule] = useState<boolean>(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [scheduleTime, setScheduleTime] = useState<string>('08:00');
  const [recipients, setRecipients] = useState<string>('');

  useEffect(() => {
    if (preselectedTemplate) {
      const template = templates.find(t => t.id === preselectedTemplate);
      if (template) {
        setReportName(template.name);
      }
    }
  }, [preselectedTemplate, templates]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRangeType) {
      case 'last_24_hours':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || selectedSites.length === 0) {
      alert('Please select a template and at least one site');
      return;
    }

    const dateRange = getDateRange();
    const template = templates.find(t => t.id === selectedTemplate);

    const config = {
      templateId: selectedTemplate,
      name: reportName || template?.name || 'Untitled Report',
      dateRange,
      siteIds: selectedSites,
      metrics: template?.metrics || [],
      format: exportFormat,
    };

    if (shouldSchedule) {
      const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
      scheduleReport(config, scheduleType, scheduleTime, recipientList);
      alert('Report scheduled successfully!');
      navigate('/reports');
    } else {
      await generateReport(config, user?.email || 'unknown');
      alert('Report generated successfully!');
      navigate('/reports');
    }
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const toggleAllSites = () => {
    const allSiteIds = Object.keys(sites);
    if (selectedSites.length === allSiteIds.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(allSiteIds);
    }
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const siteList = Object.entries(sites);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Report Builder</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create custom reports with your preferred settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              1. Select Template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setReportName(template.name);
                  }}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-[#135bec] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText
                      className={
                        selectedTemplate === template.id
                          ? 'text-[#135bec]'
                          : 'text-gray-400 dark:text-gray-500'
                      }
                      size={20}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </div>
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

          {/* Report Name */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              2. Report Name
            </h2>
            <input
              type="text"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder="Enter report name..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              3. Date Range
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'last_24_hours', label: 'Last 24 Hours' },
                  { value: 'last_7_days', label: 'Last 7 Days' },
                  { value: 'last_30_days', label: 'Last 30 Days' },
                  { value: 'last_90_days', label: 'Last 90 Days' },
                  { value: 'custom', label: 'Custom Range' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setDateRangeType(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      dateRangeType === option.value
                        ? 'bg-[#135bec] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {dateRangeType === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Site Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                4. Select Sites
              </h2>
              <button
                onClick={toggleAllSites}
                className="text-sm text-[#135bec] hover:underline"
              >
                {selectedSites.length === Object.keys(sites).length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {siteList.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                  No sites available
                </div>
              ) : (
                siteList.map(([siteId, site]) => (
                  <label
                    key={siteId}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(siteId)}
                      onChange={() => toggleSite(siteId)}
                      className="w-4 h-4 text-[#135bec] focus:ring-[#135bec] rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{site.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{siteId}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Schedule Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="schedule-report"
                checked={shouldSchedule}
                onChange={e => setShouldSchedule(e.target.checked)}
                className="w-4 h-4 text-[#135bec] focus:ring-[#135bec] rounded"
              />
              <label
                htmlFor="schedule-report"
                className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer"
              >
                Schedule This Report
              </label>
            </div>

            {shouldSchedule && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frequency
                    </label>
                    <select
                      value={scheduleType}
                      onChange={e => setScheduleType(e.target.value as ScheduleType)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={recipients}
                    onChange={e => setRecipients(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          {/* Export Format */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Export Format
            </h2>
            <div className="space-y-2">
              {[
                { value: 'pdf', label: 'PDF Document', icon: FileText },
                { value: 'excel', label: 'Excel Spreadsheet', icon: FileText },
                { value: 'csv', label: 'CSV File', icon: FileText },
              ].map(format => (
                <label
                  key={format.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === format.value
                      ? 'border-[#135bec] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={e => setExportFormat(e.target.value as ReportFormat)}
                    className="w-4 h-4 text-[#135bec]"
                  />
                  <format.icon
                    className={
                      exportFormat === format.value
                        ? 'text-[#135bec]'
                        : 'text-gray-400 dark:text-gray-500'
                    }
                    size={20}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {format.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Template</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedTemplateData?.name || 'Not selected'}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Sites</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedSites.length} selected
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Date Range</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {dateRangeType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Format</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {exportFormat.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTemplate || selectedSites.length === 0}
            className="w-full px-6 py-3 bg-[#135bec] text-white rounded-lg hover:bg-[#0d47c1] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Generating...
              </>
            ) : shouldSchedule ? (
              <>
                <Calendar size={20} />
                Schedule Report
              </>
            ) : (
              <>
                <Send size={20} />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
