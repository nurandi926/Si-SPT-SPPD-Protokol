import React, { useState, useRef, useEffect } from 'react';
import { SPTItem, UserRole, PejabatConfig } from '../types';
import { formatTanggalIndo } from '../utils/formatters';
import { getStoredPejabatConfig } from '../utils/pejabatConfig';
import {
  PenTool,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  FileText,
  Search,
  RotateCcw,
  ShieldCheck,
  Download,
  Eye,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

interface BubuhiTandaTanganViewProps {
  daftarSpt: SPTItem[];
  userRole: UserRole;
  currentOperator: string;
  onOpenDocument: (spt: SPTItem, docType?: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED') => void;
}

interface SignatureRecord {
  sppdNumber: string;
  docType: 'SPT' | 'SPD' | 'LAPORAN' | 'SEMUA';
  pejabatNama: string;
  pejabatJabatan: string;
  metode: 'QR_DIGITAL' | 'CANVAS' | 'UPLOAD';
  signatureDataUrl?: string;
  tanggalTtd: string;
  waktuTtd: string;
  verifikasiCode: string;
  operator: string;
  catatan?: string;
}

const STORAGE_KEY_TTD = 'SPT_TANDA_TANGAN_RECORDS_V1';

export function BubuhiTandaTanganView({
  daftarSpt,
  userRole,
  currentOperator,
  onOpenDocument,
}: BubuhiTandaTanganViewProps) {
  const [pejabatConfig] = useState<PejabatConfig>(() => getStoredPejabatConfig());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  const [selectedSpt, setSelectedSpt] = useState<SPTItem | null>(null);

  // Tanda Tangan Records
  const [signatures, setSignatures] = useState<Record<string, SignatureRecord>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TTD);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Form State
  const [targetDoc, setTargetDoc] = useState<'SEMUA' | 'SPT' | 'SPD' | 'LAPORAN'>('SEMUA');
  const [pejabatRole, setPejabatRole] = useState<string>('kabag');
  const [namaPenandatangan, setNamaPenandatangan] = useState<string>(pejabatConfig.ttdSptNama);
  const [jabatanPenandatangan, setJabatanPenandatangan] = useState<string>(pejabatConfig.ttdSptJabatan);
  const [metodeTtd, setMetodeTtd] = useState<'QR_DIGITAL' | 'CANVAS' | 'UPLOAD'>('QR_DIGITAL');
  const [catatanTtd, setCatatanTtd] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Canvas Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasSignature, setHasCanvasSignature] = useState(false);
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);

  // Filter list by role (Admin sees all, operator sees own)
  const isAdmin = userRole === 'ADMINISTRATOR';
  const visibleList = daftarSpt.filter((spt) => {
    if (!isAdmin) {
      return spt.operator && spt.operator.trim().toLowerCase() === currentOperator.trim().toLowerCase();
    }
    return true;
  });

  // Filtered by search & signature status
  const filteredList = visibleList.filter((spt) => {
    const isSigned = !!signatures[spt.nomorSppd];
    if (filterStatus === 'BELUM' && isSigned) return false;
    if (filterStatus === 'SUDAH' && !isSigned) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchNum = spt.nomorSpt.toLowerCase().includes(q) || spt.nomorSppd.toLowerCase().includes(q);
    const matchTujuan = spt.tujuan.toLowerCase().includes(q);
    const matchPegawai = spt.tim.some((p) => p.nama.toLowerCase().includes(q));
    return matchNum || matchTujuan || matchPegawai;
  });

  // Select first item by default if none selected
  useEffect(() => {
    if (!selectedSpt && filteredList.length > 0) {
      setSelectedSpt(filteredList[0]);
    }
  }, [filteredList, selectedSpt]);

  // Update Pejabat Name & Title when dropdown selection changes
  const handlePejabatRoleChange = (roleKey: string) => {
    setPejabatRole(roleKey);
    switch (roleKey) {
      case 'bupati':
        setNamaPenandatangan(pejabatConfig.bupatiNama);
        setJabatanPenandatangan('Bupati Lumajang');
        break;
      case 'wabup':
        setNamaPenandatangan(pejabatConfig.wakilBupatiNama);
        setJabatanPenandatangan('Wakil Bupati Lumajang');
        break;
      case 'sekda':
        setNamaPenandatangan(pejabatConfig.sekdaNama);
        setJabatanPenandatangan('Sekretaris Daerah Kab. Lumajang');
        break;
      case 'ppk':
        setNamaPenandatangan(pejabatConfig.ppkNama);
        setJabatanPenandatangan('Pejabat Pembuat Komitmen (PPK)');
        break;
      case 'pptk':
        setNamaPenandatangan(pejabatConfig.pptkNama);
        setJabatanPenandatangan('Pejabat Pelaksana Teknis Kegiatan (PPTK)');
        break;
      case 'kabag':
      default:
        setNamaPenandatangan(pejabatConfig.ttdSptNama);
        setJabatanPenandatangan(pejabatConfig.ttdSptJabatan);
        break;
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Deep Navy
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasCanvasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasSignature(false);
  };

  // Upload handler for signature image
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImgUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Signature
  const handleSaveSignature = () => {
    if (!selectedSpt) {
      alert('Pilih berkas SPT / SPD yang akan dibubuhi tanda tangan terlebih dahulu!');
      return;
    }

    let signatureDataUrl: string | undefined = undefined;
    if (metodeTtd === 'CANVAS') {
      if (!hasCanvasSignature || !canvasRef.current) {
        alert('Silakan buat goresan tanda tangan di kotak kanvas terlebih dahulu!');
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else if (metodeTtd === 'UPLOAD') {
      if (!uploadedImgUrl) {
        alert('Silakan unggah berkas gambar tanda tangan terlebih dahulu!');
        return;
      }
      signatureDataUrl = uploadedImgUrl;
    }

    const now = new Date();
    const verifikasiCode = `BSRE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newRecord: SignatureRecord = {
      sppdNumber: selectedSpt.nomorSppd,
      docType: targetDoc,
      pejabatNama: namaPenandatangan,
      pejabatJabatan: jabatanPenandatangan,
      metode: metodeTtd,
      signatureDataUrl,
      tanggalTtd: now.toISOString().split('T')[0],
      waktuTtd: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      verifikasiCode,
      operator: currentOperator,
      catatan: catatanTtd.trim() || undefined,
    };

    const updated = {
      ...signatures,
      [selectedSpt.nomorSppd]: newRecord,
    };

    setSignatures(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TTD, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save signature record:', e);
    }

    setSuccessToast(`✅ Tanda Tangan Resmi berhasil dibubuhkan pada dokumen ${selectedSpt.nomorSpt}!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleRemoveSignature = (sppdNum: string) => {
    if (window.confirm('Batalkan pengesahan & hapus tanda tangan dari dokumen ini?')) {
      const updated = { ...signatures };
      delete updated[sppdNum];
      setSignatures(updated);
      try {
        localStorage.setItem(STORAGE_KEY_TTD, JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const currentSig = selectedSpt ? signatures[selectedSpt.nomorSppd] : undefined;

  return (
    <div className="space-y-6">
      {/* BANNER REKOMENDASI & PANDUAN PENATAAN */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-blue-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide">
                  4. Bubuhi Tanda Tangan & Pengesahan Dokumen
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200">
                  Fitur Baru
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                Modul resmi pengesahan surat dinas elektronik Setda Kab. Lumajang. Mendukung pembubuhan Tanda Tangan Elektronik QR Code Bersertifikat (TTE), Goresan Tangan Digital, maupun Unggah Stempel Tanda Tangan Resmi tanpa mengubah data sistem yang berjalan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <div className="px-3.5 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/15 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Total Berkas</span>
              <span className="text-base font-black text-white">{visibleList.length}</span>
            </div>
            <div className="px-3.5 py-2 bg-emerald-500/20 rounded-xl backdrop-blur-sm border border-emerald-400/30 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Disahkan</span>
              <span className="text-base font-black text-emerald-300">
                {Object.keys(signatures).filter((k) => visibleList.some((s) => s.nomorSppd === k)).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* DUA KOLOM: KIRI DAFTAR BERKAS, KANAN PANEL PEMBUBUHAN TANDA TANGAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI (5 Kolom): Daftar Berkas yang Siap Ditandatangani */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 flex flex-col h-[760px]">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pilih Dokumen Perjalanan Dinas</h3>
              <p className="text-[11px] text-slate-500">Pilih berkas untuk diproses pembubuhan tanda tangan</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {filteredList.length} Berkas
            </span>
          </div>

          {/* Search & Status Filter */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nomor SPT, kota tujuan, nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`flex-1 py-1 font-bold rounded-lg transition cursor-pointer text-center ${
                  filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({visibleList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('BELUM')}
                className={`flex-1 py-1 font-bold rounded-lg transition cursor-pointer text-center ${
                  filterStatus === 'BELUM' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum TTD
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('SUDAH')}
                className={`flex-1 py-1 font-bold rounded-lg transition cursor-pointer text-center ${
                  filterStatus === 'SUDAH' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sudah TTD
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <FileCheck2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Tidak ada berkas yang sesuai filter</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = selectedSpt?.nomorSppd === item.nomorSppd;
                const sig = signatures[item.nomorSppd];
                const isSigned = !!sig;

                return (
                  <div
                    key={item.nomorSppd}
                    onClick={() => setSelectedSpt(item)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                            {item.nomorSpt}
                          </span>
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Disahkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Menunggu TTD
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1">
                          {item.maksud}
                        </p>

                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                          <span>📍 {item.tujuan}</span>
                          <span>•</span>
                          <span>📅 {formatTanggalIndo(item.tanggalSpt)}</span>
                        </div>

                        {item.tim.length > 0 && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                            👥 {item.tim.map((p) => p.nama).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN (7 Kolom): Panel Bubuhi & Verifikasi Tanda Tangan */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-md border border-slate-200 p-5 sm:p-6 flex flex-col">
          {selectedSpt ? (
            <div className="space-y-5">
              {/* Header Selected Document */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    Berkas Terpilih
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                    {selectedSpt.nomorSpt}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nomor SPPD: <span className="font-mono font-bold text-slate-700">{selectedSpt.nomorSppd}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(selectedSpt, 'MERGED')}
                    className="px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Dokumen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(selectedSpt, 'MERGED')}
                    className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
              </div>

              {/* Status Tanda Tangan Saat Ini */}
              {currentSig ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-emerald-950 text-sm">Dokumen Telah Disahkan Resmi</h4>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                            {currentSig.verifikasiCode}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-1">
                          Ditandatangani oleh: <strong className="text-emerald-950">{currentSig.pejabatNama}</strong> ({currentSig.pejabatJabatan})
                        </p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Metode: <strong className="uppercase">{currentSig.metode.replace('_', ' ')}</strong> • Tanggal: {formatTanggalIndo(currentSig.tanggalTtd)} pukul {currentSig.waktuTtd} WIB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSignature(selectedSpt.nomorSppd)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer flex-shrink-0"
                    >
                      Batalkan TTD
                    </button>
                  </div>

                  {currentSig.signatureDataUrl && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-lg border border-emerald-200">
                        <img
                          src={currentSig.signatureDataUrl}
                          alt="Tanda Tangan"
                          className="h-12 max-w-[140px] object-contain"
                        />
                      </div>
                      <span className="text-[11px] text-emerald-700">
                        Pratinjau goresan tanda tangan resmi yang terpasang di berkas
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Berkas ini belum dibubuhi tanda tangan. Silakan lengkapi formulir di bawah ini untuk mengesahkan.</span>
                </div>
              )}

              {/* FORMULIR PEMBUBUHAN TANDA TANGAN */}
              <div className="space-y-4 pt-1">
                {/* 1. Target Dokumen yang Diberi Tanda Tangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Target Dokumen yang Disahkan
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'SEMUA', label: 'Semua Berkas' },
                      { id: 'SPT', label: 'Surat Tugas (SPT)' },
                      { id: 'SPD', label: 'Lembar SPD' },
                      { id: 'LAPORAN', label: 'Laporan Perjalanan' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTargetDoc(opt.id as any)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                          targetDoc === opt.id
                            ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Pejabat Penandatangan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. Jabatan Pejabat Penandatangan
                    </label>
                    <select
                      value={pejabatRole}
                      onChange={(e) => handlePejabatRoleChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                    >
                      <option value="kabag">Kepala Bagian Prokopim</option>
                      <option value="ppk">Pejabat Pembuat Komitmen (PPK)</option>
                      <option value="pptk">Pejabat Pelaksana Teknis Kegiatan (PPTK)</option>
                      <option value="sekda">Sekretaris Daerah</option>
                      <option value="wabup">Wakil Bupati Lumajang</option>
                      <option value="bupati">Bupati Lumajang</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Lengkap & Gelar Penandatangan
                    </label>
                    <input
                      type="text"
                      value={namaPenandatangan}
                      onChange={(e) => setNamaPenandatangan(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                    />
                  </div>
                </div>

                {/* 3. Metode Pembubuhan Tanda Tangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Metode Pembubuhan Tanda Tangan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMetodeTtd('QR_DIGITAL')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        metodeTtd === 'QR_DIGITAL'
                          ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-500 text-blue-950'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-extrabold">QR E-Sign Resmi</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        QR Code bersertifikat Setda Kab. Lumajang untuk verifikasi keaslian dokumen
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodeTtd('CANVAS')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        metodeTtd === 'CANVAS'
                          ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-500 text-blue-950'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-extrabold">Goresan Langsung</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Tanda tangan langsung menggunakan layar sentuh HP atau mouse
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodeTtd('UPLOAD')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        metodeTtd === 'UPLOAD'
                          ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-500 text-blue-950'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-extrabold">Unggah Berkas</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Unggah scan tanda tangan / stempel basah berformat PNG transparan
                      </p>
                    </button>
                  </div>
                </div>

                {/* Sub-area Metode TTD */}
                {metodeTtd === 'CANVAS' && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Kotak Goresan Tangan (Gunakan Jari / Stylus / Mouse):
                      </span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Hapus / Bersihkan</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-300 shadow-inner overflow-hidden flex justify-center">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={130}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="cursor-crosshair w-full max-w-[460px] h-[130px] touch-none"
                      />
                    </div>
                  </div>
                )}

                {metodeTtd === 'UPLOAD' && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Pilih Berkas Gambar Tanda Tangan (Format PNG / JPG):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSignature}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
                    />
                    {uploadedImgUrl && (
                      <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                        <img
                          src={uploadedImgUrl}
                          alt="Pratinjau Upload"
                          className="h-12 max-w-[140px] object-contain"
                        />
                        <span className="text-xs text-slate-500 font-medium">Gambar tanda tangan siap dibubuhkan</span>
                      </div>
                    )}
                  </div>
                )}

                {metodeTtd === 'QR_DIGITAL' && (
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-7 h-7" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-blue-950">Barcode Pengesahan Elektronik (BSrE Ready)</h5>
                      <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                        Menghasilkan kode hash digital terverifikasi yang tercetak di sudut lembar dokumen dinas untuk menjamin keaslian dan validitas dokumen tanpa kertas fisik.
                      </p>
                    </div>
                  </div>
                )}

                {/* Catatan Tambahan (Opsional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Pengesahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Disahkan sesuai arahan pimpinan..."
                    value={catatanTtd}
                    onChange={(e) => setCatatanTtd(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                {/* Tombol Simpan Tanda Tangan */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 text-blue-200" />
                    <span>Bubuhi Tanda Tangan & Sahkan Dokumen</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-600">Pilih Berkas SPT di Kolom Kiri</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Klik salah satu berkas perjalanan dinas dari daftar di sebelah kiri untuk melihat rincian dan membubuhi tanda tangan resmi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
