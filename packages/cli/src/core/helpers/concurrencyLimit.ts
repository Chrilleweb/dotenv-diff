/**
 * Creates a concurrency limiter that ensures at most `limit` async tasks
 * run simultaneously.
 * @param concurrency The maximum number of concurrent tasks allowed.
 * @returns A function that wraps async tasks to enforce the concurrency limit.
 */
export function createConcurrencyLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        active++;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          active--;
          queue.shift()?.();
        }
      };

      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}
