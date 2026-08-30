import type { LoggerService } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

export class StructuredLogger implements LoggerService {
  constructor(private readonly service: string) {}

  log(message: unknown, context?: string): void { this.write('info', message, context); }
  warn(message: unknown, context?: string): void { this.write('warn', message, context); }
  debug(message: unknown, context?: string): void { this.write('debug', message, context); }
  verbose(message: unknown, context?: string): void { this.write('debug', message, context); }
  fatal(message: unknown, context?: string): void { this.write('fatal', message, context); }
  error(message: unknown, stack?: string, context?: string): void { this.write('error', message, context, stack); }

  private write(level: string, message: unknown, context?: string, stack?: string): void {
    const activeSpan = trace.getActiveSpan();
    const traceId = activeSpan?.spanContext().traceId;
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      traceId,
      ...(stack ? { stack } : {}),
    };
    const line = `${JSON.stringify(payload)}\n`;
    if (level === 'error' || level === 'fatal') process.stderr.write(line);
    else process.stdout.write(line);
  }
}
