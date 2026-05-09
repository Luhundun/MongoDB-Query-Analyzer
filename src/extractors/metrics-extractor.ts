import { ExplainOutput, QueryMetrics, StageMetrics, PlanStage } from '../types';

export function extractMetrics(output: ExplainOutput): QueryMetrics {
  const executionStats = output.executionStats;
  const queryPlanner = output.queryPlanner;
  
  if (!executionStats) {
    throw new Error('No execution stats found in explain output');
  }
  
  const stages = extractStageMetrics(executionStats.executionStages);
  const scanType = determineScanType(executionStats.executionStages);
  const indexUsed = scanType === 'IXSCAN' || scanType === 'COUNT_SCAN' || scanType === 'IDHACK';
  
  const metrics: QueryMetrics = {
    executionTimeMillis: executionStats.executionTimeMillis,
    nReturned: executionStats.nReturned,
    totalDocsExamined: executionStats.totalDocsExamined,
    totalKeysExamined: executionStats.totalKeysExamined,
    docsPerReturn: executionStats.nReturned > 0 
      ? executionStats.totalDocsExamined / executionStats.nReturned 
      : 0,
    indexUsed,
    scanType,
    stages
  };
  
  // Extract index name if index is used
  if (indexUsed) {
    metrics.indexName = findIndexName(executionStats.executionStages);
  }
  
  return metrics;
}

function extractStageMetrics(stage: PlanStage): StageMetrics[] {
  const metrics: StageMetrics[] = [];
  
  function traverse(s: PlanStage): void {
    const metric: StageMetrics = {
      stage: s.stage,
      nReturned: s.nReturned || 0,
      executionTimeMillisEstimate: s.executionTimeMillisEstimate || 0
    };
    
    if (s.docsExamined !== undefined) {
      metric.docsExamined = s.docsExamined;
    }
    
    if (s.keysExamined !== undefined) {
      metric.keysExamined = s.keysExamined;
    }
    
    if (s.indexName) {
      metric.indexName = s.indexName;
    }
    
    if (s.keyPattern) {
      metric.keyPattern = s.keyPattern;
    }
    
    metrics.push(metric);
    
    // Traverse inputStage
    if (s.inputStage) {
      traverse(s.inputStage);
    }
    
    // Traverse inputStages (for OR stages)
    if (s.inputStages && Array.isArray(s.inputStages)) {
      s.inputStages.forEach(traverse);
    }
  }
  
  traverse(stage);
  return metrics;
}

function determineScanType(stage: PlanStage): QueryMetrics['scanType'] {
  const stageTypes = collectStageTypes(stage);
  
  if (stageTypes.has('COLLSCAN')) {
    return 'COLLSCAN';
  }
  
  if (stageTypes.has('IXSCAN')) {
    return 'IXSCAN';
  }
  
  if (stageTypes.has('COUNT_SCAN')) {
    return 'COUNT_SCAN';
  }
  
  if (stageTypes.has('COUNT')) {
    return 'COUNT';
  }
  
  if (stageTypes.has('IDHACK')) {
    return 'IDHACK';
  }
  
  if (stageTypes.has('TEXT')) {
    return 'TEXT';
  }
  
  if (stageTypes.has('PROJECTION')) {
    return 'PROJECTION';
  }
  
  return 'other';
}

function collectStageTypes(stage: PlanStage): Set<string> {
  const types = new Set<string>();
  
  function traverse(s: PlanStage): void {
    types.add(s.stage);
    
    if (s.inputStage) {
      traverse(s.inputStage);
    }
    
    if (s.inputStages && Array.isArray(s.inputStages)) {
      s.inputStages.forEach(traverse);
    }
  }
  
  traverse(stage);
  return types;
}

function findIndexName(stage: PlanStage): string | undefined {
  function traverse(s: PlanStage): string | undefined {
    if (s.indexName) {
      return s.indexName;
    }
    
    if (s.inputStage) {
      const result = traverse(s.inputStage);
      if (result) return result;
    }
    
    if (s.inputStages && Array.isArray(s.inputStages)) {
      for (const inputStage of s.inputStages) {
        const result = traverse(inputStage);
        if (result) return result;
      }
    }
    
    return undefined;
  }
  
  return traverse(stage);
}

export function extractNamespace(output: ExplainOutput): string | undefined {
  return output.queryPlanner?.namespace;
}
