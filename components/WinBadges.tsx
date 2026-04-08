import { Trophy, Star, Award } from 'lucide-react';
import { Card } from './ui/Card';

interface WinBadgesProps {
  dailyWins: number;
  weeklyWins: number;
  monthlyWins: number;
}

export function WinBadges({ dailyWins, weeklyWins, monthlyWins }: WinBadgesProps) {
  const wins = [
    { label: 'Daily Wins', count: dailyWins, icon: Trophy, color: 'text-crown', bg: 'bg-crown/10' },
    { label: 'Weekly Wins', count: weeklyWins, icon: Star, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Monthly Wins', count: monthlyWins, icon: Award, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {wins.map((w) => {
        const Icon = w.icon;
        return (
          <Card key={w.label} className="flex items-center gap-3 py-3 px-3">
            <div className={`w-9 h-9 rounded-xl ${w.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-4 w-4 ${w.color}`} />
            </div>
            <div>
              <p className={`text-lg font-semibold font-mono tabular-nums ${w.color}`}>
                {w.count}
              </p>
              <p className="text-[10px] text-text-muted">{w.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
