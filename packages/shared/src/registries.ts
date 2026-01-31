import type { RegistryConfig } from './types.js';

export const REGISTRIES: RegistryConfig[] = [
  {
    name: 'npm',
    url: 'https://registry.npmjs.org/',
    description: 'npm 官方源',
  },
  {
    name: 'taobao',
    url: 'https://registry.npmmirror.com/',
    description: '淘宝镜像源',
  },
  {
    name: 'tencent',
    url: 'https://mirrors.cloud.tencent.com/npm/',
    description: '腾讯云镜像源',
  },
  {
    name: 'huawei',
    url: 'https://repo.huaweicloud.com/repository/npm/',
    description: '华为云镜像源',
  },
  {
    name: 'yarn',
    url: 'https://registry.yarnpkg.com/',
    description: 'Yarn 官方源',
  },
];

export function getRegistryByName(name: string): RegistryConfig | undefined {
  return REGISTRIES.find((r) => r.name === name);
}

export function getRegistryByUrl(url: string): RegistryConfig | undefined {
  return REGISTRIES.find((r) => r.url === url);
}
