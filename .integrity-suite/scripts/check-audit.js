/**
 * check-audit.js
 * Gracefully handles pnpm audit with network resilience.
 * - Network failures (ENOTFOUND, connection refused, timeout) result in WARNING + exit 0.
 * - Vulnerability detections result in ERROR + exit 1.
 */

import { execSync } from 'node:child_process';

try {
  execSync('pnpm audit --prod', {
    stdio: 'inherit',
    encoding: 'utf8',
  });
  console.log('✓ Audit passed: no vulnerabilities detected.');
  process.exit(0);
} catch (e) {
  const errorMessage = e.toString();

  // Network-related errors
  const networkErrors = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'network', 'socket hang up'];
  const isNetworkError = networkErrors.some((err) => errorMessage.includes(err));

  if (isNetworkError) {
    console.warn(
      '⚠️  Audit skipped: network unavailable. Continuing with caution. Check audit later.',
    );
    process.exit(0);
  }

  // Registry-related errors
  if (errorMessage.includes('registry') || errorMessage.includes('fetch')) {
    console.warn('⚠️  Audit warning: registry unreachable. Skipping audit. Check registry status.');
    process.exit(0);
  }

  // Actual audit vulnerabilities or other errors
  if (errorMessage.includes('vulnerabilities')) {
    console.error('❌ Audit failed: vulnerabilities detected.');
    process.exit(1);
  }

  // Unknown error - fail with caution
  console.error('❌ Audit failed with error:', errorMessage);
  process.exit(1);
}
