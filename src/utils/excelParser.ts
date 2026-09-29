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

function cleanHtmlString(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/&#37;/g, '%')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, (match) => {
      const code = parseInt(match.replace(/&#|;/g, ''), 10);
      return isNaN(code) ? match : String.fromCharCode(code);
    })
    .trim();
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
  return cleanHtmlString(String(cellVal));
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

          fixSheetRange(sheet);

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

  const sheetData = [
    ["I. Kết quả thực hiện công tác Tuần 28", "", "", ""],
    ["Nội dung nhiệm vụ/ công tác được giao", "Thời gian được giao hoàn thiện nhiệm vụ", "Triển khai thực hiện", "Tiến độ thực hiện"],
    ["Nhiệm vụ thường xuyên ( ... / .... Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)", "", "", ""],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...) (.../...Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)", "", "", ""],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["V/v rà soát nhu cầu đăng ký và cam kết hoàn thành kế hoạch", "22/07/2026", "báo cáo", "Hoàn thành"],
    ["II. Kế hoạch thực hiện công tác Tuần 29 (Tuần tiếp theo)", "", "", ""],
    ["Nhiệm vụ thường xuyên", "", "", ""],
    ["Nhiệm vụ/công tác", "Thời gian dự kiến hoàn thành", "Nội dung và sản phẩm dự kiến thực hiện", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...) (.../...Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)", "", "", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""],
    ["Ban hành kế hoạch Rà soát, triển khai các nội dung trọng tâm", "23/07/2026", "Kế hoạch", ""]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 45 },
    { wch: 25 },
    { wch: 35 },
    { wch: 20 }
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
 * Tự động sửa lại phạm vi sheet['!ref'] bằng cách quét tất cả các cell thực tế có trong sheet.
 * Khắc phục lỗi file Excel từ các hệ thống xuất có thẻ <dimension ref="..."> bị sai/lỗi thời
 * khiến thư viện SheetJS chỉ đọc một vài dòng đầu và bỏ qua dữ liệu bên dưới.
 */
export function fixSheetRange(sheet: XLSX.WorkSheet) {
  if (!sheet) return;
  let minRow = Infinity, maxRow = -1;
  let minCol = Infinity, maxCol = -1;

  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r < minRow) minRow = cell.r;
    if (cell.r > maxRow) maxRow = cell.r;
    if (cell.c < minCol) minCol = cell.c;
    if (cell.c > maxCol) maxCol = cell.c;
  }

  if (maxRow >= 0 && maxCol >= 0) {
    sheet['!ref'] = XLSX.utils.encode_range({
      s: { r: minRow === Infinity ? 0 : minRow, c: minCol === Infinity ? 0 : minCol },
      e: { r: maxRow, c: maxCol }
    });
  }
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

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có dữ liệu sheet nào.');
        }

        let bestResult: { tasks: IncomingDocTask[]; duplicateCount: number } | null = null;
        let bestTaskCount = -1;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          fixSheetRange(sheet);

          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          let headerRowIndex = -1;
          let colNgayDen = -1;
          let colSoDen = -1;
          let colTacGia = -1;
          let colSoKyHieu = -1;
          let colNgayVanBan = -1;
          let colTrichYeu = -1;
          let colDonViNhan = -1;
          let colLoaiVanBan = -1;
          let colDoKhan = -1;
          let colLinhVuc = -1;
          let colXuLyChinh = -1;

          // 1. Quét tìm dòng chứa Header (Quét an toàn ép kiểu String)
          for (let r = 0; r < Math.min(15, rawRows.length); r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            let matchingCellsCount = 0;
            row.forEach((cellVal: any) => {
              const str = String(cellVal || '').toLowerCase().trim();
              if (!str) return;
              if (
                str.includes('ngày đến') || str.includes('ngay den') || str.includes('ngày nhận') ||
                str.includes('số đến') || str.includes('so den') ||
                str.includes('tác giả') || str.includes('nơi gửi') || str.includes('cơ quan') ||
                str.includes('ký hiệu') || str.includes('trích yếu') || str.includes('nội dung') ||
                str.includes('người nhận') || str.includes('đơn vị') ||
                str.includes('loại văn bản') || str.includes('độ khẩn') || str.includes('xử lý chính')
              ) {
                matchingCellsCount++;
              }
            });

            // Nhận diện dòng Header khi có ít nhất 3 từ khóa trùng khớp
            if (matchingCellsCount >= 3) {
              headerRowIndex = r;
              row.forEach((cellVal: any, cIdx: number) => {
                const str = String(cellVal || '').toLowerCase().trim();
                if (str.includes('ngày đến') || str.includes('ngay den')) colNgayDen = cIdx;
                else if (str.includes('số đến') && !str.includes('sổ lưu')) colSoDen = cIdx;
                else if (str.includes('tác giả') || str.includes('nơi gửi')) colTacGia = cIdx;
                else if (str.includes('ký hiệu')) colSoKyHieu = cIdx;
                else if (str.includes('ngày tháng') || str.includes('ngày văn bản')) colNgayVanBan = cIdx;
                else if (str.includes('trích yếu') || str.includes('nội dung')) colTrichYeu = cIdx;
                else if (str.includes('người nhận') || str.includes('đơn vị')) colDonViNhan = cIdx;
                else if (str.includes('loại văn bản')) colLoaiVanBan = cIdx;
                else if (str.includes('độ khẩn')) colDoKhan = cIdx;
                else if (str.includes('lĩnh vực')) colLinhVuc = cIdx;
                else if (str.includes('xử lý chính') || str.includes('chủ trì')) colXuLyChinh = cIdx;
              });
              break;
            }
          }

          // Fallback gán chỉ số cột mặc định nếu không quét tự động được
          if (headerRowIndex === -1) {
            // Xác định dòng chứa dữ liệu đầu tiên để tìm dòng header ngay trên nó
            for (let r = 0; r < Math.min(10, rawRows.length); r++) {
              const rowStr = rawRows[r] ? rawRows[r].join(' ').toLowerCase() : '';
              if (rowStr.includes('ngày đến') || rowStr.includes('số đến')) {
                headerRowIndex = r;
                break;
              }
            }
            if (headerRowIndex === -1) headerRowIndex = 2; // Mặc định Row 3 (Index 2) cho file dạng này
          }

          const maxCols = rawRows[headerRowIndex] ? rawRows[headerRowIndex].length : 13;
          const hasExtraColumn = maxCols >= 14 || (colDonViNhan !== -1 && colLoaiVanBan === -1);

          if (colNgayDen === -1) colNgayDen = 0;
          if (colSoDen === -1) colSoDen = 1;
          if (colTacGia === -1) colTacGia = 2;
          if (colSoKyHieu === -1) colSoKyHieu = 3;
          if (colNgayVanBan === -1) colNgayVanBan = 4;
          if (colTrichYeu === -1) colTrichYeu = 5;
          if (colDonViNhan === -1) colDonViNhan = 6;
          if (colLoaiVanBan === -1) colLoaiVanBan = hasExtraColumn ? 10 : 9;
          if (colDoKhan === -1) colDoKhan = hasExtraColumn ? 11 : 10;
          if (colLinhVuc === -1) colLinhVuc = hasExtraColumn ? 12 : 11;
          if (colXuLyChinh === -1) colXuLyChinh = hasExtraColumn ? 13 : 12;

          const startRow = headerRowIndex + 1;
          const sheetTasks: IncomingDocTask[] = [];
          const seenInFile = new Set<string>();
          let duplicateCount = 0;

          for (let r = startRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            let trichYeu = String(row[colTrichYeu] ?? '').trim();
            const soDen = String(row[colSoDen] ?? '').trim();
            const ngayDen = String(row[colNgayDen] ?? '').trim();
            const tacGia = String(row[colTacGia] ?? '').trim();
            const soKyHieu = String(row[colSoKyHieu] ?? '').trim();
            const ngayVanBan = String(row[colNgayVanBan] ?? '').trim();
            const donViNhan = String(row[colDonViNhan] ?? '').trim();
            const loaiVanBan = String(row[colLoaiVanBan] ?? '').trim();
            const doKhan = String(row[colDoKhan] ?? '').trim();
            const linhVuc = String(row[colLinhVuc] ?? '').trim();
            const xuLyChinh = String(row[colXuLyChinh] ?? '').trim();

            // Loại bỏ các dòng tiêu đề phụ lặp lại
            const rowCombined = (trichYeu + ' ' + soDen + ' ' + tacGia).toLowerCase();
            if (rowCombined.includes('ngày đến') && rowCombined.includes('số đến')) continue;
            if (rowCombined.includes('sổ lưu cấp số văn bản đến')) continue;
            if (trichYeu.toLowerCase().includes('tên loại và trích yếu')) continue;

            if (!trichYeu && !soDen && !soKyHieu && !tacGia) continue;

            let priority: 'THUONG' | 'KHAN' | 'KHAN_CAP' = 'THUONG';
            const lowerDoKhan = doKhan.toLowerCase();
            if (lowerDoKhan.includes('hỏa tốc') || lowerDoKhan.includes('hoa toc')) {
              priority = 'KHAN_CAP';
            } else if (lowerDoKhan.includes('khẩn') || lowerDoKhan.includes('khan')) {
              priority = 'KHAN';
            }

            const computedTitle = trichYeu || (soDen ? `Văn bản đến số ${soDen} (${soKyHieu || tacGia || 'Chưa trích yếu'})` : '');
            if (!computedTitle || computedTitle.trim().length < 3) continue;

            const itemPartial: Partial<IncomingDocTask> = {
              ngay_den: ngayDen,
              so_den: soDen,
              tac_gia: tacGia,
              so_ky_hieu: soKyHieu,
              ngay_van_ban: ngayVanBan,
              title: computedTitle,
              don_vi_nhan: donViNhan,
              loai_van_ban: loaiVanBan,
              do_khan: doKhan,
              priority,
              linh_vuc: linhVuc,
              xu_ly_chinh: xuLyChinh
            };

            const description = typeof buildIncomingDocDescription === 'function'
              ? buildIncomingDocDescription(itemPartial)
              : '';

            const isValid = Boolean(computedTitle && computedTitle.trim().length > 0);

            // Kiểm tra trùng lặp
            let isDuplicate = false;
            let duplicateReason = '';

            const uniqueKeyTitle = computedTitle.trim().toLowerCase();
            const uniqueKeySoDen = (soDen && soDen.toLowerCase() !== 'số đến') ? `sden_${soDen.trim().toLowerCase()}` : '';

            if (uniqueKeyTitle && seenInFile.has(uniqueKeyTitle)) {
              isDuplicate = true;
              duplicateReason = 'Trùng nội dung trích yếu với dòng khác trong cùng file Excel';
            } else if (uniqueKeySoDen && seenInFile.has(uniqueKeySoDen)) {
              isDuplicate = true;
              duplicateReason = `Trùng Số đến ${soDen} với dòng khác trong cùng file Excel`;
            } else if (Array.isArray(existingTasks) && existingTasks.length > 0) {
              const dupTask = existingTasks.find((t: any) => {
                if (uniqueKeySoDen && t.task_code && t.task_code.toLowerCase() === soDen.toLowerCase()) return true;
                if (uniqueKeyTitle && t.title && t.title.trim().toLowerCase() === uniqueKeyTitle) return true;
                return false;
              });
              if (dupTask) {
                isDuplicate = true;
                duplicateReason = `Trùng với nhiệm vụ đã có trong Hệ thống: "${dupTask.title}"`;
              }
            }

            if (uniqueKeyTitle) seenInFile.add(uniqueKeyTitle);
            if (uniqueKeySoDen) seenInFile.add(uniqueKeySoDen);

            if (isDuplicate) duplicateCount++;

            sheetTasks.push({
              id: `import_row_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              ngay_den: ngayDen,
              so_den: soDen,
              tac_gia: tacGia,
              so_ky_hieu: soKyHieu,
              ngay_van_ban: ngayVanBan,
              title: computedTitle,
              don_vi_nhan: donViNhan,
              loai_van_ban: loaiVanBan,
              do_khan: doKhan,
              priority,
              linh_vuc: linhVuc,
              xu_ly_chinh: xuLyChinh,
              due_date: '',
              description,
              selected: isValid && !isDuplicate,
              isValid,
              isDuplicate,
              duplicateReason,
              errorMessage: isValid ? (isDuplicate ? duplicateReason : undefined) : 'Thiếu nội dung trích yếu văn bản'
            });
          }

          if (sheetTasks.length > bestTaskCount) {
            bestTaskCount = sheetTasks.length;
            bestResult = { tasks: sheetTasks, duplicateCount };
          }
        }

        if (!bestResult || bestResult.tasks.length === 0) {
          throw new Error('STRUCT_ERROR: Không tìm thấy dữ liệu văn bản đến hợp lệ trong file Excel. Vui lòng kiểm tra file Excel có chứa bảng số đến/trích yếu văn bản.');
        }

        resolve({ tasks: bestResult.tasks, fileName: file.name, duplicateCount: bestResult.duplicateCount });
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

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

  ws['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 35 },
    { wch: 25 },
    { wch: 15 },
    { wch: 60 },
    { wch: 45 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "VB đến");
  XLSX.writeFile(wb, "Mau_So_Van_Ban_Den_2026.xlsx");
}