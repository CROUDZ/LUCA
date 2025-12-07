/**
 * LUCA Modding System - Type Definitions
 * Node.js 18+ ESM
 */

// ============================================================================
// MANIFEST TYPES
// ============================================================================

export interface ModManifest {
  /** Manifest schema version */
  manifest_version: 1;
  
  /** Unique mod identifier (lowercase, alphanumeric, hyphens) */
  name: string;
  
  /** Semver version */
  version: string;
  
  /** Display name for UI */
  display_name: string;
  
  /** Short description */
  description: string;
  
  /** Author information */
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  
  /** Main entry point (relative path) */
  main: string;
  
  /** LUCA API version compatibility */
  api_version: string;
  
  /** Required permissions */
  permissions: ModPermission[];
  
  /** Node types exposed by this mod */
  node_types: ModNodeType[];
  
  /** Dependencies (must be bundled or whitelisted) */
  dependencies?: Record<string, string>;
  
  /** Minimum LUCA version */
  compatibility: {
    luca_min: string;
    luca_max?: string;
    platforms?: ('android' | 'ios' | 'web')[];
  };
  
  /** Package integrity */
  integrity: {
    /** SHA-256 hash of main file */
    hash: string;
    /** Ed25519 signature */
    signature: string;
    /** Public key ID for verification */
    key_id: string;
  };
  
  /** Optional metadata */
  metadata?: {
    repository?: string;
    license?: string;
    keywords?: string[];
    icon?: string;
    screenshots?: string[];
  };
}

export type ModPermission =
  | 'storage.read'
  | 'storage.write'
  | 'network.http'
  | 'network.ws'
  | 'device.flashlight'
  | 'device.vibration'
  | 'device.sensors'
  | 'system.notifications'
  | 'system.clipboard';

export interface ModNodeType {
  /** Unique type identifier within the mod */
  type: string;
  
  /** Display name */
  label: string;
  
  /** Category for UI grouping */
  category: string;
  
  /** Description */
  description?: string;
  
  /** Input port definitions */
  inputs: ModNodePort[];
  
  /** Output port definitions */
  outputs: ModNodePort[];
  
  /** Default configuration */
  config?: Record<string, unknown>;
  
  /** UI color hint */
  color?: string;
  
  /** Icon name or path */
  icon?: string;
}

export interface ModNodePort {
  /** Port identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Data type hint */
  type: 'any' | 'number' | 'string' | 'boolean' | 'object' | 'array' | 'signal';
  
  /** Is this port required? */
  required?: boolean;
  
  /** Default value */
  default?: unknown;
}

// ============================================================================
// RUNTIME API TYPES
// ============================================================================

export interface ModRuntimeAPI {
  /** Mod metadata */
  mod: {
    name: string;
    version: string;
  };
  
  /** Storage API (if permission granted) */
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
    list: () => Promise<string[]>;
  };
  
  /** Logging API */
  log: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  
  /** HTTP API (if permission granted) */
  http?: {
    request: (url: string, options?: HttpRequestOptions) => Promise<HttpResponse>;
  };
  
  /** Event emitter for signals */
  emit: (output: string, value: unknown) => void;
  
  /** Configuration access */
  config: Record<string, unknown>;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  json: () => unknown;
}

// ============================================================================
// IPC MESSAGE TYPES (JSON-RPC 2.0)
// ============================================================================

export interface IPCRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: unknown;
}

export interface IPCResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: IPCError;
}

export interface IPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface IPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// IPC Methods
export type IPCMethod =
  | 'init'           // Initialize mod
  | 'run'            // Execute node
  | 'unload'         // Cleanup before shutdown
  | 'ping'           // Health check
  | 'getNodeTypes'   // Get registered node types
  | 'storage.get'    // Storage operations (from runner to core)
  | 'storage.set'
  | 'storage.delete'
  | 'log'            // Log message
  | 'emit';          // Emit signal

export interface RunParams {
  nodeId: string;
  nodeType: string;
  inputs: Record<string, unknown>;
  config: Record<string, unknown>;
  context: ExecutionContext;
}

export interface ExecutionContext {
  executionId: string;
  timestamp: number;
  timeout: number;
}

export interface RunResult {
  outputs: Record<string, unknown>;
  logs: LogEntry[];
  duration: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// LOADER TYPES
// ============================================================================

export interface LoadedMod {
  manifest: ModManifest;
  path: string;
  status: ModStatus;
  runner?: RunnerHandle;
  loadedAt: number;
  lastError?: string;
}

export type ModStatus = 
  | 'installed'      // Installed but not loaded
  | 'loading'        // Currently loading
  | 'active'         // Running normally
  | 'error'          // Failed to load/run
  | 'disabled'       // Manually disabled
  | 'updating';      // Being updated

export interface RunnerHandle {
  pid: number;
  ipc: NodeJS.Process;
  startedAt: number;
  requestCount: number;
  lastRequest?: number;
  pendingRequests: Map<string, PendingRequest>;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startedAt: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ScanResult {
  dangerous: boolean;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

// ============================================================================
// REGISTRY TYPES
// ============================================================================

export interface RegistryMod {
  id: string;
  name: string;
  version: string;
  display_name: string;
  description: string;
  author: ModManifest['author'];
  downloads: number;
  rating: number;
  published_at: string;
  updated_at: string;
  verified: boolean;
  tags: string[];
  size: number;
  checksum: string;
}

export interface RegistrySearchParams {
  query?: string;
  category?: string;
  sort?: 'downloads' | 'rating' | 'updated' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  verified_only?: boolean;
}

export interface RegistryUploadResult {
  success: boolean;
  mod_id?: string;
  version?: string;
  errors?: string[];
  warnings?: string[];
}
