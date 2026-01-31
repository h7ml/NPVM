import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, AlertCircle, Info, Play } from 'lucide-react';
import { useSecurityAudit } from '../../hooks/usePackages';
import { Card, Button, EmptyState } from '../ui';
import type { AuditResult } from '@dext7r/npvm-shared';
import { clsx } from 'clsx';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-l-red-500' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-l-orange-500' },
  moderate: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-l-yellow-500' },
  low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-l-blue-500' },
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
        <Button
          onClick={handleAudit}
          loading={auditMutation.isPending}
          leftIcon={<Play size={18} />}
        >
          {auditMutation.isPending ? t('security.scanning') : t('security.runAudit')}
        </Button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['critical', 'high', 'moderate', 'low'] as const).map((severity) => {
              const config = severityConfig[severity];
              const count = result.summary[severity];
              return (
                <Card
                  key={severity}
                  className={clsx(
                    'text-center transition-all',
                    count > 0 ? config.bg : ''
                  )}
                >
                  <div className={clsx('text-3xl font-bold', count > 0 ? config.color : 'text-gray-400')}>
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t(`security.${severity}`)}
                  </div>
                </Card>
              );
            })}
          </div>

          {result.vulnerabilities.length > 0 ? (
            <div className="space-y-3">
              {result.vulnerabilities.map((vuln) => {
                const config = severityConfig[vuln.severity];
                const Icon = config.icon;
                return (
                  <Card
                    key={vuln.id}
                    padding="sm"
                    className={clsx('border-l-4', config.bg, config.border)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={20} className={config.color} />
                      <div className="flex-1 min-w-0">
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
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-green-50 dark:bg-green-900/20">
              <EmptyState
                icon={Shield}
                title={t('security.noVulnerabilities')}
                description={t('security.depsSecure')}
                className="py-4"
              />
            </Card>
          )}
        </>
      )}

      {!result && !auditMutation.isPending && (
        <Card>
          <EmptyState
            icon={Shield}
            title={t('security.clickToScan')}
          />
        </Card>
      )}
    </div>
  );
}
