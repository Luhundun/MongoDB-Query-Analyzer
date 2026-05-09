import { AnalysisReport } from '../types';

export function generateHtmlReport(report: AnalysisReport): string {
  const scoreColor = getScoreColor(report.score);
  const scoreEmoji = getScoreEmoji(report.score);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB Query Analysis Report</title>
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
        
        .header p {
            opacity: 0.9;
        }
        
        .score-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .score-value {
            font-size: 5rem;
            font-weight: bold;
            color: ${scoreColor};
            margin-bottom: 10px;
        }
        
        .score-emoji {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        
        .score-label {
            font-size: 1.2rem;
            color: #666;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-label {
            font-size: 0.9rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
        }
        
        .metric-unit {
            font-size: 1rem;
            color: #888;
            margin-left: 5px;
        }
        
        .section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        
        .issue-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 10px;
            border-left: 4px solid;
        }
        
        .issue-critical {
            background: #fee;
            border-color: #ff4444;
        }
        
        .issue-warning {
            background: #ffeaa7;
            border-color: #fdcb6e;
        }
        
        .issue-info {
            background: #e3f2fd;
            border-color: #33b5e5;
        }
        
        .issue-type {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8rem;
            margin-bottom: 5px;
        }
        
        .issue-critical .issue-type { color: #ff4444; }
        .issue-warning .issue-type { color: #e67e22; }
        .issue-info .issue-type { color: #33b5e5; }
        
        .suggestion-item {
            padding: 20px;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            color: white;
        }
        
        .suggestion-priority {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 10px;
            background: rgba(255,255,255,0.2);
        }
        
        .suggestion-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .suggestion-description {
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .suggestion-example {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            overflow-x: auto;
        }
        
        .stages-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .stages-table th,
        .stages-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .stages-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #555;
        }
        
        .stages-table tr:hover {
            background: #f8f9fa;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: bold;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
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
            <h1>MongoDB Query Analyzer</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="score-card">
            <div class="score-emoji">${scoreEmoji}</div>
            <div class="score-value" style="color: ${scoreColor}">${report.score}</div>
            <div class="score-label">Performance Score</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Execution Time</div>
                <div class="metric-value">${report.metrics.executionTimeMillis}<span class="metric-unit">ms</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Documents Returned</div>
                <div class="metric-value">${report.metrics.nReturned.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Documents Examined</div>
                <div class="metric-value">${report.metrics.totalDocsExamined.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Scan Type</div>
                <div class="metric-value" style="font-size: 1.5rem;">
                    <span class="badge ${getScanTypeBadgeClass(report.metrics.scanType)}">${report.metrics.scanType}</span>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Index Used</div>
                <div class="metric-value">
                    ${report.metrics.indexUsed ? '✅ Yes' : '❌ No'}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Docs per Return</div>
                <div class="metric-value">${report.metrics.docsPerReturn.toFixed(2)}</div>
            </div>
        </div>
        
        ${report.issues.length > 0 ? `
        <div class="section">
            <div class="section-title">⚠️ Issues Detected (${report.issues.length})</div>
            ${report.issues.map(issue => `
                <div class="issue-item issue-${issue.type}">
                    <div class="issue-type">${issue.type}</div>
                    <div>${issue.message}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${report.suggestions.length > 0 ? `
        <div class="section">
            <div class="section-title">💡 Optimization Suggestions (${report.suggestions.length})</div>
            ${report.suggestions.map(suggestion => `
                <div class="suggestion-item">
                    <span class="suggestion-priority">${suggestion.priority.toUpperCase()}</span>
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-description">${suggestion.description}</div>
                    ${suggestion.example ? `<div class="suggestion-example">${suggestion.example}</div>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="section">
            <div class="section-title">🔍 Execution Stages</div>
            <table class="stages-table">
                <thead>
                    <tr>
                        <th>Stage</th>
                        <th>Returned</th>
                        <th>Time (ms)</th>
                        <th>Docs Examined</th>
                        <th>Keys Examined</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.metrics.stages.map(stage => `
                        <tr>
                            <td><strong>${stage.stage}</strong></td>
                            <td>${stage.nReturned.toLocaleString()}</td>
                            <td>${stage.executionTimeMillisEstimate}</td>
                            <td>${stage.docsExamined?.toLocaleString() || '-'}</td>
                            <td>${stage.keysExamined?.toLocaleString() || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Generated by MongoDB Query Analyzer v1.0.0</p>
        </div>
    </div>
</body>
</html>`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00C851';
  if (score >= 60) return '#ffbb33';
  return '#ff4444';
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '😊';
  if (score >= 60) return '😐';
  return '😟';
}

function getScanTypeBadgeClass(scanType: string): string {
  switch (scanType) {
    case 'COLLSCAN':
      return 'badge-danger';
    case 'IXSCAN':
      return 'badge-success';
    default:
      return 'badge-warning';
  }
}
