import type { VercelRequest, VercelResponse } from '@vercel/node';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const OSV_API = 'https://api.osv.dev/v1/querybatch';

const NPM_SITE_REGISTRY_MAP: Record<string, string> = {
  'npmjs.com': 'https://registry.npmjs.org',
  'www.npmjs.com': 'https://registry.npmjs.org',
  'npmmirror.com': 'https://registry.npmmirror.com',
  'npm.taobao.org': 'https://registry.npmmirror.com',
  'yarnpkg.com': 'https://registry.yarnpkg.com',
};

type InputType = 'npm-package' | 'npm-site-url' | 'git-url';
type GitPlatform = 'github' | 'gitlab';

interface RemoteRepoInfo {
  platform: GitPlatform;
  owner: string;
  repo: string;
  branch?: string;
}

interface NpmPackageMeta {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
}

interface RemotePackageInfo {
  name: string;
  version: string;
  isDev: boolean;
}

interface RemoteUpdateInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}

interface DependencyNode {
  name: string;
  version: string;
  children: DependencyNode[];
}

interface VulnerabilityInfo {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  package: string;
  version: string;
  recommendation: string;
  url?: string;
}

interface RemoteAnalysisResult {
  sourceType: 'git' | 'npm';
  repoInfo?: RemoteRepoInfo;
  packageMeta?: NpmPackageMeta;
  packages: RemotePackageInfo[];
  dependencyTree: DependencyNode | null;
  vulnerabilities: VulnerabilityInfo[];
  updates: RemoteUpdateInfo[];
  lockFileType?: 'npm' | 'yarn' | 'pnpm';
}

function parseInputType(input: string): { type: InputType; value: string; registry?: string } {
  const trimmed = input.trim();
  for (const [domain, registry] of Object.entries(NPM_SITE_REGISTRY_MAP)) {
    const urlPattern = new RegExp(`^https?:\\/\\/${domain.replace('.', '\\.')}\\/package\\/(.+)$`);
    const match = trimmed.match(urlPattern);
    if (match) return { type: 'npm-site-url', value: match[1], registry };
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('git@')) {
    return { type: 'git-url', value: trimmed };
  }
  if (/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(trimmed)) {
    return { type: 'npm-package', value: trimmed };
  }
  return { type: 'git-url', value: trimmed };
}

function parseGitUrl(url: string): RemoteRepoInfo {
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/tree\/([^\/]+))?$/,
    /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    /^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/-\/tree\/([^\/]+))?$/,
    /^git@gitlab\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        platform: url.includes('gitlab') ? 'gitlab' : 'github',
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: match[3],
      };
    }
  }
  throw new Error(`Invalid Git URL: ${url}`);
}

async function fetchGitHubFile(owner: string, repo: string, path: string, branch?: string): Promise<string | null> {
  const ref = branch || 'HEAD';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github.v3.raw', 'User-Agent': 'NPVM-Remote-Analyzer' },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

async function fetchGitLabFile(owner: string, repo: string, path: string, branch?: string): Promise<string | null> {
  const projectId = encodeURIComponent(`${owner}/${repo}`);
  const ref = branch || 'HEAD';
  const encodedPath = encodeURIComponent(path);
  const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${ref}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'NPVM-Remote-Analyzer' } });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

async function fetchRepoFile(repoInfo: RemoteRepoInfo, filePath: string): Promise<string | null> {
  if (repoInfo.platform === 'github') {
    return fetchGitHubFile(repoInfo.owner, repoInfo.repo, filePath, repoInfo.branch);
  }
  return fetchGitLabFile(repoInfo.owner, repoInfo.repo, filePath, repoInfo.branch);
}

function parsePackageJson(content: string): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  try {
    const pkg = JSON.parse(content);
    return { dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

function extractPackages(deps: Record<string, string>, devDeps: Record<string, string>): RemotePackageInfo[] {
  const packages: RemotePackageInfo[] = [];
  for (const [name, version] of Object.entries(deps)) {
    packages.push({ name, version: version.replace(/^[\^~>=<]/, ''), isDev: false });
  }
  for (const [name, version] of Object.entries(devDeps)) {
    packages.push({ name, version: version.replace(/^[\^~>=<]/, ''), isDev: true });
  }
  return packages;
}

async function detectLockFileType(repoInfo: RemoteRepoInfo): Promise<{ type: 'npm' | 'yarn' | 'pnpm'; content: string } | null> {
  let content = await fetchRepoFile(repoInfo, 'pnpm-lock.yaml');
  if (content) return { type: 'pnpm', content };
  content = await fetchRepoFile(repoInfo, 'yarn.lock');
  if (content) return { type: 'yarn', content };
  content = await fetchRepoFile(repoInfo, 'package-lock.json');
  if (content) return { type: 'npm', content };
  return null;
}

function parseLockFile(content: string, type: 'npm' | 'yarn' | 'pnpm'): DependencyNode {
  const root: DependencyNode = { name: 'root', version: '0.0.0', children: [] };
  try {
    if (type === 'npm') {
      const lock = JSON.parse(content);
      root.name = lock.name || 'root';
      root.version = lock.version || '0.0.0';
      const packages = lock.packages || {};
      const deps = lock.dependencies || {};
      if (Object.keys(packages).length > 0) {
        for (const [path, info] of Object.entries(packages) as [string, any][]) {
          if (path === '' || !path.startsWith('node_modules/')) continue;
          const parts = path.replace('node_modules/', '').split('node_modules/');
          if (parts.length === 1) {
            root.children.push({ name: parts[0], version: info.version || '0.0.0', children: [] });
          }
        }
      } else if (Object.keys(deps).length > 0) {
        for (const [name, info] of Object.entries(deps) as [string, any][]) {
          root.children.push({ name, version: info.version || '0.0.0', children: [] });
        }
      }
    } else if (type === 'yarn') {
      const regex = /^"?([^@\s]+)@[^"]+?"?:\s*\n\s+version\s+"([^"]+)"/gm;
      let match;
      const seen = new Set<string>();
      while ((match = regex.exec(content)) !== null) {
        if (!seen.has(match[1])) {
          seen.add(match[1]);
          root.children.push({ name: match[1], version: match[2], children: [] });
        }
      }
    } else if (type === 'pnpm') {
      const lines = content.split('\n');
      let inPackages = false;
      const seen = new Set<string>();
      for (const line of lines) {
        if (line.startsWith('packages:')) { inPackages = true; continue; }
        if (inPackages && line.match(/^[a-z]/i)) break;
        if (inPackages) {
          const match = line.match(/^\s+['"]?\/?([@\w\-./]+)@(\d+\.\d+\.\d+[^'":]*)/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            root.children.push({ name: match[1], version: match[2], children: [] });
          }
        }
      }
    }
  } catch { /* ignore */ }
  return root;
}

function mapOsvSeverity(severity?: string): 'critical' | 'high' | 'moderate' | 'low' {
  if (!severity) return 'moderate';
  const s = severity.toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'moderate' || s === 'medium') return 'moderate';
  return 'low';
}

async function checkVulnerabilities(packages: { name: string; version: string }[]): Promise<VulnerabilityInfo[]> {
  if (packages.length === 0) return [];
  try {
    const queries = packages.map((pkg) => ({ package: { name: pkg.name, ecosystem: 'npm' }, version: pkg.version }));
    const response = await fetch(OSV_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const vulnerabilities: VulnerabilityInfo[] = [];
    for (let i = 0; i < (data.results || []).length; i++) {
      const result = data.results[i];
      const pkg = packages[i];
      for (const vuln of result.vulns || []) {
        vulnerabilities.push({
          id: vuln.id,
          title: vuln.summary || vuln.id,
          severity: mapOsvSeverity(vuln.severity || vuln.database_specific?.severity),
          package: pkg.name,
          version: pkg.version,
          recommendation: vuln.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed
            ? `Upgrade to ${vuln.affected[0].ranges[0].events.find((e: any) => e.fixed).fixed}`
            : 'No fix available',
          url: vuln.references?.[0]?.url,
        });
      }
    }
    return vulnerabilities;
  } catch {
    return [];
  }
}

async function checkUpdates(packages: { name: string; version: string }[]): Promise<RemoteUpdateInfo[]> {
  return Promise.all(
    packages.map(async (pkg) => {
      try {
        const response = await fetch(`${NPM_REGISTRY}/${pkg.name}`);
        if (!response.ok) return { name: pkg.name, currentVersion: pkg.version, latestVersion: pkg.version, hasUpdate: false };
        const data = await response.json();
        const latest = data['dist-tags']?.latest || pkg.version;
        return { name: pkg.name, currentVersion: pkg.version, latestVersion: latest, hasUpdate: latest !== pkg.version && !pkg.version.includes(latest) };
      } catch {
        return { name: pkg.name, currentVersion: pkg.version, latestVersion: pkg.version, hasUpdate: false };
      }
    })
  );
}

async function fetchNpmPackageInfo(packageName: string, registry: string = NPM_REGISTRY) {
  const url = `${registry}/${encodeURIComponent(packageName)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'NPVM-Remote-Analyzer' } });
  if (!response.ok) throw new Error(`Package not found: ${packageName}`);
  const data = await response.json();
  const latestVersion = data['dist-tags']?.latest;
  const latestInfo = data.versions?.[latestVersion] || {};
  const meta: NpmPackageMeta = {
    name: data.name,
    version: latestVersion || '0.0.0',
    description: data.description,
    author: typeof data.author === 'string' ? data.author : data.author?.name,
    license: data.license,
    homepage: data.homepage,
    repository: typeof data.repository === 'string' ? data.repository : data.repository?.url,
    keywords: data.keywords,
  };
  return { meta, dependencies: latestInfo.dependencies || {}, devDependencies: latestInfo.devDependencies || {} };
}

async function analyzeNpmPackage(packageName: string, registry: string = NPM_REGISTRY): Promise<RemoteAnalysisResult> {
  const { meta, dependencies, devDependencies } = await fetchNpmPackageInfo(packageName, registry);
  const packages = extractPackages(dependencies, devDependencies);
  const dependencyTree: DependencyNode = {
    name: meta.name,
    version: meta.version,
    children: packages.filter((p) => !p.isDev).map((p) => ({ name: p.name, version: p.version, children: [] })),
  };
  const packagesForCheck = packages.slice(0, 50).map((p) => ({ name: p.name, version: p.version }));
  const [vulnerabilities, updates] = await Promise.all([checkVulnerabilities(packagesForCheck), checkUpdates(packagesForCheck)]);
  return { sourceType: 'npm', packageMeta: meta, packages, dependencyTree, vulnerabilities, updates };
}

async function analyzeGitRepo(repoUrl: string, branch?: string): Promise<RemoteAnalysisResult> {
  const repoInfo = parseGitUrl(repoUrl);
  if (branch) repoInfo.branch = branch;
  const packageJsonContent = await fetchRepoFile(repoInfo, 'package.json');
  if (!packageJsonContent) throw new Error('package.json not found in repository');
  const { dependencies, devDependencies } = parsePackageJson(packageJsonContent);
  const packages = extractPackages(dependencies, devDependencies);
  let dependencyTree: DependencyNode | null = null;
  let lockFileType: 'npm' | 'yarn' | 'pnpm' | undefined;
  const lockFile = await detectLockFileType(repoInfo);
  if (lockFile) {
    lockFileType = lockFile.type;
    dependencyTree = parseLockFile(lockFile.content, lockFile.type);
  }
  const packagesForCheck = packages.slice(0, 50).map((p) => ({ name: p.name, version: p.version }));
  const [vulnerabilities, updates] = await Promise.all([checkVulnerabilities(packagesForCheck), checkUpdates(packagesForCheck)]);
  return { sourceType: 'git', repoInfo, packages, dependencyTree, vulnerabilities, updates, lockFileType };
}

async function analyzeRemoteRepo(input: string, branch?: string): Promise<RemoteAnalysisResult> {
  const parsed = parseInputType(input);
  switch (parsed.type) {
    case 'npm-package':
    case 'npm-site-url':
      return analyzeNpmPackage(parsed.value, parsed.registry);
    case 'git-url':
    default:
      return analyzeGitRepo(parsed.value, branch);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { repoUrl, branch } = req.body || {};
  if (!repoUrl) {
    return res.status(400).json({ success: false, error: 'repoUrl is required' });
  }

  try {
    const result = await analyzeRemoteRepo(repoUrl, branch);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}
