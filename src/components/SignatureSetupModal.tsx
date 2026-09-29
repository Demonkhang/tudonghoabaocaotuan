import React, { useState, useRef } from 'react';
import { X, Upload, ShieldCheck, CheckCircle2, Lock, FileSignature, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { UserProfile } from './LoginModal';
import { updateSignatureAndPinApi } from '../services/api';

interface SignatureSetupModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onSuccess?: (signatureUrl: string) => void;
}

export const SignatureSetupModal: React.FC<SignatureSetupModalProps> = ({
  currentUser,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'DRAW'>('UPLOAD');
  const [signaturePreview, setSignaturePreview] = useState<string>(currentUser?.signature_url || '');
  const [pinCode, setPinCode] = useState<string>('');
  const [confirmPinCode, setConfirmPinCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Canvas ref for drawing signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh chữ ký (khuyên dùng định dạng .PNG tách nền trong suốt)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignaturePreview(event.target.result as string);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#004b8c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignaturePreview(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignaturePreview('');
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser) {
      setErrorMsg('Bạn chưa đăng nhập hệ thống');
      return;
    }

    if (!signaturePreview) {
      setErrorMsg('Vui lòng tải lên ảnh chữ ký hoặc vẽ chữ ký cá nhân!');
      return;
    }

    if (pinCode) {
      if (!/^\d{6}$/.test(pinCode)) {
        setErrorMsg('Mã PIN xác thực phải gồm đúng 6 chữ số (0-9)!');
        return;
      }
      if (pinCode !== confirmPinCode) {
        setErrorMsg('Xác nhận Mã PIN 6 số không trùng khớp!');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await updateSignatureAndPinApi(currentUser.id, pinCode, signaturePreview);
      if (res && res.success) {
        setSuccessMsg('🎉 Cài đặt Chữ ký cá nhân & Mã PIN 6 số thành công!');
        // Cập nhật localStorage
        try {
          const savedUserStr = localStorage.getItem('currentUser');
          if (savedUserStr) {
            const savedUser = JSON.parse(savedUserStr);
            savedUser.signature_url = signaturePreview;
            localStorage.setItem('currentUser', JSON.stringify(savedUser));
          }
        } catch (e) {}

        if (onSuccess) onSuccess(signaturePreview);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Lỗi cài đặt chữ ký');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi lưu thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Quản Lý Chữ Ký & Mã PIN Xác Thực Ký Số
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập hình ảnh chữ ký cá nhân và Mã PIN 6 số để ký phê duyệt Báo cáo tuần
            </p>
          </div>
        </div>

        {/* Tab switch: Upload vs Draw */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'UPLOAD'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File PNG Tách Nền</span>
          </button>

          <button
            onClick={() => setActiveTab('DRAW')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'DRAW'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vẽ Chữ Ký Trực Tiếp</span>
          </button>
        </div>

        {/* Tab Content 1: Upload */}
        {activeTab === 'UPLOAD' && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tải lên ảnh chữ ký tay (PNG transparent)
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-all relative">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 mx-auto mb-1.5 text-blue-500 opacity-80" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nhấp để chọn hoặc kéo thả file ảnh chữ ký vào đây
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Định dạng khuyên dùng: .PNG (nền trong suốt) để khi ký vào báo cáo hiển thị đẹp nhất
              </p>
            </div>
          </div>
        )}

        {/* Tab Content 2: Draw */}
        {activeTab === 'DRAW' && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Vẽ chữ ký của bạn vào khung bên dưới:
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Xóa vẽ lại</span>
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={440}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 cursor-crosshair touch-none"
              />
            </div>
          </div>
        )}

        {/* Signature Preview Section */}
        {signaturePreview && (
          <div className="mb-5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Xem trước Chữ ký hiển thị trên báo cáo:
            </span>
            <div className="bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-200/50 dark:bg-slate-950 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-300/60 dark:border-slate-800">
              <img
                src={signaturePreview}
                alt="Xem trước chữ ký"
                className="h-20 object-contain drop-shadow-sm"
              />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2">
                {currentUser?.full_name || 'Người ký'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser?.department_name || 'Văn phòng'}
              </span>
            </div>
          </div>
        )}

        {/* PIN Code Configuration */}
        <div className="mb-5 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-extrabold text-xs mb-2">
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cài Đặt Mã PIN Bảo Mật (6 chữ số)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mã PIN (6 số) <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="VD: 123456"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold tracking-widest text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nhập lại Mã PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmPinCode}
                onChange={(e) => setConfirmPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="VD: 123456"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold tracking-widest text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
            🔒 Mã PIN 6 số được sử dụng để xác minh danh tính và quyền hạn của bạn mỗi khi bấm "Ký số & Phê duyệt" báo cáo.
          </p>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Lưu Chữ Ký & Mã PIN</span>
          </button>
        </div>

      </div>
    </div>
  );
};
