import { useTranslation } from 'react-i18next';
import { Package, Shield, GitBranch, AlertTriangle, Check, ArrowUp, Loader2 } from 'lucide-react';
import { usePackageManagers, useInstalledPackages } from '../hooks/usePackages';
import { useAppStore } from '../stores/app';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toast';
import { useState } from 'react';
import type { PackageManagerType } from '@npvm/shared';

export function Dashboard() {
  const { t } = useTranslation();
  const { data: managers = [], refetch: refetchManagers } = usePackageManagers();
  const { data: packages = [] } = useInstalledPackages();
  const { currentPm, setCurrentPm, isGlobal } = useAppStore();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [upgradingPm, setUpgradingPm] = useState<string | null>(null);

  const availableManagers = managers.filter((m) => m.available);
  const devPackages = packages.filter((p) => p.isDev);
  const prodPackages = packages.filter((p) => !p.isDev);

  const handleSwitchPm = async (type: PackageManagerType) => {
    if (type === currentPm) return;

    const prevPm = currentPm;
    setCurrentPm(type);

    try {
      await fetch('http://localhost:3456/api/pm/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      addToast({
        type: 'success',
        title: '包管理器已切换',
        message: `已切换到 ${type}`,
      });
    } catch {
      setCurrentPm(prevPm);
      addToast({
        type: 'error',
        title: '切换失败',
        message: '无法切换包管理器，请重试',
      });
    }
  };

  const handleUpgradePm = async (type: PackageManagerType) => {
    setUpgradingPm(type);

    try {
      const response = await fetch('http://localhost:3456/api/pm/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await refetchManagers();
        addToast({
          type: 'success',
          title: '升级成功',
          message: `${type} 已升级到最新版本`,
        });
      } else {
        throw new Error('升级失败');
      }
    } catch {
      addToast({
        type: 'error',
        title: '升级失败',
        message: `无法升级 ${type}，请手动执行升级命令`,
      });
    } finally {
      setUpgradingPm(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {t('dashboard.title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label={t('dashboard.totalPackages')}
          value={packages.length}
          color="primary"
          subtitle={isGlobal ? '全局' : '项目'}
        />
        <StatCard
          icon={Package}
          label={t('dashboard.dependencies')}
          value={prodPackages.length}
          color="green"
        />
        <StatCard
          icon={Package}
          label={t('dashboard.devDependencies')}
          value={devPackages.length}
          color="yellow"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dashboard.packageManagers')}
          value={availableManagers.length}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {t('dashboard.availablePm')}
          </h3>
          <div className="space-y-3">
            {managers.map((m) => (
              <div
                key={m.type}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  m.available
                    ? 'bg-gray-50 dark:bg-gray-700/50'
                    : 'bg-gray-50 dark:bg-gray-700/30 opacity-60'
                } ${currentPm === m.type ? 'ring-2 ring-primary-500' : ''}`}
              >
                <button
                  onClick={() => m.available && handleSwitchPm(m.type)}
                  disabled={!m.available}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      m.available ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {m.type}
                  </span>
                  {currentPm === m.type && (
                    <span className="flex items-center gap-1 text-xs text-primary-500">
                      <Check size={12} />
                      {t('common.active')}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {m.available ? `v${m.version}` : t('dashboard.notInstalled')}
                  </span>
                  {m.available && (
                    <button
                      onClick={() => handleUpgradePm(m.type)}
                      disabled={upgradingPm === m.type}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors disabled:opacity-50"
                      title={`升级 ${m.type}`}
                    >
                      {upgradingPm === m.type ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ArrowUp size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {t('dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton icon={Package} label={t('dashboard.installPackage')} href="/packages" />
            <ActionButton icon={GitBranch} label={t('dashboard.viewDeps')} href="/dependencies" />
            <ActionButton icon={Shield} label={t('dashboard.securityAudit')} href="/security" />
            <ActionButton icon={AlertTriangle} label={t('dashboard.checkUpdates')} href="/packages" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'primary' | 'green' | 'yellow' | 'blue';
  subtitle?: string;
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</span>
            {subtitle && (
              <span className="text-xs text-gray-400">({subtitle})</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
    >
      <Icon size={18} />
      <span className="text-sm">{label}</span>
    </a>
  );
}
