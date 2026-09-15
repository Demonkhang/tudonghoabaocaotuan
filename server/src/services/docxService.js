const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

/**
 * Xử lý tạo file Word .docx từ dữ liệu báo cáo tuần
 * Tuân thủ quy tắc BR01 - BR15 & Thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)
 */
function createDocxReport(data) {
  const templatePath = path.join(__dirname, '../../templates/report_template.docx');

  let zip;
  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, 'binary');
    zip = new PizZip(content);
  } else {
    zip = createMinimalDocxZip();

    try {
      const templateDir = path.dirname(templatePath);
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      fs.writeFileSync(templatePath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
    } catch (e) {
      console.warn('Không thể lưu file report_template.docx đĩa:', e.message);
    }
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
function formatNgayLap(rawDate) {
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
 * Lọc bỏ các dòng tiêu đề / subheader thừa từ file Excel
 */
function isIgnoredRow(text) {
  if (!text) return true;
  const lower = String(text).toLowerCase().trim();
  if (!lower) return true;

  if (/^\d+$/.test(lower) || lower === 'i' || lower === 'ii' || lower === 'iii' || lower === 'iv' || lower === 'stt') {
    return true;
  }

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

function classifyTask(noiDung) {
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

/**
 * Chuẩn hóa dữ liệu theo đúng danh sách thẻ Placeholder trong README_TEMPLATES.md
 */
function formatDataForTemplate(data) {
  const metadata = data.metadata || {};

  // Lọc sạch Bảng I
  const cleanTable1 = (data.table1 || []).filter(item => {
    if (!item) return false;
    const noiDung = item.noi_dung || item.noiDung || item.task || '';
    return noiDung.trim().length > 0 && !isIgnoredRow(noiDung);
  });

  const tx1 = cleanTable1.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx1 = cleanTable1.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

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

  const tx2 = cleanTable2.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Thường xuyên' || String(nhom).toLowerCase().includes('thường xuyên');
  });
  const dx2 = cleanTable2.filter(t => {
    const nhom = t.nhom || classifyTask(t.noi_dung || t.noiDung);
    return nhom === 'Đột xuất' || String(nhom).toLowerCase().includes('đột xuất');
  });

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

  const tx1Done = tx1.filter(t => (t.tien_do || t.tienDo) === 'Hoàn thành').length;
  const dx1Done = dx1.filter(t => (t.tien_do || t.tienDo) === 'Hoàn thành').length;
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
    nguoi_lap: metadata.nguoi_lap || 'Trần Thuận Hóa',
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

/**
 * Khởi tạo file Word Zip chuẩn thể thức Nghị định 30/2020/NĐ-CP & Đầy đủ Bảng biểu
 */
function createMinimalDocxZip() {
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
        <w:trPr><w:tblHeader/></w:trPr>
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
      {#thuongxuyen_ketqua}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt}</w:t></w:r></w:p>
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
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      {/thuongxuyen_ketqua}

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
      {#dotxuat_ketqua}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt}</w:t></w:r></w:p>
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
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{tien_do}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      {/dotxuat_ketqua}
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
        <w:trPr><w:tblHeader/></w:trPr>
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
      {#thuongxuyen_kehoach}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt}</w:t></w:r></w:p>
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
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      {/thuongxuyen_kehoach}

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
      {#dotxuat_kehoach}
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{stt}</w:t></w:r></w:p>
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
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr><w:t>{san_pham_du_kien}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      {/dotxuat_kehoach}
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

module.exports = {
  createDocxReport,
  createMinimalDocxZip,
  formatDataForTemplate
};
