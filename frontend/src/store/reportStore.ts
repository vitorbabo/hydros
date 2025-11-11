import { create } from 'zustand';

export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ScheduleType = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  start: string;
  end: string;
}

export interface Report {
  id: string;
  templateId: string;
  name: string;
  generatedAt: string;
  generatedBy: string;
  dateRange: DateRange;
  siteIds: string[];
  data: any;
  fileUrl?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  metrics: string[];
  chartTypes: string[];
  defaultDateRange: string;
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  schedule: ScheduleType;
  time: string;
  recipients: string[];
  format: ReportFormat;
  enabled: boolean;
}

export interface ReportConfig {
  templateId: string;
  name: string;
  dateRange: DateRange;
  siteIds: string[];
  metrics: string[];
  format: ReportFormat;
}

interface ReportStore {
  reports: Report[];
  templates: ReportTemplate[];
  scheduledReports: ScheduledReport[];
  isGenerating: boolean;

  // Report operations
  generateReport: (config: ReportConfig, userId: string) => Promise<Report>;
  deleteReport: (reportId: string) => void;
  getReportsBySite: (siteId: string) => Report[];

  // Scheduled report operations
  scheduleReport: (config: ReportConfig, schedule: ScheduleType, time: string, recipients: string[]) => void;
  updateScheduledReport: (reportId: string, updates: Partial<ScheduledReport>) => void;
  deleteScheduledReport: (reportId: string) => void;
  toggleScheduledReport: (reportId: string) => void;

  // Template operations
  getTemplateById: (templateId: string) => ReportTemplate | undefined;
  getTemplatesByCategory: (category: string) => ReportTemplate[];

  // Export operation
  exportReport: (reportId: string, format: ReportFormat) => void;

  // Initialize mock data
  initializeMockData: () => void;
}

const mockTemplates: ReportTemplate[] = [
  {
    id: 'template-daily-ops',
    name: 'Daily Operations Summary',
    description: 'Daily overview of site operations, water quality, and system status',
    category: 'Operations',
    metrics: ['flow_rate', 'turbidity', 'pH', 'chlorine_residual', 'pressure'],
    chartTypes: ['line', 'gauge'],
    defaultDateRange: 'last_24_hours',
  },
  {
    id: 'template-water-quality',
    name: 'Water Quality Compliance Report',
    description: 'Comprehensive water quality analysis and compliance tracking',
    category: 'Compliance',
    metrics: ['turbidity', 'pH', 'chlorine_residual', 'tds', 'temperature'],
    chartTypes: ['line', 'bar', 'table'],
    defaultDateRange: 'last_7_days',
  },
  {
    id: 'template-maintenance',
    name: 'Maintenance Activity Report',
    description: 'Maintenance events, equipment status, and downtime analysis',
    category: 'Maintenance',
    metrics: ['uptime', 'maintenance_events', 'equipment_status'],
    chartTypes: ['bar', 'table'],
    defaultDateRange: 'last_30_days',
  },
  {
    id: 'template-alerts',
    name: 'Alert Summary Report',
    description: 'Alert frequency, response times, and resolution tracking',
    category: 'Alerts',
    metrics: ['alert_count', 'response_time', 'resolution_time'],
    chartTypes: ['bar', 'pie', 'table'],
    defaultDateRange: 'last_7_days',
  },
  {
    id: 'template-energy',
    name: 'Energy Efficiency Report',
    description: 'Energy consumption, costs, and efficiency metrics',
    category: 'Efficiency',
    metrics: ['energy_consumption', 'power_factor', 'cost'],
    chartTypes: ['line', 'bar', 'gauge'],
    defaultDateRange: 'last_30_days',
  },
  {
    id: 'template-comparison',
    name: 'Cross-Site Comparison Report',
    description: 'Side-by-side comparison of multiple sites performance',
    category: 'Comparison',
    metrics: ['flow_rate', 'efficiency', 'water_quality', 'uptime'],
    chartTypes: ['bar', 'radar', 'table'],
    defaultDateRange: 'last_30_days',
  },
];

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  templates: mockTemplates,
  scheduledReports: [],
  isGenerating: false,

  generateReport: async (config: ReportConfig, userId: string): Promise<Report> => {
    set({ isGenerating: true });

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const template = get().templates.find(t => t.id === config.templateId);

    const newReport: Report = {
      id: `report-${Date.now()}`,
      templateId: config.templateId,
      name: config.name || template?.name || 'Untitled Report',
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      dateRange: config.dateRange,
      siteIds: config.siteIds,
      data: {}, // Would contain actual report data
      fileUrl: `/reports/report-${Date.now()}.${config.format}`,
    };

    set(state => ({
      reports: [newReport, ...state.reports],
      isGenerating: false,
    }));

    return newReport;
  },

  deleteReport: (reportId: string) => {
    set(state => ({
      reports: state.reports.filter(r => r.id !== reportId),
    }));
  },

  getReportsBySite: (siteId: string) => {
    return get().reports.filter(r => r.siteIds.includes(siteId));
  },

  scheduleReport: (config: ReportConfig, schedule: ScheduleType, time: string, recipients: string[]) => {
    const newScheduledReport: ScheduledReport = {
      id: `scheduled-${Date.now()}`,
      templateId: config.templateId,
      name: config.name,
      schedule,
      time,
      recipients,
      format: config.format,
      enabled: true,
    };

    set(state => ({
      scheduledReports: [...state.scheduledReports, newScheduledReport],
    }));
  },

  updateScheduledReport: (reportId: string, updates: Partial<ScheduledReport>) => {
    set(state => ({
      scheduledReports: state.scheduledReports.map(r =>
        r.id === reportId ? { ...r, ...updates } : r
      ),
    }));
  },

  deleteScheduledReport: (reportId: string) => {
    set(state => ({
      scheduledReports: state.scheduledReports.filter(r => r.id !== reportId),
    }));
  },

  toggleScheduledReport: (reportId: string) => {
    set(state => ({
      scheduledReports: state.scheduledReports.map(r =>
        r.id === reportId ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  },

  getTemplateById: (templateId: string) => {
    return get().templates.find(t => t.id === templateId);
  },

  getTemplatesByCategory: (category: string) => {
    return get().templates.filter(t => t.category === category);
  },

  exportReport: (reportId: string, format: ReportFormat) => {
    const report = get().reports.find(r => r.id === reportId);
    if (!report) return;

    // Simulate file download
    console.log(`Exporting report ${reportId} as ${format}`);

    // In a real implementation, this would trigger a download
    const fileName = `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
    console.log(`Download: ${fileName}`);
  },

  initializeMockData: () => {
    // Check if already initialized
    if (get().reports.length > 0) return;

    const mockReports: Report[] = [
      {
        id: 'report-1',
        templateId: 'template-daily-ops',
        name: 'Daily Operations Summary - Nov 11',
        generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        generatedBy: 'admin@hydros.io',
        dateRange: {
          start: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          end: new Date().toISOString(),
        },
        siteIds: ['site-001', 'site-002'],
        data: {},
        fileUrl: '/reports/daily-ops-nov-11.pdf',
      },
      {
        id: 'report-2',
        templateId: 'template-water-quality',
        name: 'Water Quality Compliance - Weekly',
        generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        generatedBy: 'manager@hydros.io',
        dateRange: {
          start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          end: new Date().toISOString(),
        },
        siteIds: ['site-001'],
        data: {},
        fileUrl: '/reports/water-quality-weekly.pdf',
      },
      {
        id: 'report-3',
        templateId: 'template-energy',
        name: 'Energy Efficiency Report - October',
        generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        generatedBy: 'admin@hydros.io',
        dateRange: {
          start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          end: new Date().toISOString(),
        },
        siteIds: ['site-001', 'site-002', 'site-003'],
        data: {},
        fileUrl: '/reports/energy-october.xlsx',
      },
    ];

    const mockScheduledReports: ScheduledReport[] = [
      {
        id: 'scheduled-1',
        templateId: 'template-daily-ops',
        name: 'Daily Operations Report',
        schedule: 'daily',
        time: '08:00',
        recipients: ['admin@hydros.io', 'manager@hydros.io'],
        format: 'pdf',
        enabled: true,
      },
      {
        id: 'scheduled-2',
        templateId: 'template-water-quality',
        name: 'Weekly Water Quality Report',
        schedule: 'weekly',
        time: '09:00',
        recipients: ['manager@hydros.io'],
        format: 'excel',
        enabled: true,
      },
    ];

    set({
      reports: mockReports,
      scheduledReports: mockScheduledReports,
    });
  },
}));
