import { AnalysisReport } from '../types';
import { generateJsonReport, generateBatchJsonReport } from './json-reporter';
import { generateCsvReport, generateBatchCsvReport } from './csv-reporter';
import { generateHtmlReport } from './html-reporter';

export type ReportFormat = 'json' | 'csv' | 'html';

export async function generateReport(
  report: AnalysisReport,
  format: ReportFormat
): Promise<string> {
  switch (format) {
    case 'json':
      return generateJsonReport(report);
    case 'csv':
      return generateCsvReport(report);
    case 'html':
      return generateHtmlReport(report);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export async function generateBatchReport(
  reports: Array<{ id: string; namespace?: string; report: AnalysisReport }>,
  format: ReportFormat
): Promise<string> {
  switch (format) {
    case 'json':
      return generateBatchJsonReport(reports);
    case 'csv':
      return generateBatchCsvReport(reports);
    case 'html':
      // For HTML batch report, generate a summary HTML
      return generateBatchHtmlReport(reports);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function generateBatchHtmlReport(
  reports: Array<{ id: string; namespace?: string; report: AnalysisReport }>
): string {
  const totalQueries = reports.length;
  const avgScore = totalQueries > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.report.score, 0) / totalQueries)
    : 0;
  const slowQueries = reports.filter(r => r.report.metrics.executionTimeMillis >= 100).length;
  const criticalIssues = reports.reduce((sum, r) => 
    sum + r.report.issues.filter(i => i.type === 'critical').length, 0
  );
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB Query Analysis - Batch Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .summary-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .summary-label {
            font-size: 0.9rem;
            color: #888;
            margin-top: 5px;
        }
        
        .queries-table {
            width: 100%;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .queries-table th,
        .queries-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .queries-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #555;
        }
        
        .queries-table tr:hover {
            background: #f8f9fa;
        }
        
        .score-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        
        .score-good { background: #d4edda; color: #155724; }
        .score-medium { background: #fff3cd; color: #856404; }
        .score-bad { background: #f8d7da; color: #721c24; }
        
        .footer {
            text-align: center;
            color: white;
            opacity: 0.8;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Batch Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value">${totalQueries}</div>
                <div class="summary-label">Total Queries</div>
            </div>
            <div class="summary-card">
                <div class="summary-value" style="color: ${avgScore >= 80 ? '#00C851' : avgScore >= 60 ? '#ffbb33' : '#ff4444'}">${avgScore}</div>
                <div class="summary-label">Average Score</div>
            </div>
            <div class="summary-card">
                <div class="summary-value" style="color: ${slowQueries > 0 ? '#ff4444' : '#00C851'}">${slowQueries}</div>
                <div class="summary-label">Slow Queries</div>
            </div>
            <div class="summary-card">
                <div class="summary-value" style="color: ${criticalIssues > 0 ? '#ff4444' : '#00C851'}">${criticalIssues}</div>
                <div class="summary-label">Critical Issues</div>
            </div>
        </div>
        
        <table class="queries-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Namespace</th>
                    <th>Score</th>
                    <th>Exec Time</th>
                    <th>Docs Examined</th>
                    <th>Scan Type</th>
                    <th>Issues</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(({ id, namespace, report }) => {
                  const scoreClass = report.score >= 80 ? 'score-good' : report.score >= 60 ? 'score-medium' : 'score-bad';
                  return `
                    <tr>
                        <td>${id}</td>
                        <td>${namespace || '-'}</td>
                        <td><span class="score-badge ${scoreClass}">${report.score}</span></td>
                        <td>${report.metrics.executionTimeMillis}ms</td>
                        <td>${report.metrics.totalDocsExamined.toLocaleString()}</td>
                        <td>${report.metrics.scanType}</td>
                        <td>${report.issues.length}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Generated by MongoDB Query Analyzer v1.0.0</p>
        </div>
    </div>
</body>
</html>`;
}

export { generateJsonReport, generateBatchJsonReport };
export { generateCsvReport, generateBatchCsvReport };
export { generateHtmlReport };
