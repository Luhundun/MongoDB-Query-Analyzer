import chalk from 'chalk';

export interface LoggerOptions {
  silent: boolean;
  verbose: boolean;
  colorize: boolean;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      silent: false,
      verbose: false,
      colorize: true,
      ...options
    };
  }

  setOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  info(message: string): void {
    if (this.options.silent) return;
    console.log(this.colorize(message, 'blue'));
  }

  success(message: string): void {
    if (this.options.silent) return;
    console.log(this.colorize(message, 'green'));
  }

  warn(message: string): void {
    if (this.options.silent) return;
    console.log(this.colorize(message, 'yellow'));
  }

  error(message: string): void {
    if (this.options.silent) return;
    console.error(this.colorize(message, 'red'));
  }

  debug(message: string): void {
    if (this.options.silent || !this.options.verbose) return;
    console.log(this.colorize(`[DEBUG] ${message}`, 'gray'));
  }

  private colorize(message: string, color: string): string {
    if (!this.options.colorize) return message;
    
    switch (color) {
      case 'green':
        return chalk.green(message);
      case 'yellow':
        return chalk.yellow(message);
      case 'red':
        return chalk.red(message);
      case 'blue':
        return chalk.blue(message);
      case 'gray':
        return chalk.gray(message);
      default:
        return message;
    }
  }
}

export const logger = new Logger();
export default logger;
