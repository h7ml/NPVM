import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { fetchApi, createSSEConnection } from '../lib/api';
import { useAppStore } from '../stores/app';
import type {
  PackageManagerInfo,
  InstalledPackage,
  DependencyNode,
  AuditResult,
  OperationProgress,
} from '@npvm/shared';

export interface PackageUpdateInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  deprecated?: string;
}

export function usePackageManagers() {
  return useQuery({
    queryKey: ['pm', 'detect'],
    queryFn: async () => {
      const res = await fetchApi<PackageManagerInfo[]>('/pm/detect');
      return res.data || [];
    },
  });
}

export function useInstalledPackages() {
  const { currentPm, isGlobal } = useAppStore();

  return useQuery({
    queryKey: ['packages', currentPm, isGlobal],
    queryFn: async () => {
      const res = await fetchApi<InstalledPackage[]>('/packages');
      return res.data || [];
    },
  });
}

export function useCheckUpdates(packages: { name: string; version: string }[]) {
  return useQuery({
    queryKey: ['packages', 'updates', packages.map((p) => `${p.name}@${p.version}`).join(',')],
    queryFn: async () => {
      if (packages.length === 0) return [];
      const res = await fetchApi<PackageUpdateInfo[]>('/packages/check-updates', {
        method: 'POST',
        body: JSON.stringify({ packages }),
      });
      return res.data || [];
    },
    enabled: packages.length > 0,
    staleTime: 5 * 60 * 1000, // 缓存5分钟
  });
}

export function useDependencyTree() {
  return useQuery({
    queryKey: ['deps', 'tree'],
    queryFn: async () => {
      const res = await fetchApi<DependencyNode>('/deps/tree');
      return res.data || { name: 'root', version: '0.0.0', children: [] };
    },
  });
}

export function useInstallPackage() {
  const queryClient = useQueryClient();
  const { setCurrentOperation, addTerminalLog } = useAppStore();
  const lastLogCountRef = useRef(0);

  return useMutation({
    mutationFn: async ({
      packages,
      dev,
    }: {
      packages: string[];
      dev?: boolean;
    }) => {
      lastLogCountRef.current = 0;
      return new Promise<void>((resolve, reject) => {
        createSSEConnection(
          '/packages/install',
          { packages, dev },
          (data) => {
            const progress = data as OperationProgress;
            setCurrentOperation(progress);
            // 只添加新日志
            const newLogs = progress.logs.slice(lastLogCountRef.current);
            newLogs.forEach((log) => addTerminalLog(log));
            lastLogCountRef.current = progress.logs.length;
          },
          () => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            resolve();
          },
          (error) => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            reject(new Error(error));
          }
        );
      });
    },
  });
}

export function useUninstallPackage() {
  const queryClient = useQueryClient();
  const { setCurrentOperation, addTerminalLog } = useAppStore();
  const lastLogCountRef = useRef(0);

  return useMutation({
    mutationFn: async (packages: string[]) => {
      lastLogCountRef.current = 0;
      return new Promise<void>((resolve, reject) => {
        createSSEConnection(
          '/packages/uninstall',
          { packages },
          (data) => {
            const progress = data as OperationProgress;
            setCurrentOperation(progress);
            // 只添加新日志
            const newLogs = progress.logs.slice(lastLogCountRef.current);
            newLogs.forEach((log) => addTerminalLog(log));
            lastLogCountRef.current = progress.logs.length;
          },
          () => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            resolve();
          },
          (error) => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            reject(new Error(error));
          }
        );
      });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  const { setCurrentOperation, addTerminalLog } = useAppStore();
  const lastLogCountRef = useRef(0);

  return useMutation({
    mutationFn: async (packages: string[]) => {
      lastLogCountRef.current = 0;
      return new Promise<void>((resolve, reject) => {
        createSSEConnection(
          '/packages/update',
          { packages },
          (data) => {
            const progress = data as OperationProgress;
            setCurrentOperation(progress);
            const newLogs = progress.logs.slice(lastLogCountRef.current);
            newLogs.forEach((log) => addTerminalLog(log));
            lastLogCountRef.current = progress.logs.length;
          },
          () => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            resolve();
          },
          (error) => {
            setCurrentOperation(null);
            lastLogCountRef.current = 0;
            reject(new Error(error));
          }
        );
      });
    },
  });
}

export function useSecurityAudit() {
  const { addTerminalLog } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      return new Promise<AuditResult>((resolve, reject) => {
        let result: AuditResult | null = null;

        createSSEConnection(
          '/security/audit',
          {},
          (data: any) => {
            if (data.type === 'progress') {
              addTerminalLog(data.message);
            } else if (data.type === 'result') {
              result = data.data;
            }
          },
          () => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error('No result received'));
            }
          },
          (error) => {
            reject(new Error(error));
          }
        );
      });
    },
  });
}

export function useSearchPackages(query: string) {
  return useQuery({
    queryKey: ['packages', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await fetchApi<{ name: string; description: string; version: string }[]>(
        `/packages/search?q=${encodeURIComponent(query)}`
      );
      return res.data || [];
    },
    enabled: query.length > 1,
  });
}
