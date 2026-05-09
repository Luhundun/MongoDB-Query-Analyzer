import { ParseResult, ExplainOutput } from '../types';
import { detectFormat, isValidExplainOutput } from './format-detector';
import { parseTreeFormat } from './tree-parser';
import { parseJsonFormat } from './json-parser';

export function parse(input: string): ParseResult {
  if (!isValidExplainOutput(input)) {
    throw new Error('Input does not appear to be a valid MongoDB explain output');
  }
  
  const format = detectFormat(input);
  let parsed: ExplainOutput;
  
  switch (format) {
    case 'tree':
      parsed = parseTreeFormat(input);
      break;
    case 'json':
      parsed = parseJsonFormat(input);
      break;
    case 'compact':
      // For compact format, try JSON first, then fall back to tree
      try {
        parsed = parseJsonFormat(input);
      } catch {
        parsed = parseTreeFormat(input);
      }
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  return {
    format,
    raw: input,
    parsed
  };
}

export { detectFormat, isValidExplainOutput };
export { parseTreeFormat } from './tree-parser';
export { parseJsonFormat } from './json-parser';
