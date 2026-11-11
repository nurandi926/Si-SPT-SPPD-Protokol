import React, { useState, useEffect } from 'react';
import { KelompokJabatan, Pegawai, SPTItem, MasterPegawai, LABEL_KELOMPOK_JABATAN } from '../types';
import { Plus, Trash2, CheckCircle2, ArrowRight, BookmarkCheck, UserPlus, Star, RotateCcw, Users } from 'lucide-react';
import { MasterPegawaiManagerModal } from './MasterPegawaiManagerModal';
import {
  getStoredMasterPegawai,
  saveStoredMasterPegawai,
  fetchServerMasterPegawai,
  resetMasterPegawaiServer,
} from '../utils/pejabatConfig';

interface SptFormProps {
  daftarSpt: SPTItem[];
  currentOperator: string;
  isAdmin?: boolean;
  onSaveSpt: (spt: SPTItem) => void;
}

export const SptForm: React.FC<SptFormProps> = ({
  daftarSpt,
  currentOperator,
  isAdmin = false,
  onSaveSpt,
}) => {
  const [idPerjalanan, setIdPerjalanan] = useState('ST-001');
  const [linkFolderDrive, setLinkFolderDrive] = useState(() => {
    try {
      return localStorage.getItem('SPT_DEFAULT_DRIVE_FOLDER_LINK') || '';
    } catch {
      return '';
    }
  });
  const [kelompokJabatan, setKelompokJabatan] = useState<KelompokJabatan>('KASUBAG_STAF');
  const [jenisDinas, setJenisDinas] = useState<'DALAM_KOTA' | 'BIASA'>('DALAM_KOTA');
  const [nomorSpt, setNomorSpt] = useState('');
  const [nomorSppd, setNomorSppd] = useState('');
  const [dasar, setDasar] = useState('Jadwal Kegiatan Bupati dan Wakil Bupati Lumajang');
  const [maksud, setMaksud] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [tanggalSpt, setTanggalSpt] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSpd, setTanggalSpd] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [masterSavedAlert, setMasterSavedAlert] = useState<string | null>(null);

  // Master Pegawai List State
  const [masterPegawaiList, setMasterPegawaiList] = useState<MasterPegawai[]>(() =>
    getStoredMasterPegawai()
  );
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Auto-sync master pegawai dari server backend (/api/pegawai) agar sinkron antara operator & admin
  useEffect(() => {
    fetchServerMasterPegawai().then((list) => {
      if (list && list.length > 0) {
        setMasterPegawaiList(list);
      }
    });

    const handleFocus = () => {
      fetchServerMasterPegawai().then((list) => {
        if (list && list.length > 0) {
          setMasterPegawaiList(list);
        }
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Initial single employee row
  const [tim, setTim] = useState<Pegawai[]>([
    {
      nip: '',
      nama: '',
      pangkat: '',
      jabatanPegawai: '',
      uangHarian: 0,
      penginapan: 0,
      transport: 0,
    },
  ]);

  // Helper to check if current kelompok jabatan uses format kosongan
  const isFormatKosongan = ['BUPATI', 'WAKIL_BUPATI', 'SEKRETARIS_DAERAH', 'ASISTEN_STAF_AHLI', 'KABAG'].includes(kelompokJabatan);

  // Generate official automatic numbering starting from 001
  useEffect(() => {
    // 1. Calculate nextCounterSpt for automated 3-digit groups (Kasubag & Staf)
    let maxSptNum = 0;
    daftarSpt.forEach((item) => {
      if (item.nomorSpt) {
        const match = item.nomorSpt.match(/\/\s*(\d{1,4})\s*\//);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSptNum) {
            maxSptNum = val;
          }
        }
      }
    });
    // Ketika daftar SPT kosong, nomor urut selalu dimulai dari '001'
    const nextCounterSpt = String(maxSptNum + 1).padStart(3, '0');

    // 2. SPPD numbering is ALWAYS continuous based on highest SPPD starting from 001
    let maxSppdNum = 0;
    daftarSpt.forEach((item) => {
      if (item.nomorSppd) {
        const match = item.nomorSppd.match(/\/\s*(\d{1,4})\s*\//);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSppdNum) {
            maxSppdNum = val;
          }
        }
      }
    });
    const nextCounterSppd = String(maxSppdNum + 1).padStart(3, '0');

    // Perbaikan #2 & #7: Format nomor SPPD dirubah menjadi 000.1.2.3/nomor automatis tiga digit/417.17/2026 (diawali 001)
    setNomorSppd(`000.1.2.3/${nextCounterSppd}/417.17/2026`);
    setIdPerjalanan(`ST-${nextCounterSpt}`);

    // Perbaikan #3 & #4 & #7: Format nomor SPT
    // 1. bupati : 800.1.11.1/   /427.1/2026 (nomor kosongan)
    // 2. wakil bupati : 800.1.11.1/   /427.1/2026 (nomor kosongan)
    // 3. sekretaris daerah : 800.1.11.1/   /427.1/2026 (nomor kosongan)
    // 4. asisten & staf ahli : 800.1.11.1/   /427.1/2026 (nomor kosongan)
    // 5. kabag : 800.1.11.1/   /427.17/2026 (nomor kosongan)
    // 6. kasubag & staf : 800.1.11.1/nomor automatis/427.17/2026 (diawali 001)
    if (kelompokJabatan === 'BUPATI') {
      setNomorSpt('800.1.11.1/   /427.1/2026');
    } else if (kelompokJabatan === 'WAKIL_BUPATI') {
      setNomorSpt('800.1.11.1/   /427.1/2026');
    } else if (kelompokJabatan === 'SEKRETARIS_DAERAH') {
      setNomorSpt('800.1.11.1/   /427.1/2026');
    } else if (kelompokJabatan === 'ASISTEN_STAF_AHLI') {
      setNomorSpt('800.1.11.1/   /427.1/2026');
    } else if (kelompokJabatan === 'KABAG') {
      setNomorSpt('800.1.11.1/   /427.17/2026');
    } else {
      // KASUBAG_STAF: 800.1.11.1/[nomor 3 digit]/427.17/2026
      setNomorSpt(`800.1.11.1/${nextCounterSpt}/427.17/2026`);
    }
  }, [kelompokJabatan, daftarSpt]);

  const handleAddPegawai = () => {
    setTim([
      ...tim,
      {
        nip: '',
        nama: '',
        pangkat: '',
        jabatanPegawai: '',
        uangHarian: 0,
        penginapan: 0,
        transport: 0,
      },
    ]);
  };

  const handleRemovePegawai = (index: number) => {
    if (tim.length > 1) {
      setTim(tim.filter((_, i) => i !== index));
    }
  };

  const handlePegawaiChange = (index: number, field: keyof Pegawai, value: string) => {
    const updated = [...tim];
    updated[index] = { ...updated[index], [field]: value };
    setTim(updated);
  };

  // Pilih pegawai dari daftar pegawai tersimpan (Master Pegawai)
  const handleSelectMasterPegawai = (index: number, master: MasterPegawai) => {
    const updated = [...tim];
    updated[index] = {
      ...updated[index],
      nip: master.nip,
      nama: master.nama,
      pangkat: master.pangkat,
      jabatanPegawai: master.jabatanPegawai,
    };
    setTim(updated);
  };

  // Simpan pegawai saat ini ke daftar Pegawai Tersimpan (Master Pegawai)
  const handleSaveToMaster = (pegawai: Pegawai) => {
    if (!pegawai.nama.trim()) {
      alert('Nama pegawai harus diisi terlebih dahulu untuk disimpan ke Pegawai Tersimpan!');
      return;
    }

    const existingIndex = masterPegawaiList.findIndex(
      (m) => m.nama.trim().toLowerCase() === pegawai.nama.trim().toLowerCase()
    );

    const newEntry: MasterPegawai = {
      id: existingIndex >= 0 ? masterPegawaiList[existingIndex].id : `peg_${Date.now()}`,
      nip: pegawai.nip.trim() || '-',
      nama: pegawai.nama.trim(),
      pangkat: pegawai.pangkat.trim() || '-',
      jabatanPegawai: pegawai.jabatanPegawai.trim() || '-',
    };

    let updatedList: MasterPegawai[];
    if (existingIndex >= 0) {
      updatedList = [...masterPegawaiList];
      updatedList[existingIndex] = newEntry;
    } else {
      updatedList = [newEntry, ...masterPegawaiList];
    }

    setMasterPegawaiList(updatedList);
    saveStoredMasterPegawai(updatedList);
    setMasterSavedAlert(`Pegawai "${newEntry.nama}" berhasil disimpan ke Daftar Pegawai Tersimpan!`);
    setTimeout(() => setMasterSavedAlert(null), 3000);
  };

  const handleResetMasterPegawai = async () => {
    if (window.confirm('Reset daftar pegawai tersimpan ke susunan resmi bawaan di semua akun dan perangkat?')) {
      const resetList = await resetMasterPegawaiServer();
      setMasterPegawaiList(resetList);
      setMasterSavedAlert('✅ Daftar Pegawai Tersimpan berhasil di-reset ke bawaan resmi di semua perangkat.');
      setTimeout(() => setMasterSavedAlert(null), 3500);
    }
  };

  const handleQuickDestination = (dest: string) => {
    setTujuan(dest);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!maksud.trim() || !tujuan.trim()) {
      alert('Harap lengkapi maksud tugas dan kota/tempat tujuan!');
      return;
    }

    const newSpt: SPTItem = {
      idPerjalanan: idPerjalanan.trim() || 'ST-001',
      nomorSpt,
      nomorSppd,
      dasar: dasar.trim(),
      maksud: maksud.trim(),
      tujuan: tujuan.trim(),
      tanggalSpt,
      tanggalSpd: tanggalSpd || tanggalSpt,
      tanggalMulai,
      tanggalSelesai,
      kelompokJabatan,
      jenisDinas,
      operator: currentOperator,
      linkFolderDrive: linkFolderDrive.trim(),
      status: 'AKTIF',
      tim: tim.map((p) => ({
        nip: p.nip.trim() || '-',
        nama: p.nama.trim(),
        pangkat: p.pangkat.trim() || '-',
        jabatanPegawai: p.jabatanPegawai.trim() || '-',
        uangHarian: 0,
        penginapan: 0,
        transport: 0,
      })),
    };

    onSaveSpt(newSpt);

    // Otomatis simpan seluruh nama pegawai yang diinput operator ke Master Pegawai terpusat
    // Sehingga otomatis tersimpan dan langsung bisa digunakan di akun admin & perangkat lain
    try {
      let currentMaster = [...masterPegawaiList];
      let hasChange = false;

      tim.forEach((p) => {
        const trimmedNama = p.nama.trim();
        if (trimmedNama) {
          const existIdx = currentMaster.findIndex(
            (m) => m.nama.trim().toLowerCase() === trimmedNama.toLowerCase()
          );
          const newPeg: MasterPegawai = {
            id: existIdx >= 0 ? currentMaster[existIdx].id : `peg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nip: p.nip.trim() || (existIdx >= 0 ? currentMaster[existIdx].nip : '-'),
            nama: trimmedNama,
            pangkat: p.pangkat.trim() || (existIdx >= 0 ? currentMaster[existIdx].pangkat : '-'),
            jabatanPegawai: p.jabatanPegawai.trim() || (existIdx >= 0 ? currentMaster[existIdx].jabatanPegawai : '-'),
          };

          if (existIdx >= 0) {
            currentMaster[existIdx] = newPeg;
          } else {
            currentMaster = [newPeg, ...currentMaster];
            hasChange = true;
          }
        }
      });

      if (hasChange || currentMaster.length !== masterPegawaiList.length) {
        setMasterPegawaiList(currentMaster);
        saveStoredMasterPegawai(currentMaster, true);
      }
    } catch (e) {
      console.warn('Failed to auto-save pegawai to master:', e);
    }

    // Reset Form
    setMaksud('');
    setTujuan('');
    setTim([
      {
        nip: '',
        nama: '',
        pangkat: '',
        jabatanPegawai: '',
        uangHarian: 0,
        penginapan: 0,
        transport: 0,
      },
    ]);

    setAlertSuccess(true);
    setTimeout(() => setAlertSuccess(false), 3500);
  };

  const popularDestinations = [
    'Senduro',
    'Pasrujambe',
    'Klakah',
    'Pronojiwo',
    'Tempursari',
    'Kedungjajang',
    'Surabaya',
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 sm:p-6">
      <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>📝</span> Entri SPT Baru
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
          Penomoran Otomatis Aktif
        </span>
      </div>

      {alertSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-lg flex items-center gap-2 font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Data SPT Berhasil Disimpan ke Sistem!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. KELOMPOK JABATAN (Opsi Baru) */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Kelompok Jabatan Pelaksana
          </label>
          <select
            value={kelompokJabatan}
            onChange={(e) => setKelompokJabatan(e.target.value as KelompokJabatan)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
          >
            <option value="BUPATI">{LABEL_KELOMPOK_JABATAN.BUPATI}</option>
            <option value="WAKIL_BUPATI">{LABEL_KELOMPOK_JABATAN.WAKIL_BUPATI}</option>
            <option value="SEKRETARIS_DAERAH">{LABEL_KELOMPOK_JABATAN.SEKRETARIS_DAERAH}</option>
            <option value="ASISTEN_STAF_AHLI">{LABEL_KELOMPOK_JABATAN.ASISTEN_STAF_AHLI}</option>
            <option value="KABAG">{LABEL_KELOMPOK_JABATAN.KABAG}</option>
            <option value="KASUBAG_STAF">{LABEL_KELOMPOK_JABATAN.KASUBAG_STAF}</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            * Nomor SPT and Nomor SPPD terisi otomatis melanjutkan urutan data sesuai kelompok penugasan.
          </p>
        </div>

        {/* 2. JENIS PERJALANAN DINAS (Dinas Dalam Kota vs Dinas Biasa) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Kategori Perjalanan Dinas :</span>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
              Kode Rekening : {jenisDinas === 'BIASA' ? '5.1.02.04.001.00001' : '5.1.02.04.001.00003'}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setJenisDinas('DALAM_KOTA')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                jenisDinas === 'DALAM_KOTA'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>🏙️ Dinas Dalam Kota</span>
            </button>
            <button
              type="button"
              onClick={() => setJenisDinas('BIASA')}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                jenisDinas === 'BIASA'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>🚗 Dinas Biasa</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {jenisDinas === 'DALAM_KOTA'
              ? 'Awalan Kwitansi: "Belanja Perjalanan Dinas Dalam Kota" • Kode Rekening: 5.1.02.04.001.00003'
              : 'Awalan Kwitansi: "Belanja Perjalanan Dinas Biasa" • Kode Rekening: 5.1.02.04.001.00001'}
          </p>
        </div>

        {/* Automatic Numbers with Group Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nomor SPT
              </label>
              {isFormatKosongan ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                  Format Kosongan
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  Otomatis 3 Digit
                </span>
              )}
            </div>
            <input
              type="text"
              value={nomorSpt}
              onChange={(e) => setNomorSpt(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-lg text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contoh: 800.1.11.1/   /427.1/2026"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {isFormatKosongan ? (
                <span>
                  💡 <strong>Format Kosongan</strong> (tengah spasi). Bila nomor resmi telah terbit, dapat diketik manual pada bagian tengah.
                </span>
              ) : (
                <span>
                  ✨ Nomor urut tengah (3 digit) terisi <strong>otomatis</strong> berurutan dari data sebelumnya.
                </span>
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nomor SPPD (Otomatis Semua)
              </label>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-300">
                Urut Otomatis
              </span>
            </div>
            <input
              type="text"
              value={nomorSppd}
              readOnly
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-slate-100 border border-slate-300 rounded-lg text-rose-700 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              📌 Nomor SPPD <strong>selalu urut otomatis</strong> bertambah, meskipun entri nomor SPT kosongan.
            </p>
          </div>
        </div>

        {/* Dasar Penugasan */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Dasar Penugasan
          </label>
          <textarea
            rows={2}
            value={dasar}
            onChange={(e) => setDasar(e.target.value)}
            placeholder="Contoh: Jadwal Kegiatan Bupati dan Wakil Bupati Lumajang"
            required
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dynamic Tim Pegawai Pelaksana */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Daftar Pegawai Pelaksana ({tim.length} Orang)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMasterModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition cursor-pointer shadow-2xs"
                title="Kelola dan hapus data pegawai yang tersimpan di sistem"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Kelola / Hapus Pegawai ({masterPegawaiList.length})</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetMasterPegawai}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                  title="Reset daftar pegawai tersimpan ke bawaan resmi di semua akun & perangkat"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Pegawai</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAddPegawai}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pegawai
              </button>
            </div>
          </div>

          {masterSavedAlert && (
            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-1.5 animate-in fade-in duration-200 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{masterSavedAlert}</span>
            </div>
          )}

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {tim.map((pegawai, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                  <span className="text-xs font-bold text-slate-700">
                    Pegawai Pelaksana #{index + 1}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Pilih dari Pegawai Tersimpan (Autocomplete / Dropdown) */}
                    <select
                      value=""
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) return;
                        const match = masterPegawaiList.find((m) => m.id === targetId);
                        if (match) {
                          handleSelectMasterPegawai(index, match);
                        }
                      }}
                      className="text-[11px] bg-white border border-blue-300 text-blue-900 font-medium rounded-md px-2 py-0.5 shadow-2xs cursor-pointer focus:ring-1 focus:ring-blue-500"
                      title="Pilih data pegawai yang telah tersimpan sebelumnya"
                    >
                      <option value="">📂 Pilih Pegawai Tersimpan ({masterPegawaiList.length})...</option>
                      {masterPegawaiList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama} — {m.jabatanPegawai || m.pangkat}
                        </option>
                      ))}
                    </select>

                    {/* Tombol Simpan ke Master Pegawai */}
                    <button
                      type="button"
                      onClick={() => handleSaveToMaster(pegawai)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 transition cursor-pointer"
                      title="Simpan nama, NIP, pangkat, dan jabatan pegawai ini ke daftar tersimpan"
                    >
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Simpan Pegawai</span>
                    </button>

                    {tim.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePegawai(index)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                        title="Hapus baris pegawai"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="NIP Pegawai"
                      value={pegawai.nip}
                      onChange={(e) => handlePegawaiChange(index, 'nip', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nama Lengkap & Gelar"
                      value={pegawai.nama}
                      onChange={(e) => handlePegawaiChange(index, 'nama', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pangkat / Golongan (contoh: Penata / III c)"
                      value={pegawai.pangkat}
                      onChange={(e) => handlePegawaiChange(index, 'pangkat', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Jabatan (contoh: Staf Protokol)"
                      value={pegawai.jabatanPegawai}
                      onChange={(e) => handlePegawaiChange(index, 'jabatanPegawai', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maksud Tugas */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Maksud / Perihal Tugas
          </label>
          <textarea
            rows={2}
            value={maksud}
            onChange={(e) => setMaksud(e.target.value)}
            placeholder='Contoh: mengatur dan mempersiapkan kehadiran Bupati dan Wakil Bupati Lumajang pada acara "Upacara Peringatan Hari Sumpah Pemuda ke-98 Tahun 2026"'
            required
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Kota / Tempat Tujuan */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Kota / Tempat Tujuan
          </label>
          <input
            type="text"
            value={tujuan}
            onChange={(e) => setTujuan(e.target.value)}
            placeholder="Contoh: Senduro"
            required
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">Pilihan Cepat:</span>
            {popularDestinations.map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => handleQuickDestination(dest)}
                className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
              >
                {dest}
              </button>
            ))}
          </div>
        </div>

        {/* TANGGAL SURAT PERINTAH TUGAS (SPT) */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Tanggal Surat Perintah Tugas (SPT)
          </label>
          <input
            type="date"
            value={tanggalSpt}
            onChange={(e) => setTanggalSpt(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* FITUR BARU: TANGGAL SURAT PERJALANAN DINAS (SPD) DIBALIKKAN DI BAWAH TANGGAL SPT */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Tanggal Surat Perjalanan Dinas (SPD)</span>
            <span className="text-[10px] text-blue-600 font-normal">* Muncul resmi di SPD & Kwitansi</span>
          </label>
          <input
            type="date"
            value={tanggalSpd}
            onChange={(e) => setTanggalSpd(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Tanggal penerbitan resmi lembaran Surat Perjalanan Dinas (SPD) dan Kwitansi pembayaran.
          </p>
        </div>

        {/* Tanggal Pelaksanaan Perjalanan Dinas */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Tanggal Pelaksanaan Perjalanan Dinas
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              required
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              required
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* INTEGRASI DATABASE GOOGLE SHEETS: Hanya ditampilkan pada akun Admin Utama sesuai permintaan user #3 */}
        {isAdmin && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span>📊</span> Kolom Integrasi Google Sheet
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded">
                Database SPT (Khusus Admin)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ID_Perjalanan
                </label>
                <input
                  type="text"
                  value={idPerjalanan}
                  onChange={(e) => setIdPerjalanan(e.target.value)}
                  placeholder="Contoh: ST-001"
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ID unik surat perjalanan dinas
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Link_Folder_Drive (Opsional)
                </label>
                <input
                  type="url"
                  value={linkFolderDrive}
                  onChange={(e) => setLinkFolderDrive(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tautan folder arsip Drive
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition duration-150 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>💾</span> Simpan & Masukkan ke Daftar SPT
        </button>
      </form>

      {/* Modal Kelola & Hapus Pegawai Tersimpan */}
      <MasterPegawaiManagerModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        masterPegawaiList={masterPegawaiList}
        onUpdateList={(newList) => setMasterPegawaiList(newList)}
      />
    </div>
  );
};
