import { formatMinutes } from '@/lib/utils';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { Clock, TrendingUp, Calendar } from 'lucide-react';

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
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Today', value: today, icon: Clock, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'This Week', value: week, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: 'This Month', value: month, icon: Calendar, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="text-center py-4 px-2">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${stat.bg} mb-2`}>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
              {formatMinutes(stat.value)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{stat.label}</p>
          </Card>
        );
      })}
    </div>
  );
}
