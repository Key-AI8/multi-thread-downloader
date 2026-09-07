import type { ThreadState } from '@/lib/types';

interface ProgressGridProps {
  threads: ThreadState[];
  threadCount: number;
}

export function ProgressGrid({ threads, threadCount }: ProgressGridProps) {
  if (threads.length === 0) return null;

  const isCompact = threadCount >= 64;
  const completedCount = threads.filter(
    (t) => t.status === 'completed'
  ).length;
  const activeCount = threads.filter(
    (t) => t.status === 'downloading' || t.status === 'retrying'
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">线程详情</span>
        <div className="flex gap-3 text-xs">
          <span className="text-cyan-400">{activeCount} 活跃</span>
          <span className="text-emerald-400">{completedCount} 完成</span>
          <span className="text-slate-500">{threads.length} 总计</span>
        </div>
      </div>
      <div
        className="grid"
        style={{
          gap: isCompact ? '4px' : '6px',
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            isCompact ? '14px' : '72px'
          }, 1fr))`,
        }}
      >
        {threads.map((thread) => {
          const total = thread.end - thread.start + 1;
          const progress = total > 0 ? (thread.downloaded / total) * 100 : 0;
          const colorClass =
            thread.status === 'completed'
              ? 'bg-emerald-500'
              : thread.status === 'error'
                ? 'bg-red-500'
                : thread.status === 'retrying'
                  ? 'bg-amber-500'
                  : thread.status === 'downloading'
                    ? 'bg-cyan-500'
                    : 'bg-slate-700';

          if (isCompact) {
            return (
              <div
                key={thread.id}
                className="relative rounded-sm h-3 bg-slate-800 overflow-hidden"
                title={`线程 #${thread.id + 1}: ${progress.toFixed(0)}% - ${thread.status}`}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 ${colorClass} transition-all duration-300`}
                  style={{ height: `${Math.max(progress, thread.status === 'completed' ? 100 : 0)}%` }}
                />
              </div>
            );
          }

          return (
            <div
              key={thread.id}
              className="relative rounded-lg h-7 bg-slate-800 overflow-hidden"
              title={`线程 #${thread.id + 1}: ${progress.toFixed(1)}% - ${thread.status}`}
            >
              <div
                className={`absolute top-0 bottom-0 left-0 ${colorClass} transition-all duration-300`}
                style={{ width: `${Math.max(progress, thread.status === 'completed' ? 100 : 0)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 font-mono pointer-events-none">
                #{thread.id + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
