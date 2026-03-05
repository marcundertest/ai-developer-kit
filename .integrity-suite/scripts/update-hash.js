import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const testFilePath = resolve(rootDir, 'tests', 'meta', 'integrity-suite.test.ts');
const hashFilePath = resolve(rootDir, '.integrity-suite', 'integrity-suite.sha256');

const hash = createHash('sha256').update(readFileSync(testFilePath)).digest('hex');
writeFileSync(hashFilePath, hash + '\n', 'utf8');

console.log(`integrity-suite.sha256 updated: ${hash}`);
