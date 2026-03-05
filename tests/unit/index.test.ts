import { describe, it, expect } from 'vitest';
import { version, ping, divide } from '../../src/index.js';

describe('Index Module', () => {
  it('should export the current version', () => {
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  });

  it('should respond to ping with pong', () => {
    expect(ping()).toBe('pong');
  });

  it('should divide two numbers correctly', () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(9, 3)).toBe(3);
  });

  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero is not allowed');
  });
});
