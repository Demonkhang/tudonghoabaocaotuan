import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createDocxReport } from './server/src/services/docxService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Sample data fallback
  const sampleData = {
    metadata: {
      tuan: 42,
      tuan_tiep: 43,
      nam: 2024,
      nguoi_lap: "Nguyễn Văn A",
      don_vi: "Văn phòng HĐND & UBND",
      co_quan_cap_tren: "ỦY BAN NHÂN DÂN THÀNH PHỐ",
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

  // API Endpoints
  app.get("/api/sync", (req, res) => {
    res.json({
      success: true,
      data: sampleData,
      syncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      totalTasks: sampleData.table1.length + sampleData.table2.length
    });
  });

  app.post("/api/sync", (req, res) => {
    res.json({
      success: true,
      data: sampleData,
      syncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      totalTasks: sampleData.table1.length + sampleData.table2.length
    });
  });

  app.post("/api/generate-word", (req, res) => {
    try {
      const reportData = req.body || sampleData;
      const docxBuffer = createDocxReport(reportData);
      const filename = `BAO_CAO_TUAN_${reportData.metadata?.tuan || 42}_${reportData.metadata?.nam || 2024}.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(docxBuffer);
    } catch (err: any) {
      console.error("Lỗi xuất file Word:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/generate-pdf", (req, res) => {
    const reportData = req.body || sampleData;
    res.json({
      success: true,
      message: "Xuất dữ liệu PDF thành công",
      data: reportData
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Fullstack Weekly Report System" });
  });

  // Vite Middleware in Development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
