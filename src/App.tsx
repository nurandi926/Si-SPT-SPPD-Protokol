import React, { useState, useEffect, useMemo } from 'react';
import { SPTItem, UserSession, Pegawai, SpdStatus, OperatorAccount, PejabatConfig } from './types';
import { Header } from './components/Header';
import { SptForm } from './components/SptForm';
import { SptTable } from './components/SptTable';
import { LaporanPerjalananDinasView } from './components/LaporanPerjalananDinasView';
import { DaftarSptAktif } from './components/DaftarSptAktif';
import { BubuhiTandaTanganView } from './components/BubuhiTandaTanganView';
import { FinancialModal } from './components/FinancialModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { OperatorManagerModal } from './components/OperatorManagerModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { PejabatManagerModal } from './components/PejabatManagerModal';
import { ShareModal } from './components/ShareModal';
import { getStoredPejabatConfig, fetchServerMasterPegawai } from './utils/pejabatConfig';
import {
  formatTanggalIndo,
  getDeskripsiLengkapKwitansi,
  getKodeRekening,
} from './utils/formatters';
import {
  Lock,
  UserCheck,
  AlertCircle,
  PlusCircle,
  ClipboardList,
  FileSpreadsheet,
  Users,
  RefreshCw,
  CheckCircle2,
  PenTool,
} from 'lucide-react';
import {
  detectAndApplyUrlConfig,
  pullDataFromGoogleSheets,
  pushSingleSptToGoogleSheets,
  pushAllSptToGoogleSheets,
  executeResetTotalDatabase,
  getStoredWebhookUrl,
  fetchServerSyncConfig,
  saveServerSyncConfig,
} from './services/googleSheetsSync';

const DB_KEY = 'DATA_SPT_BIAYA_OFFICIAL_V7';
const OPERATORS_STORAGE_KEY = 'SPT_OPERATORS_ACCOUNT_V4';
const USER_SESSION_KEY = 'SPT_ACTIVE_USER_SESSION_V2';

// Nama operator resmi sesuai arahan:
// 1. ALFAN BAHTIAR (password: alfan123)
// 2. KURNIAWAN (password: kurniawan123)
// 3. UMI MAFTUKHAH (password: umi123)
// 4. ADMIN UTAMA (password: admin123)
const DEFAULT_OPERATOR_ACCOUNTS: OperatorAccount[] = [
  { id: 'op_alfan', nama: 'ALFAN BAHTIAR', sandi: 'alfan123', role: 'OPERATOR' },
  { id: 'op_kurniawan', nama: 'KURNIAWAN', sandi: 'kurniawan123', role: 'OPERATOR' },
  { id: 'op_umi', nama: 'UMI MAFTUKHAH', sandi: 'umi123', role: 'OPERATOR' },
  { id: 'op_admin', nama: 'ADMIN UTAMA', sandi: 'admin123', role: 'ADMINISTRATOR' },
];

// Daftar SPT dikosongkan agar nomor SPT dan SPD baru dimulai dari 001
const DUMMY_DATA_AWAL: SPTItem[] = [];

export default function App() {
  // Sesuai permintaan: Saat link web app diklik/dibuka, tidak langsung login ke akun admin, melainkan selalu ke menu login awal
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [operators, setOperators] = useState<OperatorAccount[]>(() => {
    try {
      const saved = localStorage.getItem(OPERATORS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse operators from storage:', e);
    }
    return DEFAULT_OPERATOR_ACCOUNTS;
  });

  // Tampilan login pilihan nama operator awal buka: default unselected ""
  const [loginOperator, setLoginOperator] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isOperatorManagerOpen, setIsOperatorManagerOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isPejabatManagerOpen, setIsPejabatManagerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pejabatConfig, setPejabatConfig] = useState<PejabatConfig>(() =>
    getStoredPejabatConfig()
  );

  const [daftarSpt, setDaftarSpt] = useState<SPTItem[]>([]);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasWebhook, setHasWebhook] = useState<boolean>(false);

  // Teks Pengumuman/Catatan Halaman Depan (Bisa diedit oleh Admin Utama)
  const [loginNoticeText, setLoginNoticeText] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('SPT_LOGIN_NOTICE_TEXT') ||
        'Selamat Datang di Sistem Informasi Surat Perintah Tugas & SPD Bagian Protokol dan Komunikasi Pimpinan Setda Kab. Lumajang.'
      );
    } catch {
      return 'Selamat Datang di Sistem Informasi Surat Perintah Tugas & SPD Bagian Protokol dan Komunikasi Pimpinan Setda Kab. Lumajang.';
    }
  });
  const [isEditNoticeModalOpen, setIsEditNoticeModalOpen] = useState<boolean>(false);
  const [noticeInput, setNoticeInput] = useState<string>('');

  // Dashboard 4 Nav Tabs:
  // 1. 'entry' = Entry SPT Baru
  // 2. 'laporan' = Laporan Perjalanan Dinas
  // 3. 'daftar-aktif' = Daftar SPT Aktif
  // 4. 'tanda-tangan' = Bubuhi Tanda Tangan
  const [navTab, setNavTab] = useState<'entry' | 'laporan' | 'daftar-aktif' | 'tanda-tangan'>('entry');

  // Modals state
  const [selectedSptForFinancial, setSelectedSptForFinancial] = useState<SPTItem | null>(null);
  const [selectedSptForDoc, setSelectedSptForDoc] = useState<SPTItem | null>(null);
  const [docInitialTab, setDocInitialTab] = useState<'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED'>('MERGED');

  // Pull latest data from Google Sheets automatically
  const refreshDataFromSheets = async (silent = false) => {
    let url = getStoredWebhookUrl();
    if (!url) {
      try {
        const serverConfig = await fetchServerSyncConfig();
        if (serverConfig?.webhookUrl) {
          url = serverConfig.webhookUrl;
          setHasWebhook(true);
        }
      } catch (e) {}
    }

    setIsAutoSyncing(true);
    try {
      const fetched = await pullDataFromGoogleSheets();
      if (fetched.success && Array.isArray(fetched.data)) {
        setDaftarSpt(fetched.data);
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(fetched.data));
        } catch (e) {}
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        if (url || getStoredWebhookUrl()) setHasWebhook(true);
      } else if (fetched.success) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        if (url || getStoredWebhookUrl()) setHasWebhook(true);
      }
    } catch (err) {
      console.error('Failed to auto-pull data from sheets:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Load initial data from localStorage and auto-sync across devices
  useEffect(() => {
    let isSubscribed = true;

    async function initDataAndSync() {
      // Pastikan sesi lama dibersihkan saat web dibuka dari link sehingga selalu masuk ke menu login awal
      try {
        localStorage.removeItem(USER_SESSION_KEY);
      } catch (e) {}

      // 1. Detect configuration from URL if transferred via share link (for "ganti perangkat")
      const detected = detectAndApplyUrlConfig();
      let activeUrl = detected.webhookUrl || getStoredWebhookUrl();

      // 2. Load cached local data first
      try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const normalized = parsed.map((item: any) => ({
            ...item,
            status: item.status || 'AKTIF',
            tanggalSpd: item.tanggalSpd || item.tanggalSpt,
            kelompokJabatan: item.kelompokJabatan || 'KASUBAG_STAF',
            jenisDinas: item.jenisDinas || 'DALAM_KOTA',
          }));
          if (isSubscribed) setDaftarSpt(normalized);
        } else {
          if (isSubscribed) setDaftarSpt(DUMMY_DATA_AWAL);
        }
      } catch (e) {
        console.error('Failed to load stored SPT data:', e);
      }

      // 3. Auto-fetch global config from backend server (so phone automatically gets laptop config & login notice!)
      try {
        const serverConfig = await fetchServerSyncConfig();
        if (serverConfig?.webhookUrl) {
          activeUrl = serverConfig.webhookUrl;
        }
        if (serverConfig?.loginNoticeText && isSubscribed) {
          setLoginNoticeText(serverConfig.loginNoticeText);
        }
      } catch (e) {
        console.warn('Could not contact server sync config:', e);
      }

      if (isSubscribed) {
        setHasWebhook(!!activeUrl);
      }

      // 4. Always attempt to refresh latest data from Google Sheets or shared backend
      await refreshDataFromSheets(true);

      // 5. Sync master pegawai terpusat agar data nama pegawai tersinkron antara operator & admin
      fetchServerMasterPegawai().catch(() => {});

      // 6. Sync akun operator terpusat agar pembaruan kata sandi tersinkron di semua perangkat
      fetch('/api/operators')
        .then((res) => res.json())
        .then((serverOps) => {
          if (Array.isArray(serverOps) && serverOps.length > 0 && isSubscribed) {
            setOperators(serverOps);
            try {
              localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(serverOps));
            } catch (e) {}
          }
        })
        .catch(() => {});
    }

    initDataAndSync();

    // 5. Periodic auto-sync every 25 seconds for multi-device live synchronization
    const intervalId = setInterval(() => {
      refreshDataFromSheets(true);
      fetchServerMasterPegawai().catch(() => {});
      fetch('/api/operators')
        .then((r) => r.json())
        .then((ops) => {
          if (Array.isArray(ops) && ops.length > 0 && isSubscribed) {
            setOperators(ops);
          }
        })
        .catch(() => {});
      fetchServerSyncConfig().then((cfg) => {
        if (cfg?.loginNoticeText && isSubscribed) {
          setLoginNoticeText(cfg.loginNoticeText);
        }
      }).catch(() => {});
    }, 10000);

    // 6. When switching tabs/apps on phone or laptop, immediately sync fresh data & announcement
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshDataFromSheets(true);
        fetchServerMasterPegawai().catch(() => {});
        fetch('/api/operators')
          .then((r) => r.json())
          .then((ops) => {
            if (Array.isArray(ops) && ops.length > 0 && isSubscribed) {
              setOperators(ops);
            }
          })
          .catch(() => {});
        fetchServerSyncConfig().then((cfg) => {
          if (cfg?.loginNoticeText && isSubscribed) {
            setLoginNoticeText(cfg.loginNoticeText);
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginOperator) {
      setLoginError('⚠️ Silakan pilih nama operator terlebih dahulu!');
      return;
    }

    const matched = operators.find((op) => op.nama === loginOperator);
    if (matched && loginPassword === matched.sandi) {
      const sessionUser: UserSession = {
        operator: matched.nama,
        role: matched.role,
      };
      setCurrentUser(sessionUser);
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
      } catch (e) {
        console.error('Failed to save session:', e);
      }
      setLoginPassword('');
      // Refresh latest data from Google Sheets upon login so any device gets newest changes
      refreshDataFromSheets(true);
    } else {
      setLoginError('❌ Kata sandi yang Anda masukkan keliru. Silakan coba kembali!');
    }
  };

  const handleSaveOperators = (
    newOperators: OperatorAccount[],
    nameChanges?: Record<string, string>
  ) => {
    setOperators(newOperators);
    try {
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(newOperators));
    } catch (e) {
      console.error('Failed to save operators:', e);
    }

    // If current logged in user had their name changed
    if (currentUser) {
      const matched = newOperators.find((o) => {
        if (nameChanges) {
          const oldName = Object.keys(nameChanges).find((k) => nameChanges[k] === o.nama);
          if (oldName === currentUser.operator) return true;
        }
        return o.nama === currentUser.operator;
      });

      if (matched && matched.nama !== currentUser.operator) {
        setCurrentUser({
          operator: matched.nama,
          role: matched.role,
        });
      }
    }

    // Update historical SPT records if operator was renamed
    if (nameChanges && Object.keys(nameChanges).length > 0) {
      setDaftarSpt((prev) => {
        const updated = prev.map((item) => {
          if (nameChanges[item.operator]) {
            return {
              ...item,
              operator: nameChanges[item.operator],
            };
          }
          return item;
        });
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to update SPT operator names:', err);
        }
        return updated;
      });
    }

    // Simpan ke database server terpusat
    fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOperators),
    }).catch(() => {});
  };

  // Fitur untuk setiap operator mengganti kata sandi mereka sendiri
  const handleUpdateOperatorPassword = (operatorName: string, newPass: string) => {
    const updated = operators.map((op) => {
      if (op.nama.trim().toLowerCase() === operatorName.trim().toLowerCase()) {
        return { ...op, sandi: newPass };
      }
      return op;
    });
    setOperators(updated);
    try {
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    // Simpan ke database server terpusat agar langsung berlaku di semua perangkat
    fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleResetDefaultOperators = () => {
    setOperators(DEFAULT_OPERATOR_ACCOUNTS);
    try {
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(DEFAULT_OPERATOR_ACCOUNTS));
    } catch (e) {}
    fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_OPERATOR_ACCOUNTS),
    }).catch(() => {});
    setLoginOperator('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (e) {}
    setLoginPassword('');
    setLoginError(null);
    setLoginOperator('');
  };

  const handleClearAllSpt = async () => {
    const isUserAdmin = currentUser?.role === 'ADMINISTRATOR';
    const confirmMessage = isUserAdmin
      ? '⚠️ KONFIRMASI RESET TOTAL DATABASE:\n\nApakah Anda yakin ingin MERESET TOTAL database SPT?\n\nSemua riwayat entri (termasuk data lama / tak dikenal di akun operator) akan dibersihkan total dari:\n1. Server backend database terpusat\n2. Seluruh akun operator (Kurniawan, Alfan, Umi, Admin)\n3. Penyimpanan lokal browser\n4. Baris data di Google Sheets\n\nPenomoran SPT dan SPD akan dimulai bersih kembali dari 001.'
      : '⚠️ KONFIRMASI BERSIHKAN DATA SPT:\n\nApakah Anda ingin membersihkan data riwayat SPT dan mengosongkan inputan yang tidak dikenal?\n\nData akan dibersihkan dari server dan perangkat agar inputan Anda bersih dimulai dari awal (001).';

    if (window.confirm(confirmMessage)) {
      setIsAutoSyncing(true);
      const res = await executeResetTotalDatabase();
      setDaftarSpt([]);
      setIsAutoSyncing(false);
      alert('✅ ' + res.message + '\n\nSeluruh data telah bersih dan penomoran SPT/SPD dimulai dari 001.');
    }
  };

  const handleSaveSpt = (newSpt: SPTItem) => {
    const sptWithStatus: SPTItem = {
      ...newSpt,
      operator: currentUser?.operator || newSpt.operator || 'ADMIN UTAMA',
      status: 'AKTIF',
    };
    const updated = [
      sptWithStatus,
      ...daftarSpt.filter(
        (s) =>
          s.nomorSppd !== sptWithStatus.nomorSppd &&
          (s.idPerjalanan !== sptWithStatus.idPerjalanan || s.operator !== sptWithStatus.operator)
      ),
    ];
    setDaftarSpt(updated);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist to localStorage:', err);
    }

    // Simpan langsung ke database server (/api/spt) dengan rincian nama pegawai, NIP, pangkat, dan operator lengkap
    fetch('/api/spt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sptWithStatus),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setDaftarSpt(res.data);
          try {
            localStorage.setItem(DB_KEY, JSON.stringify(res.data));
          } catch (e) {}
        }
      })
      .catch((err) => console.warn('Could not post to /api/spt:', err));

    // Real-Time Google Sheets Auto-Sync (Two-Way): Langsung catat ke Google Sheets tanpa perlu singkronisasi manual
    pushSingleSptToGoogleSheets(sptWithStatus).then((ok) => {
      if (ok) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    });
  };

  const handleUpdateBiaya = (nomorSppd: string, updatedTim: Pegawai[]) => {
    const updated = daftarSpt.map((item) => {
      if (item.nomorSppd === nomorSppd) {
        return {
          ...item,
          tim: updatedTim,
        };
      }
      return item;
    });

    setDaftarSpt(updated);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist financial update:', err);
    }

    // Auto-sync updated costs to Google Sheets
    pushAllSptToGoogleSheets(updated).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    });
  };

  const handleToggleStatus = (nomorSppd: string, newStatus: SpdStatus, alasan?: string) => {
    const updated = daftarSpt.map((item) => {
      if (item.nomorSppd === nomorSppd) {
        return {
          ...item,
          status: newStatus,
          alasanBatal: newStatus === 'BATAL' ? (alasan || 'Dibatalkan oleh operator') : undefined,
          tanggalBatal: newStatus === 'BATAL' ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return item;
    });

    setDaftarSpt(updated);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist status change:', err);
    }

    // Auto-sync status changes to Google Sheets
    pushAllSptToGoogleSheets(updated).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    });
  };

  const handleDeleteSpt = (nomorSppd: string) => {
    const updated = daftarSpt.filter((item) => item.nomorSppd !== nomorSppd);
    setDaftarSpt(updated);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist deletion:', err);
    }

    // Auto-sync deletion to Google Sheets
    pushAllSptToGoogleSheets(updated).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    });
  };

  const handleOpenDocument = (
    spt: SPTItem,
    docType: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED' = 'MERGED'
  ) => {
    setSelectedSptForDoc(spt);
    setDocInitialTab(docType);
  };

  const isAdmin = currentUser?.role === 'ADMINISTRATOR';

  // Visible SPTs: Sesuai penyesuaian:
  // Admin Utama dapat melihat seluruh berkas.
  // Operator HANYA melihat berkas yang diinput oleh akunnya sendiri.
  const visibleSptList = useMemo(() => {
    if (isAdmin) return daftarSpt;
    const opName = (currentUser?.operator || '').trim().toLowerCase();
    return daftarSpt.filter(
      (s) => s.operator && s.operator.trim().toLowerCase() === opName
    );
  }, [daftarSpt, isAdmin, currentUser]);

  const countAktif = visibleSptList.filter((s) => s.status !== 'BATAL').length;
  const countBatal = visibleSptList.filter((s) => s.status === 'BATAL').length;

  // 1. TAMPILAN LOGIN SCREEN JIKA BELUM LOGIN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-6">
            {/* Logo Resmi Kabupaten Lumajang */}
            <div className="w-24 h-24 mx-auto mb-3 bg-white rounded-2xl p-2 shadow-lg border border-slate-200 flex items-center justify-center">
              <img
                src="/assets/aistudio/Seal_of_Lumajang_Regency.svg_23617579.png"
                alt="Logo Kabupaten Lumajang"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-black text-blue-900 tracking-tight">SI-SPT</h2>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              Sistem Informasi Entri Surat Perintah Tugas & SPD
            </p>
            <p className="text-[11px] text-slate-400">
              Bagian Protokol & TU Pimpinan Setda Kab. Lumajang
            </p>

            {/* Kolom / Tempat Tulisan Tambahan yang Bisa Diedit oleh Admin Utama */}
            {loginNoticeText && (
              <div className="mt-3.5 px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed font-medium text-center shadow-2xs">
                {loginNoticeText}
              </div>
            )}
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Pilih Nama Operator / Penginput
              </label>
              <select
                value={loginOperator}
                onChange={(e) => setLoginOperator(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium cursor-pointer"
              >
                <option value="">-- Pilih Operator --</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.nama}>
                    {op.nama} ({op.role === 'ADMINISTRATOR' ? 'Administrator' : 'Operator'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                Kata Sandi (Password)
              </label>
              <input
                type="password"
                placeholder="Masukkan kata sandi akses..."
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Verifikasi & Masuk ke Sistem</span>
            </button>
          </form>

          {/* Footer Bersih (Tulisan Data Tersimpan Lokal Dihilangkan Sesuai Permintaan) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {hasWebhook ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-700 font-semibold">Google Sheets: Terhubung</span>
                </>
              ) : (
                <span className="text-slate-400">Pemerintah Kabupaten Lumajang</span>
              )}
            </div>
            <span className="text-slate-400 font-medium">Tahun Anggaran 2026</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. TAMPILAN DASHBOARD SISTEM SETELAH LOGIN
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        user={currentUser}
        onLogout={handleLogout}
        onOpenOperatorManager={() => setIsOperatorManagerOpen(true)}
        onOpenPejabatManager={() => setIsPejabatManagerOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col">
        {/* NAVIGASI 3 MENU UTAMA DASBOR + GOOGLE SHEETS */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Menu: Entry SPT Baru (Formulir Kiri + Tabel Kanan) */}
            <button
              onClick={() => setNavTab('entry')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                navTab === 'entry'
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-blue-300" />
              <span>1. Entry SPT Baru</span>
            </button>

            {/* 2. Menu: Laporan Perjalanan Dinas (10 Poin Terstruktur) */}
            <button
              onClick={() => setNavTab('laporan')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                navTab === 'laporan'
                  ? 'bg-indigo-700 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-indigo-300" />
              <span>2. Laporan Perjalanan Dinas</span>
            </button>

            {/* 3. Menu: Daftar SPT Aktif (Informasi Perjalanan, Total Biaya, Download Excel) */}
            <button
              onClick={() => setNavTab('daftar-aktif')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                navTab === 'daftar-aktif'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>3. Daftar SPT Aktif</span>

              {/* Badges Jumlah */}
              <div className="flex items-center gap-1 ml-1.5">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    navTab === 'daftar-aktif'
                      ? 'bg-emerald-900 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {countAktif} Aktif
                </span>
                {countBatal > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      navTab === 'daftar-aktif'
                        ? 'bg-rose-900 text-white'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {countBatal} Batal
                  </span>
                )}
              </div>
            </button>

            {/* 4. Menu: Bubuhi Tanda Tangan (Pengesahan Elektronik & Stempel) */}
            <button
              onClick={() => setNavTab('tanda-tangan')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                navTab === 'tanda-tangan'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-4 h-4 text-purple-300" />
              <span>4. Bubuhi Tanda Tangan</span>
            </button>
          </div>

          {/* Status Sinkronisasi Real-Time Google Sheets & Tombol Aksi Admin */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasWebhook ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden sm:inline">Google Sheets:</span> Terhubung
                {lastSyncTime && (
                  <span className="text-[11px] text-emerald-600 font-normal hidden md:inline">
                    ({lastSyncTime})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => refreshDataFromSheets(false)}
                  disabled={isAutoSyncing}
                  className="p-1 hover:bg-emerald-200 text-emerald-800 rounded-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  title="Segarkan data dari Google Sheets sekarang"
                >
                  <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] hidden sm:inline">{isAutoSyncing ? 'Memuat...' : 'Segarkan'}</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Google Sheets: Belum Terhubung</span>
              </div>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setNoticeInput(loginNoticeText);
                    setIsEditNoticeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs font-semibold rounded-xl border border-slate-300 hover:border-blue-300 transition cursor-pointer"
                  title="Ubah teks pengumuman/catatan di halaman login depan (Khusus Akun Admin Utama)"
                >
                  <span>✏️</span>
                  <span className="hidden sm:inline">Edit Teks Depan</span>
                  <span className="sm:hidden">Teks Depan</span>
                </button>

                <button
                  onClick={handleClearAllSpt}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold rounded-xl border border-rose-300 transition cursor-pointer shadow-2xs"
                  title="Reset total seluruh database (SPT & Pegawai) dan bersihkan semua data lama agar mulai bersih dari 001"
                >
                  <span>🗑️</span>
                  <span className="hidden sm:inline">Reset Total Database (Mulai 001 Bersih)</span>
                  <span className="sm:hidden">Reset 001</span>
                </button>

                <button
                  onClick={() => setIsGoogleSheetsOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
                  title="Sinkronisasi & Akses Real-Time ke Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Sinkron Google Sheet (Real-Time)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1. KONTEN MENU 1: ENTRY SPT BARU (KIRI FORMULIR, KANAN TABEL LENGKAP) */}
        {navTab === 'entry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 animate-in fade-in duration-150">
            {/* Kolom Kiri: Formulir Entri Data SPT Baru */}
            <div className="lg:col-span-5 w-full">
              <SptForm
                daftarSpt={daftarSpt}
                currentOperator={currentUser.operator}
                isAdmin={isAdmin}
                onSaveSpt={handleSaveSpt}
              />
            </div>

            {/* Kolom Kanan: Tabel Riwayat Lengkap */}
            <div className="lg:col-span-7 w-full flex flex-col">
              <SptTable
                daftarSpt={daftarSpt}
                userRole={currentUser.role}
                currentOperator={currentUser.operator}
                onOpenFinancial={(spt) => setSelectedSptForFinancial(spt)}
                onOpenDocument={(spt, docType) => handleOpenDocument(spt, docType)}
                onDeleteSpt={handleDeleteSpt}
                onToggleStatus={handleToggleStatus}
                initialStatusFilter="ALL"
              />
            </div>
          </div>
        )}

        {/* 2. KONTEN MENU 2: LAPORAN PERJALANAN DINAS (10 POIN TERSTRUKTUR & CETAK PDF) */}
        {navTab === 'laporan' && (
          <div className="w-full animate-in fade-in duration-150">
            <LaporanPerjalananDinasView
              daftarSpt={daftarSpt}
              userRole={currentUser.role}
              currentOperator={currentUser.operator}
            />
          </div>
        )}

        {/* 3. KONTEN MENU 3: DAFTAR SPT AKTIF (INFORMASI PERJALANAN, TOTAL BIAYA & DOWNLOAD EXCEL) */}
        {navTab === 'daftar-aktif' && (
          <div className="w-full animate-in fade-in duration-150">
            <DaftarSptAktif
              daftarSpt={daftarSpt}
              userRole={currentUser.role}
              currentOperator={currentUser.operator}
              onOpenFinancial={(spt) => setSelectedSptForFinancial(spt)}
              onOpenDocument={(spt, docType) => handleOpenDocument(spt, docType)}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        )}

        {/* 4. KONTEN MENU 4: BUBUHI TANDA TANGAN (PENGESAHAN DOKUMEN RESMI) */}
        {navTab === 'tanda-tangan' && (
          <div className="w-full animate-in fade-in duration-150">
            <BubuhiTandaTanganView
              daftarSpt={daftarSpt}
              userRole={currentUser.role}
              currentOperator={currentUser.operator}
              onOpenDocument={(spt, docType) => handleOpenDocument(spt, docType)}
            />
          </div>
        )}
      </main>

      {/* MODAL KELOLA BIAYA KEUANGAN */}
      <FinancialModal
        spt={selectedSptForFinancial}
        isOpen={selectedSptForFinancial !== null}
        onClose={() => setSelectedSptForFinancial(null)}
        onSave={handleUpdateBiaya}
      />

      {/* MODAL PRATINJAU & CETAK DOKUMEN (SPT + SPD + LAMPIRAN RINCIAN + KWITANSI FOLIO F4) */}
      <DocumentPreviewModal
        spt={selectedSptForDoc}
        initialDoc={docInitialTab}
        customPejabatConfig={pejabatConfig}
        onClose={() => setSelectedSptForDoc(null)}
      />

      {/* MODAL KELOLA NAMA OPERATOR & SANDI (KHUSUS ADMIN UTAMA) */}
      <OperatorManagerModal
        isOpen={isOperatorManagerOpen}
        onClose={() => setIsOperatorManagerOpen(false)}
        operators={operators}
        onSaveOperators={handleSaveOperators}
        onResetDefault={handleResetDefaultOperators}
        currentUser={currentUser}
        daftarSpt={daftarSpt}
      />

      {/* MODAL GANTI & PANTAU KATA SANDI (UNTUK SEMUA OPERATOR & ADMIN) */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        operators={operators}
        onUpdatePassword={handleUpdateOperatorPassword}
      />

      {/* MODAL PENGATURAN PEJABAT TTD, PPK, PPTK & BENDAHARA (KHUSUS ADMIN UTAMA SESUAI ARAHAN USER #5) */}
      <PejabatManagerModal
        isOpen={isPejabatManagerOpen}
        onClose={() => setIsPejabatManagerOpen(false)}
        onSave={(newCfg) => setPejabatConfig(newCfg)}
      />

      {/* MODAL INTEGRASI & SINKRONISASI REAL-TIME GOOGLE SHEETS */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => {
          setIsGoogleSheetsOpen(false);
          setHasWebhook(!!getStoredWebhookUrl());
        }}
        daftarSpt={daftarSpt}
        currentOperator={currentUser.operator}
        onPullSuccess={(newItems) => {
          setDaftarSpt(newItems);
          try {
            localStorage.setItem(DB_KEY, JSON.stringify(newItems));
          } catch (e) {}
          setHasWebhook(true);
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        }}
      />

      {/* MODAL BAGIKAN AKSES APLIKASI & INFO LOGIN OPERATOR */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        operators={operators}
      />

      {/* MODAL UBAH TEKS PENGUMUMAN HALAMAN DEPAN (KHUSUS ADMIN UTAMA) */}
      {isEditNoticeModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>✏️</span>
                <span>Ubah Teks Halaman Depan / Login</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditNoticeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Teks ini akan ditampilkan di bawah <strong>"Bagian Protokol & TU Pimpinan Setda Kab. Lumajang"</strong> pada halaman pembuka sebelum operator masuk ke sistem.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Teks / Pengumuman Halaman Depan:
                </label>
                <textarea
                  rows={4}
                  value={noticeInput}
                  onChange={(e) => setNoticeInput(e.target.value)}
                  placeholder="Masukkan kalimat atau pesan untuk ditampilkan di halaman depan..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs">
                <span className="font-bold text-blue-900 block mb-1">Pratinjau di Halaman Depan:</span>
                <p className="text-blue-950 font-medium italic">
                  {noticeInput.trim() || '(Tidak ada teks - kotak akan disembunyikan)'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditNoticeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cleaned = noticeInput.trim();
                  setLoginNoticeText(cleaned);
                  try {
                    localStorage.setItem('SPT_LOGIN_NOTICE_TEXT', cleaned);
                  } catch (e) {}
                  setIsEditNoticeModalOpen(false);
                  try {
                    await saveServerSyncConfig({ loginNoticeText: cleaned });
                  } catch (err) {
                    console.error('Failed to sync notice to server:', err);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
