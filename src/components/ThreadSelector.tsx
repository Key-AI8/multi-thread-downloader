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
      <div className="flex items-center gap-2 mb-2.5">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-slate-300">线程数</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {THREAD_OPTIONS.map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            disabled={disabled}
            className={`relative py-2.5 rounded-xl border text-center transition-all duration-300
              ${
                value === count
                  ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_16px_-4px_rgba(6,182,212,0.4)]'
                  : 'border-slate-700/80 bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:bg-slate-800/40'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-base sm:text-lg font-bold leading-tight">
              {count}
            </div>
            <div className="text-[10px] mt-0.5 opacity-60">线程</div>
          </button>
        ))}
      </div>
    </div>
  );
}
