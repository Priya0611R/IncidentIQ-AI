import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-xl shadow-xl max-w-sm w-full p-5 text-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDangerous ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          {message}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition-all ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-50 flex items-center gap-1.5`}
          >
            {loading && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
