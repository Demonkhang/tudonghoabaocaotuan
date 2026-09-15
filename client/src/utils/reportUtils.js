export function classifyTask(noiDung) {
  if (!noiDung) return "Thường xuyên";
  const lower = noiDung.toLowerCase();
  const keywords = [
    'đột xuất', 'khẩn', 'phát sinh', 'chỉ đạo', 'yêu cầu mới',
    'hội nghị', 'chuyển đổi số', 'dự án a', 'kiểm tra thực địa'
  ];
  if (keywords.some(kw => lower.includes(kw))) {
    return "Đột xuất";
  }
  return "Thường xuyên";
}

export function processTable1(tasks) {
  const thuongXuyen = tasks
    .filter(t => t.nhom === 'Thường xuyên')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  const dotXuat = tasks
    .filter(t => t.nhom === 'Đột xuất')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  const txDone = thuongXuyen.filter(t => t.tien_do === 'Hoàn thành').length;
  const dxDone = dotXuat.filter(t => t.tien_do === 'Hoàn thành').length;

  return {
    thuongXuyen,
    dotXuat,
    txStats: { done: txDone, total: thuongXuyen.length },
    dxStats: { done: dxDone, total: dotXuat.length },
    totalStats: { done: txDone + dxDone, total: tasks.length }
  };
}

export function processTable2(tasks) {
  const thuongXuyen = tasks
    .filter(t => t.nhom === 'Thường xuyên')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  const dotXuat = tasks
    .filter(t => t.nhom === 'Đột xuất')
    .map((t, idx) => ({ ...t, stt: idx + 1 }));

  return {
    thuongXuyen,
    dotXuat,
    txTotal: thuongXuyen.length,
    dxTotal: dotXuat.length,
    total: tasks.length
  };
}

export function validateReport(table1, table2) {
  const errors = [];
  table1.forEach((t, idx) => {
    if (!t.tien_do || t.tien_do === 'Chưa nhập') {
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
        title: `Dòng ${idx + 1} thiếu thời gian`,
        message: `Thời gian hoàn thành không được để trống.`,
        table: 'Bảng I',
        rowId: t.id,
        type: 'error'
      });
    }
  });
  return errors;
}
