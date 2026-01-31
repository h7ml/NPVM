import { useTranslation } from 'react-i18next';
import { DependencyTree } from '../components/deps/DependencyTree';

export function Dependencies() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        {t('deps.title')}
      </h2>
      <DependencyTree />
    </div>
  );
}
