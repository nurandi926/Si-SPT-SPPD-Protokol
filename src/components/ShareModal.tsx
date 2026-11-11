import React, { useState } from 'react';
import { Share2, Copy, Check, X, Users, Key, AlertTriangle, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { OperatorAccount } from '../types';
import { PUBLIC_STANDALONE_APP_URL } from '../services/googleSheetsSync';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: OperatorAccount[];
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, operators }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullInfo, setCopiedFullInfo] = useState(false);

  if (!isOpen) return null;

  // URL aplikasi publik resmi standalone (bisa dibuka oleh siapa saja tanpa akun Google AI Studio)
  const appUrl = PUBLIC_STANDALONE_APP_URL;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getFullShareText = () => {
    return `*SISTEM INFORMASI SURAT PERINTAH TUGAS (SI-SPT)*
Bagian Protokol & TU Pimpinan Setda Kabupaten Lumajang

🌐 *Tautan Akses Aplikasi (Bisa dibuka di HP / Laptop):*
${appUrl}

📋 *Daftar Akun Operator & Kata Sandi:*
${operators
  .map(
    (op, i) =>
      `${i + 1}. *${op.nama}* (${op.role === 'ADMINISTRATOR' ? 'Admin' : 'Operator'})\n   Kata Sandi: \`${op.sandi}\``
  )
  .join('\n')}

Silakan buka tautan di atas lewat Google Chrome (HP maupun Laptop), pilih nama Anda di menu login awal, dan masukkan kata sandi masing-masing. Data otomatis tersimpan dan terhubung ke Google Sheets terpusat.`;
  };

  const handleCopyFullInfo = () => {
    const text = getFullShareText();
    navigator.clipboard.writeText(text);
    setCopiedFullInfo(true);
    setTimeout(() => setCopiedFullInfo(false), 2500);
  };

  const shareTextEncoded = encodeURIComponent(getFullShareText());

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/40">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Bagikan Akses Aplikasi ke Operator</h3>
              <p className="text-xs text-slate-400">SI-SPT Protokol & TU Pimpinan Kab. Lumajang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
          {/* Peringatan Kritis: Jangan salin dari address bar aistudio.google.com */}
          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>PERHATIAN PENTING (Mencegah Error 404):</span>
            </div>
            <p className="leading-relaxed text-[11.5px] text-amber-900">
              Jangan menyalin link dari kolom alamat paling atas browser yang bertuliskan <strong>aistudio.google.com</strong>. Link tersebut adalah editor internal akun Google Anda sendiri, sehingga operator lain yang membukanya akan mengalami error <strong>"Page not found (404)"</strong>.
            </p>
            <p className="mt-1.5 text-[11.5px] font-semibold text-emerald-800 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Selalu gunakan tombol <strong>"Salin Link"</strong> atau bagikan link resmi di bawah ini:
            </p>
          </div>

          {/* Link Box Resmi Publik */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Link Resmi Aplikasi (Siap Diakses Semua Perangkat & Operator):</span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Publik & Bebas Akses
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-300 rounded-xl text-slate-800 select-all font-semibold"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex-shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>

          {/* Akun Operator & Sandi */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Daftar Akses Operator & Kata Sandi:
              </span>
              <span className="text-[11px] text-slate-500 font-medium">4 Akun Terdaftar</span>
            </div>

            <div className="space-y-1.5">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{op.nama}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                        op.role === 'ADMINISTRATOR'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {op.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span>{op.sandi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons: WhatsApp Forward & Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={`https://api.whatsapp.com/send?text=${shareTextEncoded}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 text-center cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200" />
              <span>Kirim via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyFullInfo}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedFullInfo ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Teks Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Salin Teks WhatsApp</span>
                </>
              )}
            </button>
          </div>

          {/* Info Integrasi Google Sheets */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>💡</span> Integrasi Database Google Sheets:
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • Semua data yang diinput oleh masing-masing operator melalui link ini akan otomatis tersinkron ke Google Sheets yang telah Anda hubungkan.
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • Operator tidak perlu melakukan setting webhook, karena server secara otomatis mendistribusikan konfigurasi ke semua perangkat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
