export type SortDirection = 'none' | 'asc' | 'desc';

export interface SortState {
  columnIndex: number;
  direction: SortDirection;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface TableRowRecord {
  rowNumber: number;
  cells: string[];
}

export interface TableStats {
  rowCount: number;
  columnCount: number;
  sortState: SortState;
  selectedRowNumber: number | null;
  isDirty: boolean;
}

export type FileEncoding = 'utf-8' | 'windows-1251';

export interface DecodeResult {
  text: string;
  encoding: FileEncoding;
}

export interface OpenedFilePayload {
  filePath: string;
  data: TableData;
  encoding: FileEncoding;
}

export interface SaveRequestPayload {
  requestId: number;
  saveAs: boolean;
}

export interface SaveDataPayload {
  requestId: number;
  data: TableData;
  saveAs: boolean;
}

export interface SavedFilePayload {
  filePath: string;
}

export type AppAction = 'new' | 'open' | 'save' | 'save-as';

export interface ElectronAPI {
  onFileOpened: (callback: (payload: OpenedFilePayload) => void) => void;
  onNewTable: (callback: () => void) => void;
  onAddRow: (callback: () => void) => void;
  onDeleteRow: (callback: () => void) => void;
  onAddColumn: (callback: () => void) => void;
  onRequestSave: (callback: (payload: SaveRequestPayload) => void) => void;
  sendSaveData: (payload: SaveDataPayload) => void;
  cancelSaveRequest: (requestId: number) => void;
  onFileSaved: (callback: (payload: SavedFilePayload) => void) => void;
  notifyDirtyChanged: (isDirty: boolean) => void;
  triggerAction: (action: AppAction) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
