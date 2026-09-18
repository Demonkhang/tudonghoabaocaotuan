import * as XLSX from 'xlsx';
import { ReportMetadata, TaskTable1, TaskTable2 } from './reportUtils';

/**
 * Xuất dữ liệu Báo cáo Tuần (BẢNG I & BẢNG II) ra tệp Excel (.xlsx)
 * Định dạng xuất chuẩn 100% với hàm parseExcelFile để có thể Import ngược lại hệ thống.
 */
export function exportReportToExcel(
  metadata: ReportMetadata,
  table1: TaskTable1[],
  table2: TaskTable2[]
) {
  const wb = XLSX.utils.book_new();

  const thuongXuyenT1 = table1.filter(t => (t.nhom || 'Thường xuyên') === 'Thường xuyên');
  const dotXuatT1 = table1.filter(t => t.nhom === 'Đột xuất');

  const thuongXuyenT2 = table2.filter(t => (t.nhom || 'Thường xuyên') === 'Thường xuyên');
  const dotXuatT2 = table2.filter(t => t.nhom === 'Đột xuất');

  const sheetData: any[][] = [];

  // ==================== BẢNG I: KẾT QUẢ THỰC HIỆN CÔNG TÁC ====================
  sheetData.push([`I. Kết quả thực hiện công tác Tuần ${metadata.tuan} - ${metadata.don_vi || 'Cơ quan'}`, '', '', '']);
  sheetData.push([
    'Nội dung nhiệm vụ/ công tác được giao',
    'Thời gian được giao hoàn thiện nhiệm vụ',
    'Triển khai thực hiện',
    'Tiến độ thực hiện'
  ]);

  // Nhóm I: Thường xuyên
  const doneT1Tx = thuongXuyenT1.filter(t => t.tien_do === 'Hoàn thành').length;
  sheetData.push([
    `Nhiệm vụ thường xuyên (${doneT1Tx}/${thuongXuyenT1.length} Nhiệm vụ hoàn thành)`,
    '',
    '',
    ''
  ]);

  if (thuongXuyenT1.length === 0) {
    sheetData.push(['(Chưa có nhiệm vụ thường xuyên)', 'Trong tuần', 'Báo cáo', 'Hoàn thành']);
  } else {
    thuongXuyenT1.forEach(t => {
      sheetData.push([
        t.noi_dung || '',
        t.thoi_gian || 'Chưa nhập',
        t.trien_khai || '',
        t.tien_do || 'Hoàn thành'
      ]);
    });
  }

  // Nhóm II: Đột xuất
  const doneT1Dx = dotXuatT1.filter(t => t.tien_do === 'Hoàn thành').length;
  sheetData.push([
    `Nhiệm vụ theo bút phê, chỉ đạo đột xuất (${doneT1Dx}/${dotXuatT1.length} Nhiệm vụ hoàn thành)`,
    '',
    '',
    ''
  ]);

  if (dotXuatT1.length === 0) {
    sheetData.push(['(Không phát sinh nhiệm vụ đột xuất)', 'Trong tuần', 'Báo cáo', 'Hoàn thành']);
  } else {
    dotXuatT1.forEach(t => {
      sheetData.push([
        t.noi_dung || '',
        t.thoi_gian || 'Chưa nhập',
        t.trien_khai || '',
        t.tien_do || 'Hoàn thành'
      ]);
    });
  }

  // Hàng phân cách giữa 2 bảng
  sheetData.push(['', '', '', '']);

  // ==================== BẢNG II: KẾ HOẠCH THỰC HIỆN TUẦN TIẾP THEO ====================
  sheetData.push([`II. Kế hoạch thực hiện công tác Tuần ${metadata.tuan_tiep || metadata.tuan + 1} (Tuần tiếp theo)`, '', '', '']);

  // Nhóm I: Thường xuyên
  sheetData.push([`Nhiệm vụ thường xuyên (${thuongXuyenT2.length} kế hoạch)`, '', '', '']);
  sheetData.push([
    'Nhiệm vụ/công tác',
    'Thời gian dự kiến hoàn thành',
    'Nội dung và sản phẩm dự kiến thực hiện',
    ''
  ]);

  if (thuongXuyenT2.length === 0) {
    sheetData.push(['(Chưa có kế hoạch thường xuyên)', 'Trong tuần', 'Kế hoạch công tác', '']);
  } else {
    thuongXuyenT2.forEach(t => {
      sheetData.push([
        t.noi_dung || '',
        t.thoi_gian_du_kien || 'Trong tuần',
        t.san_pham_du_kien || '',
        ''
      ]);
    });
  }

  // Nhóm II: Đột xuất
  sheetData.push([`Nhiệm vụ theo bút phê, chỉ đạo đột xuất (${dotXuatT2.length} kế hoạch)`, '', '', '']);
  if (dotXuatT2.length === 0) {
    sheetData.push(['(Không phát sinh kế hoạch đột xuất)', 'Trong tuần', 'Kế hoạch công tác', '']);
  } else {
    dotXuatT2.forEach(t => {
      sheetData.push([
        t.noi_dung || '',
        t.thoi_gian_du_kien || 'Trong tuần',
        t.san_pham_du_kien || '',
        ''
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 50 }, // Cột 1: Nội dung
    { wch: 25 }, // Cột 2: Thời gian
    { wch: 35 }, // Cột 3: Triển khai / Sản phẩm
    { wch: 20 }  // Cột 4: Tiến độ
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Báo cáo Tuần ${metadata.tuan}`);

  const safeDept = (metadata.don_vi || 'DonVi').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = `Bao_Cao_Tuan_${metadata.tuan}_Nam_${metadata.nam}_${safeDept}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
