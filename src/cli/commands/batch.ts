import { Command } from 'commander';
import * as path from 'path';
import { parse } from '../../parsers';
import { extractMetrics, extractNamespace } from '../../extractors/metrics-extractor';
import { analyze } from '../../analyzers/performance-analyzer';
import { generateBatchReport, ReportFormat } from '../../reporters';
import { readFile, writeFile, findFiles, isDirectory, fileExists } from '../../utils/file-reader';
import logger from '../../utils/logger';
import ora from 'ora';
import { AnalysisReport } from '../../types';

interface BatchOptions {
  dir?: string;
  pattern?: string;
  recursive?: boolean;
  format?: string;
  output?: string;
  verbose?: boolean;
  silent?: boolean;
  color?: boolean;
}

export function createBatchCommand(): Command {
  const command = new Command('batch')
    .description('Batch analyze multiple MongoDB explain outputs')
    .option('-d, --dir <path>', 'Directory containing explain files')
    .option('-p, --pattern <pattern>', 'File pattern to match (e.g., "*.explain")', '*.explain')
    .option('-r, --recursive', 'Search recursively in subdirectories', false)
    .option('-F, --format <format>', 'Output format (json, csv, html)', 'json')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-s, --silent', 'Suppress output', false)
    .option('-c, --color', 'Enable color output', true)
    .action(async (options: BatchOptions) => {
      try {
        // Configure logger
        logger.setOptions({
          verbose: options.verbose || false,
          silent: options.silent || false,
          colorize: options.color !== false
        });

        const spinner = ora({
          text: 'Scanning for files...',
          isEnabled: !options.silent && process.stdout.isTTY
        }).start();

        // Find files to analyze
        let files: string[] = [];
        
        if (options.dir) {
          if (!isDirectory(options.dir)) {
            spinner.fail(`Directory not found: ${options.dir}`);
            process.exit(1);
          }
          const pattern = path.join(options.dir, options.recursive ? '**' : '', options.pattern || '*.explain');
          files = await findFiles(pattern, options.recursive);
        } else {
          // Use current directory
          const pattern = path.join(process.cwd(), options.recursive ? '**' : '', options.pattern || '*.explain');
          files = await findFiles(pattern, options.recursive);
        }

        if (files.length === 0) {
          spinner.fail('No files found matching the pattern');
          process.exit(1);
        }

        logger.info(`Found ${files.length} file(s) to analyze`);

        // Analyze each file
        const results: Array<{ id: string; namespace?: string; report: AnalysisReport }> = [];
        let processed = 0;
        let errors = 0;

        for (const file of files) {
          spinner.text = `Analyzing ${path.basename(file)} (${processed + 1}/${files.length})...`;
          
          try {
            const input = readFile(file);
            const parseResult = parse(input);
            const metrics = extractMetrics(parseResult.parsed);
            const namespace = extractNamespace(parseResult.parsed);
            const report = analyze(metrics);
            
            results.push({
              id: path.basename(file, path.extname(file)),
              namespace,
              report
            });
            
            processed++;
          } catch (error) {
            logger.warn(`Failed to analyze ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            errors++;
          }
        }

        if (results.length === 0) {
          spinner.fail('No files could be analyzed successfully');
          process.exit(1);
        }

        spinner.text = 'Generating batch report...';
        const format = (options.format || 'json') as ReportFormat;
        const reportContent = await generateBatchReport(results, format);

        spinner.stop();

        // Output report
        if (options.output) {
          writeFile(options.output, reportContent);
          logger.success(`Batch report saved to: ${options.output}`);
        } else {
          console.log(reportContent);
        }

        // Print summary if not silent
        if (!options.silent) {
          printBatchSummary(results, processed, errors);
        }

      } catch (error) {
        logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (options.verbose) {
          console.error(error);
        }
        process.exit(1);
      }
    });

  return command;
}

function printBatchSummary(
  results: Array<{ id: string; namespace?: string; report: AnalysisReport }>,
  processed: number,
  errors: number
): void {
  console.log('\n' + '='.repeat(60));
  console.log('Batch Analysis Summary');
  console.log('='.repeat(60));
  
  const totalQueries = results.length;
  const avgScore = totalQueries > 0
    ? Math.round(results.reduce((sum, r) => sum + r.report.score, 0) / totalQueries)
    : 0;
  const slowQueries = results.filter(r => r.report.metrics.executionTimeMillis >= 100).length;
  const criticalIssues = results.reduce((sum, r) => 
    sum + r.report.issues.filter(i => i.type === 'critical').length, 0
  );
  
  logger.info(`Files Processed: ${processed}`);
  logger.info(`Errors: ${errors}`);
  logger.info(`Total Queries: ${totalQueries}`);
  logger.info(`Average Score: ${avgScore}/100`);
  logger.info(`Slow Queries: ${slowQueries}`);
  logger.info(`Critical Issues: ${criticalIssues}`);
  
  // Top issues
  const allIssues = results.flatMap(r => r.report.issues);
  const issueCounts = new Map<string, number>();
  allIssues.forEach(issue => {
    const count = issueCounts.get(issue.message) || 0;
    issueCounts.set(issue.message, count + 1);
  });
  
  const sortedIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (sortedIssues.length > 0) {
    console.log('\nTop Issues:');
    sortedIssues.forEach(([message, count]) => {
      logger.info(`  ${count}x: ${message}`);
    });
  }
  
  // Lowest scoring queries
  const sortedByScore = [...results].sort((a, b) => a.report.score - b.report.score).slice(0, 5);
  
  if (sortedByScore.length > 0 && sortedByScore[0].report.score < 60) {
    console.log('\nQueries Needing Attention:');
    sortedByScore.forEach(({ id, report }) => {
      if (report.score < 60) {
        logger.warn(`  ${id}: Score ${report.score}/100 (${report.metrics.scanType})`);
      }
    });
  }
  
  console.log('='.repeat(60) + '\n');
}
