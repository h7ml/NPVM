import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, AlertCircle, Info, Play } from 'lucide-react';
import { useSecurityAudit } from '../../hooks/usePackages';
import type { AuditResult } from '@npvm/shared';
import { clsx } from 'clsx';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  moderate: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

export function SecurityAudit() {
  const { t } = useTranslation();
  const [result, setResult] = useState<AuditResult | null>(null);
  const auditMutation = useSecurityAudit();

  const handleAudit = async () => {
    const data = await auditMutation.mutateAsync();
    setResult(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {t('security.title')}
        </h2>
        <button
          onClick={handleAudit}
          disabled={auditMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {auditMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('security.scanning')}
            </>
          ) : (
            <>
              <Play size={18} />
              {t('security.runAudit')}
            </>
          )}
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {(['critical', 'high', 'moderate', 'low'] as const).map((severity) => {
              const config = severityConfig[severity];
              const count = result.summary[severity];
              return (
                <div
                  key={severity}
                  className={clsx(
                    'p-4 rounded-lg border',
                    count > 0
                      ? config.bg + ' border-transparent'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className={clsx('text-2xl font-bold', count > 0 ? config.color : 'text-gray-400')}>
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t(`security.${severity}`)}
                  </div>
                </div>
              );
            })}
          </div>

          {result.vulnerabilities.length > 0 ? (
            <div className="space-y-3">
              {result.vulnerabilities.map((vuln) => {
                const config = severityConfig[vuln.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={vuln.id}
                    className={clsx(
                      'p-4 rounded-lg border-l-4',
                      config.bg,
                      `border-l-${vuln.severity === 'critical' ? 'red' : vuln.severity === 'high' ? 'orange' : vuln.severity === 'moderate' ? 'yellow' : 'blue'}-500`
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={20} className={config.color} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {vuln.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Package: <span className="font-mono">{vuln.package}</span> ({vuln.version})
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {vuln.recommendation}
                        </div>
                        {vuln.url && (
                          <a
                            href={vuln.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-500 hover:underline mt-1 inline-block"
                          >
                            {t('security.moreInfo')} →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8 text-center">
              <Shield size={48} className="mx-auto text-green-500 mb-4" />
              <div className="text-lg font-medium text-green-700 dark:text-green-400">
                {t('security.noVulnerabilities')}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500 mt-1">
                {t('security.depsSecure')}
              </div>
            </div>
          )}
        </>
      )}

      {!result && !auditMutation.isPending && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <Shield size={48} className="mx-auto text-gray-400 mb-4" />
          <div className="text-gray-600 dark:text-gray-400">
            {t('security.clickToScan')}
          </div>
        </div>
      )}
    </div>
  );
}
