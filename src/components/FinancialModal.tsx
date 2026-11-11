import React, { useState, useEffect } from 'react';
import { SPTItem, Pegawai, isKelompokUangRepresentasi, LABEL_KELOMPOK_JABATAN } from '../types';
import { formatRupiah } from '../utils/formatters';
import { X, Save, DollarSign } from 'lucide-react';

interface FinancialModalProps {
  spt: SPTItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nomorSppd: string, updatedTim: Pegawai[]) => void;
}

export const FinancialModal: React.FC<FinancialModalProps> = ({
  spt,
  isOpen,
  onClose,
  onSave,
}) => {
  const [timData, setTimData] = useState<Pegawai[]>([]);

  const hasRepresentasi = spt ? isKelompokUangRepresentasi(spt.kelompokJabatan) : false;

  useEffect(() => {
    if (spt) {
      setTimData(
        spt.tim.map((p) => ({
          ...p,
          uangHarian: Number(p.uangHarian) || 0,
          penginapan: Number(p.penginapan) || 0,
          transport: Number(p.transport) || 0,
          uangRepresentasi: Number(p.uangRepresentasi) || 0,
        }))
      );
    }
  }, [spt]);

  if (!isOpen || !spt) return null;

  const handleChange = (
    index: number,
    field: 'uangHarian' | 'penginapan' | 'transport' | 'uangRepresentasi',
    value: string
  ) => {
    const num = Math.max(0, parseFloat(value) || 0);
    const updated = [...timData];
    updated[index] = { ...updated[index], [field]: num };
    setTimData(updated);
  };

  const handleApplyPreset = (index: number, type: 'standard' | 'clear') => {
    const updated = [...timData];
    if (type === 'standard') {
      updated[index] = {
        ...updated[index],
        uangHarian: 370000,
        penginapan: 500000,
        transport: 250000,
        uangRepresentasi: hasRepresentasi ? (updated[index].uangRepresentasi || 150000) : 0,
      };
    } else {
      updated[index] = {
        ...updated[index],
        uangHarian: 0,
        penginapan: 0,
        transport: 0,
        uangRepresentasi: 0,
      };
    }
    setTimData(updated);
  };

  const totalAnggaran = timData.reduce(
    (acc, p) =>
      acc +
      (p.uangHarian || 0) +
      (p.penginapan || 0) +
      (p.transport || 0) +
      (hasRepresentasi ? (p.uangRepresentasi || 0) : 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(spt.nomorSppd, timData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${hasRepresentasi ? 'max-w-4xl' : 'max-w-3xl'} overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150`}>
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-bold text-base leading-tight flex items-center gap-2 flex-wrap">
                <span>Kelola Komponen Keuangan Per Pegawai</span>
                {hasRepresentasi && (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    + Uang Representatif
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                SPPD: <span className="text-amber-300 font-semibold">{spt.nomorSppd}</span> ({spt.tujuan}) • Kelompok:{' '}
                <span className="text-blue-300 font-medium">
                  {LABEL_KELOMPOK_JABATAN[spt.kelompokJabatan]}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="text-xs text-slate-500 mb-3 bg-blue-50 border border-blue-200 text-blue-800 p-2.5 rounded-lg flex items-center justify-between flex-wrap gap-2">
            <span>
              💡 {hasRepresentasi
                ? 'Kelompok Bupati s/d Asisten Staf Ahli berhak atas Komponen Uang Representatif. Silakan isi rincian nominal di bawah.'
                : 'Masukkan besaran biaya perjalanan dinas untuk masing-masing pelaksana tugas.'}
            </span>
            <span className="font-semibold">
              Total Kwitansi: {formatRupiah(totalAnggaran)}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[55vh] overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Pegawai & Jabatan</th>
                  <th className="py-2.5 px-3 w-32">Uang Harian (Rp)</th>
                  <th className="py-2.5 px-3 w-32">Penginapan (Rp)</th>
                  <th className="py-2.5 px-3 w-32">Transport (Rp)</th>
                  {hasRepresentasi && (
                    <th className="py-2.5 px-3 w-36 bg-amber-50 text-amber-900 border-x border-amber-200">
                      Uang Representatif (Rp)
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timData.map((person, idx) => {
                  const subtotal =
                    (person.uangHarian || 0) +
                    (person.penginapan || 0) +
                    (person.transport || 0) +
                    (hasRepresentasi ? (person.uangRepresentasi || 0) : 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{person.nama}</div>
                        <div className="text-xs text-slate-500">{person.jabatanPegawai}</div>
                        <div className="text-[11px] text-slate-400">NIP: {person.nip}</div>
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(idx, 'standard')}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                          >
                            Set Standar
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(idx, 'clear')}
                            className="text-[10px] text-rose-500 hover:text-rose-700 underline"
                          >
                            Nol
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={person.uangHarian}
                          onChange={(e) => handleChange(idx, 'uangHarian', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={person.penginapan}
                          onChange={(e) => handleChange(idx, 'penginapan', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={person.transport}
                          onChange={(e) => handleChange(idx, 'transport', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {hasRepresentasi && (
                        <td className="py-3 px-2 bg-amber-50/50 border-x border-amber-100">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={person.uangRepresentasi || 0}
                            onChange={(e) => handleChange(idx, 'uangRepresentasi', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono border border-amber-300 bg-white rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-amber-950"
                            placeholder="0"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-semibold text-slate-800 font-mono">
                        {formatRupiah(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-slate-500">Total Akumulasi Kwitansi: </span>
              <span className="text-base font-bold text-emerald-700">
                {formatRupiah(totalAnggaran)}
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Simpan Biaya
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
