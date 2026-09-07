import { HardDrive, Gauge, Clock, Timer } from 'lucide-react';
import { formatBytes, formatSpeed, formatTime } from '@/lib/format';

interface StatsPanelProps {
  downloaded: number;
  total: number;
  speed: number;
  elapsed: number;
}

export function StatsPanel({
  downloaded,
  total,
  speed,
  elapsed,
}: StatsPanelProps) {
  const eta = speed > 0 && total > 0 ? (total - downloaded) / speed : Infinity;

  const stats = [
    {
      icon: HardDrive,
      label: '已下载',
      value: `${formatBytes(downloaded)} / ${total > 0 ? formatBytes(total) : '?'}`,
    },
    {
      icon: Gauge,
      label: '速度',
      value: formatSpeed(speed),
    },
    {
      icon: Clock,
      label: '剩余时间',
      value: formatTime(eta),
    },
    {
      icon: Timer,
      label: '已用时间',
      value: formatTime(elapsed),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-slate-950/50 rounded-lg p-3 border border-slate-800"
        >
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <stat.icon className="w-3 h-3" />
            {stat.label}
          </div>
          <div className="text-sm sm:text-base font-mono font-semibold text-slate-200">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
