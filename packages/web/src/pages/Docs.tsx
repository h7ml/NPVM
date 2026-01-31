import { useTranslation } from 'react-i18next';
import {
  Package,
  Terminal,
  Globe,
  Shield,
  GitBranch,
  Settings,
  Monitor,
  Rocket,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { clsx } from 'clsx';

function DocSection({ icon: Icon, title, children, color = 'blue' }: {
  icon: typeof Package;
  title: string;
  children: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className={clsx('p-2 rounded-lg', colorMap[color])}>
          <Icon size={20} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 leading-relaxed">
        {children}
      </div>
    </Card>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function KeyboardShortcut({ keys }: { keys: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.split('+').map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="text-gray-400 mx-0.5">+</span>}
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function Docs() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {t('docs.title')}
        </h2>
        <a
          href="https://github.com/h7ml/NPVM"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600"
        >
          GitHub <ExternalLink size={14} />
        </a>
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg p-6 text-white">
        <h3 className="text-2xl font-bold mb-2">NPVM</h3>
        <p className="text-white/90">{t('docs.description')}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {['React 18', 'Vite', 'TypeScript', 'TailwindCSS', 'Fastify', 'Node.js'].map((tech) => (
            <span key={tech} className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* 快速开始 */}
      <DocSection icon={Rocket} title={t('docs.quickStart')} color="green">
        <p>{t('docs.quickStartDesc')}</p>
        <CodeBlock>{`npm install -g @dext7r/npvm-cli\nnpvm`}</CodeBlock>
        <p>{t('docs.quickStartAlt')}</p>
        <CodeBlock>{`git clone https://github.com/h7ml/NPVM.git\ncd NPVM\npnpm install\npnpm dev`}</CodeBlock>
      </DocSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 包管理 */}
        <DocSection icon={Package} title={t('docs.packageManagement')} color="blue">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('docs.pmFeature1')}</li>
            <li>{t('docs.pmFeature2')}</li>
            <li>{t('docs.pmFeature3')}</li>
            <li>{t('docs.pmFeature4')}</li>
          </ul>
        </DocSection>

        {/* 依赖分析 */}
        <DocSection icon={GitBranch} title={t('docs.dependencyAnalysis')} color="purple">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('docs.depFeature1')}</li>
            <li>{t('docs.depFeature2')}</li>
            <li>{t('docs.depFeature3')}</li>
          </ul>
        </DocSection>

        {/* 安全审计 */}
        <DocSection icon={Shield} title={t('docs.securityAudit')} color="green">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('docs.secFeature1')}</li>
            <li>{t('docs.secFeature2')}</li>
            <li>{t('docs.secFeature3')}</li>
          </ul>
        </DocSection>

        {/* 远程分析 */}
        <DocSection icon={Globe} title={t('docs.remoteAnalysis')} color="orange">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('docs.remoteFeature1')}</li>
            <li>{t('docs.remoteFeature2')}</li>
            <li>{t('docs.remoteFeature3')}</li>
            <li>{t('docs.remoteFeature4')}</li>
          </ul>
        </DocSection>

        {/* CLI */}
        <DocSection icon={Terminal} title={t('docs.cliUsage')} color="pink">
          <CodeBlock>{`npvm                        # ${t('docs.cliCmd1')}\nnpvm -p 8080                # ${t('docs.cliCmd2')}\nnpvm -P /path/to/project    # ${t('docs.cliCmd3')}`}</CodeBlock>
        </DocSection>

        {/* 设置 */}
        <DocSection icon={Settings} title={t('docs.configuration')} color="cyan">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('docs.configFeature1')}</li>
            <li>{t('docs.configFeature2')}</li>
            <li>{t('docs.configFeature3')}</li>
          </ul>
        </DocSection>
      </div>

      {/* API 文档 */}
      <DocSection icon={Monitor} title={t('docs.apiReference')} color="blue">
        <p>{t('docs.apiDesc')}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium text-gray-700 dark:text-gray-300">{t('docs.method')}</th>
                <th className="pb-2 font-medium text-gray-700 dark:text-gray-300">{t('docs.endpoint')}</th>
                <th className="pb-2 font-medium text-gray-700 dark:text-gray-300">{t('docs.apiDescription')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {[
                ['GET', '/api/pm/detect', t('docs.apiDetectPm')],
                ['GET', '/api/packages', t('docs.apiListPkg')],
                ['POST', '/api/packages/install', t('docs.apiInstallPkg')],
                ['POST', '/api/packages/update', t('docs.apiUpdatePkg')],
                ['POST', '/api/packages/uninstall', t('docs.apiUninstallPkg')],
                ['GET', '/api/deps/tree', t('docs.apiDepsTree')],
                ['POST', '/api/security/audit', t('docs.apiAudit')],
                ['POST', '/api/remote/analyze', t('docs.apiRemote')],
                ['GET', '/api/registry/list', t('docs.apiRegistryList')],
                ['PUT', '/api/registry/current', t('docs.apiRegistrySet')],
              ].map(([method, path, desc]) => (
                <tr key={path}>
                  <td className="py-1.5">
                    <Badge
                      variant={method === 'GET' ? 'success' : method === 'POST' ? 'info' : 'warning'}
                      size="sm"
                    >
                      {method}
                    </Badge>
                  </td>
                  <td className="py-1.5 font-mono text-xs">{path}</td>
                  <td className="py-1.5 text-gray-500 dark:text-gray-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          {t('docs.swaggerHint')}{' '}
          <a href="/docs" className="text-primary-500 hover:underline">/docs</a>
        </p>
      </DocSection>

      {/* 键盘快捷键 */}
      <DocSection icon={BookOpen} title={t('docs.shortcuts')} color="purple">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { keys: 'Ctrl+K', desc: t('docs.shortcutSearch') },
            { keys: 'Ctrl+D', desc: t('docs.shortcutDarkMode') },
            { keys: 'Ctrl+L', desc: t('docs.shortcutLang') },
            { keys: 'Ctrl+B', desc: t('docs.shortcutSidebar') },
          ].map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span>{desc}</span>
              <KeyboardShortcut keys={keys} />
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  );
}
