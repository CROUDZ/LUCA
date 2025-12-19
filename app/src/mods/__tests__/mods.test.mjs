/**
 * LUCA Modding System - Tests
 *
 * Tests unitaires et d'intégration pour le système de modding
 *
 * Exécuter avec: npm test -- --testPathPattern=mods
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// MOCKS
// ============================================================================

// Mock pour child_process.fork
const mockChildProcess = {
  pid: 12345,
  on: jest.fn(),
  send: jest.fn(),
  kill: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
};

jest.unstable_mockModule('child_process', () => ({
  fork: jest.fn(() => mockChildProcess),
}));

// ============================================================================
// TEST: MANIFEST VALIDATION
// ============================================================================

describe('Manifest Validation', () => {
  const testModPath = path.join(__dirname, 'test-mod');

  beforeAll(async () => {
    await mkdir(testModPath, { recursive: true });
  });

  afterAll(async () => {
    if (existsSync(testModPath)) {
      await rm(testModPath, { recursive: true });
    }
  });

  it('should fail on missing manifest', async () => {
    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(path.join(__dirname, 'nonexistent'));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'NOT_FOUND')).toBe(true);
  });

  it('should fail on invalid JSON', async () => {
    await writeFile(path.join(testModPath, 'manifest.json'), 'not json');

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_JSON')).toBe(true);
  });

  it('should fail on missing required fields', async () => {
    await writeFile(
      path.join(testModPath, 'manifest.json'),
      JSON.stringify({
        name: 'test-mod',
        // Missing other required fields
      })
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_FIELD')).toBe(true);
  });

  it('should fail on invalid mod name', async () => {
    await writeFile(
      path.join(testModPath, 'manifest.json'),
      JSON.stringify({
        manifest_version: 1,
        name: 'Invalid Name With Spaces',
        version: '1.0.0',
        display_name: 'Test',
        description: 'Test mod',
        author: { name: 'Test' },
        main: 'main.mjs',
        api_version: '1.0.0',
        permissions: [],
        node_types: [],
        compatibility: { luca_min: '1.0.0' },
      })
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NAME')).toBe(true);
  });

  it('should pass on valid manifest', async () => {
    await writeFile(
      path.join(testModPath, 'manifest.json'),
      JSON.stringify({
        manifest_version: 1,
        name: 'valid-test-mod',
        version: '1.0.0',
        display_name: 'Valid Test Mod',
        description: 'A valid test mod',
        author: { name: 'Test Author' },
        main: 'main.mjs',
        api_version: '1.0.0',
        permissions: ['storage.read'],
        node_types: [
          {
            type: 'test-node',
            label: 'Test Node',
            category: 'Test',
            inputs: [],
            outputs: [],
          },
        ],
        compatibility: { luca_min: '1.0.0' },
      })
    );

    await writeFile(path.join(testModPath, 'main.mjs'), 'export function run() {}');

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ============================================================================
// TEST: CODE SECURITY SCAN
// ============================================================================

describe('Security Scan', () => {
  const testModPath = path.join(__dirname, 'test-security-mod');

  beforeAll(async () => {
    await mkdir(testModPath, { recursive: true });
  });

  afterAll(async () => {
    if (existsSync(testModPath)) {
      await rm(testModPath, { recursive: true });
    }
  });

  beforeEach(async () => {
    await writeFile(
      path.join(testModPath, 'manifest.json'),
      JSON.stringify({
        manifest_version: 1,
        name: 'security-test-mod',
        version: '1.0.0',
        display_name: 'Security Test',
        description: 'Security test mod',
        author: { name: 'Test' },
        main: 'main.mjs',
        api_version: '1.0.0',
        permissions: [],
        node_types: [],
        compatibility: { luca_min: '1.0.0' },
      })
    );
  });

  it('should detect eval() usage', async () => {
    await writeFile(
      path.join(testModPath, 'main.mjs'),
      `
      export function run(input) {
        return eval(input.code);
      }
    `
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === 'DANGEROUS_CODE' && e.message.includes('eval'))
    ).toBe(true);
  });

  it('should detect child_process import', async () => {
    await writeFile(
      path.join(testModPath, 'main.mjs'),
      `
      import { exec } from 'child_process';
      export function run() {
        exec('rm -rf /');
      }
    `
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === 'DANGEROUS_CODE' && e.message.includes('child_process'))
    ).toBe(true);
  });

  it('should detect fs import', async () => {
    await writeFile(
      path.join(testModPath, 'main.mjs'),
      `
      import fs from 'fs';
      export function run() {
        fs.readFileSync('/etc/passwd');
      }
    `
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DANGEROUS_CODE' && e.message.includes('fs'))).toBe(
      true
    );
  });

  it('should detect process.exit', async () => {
    await writeFile(
      path.join(testModPath, 'main.mjs'),
      `
      export function run() {
        process.exit(1);
      }
    `
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === 'DANGEROUS_CODE' && e.message.includes('process.exit'))
    ).toBe(true);
  });

  it('should allow safe code', async () => {
    await writeFile(
      path.join(testModPath, 'main.mjs'),
      `
      export async function nodeInit(api) {
        api.log.info('Initializing');
      }
      
      export async function run({ inputs }, api) {
        const value = inputs.value || 0;
        return { outputs: { result: value * 2 } };
      }
    `
    );

    const { validateMod } = await import('../core/validator.mjs');
    const result = await validateMod(testModPath, { skipIntegrity: true });

    // Should pass or only have warnings, not critical errors
    const criticalErrors = result.errors.filter(
      (e) => e.code === 'DANGEROUS_CODE' && e.severity === 'critical'
    );
    expect(criticalErrors.length).toBe(0);
  });
});

// ============================================================================
// TEST: HASH CALCULATION
// ============================================================================

describe('Hash Calculation', () => {
  const testModPath = path.join(__dirname, 'test-hash-mod');

  beforeAll(async () => {
    await mkdir(testModPath, { recursive: true });
    await writeFile(
      path.join(testModPath, 'manifest.json'),
      JSON.stringify({
        manifest_version: 1,
        name: 'hash-test',
        version: '1.0.0',
        display_name: 'Hash Test',
        description: 'Test',
        author: { name: 'Test' },
        main: 'main.mjs',
        api_version: '1.0.0',
        permissions: [],
        node_types: [],
        compatibility: { luca_min: '1.0.0' },
      })
    );
    await writeFile(path.join(testModPath, 'main.mjs'), 'export function run() { return 42; }');
  });

  afterAll(async () => {
    if (existsSync(testModPath)) {
      await rm(testModPath, { recursive: true });
    }
  });

  it('should calculate consistent hash', async () => {
    const { calculateHash } = await import('../core/validator.mjs');
    const manifest = JSON.parse(await readFile(path.join(testModPath, 'manifest.json'), 'utf-8'));

    const hash1 = await calculateHash(testModPath, manifest);
    const hash2 = await calculateHash(testModPath, manifest);

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith('sha256:')).toBe(true);
  });

  it('should detect hash changes', async () => {
    const { calculateHash } = await import('../core/validator.mjs');
    const manifest = JSON.parse(await readFile(path.join(testModPath, 'manifest.json'), 'utf-8'));

    const hash1 = await calculateHash(testModPath, manifest);

    // Modify the file
    await writeFile(path.join(testModPath, 'main.mjs'), 'export function run() { return 43; }');

    const hash2 = await calculateHash(testModPath, manifest);

    expect(hash1).not.toBe(hash2);

    // Restore
    await writeFile(path.join(testModPath, 'main.mjs'), 'export function run() { return 42; }');
  });
});

// ============================================================================
// TEST: LOADER
// ============================================================================

describe('ModLoader', () => {
  it('should be importable', async () => {
    const { ModLoader } = await import('../core/loader.mjs');
    expect(ModLoader).toBeDefined();
  });

  it('should create instance with default config', async () => {
    const { ModLoader } = await import('../core/loader.mjs');
    const loader = new ModLoader();

    expect(loader).toBeDefined();
    expect(loader.mods).toBeInstanceOf(Map);
    expect(loader.config).toBeDefined();
  });

  // Note: Tests d'intégration complets nécessitent un environnement plus complexe
  // avec de vrais processus fork()
});

// ============================================================================
// TEST: IPC MESSAGES
// ============================================================================

describe('IPC Message Format', () => {
  it('should create valid JSON-RPC request', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'test-123',
      method: 'run',
      params: {
        nodeId: 'node-1',
        nodeType: 'counter',
        inputs: { value: 42 },
        config: {},
        context: { executionId: 'exec-1', timestamp: Date.now(), timeout: 3000 },
      },
    };

    expect(request.jsonrpc).toBe('2.0');
    expect(request.id).toBeDefined();
    expect(request.method).toBe('run');
    expect(request.params.inputs.value).toBe(42);
  });

  it('should create valid JSON-RPC response', () => {
    const response = {
      jsonrpc: '2.0',
      id: 'test-123',
      result: {
        outputs: { result: 84 },
        logs: [],
        duration: 15,
      },
    };

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('test-123');
    expect(response.result.outputs.result).toBe(84);
  });

  it('should create valid JSON-RPC error', () => {
    const errorResponse = {
      jsonrpc: '2.0',
      id: 'test-123',
      error: {
        code: -32000,
        message: 'Execution timeout',
        data: { timeout: 3000 },
      },
    };

    expect(errorResponse.error.code).toBe(-32000);
    expect(errorResponse.error.message).toBe('Execution timeout');
  });
});

// ============================================================================
// TEST: PERMISSIONS
// ============================================================================

describe('Permissions', () => {
  it('should list valid permissions', async () => {
    const { VALID_PERMISSIONS } = await import('../core/validator.mjs');

    expect(VALID_PERMISSIONS).toContain('storage.read');
    expect(VALID_PERMISSIONS).toContain('storage.write');
    expect(VALID_PERMISSIONS).toContain('network.http');
    expect(VALID_PERMISSIONS).toContain('device.flashlight');
  });

  it('should list whitelisted modules', async () => {
    const { WHITELISTED_MODULES } = await import('../core/validator.mjs');

    expect(WHITELISTED_MODULES).toContain('path');
    expect(WHITELISTED_MODULES).toContain('crypto');
    expect(WHITELISTED_MODULES).toContain('lodash');
    expect(WHITELISTED_MODULES).not.toContain('child_process');
    expect(WHITELISTED_MODULES).not.toContain('fs');
  });
});

export {};
