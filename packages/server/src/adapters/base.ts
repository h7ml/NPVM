import type {
  PackageManagerType,
  PackageManagerInfo,
  InstalledPackage,
  DependencyNode,
  AuditResult,
  AuditFixResult,
  OperationProgress,
} from '@dext7r/npvm-shared';

export interface InstallOptions {
  dev?: boolean;
  global?: boolean;
  registry?: string;
  workspace?: boolean;  // 安装到 workspace 根目录
  filter?: string;      // 安装到指定 workspace 包
}

export interface UninstallOptions {
  global?: boolean;
  workspace?: boolean;
  filter?: string;
}

export interface WorkspaceInfo {
  isWorkspace: boolean;
  packages?: string[];  // workspace 包列表
}

export interface PackageManagerAdapter {
  readonly type: PackageManagerType;

  detect(): Promise<PackageManagerInfo>;

  getInstalledPackages(cwd: string): Promise<InstalledPackage[]>;

  getGlobalPackages(): Promise<InstalledPackage[]>;

  // 检测是否为 workspace 项目
  detectWorkspace(cwd: string): Promise<WorkspaceInfo>;

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

  auditFix(cwd: string, onProgress?: (progress: OperationProgress) => void): Promise<AuditFixResult>;

  setRegistry(url: string, cwd?: string): Promise<void>;

  getRegistry(cwd?: string): Promise<string>;
}
