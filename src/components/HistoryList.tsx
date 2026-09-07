import type { HistoryItem } from '@/lib/types';
import { formatBytes, formatTime, formatDateTime } from '@/lib/format';
import { CheckCircle, Trash2 } from 'lucide-react';

interface HistoryListProps {
  items: HistoryItem[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export function HistoryList({ items, onClear, onRemove }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-slate-600 py-4">
        暂无下载历史
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">下载历史</span>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          清空历史
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-slate-950/50 rounded-lg p-3 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 truncate">
                {item.fileName}
              </div>
              <div className="text-xs text-slate-500 flex gap-3 flex-wrap mt-0.5">
                <span>{formatBytes(item.fileSize)}</span>
                <span>{item.threadCount} 线程</span>
                <span>{formatTime(item.duration)}</span>
                <span>{formatDateTime(item.completedAt)}</span>
              </div>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
