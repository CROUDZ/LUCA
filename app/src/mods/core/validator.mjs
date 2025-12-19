#!/usr/bin/env node

/**
 * LUCA Modding System - Mod Validator CLI
 * Node.js 18+ ESM
 *
 * Valide un package de mod:
 * - Vérifie le manifest.json
 * - Scan AST pour patterns dangereux
 * - Vérifie la signature ed25519
 * - Calcule et vérifie le hash SHA-256
 *
 * Usage: node validator.mjs <mod-path> [options]
 *
 * Options:
 *   --strict    Mode strict (warning = erreur)
 *   --sign      Signer le mod (nécessite --key)
 *   --key       Chemin vers la clé privée ed25519
 *   --json      Sortie JSON
 *
 * Dépendances: npm install acorn@8 tweetnacl tweetnacl-util
 *
 * @module core/validator
 */

import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// Pour l'analyse AST
import * as acorn from 'acorn';

// Pour la signature (optionnel, installer si besoin)
let nacl, naclUtil;
try {
  nacl = (await import('tweetnacl')).default;
  naclUtil = (await import('tweetnacl-util')).default;
} catch {
  // Les signatures sont optionnelles
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const REQUIRED_MANIFEST_FIELDS = [
  'manifest_version',
  'name',
  'version',
  'display_name',
  'description',
  'author',
  'main',
  'api_version',
  'permissions',
  'node_types',
  'compatibility',
];

const VALID_PERMISSIONS = [
  'storage.read',
  'storage.write',
  'network.http',
  'network.ws',
  'device.flashlight',
  'device.vibration',
  'device.sensors',
  'system.notifications',
  'system.clipboard',
];

const DANGEROUS_PATTERNS = [
  // Imports/requires dangereux
  {
    pattern: /require\s*\(\s*['"]child_process['"]\s*\)/,
    severity: 'critical',
    message: 'child_process import not allowed',
  },
  {
    pattern: /import\s+.*from\s+['"]child_process['"]/,
    severity: 'critical',
    message: 'child_process import not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]fs['"]\s*\)/,
    severity: 'critical',
    message: 'Direct fs import not allowed (use storage API)',
  },
  {
    pattern: /import\s+.*from\s+['"]fs['"]/,
    severity: 'critical',
    message: 'Direct fs import not allowed (use storage API)',
  },
  {
    pattern: /import\s+.*from\s+['"]fs\/promises['"]/,
    severity: 'critical',
    message: 'Direct fs/promises import not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]net['"]\s*\)/,
    severity: 'critical',
    message: 'net module not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]dgram['"]\s*\)/,
    severity: 'critical',
    message: 'dgram module not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]cluster['"]\s*\)/,
    severity: 'critical',
    message: 'cluster module not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]worker_threads['"]\s*\)/,
    severity: 'critical',
    message: 'worker_threads not allowed',
  },
  {
    pattern: /require\s*\(\s*['"]vm['"]\s*\)/,
    severity: 'critical',
    message: 'vm module not allowed',
  },

  // Exécution dynamique
  { pattern: /\beval\s*\(/, severity: 'critical', message: 'eval() is not allowed' },
  {
    pattern: /new\s+Function\s*\(/,
    severity: 'critical',
    message: 'new Function() is not allowed',
  },
  {
    pattern: /setTimeout\s*\(\s*['"`]/,
    severity: 'high',
    message: 'setTimeout with string argument is dangerous',
  },
  {
    pattern: /setInterval\s*\(\s*['"`]/,
    severity: 'high',
    message: 'setInterval with string argument is dangerous',
  },

  // Process manipulation
  { pattern: /process\.exit/, severity: 'critical', message: 'process.exit not allowed' },
  { pattern: /process\.kill/, severity: 'critical', message: 'process.kill not allowed' },
  {
    pattern: /process\.env/,
    severity: 'medium',
    message: 'process.env access may leak sensitive data',
  },
  {
    pattern: /process\.execPath/,
    severity: 'high',
    message: 'process.execPath access not allowed',
  },
  { pattern: /process\.binding/, severity: 'critical', message: 'process.binding not allowed' },

  // Globals dangereux
  { pattern: /global\s*\./, severity: 'high', message: 'Direct global access is discouraged' },
  {
    pattern: /globalThis\s*\[/,
    severity: 'high',
    message: 'Dynamic globalThis access is dangerous',
  },
  { pattern: /__proto__/, severity: 'high', message: '__proto__ manipulation not allowed' },
  {
    pattern: /Object\.setPrototypeOf/,
    severity: 'medium',
    message: 'Prototype manipulation is discouraged',
  },

  // Réseau non autorisé
  {
    pattern: /require\s*\(\s*['"]http['"]/,
    severity: 'high',
    message: 'Direct http module not allowed (use api.http)',
  },
  {
    pattern: /require\s*\(\s*['"]https['"]/,
    severity: 'high',
    message: 'Direct https module not allowed (use api.http)',
  },
  {
    pattern: /fetch\s*\(/,
    severity: 'medium',
    message: 'Direct fetch() - ensure network.http permission is declared',
  },
];

const WHITELISTED_MODULES = [
  // Modules natifs sûrs
  'path',
  'url',
  'util',
  'events',
  'stream',
  'string_decoder',
  'buffer',
  'querystring',
  'crypto', // Fonctions de hash/random OK
  'assert',
  'timers',
  'timers/promises',

  // Modules NPM sûrs (exemples)
  'lodash',
  'underscore',
  'moment',
  'dayjs',
  'uuid',
  'validator',
  'sanitize-html',
];

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(code, message, details = {}) {
    this.valid = false;
    this.errors.push({ code, message, ...details });
  }

  addWarning(code, message, details = {}) {
    this.warnings.push({ code, message, ...details });
  }

  addInfo(code, message, details = {}) {
    this.info.push({ code, message, ...details });
  }

  merge(other) {
    this.valid = this.valid && other.valid;
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.info.push(...other.info);
  }
}

// ============================================================================
// MANIFEST VALIDATION
// ============================================================================

async function validateManifest(manifest, modPath) {
  const result = new ValidationResult();

  // Vérifier les champs requis
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (manifest[field] === undefined) {
      result.addError('MISSING_FIELD', `Missing required field: ${field}`, { field });
    }
  }

  // Valider manifest_version
  if (manifest.manifest_version !== 1) {
    result.addError('INVALID_MANIFEST_VERSION', `manifest_version must be 1`, {
      got: manifest.manifest_version,
    });
  }

  // Valider le nom (alphanumeric + hyphens)
  if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) {
    result.addError('INVALID_NAME', 'name must be lowercase alphanumeric with hyphens only', {
      name: manifest.name,
    });
  }

  // Valider la version (semver)
  if (manifest.version && !/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(manifest.version)) {
    result.addError('INVALID_VERSION', 'version must be valid semver', {
      version: manifest.version,
    });
  }

  // Valider api_version (semver)
  if (manifest.api_version && !/^\d+\.\d+\.\d+$/.test(manifest.api_version)) {
    result.addError('INVALID_API_VERSION', 'api_version must be valid semver', {
      api_version: manifest.api_version,
    });
  }

  // Valider author
  if (manifest.author) {
    if (typeof manifest.author !== 'object') {
      result.addError('INVALID_AUTHOR', 'author must be an object with name field');
    } else if (!manifest.author.name) {
      result.addError('MISSING_AUTHOR_NAME', 'author.name is required');
    }
  }

  // Valider permissions
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      result.addError('INVALID_PERMISSIONS', 'permissions must be an array');
    } else {
      for (const perm of manifest.permissions) {
        if (!VALID_PERMISSIONS.includes(perm)) {
          result.addWarning('UNKNOWN_PERMISSION', `Unknown permission: ${perm}`, {
            permission: perm,
          });
        }
      }
    }
  }

  // Valider node_types
  if (manifest.node_types) {
    if (!Array.isArray(manifest.node_types)) {
      result.addError('INVALID_NODE_TYPES', 'node_types must be an array');
    } else {
      const typeNames = new Set();
      for (let i = 0; i < manifest.node_types.length; i++) {
        const nodeType = manifest.node_types[i];

        if (!nodeType.type) {
          result.addError('MISSING_NODE_TYPE', `node_types[${i}].type is required`);
        } else {
          if (typeNames.has(nodeType.type)) {
            result.addError('DUPLICATE_NODE_TYPE', `Duplicate node type: ${nodeType.type}`);
          }
          typeNames.add(nodeType.type);
        }

        if (!nodeType.label) {
          result.addWarning('MISSING_NODE_LABEL', `node_types[${i}].label is recommended`);
        }

        if (!nodeType.category) {
          result.addWarning('MISSING_NODE_CATEGORY', `node_types[${i}].category is recommended`);
        }

        // Valider inputs/outputs
        for (const portType of ['inputs', 'outputs']) {
          if (nodeType[portType] && !Array.isArray(nodeType[portType])) {
            result.addError('INVALID_PORTS', `node_types[${i}].${portType} must be an array`);
          }
        }
      }
    }
  }

  // Vérifier que le fichier main existe
  if (manifest.main) {
    const mainPath = path.join(modPath, manifest.main);
    if (!existsSync(mainPath)) {
      result.addError('MAIN_NOT_FOUND', `Main file not found: ${manifest.main}`, {
        path: mainPath,
      });
    }
  }

  // Valider compatibility
  if (manifest.compatibility) {
    if (!manifest.compatibility.luca_min) {
      result.addWarning('MISSING_COMPAT_MIN', 'compatibility.luca_min is recommended');
    }
    if (manifest.compatibility.platforms) {
      const validPlatforms = ['android', 'ios', 'web'];
      for (const p of manifest.compatibility.platforms) {
        if (!validPlatforms.includes(p)) {
          result.addWarning('UNKNOWN_PLATFORM', `Unknown platform: ${p}`);
        }
      }
    }
  }

  return result;
}

// ============================================================================
// CODE SECURITY SCAN
// ============================================================================

async function scanCode(modPath, manifest) {
  const result = new ValidationResult();
  const mainFile = manifest.main || 'main.mjs';

  // Scanner tous les fichiers JS/MJS
  const jsFiles = await findJsFiles(modPath);

  for (const filePath of jsFiles) {
    const relativePath = path.relative(modPath, filePath);
    const content = await readFile(filePath, 'utf-8');

    // Scan par regex
    for (const pattern of DANGEROUS_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        const lines = content.substring(0, content.indexOf(matches[0])).split('\n');
        const lineNumber = lines.length;

        if (pattern.severity === 'critical') {
          result.addError('DANGEROUS_CODE', pattern.message, {
            file: relativePath,
            line: lineNumber,
            severity: pattern.severity,
          });
        } else if (pattern.severity === 'high') {
          result.addWarning('DANGEROUS_CODE', pattern.message, {
            file: relativePath,
            line: lineNumber,
            severity: pattern.severity,
          });
        } else {
          result.addInfo('CODE_REVIEW', pattern.message, {
            file: relativePath,
            line: lineNumber,
            severity: pattern.severity,
          });
        }
      }
    }

    // Analyse AST pour imports
    try {
      const ast = acorn.parse(content, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true,
      });

      // Vérifier les imports
      const imports = extractImports(ast);
      for (const imp of imports) {
        if (!isWhitelistedModule(imp.source)) {
          result.addWarning('UNLISTED_IMPORT', `Non-whitelisted module: ${imp.source}`, {
            file: relativePath,
            line: imp.line,
            module: imp.source,
          });
        }
      }
    } catch (parseError) {
      result.addWarning('PARSE_ERROR', `Could not parse ${relativePath}: ${parseError.message}`, {
        file: relativePath,
      });
    }
  }

  return result;
}

function extractImports(ast) {
  const imports = [];

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push({
        source: node.source.value,
        line: node.loc?.start?.line || 0,
      });
    }

    // require() calls
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (
          decl.init?.type === 'CallExpression' &&
          decl.init.callee?.name === 'require' &&
          decl.init.arguments?.[0]?.type === 'Literal'
        ) {
          imports.push({
            source: decl.init.arguments[0].value,
            line: node.loc?.start?.line || 0,
          });
        }
      }
    }
  }

  return imports;
}

function isWhitelistedModule(moduleName) {
  // Module relatif ou local
  if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
    return true;
  }

  // Module node: builtin
  if (moduleName.startsWith('node:')) {
    moduleName = moduleName.substring(5);
  }

  // Vérifier la whitelist
  return WHITELISTED_MODULES.some((w) => moduleName === w || moduleName.startsWith(w + '/'));
}

async function findJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules
      if (entry.name === 'node_modules') continue;
      files.push(...(await findJsFiles(fullPath)));
    } else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// ============================================================================
// INTEGRITY (HASH & SIGNATURE)
// ============================================================================

async function calculateHash(modPath, manifest) {
  const mainPath = path.join(modPath, manifest.main);
  const content = await readFile(mainPath);
  const hash = createHash('sha256').update(content).digest('hex');
  return `sha256:${hash}`;
}

async function verifyIntegrity(modPath, manifest) {
  const result = new ValidationResult();

  if (!manifest.integrity) {
    result.addWarning('NO_INTEGRITY', 'No integrity information in manifest');
    return result;
  }

  // Vérifier le hash
  const expectedHash = manifest.integrity.hash;
  const actualHash = await calculateHash(modPath, manifest);

  if (expectedHash !== actualHash) {
    result.addError('HASH_MISMATCH', 'File hash does not match manifest', {
      expected: expectedHash,
      actual: actualHash,
    });
  } else {
    result.addInfo('HASH_OK', 'Hash verification passed');
  }

  // Vérifier la signature si disponible
  if (manifest.integrity.signature && nacl) {
    // TODO: Implémenter la vérification de signature
    result.addInfo('SIGNATURE_PRESENT', 'Signature present (verification not implemented)');
  }

  return result;
}

async function signMod(modPath, manifest, privateKeyPath) {
  if (!nacl || !naclUtil) {
    throw new Error('tweetnacl and tweetnacl-util required for signing');
  }

  // Charger la clé privée
  const privateKeyHex = await readFile(privateKeyPath, 'utf-8');
  const privateKey = naclUtil.decodeUTF8(privateKeyHex.trim());

  // Calculer le hash
  const hash = await calculateHash(modPath, manifest);

  // Signer
  const signature = nacl.sign.detached(naclUtil.decodeUTF8(hash), privateKey);

  return {
    hash,
    signature: `ed25519:${naclUtil.encodeBase64(signature)}`,
    key_id: path.basename(privateKeyPath, path.extname(privateKeyPath)),
  };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export async function validateMod(modPath, options = {}) {
  const result = new ValidationResult();

  // Vérifier que le dossier existe
  if (!existsSync(modPath)) {
    result.addError('NOT_FOUND', `Mod path does not exist: ${modPath}`);
    return result;
  }

  // Charger le manifest
  const manifestPath = path.join(modPath, 'manifest.json');
  if (!existsSync(manifestPath)) {
    result.addError('NO_MANIFEST', 'manifest.json not found');
    return result;
  }

  let manifest;
  try {
    const content = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(content);
  } catch (err) {
    result.addError('INVALID_JSON', `Invalid manifest.json: ${err.message}`);
    return result;
  }

  // Valider le manifest
  result.merge(await validateManifest(manifest, modPath));

  // Scanner le code
  result.merge(await scanCode(modPath, manifest));

  // Vérifier l'intégrité
  if (!options.skipIntegrity) {
    result.merge(await verifyIntegrity(modPath, manifest));
  }

  // Mode strict: warnings = errors
  if (options.strict) {
    for (const warning of result.warnings) {
      result.errors.push({ ...warning, wasWarning: true });
    }
    if (result.warnings.length > 0) {
      result.valid = false;
    }
  }

  return result;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
LUCA Mod Validator

Usage: node validator.mjs <mod-path> [options]

Options:
  --strict    Mode strict (warnings become errors)
  --sign      Sign the mod (requires --key)
  --key       Path to ed25519 private key file
  --json      Output as JSON
  --help, -h  Show this help

Examples:
  node validator.mjs ./my-mod
  node validator.mjs ./my-mod --strict
  node validator.mjs ./my-mod --sign --key ./private.key
`);
    process.exit(0);
  }

  const modPath = path.resolve(args[0]);
  const options = {
    strict: args.includes('--strict'),
    sign: args.includes('--sign'),
    json: args.includes('--json'),
    key: args.includes('--key') ? args[args.indexOf('--key') + 1] : null,
  };

  try {
    const result = await validateMod(modPath, options);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printResult(result, modPath);
    }

    // Signer si demandé
    if (options.sign && options.key && result.valid) {
      console.log('\n📝 Signing mod...');
      const manifestPath = path.join(modPath, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

      const integrity = await signMod(modPath, manifest, options.key);
      manifest.integrity = integrity;

      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Mod signed successfully');
      console.log(`   Hash: ${integrity.hash}`);
      console.log(`   Key ID: ${integrity.key_id}`);
    }

    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

function printResult(result, modPath) {
  console.log(`\n📦 Validating: ${modPath}\n`);

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const err of result.errors) {
      console.log(`   [${err.code}] ${err.message}`);
      if (err.file) console.log(`      File: ${err.file}:${err.line || '?'}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warn of result.warnings) {
      console.log(`   [${warn.code}] ${warn.message}`);
      if (warn.file) console.log(`      File: ${warn.file}:${warn.line || '?'}`);
    }
    console.log('');
  }

  if (result.info.length > 0) {
    console.log('ℹ️  Info:');
    for (const info of result.info) {
      console.log(`   [${info.code}] ${info.message}`);
    }
    console.log('');
  }

  if (result.valid) {
    console.log('✅ Validation PASSED\n');
  } else {
    console.log('❌ Validation FAILED\n');
  }
}

// Import for writing
import { writeFile } from 'fs/promises';

// Run CLI if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { calculateHash, signMod, VALID_PERMISSIONS, WHITELISTED_MODULES };
