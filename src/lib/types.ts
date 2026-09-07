export type DownloadStatus =
  | 'idle'
  | 'preparing'
  | 'downloading'
  | 'combining'
  | 'completed'
  | 'error'
  | 'cancelled';

export type ThreadStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'error'
  | 'retrying';

export interface ThreadState {
  id: number;
  start: number;
  end: number;
  downloaded: number;
  status: ThreadStatus;
  speed: number;
  retries: number;
}

export interface DownloadResult {
  blob: Blob;
  fileName: string;
  fileSize: number;
  duration: number;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  duration: number;
  threadCount: number;
  url: string;
  completedAt: string;
}
