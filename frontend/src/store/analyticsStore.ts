import { create } from 'zustand';

export interface DateRange {
  start: string;
  end: string;
}

export interface SiteComparison {
  siteId: string;
  siteName: string;
  metrics: Record<string, number>;
  scores: {
    efficiency: number;
    reliability: number;
    quality: number;
    overall: number;
  };
}

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface EfficiencyMetrics {
  energyConsumption: number;
  waterLoss: number;
  chemicalEfficiency: number;
  operatingCost: number;
  trend: TrendDirection;
}

export interface TrendData {
  timestamp: string;
  value: number;
  predicted?: number;
  upperBound?: number;
  lowerBound?: number;
  anomaly?: boolean;
}

export interface QueryContext {
  siteId?: string;
  dateRange: DateRange;
  metrics?: string[];
  currentView: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataReferences?: string[]; // InfluxDB query results used
}

export interface AIConversation {
  id: string;
  userId: string;
  messages: AIMessage[];
  context: QueryContext;
  createdAt: string;
}

export interface AIResponse {
  response: string;
  dataSources: string[];
  timestamp: string;
}

interface AnalyticsStore {
  comparisonData: SiteComparison[];
  efficiencyMetrics: Record<string, EfficiencyMetrics>;
  trendData: Record<string, TrendData[]>;
  aiConversations: AIConversation[];
  currentConversation: AIConversation | null;
  isLoadingAI: boolean;

  // Comparison operations
  fetchComparisonData: (siteIds: string[], dateRange: DateRange) => Promise<void>;
  getTopPerformingSites: (metric: string, limit: number) => SiteComparison[];

  // Efficiency operations
  fetchEfficiencyMetrics: (siteId: string, dateRange: DateRange) => Promise<void>;
  getEfficiencyTrend: (siteId: string) => TrendDirection;

  // Trend operations
  fetchTrendData: (metric: string, dateRange: DateRange) => Promise<void>;
  detectAnomalies: (metric: string) => TrendData[];

  // AI Assistant operations
  queryAI: (question: string, context: QueryContext, userId: string) => Promise<AIResponse>;
  startNewConversation: (userId: string, context: QueryContext) => void;
  loadConversation: (conversationId: string) => void;
  saveConversation: (conversation: AIConversation) => void;
  deleteConversation: (conversationId: string) => void;
  clearCurrentConversation: () => void;

  // Initialize mock data
  initializeMockData: () => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  comparisonData: [],
  efficiencyMetrics: {},
  trendData: {},
  aiConversations: [],
  currentConversation: null,
  isLoadingAI: false,

  fetchComparisonData: async (siteIds: string[], dateRange: DateRange) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockData: SiteComparison[] = siteIds.map((siteId, index) => ({
      siteId,
      siteName: `Site ${siteId.split('-')[1]}`,
      metrics: {
        flowRate: 1000 + Math.random() * 500,
        turbidity: 0.5 + Math.random() * 0.5,
        pH: 7.0 + Math.random() * 0.5,
        chlorine: 1.0 + Math.random() * 0.5,
        uptime: 95 + Math.random() * 4,
      },
      scores: {
        efficiency: 80 + Math.random() * 15,
        reliability: 85 + Math.random() * 10,
        quality: 90 + Math.random() * 8,
        overall: 85 + Math.random() * 10,
      },
    }));

    set({ comparisonData: mockData });
  },

  getTopPerformingSites: (metric: string, limit: number) => {
    const { comparisonData } = get();
    return [...comparisonData]
      .sort((a, b) => (b.scores.overall || 0) - (a.scores.overall || 0))
      .slice(0, limit);
  },

  fetchEfficiencyMetrics: async (siteId: string, dateRange: DateRange) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockMetrics: EfficiencyMetrics = {
      energyConsumption: 1200 + Math.random() * 300,
      waterLoss: 2 + Math.random() * 3,
      chemicalEfficiency: 85 + Math.random() * 10,
      operatingCost: 5000 + Math.random() * 2000,
      trend: Math.random() > 0.5 ? 'improving' : Math.random() > 0.25 ? 'stable' : 'declining',
    };

    set(state => ({
      efficiencyMetrics: {
        ...state.efficiencyMetrics,
        [siteId]: mockMetrics,
      },
    }));
  },

  getEfficiencyTrend: (siteId: string) => {
    return get().efficiencyMetrics[siteId]?.trend || 'stable';
  },

  fetchTrendData: async (metric: string, dateRange: DateRange) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date();
    const mockTrend: TrendData[] = Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const baseValue = 100 + Math.sin(i / 4) * 20;
      const noise = Math.random() * 10 - 5;
      const value = baseValue + noise;
      const predicted = baseValue + 5;
      const anomaly = Math.abs(noise) > 8;

      return {
        timestamp: timestamp.toISOString(),
        value,
        predicted,
        upperBound: predicted + 10,
        lowerBound: predicted - 10,
        anomaly,
      };
    });

    set(state => ({
      trendData: {
        ...state.trendData,
        [metric]: mockTrend,
      },
    }));
  },

  detectAnomalies: (metric: string) => {
    const trendData = get().trendData[metric] || [];
    return trendData.filter(d => d.anomaly);
  },

  queryAI: async (question: string, context: QueryContext, userId: string) => {
    set({ isLoadingAI: true });

    // Simulate AI response with delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI responses based on question patterns
    let response = '';
    const dataSources: string[] = [];

    if (question.toLowerCase().includes('turbidity')) {
      response = `Based on the data from ${context.siteId || 'all sites'}, the average turbidity level over the selected period is 0.45 NTU, which is well within the acceptable range of 0.3-1.0 NTU. The measurements show stable performance with no significant spikes or anomalies detected.`;
      dataSources.push('InfluxDB: wtp.observations.turbidity');
    } else if (question.toLowerCase().includes('compare')) {
      response = `Comparing the sites in your selection: Site 001 shows the highest overall efficiency at 92%, followed by Site 002 at 88%. The main factors contributing to the performance difference are energy consumption patterns and water loss percentages.`;
      dataSources.push('InfluxDB: wtp.efficiency.metrics', 'InfluxDB: wtp.observations.flow_rate');
    } else if (question.toLowerCase().includes('why') || question.toLowerCase().includes('spike')) {
      response = `The spike you're observing is likely due to a combination of factors: 1) Increased raw water turbidity from recent rainfall, 2) Adjustments in the filtration process to compensate, and 3) Normal operational variation. The system response was appropriate and brought levels back to normal within 2 hours.`;
      dataSources.push('InfluxDB: wtp.events.log', 'InfluxDB: wtp.observations.turbidity');
    } else if (question.toLowerCase().includes('efficiency')) {
      response = `The efficiency analysis shows Site 001 has the best chemical efficiency at 91%, while maintaining competitive energy consumption. I recommend reviewing the chemical dosing strategy at other sites to potentially implement similar optimizations.`;
      dataSources.push('InfluxDB: wtp.efficiency.chemical', 'InfluxDB: wtp.efficiency.energy');
    } else {
      response = `I've analyzed the data for your query. The current metrics indicate normal operations across all monitored parameters. Water quality parameters are within target ranges, and system performance is stable. Would you like me to provide more specific insights about any particular aspect?`;
      dataSources.push('InfluxDB: wtp.observations.*');
    }

    const aiMessage: AIMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      dataReferences: dataSources,
    };

    const userMessage: AIMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    // Add to current conversation
    const currentConv = get().currentConversation;
    if (currentConv) {
      const updatedConv = {
        ...currentConv,
        messages: [...currentConv.messages, userMessage, aiMessage],
      };
      set({ currentConversation: updatedConv, isLoadingAI: false });
      get().saveConversation(updatedConv);
    }

    return {
      response,
      dataSources,
      timestamp: new Date().toISOString(),
    };
  },

  startNewConversation: (userId: string, context: QueryContext) => {
    const newConversation: AIConversation = {
      id: `conv-${Date.now()}`,
      userId,
      messages: [],
      context,
      createdAt: new Date().toISOString(),
    };
    set({ currentConversation: newConversation });
  },

  loadConversation: (conversationId: string) => {
    const conversation = get().aiConversations.find(c => c.id === conversationId);
    if (conversation) {
      set({ currentConversation: conversation });
    }
  },

  saveConversation: (conversation: AIConversation) => {
    set(state => {
      const existingIndex = state.aiConversations.findIndex(c => c.id === conversation.id);
      if (existingIndex >= 0) {
        const updated = [...state.aiConversations];
        updated[existingIndex] = conversation;
        return { aiConversations: updated };
      } else {
        return { aiConversations: [conversation, ...state.aiConversations] };
      }
    });
  },

  deleteConversation: (conversationId: string) => {
    set(state => ({
      aiConversations: state.aiConversations.filter(c => c.id !== conversationId),
      currentConversation:
        state.currentConversation?.id === conversationId ? null : state.currentConversation,
    }));
  },

  clearCurrentConversation: () => {
    set({ currentConversation: null });
  },

  initializeMockData: () => {
    // Initialize with sample comparison data
    const mockComparisons: SiteComparison[] = [
      {
        siteId: 'site-001',
        siteName: 'Clear Creek WTP',
        metrics: {
          flowRate: 1250,
          turbidity: 0.42,
          pH: 7.2,
          chlorine: 1.2,
          uptime: 98.5,
        },
        scores: {
          efficiency: 92,
          reliability: 96,
          quality: 94,
          overall: 94,
        },
      },
      {
        siteId: 'site-002',
        siteName: 'River Valley Plant',
        metrics: {
          flowRate: 980,
          turbidity: 0.38,
          pH: 7.3,
          chlorine: 1.1,
          uptime: 97.2,
        },
        scores: {
          efficiency: 88,
          reliability: 94,
          quality: 92,
          overall: 91,
        },
      },
      {
        siteId: 'site-003',
        siteName: 'Mountain View Station',
        metrics: {
          flowRate: 1100,
          turbidity: 0.45,
          pH: 7.1,
          chlorine: 1.3,
          uptime: 96.8,
        },
        scores: {
          efficiency: 85,
          reliability: 92,
          quality: 90,
          overall: 89,
        },
      },
    ];

    set({ comparisonData: mockComparisons });
  },
}));
