import { ParseResult } from '../types';

export function detectFormat(input: string): ParseResult['format'] {
  const trimmed = input.trim();
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON, continue to check other formats
    }
  }
  
  const treeIndicators = ['└─', '├─', '▾', '▸', '│', '├──', '└──'];
  if (treeIndicators.some(indicator => trimmed.includes(indicator))) {
    return 'tree';
  }
  
  if (trimmed.includes('executionStats') || trimmed.includes('queryPlanner')) {
    return 'json';
  }
  
  return 'compact';
}

export function isValidExplainOutput(input: string): boolean {
  const trimmed = input.trim();
  
  if (!trimmed || trimmed.length < 10) {
    return false;
  }
  
  const requiredKeywords = [
    'stage',
    'executionStats',
    'queryPlanner',
    'nReturned',
    'docsExamined',
    'COLLSCAN',
    'IXSCAN',
    'FETCH'
  ];
  
  const lowerInput = trimmed.toLowerCase();
  return requiredKeywords.some(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  );
}
