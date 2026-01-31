import type {
  PackageManagerType,
  PackageManagerInfo,
  InstalledPackage,
  DependencyNode,
  AuditResult,
  OperationProgress,
} from '@npvm/shared';

export interface InstallOptions {
  dev?: boolean;
  global?: boolean;
  registry?: string;
}

export interface UninstallOptions {
  global?: boolean;
}

export interface PackageManagerAdapter {
  readonly type: PackageManagerType;

  detect(): Promise<PackageManagerInfo>;

  getInstalledPackages(cwd: string): Promise<InstalledPackage[]>;

  getGlobalPackages(): Promise<InstalledPackage[]>;

  install(
    packages: string[],
    cwd: string,
    options?: InstallOptions,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void>;

  uninstall(
    packages: string[],
    cwd: string,
    options?: UninstallOptions,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void>;

  update(
    packages: string[],
    cwd: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void>;

  getDependencyTree(cwd: string): Promise<DependencyNode>;

  audit(cwd: string): Promise<AuditResult>;

  setRegistry(url: string): Promise<void>;

  getRegistry(): Promise<string>;
}
