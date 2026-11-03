import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { formatNgayLap } from './docxService.js';

/**
 * Định dạng số có 2 chữ số (ví dụ: 6 -> "06", 0 -> "00") theo mẫu Báo cáo Tháng
 */
function pad2(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n <= 0) return '00';
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Dữ liệu mẫu chuẩn Tháng 9/2026 (Số: 1365/VP) khớp 100% với file Word mẫu của Bộ phận CĐS và Văn thư, lưu trữ
 */
export function getSampleSeptember2026Payload(userFullName = 'Trần Hoàng Phương Nhi') {
  return {
    metadata: {
      so_bao_cao: '1365/VP',
      thang: 9,
      thang_tiep: 10,
      nam: 2026,
      nam_tiep: 2026,
      ngay_lap: '02/10/2026',
      kinh_gui: 'Lãnh đạo Văn Phòng.',
      left_signer_title: 'Ý kiến của Phó Chánh Văn Phòng',
      pho_chanh_vp_name: 'Nguyễn Đức Thắng',
      right_signer_title: 'Người trình',
      nguoi_trinh_name: userFullName || 'Trần Hoàng Phương Nhi'
    },
    muc_I: {
      vb_di: {
        tu_so: '1960',
        den_so: '2310',
        tong_so: 351,
        bang_kiem_tra_loi: [
          { stt: 1, department_name: 'Văn phòng', total_checked: 16, error_count: 0 },
          { stt: 2, department_name: 'Phòng Kế hoạch Tài chính', total_checked: 77, error_count: 6 },
          { stt: 3, department_name: 'Phòng Quản lý Dự án', total_checked: 31, error_count: 17 },
          { stt: 4, department_name: 'Phòng Giám sát Khu liên hợp', total_checked: 11, error_count: 3 },
          { stt: 5, department_name: 'Phòng Giám sát Khối lượng', total_checked: 6, error_count: 0 },
          { stt: 6, department_name: 'Phòng Kiểm tra Môi trường', total_checked: 67, error_count: 18 }
        ],
        phan_bo_phong: [
          { department_name: 'Văn phòng', count: 63 },
          { department_name: 'Phòng Kế hoạch - Tài chính', count: 115 },
          { department_name: 'Phòng Giám sát Khu liên hợp', count: 40 },
          { department_name: 'Phòng Giám sát Khối lượng', count: 8 },
          { department_name: 'Phòng Kiểm tra Môi trường', count: 49 },
          { department_name: 'Phòng Quản lý Dự án', count: 76 }
        ]
      },
      quyet_dinh: {
        tu_so: '335',
        den_so: '391',
        tong_so: 57,
        phan_bo_phong: [
          { department_name: 'Văn phòng', count: 7 },
          { department_name: 'Phòng Kế hoạch Tài chính', count: 32 },
          { department_name: 'Phòng Quản lý Dự án', count: 18 },
          { department_name: 'Phòng Giám sát Khu liên hợp', count: 0 },
          { department_name: 'Phòng Giám sát Khối lượng', count: 0 },
          { department_name: 'Phòng Kiểm tra Môi trường', count: 0 }
        ]
      },
      vb_den: {
        tu_so: '5395',
        den_so: '6099',
        tong_so: 692
      },
      ho_so_nghiem_thu_ctrsh: 12,
      nhiem_vu_cds: [
        'Báo cáo kết quả thực hiện các chỉ tiêu, nhiệm vụ về chuyển đổi số và phát triển đô thị thông minh ngành nông nghiệp và môi trường trên địa bàn Thành phố Hồ Chí Minh quý III năm 2026, Phiếu trình 1245/PTr-VP ngày 07/09/2026;',
        'Trình ký Công văn gửi Ban Cơ yếu về đề nghị khôi phục chữ ký số, Phiếu trình 1258/PTr-VP ngày 10/9/2026; Công văn 2070/VP ngày 10/9/2026;',
        'Đánh giá về các trạm cân tại các Cơ sở xử lý hiện nay, Tờ trình 1268/TTr-VP ngày 14/9/2026;',
        'Triển khai Quy chế số 05-QC/TU ngày 07 tháng 7 năm 2026 của Thành ủy Thành phố Hồ Chí Minh, Phiếu trình 1206/PTr-VP ngày 26/08/2026;',
        'Triển khai Quy chế về quản lý, sử dụng chữ ký số chuyên dùng công vụ, chứng thư chữ ký số chuyên dùng công vụ, thiết bị lưu khóa bí mật và dịch vụ chứng thực chữ ký số chuyên dùng công vụ tại TPHCM, Phiếu trình 1275/PTr-VP ngày 15/9/2026;',
        'Thông báo nội dung kết luận của Giám đốc MBS tại cuộc họp ngày 17/9/2026 về tạo lập, cập nhật và khai thác cơ sở dữ liệu của MBS; Phiếu trình 1288/PTr-VP ngày 18/9/2026;',
        'Xây dựng văn bản góp ý dự thảo Quy chế quản lý, sử dụng hệ thống thư điện tử Thành phố Hồ Chí Minh tại Sở Nông nghiệp và Môi trường; Công văn 2189/BQLKLH-VP ngày 21/9/2026;',
        'Góp ý dự thảo Quy chế về quản lý, sử dụng chữ ký số chuyên dùng công vụ, chứng thư chữ ký số chuyên dùng công vụ, thiết bị lưu khóa bí mật ; Tờ trình 1289/PTr-VP ngày 18/9/2026;',
        'Kết quả rà soát máy tính và thống kê danh mục dữ liệu cần được bảo vệ; Phiếu trình 1299/PTr-VP ngày 21/9/2026.'
      ],
      cong_tac_khac: [
        'Dự thảo Thông báo về việc ban hành Bộ tiêu chí đánh giá công tác lưu trữ tại MBS, Thông báo số 1952/TB-BQLKLH-VP ngày 28/8/2026;',
        'Công văn gửi các phòng góp ý Quyết định ban hành quy chế tiếp nhận, xử lý, phát hành, quản lý và lưu trữ văn bản điện tử của MBS, Công văn số 1219/VP ngày 27/8/2026;',
        'Hoàn thiện hồ sơ nhiệm vụ dự toán mua sắm trang thiết bị phục vụ công tác lưu trữ năm 2027 (theo y/c của P.KHTC Sở), Phiếu trình 1285/PTr-VP ngày 17/9/2026 (kèm hồ sơ nhiệm vụ gồm Tờ trình, Quyết định, Hồ sơ dự toán);',
        'Tổng hợp ý kiến góp ý của các Phòng về việc ban hành Quy chế tiếp nhận, xử lý, phát hành, quản lý và lưu trữ văn bản điện tử của MBS, Phiếu trình số 1274/PTr-VP ngày 15/9/2026; Công văn 1203/VP ngày 25/8/2026;',
        'Thông báo về việc thực hiện kết luận chỉ đạo của Chánh Văn phòng Hoàng Văn Dương tại cuộc họp Bộ phận Văn thư Lưu trữ ngày 21/8/2026, Thông báo 1196/TB-VP ngày 25/8/2026;',
        'Thống kê chỉ đạo của lãnh đạo MBS tại Phần mềm QLVB, Đã rà soát 302/900 văn bản chỉ đạo;'
      ]
    },
    muc_II_chi_dao_dieu_hanh: [
      'Theo dõi, đôn đốc các nhiệm vụ thường xuyên kịp thời đúng hạn;',
      'Hướng dẫn giải quyết các vấn đề phát sinh trong công tác văn thư kịp thời;',
      'Hướng dẫn lập Kế hoạch KPI Quý IV;',
      'Chỉ đạo, kiểm tra và đánh giá công tác vận chuyển tài liệu của Phòng Quản lý Dự án về kho Kỳ Đồng;',
      'Chỉ đạo quản lý và xử lý văn bản đi/đến kịp tiến độ.'
    ],
    muc_III_ket_qua_thang: [
      'Tất cả công văn đến được xử lý kịp thời.',
      'Tất cả công văn đi/Quyết định đều được kiểm soát về mặt thể thức.',
      'Hệ thống hạ tầng công nghệ thông tin (máy chủ, mạng nội bộ…) vận hành ổn định.',
      'Đã đưa cơ sở dữ liệu của cơ quan vào vận hành thử nghiệm để đánh giá.'
    ],
    muc_IV_kho_khan_ton_dong: [
      'Hồ sơ nghiệm thu Hợp đồng cung ứng dịch vụ vận chuyển, vận hành TTC CTRSH của các đơn vị vận chuyển từ đầu năm 2026 đến nay hiện đang được lưu trữ tập trung tại P.KHTC; chưa thực hiện giao nộp hồ sơ về Văn thư để lưu trữ.',
      'Công tác soạn thảo văn bản của các Phòng vẫn chưa được cải thiện không đảm bảo chất lượng đầu ra các Phòng vẫn tiếp tục mắc lỗi mặc dù đã có thông báo phê bình.'
    ],
    muc_V_trong_tam_thang_toi: [
      'Xây dựng Kế hoạch thực hiện công tác bảo vệ bí mật nhà nước của MBS;',
      'Ban hành Quy chế tiếp nhận, xử lý, phát hành, quản lý và lưu trữ văn bản điện tử của Ban Quản lý các Khu liên hợp xử lý chất thải Thành phố;',
      'Dự thảo Quy định Danh mục nguồn nộp lưu, thành phần hồ sơ, tài liệu giấy, tài liệu trên vật mang tin khác nộp lưu vào Trung tâm Chuyển đổi số nông nghiệp và môi trường Thành phố Hồ Chí Minh của MBS - Ban hành Quy chế tiếp nhận, xử lý, phát hành, quản lý và lưu trữ văn bản điện tử của MBS;',
      'Xây dựng Kế hoạch và Danh mục nhiệm vụ KPI Quý IV;',
      'Nghiên cứu, rà soát và chỉnh sửa hoàn thiện Kế hoạch bảo vệ bí mật nhà nước năm 2026 của MBS;',
      'Ban hành quy chế tiếp nhận, xử lý, lưu trữ văn bản điện tử tại MBS;',
      'Rà soát hạ tầng lưu trữ dữ liệu tập trung và phân tán ở MBS;',
      'Rà soát hiện trạng sử dụng phần mềm, trợ lý ảo trí tuệ nhân tạo (AI) của MBS.',
      'Hoàn tất giai đoạn thử nghiệm đối với cơ sở dữ liệu của MBS.',
      'Thực hiện nhiệm vụ công tác văn thư, lưu trữ thường xuyên tại cơ quan./.'
    ]
  };
}

/**
 * Khởi tạo khung Báo cáo Tháng mặc định cho tháng M / năm YYYY bất kỳ
 */
export function getDefaultMonthlyReportPayload(month = 9, year = 2026, userFullName = 'Trần Hoàng Phương Nhi') {
  const m = Number(month) || 9;
  const y = Number(year) || 2026;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;

  // Nếu là tháng 9/2026 thì nạp sẵn mẫu chuẩn 1365/VP để tiện đối chiếu
  if (m === 9 && y === 2026) {
    return getSampleSeptember2026Payload(userFullName);
  }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  return {
    metadata: {
      so_bao_cao: '.../VP',
      thang: m,
      thang_tiep: nextMonth,
      nam: y,
      nam_tiep: nextYear,
      ngay_lap: `${dd}/${mm}/${yyyy}`,
      kinh_gui: 'Lãnh đạo Văn Phòng.',
      left_signer_title: 'Ý kiến của Phó Chánh Văn Phòng',
      pho_chanh_vp_name: 'Nguyễn Đức Thắng',
      right_signer_title: 'Người trình',
      nguoi_trinh_name: userFullName || 'Trần Hoàng Phương Nhi'
    },
    muc_I: {
      vb_di: {
        tu_so: '',
        den_so: '',
        tong_so: 0,
        bang_kiem_tra_loi: [
          { stt: 1, department_name: 'Văn phòng', total_checked: 0, error_count: 0 },
          { stt: 2, department_name: 'Phòng Kế hoạch Tài chính', total_checked: 0, error_count: 0 },
          { stt: 3, department_name: 'Phòng Quản lý Dự án', total_checked: 0, error_count: 0 },
          { stt: 4, department_name: 'Phòng Giám sát Khu liên hợp', total_checked: 0, error_count: 0 },
          { stt: 5, department_name: 'Phòng Giám sát Khối lượng', total_checked: 0, error_count: 0 },
          { stt: 6, department_name: 'Phòng Kiểm tra Môi trường', total_checked: 0, error_count: 0 }
        ],
        phan_bo_phong: [
          { department_name: 'Văn phòng', count: 0 },
          { department_name: 'Phòng Kế hoạch - Tài chính', count: 0 },
          { department_name: 'Phòng Giám sát Khu liên hợp', count: 0 },
          { department_name: 'Phòng Giám sát Khối lượng', count: 0 },
          { department_name: 'Phòng Kiểm tra Môi trường', count: 0 },
          { department_name: 'Phòng Quản lý Dự án', count: 0 }
        ]
      },
      quyet_dinh: {
        tu_so: '',
        den_so: '',
        tong_so: 0,
        phan_bo_phong: [
          { department_name: 'Văn phòng', count: 0 },
          { department_name: 'Phòng Kế hoạch Tài chính', count: 0 },
          { department_name: 'Phòng Quản lý Dự án', count: 0 },
          { department_name: 'Phòng Giám sát Khu liên hợp', count: 0 },
          { department_name: 'Phòng Giám sát Khối lượng', count: 0 },
          { department_name: 'Phòng Kiểm tra Môi trường', count: 0 }
        ]
      },
      vb_den: {
        tu_so: '',
        den_so: '',
        tong_so: 0
      },
      ho_so_nghiem_thu_ctrsh: 0,
      nhiem_vu_cds: [],
      cong_tac_khac: []
    },
    muc_II_chi_dao_dieu_hanh: [
      'Theo dõi, đôn đốc các nhiệm vụ thường xuyên kịp thời đúng hạn;',
      'Hướng dẫn giải quyết các vấn đề phát sinh trong công tác văn thư kịp thời;',
      'Chỉ đạo quản lý và xử lý văn bản đi/đến kịp tiến độ.'
    ],
    muc_III_ket_qua_thang: [
      'Tất cả công văn đến được xử lý kịp thời.',
      'Tất cả công văn đi/Quyết định đều được kiểm soát về mặt thể thức.',
      'Hệ thống hạ tầng công nghệ thông tin (máy chủ, mạng nội bộ…) vận hành ổn định.'
    ],
    muc_IV_kho_khan_ton_dong: [
      'Công tác soạn thảo văn bản của các Phòng vẫn chưa được cải thiện, một số văn bản còn mắc lỗi thể thức và chính tả.'
    ],
    muc_V_trong_tam_thang_toi: [
      'Thực hiện nhiệm vụ công tác chuyển đổi số, văn thư, lưu trữ thường xuyên tại cơ quan./.'
    ]
  };
}

/**
 * Tạo file Word (.docx) Báo cáo Tháng chuẩn thể thức văn bản hành chính của Văn phòng (Mẫu 1365/VP)
 */
export function createMonthlyOfficeDocx(rawPayload) {
  const payload = rawPayload && rawPayload.metadata ? rawPayload : getSampleSeptember2026Payload();
  const meta = payload.metadata || {};
  const mucI = payload.muc_I || {};
  const vbDi = mucI.vb_di || {};
  const quyetDinh = mucI.quyet_dinh || {};
  const vbDen = mucI.vb_den || {};

  const thang = meta.thang || 9;
  const thangTiep = meta.thang_tiep || (thang === 12 ? 1 : Number(thang) + 1);
  const nam = meta.nam || 2026;
  const namTiep = meta.nam_tiep || (thang === 12 ? Number(nam) + 1 : nam);

  // Chuẩn hóa số báo cáo (VD: "1365" -> "1365/VP", "1365/VP" -> "1365/VP")
  let soBaoCaoRaw = String(meta.so_bao_cao || '1365/VP').trim();
  if (soBaoCaoRaw && !soBaoCaoRaw.includes('/')) {
    soBaoCaoRaw = `${soBaoCaoRaw}/VP`;
  }

  const ngayLapText = formatNgayLap(meta.ngay_lap || '02/10/2026');

  // 1. Bảng kiểm tra lỗi thể thức (4 cột)
  const bangKiemTra = (vbDi.bang_kiem_tra_loi || []).map((row, idx) => ({
    stt: idx + 1,
    phong: row.department_name || '',
    tong_vb: pad2(row.total_checked),
    so_loi: pad2(row.error_count)
  }));

  // 2. Danh sách VB đi phát hành theo phòng (Dòng cuối kết thúc bằng dấu chấm '.', các dòng trên dấu ';')
  const phanBoVbDiRaw = (vbDi.phan_bo_phong || []).filter(item => item && item.department_name);
  const phanBoVbDi = phanBoVbDiRaw.map((item, idx) => {
    const isLast = idx === phanBoVbDiRaw.length - 1;
    return {
      line_text: `${item.department_name}: ${pad2(item.count)} VB${isLast ? '.' : ';'}`
    };
  });

  // 3. Danh sách Quyết định phát hành theo phòng (Chỉ hiển thị các phòng có count > 0, hoặc hiển thị 3 phòng mặc định nếu tất cả = 0)
  let qdPhanBoRaw = (quyetDinh.phan_bo_phong || []).filter(item => item && Number(item.count) > 0);
  if (qdPhanBoRaw.length === 0 && (quyetDinh.phan_bo_phong || []).length > 0) {
    qdPhanBoRaw = quyetDinh.phan_bo_phong.slice(0, 3);
  }
  const phanBoQd = qdPhanBoRaw.map((item, idx) => {
    const isLast = idx === qdPhanBoRaw.length - 1;
    return {
      line_text: `${item.department_name}: ${pad2(item.count)} QĐ${isLast ? '.' : ';'}`
    };
  });

  // Helper chuẩn hóa danh sách gạch đầu dòng (loại bỏ dấu '-' ở đầu nếu người dùng đã gõ sẵn để tránh '- - ')
  const normalizeBulletList = (arr, ensureEndingSlashDot = false) => {
    const clean = (arr || [])
      .map(s => String(s || '').trim().replace(/^[-•+]\s*/, '').trim())
      .filter(Boolean);

    if (clean.length === 0) {
      return [{ text: ensureEndingSlashDot ? 'Không./.' : 'Không.' }];
    }

    return clean.map((text, idx) => {
      let finalStr = text;
      if (ensureEndingSlashDot && idx === clean.length - 1) {
        if (!finalStr.endsWith('./.')) {
          finalStr = finalStr.replace(/[.;,]+$/, '') + './.';
        }
      }
      return { text: finalStr };
    });
  };

  const formattedData = {
    so_bao_cao: soBaoCaoRaw,
    ngay_lap: ngayLapText,
    thang,
    thang_tiep: thangTiep,
    nam,
    nam_tiep: namTiep,
    kinh_gui: meta.kinh_gui || 'Lãnh đạo Văn Phòng.',

    // Mục I.1
    vb_di_tu_so: vbDi.tu_so || '...',
    vb_di_den_so: vbDi.den_so || '...',
    vb_di_tong_so: vbDi.tong_so ?? 0,
    bang_kiem_tra: bangKiemTra,
    phan_bo_vb_di: phanBoVbDi,

    qd_tu_so: quyetDinh.tu_so || '...',
    qd_den_so: quyetDinh.den_so || '...',
    qd_tong_so: quyetDinh.tong_so ?? 0,
    phan_bo_qd: phanBoQd,

    // Mục I.2 & I.3
    vb_den_tu_so: vbDen.tu_so || '...',
    vb_den_den_so: vbDen.den_so || '...',
    vb_den_tong_so: vbDen.tong_so ?? 0,
    ho_so_nghiem_thu: pad2(mucI.ho_so_nghiem_thu_ctrsh ?? 0),

    // Mục I.4 & Các công tác khác
    nhiem_vu_cds: normalizeBulletList(mucI.nhiem_vu_cds),
    cong_tac_khac: normalizeBulletList(mucI.cong_tac_khac),

    // Mục II, III, IV, V
    muc_II_list: normalizeBulletList(payload.muc_II_chi_dao_dieu_hanh),
    muc_III_list: normalizeBulletList(payload.muc_III_ket_qua_thang),
    muc_IV_list: normalizeBulletList(payload.muc_IV_kho_khan_ton_dong),
    muc_V_list: normalizeBulletList(payload.muc_V_trong_tam_thang_toi, true),

    // Chữ ký
    left_signer_title: meta.left_signer_title || 'Ý kiến của Phó Chánh Văn Phòng',
    pho_chanh_vp_name: meta.pho_chanh_vp_name || 'Nguyễn Đức Thắng',
    right_signer_title: meta.right_signer_title || 'Người trình',
    nguoi_trinh_name: meta.nguoi_trinh_name || 'Trần Hoàng Phương Nhi'
  };

  const zip = createMonthlyDocxZipTemplate();
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    }
  });

  doc.render(formattedData);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function createMonthlyDocxZipTemplate() {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- HEADER 2 CỘT QUỐC HIỆU - TIÊU NGỮ & SỐ KÝ HIỆU (ĐẢM BẢO NGÀY THÁNG NẰM TRÊN 1 DÒNG) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9355" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
          <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="30" w:type="dxa"/>
          <w:bottom w:w="30" w:type="dxa"/>
          <w:left w:w="20" w:type="dxa"/>
          <w:right w:w="20" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3855" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="20"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>BAN QUẢN LÝ CÁC KHU LIÊN HỢP</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="20"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>XỬ LÝ CHẤT THẢI THÀNH PHỐ</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>VĂN PHÒNG</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5500" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="20"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3855" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Số: {so_bao_cao}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5500" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="40" w:after="80"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:i/><w:sz w:val="25"/><w:color w:val="000000"/></w:rPr><w:t>{ngay_lap}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- TIÊU ĐỀ BÁO CÁO -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:color w:val="000000"/></w:rPr><w:t>BÁO CÁO</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kết quả thực hiện nhiệm vụ tháng {thang}, phương hướng thực hiện nhiệm vụ công tác tháng {thang_tiep} - {nam_tiep} của Bộ phận Chuyển đổi số và Văn thư, lưu trữ</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Kính gửi: {kinh_gui}</w:t></w:r>
    </w:p>

    <!-- LỜI MỞ ĐẦU -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="120" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Bộ phận Chuyển đổi số và Văn thư, lưu trữ báo cáo tình hình thực hiện nhiệm vụ tháng {thang} và phương hướng thực hiện nhiệm vụ trọng tâm công tác tháng {thang_tiep} năm {nam_tiep} như sau:</w:t></w:r>
    </w:p>

    <!-- MỤC I -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="80"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>I. Kết quả thực hiện của Bộ phận Chuyển đổi số - Văn thư lưu trữ trong tháng {thang} năm {nam}</w:t></w:r>
    </w:p>

    <!-- 1. Rà soát thể thức, chính tả -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="60" w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>1. Rà soát thể thức, chính tả và phát hành (cấp phát số, ghi sổ…) công văn đi của MBS phát hành:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="80"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Văn bản Đi từ số {vb_di_tu_so} - {vb_di_den_so}, gồm {vb_di_tong_so} VB, trong đó:</w:t></w:r>
    </w:p>

    <!-- BẢNG 4 CỘT KIỂM TRA THỂ THỨC -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="60" w:type="dxa"/>
          <w:bottom w:w="60" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="900" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4100" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Phòng</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Tổng số VB kiểm tra</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1700" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Số lỗi</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="900" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{#bang_kiem_tra}{stt}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4100" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{phong}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{tong_vb}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1700" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{so_loi}{/bang_kiem_tra}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- PHÂN BỔ VĂN BẢN ĐI THEO PHÒNG -->
    <w:p><w:r><w:t>{#phan_bo_vb_di}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="30"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{line_text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/phan_bo_vb_di}</w:t></w:r></w:p>

    <!-- QUYẾT ĐỊNH -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="80" w:after="40"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Quyết định từ số {qd_tu_so} - {qd_den_so}, gồm {qd_tong_so} QĐ, trong đó:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#phan_bo_qd}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="30"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{line_text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/phan_bo_qd}</w:t></w:r></w:p>

    <!-- 2. Tiếp nhận công văn đến -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="80" w:after="40"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>2. Tiếp nhận, luân chuyển công văn đến của MBS:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- Số lượng Văn bản đến từ số {vb_den_tu_so} - {vb_den_den_so}, gồm {vb_den_tong_so} VB.</w:t></w:r>
    </w:p>

    <!-- 3. Tiếp nhận hồ sơ nghiệm thu CTRSH -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="80" w:after="40"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>3. Tiếp nhận hồ sơ nghiệm thu xác nhận khối lượng CTRSH của các Đơn vị vận chuyển:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- Số lượng Hồ sơ nghiệm thu: {ho_so_nghiem_thu} bộ.</w:t></w:r>
    </w:p>

    <!-- 4. Các nhiệm vụ chuyển đổi số -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="80" w:after="40"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>4. Các nhiệm vụ chuyển đổi số</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#nhiem_vu_cds}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/nhiem_vu_cds}</w:t></w:r></w:p>

    <!-- Các công tác khác -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="80" w:after="40"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>Các công tác khác</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#cong_tac_khac}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/cong_tac_khac}</w:t></w:r></w:p>

    <!-- MỤC II: Công tác chỉ đạo, điều hành -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>II. Công tác chỉ đạo, điều hành</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#muc_II_list}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/muc_II_list}</w:t></w:r></w:p>

    <!-- MỤC III: Kết quả thực hiện công tác Tháng -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>III. Kết quả thực hiện công tác Tháng {thang}- {nam}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#muc_III_list}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/muc_III_list}</w:t></w:r></w:p>

    <!-- MỤC IV: Khó khăn, tồn đọng, đề xuất khắc phục -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>IV. Khó khăn, tồn đọng, đề xuất khắc phục</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#muc_IV_list}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/muc_IV_list}</w:t></w:r></w:p>

    <!-- MỤC V: Trọng tâm công tác Tháng tiếp theo -->
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="60"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>V. Trọng tâm công tác Tháng {thang_tiep}/{nam_tiep}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{#muc_V_list}</w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:before="30" w:after="40" w:line="276" w:lineRule="auto"/><w:ind w:firstLine="567"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>- {text}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{/muc_V_list}</w:t></w:r></w:p>

    <!-- KHỐI CHỮ KÝ 2 CỘT CUỐI TRANG -->
    <w:p><w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr></w:p>
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
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="900"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{left_signer_title}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{pho_chanh_vp_name}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4678" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="900"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{right_signer_title}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr><w:t>{nguoi_trinh_name}</w:t></w:r>
          </w:p>
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

