import { describe, it, expect } from 'vitest';
import { createConcurrencyLimit } from '../../../../src/core/helpers/concurrencyLimit.js';

describe('createConcurrencyLimit', () => {
  it('should run tasks sequentially when concurrency is 1', async () => {
    const limit = createConcurrencyLimit(1);
    const executionOrder: number[] = [];

    const task1 = limit(async () => {
      executionOrder.push(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'result1';
    });

    const task2 = limit(async () => {
      executionOrder.push(2);
      return 'result2';
    });

    const [result1, result2] = await Promise.all([task1, task2]);

    expect(executionOrder).toEqual([1, 2]);
    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
  });

  it('should run tasks in parallel up to concurrency limit', async () => {
    const limit = createConcurrencyLimit(2);
    const concurrent: number[] = [];
    const maxConcurrent: number[] = [];

    const task = (id: number) =>
      limit(async () => {
        concurrent.push(id);
        maxConcurrent.push(concurrent.length);
        await new Promise((resolve) => setTimeout(resolve, 5));
        concurrent.pop();
        return id;
      });

    await Promise.all([task(1), task(2), task(3), task(4), task(5)]);

    expect(Math.max(...maxConcurrent)).toBeLessThanOrEqual(2);
  });

  it('should queue tasks when concurrency limit is reached', async () => {
    const limit = createConcurrencyLimit(2);
    const results: number[] = [];

    const task = (id: number) =>
      limit(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(id);
        return id;
      });

    const promises = [1, 2, 3, 4, 5].map(task);
    await Promise.all(promises);

    expect(results).toHaveLength(5);
    expect(results).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
  });

  it('should handle task rejections', async () => {
    const limit = createConcurrencyLimit(2);

    const failTask = limit(async () => {
      throw new Error('Task failed');
    });

    const successTask = limit(async () => {
      return 'success';
    });

    await expect(failTask).rejects.toThrow('Task failed');
    const result = await successTask;
    expect(result).toBe('success');
  });

  it('should execute queued tasks after active task completes', async () => {
    const limit = createConcurrencyLimit(1);
    const executionOrder: string[] = [];

    const task = (name: string) =>
      limit(async () => {
        executionOrder.push(`${name}-start`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        executionOrder.push(`${name}-end`);
        return name;
      });

    const [r1, r2, r3] = await Promise.all([task('a'), task('b'), task('c')]);

    expect(r1).toBe('a');
    expect(r2).toBe('b');
    expect(r3).toBe('c');
    expect(executionOrder).toEqual([
      'a-start',
      'a-end',
      'b-start',
      'b-end',
      'c-start',
      'c-end',
    ]);
  });

  it('should allow high concurrency limits without issues', async () => {
    const limit = createConcurrencyLimit(100);
    const results: number[] = [];

    const task = (id: number) =>
      limit(async () => {
        results.push(id);
        return id;
      });

    const promises = Array.from({ length: 50 }, (_, i) => task(i));
    await Promise.all(promises);

    expect(results).toHaveLength(50);
  });

  it('should handle mixed success and failure in queue', async () => {
    const limit = createConcurrencyLimit(2);
    const results: (string | number)[] = [];

    const task1 = limit(async () => {
      results.push('task1');
      return 'task1-result';
    });

    const task2 = limit(async () => {
      throw new Error('task2-error');
    });

    const task3 = limit(async () => {
      results.push('task3');
      return 'task3-result';
    });

    const task1Result = await task1;
    expect(task1Result).toBe('task1-result');

    await expect(task2).rejects.toThrow('task2-error');

    const task3Result = await task3;
    expect(task3Result).toBe('task3-result');
    expect(results).toEqual(['task1', 'task3']);
  });
});
