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

export class YarnAdapter implements PackageManagerAdapter {
  readonly type = 'yarn' as const;

  async detect(): Promise<PackageManagerInfo> {
    try {
      const path = await which('yarn');
      const { stdout } = await execa('yarn', ['--version']);
      return {
        type: 'yarn',
        version: stdout.trim(),
        path,
        available: true,
      };
    } catch {
      return { type: 'yarn', version: '', path: '', available: false };
    }
  }

  async getInstalledPackages(cwd: string): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('yarn', ['list', '--json', '--depth=0'], { cwd });
      const lines = stdout.trim().split('\n');
      const packages: InstalledPackage[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'tree' && data.data?.trees) {
            for (const tree of data.data.trees) {
              const match = tree.name?.match(/^(.+)@(.+)$/);
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
          }
        } catch {}
      }

      return packages;
    } catch {
      return [];
    }
  }

  async getGlobalPackages(): Promise<InstalledPackage[]> {
    try {
      const { stdout } = await execa('yarn', ['global', 'list', '--json', '--depth=0']);
      const lines = stdout.trim().split('\n');
      const packages: InstalledPackage[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'tree' && data.data?.trees) {
            for (const tree of data.data.trees) {
              const match = tree.name?.match(/^(.+)@(.+)$/);
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
          }
        } catch {}
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
    if (options?.registry) args.push('--registry', options.registry);

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'install',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Installing with Yarn...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    const subprocess = execa('yarn', args, { cwd });

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
    const args = options?.global ? ['global', 'remove', ...packages] : ['remove', ...packages];

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'uninstall',
      status: 'running',
      package: packages.join(', '),
      progress: 0,
      message: 'Uninstalling with Yarn...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('yarn', args, { cwd });

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
    const args = packages.length ? ['upgrade', ...packages] : ['upgrade'];

    const operationId = randomUUID();
    const progress: OperationProgress = {
      id: operationId,
      type: 'update',
      status: 'running',
      package: packages.join(', ') || 'all',
      progress: 0,
      message: 'Updating with Yarn...',
      logs: [],
      startedAt: Date.now(),
    };

    onProgress?.(progress);

    await execa('yarn', args, { cwd });

    progress.status = 'completed';
    progress.progress = 100;
    progress.message = 'Update complete';
    progress.completedAt = Date.now();
    onProgress?.(progress);
  }

  async getDependencyTree(cwd: string): Promise<DependencyNode> {
    try {
      const { stdout } = await execa('yarn', ['list', '--json'], { cwd });
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'tree') {
            return this.parseYarnTree(data.data);
          }
        } catch {}
      }

      return { name: 'root', version: '0.0.0', children: [] };
    } catch {
      return { name: 'root', version: '0.0.0', children: [] };
    }
  }

  private parseYarnTree(data: any): DependencyNode {
    const node: DependencyNode = {
      name: 'root',
      version: '0.0.0',
      children: [],
    };

    if (data?.trees) {
      for (const tree of data.trees) {
        const match = tree.name?.match(/^(.+)@(.+)$/);
        if (match) {
          const child: DependencyNode = {
            name: match[1],
            version: match[2],
            children: [],
          };
          if (tree.children) {
            child.children = tree.children.map((c: any) => {
              const m = c.name?.match(/^(.+)@(.+)$/);
              return {
                name: m?.[1] || c.name,
                version: m?.[2] || 'unknown',
                children: [],
              };
            });
          }
          node.children.push(child);
        }
      }
    }

    return node;
  }

  async audit(cwd: string): Promise<AuditResult> {
    try {
      const { stdout } = await execa('yarn', ['audit', '--json'], { cwd, reject: false });
      const lines = stdout.trim().split('\n');
      const vulnerabilities: VulnerabilityInfo[] = [];
      let summary = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'auditAdvisory') {
            const adv = data.data.advisory;
            vulnerabilities.push({
              id: String(adv.id),
              title: adv.title,
              severity: adv.severity,
              package: adv.module_name,
              version: adv.vulnerable_versions,
              recommendation: adv.recommendation,
              url: adv.url,
            });
          } else if (data.type === 'auditSummary') {
            summary = {
              critical: data.data.vulnerabilities.critical || 0,
              high: data.data.vulnerabilities.high || 0,
              moderate: data.data.vulnerabilities.moderate || 0,
              low: data.data.vulnerabilities.low || 0,
              total: data.data.vulnerabilities.total || 0,
            };
          }
        } catch {}
      }

      return { vulnerabilities, summary };
    } catch {
      return {
        vulnerabilities: [],
        summary: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
      };
    }
  }

  async setRegistry(url: string): Promise<void> {
    await execa('yarn', ['config', 'set', 'registry', url]);
  }

  async getRegistry(): Promise<string> {
    const { stdout } = await execa('yarn', ['config', 'get', 'registry']);
    return stdout.trim();
  }
}
