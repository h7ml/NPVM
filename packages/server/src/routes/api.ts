import type { FastifyInstance } from 'fastify';
import { detectAllPackageManagers, getAdapter } from '../adapters/index.js';
import type { PackageManagerType } from '@dext7r/npvm-shared';
import { REGISTRIES } from '@dext7r/npvm-shared';
import {
  getPackageInfo,
  getPackageVersions,
  searchPackages,
  checkRegistryConnection,
  checkPackagesUpdate,
} from '../services/registry.js';
import { analyzeRemoteRepo } from '../services/remote.js';
import { routeSchemas } from './schemas.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';

interface AppState {
  currentPm: PackageManagerType;
  currentRegistry: string;
  projectPath: string;
  isGlobal: boolean;
}

export async function registerRoutes(app: FastifyInstance, state: AppState) {
  // 检测已安装的包管理器
  app.get('/api/pm/detect', { schema: routeSchemas.detectPm }, async () => {
    const managers = await detectAllPackageManagers();
    return { success: true, data: managers };
  });

  // 获取当前包管理器
  app.get('/api/pm/current', { schema: routeSchemas.getCurrentPm }, async () => {
    return { success: true, data: { type: state.currentPm } };
  });

  // 设置当前包管理器
  app.put<{ Body: { type: PackageManagerType } }>('/api/pm/current', { schema: routeSchemas.setCurrentPm }, async (request) => {
    state.currentPm = request.body.type;
    return { success: true, data: { type: state.currentPm } };
  });

  // 升级包管理器
  app.post<{ Body: { type: PackageManagerType } }>('/api/pm/upgrade', async (request, reply) => {
    const { type } = request.body;
    const adapter = getAdapter(type);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      reply.raw.write(`data: ${JSON.stringify({ type: 'progress', message: `Upgrading ${type}...` })}\n\n`);

      // 根据包管理器类型执行升级命令
      const { execa } = await import('execa');
      let cmd: string[];

      switch (type) {
        case 'npm':
          cmd = ['npm', 'install', '-g', 'npm@latest'];
          break;
        case 'yarn':
          cmd = ['npm', 'install', '-g', 'yarn@latest'];
          break;
        case 'pnpm':
          cmd = ['npm', 'install', '-g', 'pnpm@latest'];
          break;
        case 'bun':
          cmd = ['bun', 'upgrade'];
          break;
        default:
          throw new Error(`Unknown package manager: ${type}`);
      }

      await execa(cmd[0], cmd.slice(1));

      // 重新检测版本
      const newInfo = await adapter.detect();

      reply.raw.write(`data: ${JSON.stringify({ type: 'result', data: newInfo })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (error) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`);
    }

    reply.raw.end();
  });

  // 获取注册表列表
  app.get('/api/registry/list', { schema: routeSchemas.getRegistryList }, async () => {
    const statuses = await Promise.all(
      REGISTRIES.map(async (r) => ({
        ...r,
        connected: await checkRegistryConnection(r.url),
      }))
    );
    return { success: true, data: statuses };
  });

  // 获取当前注册表
  app.get('/api/registry/current', { schema: routeSchemas.getCurrentRegistry }, async () => {
    const adapter = getAdapter(state.currentPm);
    const url = await adapter.getRegistry();
    return { success: true, data: { url } };
  });

  // 设置注册表
  app.put<{ Body: { url: string } }>('/api/registry/current', { schema: routeSchemas.setCurrentRegistry }, async (request) => {
    const adapter = getAdapter(state.currentPm);
    await adapter.setRegistry(request.body.url);
    state.currentRegistry = request.body.url;
    return { success: true, data: { url: request.body.url } };
  });

  // 获取项目路径
  app.get('/api/project/path', { schema: routeSchemas.getProjectPath }, async () => {
    return { success: true, data: { path: state.projectPath } };
  });

  // 设置项目路径
  app.put<{ Body: { path: string } }>('/api/project/path', { schema: routeSchemas.setProjectPath }, async (request) => {
    state.projectPath = request.body.path;
    state.isGlobal = false;
    return { success: true, data: { path: state.projectPath, isGlobal: false } };
  });

  // 浏览文件系统目录
  app.get<{ Querystring: { path?: string } }>('/api/fs/browse', async (request) => {
    const targetPath = request.query.path || homedir();
    const resolvedPath = resolve(targetPath);

    if (!existsSync(resolvedPath)) {
      return { success: false, error: 'Path does not exist' };
    }

    try {
      const stat = statSync(resolvedPath);
      if (!stat.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }

      const entries = readdirSync(resolvedPath, { withFileTypes: true });
      const directories = entries
        .filter((entry) => {
          if (!entry.isDirectory()) return false;
          if (entry.name.startsWith('.')) return false;
          // 排除系统目录
          if (['node_modules', 'Library', 'Applications'].includes(entry.name)) return false;
          return true;
        })
        .map((entry) => ({
          name: entry.name,
          path: join(resolvedPath, entry.name),
          isProject: existsSync(join(resolvedPath, entry.name, 'package.json')),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        success: true,
        data: {
          current: resolvedPath,
          parent: dirname(resolvedPath) !== resolvedPath ? dirname(resolvedPath) : null,
          directories,
        },
      };
    } catch {
      return { success: false, error: 'Cannot read directory' };
    }
  });

  // 获取全局模式状态
  app.get('/api/global/status', { schema: routeSchemas.getGlobalStatus }, async () => {
    return { success: true, data: { isGlobal: state.isGlobal } };
  });

  // 切换全局/项目模式
  app.put<{ Body: { isGlobal: boolean } }>('/api/global/status', { schema: routeSchemas.setGlobalStatus }, async (request) => {
    state.isGlobal = request.body.isGlobal;
    return { success: true, data: { isGlobal: state.isGlobal } };
  });

  // 获取已安装的包列表
  app.get('/api/packages', { schema: routeSchemas.getPackages }, async () => {
    const adapter = getAdapter(state.currentPm);
    const packages = state.isGlobal
      ? await adapter.getGlobalPackages()
      : await adapter.getInstalledPackages(state.projectPath);
    return { success: true, data: packages };
  });

  // 搜索包
  app.get<{ Querystring: { q: string } }>('/api/packages/search', { schema: routeSchemas.searchPackages }, async (request) => {
    const results = await searchPackages(request.query.q, state.currentRegistry);
    return { success: true, data: results };
  });

  // 获取包详情
  app.get<{ Params: { name: string } }>('/api/packages/:name', { schema: routeSchemas.getPackageInfo }, async (request) => {
    const info = await getPackageInfo(request.params.name, state.currentRegistry);
    if (!info) {
      return { success: false, error: 'Package not found' };
    }
    return { success: true, data: info };
  });

  // 获取包版本列表
  app.get<{ Params: { name: string } }>('/api/packages/:name/versions', { schema: routeSchemas.getPackageVersions }, async (request) => {
    const versions = await getPackageVersions(request.params.name, state.currentRegistry);
    return { success: true, data: versions };
  });

  // 安装包 (SSE)
  app.post<{ Body: { packages: string[]; dev?: boolean } }>(
    '/api/packages/install',
    { schema: routeSchemas.installPackage },
    async (request, reply) => {
      const adapter = getAdapter(state.currentPm);

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      try {
        await adapter.install(
          request.body.packages,
          state.projectPath,
          { dev: request.body.dev, global: state.isGlobal, registry: state.currentRegistry },
          (progress) => {
            reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
          }
        );
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (error) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
        );
      }

      reply.raw.end();
    }
  );

  // 卸载包
  app.post<{ Body: { packages: string[] } }>(
    '/api/packages/uninstall',
    { schema: routeSchemas.uninstallPackage },
    async (request, reply) => {
      const adapter = getAdapter(state.currentPm);

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      try {
        await adapter.uninstall(
          request.body.packages,
          state.projectPath,
          { global: state.isGlobal },
          (progress) => {
            reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
          }
        );
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (error) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
        );
      }

      reply.raw.end();
    }
  );

  // 更新包
  app.post<{ Body: { packages?: string[] } }>(
    '/api/packages/update',
    { schema: routeSchemas.updatePackage },
    async (request, reply) => {
      const adapter = getAdapter(state.currentPm);

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      try {
        await adapter.update(
          request.body.packages || [],
          state.projectPath,
          (progress) => {
            reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
          }
        );
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (error) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
        );
      }

      reply.raw.end();
    }
  );

  // 获取依赖树
  app.get('/api/deps/tree', { schema: routeSchemas.getDependencyTree }, async () => {
    const adapter = getAdapter(state.currentPm);
    const tree = await adapter.getDependencyTree(state.projectPath);
    return { success: true, data: tree };
  });

  // 安全审计
  app.post('/api/security/audit', { schema: routeSchemas.securityAudit }, async (_request, reply) => {
    const adapter = getAdapter(state.currentPm);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'progress', message: 'Running security audit...' })}\n\n`
      );

      const result = await adapter.audit(state.projectPath);

      reply.raw.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (error) {
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
      );
    }

    reply.raw.end();
  });

  // 安全审计修复
  app.post('/api/security/fix', async (_request, reply) => {
    const adapter = getAdapter(state.currentPm);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      const result = await adapter.auditFix(
        state.projectPath,
        (progress) => {
          reply.raw.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
        }
      );

      reply.raw.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (error) {
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
      );
    }

    reply.raw.end();
  });

  // 检查包更新状态
  app.post<{ Body: { packages: { name: string; version: string }[] } }>(
    '/api/packages/check-updates',
    async (request) => {
      const updates = await checkPackagesUpdate(request.body.packages, state.currentRegistry);
      return { success: true, data: updates };
    }
  );

  // 远程仓库分析
  app.post<{ Body: { repoUrl: string; branch?: string } }>(
    '/api/remote/analyze',
    { schema: routeSchemas.analyzeRemoteRepo },
    async (request) => {
      try {
        const result = await analyzeRemoteRepo(request.body.repoUrl, request.body.branch);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 获取缓存大小
  app.get('/api/cache/size', async () => {
    const { execa } = await import('execa');
    try {
      let size = 'Unknown';

      switch (state.currentPm) {
        case 'npm': {
          const { stdout } = await execa('npm', ['cache', 'ls'], { reject: false });
          const lines = stdout.split('\n').filter(Boolean);
          size = `${lines.length} entries`;
          break;
        }
        case 'yarn': {
          const { stdout } = await execa('yarn', ['cache', 'dir']);
          const cacheDir = stdout.trim();
          const { stdout: duOut } = await execa('du', ['-sh', cacheDir], { reject: false });
          size = duOut.split('\t')[0] || 'Unknown';
          break;
        }
        case 'pnpm': {
          const { stdout } = await execa('pnpm', ['store', 'status'], { reject: false });
          size = stdout.includes('Store path') ? 'Active' : 'Unknown';
          break;
        }
        case 'bun': {
          size = 'N/A';
          break;
        }
      }

      return { success: true, data: { size } };
    } catch {
      return { success: true, data: { size: 'Unknown' } };
    }
  });

  // 清除缓存
  app.post('/api/cache/clear', async () => {
    const { execa } = await import('execa');
    try {
      switch (state.currentPm) {
        case 'npm':
          await execa('npm', ['cache', 'clean', '--force']);
          break;
        case 'yarn':
          await execa('yarn', ['cache', 'clean']);
          break;
        case 'pnpm':
          await execa('pnpm', ['store', 'prune']);
          break;
        case 'bun':
          // Bun doesn't have a cache clear command
          break;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
