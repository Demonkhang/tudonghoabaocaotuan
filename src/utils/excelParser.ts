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

export interface IncomingDocTask {
  id: string;
  ngay_den: string;
  so_den: string;
  tac_gia: string;
  so_ky_hieu: string;
  ngay_van_ban: string;
  title: string;
  don_vi_nhan: string;
  loai_van_ban: string;
  do_khan: string;
  priority: 'THUONG' | 'KHAN' | 'KHAN_CAP';
  linh_vuc: string;
  xu_ly_chinh: string;
  due_date: string;
  description: string;
  selected: boolean;
  isValid: boolean;
  errorMessage?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

/**
 * Đóng gói thông tin văn bản đến thành chuỗi Markdown description
 */
export function buildIncomingDocDescription(item: Partial<IncomingDocTask>): string {
  const parts: string[] = [];
  if (item.so_den) parts.push(`📌 **Số đến:** ${item.so_den}`);
  if (item.ngay_den) parts.push(`📅 **Ngày đến:** ${item.ngay_den}`);
  if (item.so_ky_hieu) parts.push(`📄 **Số/Ký hiệu VB:** ${item.so_ky_hieu}`);
  if (item.ngay_van_ban) parts.push(`📆 **Ngày ban hành:** ${item.ngay_van_ban}`);
  if (item.tac_gia) parts.push(`🏛️ **Cơ quan/Tác giả:** ${item.tac_gia}`);
  if (item.loai_van_ban) parts.push(`📋 **Loại văn bản:** ${item.loai_van_ban}`);
  if (item.linh_vuc) parts.push(`🏷️ **Lĩnh vực:** ${item.linh_vuc}`);
  if (item.xu_ly_chinh) parts.push(`👤 **Xử lý chính:** ${item.xu_ly_chinh}`);
  if (item.don_vi_nhan) parts.push(`🏢 **Đơn vị/Người nhận:** ${item.don_vi_nhan}`);
  return parts.join('\n');
}

/**
 * Phân tích file Excel Sổ Văn Bản Đến (.xlsx, .xls) và Kiểm tra trùng lặp
 */
export async function parseIncomingDocExcel(
  file: File,
  existingTasks: any[] = []
): Promise<{ tasks: IncomingDocTask[]; fileName: string; duplicateCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: IncomingDocTask[] = [];

        // Ưu tiên chọn sheet tên "VB đến" hoặc "VB den", nếu không thì lấy sheet đầu tiên
        let targetSheetName = workbook.SheetNames.find(
          name => name.trim().toLowerCase() === 'vb đến' || name.trim().toLowerCase() === 'vb den'
        );
        if (!targetSheetName) {
          targetSheetName = workbook.SheetNames[0];
        }

        if (!targetSheetName) throw new Error('File Excel không có dữ liệu sheet nào.');

        const sheet = workbook.Sheets[targetSheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('Sheet Excel trống không có dữ liệu.');
        }

        // Tìm dòng header (chứa ít nhất "ngày đến", "số đến", "trích yếu"...)
        let headerRowIndex = -1;
        let foundHeadersCount = 0;
        let colNgayDen = 0;
        let colSoDen = 1;
        let colTacGia = 2;
        let colSoKyHieu = 3;
        let colNgayVanBan = 4;
        let colTrichYeu = 5;
        let colDonViNhan = 6;
        let colLoaiVanBan = 9;
        let colDoKhan = 10;
        let colLinhVuc = 11;
        let colXuLyChinh = 12;

        for (let r = 0; r < Math.min(15, rawRows.length); r++) {
          const rowStr = rawRows[r].map(c => String(c).toLowerCase()).join(' ');
          let matchesInRow = 0;
          if (rowStr.includes('ngày đến') || rowStr.includes('ngay den')) matchesInRow++;
          if (rowStr.includes('số đến') || rowStr.includes('so den')) matchesInRow++;
          if (rowStr.includes('trích yếu') || rowStr.includes('nội dung') || rowStr.includes('trich yeu')) matchesInRow++;
          if (rowStr.includes('ký hiệu') || rowStr.includes('ky hieu')) matchesInRow++;
          if (rowStr.includes('xử lý chính') || rowStr.includes('xu ly chinh')) matchesInRow++;

          if (matchesInRow >= 2) {
            headerRowIndex = r;
            foundHeadersCount = matchesInRow;
            // Map chính xác vị trí các cột dựa trên header tìm thấy
            rawRows[r].forEach((cellVal: any, cIdx: number) => {
              const str = String(cellVal).toLowerCase().trim();
              if (str.includes('ngày đến') || str === 'ngày đến') colNgayDen = cIdx;
              else if (str.includes('số đến') || str === 'số đến') colSoDen = cIdx;
              else if (str.includes('tác giả')) colTacGia = cIdx;
              else if (str.includes('ký hiệu') || str.includes('số, ký hiệu')) colSoKyHieu = cIdx;
              else if (str.includes('ngày tháng') || str.includes('ngày văn bản')) colNgayVanBan = cIdx;
              else if (str.includes('trích yếu') || str.includes('nội dung')) colTrichYeu = cIdx;
              else if (str.includes('người nhận') || str.includes('đơn vị')) colDonViNhan = cIdx;
              else if (str.includes('loại văn bản')) colLoaiVanBan = cIdx;
              else if (str.includes('độ khẩn')) colDoKhan = cIdx;
              else if (str.includes('lĩnh vực')) colLinhVuc = cIdx;
              else if (str.includes('xử lý chính') || str.includes('xu ly chinh')) colXuLyChinh = cIdx;
            });
            break;
          }
        }

        // CẢNH BÁO NẾU KHÔNG ĐÚNG CẤU TRÚC BẢNG SỔ VĂN BẢN ĐẾN
        if (headerRowIndex === -1 || foundHeadersCount < 2) {
          throw new Error('STRUCT_ERROR: File Excel không đúng cấu trúc bảng "Sổ lưu cấp số văn bản đến". Vui lòng chọn file Excel có cấu trúc các cột chuẩn (Số đến, Ngày đến, Trích yếu nội dung văn bản, Xử lý chính...).');
        }

        const startRow = headerRowIndex + 1;
        const seenInFile = new Set<string>();
        let duplicateCount = 0;

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const trichYeu = formatExcelCellValue(row[colTrichYeu]);
          const soDen = formatExcelCellValue(row[colSoDen]);
          const ngayDen = formatExcelCellValue(row[colNgayDen]);
          const tacGia = formatExcelCellValue(row[colTacGia]);
          const soKyHieu = formatExcelCellValue(row[colSoKyHieu]);
          const ngayVanBan = formatExcelCellValue(row[colNgayVanBan]);
          const donViNhan = formatExcelCellValue(row[colDonViNhan]);
          const loaiVanBan = formatExcelCellValue(row[colLoaiVanBan]);
          const doKhan = formatExcelCellValue(row[colDoKhan]);
          const linhVuc = formatExcelCellValue(row[colLinhVuc]);
          const xuLyChinh = formatExcelCellValue(row[colXuLyChinh]);

          // Bỏ qua dòng trống nếu không có cả trích yếu và số đến
          if (!trichYeu && !soDen) continue;

          let priority: 'THUONG' | 'KHAN' | 'KHAN_CAP' = 'THUONG';
          const lowerDoKhan = doKhan.toLowerCase();
          if (lowerDoKhan.includes('hỏa tốc') || lowerDoKhan.includes('hoa toc')) {
            priority = 'KHAN_CAP';
          } else if (lowerDoKhan.includes('khẩn') || lowerDoKhan.includes('khan')) {
            priority = 'KHAN';
          }

          const itemPartial: Partial<IncomingDocTask> = {
            ngay_den: ngayDen,
            so_den: soDen,
            tac_gia: tacGia,
            so_ky_hieu: soKyHieu,
            ngay_van_ban: ngayVanBan,
            title: trichYeu,
            don_vi_nhan: donViNhan,
            loai_van_ban: loaiVanBan,
            do_khan: doKhan,
            priority,
            linh_vuc: linhVuc,
            xu_ly_chinh: xuLyChinh
          };

          const description = buildIncomingDocDescription(itemPartial);
          const isValid = Boolean(trichYeu && trichYeu.trim().length > 0);

          // KIỂM TRA TRÙNG LẶP (Bắt trùng trong file & trùng với DB)
          let isDuplicate = false;
          let duplicateReason = '';

          const uniqueKeyTitle = trichYeu.trim().toLowerCase();
          const uniqueKeySoDen = soDen ? `sden_${soDen.trim().toLowerCase()}` : '';

          if (uniqueKeyTitle && seenInFile.has(uniqueKeyTitle)) {
            isDuplicate = true;
            duplicateReason = 'Trùng nội dung trích yếu với dòng khác trong cùng file Excel';
          } else if (uniqueKeySoDen && seenInFile.has(uniqueKeySoDen)) {
            isDuplicate = true;
            duplicateReason = `Trùng Số đến ${soDen} với dòng khác trong cùng file Excel`;
          } else if (Array.isArray(existingTasks) && existingTasks.length > 0) {
            const dupTask = existingTasks.find((t: any) => {
              if (uniqueKeySoDen && t.task_code && t.task_code.toLowerCase().includes(soDen.toLowerCase())) return true;
              if (uniqueKeyTitle && t.title && t.title.trim().toLowerCase() === uniqueKeyTitle) return true;
              if (soKyHieu && t.description && t.description.toLowerCase().includes(soKyHieu.toLowerCase())) return true;
              return false;
            });
            if (dupTask) {
              isDuplicate = true;
              duplicateReason = `Trùng với nhiệm vụ đã có trong Kho Chung: "${dupTask.title}" (${dupTask.task_code})`;
            }
          }

          if (uniqueKeyTitle) seenInFile.add(uniqueKeyTitle);
          if (uniqueKeySoDen) seenInFile.add(uniqueKeySoDen);

          if (isDuplicate) duplicateCount++;

          result.push({
            id: `import_row_${r}_${Date.now()}`,
            ngay_den: ngayDen,
            so_den: soDen,
            tac_gia: tacGia,
            so_ky_hieu: soKyHieu,
            ngay_van_ban: ngayVanBan,
            title: trichYeu || `(Chưa có trích yếu - Văn bản số ${soDen})`,
            don_vi_nhan: donViNhan,
            loai_van_ban: loaiVanBan,
            do_khan: doKhan,
            priority,
            linh_vuc: linhVuc,
            xu_ly_chinh: xuLyChinh,
            due_date: '',
            description,
            selected: isValid && !isDuplicate, // Tự động bỏ chọn các dòng trùng lặp
            isValid,
            isDuplicate,
            duplicateReason,
            errorMessage: isValid ? (isDuplicate ? duplicateReason : undefined) : 'Thiếu nội dung trích yếu văn bản'
          });
        }

        if (result.length === 0) {
          throw new Error('STRUCT_ERROR: Không tìm thấy dữ liệu văn bản đến hợp lệ trong file Excel.');
        }

        resolve({ tasks: result, fileName: file.name, duplicateCount });
      } catch (err: any) {
        console.error("parseIncomingDocExcel error:", err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Không thể đọc file đã chọn.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Tải file mẫu Excel Sổ Lưu Cấp Số Văn Bản Đến (Chuẩn 100% không thừa cột trống)
 */
export function downloadIncomingDocExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const sheetData = [
    ["Sổ lưu cấp số văn bản đến: SỔ VĂN BẢN ĐẾN NĂM 2026", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["Ngày đến", "Số đến", "Tác giả", "Số, ký hiệu văn bản", "Ngày tháng năm văn bản", "Tên loại và trích yếu nội dung văn bản", "Đơn vị hoặc người nhận văn bản", "Ký nhận", "Ghi chú", "Loại văn bản", "Độ khẩn", "Lĩnh vực", "Xử lý chính"],
    ["14/09/2026", "5620", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30191/TB-SNNMT-BTTĐC", "11/09/2026", "Kết luận của ông Lê Anh Tú, Phó Giám đốc Sở Nông nghiệp và Môi trường tại cuộc họp về chuẩn bị triển khai công tác bồi thường, hỗ trợ, tái định cư, giải phóng mặt bằng Khu liên hợp xử lý chất thải rắn Tây Bắc Thành phố", "KẾ HOẠCH - TÀI CHÍNH;GIÁM SÁT KHU LIÊN HỢP;PHÒNG QUẢN LÝ DỰ ÁN;TRỊNH LÊ QUANG;NGUYỄN TRÍ BỬU;Trần Văn Toàn;NGUYỄN VĂN HẢI", "", "", "Thông báo", "Khẩn", "", "NGUYỄN QUỐC BÌNH"],
    ["14/09/2026", "5621", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30043/BC-SNNMT-KHTC", "11/09/2026", "Báo cáo tuần 37 (Từ ngày 07/9/2026 đến ngày 11/9/2026)", "VĂN PHÒNG;KẾ HOẠCH - TÀI CHÍNH;NGUYỄN VĂN HẢI", "", "", "Báo cáo", "Khẩn", "", "NGUYỄN VĂN HẢI"],
    ["14/09/2026", "5622", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30025/SNNMT-QLĐT", "11/09/2026", "Về việc giải trình nội dung liên quan Báo cáo nghiên cứu tiền khả thi dự án Đầu tư xây dựng hoàn thiện hạ tầng kỹ thuật khu liên hợp xử lý chất thải rắn Tây Bắc Thành phố", "GIÁM SÁT KHU LIÊN HỢP;PHÒNG QUẢN LÝ DỰ ÁN;TRỊNH LÊ QUANG;NGUYỄN TRÍ BỬU;HỒ THANH THUẬN", "", "", "Công văn", "Khẩn", "Đầu tư", "PHÒNG QUẢN LÝ DỰ ÁN"],
    ["14/09/2026", "5623", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "632/KHTC", "14/09/2026", "Tổng hợp tình hình thu, chi ngân sách đến tháng 8/2026 của Sở Nông nghiệp và Môi trường", "KẾ HOẠCH - TÀI CHÍNH;NGUYỄN VĂN HẢI", "", "", "Báo cáo", "Thường", "", "NGUYỄN VĂN HẢI"],
    ["14/09/2026", "5624", "Ủy ban nhân dân Phường Bình Tây - TPHCM", "2047/UBND-KTHTĐT", "11/09/2026", "2047 V/v rà soát bố trí điểm tập kết rác tạm thời trong thời gian cải tạo, sửa chữa TTC CTRSH Bà Lài trong năm 2026 (giai đoạn 1)", "KIỂM TRA MÔI TRƯỜNG;Lê Thị Thanh Thảo;BÙI VĂN NÊN", "", "", "Công văn", "Thường", "", ""],
    ["14/09/2026", "5625", "Ủy ban nhân dân Thành phố Hồ Chí Minh", "1059/TB-VP", "12/09/2026", "Kết luận của Phó Chủ tịch Ủy ban nhân dân Thành phố Hoàng Nguyên Dinh tại cuộc họp về...", "PHÒNG QUẢN LÝ DỰ ÁN;TRỊNH LÊ QUANG", "", "", "Thông báo", "Thường", "", "LÊ TRUNG TUẤN ANH"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Gộp ô tiêu đề dòng 1 A1:M1
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

  ws['!cols'] = [
    { wch: 15 }, // Col A (0) : Ngày đến
    { wch: 10 }, // Col B (1) : Số đến
    { wch: 35 }, // Col C (2) : Tác giả
    { wch: 25 }, // Col D (3) : Số, ký hiệu văn bản
    { wch: 15 }, // Col E (4) : Ngày tháng năm văn bản
    { wch: 60 }, // Col F (5) : Tên loại và trích yếu nội dung văn bản
    { wch: 45 }, // Col G (6) : Đơn vị hoặc người nhận văn bản
    { wch: 12 }, // Col H (7) : Ký nhận
    { wch: 15 }, // Col I (8) : Ghi chú
    { wch: 15 }, // Col J (9) : Loại văn bản
    { wch: 12 }, // Col K (10): Độ khẩn
    { wch: 15 }, // Col L (11): Lĩnh vực
    { wch: 25 }  // Col M (12): Xử lý chính
  ];

  XLSX.utils.book_append_sheet(wb, ws, "VB đến");
  XLSX.writeFile(wb, "Mau_So_Van_Ban_Den_2026.xlsx");
}




