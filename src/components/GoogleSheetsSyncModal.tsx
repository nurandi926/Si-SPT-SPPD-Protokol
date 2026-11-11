import React, { useState, useEffect } from 'react';
import { SPTItem } from '../types';
import {
  formatTanggalIndo,
  getDeskripsiLengkapKwitansi,
  getKodeRekening,
} from '../utils/formatters';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  createSpreadsheet,
  getSpreadsheetDetails,
  updateSheetValues,
  extractSpreadsheetId,
  SpreadsheetInfo,
} from '../services/googleSheets';
import { User } from 'firebase/auth';
import {
  fetchServerSyncConfig,
  saveServerSyncConfig,
} from '../services/googleSheetsSync';
import {
  FileSpreadsheet,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  Send,
  Sparkles,
  Link2,
  AlertCircle,
  HelpCircle,
  LogOut,
  CheckCircle2,
  FilePlus,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  daftarSpt: SPTItem[];
  currentOperator: string;
  onPullSuccess?: (items: SPTItem[]) => void;
}

const GS_CONFIG_KEY = 'SPT_GOOGLE_SHEETS_WEBHOOK_CONFIG_V1';
const GS_SPREADSHEET_ID_KEY = 'SPT_GOOGLE_SHEETS_SPREADSHEET_ID_V1';
const GS_SCHEMA_PREFERENCE_KEY = 'SPT_GS_SCHEMA_PREFERENCE_V1';
const GS_DEFAULT_DRIVE_KEY = 'SPT_DEFAULT_DRIVE_FOLDER_LINK';

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  daftarSpt,
  currentOperator,
  onPullSuccess,
}) => {
  // Schema format preference: 'USER_DATABASE' (6 kolom: ID_Perjalanan, ...) vs 'FULL_LUMAJANG' (11 kolom)
  const [selectedSchema, setSelectedSchema] = useState<'USER_DATABASE' | 'FULL_LUMAJANG'>(() => {
    try {
      return (localStorage.getItem(GS_SCHEMA_PREFERENCE_KEY) as any) || 'USER_DATABASE';
    } catch {
      return 'USER_DATABASE';
    }
  });

  const [defaultDriveLink, setDefaultDriveLink] = useState<string>(() => {
    try {
      return localStorage.getItem(GS_DEFAULT_DRIVE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(GS_CONFIG_KEY) || '';
    } catch {
      return '';
    }
  });

  // Google OAuth & Sheets API state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    try {
      return localStorage.getItem(GS_SPREADSHEET_ID_KEY) || '';
    } catch {
      return '';
    }
  });
  const [sheetDetails, setSheetDetails] = useState<SpreadsheetInfo | null>(null);

  // Sync & Action state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Simpan konfigurasi
  useEffect(() => {
    try {
      localStorage.setItem(GS_CONFIG_KEY, webhookUrl);
    } catch {}
  }, [webhookUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(GS_SPREADSHEET_ID_KEY, spreadsheetId);
    } catch {}
  }, [spreadsheetId]);

  useEffect(() => {
    try {
      localStorage.setItem(GS_SCHEMA_PREFERENCE_KEY, selectedSchema);
    } catch {}
  }, [selectedSchema]);

  useEffect(() => {
    try {
      localStorage.setItem(GS_DEFAULT_DRIVE_KEY, defaultDriveLink);
    } catch {}
  }, [defaultDriveLink]);

  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // Auto-load configuration from central server when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchServerSyncConfig()
      .then((cfg) => {
        if (cfg?.webhookUrl && !webhookUrl) {
          setWebhookUrl(cfg.webhookUrl);
        }
        if (cfg?.spreadsheetId && !spreadsheetId) {
          setSpreadsheetId(cfg.spreadsheetId);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSaveGlobalConfig = async () => {
    if (!webhookUrl.trim() && !spreadsheetId.trim()) {
      setErrorMessage('Silakan isi Webhook URL terlebih dahulu sebelum menyimpan!');
      return;
    }
    setIsSavingGlobal(true);
    setErrorMessage(null);
    try {
      await saveServerSyncConfig({
        webhookUrl: webhookUrl.trim(),
        spreadsheetId: spreadsheetId.trim(),
        autoSync: true,
      });
      setSyncStatus('✅ Berhasil disimpan ke Server! Semua HP, tablet, dan laptop operator akan otomatis terhubung.');
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err: any) {
      console.error('Failed to save global sync config:', err);
      setErrorMessage('Gagal menyimpan ke server: ' + err.message);
    } finally {
      setIsSavingGlobal(false);
    }
  };

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        setSyncStatus(`Berhasil login Google sebagai: ${result.user.displayName || result.user.email}`);
        setTimeout(() => setSyncStatus(null), 4000);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      let msg = err.message || 'Gagal login ke akun Google';
      if (err.code === 'auth/unauthorized-domain') {
        const currentHostname = window.location.hostname;
        msg = `Domain belum terdaftar di Firebase Authorized Domains (${currentHostname}). Silakan tambahkan '${currentHostname}' ke Firebase Console > Authentication > Settings > Authorized domains, atau gunakan metode Webhook / Salin 1-Klik di bawah.`;
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Jendela pop-up login Google diblokir oleh peramban (browser). Harap izinkan pop-up (Always allow pop-ups) pada peramban Anda lalu coba lagi.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Jendela login Google ditutup sebelum autentikasi selesai.';
      }
      setErrorMessage(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setAccessToken(null);
      setSheetDetails(null);
      setSyncStatus('Berhasil keluar dari akun Google');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Build rows data based on selected schema
  const buildSheetRows = (schema: 'USER_DATABASE' | 'FULL_LUMAJANG' = selectedSchema): any[][] => {
    if (schema === 'USER_DATABASE') {
      // Format Database Sesuai Spreadsheet Pengguna:
      // ID_Perjalanan,Tanggal_Pengajuan,Nama_Pegawai,Tujuan_Dinas,Nomor_ST,Link_Folder_Drive
      const headers = [
        'ID_Perjalanan',
        'Tanggal_Pengajuan',
        'Nama_Pegawai',
        'Tujuan_Dinas',
        'Nomor_ST',
        'Link_Folder_Drive',
      ];

      const dataRows = daftarSpt.map((spt, idx) => {
        const idPerjalanan = spt.idPerjalanan || `ST-${String(idx + 1).padStart(3, '0')}`;
        const tglPengajuan = spt.tanggalSpt || spt.tanggalMulai;
        const namaPegawai = spt.tim.map((p) => p.nama).filter(Boolean).join(', ') || '-';
        const tujuanDinas = spt.tujuan || '-';
        const nomorSt = spt.nomorSpt || '-';
        const linkDrive = spt.linkFolderDrive || defaultDriveLink || '-';

        return [
          idPerjalanan,
          tglPengajuan,
          namaPegawai,
          tujuanDinas,
          nomorSt,
          linkDrive,
        ];
      });

      return [headers, ...dataRows];
    } else {
      // Format Lengkap Akuntansi & Kwitansi Lumajang (11 Kolom)
      const headers = [
        'No',
        'Nomor SPT',
        'Nomor SPPD',
        'Tanggal Kegiatan',
        'Nama Petugas Utama',
        'Uraian Sesuai Kwitansi',
        'Total Nominal (Rp)',
        'Kategori Dinas',
        'Kode Rekening',
        'Operator Penginput',
        'Status Dokumen',
      ];

      const dataRows = daftarSpt.map((spt, idx) => {
        let total = 0;
        spt.tim.forEach((p) => {
          total +=
            (Number(p.uangHarian) || 0) +
            (Number(p.penginapan) || 0) +
            (Number(p.transport) || 0) +
            (Number(p.uangRepresentasi) || 0);
        });

        const uraian = getDeskripsiLengkapKwitansi(spt);
        const namaUtama = spt.tim[0] ? spt.tim[0].nama : '-';
        const tgl =
          spt.tanggalMulai === spt.tanggalSelesai
            ? formatTanggalIndo(spt.tanggalMulai)
            : `${formatTanggalIndo(spt.tanggalMulai)} s/d ${formatTanggalIndo(spt.tanggalSelesai)}`;
        const kategori = spt.jenisDinas === 'BIASA' ? 'Dinas Biasa' : 'Dinas Dalam Kota';
        const rekening = getKodeRekening(spt.jenisDinas);

        return [
          idx + 1,
          spt.nomorSpt,
          spt.nomorSppd,
          tgl,
          namaUtama,
          uraian,
          total,
          kategori,
          rekening,
          spt.operator,
          spt.status || 'AKTIF',
        ];
      });

      return [headers, ...dataRows];
    }
  };

  // Buat Spreadsheet Baru di Google Drive Akun
  const handleCreateNewSpreadsheet = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMessage('Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Buat Spreadsheet Baru di Google Drive',
      message: `Aplikasi akan membuat spreadsheet baru berjudul "Rekap SPT & SPD Prokopim Lumajang" di akun Google Anda (${googleUser?.email}) dan menyinkronkan ${daftarSpt.length} data. Lanjutkan?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const newSheet = await createSpreadsheet(
            'Rekap SPT & SPD Prokopim Lumajang',
            token
          );
          setSpreadsheetId(newSheet.id);
          setSheetDetails(newSheet);

          // Masukkan data awal
          const rows = buildSheetRows();
          await updateSheetValues(newSheet.id, 'Rekap SPT!A1', rows, token);

          setSyncStatus(
            `✅ Berhasil membuat Google Spreadsheet baru dan menyinkronkan ${daftarSpt.length} data perjalanan dinas!`
          );
        } catch (err: any) {
          console.error('Error creating spreadsheet:', err);
          setErrorMessage(err.message || 'Gagal membuat Google Spreadsheet');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Sinkronkan Data ke Spreadsheet yang Sudah Tertaut
  const handleSyncToLinkedSpreadsheet = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMessage('Silakan login dengan Google terlebih dahulu.');
      return;
    }

    const cleanId = extractSpreadsheetId(spreadsheetId);
    if (!cleanId) {
      setErrorMessage('Silakan masukkan Link atau ID Spreadsheet Google terlebih dahulu.');
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Konfirmasi Sinkronisasi Google Sheets',
      message: `Aplikasi akan memperbarui spreadsheet dengan ${daftarSpt.length} data perjalanan dinas terbaru dari operator. Tindakan ini akan memperbarui baris data pada sheet. Lanjutkan?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          // Ambil detail sheet dulu untuk memastikan sheet tab yang dituju
          const details = await getSpreadsheetDetails(cleanId, token);
          setSheetDetails(details);

          const targetTab = details.sheetNames[0] || 'Sheet1';
          const rows = buildSheetRows();
          await updateSheetValues(cleanId, `${targetTab}!A1`, rows, token);

          setSyncStatus(
            `✅ Berhasil menyinkronkan ${daftarSpt.length} data ke sheet "${details.title}"!`
          );
          setTimeout(() => setSyncStatus(null), 5000);
        } catch (err: any) {
          console.error('Sync error:', err);
          setErrorMessage(err.message || 'Gagal menyinkronkan ke Google Sheets');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Format data for direct copy-paste to Google Sheets
  const generateTsvData = () => {
    const rows = buildSheetRows();
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            return str.includes('\t') || str.includes('\n') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join('\t')
      )
      .join('\n');
  };

  const handleCopyDataForSheets = () => {
    const tsv = generateTsvData();
    navigator.clipboard.writeText(tsv);
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 3000);
  };

  const handleCopyScript = () => {
    let script = '';
    if (selectedSchema === 'USER_DATABASE') {
      script = `// ==========================================
// KODE RESMI GOOGLE APPS SCRIPT DUA ARAH (TWO-WAY SYNC)
// Format 6 Kolom: ID_Perjalanan, Tanggal_Pengajuan, Nama_Pegawai, Tujuan_Dinas, Nomor_ST, Link_Folder_Drive
// Tempelkan di: Google Sheets -> Ekstensi -> Apps Script
// Kemudian Deploy -> Web App (Akses: Anyone / Siapa saja)
// ==========================================

// 1. GET: Dipanggil otomatis saat aplikasi web dibuka di perangkat mana pun (HP / Komputer)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var results = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      results.push(item);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: results.length,
      data: results
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. POST: Dipanggil otomatis saat operator/admin menginput atau memperbarui data
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Jika baris pertama masih kosong, buat Header resmi
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID_Perjalanan",
        "Tanggal_Pengajuan",
        "Nama_Pegawai",
        "Tujuan_Dinas",
        "Nomor_ST",
        "Link_Folder_Drive"
      ]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#dbeafe");
    }
    
    var data = JSON.parse(e.postData.contents);
    var list = [];
    
    if (data.action === "sync_all" && Array.isArray(data.items)) {
      // Sinkronisasi total tanpa duplikasi baris
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
      }
      list = data.items;
      list.forEach(function(item) {
        sheet.appendRow([
          item.idPerjalanan || "",
          item.tanggalPengajuan || item.tanggalSpt || "",
          item.namaPegawai || item.namaUtama || "",
          item.tujuanDinas || item.tujuan || "",
          item.nomorSt || item.nomorSpt || "",
          item.linkFolderDrive || "-"
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "sync_all", count: list.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Single / Multiple Upsert (Cek apakah ID_Perjalanan sudah ada agar tidak dobel)
    var itemsToUpsert = Array.isArray(data) ? data : [data];
    var allData = sheet.getDataRange().getValues();
    
    itemsToUpsert.forEach(function(item) {
      var idTarget = item.idPerjalanan || "";
      var stTarget = item.nomorSt || item.nomorSpt || "";
      var foundRow = -1;
      
      for (var r = 1; r < allData.length; r++) {
        if ((idTarget && allData[r][0] == idTarget) || (stTarget && allData[r][4] == stTarget)) {
          foundRow = r + 1;
          break;
        }
      }
      
      var rowValues = [
        item.idPerjalanan || ("ST-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
        item.tanggalPengajuan || item.tanggalSpt || "",
        item.namaPegawai || item.namaUtama || "",
        item.tujuanDinas || item.tujuan || "",
        item.nomorSt || item.nomorSpt || "",
        item.linkFolderDrive || "-"
      ];
      
      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 6).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: itemsToUpsert.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    } else {
      script = `// ==========================================
// KODE RESMI GOOGLE APPS SCRIPT REKAP LENGKAP (TWO-WAY SYNC)
// Format 10 Kolom: Waktu Sinkron, Nomor SPT, Nomor SPPD, Tanggal Kegiatan, Nama Petugas, Uraian Kwitansi, Total Nominal (Rp), Kategori Dinas, Kode Rekening, Operator
// Tempelkan di: Google Sheets -> Ekstensi -> Apps Script
// Kemudian Deploy -> Web App (Akses: Anyone / Siapa saja)
// ==========================================

// 1. GET: Dipanggil otomatis saat aplikasi web dibuka
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var results = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0 || !row[1]) continue;
      
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = row[j];
      }
      results.push(item);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: results.length,
      data: results
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. POST: Dipanggil otomatis saat simpan/edit data
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Waktu Sinkron",
        "Nomor SPT",
        "Nomor SPPD",
        "Tanggal Kegiatan",
        "Nama Petugas",
        "Uraian Kwitansi",
        "Total Nominal (Rp)",
        "Kategori Dinas",
        "Kode Rekening",
        "Operator"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "sync_all" && Array.isArray(data.items)) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
      }
      data.items.forEach(function(item) {
        sheet.appendRow([
          new Date(),
          item.nomorSpt,
          item.nomorSppd,
          item.tanggalKegiatan,
          item.namaUtama || item.namaPegawai,
          item.uraianKwitansi,
          item.totalNominal,
          item.kategori,
          item.kodeRekening,
          item.operator
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "sync_all", count: data.items.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var itemsToUpsert = Array.isArray(data) ? data : [data];
    var allData = sheet.getDataRange().getValues();
    
    itemsToUpsert.forEach(function(item) {
      var stTarget = item.nomorSpt || item.nomorSt || "";
      var foundRow = -1;
      
      for (var r = 1; r < allData.length; r++) {
        if (stTarget && allData[r][1] == stTarget) {
          foundRow = r + 1;
          break;
        }
      }
      
      var rowValues = [
        new Date(),
        item.nomorSpt || item.nomorSt || "",
        item.nomorSppd || "",
        item.tanggalKegiatan || item.tanggalPengajuan || "",
        item.namaUtama || item.namaPegawai || "",
        item.uraianKwitansi || item.maksud || "",
        item.totalNominal || 0,
        item.kategori || "Dinas Dalam Kota",
        item.kodeRekening || "5.1.02.04.001.00003",
        item.operator || "ADMIN UTAMA"
      ];
      
      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 10).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: itemsToUpsert.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    }

    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleSyncToWebhook = async () => {
    if (!webhookUrl.trim()) {
      setErrorMessage('Silakan masukkan Webhook URL Google Apps Script terlebih dahulu!');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Sedang mengirimkan dan menyinkronkan seluruh data ke Google Sheets...');
    setErrorMessage(null);

    try {
      const payload = daftarSpt.map((spt, idx) => {
        let total = 0;
        spt.tim.forEach((p) => {
          total +=
            (Number(p.uangHarian) || 0) +
            (Number(p.penginapan) || 0) +
            (Number(p.transport) || 0) +
            (Number(p.uangRepresentasi) || 0);
        });

        const idPerjalanan = spt.idPerjalanan || `ST-${String(idx + 1).padStart(3, '0')}`;
        const namaPegawaiAll = spt.tim.map((p) => p.nama).filter(Boolean).join(', ') || '-';

        return {
          idPerjalanan,
          tanggalPengajuan: spt.tanggalSpt,
          namaPegawai: namaPegawaiAll,
          tujuanDinas: spt.tujuan,
          nomorSt: spt.nomorSpt,
          linkFolderDrive: spt.linkFolderDrive || defaultDriveLink || '-',
          nomorSpt: spt.nomorSpt,
          nomorSppd: spt.nomorSppd,
          tanggalKegiatan:
            spt.tanggalMulai === spt.tanggalSelesai
              ? formatTanggalIndo(spt.tanggalMulai)
              : `${formatTanggalIndo(spt.tanggalMulai)} s/d ${formatTanggalIndo(spt.tanggalSelesai)}`,
          namaUtama: spt.tim[0] ? spt.tim[0].nama : '-',
          uraianKwitansi: getDeskripsiLengkapKwitansi(spt),
          totalNominal: total,
          kategori: spt.jenisDinas === 'BIASA' ? 'Dinas Biasa' : 'Dinas Dalam Kota',
          kodeRekening: getKodeRekening(spt.jenisDinas),
          operator: spt.operator,
        };
      });

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_all',
          items: payload,
        }),
      });

      // Automatically broadcast and persist Webhook URL to server so HP & all devices sync immediately
      saveServerSyncConfig({
        webhookUrl: webhookUrl.trim(),
        spreadsheetId: spreadsheetId.trim(),
        autoSync: true,
      }).catch(() => {});

      setSyncStatus(`✅ Berhasil! ${payload.length} data perjalanan dinas telah tersinkron ke Google Sheet.`);
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      setSyncStatus('⚠️ Data telah dikirim. Pastikan Web App Apps Script disetel ke akses "Anyone" (Siapa saja).');
    } finally {
      setIsSyncing(false);
    }
  };

  // TARIK / PULL DATA DARI GOOGLE SHEETS KE DALAM APLIKASI WEB
  const handlePullFromWebhook = async () => {
    if (!webhookUrl.trim()) {
      setErrorMessage('Silakan masukkan Webhook URL Google Apps Script terlebih dahulu!');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Sedang mengambil data terbaru dari Google Sheets...');
    setErrorMessage(null);

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal memuat data (HTTP ${response.status})`);
      }

      const result = await response.json();

      if (result && result.status === 'success' && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          setSyncStatus('ℹ️ Google Spreadsheet terhubung, namun sheet masih kosong (belum ada data baris).');
        } else {
          // Import parse function
          const { parseSheetRowsToSptItems } = await import('../services/googleSheetsSync');
          const parsed = parseSheetRowsToSptItems(result.data);
          if (onPullSuccess) {
            onPullSuccess(parsed);
          }
          setSyncStatus(`🎉 Berhasil memuat ${parsed.length} data perjalanan dinas dari Google Sheets!`);
        }
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        throw new Error(result.message || 'Format respon dari Google Apps Script tidak sesuai.');
      }
    } catch (err: any) {
      console.error('Pull error:', err);
      setErrorMessage(
        'Gagal mengambil data dari Webhook: ' +
          (err.message || 'Pastikan script sudah diperbarui dengan fungsi doGet dan di-Deploy ulang sebagai Web App.')
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
              📊
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Integrasi Real-Time Google Sheets
              </h3>
              <p className="text-xs text-emerald-200">
                Akses & sinkronkan data input seluruh operator ke Google Spreadsheet secara real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {syncStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-medium animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PILIHAN FORMAT STRUKTUR DATABASE GOOGLE SHEETS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📑</span> Pilihan Struktur Kolom Spreadsheet:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedSchema('USER_DATABASE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    selectedSchema === 'USER_DATABASE'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ⭐ Format Database SPT (6 Kolom)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSchema('FULL_LUMAJANG')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    selectedSchema === 'FULL_LUMAJANG'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Format Lengkap Kwitansi (11 Kolom)
                </button>
              </div>
            </div>

            {selectedSchema === 'USER_DATABASE' ? (
              <div className="bg-white p-3 rounded-lg border border-emerald-300/80 text-xs space-y-1.5">
                <div className="font-semibold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Format Sesuai Database Pengguna (Template data_base_spt):
                </div>
                <div className="text-[11px] font-mono bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-200 overflow-x-auto whitespace-nowrap">
                  ID_Perjalanan,Tanggal_Pengajuan,Nama_Pegawai,Tujuan_Dinas,Nomor_ST,Link_Folder_Drive
                </div>
                <p className="text-[11px] text-slate-500">
                  Data yang disinkronkan akan mengikuti persis 6 kolom ini di Google Sheet Anda.
                </p>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-lg border border-blue-300/80 text-xs space-y-1.5">
                <div className="font-semibold text-blue-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Format Lengkap Rekap Kwitansi & Akuntansi Lumajang:
                </div>
                <div className="text-[11px] font-mono bg-blue-50 text-blue-800 p-2 rounded border border-blue-200 overflow-x-auto whitespace-nowrap">
                  No, Nomor SPT, Nomor SPPD, Tanggal Kegiatan, Nama Petugas Utama, Uraian Sesuai Kwitansi, Total Nominal (Rp), Kategori Dinas, Kode Rekening, Operator Penginput, Status Dokumen
                </div>
              </div>
            )}

            {/* Input Default Link Folder Google Drive */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link Folder Google Drive (Default untuk arsip dokumen):
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={defaultDriveLink}
                onChange={(e) => setDefaultDriveLink(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tautan folder Drive ini otomatis mengisi kolom <em>Link_Folder_Drive</em> bila belum diisi per perjalanan.
              </p>
            </div>
          </div>

          {/* OPSI UTAMA: INTEGRASI LANGSUNG GOOGLE SHEETS API (DENGAN GOOGLE OAUTH) */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Resmi & Real-Time
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">
                    Koneksi Langsung Akun Google (Google Sheets API)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Sinkronkan database ke Google Sheet Anda dengan autentikasi resmi Google.
                </p>
              </div>
            </div>

            {/* Status Login Akun Google */}
            {!googleUser ? (
              <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200/60 shadow-xs">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Belum Terhubung dengan Akun Google
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Masuk dengan Google untuk membuat atau memperbarui spreadsheet otomatis
                  </div>
                </div>
                
                {/* Official Sign in with Google Button Styling */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs hover:shadow-sm transition disabled:opacity-50 cursor-pointer flex-shrink-0"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>{isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
                {/* User Info Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="User Avatar"
                        className="w-7 h-7 rounded-full border border-emerald-400"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                        {(googleUser.displayName || 'G')[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        <span>{googleUser.displayName || 'Pengguna Google'}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {googleUser.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium px-2 py-1 hover:bg-rose-50 rounded-md transition"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Keluar Akun</span>
                  </button>
                </div>

                {/* Input Spreadsheet Link / ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link atau ID Google Spreadsheet Tujuan:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit atau ID Spreadsheet"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    {spreadsheetId && (
                      <a
                        href={
                          spreadsheetId.startsWith('http')
                            ? spreadsheetId
                            : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition flex-shrink-0"
                        title="Buka Spreadsheet di Tab Baru"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi API */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncToLinkedSpreadsheet}
                    disabled={isSyncing || !spreadsheetId.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Google Sheet Ini'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition disabled:opacity-50 cursor-pointer"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Buat Spreadsheet Baru Otomatis</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Opsi Cadangan 1: Satu-Klik Salin Format Google Sheets */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Metode Cepat: Salin & Tempel Langsung ke Google Sheet (1-Klik)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Format tabel otomatis dengan kolom No, Nomor SPT, Uraian Kwitansi, Nominal, Kategori Dinas, dan Operator.
                </p>
              </div>
              <a
                href="https://sheet.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition flex-shrink-0"
              >
                <span>Buka Sheet Baru</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyDataForSheets}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {copiedData ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedData ? 'Tersalin! Siap Ditempel di Google Sheets' : 'Salin Semua Data SPT ke Format Google Sheet'}</span>
              </button>
              <span className="text-[11px] text-slate-400">
                ({daftarSpt.length} data perjalanan dinas aktif)
              </span>
            </div>
          </div>

          {/* Opsi Cadangan 2: Webhook Google Apps Script Real-Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-600" />
                Metode Webhook: Google Apps Script Webhook
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan URL Google Apps Script jika Anda ingin bot/webhook mengirim data tanpa perlu login akun Google berulang.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Webhook / Web App URL Google Apps Script:
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Otomatis Lintas Perangkat:</strong> Klik tombol <em>Simpan untuk Semua Perangkat</em> di bawah agar link spreadsheet ini langsung aktif di HP, tablet, maupun laptop operator lain tanpa perlu konekkan ulang!
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveGlobalConfig}
                  disabled={isSavingGlobal || !webhookUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  title="Simpan Webhook ke Server agar HP dan semua operator langsung terhubung tanpa memasukkan URL lagi"
                >
                  {isSavingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                  <span>{isSavingGlobal ? 'Menyimpan...' : '💾 Simpan untuk Semua Perangkat (HP & Operator)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncToWebhook}
                  disabled={isSyncing || !webhookUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSyncing ? 'Proses...' : '📤 Kirim Semua ke Sheet'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromWebhook}
                  disabled={isSyncing || !webhookUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  title="Ambil seluruh data terbaru yang tersimpan di Google Sheet"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>📥 Tarik Data dari Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 ml-1"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>{showGuide ? 'Tutup Panduan' : 'Cara Pasang Webhook'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyScript}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 underline cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Kode Script Tersalin!' : 'Salin Kode Script Apps Script'}</span>
              </button>
            </div>

            {showGuide && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5 animate-in fade-in">
                <div className="font-bold text-slate-800">Langkah 2 Menit Membuat Webhook Google Sheet:</div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka file Google Sheet Anda di browser (atau klik link <em>Buka Sheet Baru</em> di atas).</li>
                  <li>Di menu atas Google Sheets, klik <strong>Ekstensi</strong> → <strong>Apps Script</strong>.</li>
                  <li>Hapus kode yang ada, lalu klik tombol <strong>Salin Kode Script Apps Script</strong> di atas dan tempelkan.</li>
                  <li>Klik tombol <strong>Terapkan (Deploy)</strong> di pojok kanan atas → <strong>Penerapan Baru (New Deployment)</strong>.</li>
                  <li>Pilih jenis <strong>Aplikasi Web (Web app)</strong>.</li>
                  <li>Pada bagian <em>Siapa yang memiliki akses (Who has access)</em>, pilih <strong>Siapa saja (Anyone)</strong>.</li>
                  <li>Klik <strong>Deploy</strong>, lalu salin URL Web App yang berakhiran <code>/exec</code> dan tempelkan di kotak Webhook di atas.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Operator aktif: <strong>{currentOperator}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Explicit User Confirmation Dialog for Workspace Mutating Operations */}
      {confirmDialog && confirmDialog.show && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <h4 className="font-bold text-sm">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition cursor-pointer"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
