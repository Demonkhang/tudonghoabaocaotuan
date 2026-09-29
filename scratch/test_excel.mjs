import XLSX from 'xlsx';

function cleanHtmlString(str) {
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
    .trim();
}

function formatExcelCellValue(cellVal) {
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
      // ignore
    }
  }
  return cleanHtmlString(String(cellVal));
}

function parseIncomingDocExcelTest(sheetData) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "SỔ VĂN BẢN ĐẾN");

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const readWb = XLSX.read(buf, { type: 'buffer' });

  let bestResult = null;
  let bestTaskCount = -1;

  for (const sheetName of readWb.SheetNames) {
    const sheet = readWb.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rawRows || rawRows.length === 0) continue;

    let headerRowIndex = -1;
    let colNgayDen = 0, colSoDen = 1, colTacGia = 2, colSoKyHieu = 3, colNgayVanBan = 4, colTrichYeu = 5, colDonViNhan = 6, colLoaiVanBan = 9, colDoKhan = 10, colLinhVuc = 11, colXuLyChinh = 12;

    for (let r = 0; r < Math.min(30, rawRows.length); r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      let matchingCellsCount = 0;
      row.forEach((cellVal) => {
        const str = cleanHtmlString(cellVal).toLowerCase().trim();
        if (!str) return;
        if (
          str.includes('ngày đến') || str.includes('ngay den') || str.includes('ngày nhận') ||
          str === 'số đến' || str === 'so den' || str.includes('số văn bản') ||
          str.includes('tác giả') || str.includes('nơi gửi') || str.includes('cơ quan') ||
          str.includes('ký hiệu') || str.includes('số, ký hiệu') || str.includes('số/ký hiệu') ||
          str.includes('trích yếu') || str.includes('nội dung văn bản') || str.includes('trich yeu') ||
          str.includes('đơn vị') || str.includes('người nhận') ||
          str.includes('loại văn bản') || str.includes('độ khẩn') || str.includes('xử lý chính')
        ) {
          matchingCellsCount++;
        }
      });

      if (matchingCellsCount >= 3) {
        headerRowIndex = r;
        row.forEach((cellVal, cIdx) => {
          const str = cleanHtmlString(cellVal).toLowerCase().trim();
          if (str.includes('ngày đến') || str.includes('ngay den') || str.includes('ngày nhận')) colNgayDen = cIdx;
          else if (str === 'số đến' || str === 'so den' || (str.includes('số đến') && !str.includes('sổ lưu'))) colSoDen = cIdx;
          else if (str.includes('tác giả') || str.includes('nơi gửi') || str.includes('cơ quan')) colTacGia = cIdx;
          else if (str.includes('ký hiệu') || str.includes('số, ký hiệu') || str.includes('số/ký hiệu')) colSoKyHieu = cIdx;
          else if (str.includes('ngày tháng') || str.includes('ngày văn bản') || str.includes('ngày ban hành')) colNgayVanBan = cIdx;
          else if (str.includes('trích yếu') || str.includes('nội dung')) colTrichYeu = cIdx;
          else if (str.includes('người nhận') || str.includes('đơn vị')) colDonViNhan = cIdx;
          else if (str.includes('loại văn bản') || str.includes('loai van ban')) colLoaiVanBan = cIdx;
          else if (str.includes('độ khẩn') || str.includes('do khan')) colDoKhan = cIdx;
          else if (str.includes('lĩnh vực') || str.includes('linh vuc')) colLinhVuc = cIdx;
          else if (str.includes('xử lý chính') || str.includes('xu ly chinh') || str.includes('chủ trì')) colXuLyChinh = cIdx;
        });
        break;
      }
    }

    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    const sheetTasks = [];
    const seenInFile = new Set();

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      let trichYeu = formatExcelCellValue(row[colTrichYeu]);
      const soDen = formatExcelCellValue(row[colSoDen]);
      const ngayDen = formatExcelCellValue(row[colNgayDen]);
      const tacGia = formatExcelCellValue(row[colTacGia]);
      const soKyHieu = formatExcelCellValue(row[colSoKyHieu]);

      const rowCombined = (trichYeu + ' ' + soDen + ' ' + tacGia).toLowerCase();
      if (rowCombined.includes('ngày đến') && rowCombined.includes('số đến')) continue;
      if (rowCombined.includes('sổ lưu cấp số văn bản đến')) continue;
      if (trichYeu.toLowerCase().includes('tên loại và trích yếu nội dung')) continue;
      if (soDen.toLowerCase() === 'số đến' && tacGia.toLowerCase() === 'tác giả') continue;

      if (!trichYeu) {
        for (let c = 0; c < row.length; c++) {
          const val = formatExcelCellValue(row[c]);
          if (val && val.length > 15 && c !== colSoDen && c !== colNgayDen && c !== colSoKyHieu) {
            trichYeu = val;
            break;
          }
        }
      }

      if (!trichYeu && !soDen && !soKyHieu && !tacGia) continue;

      const computedTitle = trichYeu || (soDen ? `Văn bản đến số ${soDen} (${soKyHieu || tacGia || 'Chưa trích yếu'})` : '');
      if (!computedTitle || computedTitle.trim().length < 3) continue;

      sheetTasks.push({
        id: `import_row_${r}`,
        soDen,
        ngayDen,
        tacGia,
        soKyHieu,
        title: computedTitle
      });
    }

    // FALLBACK ROW SCANNER: If 0 tasks found, scan all rows for longest text cells
    if (sheetTasks.length === 0) {
      rawRows.forEach((row, r) => {
        if (!row || row.length < 2) return;
        const textCells = row.map(cell => formatExcelCellValue(cell)).filter(Boolean);
        if (textCells.length === 0) return;

        const longest = textCells.reduce((max, cur) => cur.length > max.length ? cur : max, '');
        if (longest.length > 10 && !longest.toLowerCase().includes('sổ lưu cấp số') && !longest.toLowerCase().includes('ngày đến')) {
          const possibleSoDen = textCells.find(c => /^\d{1,6}$/.test(c)) || '';
          const possibleDate = textCells.find(c => /\d{1,2}\/\d{1,2}\/\d{4}/.test(c)) || '';
          sheetTasks.push({
            id: `fallback_row_${r}`,
            soDen: possibleSoDen,
            ngayDen: possibleDate,
            tacGia: 'Nội bộ',
            soKyHieu: '',
            title: longest
          });
        }
      });
    }

    if (sheetTasks.length > bestTaskCount) {
      bestTaskCount = sheetTasks.length;
      bestResult = { tasks: sheetTasks };
    }
  }

  return bestResult;
}

// Test sample matching the exact image 1 & image 3
const sampleData = [
  ["Sổ lưu cấp số văn bản đến: SỔ VĂN BẢN ĐẾN NĂM 2026", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["Ngày đến", "Số đến", "Tác giả", "Số, ký hiệu văn bản", "Ngày tháng năm văn bản", "Tên loại và trích yếu nội dung văn bản", "Đơn vị hoặc người nhận văn bản", "Ký nhận", "Ghi chú", "Loại văn bản", "Độ khẩn", "Lĩnh vực", "Xử lý chính"],
  ["14/09/2026", "5620", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30191/TB-SNNMT-BTTĐC", "11/09/2026", "Kết luận của ông Lê Anh Tú, Phó Giám đốc Sở Nông nghiệp và Môi trường tại cuộc họp...", "KẾ HOẠCH - TÀI CHÍNH;NGUYỄN VĂN HẢI", "", "", "Thông báo", "Khẩn", "", "NGUYỄN QUỐC BÌNH"],
  ["14/09/2026", "5621", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30043/BC-SNNMT-KHTC", "11/09/2026", "Báo cáo tuần 37 (Từ ngày 07/9/2026 đến ngày 11/9/2026)", "VĂN PHÒNG;KẾ HOẠCH - TÀI CHÍNH", "", "", "Báo cáo", "Khẩn", "", "NGUYỄN VĂN HẢI"],
  ["14/09/2026", "5622", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", "30025/SNNMT-QLĐT", "11/09/2026", "Về việc giải trình nội dung liên quan Báo cáo nghiên cứu tiền khả thi dự án...", "GIÁM SÁT KHU LIÊN HỢP;PHÒNG QUẢN LÝ DỰ ÁN", "", "", "Công văn", "Khẩn", "Đầu tư", "PHÒNG QUẢN LÝ DỰ ÁN"]
];

const res = parseIncomingDocExcelTest(sampleData);
console.log("Test Output Tasks Count:", res.tasks.length);
console.log("Parsed Tasks Sample:", JSON.stringify(res.tasks[0], null, 2));
