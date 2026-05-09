import { ExplainOutput } from '../types';

export function parseJsonFormat(input: string): ExplainOutput {
  const trimmed = input.trim();
  
  try {
    // Try standard JSON first
    const parsed = JSON.parse(trimmed);
    
    // Handle different JSON structures
    if (Array.isArray(parsed)) {
      // If it's an array, take the first element
      return normalizeExplainOutput(parsed[0] || {});
    }
    
    return normalizeExplainOutput(parsed);
  } catch (error) {
    // Try to parse as MongoDB shell format (relaxed JSON)
    try {
      const parsed = parseMongoShellFormat(trimmed);
      return normalizeExplainOutput(parsed);
    } catch {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

function parseMongoShellFormat(input: string): any {
  // Convert MongoDB shell format to valid JSON
  // 1. Remove trailing commas
  let cleaned = input.replace(/,\s*([}\]])/g, '$1');
  
  // 2. Wrap unquoted property names in double quotes
  // Match property names that are not already quoted
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  // 3. Handle special MongoDB types like ObjectId, ISODate, etc.
  // For now, we'll convert them to strings
  cleaned = cleaned.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');
  cleaned = cleaned.replace(/ISODate\("([^"]+)"\)/g, '"$1"');
  cleaned = cleaned.replace(/NumberLong\("([^"]+)"\)/g, '$1');
  cleaned = cleaned.replace(/NumberInt\("([^"]+)"\)/g, '$1');
  
  // 4. Handle [...] shorthand for arrays (keep as is, but ensure it's valid)
  cleaned = cleaned.replace(/\[\.\.\.\]/g, '[]');
  
  // 5. Handle undefined values
  cleaned = cleaned.replace(/: undefined/g, ': null');
  
  return JSON.parse(cleaned);
}

function normalizeExplainOutput(data: any): ExplainOutput {
  const output: ExplainOutput = {};
  
  // Extract queryPlanner
  if (data.queryPlanner) {
    output.queryPlanner = {
      namespace: data.queryPlanner.namespace || 'unknown.collection',
      indexFilterSet: data.queryPlanner.indexFilterSet || false,
      parsedQuery: data.queryPlanner.parsedQuery || {},
      winningPlan: normalizePlanStage(data.queryPlanner.winningPlan || { stage: 'UNKNOWN' }),
      rejectedPlans: data.queryPlanner.rejectedPlans?.map(normalizePlanStage) || []
    };
  }
  
  // Extract executionStats
  if (data.executionStats) {
    output.executionStats = {
      executionSuccess: data.executionStats.executionSuccess ?? true,
      nReturned: data.executionStats.nReturned || 0,
      executionTimeMillis: data.executionStats.executionTimeMillis || 0,
      totalKeysExamined: data.executionStats.totalKeysExamined || 0,
      totalDocsExamined: data.executionStats.totalDocsExamined || 0,
      executionStages: normalizePlanStage(data.executionStats.executionStages || data.executionStats.stageStats || { stage: 'UNKNOWN' }),
      allPlansExecution: data.executionStats.allPlansExecution?.map(normalizePlanStage) || []
    };
  }
  
  // If no executionStats but has stages directly
  if (!output.executionStats && (data.stage || data.stages || data.executionStages)) {
    const stage = data.executionStages || data.stage || data.stages;
    output.executionStats = {
      executionSuccess: true,
      nReturned: data.nReturned || 0,
      executionTimeMillis: data.executionTimeMillis || 0,
      totalKeysExamined: data.totalKeysExamined || 0,
      totalDocsExamined: data.totalDocsExamined || 0,
      executionStages: normalizePlanStage(stage)
    };
  }
  
  // Extract serverInfo if present
  if (data.serverInfo) {
    output.serverInfo = {
      host: data.serverInfo.host || 'unknown',
      port: data.serverInfo.port || 27017,
      version: data.serverInfo.version || 'unknown',
      gitVersion: data.serverInfo.gitVersion || 'unknown'
    };
  }
  
  return output;
}

function normalizePlanStage(data: any): any {
  if (!data || typeof data !== 'object') {
    return { stage: 'UNKNOWN' };
  }
  
  const stage: any = {
    stage: data.stage || 'UNKNOWN'
  };
  
  if (data.nReturned !== undefined) stage.nReturned = data.nReturned;
  if (data.executionTimeMillisEstimate !== undefined) {
    stage.executionTimeMillisEstimate = data.executionTimeMillisEstimate;
  }
  if (data.works !== undefined) stage.works = data.works;
  if (data.advanced !== undefined) stage.advanced = data.advanced;
  if (data.docsExamined !== undefined) stage.docsExamined = data.docsExamined;
  if (data.keysExamined !== undefined) stage.keysExamined = data.keysExamined;
  if (data.indexName !== undefined) stage.indexName = data.indexName;
  if (data.keyPattern !== undefined) stage.keyPattern = data.keyPattern;
  if (data.direction !== undefined) stage.direction = data.direction;
  if (data.filter !== undefined) stage.filter = data.filter;
  
  // Handle inputStage
  if (data.inputStage) {
    stage.inputStage = normalizePlanStage(data.inputStage);
  }
  
  // Handle inputStages (for OR stages)
  if (data.inputStages && Array.isArray(data.inputStages)) {
    stage.inputStages = data.inputStages.map(normalizePlanStage);
  }
  
  // Handle shard-specific fields
  if (data.shards) {
    stage.shards = data.shards;
  }
  
  return stage;
}
