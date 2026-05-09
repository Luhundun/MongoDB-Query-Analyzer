import { QueryMetrics, AnalysisReport, Issue, Suggestion, Config } from '../types';
import { getDefaultConfig } from '../config/default';

export function analyze(
  metrics: QueryMetrics, 
  config: Config = getDefaultConfig()
): AnalysisReport {
  const issues = detectIssues(metrics, config);
  const suggestions = generateSuggestions(metrics, issues, config);
  const score = calculateScore(metrics, issues, config);
  
  return {
    metrics,
    score,
    issues,
    suggestions,
    timestamp: new Date().toISOString()
  };
}

function detectIssues(metrics: QueryMetrics, config: Config): Issue[] {
  const issues: Issue[] = [];
  
  // Check for slow query
  if (metrics.executionTimeMillis >= config.threshold.verySlowQuery) {
    issues.push({
      type: 'critical',
      category: 'other',
      message: `Very slow query detected: ${metrics.executionTimeMillis}ms (threshold: ${config.threshold.verySlowQuery}ms)`,
      details: { executionTimeMillis: metrics.executionTimeMillis }
    });
  } else if (metrics.executionTimeMillis >= config.threshold.slowQuery) {
    issues.push({
      type: 'warning',
      category: 'other',
      message: `Slow query detected: ${metrics.executionTimeMillis}ms (threshold: ${config.threshold.slowQuery}ms)`,
      details: { executionTimeMillis: metrics.executionTimeMillis }
    });
  }
  
  // Check for collection scan
  if (metrics.scanType === 'COLLSCAN') {
    issues.push({
      type: 'critical',
      category: 'scan',
      message: 'Full collection scan detected - no index used',
      details: { 
        docsExamined: metrics.totalDocsExamined,
        docsReturned: metrics.nReturned 
      }
    });
  }
  
  // Check for high scan ratio
  const scanRatio = metrics.nReturned > 0 
    ? metrics.totalDocsExamined / metrics.nReturned 
    : metrics.totalDocsExamined;
  
  if (scanRatio > 100) {
    issues.push({
      type: 'critical',
      category: 'scan',
      message: `Very high scan ratio: ${scanRatio.toFixed(1)} documents examined per document returned`,
      details: { scanRatio, docsExamined: metrics.totalDocsExamined, docsReturned: metrics.nReturned }
    });
  } else if (scanRatio > 10) {
    issues.push({
      type: 'warning',
      category: 'scan',
      message: `High scan ratio: ${scanRatio.toFixed(1)} documents examined per document returned`,
      details: { scanRatio, docsExamined: metrics.totalDocsExamined, docsReturned: metrics.nReturned }
    });
  }
  
  // Check for in-memory sort
  const hasSortStage = metrics.stages.some(s => s.stage === 'SORT');
  const hasIndexSort = metrics.stages.some(s => 
    s.stage === 'IXSCAN' && s.keyPattern && Object.keys(s.keyPattern).length > 0
  );
  
  if (hasSortStage && !hasIndexSort) {
    issues.push({
      type: 'warning',
      category: 'memory',
      message: 'In-memory sort detected - consider adding an index for the sort field',
      details: { stage: 'SORT' }
    });
  }
  
  // Check for large number of documents examined
  if (metrics.totalDocsExamined > 10000) {
    issues.push({
      type: 'warning',
      category: 'scan',
      message: `Large number of documents examined: ${metrics.totalDocsExamined}`,
      details: { docsExamined: metrics.totalDocsExamined }
    });
  }
  
  // Check for ineffective index usage
  if (metrics.indexUsed && metrics.totalKeysExamined > metrics.nReturned * 10) {
    issues.push({
      type: 'warning',
      category: 'index',
      message: `Ineffective index usage: ${metrics.totalKeysExamined} keys examined for ${metrics.nReturned} documents returned`,
      details: { 
        keysExamined: metrics.totalKeysExamined, 
        docsReturned: metrics.nReturned,
        indexName: metrics.indexName 
      }
    });
  }
  
  return issues;
}

function generateSuggestions(
  metrics: QueryMetrics, 
  issues: Issue[],
  config: Config
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (!config.suggestions.enableIndexSuggestions && !config.suggestions.enableQuerySuggestions) {
    return suggestions;
  }
  
  // Suggest index for collection scan
  if (metrics.scanType === 'COLLSCAN' && config.suggestions.enableIndexSuggestions) {
    suggestions.push({
      priority: 'high',
      category: 'index',
      title: 'Create index to avoid collection scan',
      description: 'The query is performing a full collection scan. Create an index on the query filter fields to improve performance.',
      example: 'db.collection.createIndex({ field: 1 })'
    });
  }
  
  // Suggest compound index for multiple filter fields
  const hasMultipleFilters = issues.some(i => 
    i.category === 'scan' && i.type === 'critical'
  );
  
  if (hasMultipleFilters && config.suggestions.enableIndexSuggestions) {
    suggestions.push({
      priority: 'high',
      category: 'index',
      title: 'Consider a compound index',
      description: 'If your query filters on multiple fields, consider creating a compound index that includes all filter fields in order of selectivity.',
      example: 'db.collection.createIndex({ highSelectivityField: 1, lowSelectivityField: 1 })'
    });
  }
  
  // Suggest covered query
  if (metrics.indexUsed && config.suggestions.enableQuerySuggestions) {
    suggestions.push({
      priority: 'medium',
      category: 'query',
      title: 'Use projection for covered queries',
      description: 'If you only need specific fields, use projection to create a covered query that can be satisfied entirely from the index.',
      example: 'db.collection.find({ field: value }, { _id: 0, field: 1, otherField: 1 })'
    });
  }
  
  // Suggest index for sort
  const hasSortIssue = issues.some(i => 
    i.category === 'memory' && i.message.includes('sort')
  );
  
  if (hasSortIssue && config.suggestions.enableIndexSuggestions) {
    suggestions.push({
      priority: 'high',
      category: 'index',
      title: 'Add index for sort operation',
      description: 'Create an index that supports the sort operation to avoid in-memory sorting.',
      example: 'db.collection.createIndex({ sortField: 1 })'
    });
  }
  
  // Suggest query limit
  if (metrics.nReturned > 1000 && config.suggestions.enableQuerySuggestions) {
    suggestions.push({
      priority: 'medium',
      category: 'query',
      title: 'Consider adding a limit',
      description: `The query returns ${metrics.nReturned} documents. Consider adding a limit() to reduce the result set size.`,
      example: 'db.collection.find({}).limit(100)'
    });
  }
  
  // Suggest pagination for large result sets
  if (metrics.nReturned > 100 && config.suggestions.enableQuerySuggestions) {
    suggestions.push({
      priority: 'low',
      category: 'query',
      title: 'Implement pagination',
      description: 'For large result sets, implement pagination using skip() and limit() or cursor-based pagination.',
      example: 'db.collection.find({}).skip(100).limit(100)'
    });
  }
  
  return suggestions;
}

function calculateScore(
  metrics: QueryMetrics, 
  issues: Issue[],
  config: Config
): number {
  const weights = config.scoring.weights;
  let score = 100;
  
  // Execution time score (0-100)
  let executionTimeScore = 100;
  if (metrics.executionTimeMillis > 100) {
    executionTimeScore = Math.max(0, 100 - (metrics.executionTimeMillis - 100) / 10);
  }
  
  // Scan ratio score (0-100)
  let scanRatioScore = 100;
  const scanRatio = metrics.nReturned > 0 
    ? metrics.totalDocsExamined / metrics.nReturned 
    : 0;
  if (scanRatio > 1) {
    scanRatioScore = Math.max(0, 100 - (scanRatio - 1) * 5);
  }
  
  // Index usage score (0-100)
  let indexScore = metrics.indexUsed ? 100 : 0;
  
  // Calculate weighted score
  score = (
    executionTimeScore * weights.executionTime +
    scanRatioScore * weights.scanRatio +
    indexScore * weights.indexUsage
  );
  
  // Apply penalties for critical issues
  const criticalCount = issues.filter(i => i.type === 'critical').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  score -= criticalCount * 15;
  score -= warningCount * 5;
  
  // Additional penalty for collection scan
  if (metrics.scanType === 'COLLSCAN') {
    score -= 10;
  }
  
  return Math.max(0, Math.round(score));
}
