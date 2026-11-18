import type {
  SortDirection,
  SortState,
  TableData,
  TableRowRecord,
} from '../shared/table_types.ts';

export class TableModel {
  private static readonly collator = new Intl.Collator('uk', {
    numeric: true,
    sensitivity: 'base',
  });

  private headers: string[] = [];
  private originalRows: TableRowRecord[] = [];
  private viewRows: TableRowRecord[] = [];
  private sortState: SortState = { columnIndex: -1, direction: 'none' };
  private selectedRow: TableRowRecord | null = null;
  private dirty = false;

  load(data: TableData): void {
    const columnCount = data.headers.length;
    this.headers = [...data.headers];
    this.originalRows = data.rows.map((row, index) => {
      const cells: string[] = [];
      for (let col = 0; col < columnCount; col += 1) {
        cells.push(row[col] ?? '');
      }
      return {
        rowNumber: index + 1,
        cells,
      };
    });
    this.viewRows = [...this.originalRows];
    this.sortState = { columnIndex: -1, direction: 'none' };
    this.selectedRow = null;
    this.dirty = false;
  }

  createEmpty(columnCount = 3): void {
    const count = Math.max(1, Math.floor(columnCount));
    const headers = Array.from(
      { length: count },
      (_, index) => `Стовпчик ${index + 1}`,
    );
    const emptyRow = Array.from({ length: count }, () => '');
    this.load({ headers, rows: [emptyRow] });
  }

  toTableData(): TableData {
    return {
      headers: [...this.headers],
      rows: this.originalRows.map(record => [...record.cells]),
    };
  }

  hasTable(): boolean {
    return this.headers.length > 0;
  }

  getHeaders(): readonly string[] {
    return this.headers;
  }

  getViewRows(): readonly TableRowRecord[] {
    return this.viewRows;
  }

  getRowCount(): number {
    return this.originalRows.length;
  }

  getColumnCount(): number {
    return this.headers.length;
  }

  getSortState(): SortState {
    return { ...this.sortState };
  }

  getSelectedViewIndex(): number | null {
    if (!this.selectedRow) {
      return null;
    }
    const index = this.viewRows.indexOf(this.selectedRow);
    return index >= 0 ? index : null;
  }

  getSelectedRowNumber(): number | null {
    return this.selectedRow ? this.selectedRow.rowNumber : null;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  markSaved(): void {
    this.dirty = false;
  }

  selectRow(viewIndex: number | null): void {
    if (
      viewIndex === null ||
      !Number.isInteger(viewIndex) ||
      viewIndex < 0 ||
      viewIndex >= this.viewRows.length
    ) {
      this.selectedRow = null;
      return;
    }
    this.selectedRow = this.viewRows[viewIndex] ?? null;
  }

  cycleSort(columnIndex: number): SortState {
    if (
      !this.hasTable() ||
      !Number.isInteger(columnIndex) ||
      columnIndex < 0 ||
      columnIndex > this.headers.length
    ) {
      return this.getSortState();
    }

    let nextDirection: SortDirection;
    let nextColumn = columnIndex;

    if (this.sortState.columnIndex !== columnIndex) {
      nextDirection = 'asc';
    } else if (this.sortState.direction === 'asc') {
      nextDirection = 'desc';
    } else if (this.sortState.direction === 'desc') {
      nextDirection = 'none';
      nextColumn = -1;
    } else {
      nextDirection = 'asc';
    }

    this.sortState = { columnIndex: nextColumn, direction: nextDirection };
    this.applySort();
    return this.getSortState();
  }

  updateCell(viewIndex: number, dataColIndex: number, value: string): boolean {
    const row = this.viewRows[viewIndex];
    if (!row || dataColIndex < 0 || dataColIndex >= this.headers.length) {
      return false;
    }

    const sanitized = this.sanitizeValue(value);
    if (row.cells[dataColIndex] === sanitized) {
      return false;
    }

    row.cells[dataColIndex] = sanitized;
    this.dirty = true;
    return true;
  }

  renameColumn(dataColIndex: number, name: string): boolean {
    if (dataColIndex < 0 || dataColIndex >= this.headers.length) {
      return false;
    }

    const sanitized = this.sanitizeValue(name).trim();
    if (sanitized.length === 0 || this.headers[dataColIndex] === sanitized) {
      return false;
    }

    this.headers[dataColIndex] = sanitized;
    this.dirty = true;
    return true;
  }

  addRow(): number {
    if (!this.hasTable()) {
      this.createEmpty();
    }

    const newRecord: TableRowRecord = {
      rowNumber: this.originalRows.length + 1,
      cells: Array.from({ length: this.headers.length }, () => ''),
    };

    this.originalRows.push(newRecord);
    this.viewRows.push(newRecord);
    this.selectedRow = newRecord;
    this.dirty = true;
    return this.viewRows.length - 1;
  }

  deleteSelectedRow(): boolean {
    const viewIndex = this.getSelectedViewIndex();
    if (viewIndex === null || !this.selectedRow) {
      return false;
    }

    const target = this.selectedRow;
    const origIndex = this.originalRows.indexOf(target);
    if (origIndex >= 0) {
      this.originalRows.splice(origIndex, 1);
    }
    this.viewRows.splice(viewIndex, 1);
    this.resequenceRowNumbers();

    if (this.viewRows.length === 0) {
      this.selectedRow = null;
    } else {
      const nextIndex = Math.min(viewIndex, this.viewRows.length - 1);
      this.selectedRow = this.viewRows[nextIndex] ?? null;
    }

    this.dirty = true;
    return true;
  }

  addColumn(name?: string): number {
    if (!this.hasTable()) {
      this.createEmpty(1);
      if (name && name.trim().length > 0) {
        this.headers[0] = this.sanitizeValue(name).trim();
      }
      this.dirty = true;
      return 0;
    }

    const trimmed = name ? this.sanitizeValue(name).trim() : '';
    const columnName =
      trimmed.length > 0 ? trimmed : `Стовпчик ${this.headers.length + 1}`;
    this.headers.push(columnName);
    for (const row of this.originalRows) {
      row.cells.push('');
    }
    this.dirty = true;
    return this.headers.length - 1;
  }

  private applySort(): void {
    const { columnIndex, direction } = this.sortState;
    if (direction === 'none' || columnIndex < 0) {
      this.viewRows = [...this.originalRows];
      return;
    }

    const sign = direction === 'asc' ? 1 : -1;
    this.viewRows = [...this.originalRows].sort((a, b) => {
      if (columnIndex === 0) {
        return (a.rowNumber - b.rowNumber) * sign;
      }

      const dataCol = columnIndex - 1;
      const aVal = a.cells[dataCol] ?? '';
      const bVal = b.cells[dataCol] ?? '';
      const aEmpty = aVal.trim().length === 0;
      const bEmpty = bVal.trim().length === 0;

      if (aEmpty && bEmpty) {
        return a.rowNumber - b.rowNumber;
      }
      if (aEmpty) {
        return 1;
      }
      if (bEmpty) {
        return -1;
      }

      const cmp = TableModel.collator.compare(aVal, bVal);
      if (cmp !== 0) {
        return cmp * sign;
      }
      return a.rowNumber - b.rowNumber;
    });
  }

  private resequenceRowNumbers(): void {
    this.originalRows.forEach((row, index) => {
      row.rowNumber = index + 1;
    });
  }

  private sanitizeValue(value: string): string {
    return value.replace(/[\t\r\n]/g, ' ');
  }
}
