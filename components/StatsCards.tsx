import { formatMinutes } from '@/lib/utils';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

interface StatsCardsProps {
  today: number;
  week: number;
  month: number;
  loading?: boolean;
}

export function StatsCards({ today, week, month, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Today', value: today },
    { label: 'This Week', value: week },
    { label: 'This Month', value: month },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="text-center py-3 px-2">
          <p className="text-xs text-text-muted mb-1">{stat.label}</p>
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {formatMinutes(stat.value)}
          </p>
        </Card>
      ))}
    </div>
  );
}
