import { AnalysisReport, BatchReport, SingleQueryReport } from '../types';

export function generateJsonReport(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

export function generateBatchJsonReport(
  reports: Array<{ id: string; namespace?: string; report: AnalysisReport }>
): string {
  const batchReport: BatchReport = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    summary: calculateSummary(reports.map(r => r.report)),
    queries: reports.map(({ id, namespace, report }) => ({
      id,
      namespace,
      metrics: report.metrics,
      score: report.score,
      issues: report.issues,
      suggestions: report.suggestions
    }))
  };
  
  return JSON.stringify(batchReport, null, 2);
}

function calculateSummary(reports: AnalysisReport[]): BatchReport['summary'] {
  const totalQueries = reports.length;
  const slowQueries = reports.filter(r => r.metrics.executionTimeMillis >= 100).length;
  const avgScore = totalQueries > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / totalQueries)
    : 0;
  
  return {
    totalQueries,
    slowQueries,
    avgScore
  };
}
