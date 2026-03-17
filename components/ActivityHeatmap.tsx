'use client';

import { useMemo, useState } from 'react';
import { format, getDay, startOfWeek, addDays } from 'date-fns';
import { HEATMAP_COLORS } from '@/lib/constants';
import { getLast365Days, cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  data: Record<string, number>;
  loading?: boolean;
}

function getColorIndex(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

export function ActivityHeatmap({ data, loading }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; minutes: number; x: number; y: number } | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const days = getLast365Days();
    const weeksArr: { date: Date; dateStr: string; minutes: number }[][] = [];
    let currentWeek: { date: Date; dateStr: string; minutes: number }[] = [];

    const firstDay = days[0];
    const firstDayOfWeek = getDay(firstDay);
    const mondayAdjusted = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    for (let i = 0; i < mondayAdjusted; i++) {
      currentWeek.push({ date: new Date(0), dateStr: '', minutes: -1 });
    }

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      currentWeek.push({ date: day, dateStr, minutes: data[dateStr] || 0 });

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), dateStr: '', minutes: -1 });
      }
      weeksArr.push(currentWeek);
    }

    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, weekIdx) => {
      const validDay = week.find((d) => d.minutes >= 0);
      if (validDay) {
        const month = validDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ text: format(validDay.date, 'MMM'), col: weekIdx });
          lastMonth = month;
        }
      }
    });

    return { weeks: weeksArr, monthLabels: labels };
  }, [data]);

  if (loading) {
    return <div className="h-32 rounded-xl bg-bg-tertiary animate-pulse" />;
  }

  const cellSize = 12;
  const cellGap = 3;
  const labelWidth = 28;
  const headerHeight = 18;
  const totalWidth = labelWidth + weeks.length * (cellSize + cellGap);
  const totalHeight = headerHeight + 7 * (cellSize + cellGap);

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="overflow-visible"
      >
        {/* Month labels */}
        {monthLabels.map((label) => (
          <text
            key={`${label.text}-${label.col}`}
            x={labelWidth + label.col * (cellSize + cellGap)}
            y={12}
            className="fill-text-muted"
            fontSize="9"
            fontFamily="inherit"
          >
            {label.text}
          </text>
        ))}

        {/* Day labels */}
        {dayLabels.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={headerHeight + i * (cellSize + cellGap) + cellSize - 2}
              className="fill-text-muted"
              fontSize="8"
              fontFamily="inherit"
            >
              {label}
            </text>
          ) : null
        )}

        {/* Cells */}
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            if (day.minutes < 0) return null;
            const colorIdx = getColorIndex(day.minutes);
            return (
              <rect
                key={`${weekIdx}-${dayIdx}`}
                x={labelWidth + weekIdx * (cellSize + cellGap)}
                y={headerHeight + dayIdx * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={HEATMAP_COLORS[colorIdx]}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    date: format(day.date, 'MMM d, yyyy'),
                    minutes: day.minutes,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-text-muted">
        <span>Less</span>
        {HEATMAP_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-xs pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="text-text-primary font-medium">{tooltip.date}</p>
          <p className="text-text-secondary">
            {tooltip.minutes === 0 ? 'No activity' : `${tooltip.minutes} min`}
          </p>
        </div>
      )}
    </div>
  );
}
