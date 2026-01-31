export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManagerInfo {
  type: PackageManagerType;
  version: string;
  path: string;
  available: boolean;
}

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  author?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface InstalledPackage {
  name: string;
  version: string;
  isDev: boolean;
  isPeer: boolean;
  latestVersion?: string;
  hasUpdate: boolean;
}

export interface DependencyNode {
  name: string;
  version: string;
  children: DependencyNode[];
  isCircular?: boolean;
}

export interface VulnerabilityInfo {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  package: string;
  version: string;
  recommendation: string;
  url?: string;
}

export interface AuditResult {
  vulnerabilities: VulnerabilityInfo[];
  summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
}

export interface RegistryConfig {
  name: string;
  url: string;
  description?: string;
}

export interface OperationProgress {
  id: string;
  type: 'install' | 'uninstall' | 'update' | 'audit';
  status: 'pending' | 'running' | 'completed' | 'failed';
  package?: string;
  progress: number;
  message: string;
  logs: string[];
  startedAt: number;
  completedAt?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
