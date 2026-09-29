import React from 'react';
import { Star, Trash2, AlertTriangle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'star' | 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'star':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800/60 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-700/60 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        );
    }
  };

  const getConfirmBtnStyle = () => {
    switch (type) {
      case 'star':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden transition-all scale-100"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          {renderIcon()}

          <div className="flex-1 pr-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${getConfirmBtnStyle()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
