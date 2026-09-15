/**
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG HÓA BÁO CÁO TUẦN
 * Dán mã này vào Google Sheet (Tiện ích mở rộng > Apps Script)
 * Dùng để đồng bộ dữ liệu Báo cáo tuần sang Hệ thống Báo cáo Tự động.
 */

// Cấu hình tên Sheet chứa dữ liệu
const SHEET_BANG_1 = "Bảng I - Kết quả";
const SHEET_BANG_2 = "Bảng II - Kế hoạch";

/**
 * Hàm doGet nhận request từ Hệ thống Báo cáo Tự động và trả về JSON
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Đọc Bảng I
    const sheet1 = ss.getSheetByName(SHEET_BANG_1) || ss.getSheets()[0];
    const data1 = sheet1.getDataRange().getValues();
    const table1Tasks = parseTable1(data1);
    
    // Đọc Bảng II
    const sheet2 = ss.getSheetByName(SHEET_BANG_2) || ss.getSheets()[1];
    const data2 = sheet2 ? sheet2.getDataRange().getValues() : [];
    const table2Tasks = parseTable2(data2);
    
    const result = {
      status: "success",
      timestamp: new Date().toISOString(),
      metadata: {
        tuan: 42,
        nam: 2024,
        nguoi_lap: "Nguyễn Văn A",
        don_vi: "Văn phòng Ủy ban Nhân dân"
      },
      table1: table1Tasks,
      table2: table2Tasks
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Parse dữ liệu Bảng I
 */
function parseTable1(rows) {
  const tasks = [];
  if (!rows || rows.length <= 1) return tasks;
  
  // Giả định hàng 0 là Header: [STT, Nội dung nhiệm vụ, Thời gian hoàn thành, Triển khai thực hiện, Tiến độ, Nhóm]
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] || row[1].toString().trim() === "") continue;
    
    const noiDung = row[1].toString().trim();
    let nhom = row[5] ? row[5].toString().trim() : "";
    
    // Quy tắc BR03: Tự động phân loại nếu chưa chỉ định nhóm
    if (!nhom) {
      const lower = noiDung.toLowerCase();
      if (lower.includes("đột xuất") || lower.includes("khẩn") || lower.includes("phát sinh") || lower.includes("hội nghị") || lower.includes("chỉ đạo")) {
        nhom = "Đột xuất";
      } else {
        nhom = "Thường xuyên";
      }
    }
    
    tasks.push({
      id: "t1_" + i,
      noi_dung: noiDung,
      thoi_gian: row[2] ? formatDate(row[2]) : "Chưa nhập",
      trien_khai: row[3] ? row[3].toString().trim() : "",
      tien_do: row[4] ? row[4].toString().trim() : "Đang thực hiện",
      nhom: nhom,
      isEdited: false
    });
  }
  return tasks;
}

/**
 * Parse dữ liệu Bảng II
 */
function parseTable2(rows) {
  const tasks = [];
  if (!rows || rows.length <= 1) return tasks;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] || row[1].toString().trim() === "") continue;
    
    const noiDung = row[1].toString().trim();
    let nhom = row[4] ? row[4].toString().trim() : "";
    
    if (!nhom) {
      const lower = noiDung.toLowerCase();
      if (lower.includes("đột xuất") || lower.includes("khẩn") || lower.includes("phát sinh") || lower.includes("kiểm tra")) {
        nhom = "Đột xuất";
      } else {
        nhom = "Thường xuyên";
      }
    }
    
    tasks.push({
      id: "t2_" + i,
      noi_dung: noiDung,
      thoi_gian_du_kien: row[2] ? formatDate(row[2]) : "Trong tuần",
      san_pham_du_kien: row[3] ? row[3].toString().trim() : "",
      nhom: nhom,
      isEdited: false
    });
  }
  return tasks;
}

function formatDate(val) {
  if (val instanceof Date) {
    const d = val.getDate();
    const m = val.getMonth() + 1;
    const y = val.getFullYear();
    return (d < 10 ? '0' + d : d) + '/' + (m < 10 ? '0' + m : m) + '/' + y;
  }
  return val.toString();
}
