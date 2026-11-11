import React, { useMemo, useState } from 'react';
import { SPTItem } from '../types';
import { formatRupiah } from '../utils/formatters';
import { FileText, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  daftarSpt: SPTItem[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ daftarSpt }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current year-month (e.g. "2026-11" or fallback from data if any)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const stats = useMemo(() => {
    const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);

    let countSptAktifBulanIni = 0;
    let countSptBatalBulanIni = 0;
    let anggaranBulanIni = 0;
    let pegawaiBulanIni = 0;

    let totalSptAktif = 0;
    let totalSptBatal = 0;
    let totalAnggaranSemua = 0;
    let totalPegawaiSemua = 0;

    daftarSpt.forEach((spt) => {
      const isBatal = spt.status === 'BATAL';
      if (isBatal) {
        totalSptBatal++;
      } else {
        totalSptAktif++;
      }

      // Calculate costs for this SPT
      let sptTotalBiaya = 0;
      spt.tim.forEach((p) => {
        const biaya =
          (Number(p.uangHarian) || 0) +
          (Number(p.penginapan) || 0) +
          (Number(p.transport) || 0) +
          (Number(p.uangRepresentasi) || 0);
        sptTotalBiaya += biaya;
      });

      if (!isBatal) {
        totalAnggaranSemua += sptTotalBiaya;
        totalPegawaiSemua += spt.tim.length;
      }

      // Check if date belongs to selected month
      const dateToCheck = spt.tanggalSpt || spt.tanggalMulai;
      if (dateToCheck) {
        const d = new Date(dateToCheck);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth) {
            if (isBatal) {
              countSptBatalBulanIni++;
            } else {
              countSptAktifBulanIni++;
              anggaranBulanIni += sptTotalBiaya;
              pegawaiBulanIni += spt.tim.length;
            }
          }
        }
      }
    });

    const namaBulanIndo = [
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
    ][targetMonth - 1] || 'Bulan Ini';

    return {
      namaBulan: `${namaBulanIndo} ${targetYear}`,
      countSptAktifBulanIni,
      countSptBatalBulanIni,
      anggaranBulanIni,
      pegawaiBulanIni,
      totalSptAktif,
      totalSptBatal,
      totalAnggaranSemua,
      totalPegawaiSemua,
    };
  }, [daftarSpt, selectedMonth]);

  // Available months from records + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    monthsSet.add(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );

    daftarSpt.forEach((spt) => {
      const dStr = spt.tanggalSpt || spt.tanggalMulai;
      if (dStr && dStr.length >= 7) {
        monthsSet.add(dStr.substring(0, 7));
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [daftarSpt]);

  return (
    <div className="mb-5 space-y-3">
      {/* Top Bar Filter & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-slate-900 to-blue-950 text-white px-4 py-2.5 rounded-xl shadow-xs border border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Ringkasan Statistik & Realisasi Anggaran
          </span>
          <span className="hidden sm:inline-block text-[11px] text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-700/50">
            {stats.namaBulan}
          </span>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-300 text-[11px]">Periode:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800/90 text-white font-semibold text-xs px-2.5 py-1 rounded-md border border-slate-700 outline-hidden cursor-pointer hover:bg-slate-700 transition"
          >
            {availableMonths.map((ym) => {
              const [y, m] = ym.split('-').map(Number);
              const mName = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'Mei',
                'Jun',
                'Jul',
                'Agu',
                'Sep',
                'Okt',
                'Nov',
                'Des',
              ][m - 1];
              return (
                <option key={ym} value={ym} className="bg-slate-900 text-white">
                  {mName} {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Grid of Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        
        {/* Card 1: Total SPT Aktif Bulan Ini */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-blue-300 transition">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition duration-200">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              SPT Aktif Bulan Ini
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {stats.countSptAktifBulanIni}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Aktif
              </span>
              {stats.countSptBatalBulanIni > 0 && (
                <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  {stats.countSptBatalBulanIni} Batal
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total riwayat: <strong className="text-slate-600">{stats.totalSptAktif} Aktif</strong> • <span className="text-rose-500">{stats.totalSptBatal} Batal</span>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
        </div>

        {/* Card 2: Total Anggaran Terserap */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition duration-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Anggaran Diserap ({stats.namaBulan})
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                {formatRupiah(stats.anggaranBulanIni)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Akumulasi semua data: <strong className="text-slate-600">{formatRupiah(stats.totalAnggaranSemua)}</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        </div>

        {/* Card 3: Total Pegawai Bertugas */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 relative overflow-hidden group hover:border-purple-300 transition sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition duration-200">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Pegawai Bertugas ({stats.namaBulan})
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {stats.pegawaiBulanIni}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Personel
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total penugasan: <strong className="text-slate-600">{stats.totalPegawaiSemua} Orang</strong>
            </p>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full pointer-events-none" />
        </div>

      </div>
    </div>
  );
};
