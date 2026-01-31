// 路由 Schema 定义 - 仅用于 Swagger 文档，不做响应验证
export const routeSchemas = {
  detectPm: {
    tags: ['pm'],
    summary: '检测已安装的包管理器',
    description: '检测系统中已安装的 npm/yarn/pnpm/bun',
  },

  getCurrentPm: {
    tags: ['pm'],
    summary: '获取当前包管理器',
  },

  setCurrentPm: {
    tags: ['pm'],
    summary: '设置当前包管理器',
    body: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['npm', 'yarn', 'pnpm', 'bun'] },
      },
    },
  },

  getRegistryList: {
    tags: ['registry'],
    summary: '获取注册表列表',
    description: '获取所有可用的 npm 注册表及其连接状态',
  },

  getCurrentRegistry: {
    tags: ['registry'],
    summary: '获取当前注册表',
  },

  setCurrentRegistry: {
    tags: ['registry'],
    summary: '设置当前注册表',
    body: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string' },
      },
    },
  },

  getProjectPath: {
    tags: ['project'],
    summary: '获取项目路径',
  },

  setProjectPath: {
    tags: ['project'],
    summary: '设置项目路径',
    description: '设置项目路径，同时切换为项目模式',
    body: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
      },
    },
  },

  getGlobalStatus: {
    tags: ['project'],
    summary: '获取全局模式状态',
  },

  setGlobalStatus: {
    tags: ['project'],
    summary: '切换全局/项目模式',
    body: {
      type: 'object',
      required: ['isGlobal'],
      properties: {
        isGlobal: { type: 'boolean' },
      },
    },
  },

  getPackages: {
    tags: ['packages'],
    summary: '获取已安装的包列表',
    description: '根据当前模式（全局/项目）获取已安装的包',
  },

  searchPackages: {
    tags: ['packages'],
    summary: '搜索 npm 包',
    querystring: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string', description: '搜索关键词' },
      },
    },
  },

  getPackageInfo: {
    tags: ['packages'],
    summary: '获取包详情',
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    },
  },

  getPackageVersions: {
    tags: ['packages'],
    summary: '获取包版本列表',
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    },
  },

  installPackage: {
    tags: ['packages'],
    summary: '安装包',
    description: '安装一个或多个 npm 包（SSE 返回进度）',
    body: {
      type: 'object',
      required: ['packages'],
      properties: {
        packages: { type: 'array', items: { type: 'string' } },
        dev: { type: 'boolean', description: '是否为开发依赖' },
      },
    },
  },

  uninstallPackage: {
    tags: ['packages'],
    summary: '卸载包',
    description: '卸载一个或多个 npm 包（SSE 返回进度）',
    body: {
      type: 'object',
      required: ['packages'],
      properties: {
        packages: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  updatePackage: {
    tags: ['packages'],
    summary: '更新包',
    description: '更新一个或多个 npm 包（SSE 返回进度）',
    body: {
      type: 'object',
      properties: {
        packages: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  getDependencyTree: {
    tags: ['deps'],
    summary: '获取依赖树',
  },

  securityAudit: {
    tags: ['security'],
    summary: '安全审计',
    description: '扫描项目依赖的安全漏洞（SSE 返回进度和结果）',
  },

  checkUpdates: {
    tags: ['packages'],
    summary: '检查包更新',
    description: '检查指定包的更新状态和废弃信息',
    body: {
      type: 'object',
      required: ['packages'],
      properties: {
        packages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
