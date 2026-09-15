export interface TaskTable1 {
  id: string;
  noi_dung: string;
  thoi_gian: string;
  trien_khai: string;
  tien_do: 'Hoàn thành' | 'Đang thực hiện' | 'Chưa thực hiện' | 'Hoàn thành trễ' | string;
  nhom: 'Thường xuyên' | 'Đột xuất';
  isEdited?: boolean;
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
  const lower = text.toLowerCase().trim();

  // Đơn thuần là số thứ tự hoặc ký tự La Mã cô lập
  if (/^\d+$/.test(lower) || lower === 'i' || lower === 'ii' || lower === 'iii' || lower === 'iv' || lower === 'stt') {
    return true;
  }

  // Tiêu đề Quốc hiệu, Cơ quan, Báo cáo, Kính gửi, Chữ ký
  if (
    lower.includes('cộng hòa xã hội') ||
    lower.includes('độc lập - tự do') ||
    lower.includes('độc lập – tự do') ||
    lower.includes('ubnd thành phố') ||
    lower.includes('ủy ban nhân dân') ||
    lower.includes('ban quản lý các khu') ||
    lower.includes('văn phòng hđnd') ||
    (lower.includes('văn phòng') && lower.length < 35) ||
    lower.includes('thành phố hồ chí minh') ||
    lower.includes('báo cáo kết quả') ||
    (lower.startsWith('báo cáo') && lower.length < 45) ||
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

  // Header cột bảng
  if (
    lower.includes('nội dung nhiệm vụ') ||
    lower.includes('thời gian được giao') ||
    lower.includes('triển khai thực hiện') ||
    lower.includes('tiến độ thực hiện') ||
    lower.includes('nhiệm vụ/công tác') ||
    lower.includes('thời gian dự kiến') ||
    lower.includes('sản phẩm dự kiến')
  ) {
    return true;
  }

  // Subheader nhóm
  if (
    lower.includes('nhiệm vụ thường xuyên') ||
    lower.includes('nhiệm vụ theo bút phê') ||
    lower.includes('chỉ đạo đột xuất') ||
    lower.includes('kế hoạch thực hiện công tác') ||
    lower.includes('kết quả thực hiện công tác') ||
    lower.includes('khó khăn, vướng mắc')
  ) {
    return true;
  }

  return false;
}

/**
 * BR07 & BR08: Tự động phân nhóm, đánh lại STT bắt đầu từ 1 & đếm số hoàn thành
 */
export function processTable1(tasks: TaskTable1[]) {
  const cleanTasks = tasks.filter(t => !isIgnoredRow(t.noi_dung));

  const thuongXuyen = cleanTasks
    .filter(t => t.nhom === 'Thường xuyên')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  const dotXuat = cleanTasks
    .filter(t => t.nhom === 'Đột xuất')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

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

  const thuongXuyen = cleanTasks
    .filter(t => t.nhom === 'Thường xuyên')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  const dotXuat = cleanTasks
    .filter(t => t.nhom === 'Đột xuất')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

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
