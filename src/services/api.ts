/**
 * API Service kết nối Backend Express Node.js & Fallback Client-side Word export
 */
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { sortTasksByTime } from '../utils/reportUtils';

export async function fetchSyncedData() {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) throw new Error('Không thể đồng bộ dữ liệu');
    const result = await res.json();
    return result;
  } catch (error) {
    console.warn('Sử dụng dữ liệu mẫu dự phòng do lỗi kết nối:', error);
    return {
      success: true,
      data: getFallbackData(),
      syncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      totalTasks: 15
    };
  }
}

export async function fetchReportDetail(departmentId: string, week: number, year: number, reportId?: string, accountId?: string) {
  try {
    let url = reportId
      ? `/api/reports/detail?report_id=${reportId}`
      : `/api/reports/detail?department_id=${departmentId}&week=${week}&year=${year}`;

    if (accountId) {
      url += `&account_id=${accountId}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Không thể tải chi tiết báo cáo');
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Fallback fetchReportDetail:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchReportHistory(departmentId?: string, accountId?: string) {
  try {
    let url = '/api/reports/history?';
    if (departmentId) url += `department_id=${departmentId}&`;
    if (accountId) url += `account_id=${accountId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải lịch sử báo cáo');
    return await res.json();
  } catch (err: any) {
    console.warn('Lỗi fetchReportHistory:', err);
    return { success: false, reports: [] };
  }
}

export async function saveReportData(payload: any, accountId?: string) {
  try {
    const body = {
      ...payload,
      account_id: accountId || payload.metadata?.account_id
    };

    const res = await fetch('/api/reports/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Lỗi khi lưu báo cáo');
    }
    return result;
  } catch (err: any) {
    console.error('Lỗi khi lưu báo cáo:', err);
    return { success: false, error: err.message };
  }
}

export async function shareReportApi(reportId: string, sharedWithAccountId: string, permission: 'VIEW' | 'EDIT', senderAccountId: string) {
  try {
    const res = await fetch('/api/reports/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: reportId,
        shared_with_account_id: sharedWithAccountId,
        permission,
        sender_account_id: senderAccountId
      })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchReportShares(reportId: string) {
  try {
    const res = await fetch(`/api/reports/shares?report_id=${reportId}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, shares: [] };
  }
}

export async function revokeReportShareApi(shareId: string) {
  try {
    const res = await fetch(`/api/reports/shares/${shareId}`, { method: 'DELETE' });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchNotifications(accountId: string) {
  try {
    const res = await fetch(`/api/notifications?account_id=${accountId}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, notifications: [], unread_count: 0 };
  }
}

export async function markNotificationReadApi(notificationId?: string, accountId?: string, markAll = false) {
  try {
    const res = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId, account_id: accountId, mark_all: markAll })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false };
  }
}

export async function triggerCarryOver(departmentId: string, currentWeek: number, currentYear: number, accountId: string) {
  try {
    const res = await fetch('/api/reports/carry-over', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department_id: departmentId,
        current_week: currentWeek,
        current_year: currentYear,
        account_id: accountId
      })
    });
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi triggerCarryOver:', err);
    return { success: false, error: err.message };
  }
}

export async function exportWordReport(payload: any) {
  try {
    const res = await fetch('/api/generate-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Lỗi từ Server');
    }

    const blob = await res.blob();
    downloadBlob(blob, `BAO_CAO_TUAN_${payload.metadata?.tuan || 42}_${payload.metadata?.nam || 2026}.docx`);
  } catch (error: any) {
    console.warn('Backend Word Export API không khả dụng, chuyển sang chế độ tạo file Word trực tiếp ở Client:', error);
    try {
      generateWordClientSide(payload);
    } catch (clientErr: any) {
      alert('Lỗi xuất file Word: ' + clientErr.message);
    }
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Xuất file Word trực tiếp ở Client khi không kết nối được Express Backend
 */
function generateWordClientSide(payload: any) {
  const formattedData = formatDataForTemplate(payload);
  const zip = createDocxZipTemplate();

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    }
  });

  doc.render(formattedData);

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });

  downloadBlob(out, `BAO_CAO_TUAN_${payload.metadata?.tuan || 42}_${payload.metadata?.nam || 2026}.docx`);
}

function formatNgayLap(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) {
    const now = new Date();
    return `Thành phố Hồ Chí Minh, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }

  const val = rawDate.trim();
  if (val.toLowerCase().startsWith('thành phố')) return val;
  if (val.toLowerCase().startsWith('ngày') || val.toLowerCase().includes('tháng')) {
    return `Thành phố Hồ Chí Minh, ${val}`;
  }

  if (val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[2];
      if (!isNaN(day) && !isNaN(month)) {
        return `Thành phố Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
      }
    }
  } else if (val.includes('-')) {
    const parts = val.split('-');
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

function isIgnoredRow(text: string): boolean {
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

function classifyTask(noiDung: string): 'Thường xuyên' | 'Đột xuất' {
  if (!noiDung) return 'Thường xuyên';
  const lower = String(noiDung).toLowerCase();
  const keywords = [
    'đột xuất', 'khẩn', 'phát sinh', 'chỉ đạo', 'yêu cầu mới',
    'hội nghị', 'chuyển đổi số', 'dự án a', 'kiểm tra thực địa'
  ];
  if (keywords.some(kw => lower.includes(kw))) {
    return 'Đột xuất';
  }
  return 'Thường xuyên';
}

function formatDataForTemplate(data: any) {
  const metadata = data.metadata || {};

  const cleanTable1 = (data.table1 || []).filter((item: any) => {
    if (!item) return false;
    const noiDung = item.noi_dung || item.noiDung || item.task || '';
    return noiDung.trim().length > 0 && !isIgnoredRow(noiDung);
  });

  const tx1Raw = cleanTable1.filter((t: any) => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx1Raw = cleanTable1.filter((t: any) => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

  const tx1 = sortTasksByTime(tx1Raw);
  const dx1 = sortTasksByTime(dx1Raw);

  const thuongxuyen_ketqua = tx1.map((item: any, idx: number) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian: item.thoi_gian || item.thoiGian || item.time || 'Chưa nhập',
    trien_khai: item.trien_khai || item.trienKhai || item.san_pham || '',
    tien_do: item.tien_do || item.tienDo || 'Đang thực hiện'
  }));

  const dotxuat_ketqua = dx1.map((item: any, idx: number) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian: item.thoi_gian || item.thoiGian || item.time || 'Chưa nhập',
    trien_khai: item.trien_khai || item.trienKhai || item.san_pham || '',
    tien_do: item.tien_do || item.tienDo || 'Đang thực hiện'
  }));

  const cleanTable2 = (data.table2 || []).filter((item: any) => {
    if (!item) return false;
    const noiDung = item.noi_dung || item.noiDung || item.task || '';
    return noiDung.trim().length > 0 && !isIgnoredRow(noiDung);
  });

  const tx2Raw = cleanTable2.filter((t: any) => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx2Raw = cleanTable2.filter((t: any) => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

  const tx2 = sortTasksByTime(tx2Raw);
  const dx2 = sortTasksByTime(dx2Raw);

  const thuongxuyen_kehoach = tx2.map((item: any, idx: number) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian_du_kien: item.thoi_gian_du_kien || item.thoi_gian || item.thoiGian || 'Trong tuần',
    san_pham_du_kien: item.san_pham_du_kien || item.san_pham || item.sanPham || ''
  }));

  const dotxuat_kehoach = dx2.map((item: any, idx: number) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian_du_kien: item.thoi_gian_du_kien || item.thoi_gian || item.thoiGian || 'Trong tuần',
    san_pham_du_kien: item.san_pham_du_kien || item.san_pham || item.sanPham || ''
  }));

  const tx1Done = tx1.filter((t: any) => (t.tien_do || t.tienDo) === 'Hoàn thành').length;
  const dx1Done = dx1.filter((t: any) => (t.tien_do || t.tienDo) === 'Hoàn thành').length;
  const totalDone = tx1Done + dx1Done;
  const totalT1 = cleanTable1.length;
  const tileDone = totalT1 > 0 ? Math.round((totalDone / totalT1) * 100) + '%' : '0%';

  return {
    co_quan_cap_tren: metadata.co_quan_cap_tren || 'BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ',
    ten_don_vi: metadata.don_vi || 'VĂN PHÒNG',
    nam: metadata.nam || 2026,
    tuan: metadata.tuan || 42,
    tuan_tiep: metadata.tuan_tiep || (metadata.tuan ? metadata.tuan + 1 : 43),
    ngay_lap: formatNgayLap(metadata.ngay_lap),
    nguoi_lap: metadata.nguoi_lap || '',
    kho_khan: metadata.kho_khan || 'Không',

    tong_nhiem_vu: totalT1,
    hoan_thanh_count: totalDone,
    dang_thuc_hien_count: totalT1 - totalDone,
    tile_hoan_thanh: tileDone,

    thuongxuyen_hoanthanh: `${tx1Done}/${tx1.length}`,
    dotxuat_hoanthanh: `${dx1Done}/${dx1.length}`,
    thuongxuyen_kehoach_count: tx2.length,
    dotxuat_kehoach_count: dx2.length,

    thuongxuyen_ketqua,
    dotxuat_ketqua,
    thuongxuyen_kehoach,
    dotxuat_kehoach
  };
}

function createDocxZipTemplate() {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- HEADER 2 CỘT QUỐC HIỆU - TIÊU NGỮ & CƠ QUAN -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
          <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="60" w:type="dxa"/>
          <w:bottom w:w="60" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="4300" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>{co_quan_cap_tren}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>{ten_don_vi}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5055" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- NGÀY THÁNG BAN HÀNH -->
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="120" w:after="240"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{ngay_lap}</w:t></w:r>
    </w:p>

    <!-- TIÊU ĐỀ BÁO CÁO -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="28"/><w:color w:val="000000"/></w:rPr><w:t>BÁO CÁO</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kết quả thực hiện nhiệm vụ Tuần {tuan} trọng tâm công tác Tuần {tuan_tiep}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kính gửi: Chánh Văn Phòng.</w:t></w:r>
    </w:p>

    <!-- KÍNH GỬI & LỜI Mở ĐẦU -->
    <w:p>
      <w:pPr><w:spacing w:after="200" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Báo cáo tình hình thực hiện nhiệm vụ Tuần {tuan} và phương hướng thực hiện nhiệm vụ trọng tâm công tác Tuần {tuan_tiep} như sau:</w:t></w:r>
    </w:p>

    <!-- SECTION I: BẢNG KẾT QUẢ CÔNG TÁC -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>I. Kết quả thực hiện công tác Tuần {tuan}</w:t></w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="100" w:type="dxa"/>
          <w:bottom w:w="100" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="600"/>
        <w:gridCol w:w="3200"/>
        <w:gridCol w:w="1500"/>
        <w:gridCol w:w="2555"/>
        <w:gridCol w:w="1500"/>
      </w:tblGrid>
      <!-- HEADER ROW -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nội dung nhiệm vụ/ công tác được giao¹.</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Thời gian được giao hoàn thiện nhiệm vụ</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2555" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Triển khai thực hiện².</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Tiến độ thực hiện³.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- SUBHEADER NHÓM I -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>I</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ thường xuyên ({thuongxuyen_hoanthanh} Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- DATA LOOP NHÓM I -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#thuongxuyen_ketqua}{stt}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/thuongxuyen_ketqua}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- SUBHEADER NHÓM II -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…) ({dotxuat_hoanthanh} Nhiệm vụ hoàn thành/tổng số nhiệm vụ được giao trong tuần)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- DATA LOOP NHÓM II -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#dotxuat_ketqua}{stt}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/dotxuat_ketqua}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG I -->
    <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>¹ Nêu đầu mục nhiệm vụ mang tính bao quát, tổng thể.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>² Các công việc đã triển khai thực hiện liên quan đến nhiệm vụ đã thực hiện trong tuần, kèm sản phẩm cụ thể (nếu có).</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>³ Đánh giá tiến độ thực hiện công việc: Hoàn thành – đúng hạn, hoàn thành – trễ hạn, đang thực hiện – chưa tới hạn, đang thực hiện – quá hạn.</w:t></w:r></w:p>

    <!-- SECTION II: BẢNG KẾ HOẠCH CÔNG TÁC TUẦN TIẾP THEO -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>II. Kế hoạch thực hiện công tác Tuần {tuan_tiep} (Tuần tiếp theo)</w:t></w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="100" w:type="dxa"/>
          <w:bottom w:w="100" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="600"/>
        <w:gridCol w:w="3800"/>
        <w:gridCol w:w="1655"/>
        <w:gridCol w:w="3300"/>
      </w:tblGrid>
      <!-- HEADER ROW -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ/công tác</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1655" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Thời gian dự kiến hoàn thành</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3300" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nội dung và sản phẩm dự kiến thực hiện⁴.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- SUBHEADER NHÓM I -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>I</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ thường xuyên</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- DATA LOOP NHÓM I -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#thuongxuyen_kehoach}{stt}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/thuongxuyen_kehoach}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- SUBHEADER NHÓM II -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- DATA LOOP NHÓM II -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#dotxuat_kehoach}{stt}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/dotxuat_kehoach}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG II -->
    <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>⁴ Nội dung dự kiến thực hiện bao gồm các nhiệm vụ con liên quan đến nhiệm vụ tổng thể, bao quát được giao.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>Sản phẩm dự kiến: Quyết định, Công văn, Phiếu trình, Tờ trình….</w:t></w:r></w:p>

    <!-- SECTION III: KHÓ KHĂN VƯỚNG MẮC -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>III. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/><w:ind w:left="360"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{kho_khan}</w:t></w:r>
    </w:p>

    <!-- NƠI NHẬN VÀ CHỮ KÝ 2 CỘNG BORDER NONE -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
          <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="4677" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>Nơi nhận:</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>- Như trên;</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>- Bộ phận Tổng hợp;</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>- Lưu: VP.</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4678" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>NGƯỜI BÁO CÁO</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="400"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{nguoi_lap}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- SECTION PROPERTIES: A4 (210x297 mm) & MARGINS (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm) -->
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('word/document.xml', docXml);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:color w:val="000000"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  return zip;
}

export async function exportPdfReport(payload: any) {
  try {
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    return result;
  } catch (error) {
    console.error('Pdf export fallback:', error);
  }
}

function getFallbackData() {
  return {
    metadata: {
      tuan: 42,
      tuan_tiep: 43,
      nam: 2024,
      nguoi_lap: "Trần Thuận Hóa",
      don_vi: "VĂN PHÒNG",
      co_quan_cap_tren: "BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ",
      ngay_lap: "20/10/2024"
    },
    table1: [
      {
        id: "t1_1",
        noi_dung: "Rà soát hồ sơ công chức quý IV",
        thoi_gian: "15/10/2024",
        trien_khai: "Đã hoàn thành rà soát 45 bộ hồ sơ",
        tien_do: "Hoàn thành",
        nhom: "Thường xuyên",
        isEdited: false
      },
      {
        id: "t1_2",
        noi_dung: "Báo cáo tổng kết tháng",
        thoi_gian: "Chưa nhập",
        trien_khai: "Đang soạn thảo văn bản",
        tien_do: "Đang thực hiện",
        nhom: "Thường xuyên",
        isEdited: true
      },
      {
        id: "t1_3",
        noi_dung: "Phối hợp tổ chức Hội nghị Chuyển đổi số",
        thoi_gian: "20/10/2024",
        trien_khai: "Đã gửi giấy mời, chốt danh sách đại biểu",
        tien_do: "Đang thực hiện",
        nhom: "Đột xuất",
        isEdited: false
      },
      {
        id: "t1_4",
        noi_dung: "Kiểm tra công tác lưu trữ hồ sơ",
        thoi_gian: "18/10/2024",
        trien_khai: "Đã thực hiện tại 3 đơn vị trực thuộc",
        tien_do: "Hoàn thành",
        nhom: "Thường xuyên",
        isEdited: false
      },
      {
        id: "t1_5",
        noi_dung: "Tập huấn phần mềm quản lý văn bản",
        thoi_gian: "22/10/2024",
        trien_khai: "Chuẩn bị tài liệu và phòng họp",
        tien_do: "Đang thực hiện",
        nhom: "Đột xuất",
        isEdited: false
      },
      {
        id: "t1_6",
        noi_dung: "Tổng hợp đề xuất khen thưởng",
        thoi_gian: "Chưa nhập",
        trien_khai: "Đã gửi văn bản nhắc nhở các phòng ban",
        tien_do: "Hoàn thành",
        nhom: "Thường xuyên",
        isEdited: false
      }
    ],
    table2: [
      {
        id: "t2_1",
        noi_dung: "Tiếp nhận hồ sơ trực tuyến",
        thoi_gian_du_kien: "Hàng ngày",
        san_pham_du_kien: "100% hồ sơ được giải quyết đúng hạn",
        nhom: "Thường xuyên",
        isEdited: false
      },
      {
        id: "t2_2",
        noi_dung: "Xây dựng kế hoạch công tác quý I",
        thoi_gian_du_kien: "28/10/2024",
        san_pham_du_kien: "Dự thảo văn bản trình Lãnh đạo duyệt",
        nhom: "Thường xuyên",
        isEdited: false
      },
      {
        id: "t2_3",
        noi_dung: "Kiểm tra thực địa dự án A",
        thoi_gian_du_kien: "25/10/2024",
        san_pham_du_kien: "Biên bản ghi nhận hiện trạng chi tiết",
        nhom: "Đột xuất",
        isEdited: false
      },
      {
        id: "t2_4",
        noi_dung: "Đánh giá chất lượng dịch vụ công",
        thoi_gian_du_kien: "30/10/2024",
        san_pham_du_kien: "Báo cáo phân tích dữ liệu khảo sát hài lòng",
        nhom: "Thường xuyên",
        isEdited: false
      }
    ]
  };
}

export async function fetchAdminAccounts() {
  try {
    const res = await fetch('/api/admin/accounts');
    if (!res.ok) throw new Error('Không thể tải danh sách tài khoản');
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi fetchAdminAccounts:', err);
    return { success: false, error: err.message };
  }
}

export async function createAdminAccount(accountData: any) {
  try {
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi createAdminAccount:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAdminAccount(id: string) {
  try {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi deleteAdminAccount:', err);
    return { success: false, error: err.message };
  }
}

export async function createAdminDepartment(deptData: any) {
  try {
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deptData)
    });
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi createAdminDepartment:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchCandidateTasks(departmentId: string, accountId?: string) {
  try {
    let url = `/api/reports/candidate-tasks?department_id=${encodeURIComponent(departmentId)}`;
    if (accountId) url += `&account_id=${encodeURIComponent(accountId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể lấy danh sách kho nhiệm vụ');
    return await res.json();
  } catch (err: any) {
    console.error('Lỗi fetchCandidateTasks:', err);
    return { success: false, tasks: [] };
  }
}

