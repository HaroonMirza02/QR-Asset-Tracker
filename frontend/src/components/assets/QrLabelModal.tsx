import React from 'react';
import { Modal } from '../common/Modal';
import { Asset } from '../../types/asset';
import { Printer, Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { QrLabelCard } from './QrLabelCard';

interface QrLabelModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrLabelModal: React.FC<QrLabelModalProps> = ({ asset, isOpen, onClose }) => {
  const { showToast } = useToast();

  if (!asset) return null;

  const handlePrint = () => {
    document.body.classList.add('print-label-only');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-label-only');
    }, 1000);
  };

  const handleDownload = () => {
    if (!asset) return;
    const imgEl = document.querySelector('#printable-qr-label img') as HTMLImageElement;
    const src = imgEl?.src || asset.qrCodeImageBase64;
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `QR-Tag-${asset.assetCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `QR Code downloaded for ${asset.assetCode}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Printable QR Tag Label — ${asset.assetCode}`}
      subtitle="Physical asset tag label formatted for single-page printing and scanning"
    >
      <div className="space-y-6">
        {/* Printable Card Area */}
        <QrLabelCard asset={asset} />

        {/* Action Controls (Hidden during print) */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/20"
            >
              <Printer className="w-4 h-4" />
              Print Label
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
