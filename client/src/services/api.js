export async function fetchSyncedData() {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) throw new Error('Không thể đồng bộ dữ liệu');
    return await res.json();
  } catch (error) {
    console.warn('Lỗi kết nối API sync, trả dữ liệu mẫu:', error);
    return { success: true };
  }
}

export async function exportWordReport(payload) {
  const res = await fetch('/api/generate-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Lỗi xuất file Word');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BAO_CAO_TUAN_${payload.metadata?.tuan || 42}_${payload.metadata?.nam || 2024}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportPdfReport(payload) {
  const res = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}
