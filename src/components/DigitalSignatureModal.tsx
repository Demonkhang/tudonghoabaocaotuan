import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, FileSignature, KeyRound, AlertTriangle, RefreshCw } from 'lucide-react';
import { UserProfile } from './LoginModal';
import { signReportWithPinApi } from '../services/api';

interface DigitalSignatureModalProps {
  reportId: string;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSuccess: (signatureData: any) => void;
  onOpenSignatureSetup?: () => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  reportId,
  currentUser,
  onClose,
  onSuccess,
  onOpenSignatureSetup
}) => {
  const [pinCode, setPinCode] = useState<string>('');
  const [note, setNote] = useState<string>('Đồng ý ký số & phê duyệt báo cáo tuần.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasSignature = !!currentUser?.signature_url;

  const handleSign = async () => {
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg('Bạn chưa đăng nhập');
      return;
    }

    if (!hasSignature) {
      setErrorMsg('Bạn chưa có ảnh chữ ký cá nhân. Vui lòng thiết lập chữ ký trước khi thực hiện ký số!');
      return;
    }

    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
      setErrorMsg('Vui lòng nhập chính xác Mã PIN bảo mật gồm 6 chữ số (0-9)!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signReportWithPinApi(reportId, currentUser.id, pinCode, note);
      if (res && res.success) {
        onSuccess(res.signature);
        onClose();
      } else {
        setErrorMsg(res.error || 'Lỗi ký số xác thực');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const posLabel = currentUser?.position_level === 'GIAM_DOC' ? 'Giám đốc'
    : currentUser?.position_level === 'PHO_GIAM_DOC' ? 'Phó Giám đốc'
    : currentUser?.position_level === 'TRUONG_PHONG' ? 'Trưởng phòng'
    : currentUser?.position_level === 'PHO_PHONG' ? 'Phó phòng'
    : currentUser?.position_level === 'TO_TRUONG' ? 'Tổ trưởng' : 'Chuyên viên';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Xác Nhận Ký Số & Phê Duyệt Báo Cáo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nhập Mã PIN 6 số để xác thực đóng dấu chữ ký điện tử
            </p>
          </div>
        </div>

        {/* Warning if no signature setup */}
        {!hasSignature && (
          <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl text-amber-800 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-extrabold mb-1 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Chưa có dữ liệu Chữ ký cá nhân</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Bạn chưa cập nhật file ảnh chữ ký tay (PNG tách nền). Vui lòng cài đặt chữ ký cá nhân trước khi ký số!
            </p>
            {onOpenSignatureSetup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSignatureSetup();
                }}
                className="mt-2.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[11px] cursor-pointer inline-flex items-center gap-1"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>Cài Đặt Chữ Ký & PIN Ngay</span>
              </button>
            )}
          </div>
        )}

        {/* Signature Box Preview */}
        {hasSignature && (
          <div className="mb-4 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Thông tin vết ký số cá nhân:
            </span>
            <div className="bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-white dark:bg-slate-950 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800">
              <img
                src={currentUser?.signature_url}
                alt="Chữ ký cá nhân"
                className="h-16 object-contain drop-shadow-sm"
              />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                {currentUser?.full_name || 'Người ký'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {posLabel} - {currentUser?.department_name}
              </span>
            </div>
          </div>
        )}

        {/* PIN Entry Field */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nhập Mã PIN 6 số xác thực <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú phê duyệt (tùy chọn):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú ý kiến chỉ đạo..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSign}
            disabled={isLoading || !hasSignature || pinCode.length !== 6}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSignature className="w-4 h-4" />
            )}
            <span>Xác Nhận Ký Số</span>
          </button>
        </div>

      </div>
    </div>
  );
};
