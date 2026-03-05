#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const rootDir = process.cwd();
const secretPath = join(rootDir, '.integrity-suite', '.user_secret');
const reqPath = join(rootDir, '.integrity-suite', 'docs', 'requirements.md');

if (!existsSync(secretPath)) {
  console.error('❌ Error: No se encuentra el archivo .integrity-suite/.user_secret');
  console.log('Por favor, crea el archivo con tu palabra secreta primero.');
  process.exit(1);
}

if (!existsSync(reqPath)) {
  console.error('❌ Error: No se encuentra requirements.md');
  process.exit(1);
}

const secret = readFileSync(secretPath, 'utf8').trim();
const content = readFileSync(reqPath, 'utf8');

// Extraer el ID del último requerimiento en el historial
const historySection = content.split('## Historial de requerimientos')[1];
if (!historySection) {
  console.error('❌ No se encontró la sección de historial en requirements.md');
  process.exit(1);
}

const reqMatch = historySection.match(/### Requerimiento\s+(\d+)/);
if (!reqMatch) {
  console.error('❌ No se encontraron requerimientos en el historial.');
  process.exit(1);
}

const id = reqMatch[1];

// Verificar si el requerimiento ya está aprobado
const reqBlock = historySection.split('### Requerimiento')[1];
if (reqBlock.includes('- **Estado**: Aprobado')) {
  console.log(`\nℹ️  El Requerimiento #${id} ya está marcado como "Aprobado".`);
  console.log(`No hay requerimientos pendientes de firma.\n`);
  process.exit(0);
}

const status = 'Aprobado';
const hash = createHash('sha256').update(`${id}${status}${secret}`).digest('hex');

console.log(`\n✅ Sello generado para el Requerimiento #${id}:`);
console.log(`---------------------------------------------------------`);
console.log(hash);
console.log(`---------------------------------------------------------`);
console.log(`Copia este hash en el campo "**Sello de usuario**" de tu archivo requirements.md\n`);
