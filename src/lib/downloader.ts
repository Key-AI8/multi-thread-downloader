import type { DownloadStatus, ThreadState, DownloadResult } from './types';

export class MultiThreadDownloader {
  private url: string;
  private requestedThreadCount: number;
  private actualThreadCount = 1;
  private threads: ThreadState[] = [];
  private abortController: AbortController | null = null;
  private chunks: Map<number, Uint8Array[]> = new Map();
  private fileSize = 0;
  private fileName = '';
  private supportsRange = false;
  private startTime = 0;
  private speedInterval: ReturnType<typeof setInterval> | null = null;
  private currentSpeed = 0;
  private lastBytesDownloaded = 0;
  private lastSpeedCheck = 0;
  private updateScheduled = false;

  onThreadUpdate: (threads: ThreadState[]) => void = () => {};
  onStatusChange: (status: DownloadStatus) => void = () => {};
  onProgress: (downloaded: number, total: number, speed: number) => void = () => {};
  onComplete: (result: DownloadResult) => void = () => {};
  onError: (message: string) => void = () => {};

  constructor(url: string, threadCount: number) {
    this.url = url;
    this.requestedThreadCount = threadCount;
  }

  async start(): Promise<void> {
    this.abortController = new AbortController();
    this.onStatusChange('preparing');

    try {
      await this.probeFile();

      if (this.supportsRange && this.fileSize > 0) {
        const minChunkSize = 1024 * 1024;
        this.actualThreadCount = Math.min(
          this.requestedThreadCount,
          Math.max(1, Math.floor(this.fileSize / minChunkSize))
        );
      } else {
        this.actualThreadCount = 1;
      }

      this.setupThreads();
      this.onStatusChange('downloading');
      this.startTime = Date.now();
      this.startSpeedMonitor();

      if (this.actualThreadCount > 1) {
        await this.downloadParallel();
      } else {
        await this.downloadSingle();
      }

      this.stopSpeedMonitor();
      this.onStatusChange('combining');
      const blob = this.combineChunks();
      const duration = (Date.now() - this.startTime) / 1000;
      this.onStatusChange('completed');
      this.onComplete({
        blob,
        fileName: this.fileName,
        fileSize: this.fileSize,
        duration,
      });
    } catch (e) {
      this.stopSpeedMonitor();
      if (this.abortController?.signal.aborted) {
        this.onStatusChange('cancelled');
      } else {
        this.onStatusChange('error');
        this.onError(e instanceof Error ? e.message : '下载失败');
      }
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  private async probeFile(): Promise<void> {
    let response: Response;
    try {
      response = await fetch(this.url, {
        headers: { Range: 'bytes=0-0' },
        signal: this.abortController!.signal,
      });
    } catch (e) {
      if (this.abortController?.signal.aborted) throw e;
      throw new Error('无法连接到服务器，可能受到 CORS 跨域限制');
    }

    if (response.status === 206) {
      this.supportsRange = true;
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) this.fileSize = parseInt(match[1]);
      }
    } else if (response.ok) {
      this.supportsRange = false;
      this.fileSize = parseInt(response.headers.get('content-length') || '0');
    } else {
      throw new Error(`服务器返回错误状态码: ${response.status}`);
    }

    this.fileName = this.extractFileName(response);
    await response.body?.cancel();
  }

  private extractFileName(response: Response): string {
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(
        /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i
      );
      if (match) {
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return match[1];
        }
      }
    }
    try {
      const urlObj = new URL(this.url);
      const name = urlObj.pathname.split('/').pop();
      if (name && name.trim()) {
        try {
          return decodeURIComponent(name);
        } catch {
          return name;
        }
      }
    } catch {
      // ignore
    }
    return 'download.bin';
  }

  private setupThreads(): void {
    this.threads = [];
    const count = this.actualThreadCount;
    const chunkSize = Math.floor(this.fileSize / count);
    const remainder = this.fileSize % count;

    let offset = 0;
    for (let i = 0; i < count; i++) {
      const size = chunkSize + (i < remainder ? 1 : 0);
      this.threads.push({
        id: i,
        start: offset,
        end: offset + size - 1,
        downloaded: 0,
        status: 'pending',
        speed: 0,
        retries: 0,
      });
      this.chunks.set(i, []);
      offset += size;
    }
  }

  private async downloadParallel(): Promise<void> {
    const promises = this.threads.map((thread) => this.downloadThread(thread));
    await Promise.all(promises);
  }

  private async downloadThread(thread: ThreadState): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (this.abortController?.signal.aborted) return;
      try {
        thread.status = attempt > 0 ? 'retrying' : 'downloading';
        thread.retries = attempt;
        this.requestUpdate();

        const startByte = thread.start + thread.downloaded;
        const response = await fetch(this.url, {
          headers: { Range: `bytes=${startByte}-${thread.end}` },
          signal: this.abortController!.signal,
        });

        if (response.status !== 206) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            this.chunks.get(thread.id)!.push(value);
            thread.downloaded += value.length;
            this.requestUpdate();
          }
        }

        thread.status = 'completed';
        this.requestUpdate();
        return;
      } catch (e) {
        if (this.abortController?.signal.aborted) return;
        if (attempt === maxRetries) {
          thread.status = 'error';
          this.requestUpdate();
          throw e;
        }
      }
    }
  }

  private async downloadSingle(): Promise<void> {
    const thread = this.threads[0];
    thread.status = 'downloading';
    this.requestUpdate();

    const response = await fetch(this.url, {
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        this.chunks.get(0)!.push(value);
        thread.downloaded += value.length;
        this.requestUpdate();
      }
    }

    thread.status = 'completed';
    this.requestUpdate();
  }

  private combineChunks(): Blob {
    const parts: BlobPart[] = [];
    for (let i = 0; i < this.actualThreadCount; i++) {
      const chunks = this.chunks.get(i) || [];
      const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalSize === 0) continue;
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      parts.push(combined);
    }
    return new Blob(parts, { type: 'application/octet-stream' });
  }

  private requestUpdate(): void {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.onThreadUpdate(this.threads.map((t) => ({ ...t })));
      const totalDownloaded = this.threads.reduce(
        (s, t) => s + t.downloaded,
        0
      );
      this.onProgress(totalDownloaded, this.fileSize, this.currentSpeed);
    });
  }

  private startSpeedMonitor(): void {
    this.lastSpeedCheck = Date.now();
    this.lastBytesDownloaded = 0;
    this.currentSpeed = 0;
    this.speedInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastSpeedCheck) / 1000;
      const totalDownloaded = this.threads.reduce(
        (s, t) => s + t.downloaded,
        0
      );
      const bytesDiff = totalDownloaded - this.lastBytesDownloaded;
      this.currentSpeed = elapsed > 0 ? bytesDiff / elapsed : 0;
      this.lastBytesDownloaded = totalDownloaded;
      this.lastSpeedCheck = now;
    }, 500);
  }

  private stopSpeedMonitor(): void {
    if (this.speedInterval) {
      clearInterval(this.speedInterval);
      this.speedInterval = null;
    }
  }
}
