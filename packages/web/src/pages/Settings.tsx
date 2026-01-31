import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/app';
import { REGISTRIES } from '@dext7r/npvm-shared';
import { fetchApi, getApiBase, setApiBase } from '../lib/api';
import { Check, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { clsx } from 'clsx';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { projectPath, setProjectPath, currentRegistry, setCurrentRegistry } = useAppStore();
  const [localPath, setLocalPath] = useState(projectPath);
  const [registryStatuses, setRegistryStatuses] = useState<Record<string, boolean>>({});
  const [apiBaseUrl, setApiBaseUrl] = useState(getApiBase());
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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

  const handleTestApiBase = async () => {
    setApiStatus('testing');
    try {
      const testUrl = apiBaseUrl.replace(/\/$/, '') + '/pm/detect';
      const response = await fetch(testUrl, { method: 'GET' });
      if (response.ok) {
        setApiStatus('success');
        setApiBase(apiBaseUrl);
        setTimeout(() => window.location.reload(), 500);
      } else {
        setApiStatus('error');
      }
    } catch {
      setApiStatus('error');
    }
  };

  const handleResetApiBase = () => {
    setApiBase('');
    setApiBaseUrl('/api');
    setApiStatus('idle');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {t('settings.title')}
      </h1>

      <Card>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {t('settings.apiBase')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{t('settings.apiBaseHint')}</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => { setApiBaseUrl(e.target.value); setApiStatus('idle'); }}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="https://npvm.zeabur.app/api"
          />
          <Button
            onClick={handleTestApiBase}
            loading={apiStatus === 'testing'}
            leftIcon={apiStatus === 'success' ? <Check size={16} /> : apiStatus === 'error' ? <AlertCircle size={16} /> : undefined}
          >
            {t('settings.testConnection')}
          </Button>
          {apiBaseUrl !== '/api' && (
            <Button variant="outline" onClick={handleResetApiBase}>
              {t('settings.reset')}
            </Button>
          )}
        </div>
        {apiStatus === 'error' && (
          <p className="mt-2 text-sm text-red-500">{t('settings.connectionFailed')}</p>
        )}
        {apiStatus === 'success' && (
          <p className="mt-2 text-sm text-green-500">{t('settings.connectionSuccess')}</p>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.language')}
        </h3>
        <div className="flex gap-3">
          <Button
            variant={i18n.language === 'en' ? 'primary' : 'outline'}
            onClick={() => changeLanguage('en')}
          >
            English
          </Button>
          <Button
            variant={i18n.language === 'zh' ? 'primary' : 'outline'}
            onClick={() => changeLanguage('zh')}
          >
            中文
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.projectPath')}
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="/path/to/project"
          />
          <Button onClick={handleSavePath}>
            {t('common.save')}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('settings.registry')}
        </h3>
        <div className="space-y-3">
          {REGISTRIES.map((reg) => (
            <div
              key={reg.url}
              onClick={() => handleSetRegistry(reg.url)}
              className={clsx(
                'flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200',
                currentRegistry === reg.url
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {reg.name}
                </div>
                <div className="text-sm text-gray-500 font-mono">{reg.url}</div>
                <div className="text-xs text-gray-400 mt-1">{reg.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    registryStatuses[reg.url] ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                {currentRegistry === reg.url && (
                  <Badge variant="success">
                    <Check size={10} className="mr-1" />
                    {t('common.active')}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
