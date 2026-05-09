import { Config } from '../types';

export function getDefaultConfig(): Config {
  return {
    threshold: {
      slowQuery: 100,
      verySlowQuery: 1000
    },
    scoring: {
      weights: {
        executionTime: 0.3,
        scanRatio: 0.4,
        indexUsage: 0.3
      }
    },
    output: {
      defaultFormat: 'json',
      colorize: true,
      tableStyle: 'compact'
    },
    suggestions: {
      enableIndexSuggestions: true,
      enableQuerySuggestions: true,
      minSelectivity: 0.1
    }
  };
}

export function mergeConfig(userConfig: Partial<Config>): Config {
  const defaultConfig = getDefaultConfig();
  
  return {
    threshold: {
      ...defaultConfig.threshold,
      ...userConfig.threshold
    },
    scoring: {
      weights: {
        ...defaultConfig.scoring.weights,
        ...userConfig.scoring?.weights
      }
    },
    output: {
      ...defaultConfig.output,
      ...userConfig.output
    },
    suggestions: {
      ...defaultConfig.suggestions,
      ...userConfig.suggestions
    }
  };
}
