import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // 基础样式
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          // 尺寸
          size === 'sm' && 'px-3 py-1.5 text-sm gap-1.5',
          size === 'md' && 'px-4 py-2 text-sm gap-2',
          size === 'lg' && 'px-6 py-3 text-base gap-2',
          size === 'icon' && 'p-2',
          // 变体
          variant === 'primary' && [
            'bg-primary-500 text-white',
            'hover:bg-primary-600 active:bg-primary-700',
            'focus:ring-primary-500/50',
            'shadow-sm hover:shadow-md',
          ],
          variant === 'secondary' && [
            'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'focus:ring-gray-500/50',
          ],
          variant === 'outline' && [
            'border border-gray-300 dark:border-gray-600',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-50 dark:hover:bg-gray-800',
            'focus:ring-gray-500/50',
          ],
          variant === 'ghost' && [
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:ring-gray-500/50',
          ],
          variant === 'destructive' && [
            'bg-red-500 text-white',
            'hover:bg-red-600 active:bg-red-700',
            'focus:ring-red-500/50',
          ],
          // 禁用状态
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
