import { Command } from 'commander';
import { parse } from '../../parsers';
import { extractMetrics, extractNamespace } from '../../extractors/metrics-extractor';
import { analyze } from '../../analyzers/performance-analyzer';
import { generateReport, ReportFormat } from '../../reporters';
import { readFile, readStdin, writeFile } from '../../utils/file-reader';
import logger from '../../utils/logger';
import ora from 'ora';

interface AnalyzeOptions {
  file?: string;
  format?: string;
  output?: string;
  threshold?: string;
  verbose?: boolean;
  silent?: boolean;
  color?: boolean;
}

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze')
    .description('Analyze a single MongoDB explain output')
    .option('-f, --file <path>', 'Input file path')
    .option('-F, --format <format>', 'Output format (json, csv, html)', 'json')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-t, --threshold <ms>', 'Slow query threshold in milliseconds', '100')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-s, --silent', 'Suppress output', false)
    .option('-c, --color', 'Enable color output', true)
    .action(async (options: AnalyzeOptions) => {
      try {
        // Configure logger
        logger.setOptions({
          verbose: options.verbose || false,
          silent: options.silent || false,
          colorize: options.color !== false
        });

        const spinner = ora({
          text: 'Reading input...',
          isEnabled: !options.silent && process.stdout.isTTY
        }).start();

        // Read input
        let input: string;
        if (options.file) {
          logger.debug(`Reading file: ${options.file}`);
          input = readFile(options.file);
        } else {
          logger.debug('Reading from stdin...');
          input = await readStdin();
        }

        if (!input.trim()) {
          spinner.fail('No input provided');
          process.exit(1);
        }

        spinner.text = 'Parsing explain output...';
        const parseResult = parse(input);
        logger.debug(`Detected format: ${parseResult.format}`);

        spinner.text = 'Extracting metrics...';
        const metrics = extractMetrics(parseResult.parsed);
        const namespace = extractNamespace(parseResult.parsed);
        
        logger.debug(`Namespace: ${namespace || 'unknown'}`);
        logger.debug(`Execution time: ${metrics.executionTimeMillis}ms`);
        logger.debug(`Scan type: ${metrics.scanType}`);

        spinner.text = 'Analyzing performance...';
        const report = analyze(metrics);

        spinner.text = 'Generating report...';
        const format = (options.format || 'json') as ReportFormat;
        const reportContent = await generateReport(report, format);

        spinner.stop();

        // Output report
        if (options.output) {
          writeFile(options.output, reportContent);
          logger.success(`Report saved to: ${options.output}`);
        } else {
          console.log(reportContent);
        }

        // Print summary if not silent
        if (!options.silent) {
          printSummary(report, namespace);
        }

        // Exit with error code if score is too low
        if (report.score < 50) {
          process.exit(1);
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

function printSummary(report: import('../../types').AnalysisReport, namespace?: string): void {
  console.log('\n' + '='.repeat(50));
  console.log('Analysis Summary');
  console.log('='.repeat(50));
  
  if (namespace) {
    console.log(`Namespace: ${namespace}`);
  }
  
  const scoreColor = report.score >= 80 ? 'green' : report.score >= 60 ? 'yellow' : 'red';
  const scoreEmoji = report.score >= 80 ? '😊' : report.score >= 60 ? '😐' : '😟';
  
  logger.info(`Performance Score: ${report.score}/100 ${scoreEmoji}`);
  logger.info(`Execution Time: ${report.metrics.executionTimeMillis}ms`);
  logger.info(`Documents Examined: ${report.metrics.totalDocsExamined.toLocaleString()}`);
  logger.info(`Documents Returned: ${report.metrics.nReturned.toLocaleString()}`);
  logger.info(`Scan Type: ${report.metrics.scanType}`);
  logger.info(`Index Used: ${report.metrics.indexUsed ? 'Yes' : 'No'}`);
  
  if (report.issues.length > 0) {
    console.log('\nIssues:');
    report.issues.forEach(issue => {
      const message = `  [${issue.type.toUpperCase()}] ${issue.message}`;
      if (issue.type === 'critical') {
        logger.error(message);
      } else if (issue.type === 'warning') {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    });
  }
  
  if (report.suggestions.length > 0) {
    console.log('\nSuggestions:');
    report.suggestions.forEach(suggestion => {
      logger.info(`  [${suggestion.priority.toUpperCase()}] ${suggestion.title}`);
    });
  }
  
  console.log('='.repeat(50) + '\n');
}
