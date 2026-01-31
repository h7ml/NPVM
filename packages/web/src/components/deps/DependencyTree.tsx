import { useTranslation } from 'react-i18next';
import { useDependencyTree } from '../../hooks/usePackages';
import type { DependencyNode } from '@npvm/shared';
import { ChevronRight, ChevronDown, Package } from 'lucide-react';
import { useState } from 'react';

function TreeNode({ node, level = 0, t }: { node: DependencyNode; level?: number; t: (key: string) => string }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )
        ) : (
          <span className="w-4" />
        )}
        <Package size={14} className="text-primary-500" />
        <span className="font-medium text-gray-800 dark:text-gray-200">{node.name}</span>
        <span className="text-sm text-gray-500">@{node.version}</span>
        {node.isCircular && (
          <span className="text-xs text-red-500 ml-2">[{t('deps.circular')}]</span>
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
      <div className="p-8 text-center text-gray-500">{t('deps.loading')}</div>
    );
  }

  if (!tree || tree.children.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">{t('deps.noDeps')}</div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-[600px] overflow-y-auto scrollbar-thin">
      <TreeNode node={tree} t={t} />
    </div>
  );
}
