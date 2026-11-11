import React, { useState } from 'react';
import { SPTItem, UserRole, SpdStatus } from '../types';
import { formatTanggalIndo } from '../utils/formatters';
import { StatsCards } from './StatsCards';
import {
  Search,
  Edit3,
  FileText,
  Scroll,
  DollarSign,
  Zap,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface SptTableProps {
  daftarSpt: SPTItem[];
  userRole: UserRole;
  currentOperator: string;
  onOpenFinancial: (spt: SPTItem) => void;
  onOpenDocument: (spt: SPTItem, docType: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED') => void;
  onDeleteSpt?: (nomorSppd: string) => void;
  onToggleStatus?: (nomorSppd: string, newStatus: SpdStatus, alasan?: string) => void;
  initialStatusFilter?: 'ALL' | 'AKTIF' | 'BATAL';
}

export const SptTable: React.FC<SptTableProps> = ({
  daftarSpt,
  userRole,
  currentOperator,
  onOpenFinancial,
  onOpenDocument,
  onDeleteSpt,
  onToggleStatus,
  initialStatusFilter = 'ALL',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AKTIF' | 'BATAL'>(initialStatusFilter);

  // Cancellation Modal State
  const [batalModalTarget, setBatalModalTarget] = useState<SPTItem | null>(null);
  const [alasanInput, setAlasanInput] = useState('');

  // Hitung jumlah berkas yang diinput oleh operator yang sedang aktif
  const myEntriesCount = daftarSpt.filter(
    (s) => s.operator && s.operator.trim().toLowerCase() === currentOperator.trim().toLowerCase()
  ).length;

  // Base list visible:
  // Sesuai permintaan penyesuaian:
  // Operator HANYA melihat data yang diinput oleh akunnya sendiri.
  // Admin Utama dapat melihat keseluruhan data dari semua operator.
  const baseVisibleList = daftarSpt.filter((spt) => {
    if (userRole !== 'ADMINISTRATOR') {
      return (
        spt.operator &&
        spt.operator.trim().toLowerCase() === currentOperator.trim().toLowerCase()
      );
    }
    if (filterOperator !== 'ALL') {
      return (
        spt.operator &&
        spt.operator.trim().toLowerCase() === filterOperator.trim().toLowerCase()
      );
    }
    return true;
  });

  // Counts for status tabs
  const countAktif = baseVisibleList.filter((s) => s.status !== 'BATAL').length;
  const countBatal = baseVisibleList.filter((s) => s.status === 'BATAL').length;

  // Filter based on search, operator, and active/batal status
  const filteredList = baseVisibleList.filter((spt) => {
    // Status filter (AKTIF vs BATAL)
    const isBatal = spt.status === 'BATAL';
    if (filterStatus === 'AKTIF' && isBatal) return false;
    if (filterStatus === 'BATAL' && !isBatal) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchNum = spt.nomorSpt.toLowerCase().includes(q) || spt.nomorSppd.toLowerCase().includes(q);
    const matchMaksud = spt.maksud.toLowerCase().includes(q);
    const matchTujuan = spt.tujuan.toLowerCase().includes(q);
    const matchOperator = spt.operator.toLowerCase().includes(q);
    const matchPegawai = spt.tim.some((p) => p.nama.toLowerCase().includes(q) || p.nip.includes(q));

    return matchNum || matchMaksud || matchTujuan || matchOperator || matchPegawai;
  });

  const uniqueOperators = Array.from(new Set(daftarSpt.map((s) => s.operator))).filter(Boolean);

  const handleConfirmBatal = () => {
    if (batalModalTarget && onToggleStatus) {
      onToggleStatus(
        batalModalTarget.nomorSppd,
        'BATAL',
        alasanInput.trim() || 'Dibatalkan oleh operator'
      );
    }
    setBatalModalTarget(null);
    setAlasanInput('');
  };

  const handleRestore = (nomorSppd: string) => {
    if (onToggleStatus) {
      onToggleStatus(nomorSppd, 'AKTIF');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 flex flex-col h-full">
      {/* Component Ringkasan Statistik Dashboard (Sesuai Role Akun) */}
      <StatsCards daftarSpt={baseVisibleList} />

      {/* Status Filter Navigation (Semua / SPD Aktif / SPD Batal) */}
      <div className="bg-slate-100 p-1.5 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-2 border border-slate-200">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semua Data</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
              {daftarSpt.length}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('AKTIF')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'AKTIF'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SPD Aktif</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterStatus === 'AKTIF'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {countAktif}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('BATAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'BATAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>SPD Batal</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterStatus === 'BATAL'
                  ? 'bg-rose-800 text-white'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {countBatal}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2">
          {filterStatus === 'AKTIF' && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Menampilkan {countAktif} SPD berstatus aktif & berlaku
            </span>
          )}
          {filterStatus === 'BATAL' && (
            <span className="text-rose-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Menampilkan {countBatal} SPD yang telah dibatalkan
            </span>
          )}
        </div>
      </div>

      {/* Header and Filter */}
      <div className="border-b border-slate-200 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span>
            {userRole === 'ADMINISTRATOR'
              ? 'Daftar Semua SPT (Mode Admin Utama)'
              : `Daftar SPT Saya (${currentOperator})`}
          </h3>
          <p className="text-xs text-slate-500">
            {userRole === 'ADMINISTRATOR'
              ? `Menampilkan ${filteredList.length} dari total ${daftarSpt.length} data surat tugas semua operator`
              : `Menampilkan ${filteredList.length} data surat tugas yang Anda entri`}
          </p>
        </div>

        {/* Search & Role Specific Filter / Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nomor, nama, tujuan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 w-44 sm:w-56 bg-slate-50 focus:bg-white"
            />
          </div>

          {userRole === 'ADMINISTRATOR' ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-700">Operator:</span>
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">Semua Operator ({daftarSpt.length})</option>
                {uniqueOperators.map((op) => (
                  <option key={op} value={op}>
                    {op} ({daftarSpt.filter((s) => s.operator === op).length})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>Akun: {currentOperator}</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full font-bold ml-1">
                {myEntriesCount} Berkas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table responsive container */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 flex-1">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-200 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="py-3 px-3.5 whitespace-nowrap">Status & Nomor</th>
              <th className="py-3 px-3.5 min-w-[200px]">Informasi Perjalanan</th>
              <th className="py-3 px-3.5 min-w-[220px]">Daftar Pegawai Pelaksana</th>
              <th className="py-3 px-3.5 min-w-[190px]">Menu Dokumen</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Input Oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="font-semibold text-slate-600 text-sm">
                    {daftarSpt.length === 0
                      ? 'Daftar SPT saat ini masih kosong'
                      : 'Tidak ada data SPT yang sesuai filter pencarian'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {daftarSpt.length === 0
                      ? 'Nomor urut SPT dan SPD berikutnya akan otomatis dimulai dari nomor 001. Silakan buat berkas tugas pertama melalui formulir di samping kiri.'
                      : filterStatus === 'BATAL'
                      ? 'Belum ada SPD yang dibatalkan.'
                      : 'Coba ubah kata kunci pencarian atau filter status.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredList.map((spt) => {
                const isBatal = spt.status === 'BATAL';
                return (
                  <tr
                    key={spt.nomorSppd}
                    className={`transition-colors ${
                      isBatal ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Column 1: Status & Nomor SPT / SPPD / Dasar */}
                    <td className="py-3.5 px-3.5 align-top">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        {isBatal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <Ban className="w-3 h-3 text-rose-600" />
                            SPD BATAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SPD AKTIF
                          </span>
                        )}
                      </div>

                      <div
                        className={`font-bold text-xs sm:text-sm ${
                          isBatal ? 'line-through text-slate-500' : 'text-blue-800'
                        }`}
                      >
                        SPT: {spt.nomorSpt}
                      </div>
                      <div
                        className={`font-bold text-xs ${
                          isBatal ? 'line-through text-rose-500' : 'text-rose-700'
                        }`}
                      >
                        SPPD: {spt.nomorSppd}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        <span className="font-semibold text-slate-600">Dasar:</span> {spt.dasar}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tgl: {formatTanggalIndo(spt.tanggalSpt)}
                      </div>

                      {isBatal && spt.alasanBatal && (
                        <div className="mt-2 text-[10px] bg-rose-100/80 border border-rose-200 text-rose-800 p-1.5 rounded-md leading-tight">
                          <strong>Ket Batal:</strong> {spt.alasanBatal}
                        </div>
                      )}
                    </td>

                    {/* Column 2: Info Perjalanan */}
                    <td className="py-3.5 px-3.5 align-top">
                      <div
                        className={`font-medium text-xs sm:text-sm line-clamp-3 ${
                          isBatal ? 'text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {spt.maksud}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <span className="text-rose-500">📍</span> {spt.tujuan}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-normal">
                          {formatTanggalIndo(spt.tanggalMulai)}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Tim Pelaksana */}
                    <td className="py-3.5 px-3.5 align-top">
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        {spt.tim.map((person, idx) => (
                          <li key={idx} className={isBatal ? 'text-slate-500' : 'text-slate-800'}>
                            <strong className={isBatal ? 'text-slate-600' : 'text-slate-900'}>
                              {person.nama}
                            </strong>
                            <span className="text-slate-500 text-[11px] block pl-4">
                              NIP: {person.nip} • {person.pangkat && person.pangkat !== '-' ? `${person.pangkat} • ` : ''}{person.jabatanPegawai}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </td>

                    {/* Column 4: Menu Dokumen */}
                    <td className="py-3.5 px-3.5 align-top space-y-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenFinancial(spt)}
                        disabled={isBatal}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        Isi / Kelola Biaya
                      </button>

                      {/* 1 FITUR DOWNLOAD MERGER SEKALIGUS DALAM 1 KLIK */}
                      <button
                        type="button"
                        onClick={() => onOpenDocument(spt, 'MERGED')}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition shadow-xs cursor-pointer"
                        title="Download Dokumen Sekaligus Tergabung: SPT + SPD + Lampiran Rincian + Kwitansi (Merged PDF)"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Download PDF Lengkap (Merged)</span>
                      </button>

                      {/* Status Toggle Actions */}
                      <div className="pt-1.5 border-t border-slate-200 mt-2 flex flex-col gap-1">
                        {isBatal ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(spt.nomorSppd)}
                            className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded transition"
                            title="Aktifkan kembali SPD ini"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            Pulihkan ke SPD Aktif
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBatalModalTarget(spt);
                              setAlasanInput('');
                            }}
                            className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2 py-1 rounded transition"
                            title="Tandai SPD ini sebagai Batal"
                          >
                            <Ban className="w-3 h-3 text-rose-600" />
                            Batalkan SPD Ini
                          </button>
                        )}

                        {onDeleteSpt && (userRole === 'ADMINISTRATOR' || (spt.operator && spt.operator.toLowerCase() === currentOperator.toLowerCase())) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus permanen data ${spt.nomorSppd} (${spt.maksud})?`)) {
                                onDeleteSpt(spt.nomorSppd);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1 text-[10px] text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition cursor-pointer font-medium mt-0.5"
                            title="Hapus permanen data ini dari database"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" /> Hapus Permanen
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Column 5: Operator */}
                    <td className="py-3.5 px-3.5 align-top">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                        {spt.operator}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL KONFIRMASI PEMBATALAN SPD */}
      {batalModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Konfirmasi Pembatalan SPD</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs mb-3">
              <p className="font-semibold mb-1">
                SPPD: {batalModalTarget.nomorSppd}
              </p>
              <p className="text-slate-600">
                Tujuan: {batalModalTarget.tujuan} ({batalModalTarget.tanggalMulai})
              </p>
              <p className="mt-1 text-[11px] text-rose-700">
                Dokumen akan ditandai dengan tanda air <strong>DIBATALKAN</strong> dan dana tidak lagi dihitung dalam penyerapan anggaran aktif.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Pembatalan:
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Jadwal pimpinan berubah / Acara di Senduro ditunda"
                value={alasanInput}
                onChange={(e) => setAlasanInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBatalModalTarget(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmBatal}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Ya, Batalkan SPD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
