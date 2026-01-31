import type { PackageManagerType } from '@npvm/shared';
import type { PackageManagerAdapter } from './base.js';
import { NpmAdapter } from './npm.js';
import { YarnAdapter } from './yarn.js';
import { PnpmAdapter } from './pnpm.js';
import { BunAdapter } from './bun.js';

export * from './base.js';
export * from './npm.js';
export * from './yarn.js';
export * from './pnpm.js';
export * from './bun.js';

const adapters: Record<PackageManagerType, PackageManagerAdapter> = {
  npm: new NpmAdapter(),
  yarn: new YarnAdapter(),
  pnpm: new PnpmAdapter(),
  bun: new BunAdapter(),
};

export function getAdapter(type: PackageManagerType): PackageManagerAdapter {
  return adapters[type];
}

export async function detectAllPackageManagers() {
  const results = await Promise.all(
    Object.values(adapters).map((adapter) => adapter.detect())
  );
  return results;
}

export function getAllAdapters(): PackageManagerAdapter[] {
  return Object.values(adapters);
}
