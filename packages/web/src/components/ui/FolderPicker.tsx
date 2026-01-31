import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FolderOpen, ChevronUp, Package, X, Check } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { Button, Spinner } from './index';
import { clsx } from 'clsx';

interface DirectoryEntry {
  name: string;
  path: string;
  isProject: boolean;
}

interface BrowseResult {
  current: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderPicker({ isOpen, onClose, onSelect, initialPath }: FolderPickerProps) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputPath, setInputPath] = useState(initialPath || '');

  const loadDirectory = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetchApi<BrowseResult>(`/fs/browse${query}`);
      if (res.data) {
        setCurrentPath(res.data.current);
        setInputPath(res.data.current);
        setDirectories(res.data.directories);
        setParent(res.data.parent);
      } else {
        setError(res.error || t('settings.folderLoadFailed'));
      }
    } catch {
      setError(t('settings.folderLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || undefined);
    }
  }, [isOpen, initialPath, loadDirectory]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (parent) {
      loadDirectory(parent);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      loadDirectory(inputPath.trim());
    }
  };

  const handleConfirm = () => {
    onSelect(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {t('settings.selectFolder')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 路径输入 */}
        <form onSubmit={handleInputSubmit} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="/path/to/folder"
            />
            <Button type="submit" size="sm" variant="outline">
              {t('settings.go')}
            </Button>
          </div>
        </form>

        {/* 当前路径和返回上级 */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-2">
          <button
            onClick={handleGoUp}
            disabled={!parent}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              parent
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            )}
          >
            <ChevronUp size={18} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate flex-1">
            {currentPath}
          </span>
        </div>

        {/* 目录列表 */}
        <div className="h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500 text-sm">
              {error}
            </div>
          ) : directories.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {t('settings.noSubfolders')}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => handleNavigate(dir.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  {dir.isProject ? (
                    <FolderOpen size={18} className="text-primary-500 shrink-0" />
                  ) : (
                    <Folder size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {dir.name}
                  </span>
                  {dir.isProject && (
                    <Package size={14} className="text-primary-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <span className="text-xs text-gray-500">
            {t('settings.folderHint')}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleConfirm} leftIcon={<Check size={14} />}>
              {t('settings.selectThis')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
