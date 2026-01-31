import { randomUUID } from 'node:crypto';
import { execa } from 'execa';
import which from 'which';
import type {
  PackageManagerInfo,
  InstalledPackage,
  DependencyNode,
  AuditResult,
  OperationProgress,
} from '@npvm/shared';
import type { PackageManagerAdapter, InstallOptions, UninstallOptions } from './base.js';

export class BunAdapter implements PackageManagerAdapter {
  readonly type = 'bun' as const;

  async detect(): Promise<PackageManagerInfo> {
    try {
      const path = await which('bun');
      const { stdout } = await execa('bun', ['--version']);
      return {
        type: 'bun',
        version: stdout.trim(),
        path,
        available: true,
      };
    } catch {
      return { type: 'bun', version: '', path: '', available: false };
    }
  }

  async getInstalledPackages(cwd: string): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('bun', ['pm', 'ls'], { cwd });
      const packages: InstalledPackage[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^([^@\s]+)@(\S+)/);
        if (match) {
          packages.push({
            name: match[1],
            version: match[2],
            isDev: line.includes('dev'),
            isPeer: line.includes('peer'),
            hasUpdate: false,
          });
        }
      }

      return packages;
    } catch {
      return [];
    }
  }

  async getGlobalPackages(): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('bun', ['pm', 'ls', '-g']);
      const packages: InstalledPackage[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^([^@\s]+)@(\S+)/);
        if (match) {
          packages.push({
            name: match[1],
            version: match[2],
            isDev: false,
            isPeer: false,
            hasUpdate: false,
          });
        }
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
    const args = ['add', ...packages];
    if (options?.dev) args.push('--dev');
    if (options?.global) args.push('-g');

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'install',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Installing with Bun...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    const subprocess = execa('bun', args, { cwd });

    subprocess.stdout?.on('data', (data: Buffer) => {
      progress.logs.push(data.toString());
      progress.progress = Math.min(progress.progress + 20, 90);
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
    const args = ['remove', ...packages];
    if (options?.global) args.push('-g');

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'uninstall',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Uninstalling with Bun...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('bun', args, { cwd });

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
      message: 'Updating with Bun...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('bun', args, { cwd });

    progress.status = 'completed';
    progress.progress = 100;
    progress.message = 'Update complete';
    progress.completedAt = Date.now();
    onProgress?.(progress);
  }

  async getDependencyTree(cwd: string): Promise<DependencyNode> {
    // Bun 目前没有原生的依赖树命令，使用 package.json 解析
    try {
      const { stdout } = await execa('cat', ['package.json'], { cwd });
      const pkg = JSON.parse(stdout);
      const node: DependencyNode = {
        name: pkg.name || 'root',
        version: pkg.version || '0.0.0',
        children: [],
      };

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        node.children.push({
          name,
          version: String(version),
          children: [],
        });
      }

      return node;
    } catch {
      return { name: 'root', version: '0.0.0', children: [] };
    }
  }

  async audit(_cwd: string): Promise<AuditResult> {
    // Bun 目前没有内置 audit 功能
    return {
      vulnerabilities: [],
      summary: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
    };
  }

  async setRegistry(url: string): Promise<void> {
    // Bun 通过 bunfig.toml 配置 registry
    const { stdout } = await execa('echo', [`registry = "${url}"`]);
    console.log('Bun registry config:', stdout);
  }

  async getRegistry(): Promise<string> {
    return 'https://registry.npmjs.org/';
  }
}
