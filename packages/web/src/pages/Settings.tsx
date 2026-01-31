import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app';
import { REGISTRIES } from '@npvm/shared';
import { fetchApi } from '../lib/api';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { projectPath, setProjectPath, currentRegistry, setCurrentRegistry } = useAppStore();
  const [localPath, setLocalPath] = useState(projectPath);
  const [registryStatuses, setRegistryStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchApi<{ name: string; url: string; connected: boolean }[]>('/registry/list').then(
      (res) => {
        if (res.data) {
          const statuses: Record<string, boolean> = {};
          res.data.forEach((r) => {
            statuses[r.url] = r.connected;
          });
          setRegistryStatuses(statuses);
        }
      }
    );
  }, []);

  const handleSavePath = async () => {
    setProjectPath(localPath);
    await fetchApi('/project/path', {
      method: 'PUT',
      body: JSON.stringify({ path: localPath }),
    });
  };

  const handleSetRegistry = async (url: string) => {
    setCurrentRegistry(url);
    await fetchApi('/registry/current', {
      method: 'PUT',
      body: JSON.stringify({ url }),
    });
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {t('settings.title')}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.language')}
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => changeLanguage('en')}
            className={`px-4 py-2 rounded-lg border ${
              i18n.language === 'en'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('zh')}
            className={`px-4 py-2 rounded-lg border ${
              i18n.language === 'zh'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            中文
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.projectPath')}
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200"
            placeholder="/path/to/project"
          />
          <button
            onClick={handleSavePath}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            {t('common.save')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.registry')}
        </h3>
        <div className="space-y-3">
          {REGISTRIES.map((reg) => (
            <div
              key={reg.url}
              onClick={() => handleSetRegistry(reg.url)}
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                currentRegistry === reg.url
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {reg.name}
                </div>
                <div className="text-sm text-gray-500">{reg.url}</div>
                <div className="text-xs text-gray-400 mt-1">{reg.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    registryStatuses[reg.url] ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {currentRegistry === reg.url && (
                  <span className="text-sm text-primary-500">{t('common.active')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
