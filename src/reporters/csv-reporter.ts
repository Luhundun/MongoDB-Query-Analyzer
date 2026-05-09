import { AnalysisReport } from '../types';
import { writeToString } from 'fast-csv';

interface CsvRow {
  timestamp: string;
  score: number;
  executionTimeMillis: number;
  nReturned: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  docsPerReturn: number;
  indexUsed: string;
  scanType: string;
  indexName: string;
  issueCount: number;
  criticalIssues: number;
  warningIssues: number;
  suggestionCount: number;
}

export async function generateCsvReport(report: AnalysisReport): Promise<string> {
  const row: CsvRow = {
    timestamp: report.timestamp,
    score: report.score,
    executionTimeMillis: report.metrics.executionTimeMillis,
    nReturned: report.metrics.nReturned,
    totalDocsExamined: report.metrics.totalDocsExamined,
    totalKeysExamined: report.metrics.totalKeysExamined,
    docsPerReturn: Number(report.metrics.docsPerReturn.toFixed(2)),
    indexUsed: report.metrics.indexUsed ? 'Yes' : 'No',
    scanType: report.metrics.scanType,
    indexName: report.metrics.indexName || '',
    issueCount: report.issues.length,
    criticalIssues: report.issues.filter(i => i.type === 'critical').length,
    warningIssues: report.issues.filter(i => i.type === 'warning').length,
    suggestionCount: report.suggestions.length
  };
  
  return writeToString([row], {
    headers: true,
    includeEndRowDelimiter: true
  });
}

export async function generateBatchCsvReport(
  reports: Array<{ id: string; namespace?: string; report: AnalysisReport }>
): Promise<string> {
  const rows = reports.map(({ id, namespace, report }) => ({
    id,
    namespace: namespace || '',
    timestamp: report.timestamp,
    score: report.score,
    executionTimeMillis: report.metrics.executionTimeMillis,
    nReturned: report.metrics.nReturned,
    totalDocsExamined: report.metrics.totalDocsExamined,
    totalKeysExamined: report.metrics.totalKeysExamined,
    docsPerReturn: Number(report.metrics.docsPerReturn.toFixed(2)),
    indexUsed: report.metrics.indexUsed ? 'Yes' : 'No',
    scanType: report.metrics.scanType,
    indexName: report.metrics.indexName || '',
    issueCount: report.issues.length,
    criticalIssues: report.issues.filter(i => i.type === 'critical').length,
    warningIssues: report.issues.filter(i => i.type === 'warning').length,
    suggestionCount: report.suggestions.length
  }));
  
  return writeToString(rows, {
    headers: true,
    includeEndRowDelimiter: true
  });
}
