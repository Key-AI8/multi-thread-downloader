import { Cpu } from 'lucide-react';

const THREAD_OPTIONS = [16, 32, 64, 256, 512];

interface ThreadSelectorProps {
  value: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

export function ThreadSelector({
  value,
  onChange,
  disabled,
}: ThreadSelectorProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-slate-300">线程数</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {THREAD_OPTIONS.map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            disabled={disabled}
            className={`relative px-2 py-3 sm:px-4 sm:py-4 rounded-xl border transition-all duration-300
              ${
                value === count
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-lg sm:text-xl font-bold">{count}</div>
            <div className="text-[10px] sm:text-xs mt-0.5 opacity-70">
              线程
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
