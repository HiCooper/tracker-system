import type { BatchConfig } from '../types/EventTypes';
import { EventQueue } from '../queue/EventQueue';

export class Sender {
  private endpoint: string;
  private queue: EventQueue;
  private timer: number | null = null;
  private config!: Required<BatchConfig>;

  constructor(endpoint: string, queue: EventQueue) {
    this.endpoint = endpoint;
    this.queue = queue;
  }

  start(config: BatchConfig): void {
    this.config = {
      maxSize: config.maxSize ?? 50,
      interval: config.interval ?? 2000,
    };

    this.timer = window.setInterval(() => {
      this.flush();
    }, this.config.interval);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async flush(): Promise<void> {
    // Flush whenever queue is non-empty (not just when >= maxSize)
    if (this.queue.size() > 0) {
      try {
        await this.queue.flush(this.endpoint);
      } catch {
        // Logged in EventQueue
      }
    }
  }
}
