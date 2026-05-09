export interface ParseResult {
  format: 'tree' | 'json' | 'compact';
  raw: string;
  parsed: ExplainOutput;
}

export interface ExplainOutput {
  queryPlanner?: QueryPlanner;
  executionStats?: ExecutionStats;
  serverInfo?: ServerInfo;
}

export interface QueryPlanner {
  namespace: string;
  indexFilterSet: boolean;
  parsedQuery: Record<string, any>;
  winningPlan: PlanStage;
  rejectedPlans?: PlanStage[];
}

export interface ExecutionStats {
  executionSuccess: boolean;
  nReturned: number;
  executionTimeMillis: number;
  totalKeysExamined: number;
  totalDocsExamined: number;
  executionStages: PlanStage;
  allPlansExecution?: PlanStage[];
}

export interface ServerInfo {
  host: string;
  port: number;
  version: string;
  gitVersion: string;
}

export interface PlanStage {
  stage: string;
  nReturned?: number;
  executionTimeMillisEstimate?: number;
  works?: number;
  advanced?: number;
  docsExamined?: number;
  keysExamined?: number;
  inputStage?: PlanStage;
  inputStages?: PlanStage[];
  indexName?: string;
  keyPattern?: Record<string, number>;
  direction?: string;
  filter?: Record<string, any>;
}

export interface QueryMetrics {
  executionTimeMillis: number;
  nReturned: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  docsPerReturn: number;
  indexUsed: boolean;
  indexName?: string;
  scanType: 'COLLSCAN' | 'IXSCAN' | 'COUNT_SCAN' | 'COUNT' | 'IDHACK' | 'TEXT' | 'PROJECTION' | 'other';
  stages: StageMetrics[];
}

export interface StageMetrics {
  stage: string;
  nReturned: number;
  executionTimeMillisEstimate: number;
  docsExamined?: number;
  keysExamined?: number;
  indexName?: string;
  keyPattern?: Record<string, number>;
}

export interface AnalysisReport {
  metrics: QueryMetrics;
  score: number;
  issues: Issue[];
  suggestions: Suggestion[];
  timestamp: string;
}

export interface Issue {
  type: 'critical' | 'warning' | 'info';
  category: 'scan' | 'index' | 'memory' | 'sort' | 'other';
  message: string;
  details?: Record<string, any>;
}

export interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  category: 'index' | 'query' | 'schema' | 'sharding';
  title: string;
  description: string;
  example?: string;
}

export interface BatchReport {
  version: string;
  generatedAt: string;
  summary: {
    totalQueries: number;
    slowQueries: number;
    avgScore: number;
  };
  queries: SingleQueryReport[];
}

export interface SingleQueryReport {
  id: string;
  namespace?: string;
  metrics: QueryMetrics;
  score: number;
  issues: Issue[];
  suggestions: Suggestion[];
}

export interface Config {
  threshold: {
    slowQuery: number;
    verySlowQuery: number;
  };
  scoring: {
    weights: {
      executionTime: number;
      scanRatio: number;
      indexUsage: number;
    };
  };
  output: {
    defaultFormat: 'json' | 'csv' | 'html';
    colorize: boolean;
    tableStyle: 'compact' | 'full';
  };
  suggestions: {
    enableIndexSuggestions: boolean;
    enableQuerySuggestions: boolean;
    minSelectivity: number;
  };
}
