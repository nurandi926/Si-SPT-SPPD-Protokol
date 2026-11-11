import React, { useState } from 'react';
import { FileSignature, CheckCircle2, ShieldCheck, PenTool, Stamp, Download, Printer } from 'lucide-react';
import { SPTItem } from '../types';

interface SignaturePadViewProps {
  daftarSpt: SPTItem[];
  userRole?: string;
  currentOperator: string;
}

export const SignaturePadView: React.FC<SignaturePadViewProps> = ({
  daftarSpt,
  userRole,
  currentOperator,
}) => {
  const [selectedSppd, setSelectedSppd] = useState<string>('');
  const [signerName, setSignerName] = useState('YUDI PRASETIYO ANDY PUTRO, S.STP');
  const [signerRole, setSignerRole] = useState('Kepala Bagian Protokol dan Komunikasi Pimpinan');
  const [signatureType, setSignatureType] = useState<'digital' | 'stamp' | 'both'>('both');
  const [successSaved, setSuccessSaved] = useState(false);

  const selectedSpt = daftarSpt.find((s) => s.nomorSppd === selectedSppd);

  const handleApplySignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSppd) {
      alert('Silakan pilih berkas SPPD terlebih dahulu!');
      return;
    }
    setSuccessSaved(true);
    setTimeout(() => setSuccessSaved(false), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/50 flex items-center justify-center border border-blue-400/40 text-blue-200 shadow-inner">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              4. Bubuhi Tanda Tangan & Cap Dinas (E-Sign)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Kelola dan bubuhkan tanda tangan elektronik resmi serta cap dinas pada dokumen perjalanan dinas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-900/60 px-3 py-1.5 rounded-xl border border-blue-700/50 text-xs font-semibold text-blue-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Keamanan Dokumen Terverifikasi</span>
        </div>
      </div>

      {successSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl p-4 flex items-center gap-3 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Tanda tangan elektronik dan cap dinas berhasil dibubuhkan pada dokumen SPPD {selectedSppd}!</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Konfigurasi Tanda Tangan */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-md border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PenTool className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900">Konfigurasi Penandatangan</h3>
          </div>

          <form onSubmit={handleApplySignature} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Berkas SPT / SPPD :
              </label>
              <select
                value={selectedSppd}
                onChange={(e) => setSelectedSppd(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                required
              >
                <option value="">-- Pilih Berkas SPPD --</option>
                {daftarSpt.map((s) => (
                  <option key={s.nomorSppd} value={s.nomorSppd}>
                    SPPD: {s.nomorSppd} | Tujuan: {s.tujuan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Pejabat Penandatangan :
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jabatan Penandatangan :
              </label>
              <input
                type="text"
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Metode Pembubuhan :
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureType('digital')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    signatureType === 'digital'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✍️ TTD Saja
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType('stamp')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    signatureType === 'stamp'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔵 Cap Dinas
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType('both')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    signatureType === 'both'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✨ Keduanya
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              <span>Bubuhi Tanda Tangan & Cap Dinas</span>
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Pratinjau Dokumen dengan E-Sign */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-md border border-slate-200 p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Stamp className="w-4 h-4 text-blue-600" />
              Pratinjau Hasil Penandatanganan
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              {selectedSpt ? 'Dokumen Aktif' : 'Belum Dipilih'}
            </span>
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[350px] text-center">
            {selectedSpt ? (
              <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-slate-300 text-left space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Surat Perjalanan Dinas (SPPD)
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    Nomor: {selectedSpt.nomorSppd}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Tujuan: <strong>{selectedSpt.tujuan}</strong>
                  </div>
                </div>

                <div className="pt-2 flex flex-col items-end text-center">
                  <div className="text-xs text-slate-700 font-medium mb-1">
                    Lumajang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-800 font-bold">
                    {signerRole},
                  </div>

                  {/* Simulasi Tanda Tangan & Cap */}
                  <div className="my-6 relative py-4 px-6 flex items-center justify-center min-h-[90px]">
                    {(signatureType === 'stamp' || signatureType === 'both') && (
                      <div className="absolute w-20 h-20 rounded-full border-2 border-blue-600/60 flex items-center justify-center text-blue-600/70 font-bold text-[9px] uppercase tracking-tighter transform -rotate-12 pointer-events-none select-none">
                        PEMERINTAH KAB. LUMAJANG
                      </div>
                    )}
                    {(signatureType === 'digital' || signatureType === 'both') && (
                      <div className="z-10 font-serif italic text-blue-900 font-bold text-base tracking-widest border-b border-blue-900 pb-0.5 px-3">
                        ({signerName.split(' ')[0]} ✍️ E-Sign)
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-900 underline">
                    {signerName}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    NIP. 19800305 199810 1 001
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 py-12">
                <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold">Belum ada berkas yang dipilih.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Silakan pilih nomor SPPD di sebelah kiri untuk melihat pratinjau tanda tangan elektronik.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
