import React, { useState, useEffect } from 'react';
import {
  Calendar,
  FileText,
  Save,
  Download,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ClipboardPaste,
  Printer,
  ArrowUp,
  ArrowDown,
  History
} from 'lucide-react';
import {
  fetchMonthlyReportDetail,
  saveMonthlyReportData,
  autoAggregateMonthlyReportApi,
  exportMonthlyWordReport,
  fetchMonthlyReportHistory
} from '../services/api';
import { formatNgayLap } from '../utils/reportUtils';

export interface MonthlyReportData {
  metadata: {
    so_bao_cao: string;
    thang: number;
    thang_tiep: number;
    nam: number;
    nam_tiep: number;
    ngay_lap: string;
    kinh_gui: string;
    left_signer_title?: string;
    pho_chanh_vp_name: string;
    right_signer_title?: string;
    nguoi_trinh_name: string;
  };
  muc_I: {
    vb_di: {
      tu_so: string;
      den_so: string;
      tong_so: number;
      bang_kiem_tra_loi: Array<{
        stt: number;
        department_name: string;
        total_checked: number;
        error_count: number;
      }>;
      phan_bo_phong: Array<{
        department_name: string;
        count: number;
      }>;
    };
    quyet_dinh: {
      tu_so: string;
      den_so: string;
      tong_so: number;
      phan_bo_phong: Array<{
        department_name: string;
        count: number;
      }>;
    };
    vb_den: {
      tu_so: string;
      den_so: string;
      tong_so: number;
    };
    ho_so_nghiem_thu_ctrsh: number;
    nhiem_vu_cds: string[];
    cong_tac_khac: string[];
  };
  muc_II_chi_dao_dieu_hanh: string[];
  muc_III_ket_qua_thang: string[];
  muc_IV_kho_khan_ton_dong: string[];
  muc_V_trong_tam_thang_toi: string[];
}

export function getSampleSeptember2026Data(userFullName?: string): MonthlyReportData {
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

function pad2(num: number | string | undefined): string {
  const n = parseInt(String(num ?? 0), 10);
  if (isNaN(n) || n <= 0) return '00';
  return n < 10 ? `0${n}` : String(n);
}

interface BulletListEditorProps {
  title: string;
  subtitle?: string;
  badgeColor?: string;
  items: string[];
  onChange: (newItems: string[]) => void;
  placeholder?: string;
}

const BulletListEditor: React.FC<BulletListEditorProps> = ({
  title,
  subtitle,
  badgeColor = 'emerald',
  items,
  onChange,
  placeholder = 'Nhập nội dung dòng mới (nhấn Enter hoặc nút Thêm)...'
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleAdd = () => {
    const clean = newItemText.trim().replace(/^[-•+]\s*/, '');
    if (!clean) return;
    onChange([...items, clean]);
    setNewItemText('');
  };

  const handleBulkAdd = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map(l => l.trim().replace(/^[-•+]\s*/, '').trim())
      .filter(Boolean);
    if (lines.length > 0) {
      onChange([...items, ...lines]);
    }
    setBulkText('');
    setIsBulkPasteOpen(false);
  };

  const handleUpdateItem = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black bg-${badgeColor}-500/20 text-${badgeColor}-300 border border-${badgeColor}-500/40`}>
              {items.length} dòng
            </span>
            <span>{title}</span>
          </h4>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={() => setIsBulkPasteOpen(!isBulkPasteOpen)}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isBulkPasteOpen ? 'Đóng dán nhanh' : 'Dán nhiều dòng từ Word'}</span>
        </button>
      </div>

      {/* BULK PASTE AREA */}
      {isBulkPasteOpen && (
        <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/40 space-y-2">
          <p className="text-[11px] text-cyan-300 font-semibold">
            Copy nhiều dòng gạch đầu dòng từ file Word hoặc Excel và dán vào ô dưới đây (mỗi dòng sẽ tự động tách thành 1 mục):
          </p>
          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="- Nội dung nhiệm vụ 1, Phiếu trình 1245/PTr-VP ngày 07/09/2026;&#10;- Nội dung nhiệm vụ 2..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBulkPasteOpen(false)}
              className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleBulkAdd}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              + Thêm tất cả các dòng
            </button>
          </div>
        </div>
      )}

      {/* ADD NEW LINE */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm dòng</span>
        </button>
      </div>

      {/* LIST ITEMS */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500 italic bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
            Chưa có nội dung nào. Hãy nhập dòng mới hoặc bấm "Tổng hợp từ các Tuần".
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-slate-950/90 hover:bg-slate-950 p-2 rounded-xl border border-slate-800/90 group transition-all"
            >
              <span className="text-xs font-bold text-emerald-400 mt-1.5 px-1 select-none">
                -
              </span>
              <textarea
                rows={item.length > 110 ? 2 : 1}
                value={item}
                onChange={(e) => handleUpdateItem(idx, e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-100 focus:bg-slate-900 focus:px-2 focus:py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/60 resize-y leading-relaxed"
              />
              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded cursor-pointer"
                  title="Xóa dòng này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    username: string;
    full_name: string;
    department_id?: string;
    department_name?: string;
  } | null;
  defaultYear?: number;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  defaultYear = 2026
}) => {
  const [reportData, setReportData] = useState<MonthlyReportData>(() =>
    getSampleSeptember2026Data(currentUser?.full_name || 'Trần Hoàng Phương Nhi')
  );
  const [activeTab, setActiveTab] = useState<'muc1_stats' | 'muc1_tasks' | 'muc2_3' | 'muc4_5' | 'sign_history'>('muc1_stats');
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavedInDb, setIsSavedInDb] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadMonthData = async (month: number, year: number) => {
    setIsLoading(true);
    try {
      const res = await fetchMonthlyReportDetail(
        month,
        year,
        currentUser?.id,
        currentUser?.full_name || 'Trần Hoàng Phương Nhi'
      );
      if (res && res.success && res.data) {
        setReportData(res.data);
        setIsSavedInDb(Boolean(res.is_saved));
      }
    } catch (e) {
      console.warn('Lỗi tải Báo cáo tháng:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    const res = await fetchMonthlyReportHistory();
    if (res && res.success && Array.isArray(res.reports)) {
      setHistoryList(res.reports);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMonthData(reportData.metadata.thang, reportData.metadata.nam);
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { metadata, muc_I } = reportData;

  const handleChangeMonthYear = (newMonth: number, newYear: number) => {
    const nextMonth = newMonth === 12 ? 1 : newMonth + 1;
    const nextYear = newMonth === 12 ? newYear + 1 : newYear;
    setReportData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        thang: newMonth,
        thang_tiep: nextMonth,
        nam: newYear,
        nam_tiep: nextYear
      }
    }));
    loadMonthData(newMonth, newYear);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await saveMonthlyReportData(
        reportData,
        currentUser?.id || 'acc_vp_hoa',
        currentUser?.department_id || 'dept_vp'
      );
      if (res && res.success) {
        setIsSavedInDb(true);
        showToast(`✅ Đã lưu Báo cáo Tháng ${metadata.thang}/${metadata.nam} vào CSDL!`);
        loadHistory();
      } else {
        showToast(`⚠️ Lỗi lưu: ${res?.error || 'Không xác định'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    setIsLoading(true);
    try {
      await exportMonthlyWordReport(reportData);
      showToast(`📥 Đã xuất file Word BAO_CAO_THANG_${metadata.thang}_${metadata.nam}_VP.docx!`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAggregateFromWeeks = async () => {
    setIsLoading(true);
    try {
      const res = await autoAggregateMonthlyReportApi(metadata.thang, metadata.nam);
      if (res && res.success && res.aggregated) {
        const agg = res.aggregated;
        setReportData(prev => ({
          ...prev,
          muc_I: {
            ...prev.muc_I,
            vb_di: {
              ...prev.muc_I.vb_di,
              bang_kiem_tra_loi:
                agg.bang_kiem_tra_loi && agg.bang_kiem_tra_loi.some((r: any) => r.total_checked > 0 || r.error_count > 0)
                  ? agg.bang_kiem_tra_loi
                  : prev.muc_I.vb_di.bang_kiem_tra_loi
            },
            nhiem_vu_cds:
              agg.nhiem_vu_cds && agg.nhiem_vu_cds.length > 0
                ? Array.from(new Set([...prev.muc_I.nhiem_vu_cds, ...agg.nhiem_vu_cds]))
                : prev.muc_I.nhiem_vu_cds,
            cong_tac_khac:
              agg.cong_tac_khac && agg.cong_tac_khac.length > 0
                ? Array.from(new Set([...prev.muc_I.cong_tac_khac, ...agg.cong_tac_khac]))
                : prev.muc_I.cong_tac_khac
          },
          muc_IV_kho_khan_ton_dong:
            agg.kho_khan_ton_dong && agg.kho_khan_ton_dong.length > 0
              ? Array.from(new Set([...prev.muc_IV_kho_khan_ton_dong, ...agg.kho_khan_ton_dong]))
              : prev.muc_IV_kho_khan_ton_dong,
          muc_V_trong_tam_thang_toi:
            agg.trong_tam_thang_toi && agg.trong_tam_thang_toi.length > 0
              ? Array.from(new Set([...prev.muc_V_trong_tam_thang_toi, ...agg.trong_tam_thang_toi]))
              : prev.muc_V_trong_tam_thang_toi
        }));
        showToast(`⚡ ${res.message}`);
      } else {
        showToast(`ℹ️ ${res?.message || 'Không có dữ liệu tuần để tổng hợp'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Kiểm tra tổng số VB đi phân bổ của 6 phòng so với Tổng số VB đi
  const sumVbDiPhong = (muc_I.vb_di.phan_bo_phong || []).reduce((acc, r) => acc + (Number(r.count) || 0), 0);
  const sumQdPhong = (muc_I.quyet_dinh.phan_bo_phong || []).reduce((acc, r) => acc + (Number(r.count) || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[270] flex flex-col overflow-hidden animate-fadeIn">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-[300] bg-emerald-900/95 border border-emerald-400 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-800/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                CHỨC NĂNG TẠO BÁO CÁO THÁNG (MẪU VĂN PHÒNG - NĐ30)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Độc lập 100% • Không ảnh hưởng Form Tuần
              </span>
              {isSavedInDb && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  Đã lưu DB
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Bộ phận Chuyển đổi số và Văn thư, lưu trữ — Mẫu chuẩn Số: {metadata.so_bao_cao || '1365/VP'}
            </p>
          </div>
        </div>

        {/* MONTH / YEAR & ACTION CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chọn Tháng / Năm */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700 px-2.5 py-1 rounded-xl text-xs">
            <span className="text-slate-400 font-bold text-[11px]">Tháng:</span>
            <select
              value={metadata.thang}
              onChange={(e) => handleChangeMonthYear(Number(e.target.value), metadata.nam)}
              className="bg-amber-600 text-white font-extrabold rounded-lg px-2 py-0.5 text-xs cursor-pointer outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  Tháng {m}
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-bold text-[11px] ml-1">Năm:</span>
            <select
              value={metadata.nam}
              onChange={(e) => handleChangeMonthYear(metadata.thang, Number(e.target.value))}
              className="bg-slate-800 text-white font-bold rounded-lg px-2 py-0.5 text-xs border border-slate-700 cursor-pointer outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Nút Tổng hợp từ Tuần */}
          <button
            type="button"
            onClick={handleAutoAggregateFromWeeks}
            disabled={isLoading}
            className="px-3 py-1.5 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Tự động cộng dồn bảng lỗi thể thức & gom nhiệm vụ từ các Báo cáo Tuần trong tháng"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>⚡ Gộp từ các Tuần T{metadata.thang}</span>
          </button>

          {/* Nút Nạp Mẫu Chuẩn 1365/VP */}
          <button
            type="button"
            onClick={() => {
              setReportData(getSampleSeptember2026Data(currentUser?.full_name || 'Trần Hoàng Phương Nhi'));
              showToast('📋 Đã nạp toàn bộ dữ liệu mẫu chuẩn Số 1365/VP (Tháng 9/2026)!');
            }}
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Khôi phục nguyên bản mẫu Báo cáo Tháng 9/2026 (Số 1365/VP)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp Mẫu 1365/VP</span>
          </button>

          {/* Chế độ hiển thị */}
          <div className="hidden lg:flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Soạn thảo</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Song song</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem A4</span>
            </button>
          </div>

          {/* Nút Lưu DB */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Báo Cáo</span>
          </button>

          {/* Nút Xuất Word (.docx) */}
          <button
            type="button"
            onClick={handleExportWord}
            disabled={isLoading}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg border border-blue-400/40 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Word (.docx)</span>
          </button>

          {/* Đóng */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer font-bold text-sm px-2.5 transition-all"
            title="Đóng cửa sổ Báo cáo Tháng (Quay về Báo cáo Tuần)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* METADATA SUB-BAR (Số báo cáo, Ngày lập, Kính gửi) */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">Số văn bản:</span>
            <input
              type="text"
              value={metadata.so_bao_cao}
              onChange={(e) =>
                setReportData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, so_bao_cao: e.target.value }
                }))
              }
              placeholder="1365/VP"
              className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-amber-300 font-extrabold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">Ngày lập báo cáo:</span>
            <input
              type="text"
              value={metadata.ngay_lap}
              onChange={(e) =>
                setReportData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, ngay_lap: e.target.value }
                }))
              }
              placeholder="02/10/2026"
              className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-semibold focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">Kính gửi:</span>
            <input
              type="text"
              value={metadata.kinh_gui}
              onChange={(e) =>
                setReportData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, kinh_gui: e.target.value }
                }))
              }
              className="w-48 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-semibold focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* NAVIGATION TABS FOR EDITOR */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('muc1_stats')}
            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all shrink-0 ${
              activeTab === 'muc1_stats'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            1. Thống kê VB &amp; Lỗi (Mục I.1 - I.3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muc1_tasks')}
            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all shrink-0 ${
              activeTab === 'muc1_tasks'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            2. Nhiệm vụ CĐS &amp; Công tác khác (Mục I.4)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muc2_3')}
            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all shrink-0 ${
              activeTab === 'muc2_3'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            3. Chỉ đạo &amp; Đánh giá (Mục II &amp; III)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muc4_5')}
            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all shrink-0 ${
              activeTab === 'muc4_5'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            4. Khó khăn &amp; Trọng tâm T{metadata.thang_tiep} (Mục IV &amp; V)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sign_history')}
            className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all shrink-0 ${
              activeTab === 'sign_history'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
            }`}
          >
            ✍️ Chữ ký &amp; Lịch sử ({historyList.length})
          </button>
        </div>
      </div>

      {/* MAIN CONTENT BODY (SPLIT EDITOR + LIVE A4 PREVIEW) */}
      <div className="flex-1 overflow-hidden grid grid-cols-12 min-h-0">
        {/* LEFT COLUMN: FORM EDITOR */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div
            className={`${
              viewMode === 'split' ? 'col-span-12 lg:col-span-7 border-r border-slate-800' : 'col-span-12 max-w-5xl mx-auto w-full'
            } overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-950 text-slate-100`}
          >
            {/* TAB 1: MỤC I.1, I.2, I.3 */}
            {activeTab === 'muc1_stats' && (
              <div className="space-y-5">
                {/* 1. CÔNG VĂN ĐI & BẢNG KIỂM TRA THỂ THỨC */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <h3 className="text-sm font-extrabold text-emerald-300">
                      I.1. Rà soát thể thức, chính tả và phát hành Công văn đi &amp; Quyết định
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Văn bản đi từ số:</span>
                      <input
                        type="text"
                        value={muc_I.vb_di.tu_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              vb_di: { ...prev.muc_I.vb_di, tu_so: e.target.value }
                            }
                          }))
                        }
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
                      />
                      <span className="text-slate-400">đến số:</span>
                      <input
                        type="text"
                        value={muc_I.vb_di.den_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              vb_di: { ...prev.muc_I.vb_di, den_so: e.target.value }
                            }
                          }))
                        }
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
                      />
                      <span className="text-slate-400">Gồm tổng số:</span>
                      <input
                        type="number"
                        value={muc_I.vb_di.tong_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              vb_di: { ...prev.muc_I.vb_di, tong_so: parseInt(e.target.value, 10) || 0 }
                            }
                          }))
                        }
                        className="w-20 bg-slate-950 border border-emerald-600/60 rounded-lg px-2 py-1 text-center font-extrabold text-emerald-300"
                      />
                      <span className="text-slate-400 font-semibold">VB</span>
                    </div>
                  </div>

                  {/* BẢNG 4 CỘT KIỂM TRA LỖI + CỘT PHÂN BỔ VB ĐI */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Bảng 4 cột Kiểm tra thể thức */}
                    <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                        <span>Bảng kiểm tra thể thức (4 cột trên file Word)</span>
                        <span className="text-[10px] text-slate-400">Tự động format 2 chữ số (00, 06...)</span>
                      </div>
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px]">
                          <tr>
                            <th className="py-2 px-2 text-center w-10">STT</th>
                            <th className="py-2 px-2">Phòng</th>
                            <th className="py-2 px-2 text-center w-24">Tổng VB KT</th>
                            <th className="py-2 px-2 text-center w-20">Số lỗi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {muc_I.vb_di.bang_kiem_tra_loi.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="py-1.5 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-1.5 px-2 font-medium text-slate-200">{row.department_name}</td>
                              <td className="py-1.5 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.total_checked}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    const updated = [...muc_I.vb_di.bang_kiem_tra_loi];
                                    updated[idx] = { ...updated[idx], total_checked: val };
                                    setReportData(prev => ({
                                      ...prev,
                                      muc_I: {
                                        ...prev.muc_I,
                                        vb_di: { ...prev.muc_I.vb_di, bang_kiem_tra_loi: updated }
                                      }
                                    }));
                                  }}
                                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-bold text-emerald-400"
                                />
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.error_count}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    const updated = [...muc_I.vb_di.bang_kiem_tra_loi];
                                    updated[idx] = { ...updated[idx], error_count: val };
                                    setReportData(prev => ({
                                      ...prev,
                                      muc_I: {
                                        ...prev.muc_I,
                                        vb_di: { ...prev.muc_I.vb_di, bang_kiem_tra_loi: updated }
                                      }
                                    }));
                                  }}
                                  className={`w-14 bg-slate-900 border rounded px-1.5 py-1 text-center font-bold ${
                                    row.error_count > 0 ? 'border-rose-500/70 text-rose-400' : 'border-slate-700 text-slate-300'
                                  }`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Số lượng VB đi phát hành theo từng Phòng */}
                    <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Số lượng VB đi phát hành theo Phòng</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                              sumVbDiPhong === Number(muc_I.vb_di.tong_so)
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            Tổng cộng: {sumVbDiPhong} / {muc_I.vb_di.tong_so} VB
                          </span>
                        </div>
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px]">
                            <tr>
                              <th className="py-2 px-3">Phòng ban</th>
                              <th className="py-2 px-3 text-center w-28">Số VB phát hành</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {muc_I.vb_di.phan_bo_phong.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="py-1.5 px-3 font-medium text-slate-200">{item.department_name}</td>
                                <td className="py-1.5 px-3 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.count}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      const updated = [...muc_I.vb_di.phan_bo_phong];
                                      updated[idx] = { ...updated[idx], count: val };
                                      setReportData(prev => ({
                                        ...prev,
                                        muc_I: {
                                          ...prev.muc_I,
                                          vb_di: { ...prev.muc_I.vb_di, phan_bo_phong: updated }
                                        }
                                      }));
                                    }}
                                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-sky-300"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {sumVbDiPhong !== Number(muc_I.vb_di.tong_so) && (
                        <div className="p-2 bg-amber-950/40 border-t border-amber-800/50 text-[11px] text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Tổng các phòng ({sumVbDiPhong}) đang khác Tổng số VB đi ({muc_I.vb_di.tong_so}).
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setReportData(prev => ({
                                ...prev,
                                muc_I: {
                                  ...prev.muc_I,
                                  vb_di: { ...prev.muc_I.vb_di, tong_so: sumVbDiPhong }
                                }
                              }))
                            }
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer"
                          >
                            Cập nhật = {sumVbDiPhong}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* QUYẾT ĐỊNH PHÁT HÀNH & CÔNG VĂN ĐẾN & HỒ SƠ CTRSH */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Quyết định */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-extrabold text-amber-300 uppercase">
                        Quyết định phát hành trong tháng
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Tổng các phòng: <strong className="text-amber-300">{sumQdPhong}</strong> / {muc_I.quyet_dinh.tong_so} QĐ
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">Từ số:</span>
                      <input
                        type="text"
                        value={muc_I.quyet_dinh.tu_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              quyet_dinh: { ...prev.muc_I.quyet_dinh, tu_so: e.target.value }
                            }
                          }))
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
                      />
                      <span className="text-slate-400">đến số:</span>
                      <input
                        type="text"
                        value={muc_I.quyet_dinh.den_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              quyet_dinh: { ...prev.muc_I.quyet_dinh, den_so: e.target.value }
                            }
                          }))
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
                      />
                      <span className="text-slate-400">Gồm:</span>
                      <input
                        type="number"
                        value={muc_I.quyet_dinh.tong_so}
                        onChange={(e) =>
                          setReportData(prev => ({
                            ...prev,
                            muc_I: {
                              ...prev.muc_I,
                              quyet_dinh: { ...prev.muc_I.quyet_dinh, tong_so: parseInt(e.target.value, 10) || 0 }
                            }
                          }))
                        }
                        className="w-16 bg-slate-950 border border-amber-600/60 rounded-lg px-2 py-1 text-center font-extrabold text-amber-300"
                      />
                      <span className="text-slate-400 font-semibold">QĐ</span>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      * Lưu ý: Phòng nào có số QĐ = 0 sẽ tự động ẩn khi xuất file Word (đúng chuẩn mẫu 1365/VP).
                    </p>

                    <div className="space-y-1.5">
                      {muc_I.quyet_dinh.phan_bo_phong.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                          <span className={item.count > 0 ? 'text-white font-semibold' : 'text-slate-500'}>
                            {item.department_name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={item.count}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                const updated = [...muc_I.quyet_dinh.phan_bo_phong];
                                updated[idx] = { ...updated[idx], count: val };
                                setReportData(prev => ({
                                  ...prev,
                                  muc_I: {
                                    ...prev.muc_I,
                                    quyet_dinh: { ...prev.muc_I.quyet_dinh, phan_bo_phong: updated }
                                  }
                                }));
                              }}
                              className={`w-16 bg-slate-900 border rounded px-2 py-0.5 text-center font-bold ${
                                item.count > 0 ? 'border-amber-500/60 text-amber-300' : 'border-slate-800 text-slate-500'
                              }`}
                            />
                            <span className="text-slate-400 text-[11px]">QĐ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mục I.2 (Công văn đến) & Mục I.3 (Hồ sơ nghiệm thu CTRSH) */}
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-extrabold text-cyan-300 uppercase border-b border-slate-800 pb-2">
                        I.2. Tiếp nhận, luân chuyển công văn đến của MBS
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Văn bản đến từ số:</label>
                          <input
                            type="text"
                            value={muc_I.vb_den.tu_so}
                            onChange={(e) =>
                              setReportData(prev => ({
                                ...prev,
                                muc_I: {
                                  ...prev.muc_I,
                                  vb_den: { ...prev.muc_I.vb_den, tu_so: e.target.value }
                                }
                              }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-bold text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Đến số:</label>
                          <input
                            type="text"
                            value={muc_I.vb_den.den_so}
                            onChange={(e) =>
                              setReportData(prev => ({
                                ...prev,
                                muc_I: {
                                  ...prev.muc_I,
                                  vb_den: { ...prev.muc_I.vb_den, den_so: e.target.value }
                                }
                              }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-bold text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Tổng số VB đến:</label>
                          <input
                            type="number"
                            value={muc_I.vb_den.tong_so}
                            onChange={(e) =>
                              setReportData(prev => ({
                                ...prev,
                                muc_I: {
                                  ...prev.muc_I,
                                  vb_den: { ...prev.muc_I.vb_den, tong_so: parseInt(e.target.value, 10) || 0 }
                                }
                              }))
                            }
                            className="w-full bg-slate-950 border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-center font-extrabold text-cyan-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-extrabold text-purple-300 uppercase border-b border-slate-800 pb-2">
                        I.3. Tiếp nhận hồ sơ nghiệm thu xác nhận khối lượng CTRSH
                      </h4>
                      <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-200 font-semibold">
                          Số lượng Hồ sơ nghiệm thu của các Đơn vị vận chuyển:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={muc_I.ho_so_nghiem_thu_ctrsh}
                            onChange={(e) =>
                              setReportData(prev => ({
                                ...prev,
                                muc_I: {
                                  ...prev.muc_I,
                                  ho_so_nghiem_thu_ctrsh: Math.max(0, parseInt(e.target.value, 10) || 0)
                                }
                              }))
                            }
                            className="w-20 bg-slate-900 border border-purple-500/60 rounded-lg px-2.5 py-1.5 text-center font-extrabold text-purple-300 text-sm"
                          />
                          <span className="text-slate-300 font-bold">bộ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MỤC I.4 (CÁC NHIỆM VỤ CHUYỂN ĐỔI SỐ) & CÁC CÔNG TÁC KHÁC */}
            {activeTab === 'muc1_tasks' && (
              <div className="space-y-5">
                <BulletListEditor
                  title="I.4. Các nhiệm vụ chuyển đổi số"
                  subtitle="Danh sách các nhiệm vụ của Tổ Chuyển đổi số kèm số hiệu Phiếu trình / Tờ trình / Công văn và ngày tháng"
                  badgeColor="blue"
                  items={muc_I.nhiem_vu_cds}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_I: { ...prev.muc_I, nhiem_vu_cds: newItems }
                    }))
                  }
                  placeholder="VD: Báo cáo kết quả thực hiện các chỉ tiêu CĐS quý III năm 2026, Phiếu trình 1245/PTr-VP ngày 07/09/2026;"
                />

                <BulletListEditor
                  title="Các công tác khác (Văn thư - Lưu trữ)"
                  subtitle="Danh sách các nhiệm vụ chuyên môn văn thư, lưu trữ, dự toán, quy chế..."
                  badgeColor="emerald"
                  items={muc_I.cong_tac_khac}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_I: { ...prev.muc_I, cong_tac_khac: newItems }
                    }))
                  }
                  placeholder="VD: Dự thảo Thông báo về việc ban hành Bộ tiêu chí đánh giá công tác lưu trữ tại MBS, Thông báo số 1952/TB-BQLKLH-VP ngày 28/8/2026;"
                />
              </div>
            )}

            {/* TAB 3: MỤC II & MỤC III */}
            {activeTab === 'muc2_3' && (
              <div className="space-y-5">
                <BulletListEditor
                  title="II. Công tác chỉ đạo, điều hành"
                  subtitle="Các nội dung theo dõi, đôn đốc, hướng dẫn nghiệp vụ văn thư và quản lý điều hành trong tháng"
                  badgeColor="indigo"
                  items={reportData.muc_II_chi_dao_dieu_hanh}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_II_chi_dao_dieu_hanh: newItems
                    }))
                  }
                  placeholder="VD: Theo dõi, đôn đốc các nhiệm vụ thường xuyên kịp thời đúng hạn;"
                />

                <BulletListEditor
                  title={`III. Kết quả thực hiện công tác Tháng ${metadata.thang} - ${metadata.nam}`}
                  subtitle="Đánh giá tổng quát kết quả xử lý văn bản, kiểm soát thể thức, vận hành hạ tầng CNTT & CSDL"
                  badgeColor="emerald"
                  items={reportData.muc_III_ket_qua_thang}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_III_ket_qua_thang: newItems
                    }))
                  }
                  placeholder="VD: Tất cả công văn đến được xử lý kịp thời."
                />
              </div>
            )}

            {/* TAB 4: MỤC IV & MỤC V */}
            {activeTab === 'muc4_5' && (
              <div className="space-y-5">
                <BulletListEditor
                  title="IV. Khó khăn, tồn đọng, đề xuất khắc phục"
                  subtitle="Nêu các tồn đọng về giao nộp hồ sơ lưu trữ, chất lượng soạn thảo văn bản của các Phòng..."
                  badgeColor="rose"
                  items={reportData.muc_IV_kho_khan_ton_dong}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_IV_kho_khan_ton_dong: newItems
                    }))
                  }
                  placeholder="VD: Hồ sơ nghiệm thu Hợp đồng cung ứng dịch vụ vận chuyển..."
                />

                <BulletListEditor
                  title={`V. Trọng tâm công tác Tháng ${metadata.thang_tiep}/${metadata.nam_tiep}`}
                  subtitle="Phương hướng, nhiệm vụ trọng tâm tháng tiếp theo (Dòng cuối cùng sẽ tự động kết thúc bằng ./. khi xuất Word)"
                  badgeColor="amber"
                  items={reportData.muc_V_trong_tam_thang_toi}
                  onChange={(newItems) =>
                    setReportData(prev => ({
                      ...prev,
                      muc_V_trong_tam_thang_toi: newItems
                    }))
                  }
                  placeholder="VD: Xây dựng Kế hoạch thực hiện công tác bảo vệ bí mật nhà nước của MBS;"
                />
              </div>
            )}

            {/* TAB 5: CHỮ KÝ & LỊCH SỬ BÁO CÁO THÁNG */}
            {activeTab === 'sign_history' && (
              <div className="space-y-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-extrabold text-amber-300">
                      Khối Chữ Ký Cuối Văn Bản (2 Cột — Cho phép tùy chỉnh Chức danh &amp; Người ký)
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Không cố định chức danh, có thể chọn nhanh hoặc tự gõ chức danh bất kỳ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* CỘT TRÁI: LÃNH ĐẠO DUYỆT / CHO Ý KIẾN */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-extrabold uppercase text-[11px]">
                          1. Cột Trái (Chức danh &amp; Lãnh đạo cho ý kiến)
                        </span>
                      </div>

                      {/* Chọn nhanh chức danh cột trái */}
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-bold block text-[11px]">
                          Tiêu đề / Chức danh cột trái (Có thể chọn nhanh hoặc tự nhập):
                        </label>
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {[
                            { title: 'Ý kiến của Phó Chánh Văn Phòng', suggestedName: 'Nguyễn Đức Thắng' },
                            { title: 'Ý kiến của Chánh Văn Phòng', suggestedName: 'Hoàng Văn Dương' },
                            { title: 'Ý kiến của Tổ trưởng', suggestedName: 'Trần Thuận Hòa' },
                            { title: 'Ý kiến của Lãnh đạo Văn Phòng', suggestedName: '' }
                          ].map((preset) => {
                            const currentTitle = metadata.left_signer_title ?? 'Ý kiến của Phó Chánh Văn Phòng';
                            const isActive = currentTitle === preset.title;
                            return (
                              <button
                                key={preset.title}
                                type="button"
                                onClick={() =>
                                  setReportData(prev => ({
                                    ...prev,
                                    metadata: {
                                      ...prev.metadata,
                                      left_signer_title: preset.title,
                                      pho_chanh_vp_name: preset.suggestedName || prev.metadata.pho_chanh_vp_name
                                    }
                                  }))
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                                  isActive
                                    ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {preset.title}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={metadata.left_signer_title ?? 'Ý kiến của Phó Chánh Văn Phòng'}
                          onChange={(e) =>
                            setReportData(prev => ({
                              ...prev,
                              metadata: { ...prev.metadata, left_signer_title: e.target.value }
                            }))
                          }
                          placeholder="Nhập chức danh tùy chỉnh (VD: Ý kiến của Chánh Văn Phòng)..."
                          className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-amber-200 font-bold text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-bold block text-[11px]">
                          Họ và tên người ký cột trái:
                        </label>
                        <input
                          type="text"
                          value={metadata.pho_chanh_vp_name}
                          onChange={(e) =>
                            setReportData(prev => ({
                              ...prev,
                              metadata: { ...prev.metadata, pho_chanh_vp_name: e.target.value }
                            }))
                          }
                          placeholder="VD: Nguyễn Đức Thắng hoặc Hoàng Văn Dương..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-extrabold text-sm focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* CỘT PHẢI: NGƯỜI TRÌNH / NGƯỜI LẬP */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 font-extrabold uppercase text-[11px]">
                          2. Cột Phải (Chức danh &amp; Người trình báo cáo)
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-bold block text-[11px]">
                          Tiêu đề / Chức danh cột phải (Có thể chọn nhanh hoặc tự nhập):
                        </label>
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {['Người trình', 'Người lập báo cáo', 'Người báo cáo', 'Tổ trưởng'].map((roleTitle) => {
                            const currentRightTitle = metadata.right_signer_title ?? 'Người trình';
                            const isActive = currentRightTitle === roleTitle;
                            return (
                              <button
                                key={roleTitle}
                                type="button"
                                onClick={() =>
                                  setReportData(prev => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, right_signer_title: roleTitle }
                                  }))
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                                  isActive
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {roleTitle}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={metadata.right_signer_title ?? 'Người trình'}
                          onChange={(e) =>
                            setReportData(prev => ({
                              ...prev,
                              metadata: { ...prev.metadata, right_signer_title: e.target.value }
                            }))
                          }
                          placeholder="Nhập chức danh cột phải (VD: Người trình)..."
                          className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-200 font-bold text-xs focus:border-emerald-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-bold block text-[11px]">
                          Họ và tên người trình cột phải:
                        </label>
                        <input
                          type="text"
                          value={metadata.nguoi_trinh_name}
                          onChange={(e) =>
                            setReportData(prev => ({
                              ...prev,
                              metadata: { ...prev.metadata, nguoi_trinh_name: e.target.value }
                            }))
                          }
                          placeholder="VD: Trần Hoàng Phương Nhi..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-extrabold text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DANH SÁCH LỊCH SỬ BÁO CÁO THÁNG ĐÃ LƯU */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-extrabold text-blue-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <History className="w-4 h-4 text-blue-400" />
                    <span>Lịch sử các Báo cáo Tháng đã lưu trong CSDL ({historyList.length})</span>
                  </h3>

                  {historyList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Chưa có Báo cáo Tháng nào được lưu. Nhấn nút "Lưu Báo Cáo" ở góc trên để lưu lại.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {historyList.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleChangeMonthYear(Number(item.month), Number(item.year))}
                          className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div>
                            <div className="font-extrabold text-xs text-white">
                              Báo cáo Tháng {item.month}/{item.year} (Số: {item.report_number || '.../VP'})
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Người trình: {item.nguoi_trinh_name || 'N/A'} • Ngày lập: {item.report_date || 'N/A'}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-lg text-[10px] font-bold">
                            Mở lại
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: LIVE A4 DOCUMENT PREVIEW */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`${
              viewMode === 'split' ? 'hidden lg:flex lg:col-span-5' : 'col-span-12 flex'
            } flex-col bg-slate-900/95 overflow-y-auto p-4 sm:p-6 items-center`}
          >
            <div className="w-full max-w-[210mm] mb-3 flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Bản Xem Trước Trực Tiếp Chuẩn Trang In A4 (Times New Roman 13pt)</span>
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / Xuất PDF</span>
              </button>
            </div>

            {/* TỜ GIẤY A4 CHUẨN */}
            <div
              className="w-full max-w-[210mm] bg-white text-black shadow-2xl rounded-xs p-6 sm:p-[20mm_15mm_20mm_25mm] text-[13pt] leading-[1.45]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* QUỐC HIỆU & TIÊU NGỮ (ĐẢM BẢO NGÀY THÁNG NẰM TRÊN 1 DÒNG) */}
              <div className="grid grid-cols-12 gap-1 mb-4 text-center items-start">
                <div className="col-span-5 flex flex-col items-center">
                  <div className="text-[11pt] uppercase leading-snug">
                    BAN QUẢN LÝ CÁC KHU LIÊN HỢP
                  </div>
                  <div className="text-[11pt] uppercase leading-snug">
                    XỬ LÝ CHẤT THẢI THÀNH PHỐ
                  </div>
                  <div className="text-[11pt] font-bold uppercase underline underline-offset-4">
                    VĂN PHÒNG
                  </div>
                  <div className="text-[12pt] mt-2 whitespace-nowrap">
                    Số: {metadata.so_bao_cao.includes('/') ? metadata.so_bao_cao : `${metadata.so_bao_cao}/VP`}
                  </div>
                </div>

                <div className="col-span-7 flex flex-col items-center">
                  <div className="text-[11pt] font-bold uppercase leading-snug whitespace-nowrap">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-[12pt] font-bold underline underline-offset-4 whitespace-nowrap">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="text-[12pt] italic mt-2 whitespace-nowrap">
                    {formatNgayLap(metadata.ngay_lap)}
                  </div>
                </div>
              </div>

              {/* TIÊU ĐỀ */}
              <div className="text-center my-4 space-y-1">
                <div className="text-[14pt] font-bold uppercase">BÁO CÁO</div>
                <div className="text-[13pt] font-bold leading-snug">
                  Kết quả thực hiện nhiệm vụ tháng {metadata.thang}, phương hướng thực hiện nhiệm vụ công tác tháng {metadata.thang_tiep} - {metadata.nam_tiep} của Bộ phận Chuyển đổi số và Văn thư, lưu trữ
                </div>
                <div className="text-[13pt] font-bold pt-1">
                  Kính gửi: {metadata.kinh_gui}
                </div>
              </div>

              {/* LỜI MỞ ĐẦU */}
              <p className="indent-8 text-justify mb-2">
                Bộ phận Chuyển đổi số và Văn thư, lưu trữ báo cáo tình hình thực hiện nhiệm vụ tháng {metadata.thang} và phương hướng thực hiện nhiệm vụ trọng tâm công tác tháng {metadata.thang_tiep} năm {metadata.nam_tiep} như sau:
              </p>

              {/* MỤC I */}
              <div className="font-bold indent-8 mt-2 mb-1">
                I. Kết quả thực hiện của Bộ phận Chuyển đổi số - Văn thư lưu trữ trong tháng {metadata.thang} năm {metadata.nam}
              </div>

              <div className="font-bold indent-8 mb-1">
                1. Rà soát thể thức, chính tả và phát hành (cấp phát số, ghi sổ…) công văn đi của MBS phát hành:
              </div>

              <p className="indent-8 mb-2">
                Văn bản Đi từ số {muc_I.vb_di.tu_so || '...'} - {muc_I.vb_di.den_so || '...'}, gồm {muc_I.vb_di.tong_so} VB, trong đó:
              </p>

              {/* BẢNG 4 CỘT */}
              <table className="w-full border-collapse border border-black text-[12pt] my-2">
                <thead>
                  <tr>
                    <th className="border border-black py-1 px-2 text-center w-12 font-bold">STT</th>
                    <th className="border border-black py-1 px-2 text-center font-bold">Phòng</th>
                    <th className="border border-black py-1 px-2 text-center w-36 font-bold">Tổng số VB kiểm tra</th>
                    <th className="border border-black py-1 px-2 text-center w-24 font-bold">Số lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {muc_I.vb_di.bang_kiem_tra_loi.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
                      <td className="border border-black py-1 px-2">{row.department_name}</td>
                      <td className="border border-black py-1 px-2 text-center">{pad2(row.total_checked)}</td>
                      <td className="border border-black py-1 px-2 text-center">{pad2(row.error_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PHÂN BỔ VB ĐI */}
              <div className="space-y-0.5 my-2">
                {muc_I.vb_di.phan_bo_phong.map((item, idx) => (
                  <p key={idx} className="indent-8">
                    {item.department_name}: {pad2(item.count)} VB{idx === muc_I.vb_di.phan_bo_phong.length - 1 ? '.' : ';'}
                  </p>
                ))}
              </div>

              {/* QUYẾT ĐỊNH */}
              <p className="indent-8 mt-2 mb-1">
                Quyết định từ số {muc_I.quyet_dinh.tu_so || '...'} - {muc_I.quyet_dinh.den_so || '...'}, gồm {muc_I.quyet_dinh.tong_so} QĐ, trong đó:
              </p>
              <div className="space-y-0.5 mb-2">
                {(() => {
                  const activeQd = muc_I.quyet_dinh.phan_bo_phong.filter(r => r.count > 0);
                  const listToShow = activeQd.length > 0 ? activeQd : muc_I.quyet_dinh.phan_bo_phong.slice(0, 3);
                  return listToShow.map((item, idx) => (
                    <p key={idx} className="indent-8">
                      {item.department_name}: {pad2(item.count)} QĐ{idx === listToShow.length - 1 ? '.' : ';'}
                    </p>
                  ));
                })()}
              </div>

              {/* MỤC I.2 */}
              <div className="font-bold indent-8 mt-2 mb-0.5">
                2. Tiếp nhận, luân chuyển công văn đến của MBS:
              </div>
              <p className="indent-8 mb-1">
                - Số lượng Văn bản đến từ số {muc_I.vb_den.tu_so || '...'} - {muc_I.vb_den.den_so || '...'}, gồm {muc_I.vb_den.tong_so} VB.
              </p>

              {/* MỤC I.3 */}
              <div className="font-bold indent-8 mt-2 mb-0.5">
                3. Tiếp nhận hồ sơ nghiệm thu xác nhận khối lượng CTRSH của các Đơn vị vận chuyển:
              </div>
              <p className="indent-8 mb-1">
                - Số lượng Hồ sơ nghiệm thu: {pad2(muc_I.ho_so_nghiem_thu_ctrsh)} bộ.
              </p>

              {/* MỤC I.4 */}
              <div className="font-bold indent-8 mt-2 mb-0.5">
                4. Các nhiệm vụ chuyển đổi số
              </div>
              <div className="space-y-1 text-justify">
                {muc_I.nhiem_vu_cds.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* CÁC CÔNG TÁC KHÁC */}
              <div className="font-bold indent-8 mt-2 mb-0.5">
                Các công tác khác
              </div>
              <div className="space-y-1 text-justify">
                {muc_I.cong_tac_khac.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* MỤC II */}
              <div className="font-bold indent-8 mt-2.5 mb-0.5">
                II. Công tác chỉ đạo, điều hành
              </div>
              <div className="space-y-1 text-justify">
                {reportData.muc_II_chi_dao_dieu_hanh.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* MỤC III */}
              <div className="font-bold indent-8 mt-2.5 mb-0.5">
                III. Kết quả thực hiện công tác Tháng {metadata.thang}- {metadata.nam}
              </div>
              <div className="space-y-1 text-justify">
                {reportData.muc_III_ket_qua_thang.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* MỤC IV */}
              <div className="font-bold indent-8 mt-2.5 mb-0.5">
                IV. Khó khăn, tồn đọng, đề xuất khắc phục
              </div>
              <div className="space-y-1 text-justify">
                {reportData.muc_IV_kho_khan_ton_dong.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* MỤC V */}
              <div className="font-bold indent-8 mt-2.5 mb-0.5">
                V. Trọng tâm công tác Tháng {metadata.thang_tiep}/{metadata.nam_tiep}
              </div>
              <div className="space-y-1 text-justify">
                {reportData.muc_V_trong_tam_thang_toi.map((line, idx) => (
                  <p key={idx} className="indent-8">
                    - {line}
                  </p>
                ))}
              </div>

              {/* KHỐI CHỮ KÝ 2 CỘT */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-2 text-center font-bold">
                <div className="flex flex-col justify-between min-h-[110px]">
                  <div>{metadata.left_signer_title || 'Ý kiến của Phó Chánh Văn Phòng'}</div>
                  <div className="pt-16">{metadata.pho_chanh_vp_name}</div>
                </div>
                <div className="flex flex-col justify-between min-h-[110px]">
                  <div>{metadata.right_signer_title || 'Người trình'}</div>
                  <div className="pt-16">{metadata.nguoi_trinh_name}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

