#!/usr/bin/env node

import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze';
import { createBatchCommand } from './commands/batch';
import { readFile } from '../utils/file-reader';
import * as path from 'path';

const packageJson = JSON.parse(readFile(path.join(__dirname, '../../package.json')));

const program = new Command();

program
  .name('mqa')
  .description('MongoDB Query Analyzer - CLI tool for analyzing MongoDB query performance')
  .version(packageJson.version);

// Add commands
program.addCommand(createAnalyzeCommand());
program.addCommand(createBatchCommand());

// Global help
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ mqa analyze --file explain.txt --format html --output report.html');
  console.log('  $ cat explain.txt | mqa analyze --format json');
  console.log('  $ mqa batch --dir ./logs --pattern "*.explain" --format csv');
  console.log('');
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
