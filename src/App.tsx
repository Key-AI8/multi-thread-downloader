import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DownloadCloud,
  Download,
  X,
  AlertCircle,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react';
import { MultiThreadDownloader } from '@/lib/downloader';
import type { DownloadStatus, ThreadState, HistoryItem } from '@/lib/types';
import { ThreadSelector } from '@/components/ThreadSelector';
import { ProgressGrid } from '@/components/ProgressGrid';
import { StatsPanel } from '@/components/StatsPanel';
import { HistoryList } from '@/components/HistoryList';

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function App() {
  const [url, setUrl] = useState('');
  const [threadCount, setThreadCount] = useState(16);
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [threads, setThreads] = useState<ThreadState[]>([]);
  const [progress, setProgress] = useState({
    downloaded: 0,
    total: 0,
    speed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const downloaderRef = useRef<MultiThreadDownloader | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mt-downloader-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'mt-downloader-history',
        JSON.stringify(history)
      );
    } catch {
      // ignore
    }
  }, [history]);

  const startElapsedTimer = useCallback(() => {
    const startTime = Date.now();
    setElapsed(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 1000);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopElapsedTimer(), [stopElapsedTimer]);

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('请输入下载链接');
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError('请输入有效的 URL 链接');
      return;
    }

    setError(null);
    setThreads([]);
    setProgress({ downloaded: 0, total: 0, speed: 0 });

    const downloader = new MultiThreadDownloader(url.trim(), threadCount);
    downloaderRef.current = downloader;

    downloader.onThreadUpdate = setThreads;
    downloader.onStatusChange = (s) => {
      setStatus(s);
      if (s === 'downloading') startElapsedTimer();
      if (s === 'completed' || s === 'error' || s === 'cancelled')
        stopElapsedTimer();
    };
    downloader.onProgress = (downloaded, total, speed) => {
      setProgress({ downloaded, total, speed });
    };
    downloader.onError = (msg) => setError(msg);
    downloader.onComplete = (result) => {
      triggerDownload(result.blob, result.fileName);
      setHistory((prev) =>
        [
          {
            id: Date.now().toString(),
            fileName: result.fileName,
            fileSize: result.fileSize,
            duration: result.duration,
            threadCount,
            url: url.trim(),
            completedAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50)
      );
    };

    await downloader.start();
  };

  const handleCancel = () => {
    downloaderRef.current?.cancel();
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleRemoveHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const isBusy =
    status === 'preparing' ||
    status === 'downloading' ||
    status === 'combining';
  const overallProgress =
    progress.total > 0 ? (progress.downloaded / progress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <DownloadCloud className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">多线程下载器</h1>
          </div>
          <p className="text-sm text-slate-500">
            支持 16 / 32 / 64 / 256 / 512 线程并行下载，加速文件获取
          </p>
        </header>

        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4 sm:p-5">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              下载链接
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isBusy) handleDownload();
                }}
                placeholder="https://example.com/large-file.zip"
                disabled={isBusy}
                className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all disabled:opacity-50"
              />
              {isBusy ? (
                <button
                  onClick={handleCancel}
                  className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  开始下载
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4 sm:p-5">
            <ThreadSelector
              value={threadCount}
              onChange={setThreadCount}
              disabled={isBusy}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-red-300 font-medium">
                  下载出错
                </div>
                <div className="text-xs text-red-400/70 mt-1">{error}</div>
              </div>
            </div>
          )}

          {status !== 'idle' && (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                {(status === 'preparing' ||
                  status === 'downloading' ||
                  status === 'combining') && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
                {status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
                {status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                {status === 'cancelled' && (
                  <X className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-300">
                  {status === 'preparing' && '正在获取文件信息...'}
                  {status === 'downloading' && '正在下载...'}
                  {status === 'combining' && '正在合并文件...'}
                  {status === 'completed' && '下载完成'}
                  {status === 'error' && '下载失败'}
                  {status === 'cancelled' && '已取消下载'}
                </span>
              </div>

              {progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>总进度</span>
                    <span className="font-mono">
                      {overallProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${overallProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>
              )}

              <StatsPanel
                downloaded={progress.downloaded}
                total={progress.total}
                speed={progress.speed}
                elapsed={elapsed}
              />

              {threads.length > 0 && (
                <ProgressGrid threads={threads} threadCount={threadCount} />
              )}
            </div>
          )}

          {status === 'idle' && !error && (
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 leading-relaxed">
                支持并行下载和自动重试。浏览器对同一域名的并发连接数有限制（通常为
                6
                个），超出部分将自动排队。服务器需支持 HTTP Range
                请求和 CORS 跨域才能使用多线程下载。
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4 sm:p-5">
            <HistoryList
              items={history}
              onClear={handleClearHistory}
              onRemove={handleRemoveHistoryItem}
            />
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-600">
          多线程下载器 · 基于 HTTP Range 请求实现并行下载
        </footer>
      </div>
    </div>
  );
}
