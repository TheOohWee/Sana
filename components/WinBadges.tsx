import { Trophy } from 'lucide-react';
import { Card } from './ui/Card';

interface WinBadgesProps {
  dailyWins: number;
  weeklyWins: number;
  monthlyWins: number;
}

export function WinBadges({ dailyWins, weeklyWins, monthlyWins }: WinBadgesProps) {
  const wins = [
    { label: 'Daily Wins', count: dailyWins },
    { label: 'Weekly Wins', count: weeklyWins },
    { label: 'Monthly Wins', count: monthlyWins },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {wins.map((w) => (
        <Card key={w.label} className="flex items-center gap-2.5 py-3 px-3">
          <Trophy className="h-4 w-4 text-crown shrink-0" />
          <div>
            <p className="text-lg font-semibold font-mono tabular-nums text-crown">
              {w.count}
            </p>
            <p className="text-xs text-text-muted">{w.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
