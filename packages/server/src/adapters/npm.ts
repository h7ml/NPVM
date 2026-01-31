import { randomUUID } from 'node:crypto';
import { execa } from 'execa';
import which from 'which';
import type {
  PackageManagerInfo,
  InstalledPackage,
  DependencyNode,
  AuditResult,
  OperationProgress,
  VulnerabilityInfo,
} from '@npvm/shared';
import type { PackageManagerAdapter, InstallOptions, UninstallOptions } from './base.js';

export class NpmAdapter implements PackageManagerAdapter {
  readonly type = 'npm' as const;

  async detect(): Promise<PackageManagerInfo> {
    try {
      const path = await which('npm');
      const { stdout } = await execa('npm', ['--version']);
      return {
        type: 'npm',
        version: stdout.trim(),
        path,
        available: true,
      };
    } catch {
      return { type: 'npm', version: '', path: '', available: false };
    }
  }

  async getInstalledPackages(cwd: string): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('npm', ['ls', '--json', '--depth=0'], { cwd });
      const data = JSON.parse(stdout);
      const packages: InstalledPackage[] = [];

      const deps = data.dependencies || {};
      for (const [name, info] of Object.entries(deps) as [string, any][]) {
        packages.push({
          name,
          version: info.version || 'unknown',
          isDev: false,
          isPeer: false,
          hasUpdate: false,
        });
      }

      return packages;
    } catch {
      return [];
    }
  }

  async getGlobalPackages(): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('npm', ['ls', '-g', '--json', '--depth=0']);
      const data = JSON.parse(stdout);
      const packages: InstalledPackage[] = [];

      const deps = data.dependencies || {};
      for (const [name, info] of Object.entries(deps) as [string, any][]) {
        packages.push({
          name,
          version: info.version || 'unknown',
          isDev: false,
          isPeer: false,
          hasUpdate: false,
        });
      }

      return packages;
    } catch {
      return [];
    }
  }

  async install(
    packages: string[],
    cwd: string,
    options?: InstallOptions,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void> {
    const args = ['install', ...packages];
    if (options?.dev) args.push('--save-dev');
    if (options?.global) args.push('-g');
    if (options?.registry) args.push('--registry', options.registry);

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'install',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Installing...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    const subprocess = execa('npm', args, { cwd });

    subprocess.stdout?.on('data', (data: Buffer) => {
      progress.logs.push(data.toString());
      progress.progress = Math.min(progress.progress + 10, 90);
      onProgress?.(progress);
    });

    subprocess.stderr?.on('data', (data: Buffer) => {
      progress.logs.push(data.toString());
      onProgress?.(progress);
    });

    await subprocess;

    progress.status = 'completed';
    progress.progress = 100;
    progress.message = 'Installation complete';
    progress.completedAt = Date.now();
    onProgress?.(progress);
  }

  async uninstall(
    packages: string[],
    cwd: string,
    options?: UninstallOptions,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void> {
    const args = ['uninstall', ...packages];
    if (options?.global) args.push('-g');

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'uninstall',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Uninstalling...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('npm', args, { cwd });

    progress.status = 'completed';
    progress.progress = 100;
    progress.message = 'Uninstallation complete';
    progress.completedAt = Date.now();
    onProgress?.(progress);
  }

  async update(
    packages: string[],
    cwd: string,
    onProgress?: (progress: OperationProgress) => void
  ): Promise<void> {
    const args = packages.length ? ['update', ...packages] : ['update'];

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'update',
      status: 'running',
      package: packages.join(', ') || 'all',
      progress: 0,
      message: 'Updating...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('npm', args, { cwd });

    progress.status = 'completed';
    progress.progress = 100;
    progress.message = 'Update complete';
    progress.completedAt = Date.now();
    onProgress?.(progress);
  }

  async getDependencyTree(cwd: string): Promise<DependencyNode> {
    try {
      const { stdout } = await execa('npm', ['ls', '--json', '--all'], { cwd });
      const data = JSON.parse(stdout);
      return this.parseDepTree(data.name || 'root', data.version || '0.0.0', data.dependencies);
    } catch {
      return { name: 'root', version: '0.0.0', children: [] };
    }
  }

  private parseDepTree(
    name: string,
    version: string,
    deps?: Record<string, any>
  ): DependencyNode {
    const node: DependencyNode = { name, version, children: [] };
    if (deps) {
      for (const [depName, depInfo] of Object.entries(deps)) {
        node.children.push(
          this.parseDepTree(depName, depInfo.version || 'unknown', depInfo.dependencies)
        );
      }
    }
    return node;
  }

  async audit(cwd: string): Promise<AuditResult> {
    try {
      const { stdout } = await execa('npm', ['audit', '--json'], { cwd, reject: false });
      const data = JSON.parse(stdout);

      const vulnerabilities: VulnerabilityInfo[] = [];
      const advisories = data.advisories || data.vulnerabilities || {};

      for (const [, advisory] of Object.entries(advisories) as [string, any][]) {
        vulnerabilities.push({
          id: String(advisory.id || advisory.via?.[0]?.source || 'unknown'),
          title: advisory.title || advisory.via?.[0]?.title || 'Unknown vulnerability',
          severity: advisory.severity || 'moderate',
          package: advisory.module_name || advisory.name || 'unknown',
          version: advisory.vulnerable_versions || advisory.range || '*',
          recommendation: advisory.recommendation || advisory.fixAvailable?.name || 'Update to latest version',
          url: advisory.url || advisory.via?.[0]?.url,
        });
      }

      const summary = {
        critical: data.metadata?.vulnerabilities?.critical || 0,
        high: data.metadata?.vulnerabilities?.high || 0,
        moderate: data.metadata?.vulnerabilities?.moderate || 0,
        low: data.metadata?.vulnerabilities?.low || 0,
        total: data.metadata?.vulnerabilities?.total || vulnerabilities.length,
      };

      return { vulnerabilities, summary };
    } catch {
      return {
        vulnerabilities: [],
        summary: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
      };
    }
  }

  async setRegistry(url: string): Promise<void> {
    await execa('npm', ['config', 'set', 'registry', url]);
  }

  async getRegistry(): Promise<string> {
    const { stdout } = await execa('npm', ['config', 'get', 'registry']);
    return stdout.trim();
  }
}
