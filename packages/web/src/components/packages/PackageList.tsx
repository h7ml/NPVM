import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Trash2, RefreshCw, Package as PackageIcon, Globe, Folder, ArrowUp, AlertTriangle } from 'lucide-react';
import {
  useInstalledPackages,
  useSearchPackages,
  useInstallPackage,
  useUninstallPackage,
  useUpdatePackage,
  useCheckUpdates,
} from '../../hooks/usePackages';
import { useAppStore } from '../../stores/app';
import { clsx } from 'clsx';

export function PackageList() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: packages = [], isLoading, refetch } = useInstalledPackages();
  const { data: searchResults = [] } = useSearchPackages(searchQuery);
  const installMutation = useInstallPackage();
  const uninstallMutation = useUninstallPackage();
  const updateMutation = useUpdatePackage();
  const { isGlobal, setIsGlobal } = useAppStore();

  // 检查包更新状态
  const packagesToCheck = useMemo(
    () => packages.map((p) => ({ name: p.name, version: p.version })),
    [packages]
  );
  const { data: updateInfo = [] } = useCheckUpdates(packagesToCheck);

  // 创建更新信息映射
  const updateMap = useMemo(() => {
    const map = new Map<string, { hasUpdate: boolean; latestVersion: string; deprecated?: string }>();
    updateInfo.forEach((info) => {
      map.set(info.name, {
        hasUpdate: info.hasUpdate,
        latestVersion: info.latestVersion,
        deprecated: info.deprecated,
      });
    });
    return map;
  }, [updateInfo]);

  const handleInstall = async (name: string, dev = false) => {
    await installMutation.mutateAsync({ packages: [name], dev });
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleUninstall = async (name: string) => {
    if (confirm(t('packages.confirmUninstall', { name }))) {
      await uninstallMutation.mutateAsync([name]);
    }
  };

  const handleUpdate = async (name: string) => {
    await updateMutation.mutateAsync([name]);
  };

  const toggleMode = async () => {
    const newIsGlobal = !isGlobal;
    setIsGlobal(newIsGlobal);
    await fetch('http://localhost:3456/api/global/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isGlobal: newIsGlobal }),
    });
  };

  // 统计可更新的包数量
  const updatableCount = updateInfo.filter((u) => u.hasUpdate).length;
  const updatablePackages = updateInfo.filter((u) => u.hasUpdate).map((u) => u.name);

  const handleUpdateAll = async () => {
    if (updatablePackages.length === 0) return;
    if (confirm(t('packages.confirmUpdateAll', { count: updatablePackages.length }))) {
      await updateMutation.mutateAsync(updatablePackages);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {isGlobal ? t('packages.globalTitle') : t('packages.title')} ({packages.length})
          </h2>
          <button
            onClick={toggleMode}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              isGlobal
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            )}
            title={isGlobal ? t('packages.switchToProject') : t('packages.switchToGlobal')}
          >
            {isGlobal ? <Globe size={14} /> : <Folder size={14} />}
            {isGlobal ? t('packages.globalMode') : t('packages.projectMode')}
          </button>
          {updatableCount > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
              title={t('packages.updateAll')}
            >
              <ArrowUp size={12} />
              {updatableCount} {t('common.update')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Plus size={18} />
            {t('packages.addPackage')}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('packages.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200"
              autoFocus
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((pkg) => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {pkg.name}
                      <span className="ml-2 text-sm text-gray-500">{pkg.version}</span>
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {pkg.description}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInstall(pkg.name)}
                      disabled={installMutation.isPending}
                      className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                    >
                      {t('common.install')}
                    </button>
                    <button
                      onClick={() => handleInstall(pkg.name, true)}
                      disabled={installMutation.isPending}
                      className="px-3 py-1 text-sm border border-primary-500 text-primary-500 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50"
                    >
                      {t('common.dev')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <PackageIcon size={48} className="mx-auto mb-4 opacity-30" />
            {t('packages.noPackages')}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('packages.name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('packages.version')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('packages.type')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('packages.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {packages.map((pkg) => {
                const updateStatus = updateMap.get(pkg.name);
                return (
                  <tr
                    key={pkg.name}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {pkg.name}
                        </span>
                        {updateStatus?.deprecated && (
                          <span
                            className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded"
                            title={updateStatus.deprecated}
                          >
                            <AlertTriangle size={10} />
                            废弃
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 dark:text-gray-400">{pkg.version}</span>
                      {updateStatus?.hasUpdate && (
                        <span className="ml-2 text-xs text-primary-500 flex items-center gap-1 inline-flex">
                          <ArrowUp size={10} />
                          {updateStatus.latestVersion}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-0.5 text-xs rounded-full',
                          pkg.isDev
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        )}
                      >
                        {pkg.isDev ? t('common.dev') : t('common.prod')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {updateStatus?.hasUpdate && (
                          <button
                            onClick={() => handleUpdate(pkg.name)}
                            disabled={updateMutation.isPending}
                            className="p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded disabled:opacity-50"
                            title={t('common.update')}
                          >
                            <ArrowUp size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleUninstall(pkg.name)}
                          disabled={uninstallMutation.isPending}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
