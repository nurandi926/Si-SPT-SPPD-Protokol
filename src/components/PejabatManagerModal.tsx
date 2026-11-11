import React, { useState, useEffect } from 'react';
import { PejabatConfig } from '../types';
import { DEFAULT_PEJABAT_CONFIG, getStoredPejabatConfig, saveStoredPejabatConfig } from '../utils/pejabatConfig';
import { X, Check, RotateCcw, ShieldCheck, UserCheck, Award, FileText } from 'lucide-react';

interface PejabatManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (cfg: PejabatConfig) => void;
}

export const PejabatManagerModal: React.FC<PejabatManagerModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<PejabatConfig>(getStoredPejabatConfig);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'KABAG' | 'PPK' | 'PPTK' | 'BENDAHARA' | 'PIMPINAN'>('KABAG');

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredPejabatConfig());
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof PejabatConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredPejabatConfig(config);
    if (onSave) onSave(config);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan seluruh nama pejabat dan penandatangan ke setelan bawaan resmi?')) {
      setConfig(DEFAULT_PEJABAT_CONFIG);
      saveStoredPejabatConfig(DEFAULT_PEJABAT_CONFIG);
      if (onSave) onSave(DEFAULT_PEJABAT_CONFIG);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pengaturan Pejabat & Penandatangan Dokumen
              </h3>
              <p className="text-xs text-slate-400">
                Khusus Akses Admin Utama: Atur pejabat TTD SPT, PPK, PPTK, Bendahara, dan Pimpinan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigasi Kategori Pejabat */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex gap-1 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('KABAG')}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'KABAG'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. TTD SPT (Kabag)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PPK')}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'PPK'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Pejabat PPK (SPD & Rincian)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PPTK')}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'PPTK'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            3. PPTK Kwitansi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BENDAHARA')}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'BENDAHARA'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Bendahara Kwitansi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PIMPINAN')}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'PIMPINAN'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            5. Pimpinan Daerah
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {showSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Data pejabat & penandatangan berhasil diperbarui dan diterapkan ke seluruh dokumen!</span>
            </div>
          )}

          {/* TAB 1: KABAG (TTD SPT) */}
          {activeTab === 'KABAG' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-xs text-blue-800">
                <strong>Pejabat TTD Dokumen SPT (Kepala Bagian)</strong>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Pejabat yang bertandatangan pada pojok kanan bawah lembar Surat Tugas (SPT) untuk penugasan Asisten, Staf Ahli, Kasubag, dan Staf.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Pejabat TTD SPT
                </label>
                <input
                  type="text"
                  value={config.ttdSptNama}
                  onChange={(e) => handleChange('ttdSptNama', e.target.value)}
                  required
                  placeholder="Contoh: YUDI PRASETIYO ANDY PUTRO, S.STP"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Pejabat TTD
                  </label>
                  <input
                    type="text"
                    value={config.ttdSptNip}
                    onChange={(e) => handleChange('ttdSptNip', e.target.value)}
                    required
                    placeholder="Contoh: 19800305 199810 1 001"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pangkat / Golongan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={config.ttdSptPangkat || ''}
                    onChange={(e) => handleChange('ttdSptPangkat', e.target.value)}
                    placeholder="Contoh: Pembina / IV a"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jabatan (u.b.)
                </label>
                <input
                  type="text"
                  value={config.ttdSptJabatan}
                  onChange={(e) => handleChange('ttdSptJabatan', e.target.value)}
                  required
                  placeholder="Contoh: Kepala Bagian Protokol dan Komunikasi Pimpinan"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PPK (SPD & RINCIAN) */}
          {activeTab === 'PPK' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-xl text-xs text-purple-800">
                <strong>Pejabat Pembuat Komitmen (PPK)</strong>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Muncul pada tanda tangan lembaran Surat Perjalanan Dinas (SPD) dan kolom pengesahan Dokumen Rincian Biaya Perjalanan Dinas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Pejabat PPK
                </label>
                <input
                  type="text"
                  value={config.ppkNama}
                  onChange={(e) => handleChange('ppkNama', e.target.value)}
                  required
                  placeholder="Contoh: YUDI PRASETIYO ANDY PUTRO, S.STP"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Pejabat PPK
                  </label>
                  <input
                    type="text"
                    value={config.ppkNip}
                    onChange={(e) => handleChange('ppkNip', e.target.value)}
                    required
                    placeholder="Contoh: 19800305 199810 1 001"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Label Jabatan
                  </label>
                  <input
                    type="text"
                    value={config.ppkJabatan}
                    onChange={(e) => handleChange('ppkJabatan', e.target.value)}
                    required
                    placeholder="Contoh: Pejabat Pembuat Komitmen"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PPTK (KWITANSI) */}
          {activeTab === 'PPTK' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
                <strong>Pejabat Pelaksana Teknis Kegiatan (PPTK)</strong>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Muncul pada blok tanda tangan "Mengetahui, PPTK" di dokumen Kwitansi pembayaran.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar PPTK
                </label>
                <input
                  type="text"
                  value={config.pptkNama}
                  onChange={(e) => handleChange('pptkNama', e.target.value)}
                  required
                  placeholder="Contoh: CANDRA MARDIYATI, S.M."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP PPTK
                  </label>
                  <input
                    type="text"
                    value={config.pptkNip}
                    onChange={(e) => handleChange('pptkNip', e.target.value)}
                    required
                    placeholder="Contoh: 19750429 201001 2 006"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pangkat / Golongan
                  </label>
                  <input
                    type="text"
                    value={config.pptkPangkat}
                    onChange={(e) => handleChange('pptkPangkat', e.target.value)}
                    placeholder="Contoh: Penata / III c"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BENDAHARA */}
          {activeTab === 'BENDAHARA' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800">
                <strong>Bendahara Pengeluaran Pembantu</strong>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Muncul pada blok tanda tangan "Setuju dibayar, Bendahara Pengeluaran Pembantu" di lembar Kwitansi dan Lampiran Rincian Biaya Perjadin.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Bendahara
                </label>
                <input
                  type="text"
                  value={config.bendaharaNama}
                  onChange={(e) => handleChange('bendaharaNama', e.target.value)}
                  required
                  placeholder="Contoh: BAKTI HARI PURWANTO"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Bendahara
                  </label>
                  <input
                    type="text"
                    value={config.bendaharaNip}
                    onChange={(e) => handleChange('bendaharaNip', e.target.value)}
                    required
                    placeholder="Contoh: 19820129 201001 1 002"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={config.bendaharaJabatan}
                    onChange={(e) => handleChange('bendaharaJabatan', e.target.value)}
                    placeholder="Contoh: Bendahara Pengeluaran Pembantu"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PIMPINAN DAERAH */}
          {activeTab === 'PIMPINAN' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
                <strong>Pejabat Pimpinan Daerah (Bupati & Wakil Bupati)</strong>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Muncul pada TTD Surat Tugas Khusus Bupati, Wakil Bupati, dan Sekretaris Daerah (Kop Lambang Garuda sesuai lampiran andi 1 dan andi 2).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bupati Lumajang (TTD SPT Bupati & Wakil Bupati - format andi 1)
                </label>
                <input
                  type="text"
                  value={config.bupatiNama}
                  onChange={(e) => handleChange('bupatiNama', e.target.value)}
                  required
                  placeholder="Contoh: INDAH AMPERAWATI"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Wakil Bupati Lumajang (TTD SPT Sekda - format andi 2)
                </label>
                <input
                  type="text"
                  value={config.wakilBupatiNama}
                  onChange={(e) => handleChange('wakilBupatiNama', e.target.value)}
                  required
                  placeholder="Contoh: YUDHA ADJI KUSUMA"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sekretaris Daerah
                </label>
                <input
                  type="text"
                  value={config.sekdaNama}
                  onChange={(e) => handleChange('sekdaNama', e.target.value)}
                  required
                  placeholder="Contoh: Drs. AGUS TRIYONO, M.Si"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>
          )}

          {/* Footer Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Bawaan</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan Pejabat</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
