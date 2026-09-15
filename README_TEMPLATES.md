# HƯỚNG DẪN ĐỤC LỖ FILE TEMPLATE WORD (report_template.docx)

Tài liệu này hướng dẫn cách đục lỗ các thẻ Placeholder trong file mẫu Word (`report_template.docx`) để hệ thống đổ dữ liệu tự động theo quy tắc **BR01 - BR15** và thể thức hành chính chuẩn (Nghị định 30/2020/NĐ-CP).

---

## 1. THẺ CẤU HÌNH THÔNG TIN CHUNG (SINGLE PLACEHOLDERS)

Đặt các thẻ này ở phần Tiêu đề, Header, hoặc Bố cục hành chính của file Word:

| Thẻ Placeholder | Mô tả | Ví dụ hiển thị |
| :--- | :--- | :--- |
| `{co_quan_cap_tren}` | Tên cơ quan cấp trên | UY BÂN NHÂN DÂN THÀNH PHỐ |
| `{ten_don_vi}` | Tên đơn vị lập báo cáo | VĂN PHÒNG HĐND & UBND |
| `{nam}` | Năm báo cáo | 2024 |
| `{tuan}` | Số tuần hiện tại (Bảng I) | 42 |
| `{tuan_tiep}` | Số tuần tiếp theo (Bảng II) | 43 |
| `{ngay_lap}` | Ngày tháng năm lập báo cáo | Ngày 20 tháng 10 năm 2024 |
| `{nguoi_lap}` | Họ tên người lập báo cáo | Nguyễn Văn A |
| `{tong_nhiem_vu}` | Tổng số nhiệm vụ thực hiện | 15 |
| `{hoan_thanh_count}` | Số nhiệm vụ đã hoàn thành | 12 |
| `{dang_thuc_hien_count}`| Số nhiệm vụ đang thực hiện | 3 |
| `{tile_hoan_thanh}` | Tỷ lệ hoàn thành (%) | 80% |

---

## 2. BẢNG I: KẾT QUẢ THỰC HIỆN CÔNG TÁC (TUẦN {tuan})

Trong Bảng I của file Word, tạo 2 hàng lặp (loop table rows) cho 2 nhóm:

### A. Nhóm I: Nhiệm vụ thường xuyên
Tiêu đề nhóm trong file Word: `I. Nhiệm vụ thường xuyên ({thuongxuyen_hoanthanh} hoàn thành)`
Đục lỗ dòng dữ liệu bảng:

```text
| {stt} | {noi_dung} | {thoi_gian} | {trien_khai} | {tien_do} |
```

Cấu trúc vòng lặp docxtemplater:
- Bắt đầu vòng lặp: `{#thuongxuyen_ketqua}`
- Kết thúc vòng lặp: `{/thuongxuyen_ketqua}`

### B. Nhóm II: Nhiệm vụ đột xuất
Tiêu đề nhóm trong file Word: `II. Nhiệm vụ đột xuất ({dotxuat_hoanthanh} hoàn thành)`
Đục lỗ dòng dữ liệu bảng:

```text
| {stt} | {noi_dung} | {thoi_gian} | {trien_khai} | {tien_do} |
```

Cấu trúc vòng lặp docxtemplater:
- Bắt đầu vòng lặp: `{#dotxuat_ketqua}`
- Kết thúc vòng lặp: `{/dotxuat_ketqua}`

---

## 3. BẢNG II: KẾ HOẠCH THỰC HIỆN TUẦN TIẾP THEO (TUẦN {tuan_tiep})

Trong Bảng II của file Word, tạo 2 hàng lặp tương tự:

### A. Nhóm I: Nhiệm vụ thường xuyên
Tiêu đề nhóm: `I. Nhiệm vụ thường xuyên ({thuongxuyen_kehoach_count} nhiệm vụ)`

```text
| {stt} | {noi_dung} | {thoi_gian_du_kien} | {san_pham_du_kien} |
```

Cấu trúc vòng lặp docxtemplater:
- Bắt đầu vòng lặp: `{#thuongxuyen_kehoach}`
- Kết thúc vòng lặp: `{/thuongxuyen_kehoach}`

### B. Nhóm II: Nhiệm vụ đột xuất
Tiêu đề nhóm: `II. Nhiệm vụ đột xuất ({dotxuat_kehoach_count} nhiệm vụ)`

```text
| {stt} | {noi_dung} | {thoi_gian_du_kien} | {san_pham_du_kien} |
```

Cấu trúc vòng lặp docxtemplater:
- Bắt đầu vòng lặp: `{#dotxuat_kehoach}`
- Kết thúc vòng lặp: `{/dotxuat_kehoach}`

---

## 4. QUY TẮC ĐỊNH DẠNG FONT & THỂ THỨC (BR01 - BR15)
- Font chữ: **Times New Roman**
- Size chữ tiêu đề: **13-14pt Bold**
- Size chữ bảng: **12-13pt Regular**
- Khoảng cách dòng: **1.15 - 1.3 lines**
- Tự động đánh lại STT bắt đầu từ **1** cho từng phân nhóm trong bảng (BR07).
