import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Trash2, RefreshCw, Package as PackageIcon, Globe, Folder, ArrowUp, AlertTriangle, Terminal } from 'lucide-react';
import {
  useInstalledPackages,
  useSearchPackages,
  useInstallPackage,
  useUninstallPackage,
  useUpdatePackage,
  useCheckUpdates,
} from '../../hooks/usePackages';
import { useAppStore } from '../../stores/app';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Card, Button, Badge, EmptyState } from '../ui';
import { clsx } from 'clsx';

export function PackageList() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [installAsDev, setInstallAsDev] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'uninstall' | 'updateAll';
    packageName?: string;
  }>({ open: false, type: 'uninstall' });
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

  const handleBatchInstall = async () => {
    const packages = manualInput.trim().split(/\s+/).filter(Boolean);
    if (packages.length === 0) return;
    await installMutation.mutateAsync({ packages, dev: installAsDev });
    setManualInput('');
    setShowSearch(false);
  };

  const handleUninstall = async (name: string) => {
    setConfirmDialog({ open: true, type: 'uninstall', packageName: name });
  };

  const confirmUninstall = async () => {
    if (confirmDialog.packageName) {
      await uninstallMutation.mutateAsync([confirmDialog.packageName]);
    }
    setConfirmDialog({ open: false, type: 'uninstall' });
  };

  const handleUpdate = async (name: string) => {
    await updateMutation.mutateAsync([name]);
  };

  const toggleMode = async () => {
    const newIsGlobal = !isGlobal;
    setIsGlobal(newIsGlobal);
    await fetch('/api/global/status', {
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
    setConfirmDialog({ open: true, type: 'updateAll' });
  };

  const confirmUpdateAll = async () => {
    await updateMutation.mutateAsync(updatablePackages);
    setConfirmDialog({ open: false, type: 'updateAll' });
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
          >
            <RefreshCw size={18} />
          </Button>
          <Button
            onClick={() => setShowSearch(!showSearch)}
            leftIcon={<Plus size={18} />}
          >
            {t('packages.addPackage')}
          </Button>
        </div>
      </div>

      {showSearch && (
        <Card className="space-y-4">
          {/* 手动输入安装 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('packages.quickInstall')}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBatchInstall()}
                placeholder={t('packages.quickInstallPlaceholder')}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm"
              />
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={installAsDev}
                  onChange={(e) => setInstallAsDev(e.target.checked)}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('common.dev')}</span>
              </label>
              <Button
                onClick={handleBatchInstall}
                disabled={!manualInput.trim()}
                loading={installMutation.isPending}
              >
                {t('common.install')}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">{t('packages.quickInstallHint')}</p>
          </div>

          {/* npm 搜索 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
                      <Button
                        size="sm"
                        onClick={() => handleInstall(pkg.name)}
                        loading={installMutation.isPending}
                      >
                        {t('common.install')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstall(pkg.name, true)}
                        disabled={installMutation.isPending}
                      >
                        {t('common.dev')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : packages.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title={t('packages.noPackages')}
            className="py-8"
          />
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
                      <Badge
                        variant={pkg.isDev ? 'warning' : 'success'}
                        size="sm"
                      >
                        {pkg.isDev ? t('common.dev') : t('common.prod')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {updateStatus?.hasUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdate(pkg.name)}
                            loading={updateMutation.isPending}
                            title={t('common.update')}
                          >
                            <ArrowUp size={16} className="text-primary-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUninstall(pkg.name)}
                          disabled={uninstallMutation.isPending}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'uninstall'}
        title={t('packages.confirmUninstall', { name: confirmDialog.packageName })}
        variant="destructive"
        confirmText={t('common.uninstall')}
        cancelText={t('common.cancel')}
        onConfirm={confirmUninstall}
        onCancel={() => setConfirmDialog({ open: false, type: 'uninstall' })}
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'updateAll'}
        title={t('packages.confirmUpdateAll', { count: updatablePackages.length })}
        confirmText={t('common.update')}
        cancelText={t('common.cancel')}
        onConfirm={confirmUpdateAll}
        onCancel={() => setConfirmDialog({ open: false, type: 'updateAll' })}
      />
    </div>
  );
}
