import { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'glass';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl',
          // 变体
          variant === 'default' && 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
          variant === 'bordered' && 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
          variant === 'glass' && 'glass-card',
          // 内边距
          padding === 'none' && 'p-0',
          padding === 'sm' && 'p-3',
          padding === 'md' && 'p-4 sm:p-6',
          padding === 'lg' && 'p-6 sm:p-8',
          // 悬浮效果
          hoverable && 'hover-lift cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)} {...props}>
      <div className="space-y-1">
        {title && (
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
