import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SPTItem, LaporanPerjalananDinas, PihakHadir, Pegawai } from '../types';
import { formatTanggalIndo, hitungDurasiHari } from '../utils/formatters';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Printer,
  Download,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileCheck,
  X,
  Loader2,
} from 'lucide-react';

declare const html2pdf: any;

const LAPORAN_STORAGE_KEY = 'DATA_LAPORAN_PERJALANAN_DINAS_V1';

interface LaporanPerjalananDinasViewProps {
  daftarSpt: SPTItem[];
  userRole?: string;
  currentOperator: string;
}

export const LaporanPerjalananDinasView: React.FC<LaporanPerjalananDinasViewProps> = ({
  daftarSpt,
  userRole,
  currentOperator,
}) => {
  // Saved reports storage
  const [daftarLaporan, setDaftarLaporan] = useState<LaporanPerjalananDinas[]>([]);

  // Selected SPT to create/edit report
  const [selectedSppd, setSelectedSppd] = useState<string>('');

  // 10 Fields State
  const [dasarUtama, setDasarUtama] = useState('');
  const [dasarTambahan, setDasarTambahan] = useState<string[]>([]);
  const [maksudTujuan, setMaksudTujuan] = useState('');
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState('');
  const [petugas, setPetugas] = useState<Pegawai[]>([]);
  const [daerahTujuan, setDaerahTujuan] = useState('');
  const [hadirPertemuan, setHadirPertemuan] = useState<PihakHadir[]>([
    { nama: '', jabatanInstansi: '' },
  ]);
  const [petunjukArahan, setPetunjukArahan] = useState('');
  const [masalahTemuan, setMasalahTemuan] = useState('');
  const [saranTindakan, setSaranTindakan] = useState('');
  const [lainLain, setLainLain] = useState('');
  const [tanggalLaporan, setTanggalLaporan] = useState(new Date().toISOString().split('T')[0]);

  // UI feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewLaporan, setPreviewLaporan] = useState<LaporanPerjalananDinas | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const printLaporanRef = useRef<HTMLDivElement>(null);

  // Load existing reports from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAPORAN_STORAGE_KEY);
      if (stored) {
        setDaftarLaporan(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load stored Laporan data:', e);
    }
  }, []);

  // When selected SPT changes, link ('ngeling') data from SPT
  const handleSelectSpt = (sppdNum: string) => {
    setSelectedSppd(sppdNum);
    const spt = daftarSpt.find((s) => s.nomorSppd === sppdNum);
    if (!spt) return;

    // Check if report already exists for this SPPD
    const existing = daftarLaporan.find((l) => l.nomorSppd === sppdNum);
    if (existing) {
      setDasarUtama(existing.dasarUtama);
      setDasarTambahan(existing.dasarTambahan || []);
      setMaksudTujuan(existing.maksudTujuan);
      setWaktuPelaksanaan(existing.waktuPelaksanaan);
      setPetugas(existing.petugas);
      setDaerahTujuan(existing.daerahTujuan);
      setHadirPertemuan(
        existing.hadirPertemuan && existing.hadirPertemuan.length > 0
          ? existing.hadirPertemuan
          : [{ nama: '', jabatanInstansi: '' }]
      );
      setPetunjukArahan(existing.petunjukArahan);
      setMasalahTemuan(existing.masalahTemuan);
      setSaranTindakan(existing.saranTindakan);
      setLainLain(existing.lainLain);
      setTanggalLaporan(existing.tanggalLaporan);
    } else {
      // Auto-link ('ngeling') fresh data from SPT
      const durasi = hitungDurasiHari(spt.tanggalMulai, spt.tanggalSelesai);
      const waktuStr = `${formatTanggalIndo(spt.tanggalMulai)} s/d ${formatTanggalIndo(
        spt.tanggalSelesai
      )} (${durasi} hari)`;

      setDasarUtama(spt.dasar);
      setDasarTambahan([]);
      setMaksudTujuan(spt.maksud);
      setWaktuPelaksanaan(waktuStr);
      setPetugas(spt.tim);
      setDaerahTujuan(spt.tujuan);
      setHadirPertemuan([{ nama: '', jabatanInstansi: '' }]);
      setPetunjukArahan('');
      setMasalahTemuan('');
      setSaranTindakan('');
      setLainLain('');
      setTanggalLaporan(spt.tanggalSelesai || new Date().toISOString().split('T')[0]);
    }
  };

  // Helper tambah dasar manual
  const handleAddDasarTambahan = () => {
    setDasarTambahan([...dasarTambahan, '']);
  };

  const handleUpdateDasarTambahan = (index: number, val: string) => {
    const updated = [...dasarTambahan];
    updated[index] = val;
    setDasarTambahan(updated);
  };

  const handleRemoveDasarTambahan = (index: number) => {
    setDasarTambahan(dasarTambahan.filter((_, i) => i !== index));
  };

  // Helper tambah pihak hadir
  const handleAddHadir = () => {
    setHadirPertemuan([...hadirPertemuan, { nama: '', jabatanInstansi: '' }]);
  };

  const handleUpdateHadir = (index: number, field: keyof PihakHadir, val: string) => {
    const updated = [...hadirPertemuan];
    updated[index] = { ...updated[index], [field]: val };
    setHadirPertemuan(updated);
  };

  const handleRemoveHadir = (index: number) => {
    if (hadirPertemuan.length > 1) {
      setHadirPertemuan(hadirPertemuan.filter((_, i) => i !== index));
    }
  };

  // Save report
  const handleSaveLaporan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSppd) {
      alert('Silakan pilih berkas SPT/SPPD terlebih dahulu!');
      return;
    }

    const spt = daftarSpt.find((s) => s.nomorSppd === selectedSppd);
    const existingIndex = daftarLaporan.findIndex((l) => l.nomorSppd === selectedSppd);

    const newLaporan: LaporanPerjalananDinas = {
      id: existingIndex !== -1 ? daftarLaporan[existingIndex].id : `lap_${Date.now()}`,
      nomorSppd: selectedSppd,
      nomorSpt: spt ? spt.nomorSpt : '-',
      tanggalLaporan,
      dasarUtama: dasarUtama.trim(),
      dasarTambahan: dasarTambahan.filter((d) => d.trim() !== ''),
      maksudTujuan: maksudTujuan.trim(),
      waktuPelaksanaan: waktuPelaksanaan.trim(),
      petugas,
      daerahTujuan: daerahTujuan.trim(),
      hadirPertemuan: hadirPertemuan.filter((h) => h.nama.trim() !== ''),
      petunjukArahan: petunjukArahan.trim(),
      masalahTemuan: masalahTemuan.trim(),
      saranTindakan: saranTindakan.trim(),
      lainLain: lainLain.trim(),
      dibuatOleh: currentOperator,
      createdAt: new Date().toISOString(),
    };

    let updatedList: LaporanPerjalananDinas[];
    if (existingIndex !== -1) {
      updatedList = [...daftarLaporan];
      updatedList[existingIndex] = newLaporan;
    } else {
      updatedList = [newLaporan, ...daftarLaporan];
    }

    setDaftarLaporan(updatedList);
    try {
      localStorage.setItem(LAPORAN_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.error('Failed to save Laporan to localStorage:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Print clean isolated Laporan
  const handlePrintLaporan = () => {
    const element = printLaporanRef.current;
    if (!element || !previewLaporan) {
      window.print();
      return;
    }

    const cleanNum = previewLaporan.nomorSppd.replace(/[\/.]/g, '_');
    const docTitle = `Laporan_Perjalanan_Dinas_${cleanNum}`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docTitle}</title>
            <style>
              @page {
                size: 215mm 330mm; /* Kertas Folio / F4 */
                margin: 10mm 15mm;
              }
              * {
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-container {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
              }
              table {
                border-collapse: collapse;
                width: 100%;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {}
        }, 1000);
      }, 400);
    }
  };

  // Export PDF of Laporan Perjalanan Dinas (Anti blank putih/kosong)
  const handleDownloadPdfLaporan = async () => {
    if (!previewLaporan) return;
    setIsExportingPdf(true);
    let clone: HTMLElement | null = null;
    try {
      const element = printLaporanRef.current;
      if (!element) return;

      const cleanNum = previewLaporan.nomorSppd.replace(/[\/.]/g, '_');
      const filename = `Laporan_Perjalanan_Dinas_${cleanNum}.pdf`;

      // Clone element ke document.body terisolasi agar html2canvas tidak blank putih karena scroll modal
      clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '740px';
      clone.style.minHeight = '940px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.zIndex = '-9999';
      clone.style.margin = '0';
      clone.style.padding = '25px 35px';
      clone.style.fontFamily = 'Arial, sans-serif';
      clone.style.boxSizing = 'border-box';
      document.body.appendChild(clone);

      if (typeof html2pdf !== 'undefined') {
        const totalHeight = clone.scrollHeight || 1000;
        const opt = {
          margin: [15, 15, 15, 15],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false,
            scrollY: 0,
            scrollX: 0,
            height: totalHeight,
            windowHeight: totalHeight + 500,
            windowWidth: 800,
          },
          jsPDF: { unit: 'pt', format: [612, 936], orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'] },
        };

        try {
          const worker = html2pdf().set(opt).from(clone);
          const pdfBlob = await worker.outputPdf('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            try {
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(blobUrl);
            } catch (e) {}
          }, 3000);
        } catch (blobErr) {
          console.warn('Fallback to direct save:', blobErr);
          await html2pdf().set(opt).from(clone).save();
        }
      } else {
        handlePrintLaporan();
      }
    } catch (err: any) {
      console.error('Download error:', err);
      handlePrintLaporan();
    } finally {
      if (clone && clone.parentNode) {
        try {
          document.body.removeChild(clone);
        } catch (e) {}
      }
      setIsExportingPdf(false);
    }
  };

  // Current selected SPT details
  const selectedSptObj = daftarSpt.find((s) => s.nomorSppd === selectedSppd);

  // Filtered SPT list for selector:
  // Operator ONLY sees their own SPTs; Admin Utama can see all.
  const activeSpts = useMemo(() => {
    return daftarSpt.filter((s) => {
      if (s.status === 'BATAL') return false;
      if (userRole !== 'ADMINISTRATOR') {
        const opA = (s.operator || '').trim().toLowerCase();
        const opB = (currentOperator || '').trim().toLowerCase();
        if (opA !== opB) return false;
      }
      return true;
    });
  }, [daftarSpt, userRole, currentOperator]);

  // Filtered Laporan list:
  // Operator ONLY sees reports of SPTs they entered; Admin Utama can see all.
  const visibleLaporan = useMemo(() => {
    return daftarLaporan.filter((lap) => {
      if (userRole !== 'ADMINISTRATOR') {
        const parentSpt = daftarSpt.find((s) => s.nomorSppd === lap.nomorSppd);
        const opA = (parentSpt?.operator || lap.dibuatOleh || '').trim().toLowerCase();
        const opB = (currentOperator || '').trim().toLowerCase();
        if (opA !== opB) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        lap.nomorSppd.toLowerCase().includes(q) ||
        lap.nomorSpt.toLowerCase().includes(q) ||
        lap.daerahTujuan.toLowerCase().includes(q) ||
        lap.maksudTujuan.toLowerCase().includes(q)
      );
    });
  }, [daftarLaporan, daftarSpt, userRole, currentOperator, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Laporan Hasil Perjalanan Dinas
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {userRole === 'ADMINISTRATOR'
                ? 'Mode Admin Utama: Menampilkan seluruh laporan perjalanan dinas dari semua operator'
                : `Mode Operator: Hanya mengelola laporan untuk SPT yang Anda entri (${currentOperator})`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
              Total Laporan Tersimpan: {visibleLaporan.length}
            </span>
          </div>
        </div>

        {/* SPT Selector Bar */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            Pilih SPT / SPPD untuk Dibuatkan Laporan:
          </label>
          <select
            value={selectedSppd}
            onChange={(e) => handleSelectSpt(e.target.value)}
            className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
          >
            <option value="">-- Pilih Berkas Surat Perintah Tugas --</option>
            {activeSpts.map((s) => {
              const hasReport = daftarLaporan.some((l) => l.nomorSppd === s.nomorSppd);
              return (
                <option key={s.nomorSppd} value={s.nomorSppd}>
                  {hasReport ? '✅ [Laporan Ada] ' : '📝 [Belum Ada] '}
                  SPPD: {s.nomorSppd} | Tujuan: {s.tujuan} ({s.maksud.substring(0, 50)}...)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Laporan Hasil Perjalanan Dinas Berhasil Disimpan ke Sistem!</span>
        </div>
      )}

      {/* Main 10-Point Report Form */}
      {selectedSppd ? (
        <form onSubmit={handleSaveLaporan} className="bg-white rounded-xl shadow-md border border-slate-200 p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📝</span>
              Formulir 10 Poin Laporan: {selectedSppd}
            </h3>
            <span className="text-xs text-slate-500">
              Otomatis terhubung dengan SPT: <strong>{selectedSptObj?.nomorSpt}</strong>
            </span>
          </div>

          {/* 1. DASAR PENUGASAN (Ngeling + Fitur Tambah Manual) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                Dasar Penugasan
              </label>
              <button
                type="button"
                onClick={handleAddDasarTambahan}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Dasar Manual
              </button>
            </div>

            {/* Dasar Utama (ngeling dari SPT) */}
            <div className="mb-2">
              <span className="text-[11px] font-semibold text-blue-700 block mb-1">
                Dasar Utama (Terhubung dari SPT):
              </span>
              <textarea
                rows={2}
                value={dasarUtama}
                onChange={(e) => setDasarUtama(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Dasar Tambahan Manual */}
            {dasarTambahan.length > 0 && (
              <div className="space-y-2 mt-3 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Dasar Tambahan yang Diisi Manual:
                </span>
                {dasarTambahan.map((dasarManual, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{idx + 2}.</span>
                    <input
                      type="text"
                      placeholder={`Contoh: Undangan Camat Senduro No. 005/...`}
                      value={dasarManual}
                      onChange={(e) => handleUpdateDasarTambahan(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDasarTambahan(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Hapus dasar tambahan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. MAKSUD / TUJUAN (Ngeling dari SPT) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              Maksud / Tujuan
            </label>
            <textarea
              rows={2}
              value={maksudTujuan}
              onChange={(e) => setMaksudTujuan(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 3. WAKTU PELAKSANAAN (Ngeling dari SPT) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                3
              </span>
              Waktu Pelaksanaan
            </label>
            <input
              type="text"
              value={waktuPelaksanaan}
              onChange={(e) => setWaktuPelaksanaan(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 4. NAMA PETUGAS PELAKSANA (Ngeling dari SPT) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                4
              </span>
              Nama Petugas Pelaksana ({petugas.length} Orang)
            </label>
            <ul className="space-y-1.5 text-xs bg-white p-3 rounded-lg border border-slate-200">
              {petugas.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between text-slate-800">
                  <div>
                    <strong>
                      {idx + 1}. {p.nama}
                    </strong>
                    <span className="text-slate-500 ml-2">
                      (NIP: {p.nip} - {p.jabatanPegawai})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. DAERAH / TUJUAN YANG DIKUNJUNGI (Ngeling dari SPT) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                5
              </span>
              Daerah / Tujuan yang Dikunjungi
            </label>
            <input
              type="text"
              value={daerahTujuan}
              onChange={(e) => setDaerahTujuan(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 6. HADIR DALAM PERTEMUAN (Fitur Pengisian & Tambah Pengisian Fleksibel) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                  6
                </span>
                Hadir dalam Pertemuan ({hadirPertemuan.length} Pihak)
              </label>
              <button
                type="button"
                onClick={handleAddHadir}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pihak Hadir
              </button>
            </div>

            <div className="space-y-2">
              {hadirPertemuan.map((pihak, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder="Nama / Pihak (contoh: Kepala Desa Senduro)"
                    value={pihak.nama}
                    onChange={(e) => handleUpdateHadir(idx, 'nama', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan / Instansi (contoh: Perangkat Desa / Tokoh Masyarakat)"
                    value={pihak.jabatanInstansi}
                    onChange={(e) => handleUpdateHadir(idx, 'jabatanInstansi', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  {hadirPertemuan.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHadir(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 7. PETUNJUK / ARAHAN YANG DIBERIKAN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                7
              </span>
              Petunjuk / Arahan yang Diberikan
            </label>
            <textarea
              rows={3}
              placeholder="Tuliskan petunjuk, instruksi pimpinan, arahan Bupati/Wakil Bupati atau kesepakatan dalam kunjungan kerja..."
              value={petunjukArahan}
              onChange={(e) => setPetunjukArahan(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 8. MASALAH / TEMUAN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                8
              </span>
              Masalah / Temuan
            </label>
            <textarea
              rows={3}
              placeholder="Tuliskan kendala di lapangan, temuan, atau hambatan teknis yang dihadapi selama kegiatan..."
              value={masalahTemuan}
              onChange={(e) => setMasalahTemuan(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 9. SARAN TINDAKAN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                9
              </span>
              Saran Tindakan
            </label>
            <textarea
              rows={3}
              placeholder="Tuliskan saran rekomendasi tindakan atau langkah tindak lanjut yang perlu dilakukan..."
              value={saranTindakan}
              onChange={(e) => setSaranTindakan(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* 10. LAIN-LAIN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                10
              </span>
              Lain - lain
            </label>
            <textarea
              rows={2}
              placeholder="Catatan penutup, lampiran dokumentasi foto, situasi kondusif, dsb..."
              value={lainLain}
              onChange={(e) => setLainLain(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Tanggal Penandatanganan Laporan */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Laporan Dibuat (Lumajang)
            </label>
            <input
              type="date"
              value={tanggalLaporan}
              onChange={(e) => setTanggalLaporan(e.target.value)}
              required
              className="w-full max-w-xs px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              * Laporan akan tersimpan dan siap dicetak / diunduh sebagai berkas PDF resmi Folio F4.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Laporan Perjalanan Dinas</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12 text-center text-slate-500">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 border border-blue-200">
            📋
          </div>
          <h3 className="font-bold text-base text-slate-800">
            Pilih Berkas SPT / SPPD Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Pilih penugasan pada menu pilihan di atas untuk mengisi 10 poin Laporan Hasil Perjalanan Dinas secara otomatis dan terstruktur.
          </p>
        </div>
      )}

      {/* DAFTAR RIWAYAT LAPORAN YANG SUDAH DIBUAT */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <span>📚</span> Daftar Riwayat Laporan Hasil Perjalanan Dinas
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {visibleLaporan.length} laporan hasil perjalanan dinas yang telah disusun
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nomor SPPD / tujuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl w-48 sm:w-60 bg-slate-50"
            />
          </div>
        </div>

        {visibleLaporan.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada berkas Laporan Hasil Perjalanan Dinas yang tersimpan untuk akun Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Nomor SPPD / SPT</th>
                  <th className="py-2.5 px-3">Maksud & Tujuan Dinas</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3">Tgl Laporan</th>
                  <th className="py-2.5 px-3 text-center">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleLaporan.map((lap) => (
                    <tr key={lap.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-rose-700">{lap.nomorSppd}</div>
                        <div className="text-blue-800 text-xs">SPT: {lap.nomorSpt}</div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-900 line-clamp-2">
                          {lap.maksudTujuan}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{lap.daerahTujuan}</span>
                          <span>•</span>
                          <span>{lap.waktuPelaksanaan}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <ul className="text-xs space-y-0.5">
                          {lap.petugas.map((p, i) => (
                            <li key={i} className="text-slate-800">
                              {i + 1}. {p.nama}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap text-slate-600">
                        {formatTanggalIndo(lap.tanggalLaporan)}
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap text-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setPreviewLaporan(lap)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat / Cetak Laporan PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PRATINJAU & DOWNLOAD PDF LAPORAN PERJALANAN DINAS */}
      {previewLaporan && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  Pratinjau Laporan Hasil Perjalanan Dinas (Folio F4)
                </h3>
              </div>
              <button
                onClick={() => setPreviewLaporan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                SPPD: <strong>{previewLaporan.nomorSppd}</strong> • Tujuan: {previewLaporan.daerahTujuan}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdfLaporan}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Unduh PDF Laporan</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintLaporan}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak</span>
                </button>
              </div>
            </div>

            {/* Printable Paper Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
              <div
                ref={printLaporanRef}
                className="bg-white shadow-xl rounded-sm border border-slate-300"
                style={{
                  width: '740px',
                  minHeight: '940px',
                  padding: '25px 35px',
                  color: '#000000',
                  fontFamily: 'Arial, sans-serif',
                  boxSizing: 'border-box',
                }}
              >
                {/* Judul Laporan Perjalanan Dinas (Hanya tulisan LAPORAN PERJALANAN DINAS tanpa nomor sesuai permintaan) */}
                <div style={{ textAlign: 'center', marginBottom: '22px', marginTop: '6px' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '12pt',
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    LAPORAN PERJALANAN DINAS
                  </h3>
                </div>

                {/* Tabel 10 Poin Laporan */}
                <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse', lineHeight: '1.4' }}>
                  <tbody>
                    {/* 1. DASAR */}
                    <tr>
                      <td style={{ width: '4%', verticalAlign: 'top', padding: '5px 0' }}>1.</td>
                      <td style={{ width: '32%', verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Dasar
                      </td>
                      <td style={{ width: '3%', verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify' }}>
                        <div>{previewLaporan.dasarUtama}</div>
                        {previewLaporan.dasarTambahan && previewLaporan.dasarTambahan.length > 0 && (
                          <ol style={{ paddingLeft: '18px', marginTop: '4px' }}>
                            {previewLaporan.dasarTambahan.map((dt, idx) => (
                              <li key={idx}>{dt}</li>
                            ))}
                          </ol>
                        )}
                      </td>
                    </tr>

                    {/* 2. MAKSUD / TUJUAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>2.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Maksud / Tujuan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify' }}>
                        {previewLaporan.maksudTujuan}
                      </td>
                    </tr>

                    {/* 3. WAKTU PELAKSANAAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>3.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Waktu Pelaksanaan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>
                        {previewLaporan.waktuPelaksanaan}
                      </td>
                    </tr>

                    {/* 4. NAMA PETUGAS */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>4.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Nama Petugas
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>
                        {previewLaporan.petugas.map((p, idx) => (
                          <div key={idx} style={{ marginBottom: '2px' }}>
                            {idx + 1}. <strong>{p.nama}</strong> ({p.pangkat} / NIP. {p.nip})
                          </div>
                        ))}
                      </td>
                    </tr>

                    {/* 5. DAERAH / TUJUAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>5.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Daerah / Tujuan yang Dikunjungi
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', fontWeight: 'bold' }}>
                        {previewLaporan.daerahTujuan}
                      </td>
                    </tr>

                    {/* 6. HADIR DALAM PERTEMUAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>6.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Hadir Dalam Pertemuan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>
                        {previewLaporan.hadirPertemuan && previewLaporan.hadirPertemuan.length > 0 ? (
                          previewLaporan.hadirPertemuan.map((h, idx) => (
                            <div key={idx} style={{ marginBottom: '2px' }}>
                              {idx + 1}. {h.nama} {h.jabatanInstansi ? `(${h.jabatanInstansi})` : ''}
                            </div>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>

                    {/* 7. PETUNJUK / ARAHAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>7.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Petunjuk / Arahan yang Diberikan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                        {previewLaporan.petunjukArahan || '-'}
                      </td>
                    </tr>

                    {/* 8. MASALAH / TEMUAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>8.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Masalah / Temuan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                        {previewLaporan.masalahTemuan || '-'}
                      </td>
                    </tr>

                    {/* 9. SARAN TINDAKAN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>9.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Saran Tindakan
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                        {previewLaporan.saranTindakan || '-'}
                      </td>
                    </tr>

                    {/* 10. LAIN-LAIN */}
                    <tr>
                      <td style={{ verticalAlign: 'top', padding: '5px 0' }}>10.</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 'bold', padding: '5px 0' }}>
                        Lain - lain
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'center', padding: '5px 0' }}>:</td>
                      <td style={{ verticalAlign: 'top', padding: '5px 0', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                        {previewLaporan.lainLain || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bagian Tanda Tangan 1 Orang Petugas (Nama Pertama Sesuai Kwitansi) */}
                <div style={{ marginTop: '35px', fontSize: '9.5pt', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <div style={{ width: '280px', textAlign: 'left' }}>
                      <div>Lumajang, {formatTanggalIndo(previewLaporan.tanggalLaporan)}</div>
                      <div style={{ fontWeight: 'bold', marginTop: '2px' }}>
                        Petugas yang Melaksanakan Tugas :
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '280px' }}>
                      {previewLaporan.petugas[0] ? (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ height: '55px' }} />
                          <div>
                            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                              {previewLaporan.petugas[0].nama}
                            </div>
                            <div style={{ fontSize: '8.5pt' }}>
                              NIP. {previewLaporan.petugas[0].nip}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
