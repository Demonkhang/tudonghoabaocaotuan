import * as XLSX from 'xlsx';
import { TaskTable1, TaskTable2, classifyTask, isIgnoredRow } from './reportUtils';

export interface ParsedSheetData {
  table1: TaskTable1[];
  table2: TaskTable2[];
  fileName: string;
}

interface ColumnMapTable1 {
  colNoiDung: number;
  colThoiGian: number;
  colTrienKhai: number;
  colTienDo: number;
}

interface ColumnMapTable2 {
  colNoiDung: number;
  colThoiGian: number;
  colSanPham: number;
}

/**
 * Chuyển đổi định dạng ngày trong Excel (Number serial date hoặc string) thành chuỗi dd/mm/yyyy
 */
function formatExcelCellValue(cellVal: any): string {
  if (cellVal === null || cellVal === undefined || cellVal === '') return '';

  if (typeof cellVal === 'number' && cellVal > 30000 && cellVal < 70000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(cellVal);
      if (dateObj) {
        const day = String(dateObj.d).padStart(2, '0');
        const month = String(dateObj.m).padStart(2, '0');
        const year = dateObj.y;
        return `${day}/${month}/${year}`;
      }
    } catch {
      // ignore error
    }
  }
  return String(cellVal).trim();
}

/**
 * Phân tích file Excel (.xlsx, .xls, .csv) theo chuẩn biểu mẫu hình ảnh của cơ quan.
 */
export async function parseExcelFile(file: File): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const resultTable1: TaskTable1[] = [];
        const resultTable2: TaskTable2[] = [];

        // Duyệt từng Sheet
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return;

          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) return;

          parseSheetContent(rawRows, resultTable1, resultTable2);
        });

        // Nếu tệp quá tự do, chạy fallback
        if (resultTable1.length === 0 && resultTable2.length === 0) {
          fallbackParse(workbook, resultTable1, resultTable2);
        }

        resolve({
          table1: resultTable1,
          table2: resultTable2,
          fileName: file.name
        });
      } catch (err) {
        console.error("Excel parse error:", err);
        reject(new Error('Lỗi khi phân tích biểu mẫu Excel. Vui lòng kiểm tra lại file.'));
      }
    };

    reader.onerror = () => reject(new Error('Không thể đọc file đã chọn.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Quét theo luồng dòng của biểu mẫu cơ quan
 */
function parseSheetContent(
  rows: any[][],
  outTable1: TaskTable1[],
  outTable2: TaskTable2[]
) {
  let currentMode: 'table1' | 'table2' | null = null;
  let currentGroup: 'Thường xuyên' | 'Đột xuất' = 'Thường xuyên';

  let mapT1: ColumnMapTable1 | null = null;
  let mapT2: ColumnMapTable2 | null = null;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Chuỗi tổng thể của cả dòng (chữ thường)
    const rowStr = row.map(c => String(c || '').trim()).join(' ').toLowerCase();

    // 1. Nhận diện tiêu đề Section BẢNG I
    if (rowStr.includes('i. kết quả thực hiện') || rowStr.includes('kết quả thực hiện công tác')) {
      currentMode = 'table1';
      currentGroup = 'Thường xuyên';
      mapT1 = null;
      continue;
    }

    // 2. Nhận diện tiêu đề Section BẢNG II
    if (rowStr.includes('ii. kế hoạch thực hiện') || rowStr.includes('kế hoạch thực hiện công tác')) {
      currentMode = 'table2';
      currentGroup = 'Thường xuyên';
      mapT2 = null;
      continue;
    }

    // 3. Nhận diện phân nhóm Thường xuyên / Đột xuất trong dòng subheader
    if (rowStr.includes('nhiệm vụ theo bút phê') || rowStr.includes('chỉ đạo đột xuất')) {
      currentGroup = 'Đột xuất';
      continue;
    } else if (rowStr.includes('nhiệm vụ thường xuyên')) {
      currentGroup = 'Thường xuyên';
      continue;
    }

    // Nếu chưa phát hiện tiêu đề chính nhưng có tiêu đề cột Bảng I
    if (!currentMode) {
      if (rowStr.includes('triển khai thực hiện') || rowStr.includes('tiến độ thực hiện')) {
        currentMode = 'table1';
      } else if (rowStr.includes('sản phẩm dự kiến')) {
        currentMode = 'table2';
      }
    }

    // 4. Quét dòng Cột tiêu đề cho Bảng I
    if (currentMode === 'table1' && !mapT1) {
      const detected = detectHeaderTable1(row);
      if (detected) {
        mapT1 = detected;
        continue;
      }
    }

    // 5. Quét dòng Cột tiêu đề cho Bảng II
    if (currentMode === 'table2' && !mapT2) {
      const detected = detectHeaderTable2(row);
      if (detected) {
        mapT2 = detected;
        continue;
      }
    }

    // 6. Bóc tách dòng dữ liệu nhiệm vụ
    if (currentMode === 'table1') {
      const task = extractRowTable1(row, mapT1, currentGroup, r);
      if (task) {
        outTable1.push(task);
      }
    } else if (currentMode === 'table2') {
      const task = extractRowTable2(row, mapT2, currentGroup, r);
      if (task) {
        outTable2.push(task);
      }
    }
  }
}

/**
 * Nhận diện Map Cột cho Bảng I dựa theo đúng tên cột trong mẫu
 */
function detectHeaderTable1(row: any[]): ColumnMapTable1 | null {
  let colNoiDung = -1;
  let colThoiGian = -1;
  let colTrienKhai = -1;
  let colTienDo = -1;

  for (let c = 0; c < row.length; c++) {
    const val = String(row[c] || '').trim().toLowerCase();
    if (!val) continue;

    if (val.includes('nội dung') || (val.includes('nhiệm vụ') && !val.includes('thường xuyên') && !val.includes('đột xuất'))) {
      if (colNoiDung === -1) colNoiDung = c;
    } else if (val.includes('thời gian')) {
      if (colThoiGian === -1) colThoiGian = c;
    } else if (val.includes('triển khai')) {
      if (colTrienKhai === -1) colTrienKhai = c;
    } else if (val.includes('tiến độ')) {
      if (colTienDo === -1) colTienDo = c;
    }
  }

  if (colNoiDung !== -1) {
    return {
      colNoiDung,
      colThoiGian: colThoiGian !== -1 ? colThoiGian : colNoiDung + 1,
      colTrienKhai: colTrienKhai !== -1 ? colTrienKhai : colNoiDung + 2,
      colTienDo: colTienDo !== -1 ? colTienDo : colNoiDung + 3
    };
  }

  return null;
}

/**
 * Nhận diện Map Cột cho Bảng II
 */
function detectHeaderTable2(row: any[]): ColumnMapTable2 | null {
  let colNoiDung = -1;
  let colThoiGian = -1;
  let colSanPham = -1;

  for (let c = 0; c < row.length; c++) {
    const val = String(row[c] || '').trim().toLowerCase();
    if (!val) continue;

    if (val.includes('nhiệm vụ') || val.includes('nội dung')) {
      if (colNoiDung === -1) colNoiDung = c;
    } else if (val.includes('thời gian')) {
      if (colThoiGian === -1) colThoiGian = c;
    } else if (val.includes('sản phẩm') || val.includes('kết quả dự kiến')) {
      if (colSanPham === -1) colSanPham = c;
    }
  }

  if (colNoiDung !== -1) {
    return {
      colNoiDung,
      colThoiGian: colThoiGian !== -1 ? colThoiGian : colNoiDung + 1,
      colSanPham: colSanPham !== -1 ? colSanPham : colNoiDung + 2
    };
  }

  return null;
}

/**
 * Trích xuất 1 dòng Bảng I
 */
function extractRowTable1(
  row: any[],
  map: ColumnMapTable1 | null,
  currentGroup: 'Thường xuyên' | 'Đột xuất',
  rowIdx: number
): TaskTable1 | null {
  let noiDung = '';
  let thoiGian = '';
  let trienKhai = '';
  let tienDo = '';

  const cell0 = formatExcelCellValue(row[0]);
  const cell1 = formatExcelCellValue(row[1]);

  const isCol0STT = (/^\d+$/.test(cell0) || cell0.toLowerCase() === 'stt' || cell0.toUpperCase() === 'I' || cell0.toUpperCase() === 'II') && cell1.length > 0;

  if (map) {
    noiDung = formatExcelCellValue(row[map.colNoiDung]);
    thoiGian = formatExcelCellValue(row[map.colThoiGian]);
    trienKhai = formatExcelCellValue(row[map.colTrienKhai]);
    tienDo = formatExcelCellValue(row[map.colTienDo]);
  } else if (isCol0STT) {
    noiDung = cell1;
    thoiGian = formatExcelCellValue(row[2]);
    trienKhai = formatExcelCellValue(row[3]);
    tienDo = formatExcelCellValue(row[4]);
  } else {
    noiDung = cell0 || cell1;
    thoiGian = formatExcelCellValue(row[1] || row[2]);
    trienKhai = formatExcelCellValue(row[2] || row[3]);
    tienDo = formatExcelCellValue(row[3] || row[4]);
  }

  if (!noiDung || isIgnoredRow(noiDung)) return null;

  // Chuẩn hóa tiến độ
  let normalizedTienDo = tienDo || 'Hoàn thành';
  const tienDoLower = tienDo.toLowerCase();
  if (tienDoLower.includes('trễ') || tienDoLower.includes('quá hạn')) {
    normalizedTienDo = 'Hoàn thành trễ hạn';
  } else if (tienDoLower.includes('hoàn thành')) {
    normalizedTienDo = 'Hoàn thành';
  } else if (tienDoLower.includes('đang')) {
    normalizedTienDo = 'Đang thực hiện';
  } else if (tienDoLower.includes('chưa')) {
    normalizedTienDo = 'Chưa thực hiện';
  }

  return {
    id: `imp_t1_${rowIdx}_${Date.now()}`,
    noi_dung: noiDung,
    thoi_gian: thoiGian || 'Chưa nhập',
    trien_khai: trienKhai || 'báo cáo',
    tien_do: normalizedTienDo,
    nhom: currentGroup,
    isEdited: false
  };
}

/**
 * Trích xuất 1 dòng Bảng II
 */
function extractRowTable2(
  row: any[],
  map: ColumnMapTable2 | null,
  currentGroup: 'Thường xuyên' | 'Đột xuất',
  rowIdx: number
): TaskTable2 | null {
  let noiDung = '';
  let thoiGian = '';
  let sanPham = '';

  const cell0 = formatExcelCellValue(row[0]);
  const cell1 = formatExcelCellValue(row[1]);

  const isCol0STT = (/^\d+$/.test(cell0) || cell0.toLowerCase() === 'stt' || cell0.toUpperCase() === 'I' || cell0.toUpperCase() === 'II') && cell1.length > 0;

  if (map) {
    noiDung = formatExcelCellValue(row[map.colNoiDung]);
    thoiGian = formatExcelCellValue(row[map.colThoiGian]);
    sanPham = formatExcelCellValue(row[map.colSanPham]);
  } else if (isCol0STT) {
    noiDung = cell1;
    thoiGian = formatExcelCellValue(row[2]);
    sanPham = formatExcelCellValue(row[3]);
  } else {
    noiDung = cell0 || cell1;
    thoiGian = formatExcelCellValue(row[1] || row[2]);
    sanPham = formatExcelCellValue(row[2] || row[3]);
  }

  if (!noiDung || isIgnoredRow(noiDung)) return null;

  return {
    id: `imp_t2_${rowIdx}_${Date.now()}`,
    noi_dung: noiDung,
    thoi_gian_du_kien: thoiGian || 'Trong tuần',
    san_pham_du_kien: sanPham || 'Kế hoạch',
    nhom: currentGroup,
    isEdited: false
  };
}

/**
 * Phương án dự phòng cho file cấu trúc tự do
 */
function fallbackParse(workbook: XLSX.WorkBook, outT1: TaskTable1[], outT2: TaskTable2[]) {
  workbook.SheetNames.forEach((sheetName, sheetIdx) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    rows.forEach((row, r) => {
      const txt = row.map(cell => formatExcelCellValue(cell)).filter(Boolean);
      if (txt.length < 2) return;

      const firstCell = txt[0].toLowerCase();
      if (firstCell.startsWith('stt') || firstCell.includes('nhiệm vụ') || firstCell.includes('kết quả')) return;

      if (sheetIdx === 0) {
        outT1.push({
          id: `fallback_t1_${r}`,
          noi_dung: txt[0],
          thoi_gian: txt[1] || 'Chưa nhập',
          trien_khai: txt[2] || 'báo cáo',
          tien_do: txt[3] || 'Hoàn thành',
          nhom: classifyTask(txt[0]),
          isEdited: false
        });
      } else {
        outT2.push({
          id: `fallback_t2_${r}`,
          noi_dung: txt[0],
          thoi_gian_du_kien: txt[1] || 'Trong tuần',
          san_pham_du_kien: txt[2] || 'Kế hoạch',
          nhom: classifyTask(txt[0]),
          isEdited: false
        });
      }
    });
  });
}

/**
 * TẢI VỀ MẪU EXCEL GIỐNG 100% HÌNH ẢNH MẪU CỦA CƠ QUAN
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Tạo mảng dữ liệu theo đúng cấu trúc từ hình ảnh người dùng cung cấp
  const sheetData = [
    // Hàng 1: Tiêu đề Bảng I
    ["I. Kết quả thực hiện công tác Tuần 28", "", "", ""],
    // Hàng 2: Tiêu đề các cột Bảng I
    ["Nội dung nhiệm vụ/ công tác được giao", "Thời gian được giao hoàn thiện nhiệm vụ", "Triển khai thực hiện", "Tiến độ thực hiện"],
    // Hàng 3: Subheader Nhóm thường xuyên Bảng I
    ["Nhiệm vụ thường xuyên ( ... / .... Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)", "", "", ""],
    // Hàng 4 - 7: Dòng nhiệm vụ Thường xuyên mẫu Bảng I
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    // Hàng 8: Subheader Nhóm Đột xuất Bảng I
    ["Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...) (.../...Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)", "", "", ""],
    // Hàng 9 - 11: Dòng nhiệm vụ Đột xuất mẫu Bảng I
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    // Hàng 12: Tiêu đề Bảng II
    ["II. Kế hoạch thực hiện công tác Tuần 29 (Tuần tiếp theo)", "", "", ""],
    // Hàng 13: Subheader Nhóm thường xuyên Bảng II
    ["Nhiệm vụ thường xuyên", "", "", ""],
    // Hàng 14: Tiêu đề các cột Bảng II
    ["Nhiệm vụ/công tác", "Thời gian dự kiến hoàn thành", "Nội dung và sản phẩm dự kiến thực hiện", ""],
    // Hàng 15 - 17: Dòng nhiệm vụ Thường xuyên mẫu Bảng II
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    // Hàng 18: Subheader Nhóm Đột xuất Bảng II
    ["Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...) (.../...Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)", "", "", ""],
    // Hàng 19 - 21: Dòng nhiệm vụ Đột xuất mẫu Bảng II
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Thiết lập độ rộng cột hợp lý
  ws['!cols'] = [
    { wch: 45 }, // Cột 1: Nội dung
    { wch: 25 }, // Cột 2: Thời gian
    { wch: 35 }, // Cột 3: Triển khai / Sản phẩm
    { wch: 20 }  // Cột 4: Tiến độ
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Báo cáo công tác tuần");

  XLSX.writeFile(wb, "Mau_Bao_Cao_Tuan_Co_Quan_Chuan.xlsx");
}
