import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (import.meta && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

/**
 * Xử lý tạo file Word .docx từ dữ liệu báo cáo tuần
 * Tuân thủ quy tắc BR01 - BR15 & Thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)
 */
export function createDocxReport(data) {
  const templatePath = process.env.TEMPLATE_PATH || path.join(currentDir, '../../templates/report_template.docx');

  // Luôn tạo file zip mẫu mới nhất chuẩn thể thức theo mẫu ảnh
  const zip = createMinimalDocxZip();

  try {
    const templateDir = path.dirname(templatePath);
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    fs.writeFileSync(templatePath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  } catch (e) {
    console.warn('Không thể lưu file report_template.docx đĩa:', e.message);
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    }
  });

  const formattedData = formatDataForTemplate(data);

  doc.render(formattedData);

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf;
}

/**
 * Định dạng Ngày lập báo cáo chuẩn thể thức
 */
export function formatNgayLap(rawDate) {
  if (!rawDate || !String(rawDate).trim()) {
    const now = new Date();
    return `Thành phố Hồ Chí Minh, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }

  const val = String(rawDate).trim();
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

/**
 * Tính ngày bắt đầu (Thứ 2) và ngày kết thúc (Chủ nhật) của Tuần thứ N trong năm
 */
export function getWeekDates(weekNumber, year) {
  try {
    const y = Number(year) || 2026;
    const w = Number(weekNumber) || 43;
    const simple = new Date(y, 0, 1 + (w - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = new Date(simple);
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    ISOweekStart.setDate(simple.getDate() + diff);

    const monday = new Date(ISOweekStart);
    const sunday = new Date(ISOweekStart);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      return `${day}/${month}/${yr}`;
    };

    return {
      tu_ngay: formatDate(monday),
      den_ngay: formatDate(sunday)
    };
  } catch (e) {
    return { tu_ngay: '...', den_ngay: '...' };
  }
}


/**
 * Lọc bỏ các dòng tiêu đề / subheader thừa từ file Excel
 */
export function isIgnoredRow(text) {
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

export function classifyTask(noiDung) {
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

function isRoutineTime(timeStr) {
  if (!timeStr) return true;
  const lower = String(timeStr).toLowerCase().trim();
  if (
    lower.includes('thường xuyên') ||
    lower.includes('thuong xuyen') ||
    lower.includes('trong tuần') ||
    lower.includes('trong tuan') ||
    lower.includes('hàng tuần') ||
    lower.includes('hang tuan') ||
    lower.includes('định kỳ') ||
    lower.includes('dinh ky') ||
    lower.includes('chưa nhập') ||
    lower === ''
  ) {
    return true;
  }
  return false;
}

function parseVietDate(str) {
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

function sortTasksByTime(tasks) {
  return [...tasks].sort((a, b) => {
    // 1. Ghim trọng tâm / Trục trọng tâm mặc định lên trên cùng
    const pinA = Boolean(a.is_pinned || a.isPinned || a.is_focus);
    const pinB = Boolean(b.is_pinned || b.isPinned || b.is_focus);
    if (pinA && !pinB) return -1;
    if (!pinA && pinB) return 1;

    // 2. Cái nào là thường xuyên thì đưa xuống dưới
    const timeA = a.thoi_gian || a.thoi_gian_du_kien || a.thoiGian || '';
    const timeB = b.thoi_gian || b.thoi_gian_du_kien || b.thoiGian || '';

    const routineA = isRoutineTime(timeA);
    const routineB = isRoutineTime(timeB);

    if (!routineA && routineB) return -1;
    if (routineA && !routineB) return 1;

    // 3. Sắp xếp theo ngày tăng dần nếu cả 2 có ngày cụ thể
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
 * Chuẩn hóa dữ liệu theo đúng danh sách thẻ Placeholder trong README_TEMPLATES.md
 */
export function formatDataForTemplate(data) {
  const metadata = data.metadata || {};

  // Lọc sạch Bảng I
  const cleanTable1 = (data.table1 || []).filter(item => {
    if (!item) return false;
    const noiDung = item.noi_dung || item.noiDung || item.task || '';
    return noiDung.trim().length > 0 && !isIgnoredRow(noiDung);
  });

  const tx1Raw = cleanTable1.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx1Raw = cleanTable1.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

  const tx1 = sortTasksByTime(tx1Raw);
  const dx1 = sortTasksByTime(dx1Raw);

  const thuongxuyen_ketqua = tx1.map((item, idx) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian: item.thoi_gian || item.thoiGian || item.time || 'Chưa nhập',
    trien_khai: item.trien_khai || item.trienKhai || item.san_pham || '',
    tien_do: item.tien_do || item.tienDo || 'Đang thực hiện'
  }));

  const dotxuat_ketqua = dx1.map((item, idx) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian: item.thoi_gian || item.thoiGian || item.time || 'Chưa nhập',
    trien_khai: item.trien_khai || item.trienKhai || item.san_pham || '',
    tien_do: item.tien_do || item.tienDo || 'Đang thực hiện'
  }));

  // Lọc sạch Bảng II
  const cleanTable2 = (data.table2 || []).filter(item => {
    if (!item) return false;
    const noiDung = item.noi_dung || item.noiDung || item.task || '';
    return noiDung.trim().length > 0 && !isIgnoredRow(noiDung);
  });

  const tx2Raw = cleanTable2.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx2Raw = cleanTable2.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

  const tx2 = sortTasksByTime(tx2Raw);
  const dx2 = sortTasksByTime(dx2Raw);

  const thuongxuyen_kehoach = tx2.map((item, idx) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian_du_kien: item.thoi_gian_du_kien || item.thoi_gian || item.thoiGian || 'Trong tuần',
    san_pham_du_kien: item.san_pham_du_kien || item.san_pham || item.sanPham || ''
  }));

  const dotxuat_kehoach = dx2.map((item, idx) => ({
    stt: idx + 1,
    noi_dung: item.noi_dung || item.noiDung || item.task || '',
    thoi_gian_du_kien: item.thoi_gian_du_kien || item.thoi_gian || item.thoiGian || 'Trong tuần',
    san_pham_du_kien: item.san_pham_du_kien || item.san_pham || item.sanPham || ''
  }));

  const isDone = (status) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return s.includes('hoàn thành') && !s.includes('chưa') && !s.includes('không');
  };

  const tx1Done = tx1.filter(t => isDone(t.tien_do || t.tienDo)).length;
  const dx1Done = dx1.filter(t => isDone(t.tien_do || t.tienDo)).length;
  const totalDone = tx1Done + dx1Done;
  const totalT1 = cleanTable1.length;
  const tileDone = totalT1 > 0 ? Math.round((totalDone / totalT1) * 100) + '%' : '0%';

  const finalTx1List = thuongxuyen_ketqua.length > 0 ? thuongxuyen_ketqua : [
    { stt: '...', noi_dung: '......', thoi_gian: '.......', trien_khai: '.......', tien_do: '........' }
  ];
  const finalDx1List = dotxuat_ketqua.length > 0 ? dotxuat_ketqua : [
    { stt: '...', noi_dung: '......', thoi_gian: '.......', trien_khai: '.......', tien_do: '........' }
  ];

  const finalTx2List = thuongxuyen_kehoach.length > 0 ? thuongxuyen_kehoach : [
    { stt: '...', noi_dung: '......', thoi_gian_du_kien: '.......', san_pham_du_kien: '........' }
  ];
  const finalDx2List = dotxuat_kehoach.length > 0 ? dotxuat_kehoach : [
    { stt: '...', noi_dung: '......', thoi_gian_du_kien: '.......', san_pham_du_kien: '........' }
  ];

  const weekDates = getWeekDates(metadata.tuan || 42, metadata.nam || 2026);
  const tu_ngay = metadata.tu_ngay || weekDates.tu_ngay || '...';
  const den_ngay = metadata.den_ngay || weekDates.den_ngay || '...';

  return {
    co_quan_cap_tren: metadata.co_quan_cap_tren || 'BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ',
    ten_don_vi: metadata.don_vi || 'VĂN PHÒNG',
    nam: metadata.nam || 2026,
    tuan: metadata.tuan || 42,
    tuan_tiep: metadata.tuan_tiep || (metadata.tuan ? metadata.tuan + 1 : 43),
    tu_ngay,
    den_ngay,
    ngay_lap: formatNgayLap(metadata.ngay_lap),
    nguoi_lap: metadata.nguoi_lap || '',
    kinh_gui: metadata.kinh_gui || 'Phó Chánh Văn Phòng.',
    kho_khan: (metadata.kho_khan && metadata.kho_khan.trim())
      ? metadata.kho_khan
      : '....................................................................................................................................................',

    tong_nhiem_vu: totalT1,
    hoan_thanh_count: totalDone,
    dang_thuc_hien_count: totalT1 - totalDone,
    tile_hoan_thanh: tileDone,

    thuongxuyen_hoanthanh: `${tx1Done} / ${tx1.length}`,
    dotxuat_hoanthanh: `${dx1Done}/${dx1.length}`,
    thuongxuyen_kehoach_count: tx2.length,
    dotxuat_kehoach_count: dx2.length,

    has_tx1: true,
    has_dx1: true,
    has_tx2: true,
    has_dx2: true,

    thuongxuyen_ketqua: finalTx1List,
    dotxuat_ketqua: finalDx1List,
    thuongxuyen_kehoach: finalTx2List,
    dotxuat_kehoach: finalDx2List
  };
}

/**
 * Khởi tạo file Word Zip chuẩn thể thức Nghị định 30/2020/NĐ-CP & Đầy đủ Bảng biểu
 */
export function createMinimalDocxZip() {
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
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kết quả thực hiện nhiệm vụ Tuần: {tuan} (Từ ngày {tu_ngay} đến ngày {den_ngay})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>trọng tâm công tác Tuần {tuan_tiep}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kính gửi: {kinh_gui}</w:t></w:r>
    </w:p>

    <!-- KÍNH GỬI & LỜI MỞ ĐẦU -->
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
      {#has_tx1}
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
      {/has_tx1}

      <!-- SUBHEADER NHÓM II -->
      {#has_dx1}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...) ({dotxuat_hoanthanh} Nhiệm vụ, công văn hoàn thành/tổng số nhiệm vụ, công văn được giao trong tuần)</w:t></w:r></w:p>
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
          <w:p><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/dotxuat_ketqua}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      {/has_dx1}
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG I -->
    <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>__________________</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>¹ Nêu đầu mục nhiệm vụ mang tính bao quát, tổng thể</w:t></w:r></w:p>
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
      {#has_tx2}
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
      {/has_tx2}

      <!-- SUBHEADER NHÓM II -->
      {#has_dx2}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản...)</w:t></w:r></w:p>
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
      {/has_dx2}
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG II -->
    <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>__________________</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>⁴ Nội dung dự kiến thực hiện bao gồm các nhiệm vụ con liên quan đến nhiệm vụ tổng thể, bao quát được giao.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>Sản phẩm dự kiến: Quyết định, Công văn, Phiếu trình, Tờ trình....</w:t></w:r></w:p>

    <!-- SECTION III: KHÓ KHĂN VƯỚNG MẮC -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>III. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- Khó khăn trong quá trình thực hiện nhiệm vụ, đề xuất kiến nghị giải quyết (thời gian thực hiện không kịp tiến độ, xin gia hạn, giải trình......).</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{kho_khan}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- Lưu ý:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>+ Nhiệm vụ báo cáo trong tuần: Cập nhật đầy đủ nhiệm vụ được giao trong tuần trước và nhiệm vụ được giao trong báo cáo tiến độ hàng tuần gửi phòng Kế hoạch - Tài chính, báo cáo cần hoàn thiện </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>trước 11h thứ 4 hàng tuần</w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t> gửi bộ phận Kế hoạch – Tổng hợp trình lãnh đạo phòng, xem xét chỉ đạo./.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>+ Công việc/nhiệm vụ quá thời hạn chưa có kết quả/sản phẩm: Được xem là </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>không trễ hạn</w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t> nếu thuộc một trong các trường hợp: phát sinh yêu cầu bổ sung của cấp trên; có chỉ đạo chỉnh sửa; hoặc do yếu tố khách quan (luật định sửa đổi, thay đổi hướng dẫn...) đã được Lãnh đạo phòng chấp thuận hoặc phê duyệt gia hạn. Đồng thời nhân sự cần đánh giá tính chất công việc, xác định thời gian hoàn thành hợp lý và tiếp tục thực hiện theo chỉ đạo của Lãnh đạo phòng.</w:t></w:r>
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
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Người báo cáo</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="800"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>(Ký và ghi rõ họ tên)</w:t></w:r></w:p>
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
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
        <w:color w:val="000000"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`);
  zip.file('word/fontTable.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="E0002EFF" w:usb1="C000785B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/>
  </w:font>
</w:fonts>`);

  return zip;
}

/**
 * Tạo file Word Báo cáo tuần tổng hợp (Văn phòng / Tổ CĐS & Tổ Văn thư - Lưu trữ) chuẩn Nghị định 30/2020/NĐ-CP
 */
export function createConsolidatedOfficeDocx(data) {
  const metadata = data.metadata || {};
  const docStats = (data.doc_inspection_stats && data.doc_inspection_stats.length > 0)
    ? data.doc_inspection_stats
    : [
        { department_name: 'Văn phòng', total_checked: 5, error_count: 0, total_pages: 8 },
        { department_name: 'Phòng Kế hoạch Tài chính', total_checked: 20, error_count: 0, total_pages: 26 },
        { department_name: 'Phòng Quản lý Dự án', total_checked: 9, error_count: 7, total_pages: 27 },
        { department_name: 'Phòng Giám sát Khu liên hợp', total_checked: 2, error_count: 0, total_pages: 6 },
        { department_name: 'Phòng Giám sát Khối lượng', total_checked: 2, error_count: 0, total_pages: 4 },
        { department_name: 'Phòng Kiểm tra Môi trường', total_checked: 26, error_count: 7, total_pages: 39 }
      ];

  const meta = data.consolidated_meta || {
    to_truong_name: 'Trần Thuận Hòa',
    nguoi_lap_name: metadata.nguoi_lap || '',
    pho_chanh_van_phong_name: 'Nguyễn Đức Thắng',
    chanh_van_phong_name: 'Hoàng Văn Dương',
    ending_note: 'Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần tiếp theo. Kính trình Lãnh đạo phòng xem xét./.'
  };

  const tuan = metadata.tuan || 38;
  const tuanTiep = metadata.tuan_tiep || (metadata.tuan ? metadata.tuan + 1 : 39);
  const ngayLapText = formatNgayLap(metadata.ngay_lap || '17/9/2026');

  const getNoiDung = (t) => t.noi_dung || t.noiDung || t.task || '';
  const getThoiGian = (t) => t.thoi_gian || t.thoiGian || t.time || 'Thường xuyên';
  const getThoiGianDuKien = (t) => t.thoi_gian_du_kien || t.thoiGianDuKien || t.thoi_gian || t.thoiGian || 'Trong tuần';
  const getTrienKhai = (t) => t.trien_khai || t.trienKhai || t.san_pham || t.sanPham || '';
  const getTienDo = (t) => t.tien_do || t.tienDo || 'Hoàn thành';
  const getSanPhamDuKien = (t) => t.san_pham_du_kien || t.sanPhamDuKien || t.san_pham || t.sanPham || '';
  const getTeam = (t) => t.team_code || t.teamCode || 'VAN_THU';

  const isDotXuat = (nhom, noiDung) => {
    const val = nhom || classifyTask(noiDung);
    return val === 'Đột xuất' || String(val).toLowerCase().includes('đột xuất');
  };
  const isCDS = (t) => getTeam(t) === 'CDS';
  const isVT = (t) => getTeam(t) !== 'CDS';

  const t1 = (data.table1 && data.table1.length > 0)
    ? data.table1.filter(t => t && getNoiDung(t).trim().length > 0 && !isIgnoredRow(getNoiDung(t)))
    : [];
  const t2 = (data.table2 && data.table2.length > 0)
    ? data.table2.filter(t => t && getNoiDung(t).trim().length > 0 && !isIgnoredRow(getNoiDung(t)))
    : [];

  const t1_vt_tx = sortTasksByTime(t1.filter(t => isVT(t) && !isDotXuat(t.nhom, getNoiDung(t))));
  const t1_cds_tx = sortTasksByTime(t1.filter(t => isCDS(t) && !isDotXuat(t.nhom, getNoiDung(t))));
  const t1_vt_dx = sortTasksByTime(t1.filter(t => isVT(t) && isDotXuat(t.nhom, getNoiDung(t))));
  const t1_cds_dx = sortTasksByTime(t1.filter(t => isCDS(t) && isDotXuat(t.nhom, getNoiDung(t))));

  const t2_vt_tx = sortTasksByTime(t2.filter(t => isVT(t) && !isDotXuat(t.nhom, getNoiDung(t))));
  const t2_cds_tx = sortTasksByTime(t2.filter(t => isCDS(t) && !isDotXuat(t.nhom, getNoiDung(t))));
  const t2_vt_dx = sortTasksByTime(t2.filter(t => isVT(t) && isDotXuat(t.nhom, getNoiDung(t))));
  const t2_cds_dx = sortTasksByTime(t2.filter(t => isCDS(t) && isDotXuat(t.nhom, getNoiDung(t))));

  const has_t1_vt_tx = t1_vt_tx.length > 0;
  const has_t1_cds_tx = t1_cds_tx.length > 0;
  const has_t1_tx = has_t1_vt_tx || has_t1_cds_tx;

  const has_t1_vt_dx = t1_vt_dx.length > 0;
  const has_t1_cds_dx = t1_cds_dx.length > 0;
  const has_t1_dx = has_t1_vt_dx || has_t1_cds_dx;

  const has_t2_vt_tx = t2_vt_tx.length > 0;
  const has_t2_cds_tx = t2_cds_tx.length > 0;
  const has_t2_tx = has_t2_vt_tx || has_t2_cds_tx;

  const has_t2_vt_dx = t2_vt_dx.length > 0;
  const has_t2_cds_dx = t2_cds_dx.length > 0;
  const has_t2_dx = has_t2_vt_dx || has_t2_cds_dx;

  const stt_t1_cds_tx = has_t1_vt_tx ? '2' : '1';
  const stt_t1_cds_dx = has_t1_vt_dx ? '2' : '1';
  const stt_t2_cds_tx = has_t2_vt_tx ? '2' : '1';
  const stt_t2_cds_dx = has_t2_vt_dx ? '2' : '1';

  const formattedData = {
    co_quan_cap_tren: 'BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ',
    ten_don_vi: 'VĂN PHÒNG',
    tuan,
    tuan_tiep: tuanTiep,
    ngay_lap: ngayLapText,
    kho_khan: metadata.kho_khan || (meta.kho_khan ? meta.kho_khan : 'Không.'),
    ending_note: meta.ending_note || `Trên đây là báo cáo tình hình thực hiện nhiệm vụ Tuần ${tuan} và kế hoạch thực hiện nhiệm vụ trọng tâm công tác Tuần ${tuanTiep} của Bộ phận Văn thư. Kính trình Lãnh đạo phòng xem xét./.`,

    // Dynamic visibility flags & stt
    has_t1_tx,
    has_t1_vt_tx,
    has_t1_cds_tx,
    stt_t1_cds_tx,

    has_t1_dx,
    has_t1_vt_dx,
    has_t1_cds_dx,
    stt_t1_cds_dx,

    has_t2_tx,
    has_t2_vt_tx,
    has_t2_cds_tx,
    stt_t2_cds_tx,

    has_t2_dx,
    has_t2_vt_dx,
    has_t2_cds_dx,
    stt_t2_cds_dx,

    // Signatures
    to_truong_name: meta.to_truong_name || 'Trần Thuận Hòa',
    nguoi_lap_name: meta.nguoi_lap_name || metadata.nguoi_lap || '',
    pho_chanh_van_phong_name: meta.pho_chanh_van_phong_name || 'Nguyễn Đức Thắng',
    chanh_van_phong_name: meta.chanh_van_phong_name || 'Hoàng Văn Dương',

    // Section I Table Rows
    t1_vt_tx: t1_vt_tx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian: getThoiGian(item), trien_khai: getTrienKhai(item), tien_do: getTienDo(item) })),
    t1_cds_tx: t1_cds_tx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian: getThoiGian(item), trien_khai: getTrienKhai(item), tien_do: getTienDo(item) })),
    t1_vt_dx: t1_vt_dx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian: getThoiGian(item), trien_khai: getTrienKhai(item), tien_do: getTienDo(item) })),
    t1_cds_dx: t1_cds_dx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian: getThoiGian(item), trien_khai: getTrienKhai(item), tien_do: getTienDo(item) })),

    // Section II Table Rows
    t2_vt_tx: t2_vt_tx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian_du_kien: getThoiGianDuKien(item), san_pham_du_kien: getSanPhamDuKien(item) })),
    t2_cds_tx: t2_cds_tx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian_du_kien: getThoiGianDuKien(item), san_pham_du_kien: getSanPhamDuKien(item) })),
    t2_vt_dx: t2_vt_dx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian_du_kien: getThoiGianDuKien(item), san_pham_du_kien: getSanPhamDuKien(item) })),
    t2_cds_dx: t2_cds_dx.map((item, idx) => ({ stt: idx + 1, noi_dung: getNoiDung(item), thoi_gian_du_kien: getThoiGianDuKien(item), san_pham_du_kien: getSanPhamDuKien(item) })),

    // Section III Table Rows
    doc_stats: docStats.map((ds, idx) => ({
      stt: idx + 1,
      phong: ds.department_name || '',
      tong_vb: String(ds.total_checked ?? 0).padStart(2, '0'),
      so_loi: String(ds.error_count ?? 0).padStart(2, '0'),
      tong_trang: String(ds.total_pages ?? 0)
    }))
  };

  const zip = createConsolidatedDocxZipTemplate();
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() { return ''; }
  });

  doc.render(formattedData);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function createConsolidatedDocxZipTemplate() {
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
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>BAN QUẢN LÝ CÁC KHU LIÊN HỢP XỬ LÝ CHẤT THẢI THÀNH PHỐ</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>VĂN PHÒNG</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4955" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Độc lập – Tự do – Hạnh phúc</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="120"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:i/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{ngay_lap}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- TIÊU ĐỀ -->
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:color w:val="000000"/></w:rPr><w:t>BÁO CÁO</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kết quả thực hiện nhiệm vụ Tuần {tuan} và nhiệm vụ trọng tâm Tuần {tuan_tiep}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>của bộ phận Chuyển đổi số và Văn thư - Lưu trữ</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kính gửi: Lãnh đạo Văn Phòng.</w:t></w:r></w:p>

    <!-- LỜI MỞ ĐẦU -->
    <w:p><w:pPr><w:spacing w:after="200" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Báo cáo tình hình thực hiện nhiệm vụ Tuần {tuan} và phương hướng thực hiện nhiệm vụ trọng tâm công tác Tuần {tuan_tiep} như sau:</w:t></w:r></w:p>

    <!-- MỤC I: KẾT QUẢ THỰC HIỆN CÔNG TÁC -->
    <w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>I. Kết quả thực hiện công tác Tuần {tuan}</w:t></w:r></w:p>

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
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nội dung nhiệm vụ/ công tác được giao¹</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Thời gian được giao hoàn thiện nhiệm vụ</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Triển khai thực hiện²</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Tiến độ thực hiện³</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Subheader I: Nhiệm vụ thường xuyên -->
      {#has_t1_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>I</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ thường xuyên</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- 1. Bộ phận Văn thư - Lưu trữ -->
      {#has_t1_vt_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Văn thư – Lưu trữ</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t1_vt_tx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/t1_vt_tx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t1_vt_tx}

      <!-- 2. Bộ phận Chuyển đổi số -->
      {#has_t1_cds_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt_t1_cds_tx}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Chuyển đổi số</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t1_cds_tx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/t1_cds_tx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t1_cds_tx}
      {/has_t1_tx}

      <!-- Subheader II: Nhiệm vụ đột xuất -->
      {#has_t1_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…)</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- 1. Bộ phận Văn thư - Lưu trữ (Đột xuất) -->
      {#has_t1_vt_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Văn thư – Lưu trữ</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t1_vt_dx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/t1_vt_dx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t1_vt_dx}

      <!-- 2. Bộ phận Chuyển đổi số (Đột xuất) -->
      {#has_t1_cds_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt_t1_cds_dx}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Chuyển đổi số</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t1_cds_dx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2555" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{trien_khai}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}{/t1_cds_dx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t1_cds_dx}
      {/has_t1_dx}
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG I -->
    <w:p><w:pPr><w:spacing w:before="80" w:after="30"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>¹ Bao gồm các nhiệm vụ thường xuyên và các nhiệm vụ đột xuất theo chỉ đạo, nhiệm vụ theo phân công tại các cuộc họp, văn bản chỉ đạo của Lãnh đạo Ban, Lãnh đạo Văn phòng.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="30"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>² Nêu rõ tiến độ thực hiện nhiệm vụ: đã hoàn thành hay đang thực hiện (đang thực hiện nội dung gì, vướng mắc nếu có...); trường hợp nhiệm vụ chưa hoàn thành theo thời hạn được giao phải nêu rõ lý do chưa hoàn thành.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>³ Tiến độ thực hiện: Đánh giá Hoàn thành / Đang thực hiện.</w:t></w:r></w:p>

    <!-- MỤC II: KẾ HOẠCH CÔNG TÁC TUẦN TIẾP THEO -->
    <w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>II. Kế hoạch thực hiện công tác Tuần {tuan_tiep} (Tuần tiếp theo)</w:t></w:r></w:p>

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
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ/công tác</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Thời gian dự kiến hoàn thành</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nội dung và sản phẩm dự kiến thực hiện⁴</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Subheader I: Nhiệm vụ thường xuyên -->
      {#has_t2_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>I</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ thường xuyên</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- 1. Bộ phận Văn thư - Lưu trữ -->
      {#has_t2_vt_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Văn thư – Lưu trữ</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t2_vt_tx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/t2_vt_tx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t2_vt_tx}

      <!-- 2. Bộ phận Chuyển đổi số -->
      {#has_t2_cds_tx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt_t2_cds_tx}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Chuyển đổi số</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t2_cds_tx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/t2_cds_tx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t2_cds_tx}
      {/has_t2_tx}

      <!-- Subheader II: Nhiệm vụ đột xuất -->
      {#has_t2_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>II</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Nhiệm vụ theo bút phê, chỉ đạo đột xuất (cuộc họp, giao ban, Phần mềm quản lý văn bản…)</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- 1. Bộ phận Văn thư - Lưu trữ (Đột xuất) -->
      {#has_t2_vt_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Văn thư – Lưu trữ</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t2_vt_dx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/t2_vt_dx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t2_vt_dx}

      <!-- 2. Bộ phận Chuyển đổi số (Đột xuất) -->
      {#has_t2_cds_dx}
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt_t2_cds_dx}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8755" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Chuyển đổi số</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#t2_cds_dx}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{noi_dung}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1655" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{thoi_gian_du_kien}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}{/t2_cds_dx}</w:t></w:r></w:p></w:tc>
      </w:tr>
      {/has_t2_cds_dx}
      {/has_t2_dx}
    </w:tbl>

    <!-- CHÚ THÍCH BẢNG II -->
    <w:p><w:pPr><w:spacing w:before="80" w:after="30"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>⁴ Nội dung dự kiến thực hiện bao gồm các nhiệm vụ con liên quan đến nhiệm vụ tổng thể, bao quát được giao.</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="18"/><w:color w:val="000000"/></w:rPr><w:t>Sản phẩm dự kiến: Quyết định, Công văn, Phiếu trình, Tờ trình….</w:t></w:r></w:p>

    <!-- MỤC III: BẢNG KIỂM TRA THỂ THỨC CHÍNH TẢ -->
    <w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>III. Kết quả kiểm tra thể thức và chính tả công văn phát hành</w:t></w:r></w:p>
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
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3555" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Phòng</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Tổng số VB kiểm tra</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Số lỗi</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>Tổng số trang</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{#doc_stats}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3555" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{phong}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tong_vb}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{so_loi}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tong_trang}{/doc_stats}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- MỤC IV: KHÓ KHĂN & LỜI KẾT -->
    <w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>IV. Khó khăn, vướng mắc, đề xuất kiến nghị (nếu có):</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="160"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{kho_khan}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="240"/><w:ind w:firstLine="567"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{ending_note}</w:t></w:r></w:p>

    <!-- KHỐI CHỮ KÝ 4 VỊ TRÍ CHUẨN (KHÔNG KHUNG VIỀN - BORDER NONE) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:trPr><w:trHeight w:val="2200" w:hRule="atLeast"/></w:trPr>
        <w:tc><w:tcPr><w:tcW w:w="4677" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="1600"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Ý kiến của Tổ trưởng</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{to_truong_name}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4678" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="1600"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Người lập báo cáo</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{nguoi_lap_name}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:trPr><w:trHeight w:val="2200" w:hRule="atLeast"/></w:trPr>
        <w:tc><w:tcPr><w:gridSpan w:val="2"/><w:tcW w:w="9355" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="1600"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Ý kiến của Phó Chánh Văn phòng</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{pho_chanh_van_phong_name}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:trPr><w:trHeight w:val="2200" w:hRule="atLeast"/></w:trPr>
        <w:tc><w:tcPr><w:gridSpan w:val="2"/><w:tcW w:w="9355" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="1600"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Ý kiến của Chánh Văn phòng</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{chanh_van_phong_name}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/>
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
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
        <w:color w:val="000000"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`);
  zip.file('word/fontTable.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="E0002EFF" w:usb1="C000785B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/>
  </w:font>
</w:fonts>`);
  return zip;
}

