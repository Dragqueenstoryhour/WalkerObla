import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'primary' | 'accent' | 'success' | 'error';
}

const ProgressIndicator = ({
  value,
  max = 100,
  className,
  barClassName,
  showPercentage = false,
  size = 'md',
  colorScheme = 'primary',
}: ProgressIndicatorProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const heightClass = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];
  
  const colorClass = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-success',
    error: 'bg-red-500',
  }[colorScheme];
  
  return (
    <div className={cn('relative w-full', className)}>
      <div className={cn('w-full bg-secondary rounded-full overflow-hidden', heightClass)}>
        <div
          className={cn('h-full transition-all duration-300 ease-in-out', colorClass, barClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-right mt-1">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
