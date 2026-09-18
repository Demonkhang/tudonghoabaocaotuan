export interface TaskTable1 {
  id: string;
  noi_dung: string;
  thoi_gian: string;
  trien_khai: string;
  tien_do: 'Hoàn thành' | 'Đang thực hiện' | 'Chưa thực hiện' | 'Hoàn thành trễ' | string;
  san_pham?: string;
  file_minh_chung?: string;
  file_original_name?: string;
  nhom: 'Thường xuyên' | 'Đột xuất';
  isEdited?: boolean;
  is_directive_task?: boolean;
  assigner_name?: string;
  task_code?: string;
  originalData?: any;
}

export interface TaskTable2 {
  id: string;
  noi_dung: string;
  thoi_gian_du_kien: string;
  san_pham_du_kien: string;
  nhom: 'Thường xuyên' | 'Đột xuất';
  isEdited?: boolean;
  originalData?: any;
}

export interface ReportMetadata {
  tuan: number;
  tuan_tiep: number;
  nam: number;
  nguoi_lap: string;
  don_vi: string;
  co_quan_cap_tren: string;
  ngay_lap: string;
}

export interface ValidationError {
  id: string;
  title: string;
  message: string;
  table: 'Bảng I' | 'Bảng II' | 'Hệ thống';
  rowId?: string;
  type: 'error' | 'warning';
}

/**
 * BR03: Tự động phân loại Nhiệm vụ Thường xuyên / Đột xuất
 */
export function classifyTask(noiDung: string): 'Thường xuyên' | 'Đột xuất' {
  if (!noiDung) return 'Thường xuyên';
  const lower = noiDung.toLowerCase();
  const keywords = [
    'đột xuất', 'khẩn', 'phát sinh', 'chỉ đạo', 'yêu cầu mới',
    'hội nghị', 'chuyển đổi số', 'dự án a', 'kiểm tra thực địa'
  ];
  if (keywords.some(kw => lower.includes(kw))) {
    return 'Đột xuất';
  }
  return 'Thường xuyên';
}

/**
 * Lọc bỏ các ô/dòng dữ liệu tiêu đề hành chính, tiêu đề bảng, số thứ tự bị lệch
 */
export function isIgnoredRow(text: string): boolean {
  if (!text) return true;
  const lower = String(text).toLowerCase().trim();
  if (!lower) return true;

  if (/^\d+$/.test(lower) || lower === 'i' || lower === 'ii' || lower === 'iii' || lower === 'iv' || lower === 'stt') {
    return true;
  }

  // Exact document title lines
  if (
    lower === 'báo cáo' ||
    lower === 'báo cáo kết quả' ||
    lower.startsWith('báo cáo kết quả thực hiện nhiệm vụ') ||
    lower.startsWith('báo cáo tình hình thực hiện nhiệm vụ')
  ) {
    return true;
  }

  // Administrative headers
  if (
    lower.includes('cộng hòa xã hội') ||
    lower.includes('độc lập - tự do') ||
    lower.includes('độc lập – tự do') ||
    (lower.includes('ubnd thành phố') && lower.length < 40 && !lower.includes('triển khai') && !lower.includes('báo cáo') && !lower.includes('thực hiện') && !lower.includes('nhiệm vụ')) ||
    (lower.includes('ủy ban nhân dân') && lower.length < 45 && !lower.includes('triển khai') && !lower.includes('báo cáo') && !lower.includes('thực hiện') && !lower.includes('nhiệm vụ')) ||
    lower.includes('ban quản lý các khu') ||
    lower.includes('văn phòng hđnd') ||
    (lower.includes('văn phòng') && lower.length < 35 && !lower.includes('nhiệm vụ') && !lower.includes('công tác') && !lower.includes('hồ sơ') && !lower.includes('tài liệu')) ||
    (lower.startsWith('thành phố hồ chí minh') && lower.length < 50 && (lower.includes('ngày') || lower.includes('tháng')) && !lower.includes('quy chế') && !lower.includes('nhiệm vụ') && !lower.includes('báo cáo') && !lower.includes('kế hoạch')) ||
    lower.includes('kính gửi:') ||
    lower.includes('phương hướng thực hiện') ||
    lower.includes('nơi nhận:') ||
    lower.includes('người báo cáo') ||
    lower.includes('bộ phận tổng hợp') ||
    lower.includes('trần thuận hóa') ||
    lower.includes('nguyễn văn a') ||
    lower.includes('lưu: vp') ||
    lower.includes('lưu: vt')
  ) {
    return true;
  }

  // Column Headers
  if (
    lower.includes('nội dung nhiệm vụ/ công tác') ||
    lower.includes('thời gian được giao') ||
    lower.includes('triển khai thực hiện') ||
    lower.includes('tiến độ thực hiện') ||
    (lower.includes('nhiệm vụ/công tác') && lower.length < 30) ||
    lower.includes('thời gian dự kiến') ||
    lower.includes('sản phẩm dự kiến')
  ) {
    return true;
  }

  // Section Subheaders
  if (
    lower.includes('nhiệm vụ thường xuyên (') ||
    lower === 'nhiệm vụ thường xuyên' ||
    lower.includes('nhiệm vụ theo bút phê') ||
    lower.includes('chỉ đạo đột xuất (') ||
    lower.includes('kế hoạch thực hiện công tác tuần') ||
    lower.includes('kết quả thực hiện công tác tuần') ||
    lower.includes('khó khăn, vướng mắc, đề xuất')
  ) {
    return true;
  }

  return false;
}

export function isRoutineTime(timeStr: string | undefined | null): boolean {
  if (!timeStr) return true;
  const lower = String(timeStr).toLowerCase().trim();
  if (
    lower.includes('thường xuyên') ||
    lower.includes('thuong xuyen') ||
    lower.includes('trong tuần') ||
    lower.includes('trong tuan') ||
    lower.includes('chưa nhập') ||
    lower === ''
  ) {
    return true;
  }
  return false;
}

export function parseVietDate(str: string | undefined | null): number | null {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const rawYear = match[3];
    const year = rawYear ? (rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10)) : 2026;
    return new Date(year, month - 1, day).getTime();
  }
  return null;
}

export function sortTasksByTime<T extends { thoi_gian?: string; thoi_gian_du_kien?: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const timeA = a.thoi_gian || a.thoi_gian_du_kien || '';
    const timeB = b.thoi_gian || b.thoi_gian_du_kien || '';

    const routineA = isRoutineTime(timeA);
    const routineB = isRoutineTime(timeB);

    if (!routineA && routineB) return -1;
    if (routineA && !routineB) return 1;

    if (!routineA && !routineB) {
      const dateA = parseVietDate(timeA);
      const dateB = parseVietDate(timeB);
      if (dateA !== null && dateB !== null) {
        return dateA - dateB;
      }
    }

    return 0;
  });
}

/**
 * BR07 & BR08: Tự động phân nhóm, sắp xếp ngày ở trên, Thường xuyên ở dưới & đánh lại STT bắt đầu từ 1
 */
export function processTable1(tasks: TaskTable1[]) {
  const cleanTasks = tasks.filter(t => !isIgnoredRow(t.noi_dung));

  const sortedTx = sortTasksByTime(cleanTasks.filter(t => t.nhom === 'Thường xuyên'));
  const sortedDx = sortTasksByTime(cleanTasks.filter(t => t.nhom === 'Đột xuất'));

  const thuongXuyen = sortedTx.map((t, idx) => ({ ...t, stt: idx + 1 }));
  const dotXuat = sortedDx.map((t, idx) => ({ ...t, stt: idx + 1 }));

  const txDone = thuongXuyen.filter(t => t.tien_do === 'Hoàn thành').length;
  const dxDone = dotXuat.filter(t => t.tien_do === 'Hoàn thành').length;

  return {
    thuongXuyen,
    dotXuat,
    txStats: { done: txDone, total: thuongXuyen.length },
    dxStats: { done: dxDone, total: dotXuat.length },
    totalStats: { done: txDone + dxDone, total: cleanTasks.length }
  };
}

export function processTable2(tasks: TaskTable2[]) {
  const cleanTasks = tasks.filter(t => !isIgnoredRow(t.noi_dung));

  const sortedTx = sortTasksByTime(cleanTasks.filter(t => t.nhom === 'Thường xuyên'));
  const sortedDx = sortTasksByTime(cleanTasks.filter(t => t.nhom === 'Đột xuất'));

  const thuongXuyen = sortedTx.map((t, idx) => ({ ...t, stt: idx + 1 }));
  const dotXuat = sortedDx.map((t, idx) => ({ ...t, stt: idx + 1 }));

  return {
    thuongXuyen,
    dotXuat,
    txTotal: thuongXuyen.length,
    dxTotal: dotXuat.length,
    total: cleanTasks.length
  };
}

/**
 * BR14: Validation Engine - Kiểm tra tính hợp lệ của dữ liệu
 */
export function validateReport(table1: TaskTable1[], table2: TaskTable2[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Kiểm tra Bảng I: Thiếu tiến độ hoặc thời gian
  table1.forEach((t, idx) => {
    if (!t.tien_do || t.tien_do.trim() === '' || t.tien_do === 'Chưa nhập') {
      errors.push({
        id: `err_t1_progress_${t.id}`,
        title: `Dòng ${idx + 1} chưa nhập tiến độ`,
        message: `Vui lòng chọn trạng thái tiến độ cho nhiệm vụ "${t.noi_dung || 'Nhiệm vụ'}".`,
        table: 'Bảng I',
        rowId: t.id,
        type: 'error'
      });
    }
    if (!t.thoi_gian || t.thoi_gian === 'Chưa nhập') {
      errors.push({
        id: `err_t1_time_${t.id}`,
        title: `Dòng ${idx + 1} thiếu thời gian hoàn thành`,
        message: `Thời gian hoàn thành không được để trống.`,
        table: 'Bảng I',
        rowId: t.id,
        type: 'error'
      });
    }
  });

  // 2. Kiểm tra trùng lặp nhiệm vụ
  const seenContent = new Map<string, number>();
  table1.forEach((t, idx) => {
    if (!t.noi_dung) return;
    const clean = t.noi_dung.toLowerCase().trim();
    if (seenContent.has(clean)) {
      const prevIdx = seenContent.get(clean)!;
      errors.push({
        id: `err_duplicate_${t.id}`,
        title: 'Nhiệm vụ bị trùng',
        message: `Phát hiện nội dung tương tự tại Dòng ${prevIdx + 1} và Dòng ${idx + 1}.`,
        table: 'Hệ thống',
        rowId: t.id,
        type: 'warning'
      });
    } else {
      seenContent.set(clean, idx);
    }
  });

  // 3. Kiểm tra Bảng II: Thiếu sản phẩm dự kiến
  table2.forEach((t, idx) => {
    if (!t.san_pham_du_kien || t.san_pham_du_kien.trim() === '') {
      errors.push({
        id: `err_t2_product_${t.id}`,
        title: `Bảng II Dòng ${idx + 1} thiếu sản phẩm dự kiến`,
        message: `Vui lòng nhập sản phẩm dự kiến cho kế hoạch "${t.noi_dung || 'Công tác'}".`,
        table: 'Bảng II',
        rowId: t.id,
        type: 'warning'
      });
    }
  });

  return errors;
}

/**
 * Chuyển đổi chuỗi ngày bất kỳ sang định dạng HTML input date (YYYY-MM-DD)
 */
export function toInputDate(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const val = rawDate.trim();

  // Tách lấy phần ngày trước khoảng trắng hoặc chữ 'T' (Ví dụ: "2026-09-17 08:53:51" -> "2026-09-17")
  let cleanVal = val.split(' ')[0].split('T')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) {
    return cleanVal;
  }

  if (cleanVal.includes('/')) {
    const parts = cleanVal.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      if (!isNaN(Number(d)) && !isNaN(Number(m)) && !isNaN(Number(y))) {
        return `${y}-${m}-${d}`;
      }
    }
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Định dạng Ngày lập báo cáo chuẩn thể thức văn bản hành chính (NĐ 30/2020/NĐ-CP)
 */
export function formatNgayLap(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) {
    const now = new Date();
    return `Thành phố Hồ Chí Minh, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }

  const val = rawDate.trim();
  if (val.toLowerCase().startsWith('thành phố')) return val;
  if (val.toLowerCase().startsWith('ngày') || val.toLowerCase().includes('tháng')) {
    return `Thành phố Hồ Chí Minh, ${val}`;
  }

  // Tách lấy phần ngày trước khoảng trắng hoặc chữ 'T'
  let cleanVal = val.split(' ')[0].split('T')[0];

  if (cleanVal.includes('/')) {
    const parts = cleanVal.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[2];
      if (!isNaN(day) && !isNaN(month)) {
        return `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
      }
    }
  } else if (cleanVal.includes('-')) {
    const parts = cleanVal.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month)) {
        return `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
      }
    }
  }

  return `Thành phố Hồ Chí Minh, ${val}`;
}
