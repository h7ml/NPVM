import { useTranslation } from 'react-i18next';
import { useDependencyTree } from '../../hooks/usePackages';
import type { DependencyNode } from '@dext7r/npvm-shared';
import { ChevronRight, Package, GitBranch } from 'lucide-react';
import { useState } from 'react';
import { Card, EmptyState, Spinner, Badge } from '../ui';

function TreeNode({ node, level = 0, t }: { node: DependencyNode; level?: number; t: (key: string) => string }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          <span className="text-gray-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <ChevronRight size={16} />
          </span>
        ) : (
          <span className="w-4" />
        )}
        <Package size={14} className="text-primary-500" />
        <span className="font-medium text-gray-800 dark:text-gray-200">{node.name}</span>
        <span className="text-sm text-gray-500 font-mono">@{node.version}</span>
        {node.isCircular && (
          <Badge variant="error" size="sm">{t('deps.circular')}</Badge>
        )}
        {hasChildren && (
          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            ({node.children.length})
          </span>
        )}
      </div>
      {isExpanded &&
        hasChildren &&
        node.children.map((child, i) => (
          <TreeNode key={`${child.name}-${i}`} node={child} level={level + 1} t={t} />
        ))}
    </div>
  );
}

export function DependencyTree() {
  const { t } = useTranslation();
  const { data: tree, isLoading } = useDependencyTree();

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Spinner size="lg" className="text-primary-500" />
        <span className="ml-3 text-gray-500">{t('deps.loading')}</span>
      </Card>
    );
  }

  if (!tree || tree.children.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GitBranch}
          title={t('deps.noDeps')}
        />
      </Card>
    );
  }

  return (
    <Card padding="sm" className="max-h-[600px] overflow-y-auto scrollbar-thin">
      <TreeNode node={tree} t={t} />
    </Card>
  );
}
