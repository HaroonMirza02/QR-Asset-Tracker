import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Asset } from '../../types/asset';
import { QrCode } from 'lucide-react';

interface QrLabelCardProps {
  asset: Asset;
  className?: string;
  id?: string;
}

export const QrLabelCard: React.FC<QrLabelCardProps> = ({ asset, className = '', id = 'printable-qr-label' }) => {
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    async function generateQr() {
      if (asset.qrCodeImageBase64) {
        setQrImage(asset.qrCodeImageBase64);
        return;
      }
      try {
        let scanUrl = asset.qrCodeUrl;
        if (!scanUrl || scanUrl.includes('localhost')) {
          scanUrl = `${window.location.origin}/scan/${asset.qrToken || 'unknown'}?t=${(asset as any).tenantId || ''}`;
        }
        const url = await QRCode.toDataURL(scanUrl, {
          type: 'image/png',
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        setQrImage(url);
      } catch (err) {
        console.error('Failed to generate QR image:', err);
      }
    }
    generateQr();
  }, [asset]);

  const displaySrc = qrImage || asset.qrCodeImageBase64;

  return (
    <div
      id={id}
      className={`bg-white border-2 border-slate-900 rounded-2xl p-6 text-center shadow-md max-w-sm mx-auto space-y-4 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 pb-3 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-[10px] tracking-wider shrink-0">
            QR
          </div>
          <span className="font-black text-xs tracking-wider text-slate-900 uppercase truncate">
            ASSET TAG
          </span>
        </div>
        <span className="font-mono font-black text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 max-w-[140px] truncate">
          {asset.assetCode}
        </span>
      </div>

      {/* QR Code Graphic (Prominent, High Contrast) */}
      <div className="py-2 flex items-center justify-center">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={`QR code for ${asset.assetCode}`}
            className="w-52 h-52 object-contain rounded-xl border border-slate-200 p-2 shadow-xs bg-white"
          />
        ) : (
          <div className="w-52 h-52 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4">
            <QrCode className="w-12 h-12 mb-2 stroke-1 animate-pulse" />
            <p className="text-xs font-semibold text-center">Generating QR Image...</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t-2 border-slate-900 pt-3 text-center space-y-1">
        <h4 className="font-extrabold text-base text-slate-900 leading-tight">
          {asset.name}
        </h4>
        <p className="text-xs font-bold text-slate-600">
          Category: <span className="text-slate-900">{asset.category}</span>
        </p>
        {asset.serialNumber && (
          <p className="text-[11px] font-mono text-slate-500 font-semibold">
            S/N: {asset.serialNumber}
          </p>
        )}
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
          Scan label for verified live status
        </p>
      </div>
    </div>
  );
};
