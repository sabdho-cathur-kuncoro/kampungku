import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  progress?: number;
  className?: string;
}

export function StatCard({ label, sublabel, value, trend, trendUp, progress, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-stone-200 p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-body text-xs text-stone-500">{label}</p>
          {sublabel && <p className="font-body text-xs text-stone-400 mt-0.5">{sublabel}</p>}
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trendUp ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50',
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-extrabold text-stone-900">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
