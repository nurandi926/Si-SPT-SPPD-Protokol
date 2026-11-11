import React, { useState, useMemo } from 'react';
import { SPTItem, UserRole, SpdStatus } from '../types';
import { formatTanggalIndo, formatRupiah, hitungDurasiHari } from '../utils/formatters';
import { exportRekapSptToExcel } from '../utils/excelExport';
import {
  FileSpreadsheet,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Scroll,
  DollarSign,
  Zap,
  Edit3,
  TrendingUp,
  MapPin,
  Users,
  Wallet,
  Clock,
  Filter,
} from 'lucide-react';

interface DaftarSptAktifProps {
  daftarSpt: SPTItem[];
  userRole: UserRole;
  currentOperator: string;
  onOpenFinancial: (spt: SPTItem) => void;
  onOpenDocument: (spt: SPTItem, docType: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED') => void;
  onToggleStatus: (nomorSppd: string, newStatus: SpdStatus, alasan?: string) => void;
}

export const DaftarSptAktif: React.FC<DaftarSptAktifProps> = ({
  daftarSpt,
  userRole,
  currentOperator,
  onOpenFinancial,
  onOpenDocument,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'AKTIF' | 'BATAL' | 'ALL'>('AKTIF');

  // Month selector state: "YYYY-MM" or "ALL"
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Unique operators list for Admin view
  const uniqueOperators = useMemo(() => {
    return Array.from(new Set(daftarSpt.map((s) => s.operator))).filter(Boolean);
  }, [daftarSpt]);

  // Base list visible:
  // Sesuai permintaan penyesuaian:
  // Operator HANYA melihat data yang diinput oleh akunnya sendiri.
  // Admin Utama dapat melihat keseluruhan data dari semua operator.
  const baseVisibleData = useMemo(() => {
    return daftarSpt.filter((spt) => {
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
  }, [daftarSpt, userRole, currentOperator, filterOperator]);

  // Unique months from data + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    baseVisibleData.forEach((spt) => {
      const dStr = spt.tanggalSpt || spt.tanggalMulai;
      if (dStr && dStr.length >= 7) {
        monthsSet.add(dStr.substring(0, 7));
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [baseVisibleData]);

  // Filter list by selected month, status, and search
  const filteredData = useMemo(() => {
    return baseVisibleData.filter((spt) => {
      // 1. Status Filter
      const isBatal = spt.status === 'BATAL';
      if (filterStatus === 'AKTIF' && isBatal) return false;
      if (filterStatus === 'BATAL' && !isBatal) return false;

      // 2. Month Filter
      if (selectedMonth !== 'ALL') {
        const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);
        const dateToCheck = spt.tanggalSpt || spt.tanggalMulai;
        if (dateToCheck) {
          const d = new Date(dateToCheck);
          if (isNaN(d.getTime())) return false;
          if (d.getFullYear() !== targetYear || d.getMonth() + 1 !== targetMonth) {
            return false;
          }
        }
      }

      // 3. Search Filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const matchNum = spt.nomorSpt.toLowerCase().includes(q) || spt.nomorSppd.toLowerCase().includes(q);
      const matchMaksud = spt.maksud.toLowerCase().includes(q);
      const matchTujuan = spt.tujuan.toLowerCase().includes(q);
      const matchPegawai = spt.tim.some((p) => p.nama.toLowerCase().includes(q) || p.nip.includes(q));

      return matchNum || matchMaksud || matchTujuan || matchPegawai;
    });
  }, [baseVisibleData, filterStatus, selectedMonth, searchTerm]);

  // Statistics for the filtered view
  const summaryStats = useMemo(() => {
    let totalBiaya = 0;
    let totalUangHarian = 0;
    let totalPenginapan = 0;
    let totalTransport = 0;
    let totalPersonel = 0;

    filteredData.forEach((spt) => {
      let sptSum = 0;
      spt.tim.forEach((p) => {
        const h = Number(p.uangHarian) || 0;
        const i = Number(p.penginapan) || 0;
        const t = Number(p.transport) || 0;
        const r = Number(p.uangRepresentasi) || 0;
        totalUangHarian += h;
        totalPenginapan += i;
        totalTransport += t;
        sptSum += h + i + t + r;
      });
      totalBiaya += sptSum;
      totalPersonel += spt.tim.length;
    });

    return {
      totalBiaya,
      totalUangHarian,
      totalPenginapan,
      totalTransport,
      totalPersonel,
      count: filteredData.length,
    };
  }, [filteredData]);

  // Label bulan
  const namaBulanLabel = useMemo(() => {
    if (selectedMonth === 'ALL') return 'Semua Periode';
    const [y, m] = selectedMonth.split('-').map(Number);
    const nama = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ][m - 1];
    return `${nama} ${y}`;
  }, [selectedMonth]);

  // Eksekusi Download Excel
  const handleDownloadExcel = () => {
    const statusLabel =
      filterStatus === 'AKTIF'
        ? 'SPD_Aktif'
        : filterStatus === 'BATAL'
        ? 'SPD_Batal'
        : 'Semua_SPD';
    exportRekapSptToExcel(filteredData, namaBulanLabel, statusLabel);
  };

  // Helper biaya SPT per baris
  const hitungBiayaPerSpt = (spt: SPTItem) => {
    let harian = 0;
    let inap = 0;
    let trans = 0;
    let representasi = 0;
    spt.tim.forEach((p) => {
      harian += Number(p.uangHarian) || 0;
      inap += Number(p.penginapan) || 0;
      trans += Number(p.transport) || 0;
      representasi += Number(p.uangRepresentasi) || 0;
    });
    return {
      total: harian + inap + trans + representasi,
      harian,
      inap,
      trans,
      representasi,
    };
  };

  const countAktifTotal = daftarSpt.filter((s) => s.status !== 'BATAL').length;
  const countBatalTotal = daftarSpt.filter((s) => s.status === 'BATAL').length;

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Control Toolbar */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Monitoring SPT & Realisasi Biaya Perjalanan Dinas
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rekapitulasi berkas Surat Perintah Tugas, data perjalanan, dan penyerapan anggaran resmi
            </p>
          </div>

          {/* Action: Download Excel Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadExcel}
              disabled={filteredData.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Unduh seluruh SPT aktif bulan ini dalam format file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Download Excel Rekap Bulanan ({filteredData.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Periode Bulan, Status Tab, & Pencarian */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          
          {/* Sub-Filter Status (SPD Aktif / SPD Batal / Semua) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterStatus('AKTIF')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'AKTIF'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SPD Aktif</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === 'AKTIF'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-100 text-emerald-800 font-bold'
                }`}
              >
                {countAktifTotal}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('BATAL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'BATAL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>SPD Batal</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === 'BATAL'
                    ? 'bg-rose-800 text-white'
                    : 'bg-rose-100 text-rose-800 font-bold'
                }`}
              >
                {countBatalTotal}
              </span>
            </button>

            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Semua</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-bold">
                {baseVisibleData.length}
              </span>
            </button>
          </div>

          {/* Month Selector, Operator Filter, & Search Box */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Operator Filter: Admin bisa pilih per nama, Operator bisa pilih Semua / Inputan Saya */}
            {userRole === 'ADMINISTRATOR' ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Operator:</span>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold text-blue-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Akun Anda: <span className="font-bold text-blue-950">{currentOperator}</span> ({baseVisibleData.length} Berkas)</span>
              </div>
            )}
            {/* Dropdown Bulan */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Periode:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Bulan</option>
                {availableMonths.map((ym) => {
                  const [y, m] = ym.split('-').map(Number);
                  const mName = [
                    'Januari',
                    'Februari',
                    'Maret',
                    'April',
                    'Mei',
                    'Juni',
                    'Juli',
                    'Agustus',
                    'September',
                    'Oktober',
                    'November',
                    'Desember',
                  ][m - 1];
                  return (
                    <option key={ym} value={ym}>
                      {mName} {y}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari maksud / tujuan / nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 w-48 sm:w-64 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mini Summary Cards for This Filtered View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Jumlah Surat Tugas ({namaBulanLabel})
            </p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {summaryStats.count} <span className="text-xs font-normal text-slate-500">Berkas</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-3 bg-gradient-to-r from-white to-emerald-50/30">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Total Biaya Perjalanan Dinas
            </p>
            <p className="text-xl font-black text-emerald-700 font-mono">
              {formatRupiah(summaryStats.totalBiaya)}
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Total Personel Bertugas
            </p>
            <p className="text-xl font-black text-slate-900 font-mono">
              {summaryStats.totalPersonel} <span className="text-xs font-normal text-slate-500">Orang</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Table: Focused on Informasi Perjalanan & Total Biaya Perjalanan Dinas */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">No & Nomor Surat</th>
                <th className="py-3 px-3.5 min-w-[260px]">Informasi Perjalanan (Tugas & Lokasi)</th>
                <th className="py-3 px-3.5 min-w-[200px]">Pegawai Pelaksana</th>
                <th className="py-3 px-3.5 min-w-[190px] bg-emerald-50/60 text-emerald-900 border-l border-r border-emerald-100">
                  Total Biaya Perjalanan Dinas
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Menu Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="text-4xl mb-2">📑</div>
                    <p className="font-semibold text-slate-600 text-base">
                      Tidak ada data SPT pada periode {namaBulanLabel}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Silakan pilih periode bulan lain atau kembali ke menu <strong>Entry SPT Baru</strong> untuk membuat penugasan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((spt, index) => {
                  const biaya = hitungBiayaPerSpt(spt);
                  const durasi = hitungDurasiHari(spt.tanggalMulai, spt.tanggalSelesai);
                  const isBatal = spt.status === 'BATAL';

                  return (
                    <tr
                      key={spt.nomorSppd}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBatal ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* Column 1: No & Nomor Surat */}
                      <td className="py-3.5 px-3.5 align-top">
                        <div className="text-xs font-semibold text-slate-400 mb-1">
                          #{index + 1}
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
                        <div className="text-[10px] text-slate-400 mt-1">
                          Tgl: {formatTanggalIndo(spt.tanggalSpt)}
                        </div>
                      </td>

                      {/* Column 2: INFORMASI PERJALANAN (Utama) */}
                      <td className="py-3.5 px-3.5 align-top">
                        <div
                          className={`font-medium text-xs sm:text-sm leading-relaxed ${
                            isBatal ? 'text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {spt.maksud}
                        </div>

                        {/* Tujuan & Tanggal */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {spt.tujuan}
                          </span>

                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {durasi} Hari ({formatTanggalIndo(spt.tanggalMulai)} s/d {formatTanggalIndo(spt.tanggalSelesai)})
                          </span>
                        </div>

                        {/* Dasar Tugas */}
                        <div className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                          <span className="font-semibold text-slate-600">Dasar:</span> {spt.dasar}
                        </div>
                      </td>

                      {/* Column 3: Pegawai Pelaksana */}
                      <td className="py-3.5 px-3.5 align-top">
                        <div className="font-semibold text-xs text-slate-700 mb-1">
                          {spt.tim.length} Orang Personel:
                        </div>
                        <ul className="space-y-1 text-xs">
                          {spt.tim.map((p, idx) => (
                            <li key={idx} className="text-slate-800">
                              <span className="font-bold text-slate-900">
                                {idx + 1}. {p.nama}
                              </span>
                              <span className="text-[11px] text-slate-500 block pl-3">
                                {p.jabatanPegawai}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Column 4: TOTAL BIAYA PERJALANAN DINAS (FITUR UTAMA) */}
                      <td className="py-3.5 px-3.5 align-top bg-emerald-50/30 border-l border-r border-emerald-100">
                        <div className="font-mono text-base font-black text-emerald-700">
                          {formatRupiah(biaya.total)}
                        </div>

                        {/* Rincian Komponen Biaya */}
                        <div className="mt-1.5 space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-600 border-b border-dashed border-emerald-200/60 pb-0.5">
                            <span>Uang Harian:</span>
                            <span className="font-mono font-medium">{formatRupiah(biaya.harian)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 border-b border-dashed border-emerald-200/60 pb-0.5">
                            <span>Penginapan:</span>
                            <span className="font-mono font-medium">{formatRupiah(biaya.inap)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Transport:</span>
                            <span className="font-mono font-medium">{formatRupiah(biaya.trans)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenFinancial(spt)}
                          className="mt-2 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          Edit Rincian Biaya
                        </button>
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                        {isBatal ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              BATAL
                            </span>
                            {spt.alasanBatal && (
                              <p className="text-[10px] text-rose-700 mt-1 max-w-[120px] truncate" title={spt.alasanBatal}>
                                {spt.alasanBatal}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            AKTIF
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Oleh: {spt.operator}
                        </div>
                      </td>

                      {/* Column 6: Menu Dokumen (1 FITUR DOWNLOAD MERGER SEKALIGUS) */}
                      <td className="py-3.5 px-3.5 align-top whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => onOpenDocument(spt, 'MERGED')}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition shadow-xs cursor-pointer"
                          title="Download 3 Dokumen Sekaligus Tergabung: SPT + SPD + Kwitansi (Merged PDF)"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Download 3 Dokumen (Merged PDF)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
