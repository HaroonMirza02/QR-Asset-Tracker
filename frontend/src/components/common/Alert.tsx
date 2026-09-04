import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'error',
  title,
  message,
  className = '',
  onDismiss,
}) => {
  const styles = {
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
    },
  };

  const style = styles[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${className}`}>
      {style.icon}
      <div className="flex-1 text-sm">
        {title && <h4 className="font-bold text-xs uppercase tracking-wider mb-1">{title}</h4>}
        <p className="font-medium text-xs sm:text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
};
