import { execa } from 'execa';
import type { PackageInfo } from '@npvm/shared';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export async function getPackageInfo(name: string, registry?: string): Promise<PackageInfo | null> {
  try {
    const url = `${registry || NPM_REGISTRY}/${name}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const latest = data['dist-tags']?.latest;
    const latestVersion = data.versions?.[latest] || {};

    return {
      name: data.name,
      version: latest,
      description: data.description,
      homepage: data.homepage,
      repository: typeof data.repository === 'string' ? data.repository : data.repository?.url,
      license: data.license,
      author: typeof data.author === 'string' ? data.author : data.author?.name,
      dependencies: latestVersion.dependencies,
      devDependencies: latestVersion.devDependencies,
      peerDependencies: latestVersion.peerDependencies,
    };
  } catch {
    return null;
  }
}

export async function getPackageVersions(name: string, registry?: string): Promise<string[]> {
  try {
    const url = `${registry || NPM_REGISTRY}/${name}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return Object.keys(data.versions || {}).reverse();
  } catch {
    return [];
  }
}

export async function searchPackages(
  query: string,
  registry?: string
): Promise<{ name: string; description: string; version: string }[]> {
  try {
    const url = `${registry || NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=20`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.objects || []).map((obj: any) => ({
      name: obj.package.name,
      description: obj.package.description || '',
      version: obj.package.version,
    }));
  } catch {
    return [];
  }
}

export async function checkRegistryConnection(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export interface PackageUpdateInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  deprecated?: string;
}

export async function checkPackageUpdate(
  name: string,
  currentVersion: string,
  registry?: string
): Promise<PackageUpdateInfo> {
  try {
    const url = `${registry || NPM_REGISTRY}/${name}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { name, currentVersion, latestVersion: currentVersion, hasUpdate: false };
    }

    const data = await response.json();
    const latest = data['dist-tags']?.latest || currentVersion;
    const deprecated = data.versions?.[currentVersion]?.deprecated;

    return {
      name,
      currentVersion,
      latestVersion: latest,
      hasUpdate: latest !== currentVersion,
      deprecated,
    };
  } catch {
    return { name, currentVersion, latestVersion: currentVersion, hasUpdate: false };
  }
}

export async function checkPackagesUpdate(
  packages: { name: string; version: string }[],
  registry?: string
): Promise<PackageUpdateInfo[]> {
  return Promise.all(
    packages.map((pkg) => checkPackageUpdate(pkg.name, pkg.version, registry))
  );
}
