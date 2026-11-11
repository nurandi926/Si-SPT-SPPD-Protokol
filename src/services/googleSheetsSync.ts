import { SPTItem, Pegawai, KelompokJabatan, JenisDinas } from '../types';
import {
  formatTanggalIndo,
  getDeskripsiLengkapKwitansi,
  getKodeRekening,
} from '../utils/formatters';
import { getStoredMasterPegawai } from '../utils/pejabatConfig';

export const GS_WEBHOOK_KEY = 'SPT_GOOGLE_SHEETS_WEBHOOK_CONFIG_V1';
export const GS_SPREADSHEET_ID_KEY = 'SPT_GOOGLE_SHEETS_SPREADSHEET_ID_V1';
export const GS_DRIVE_LINK_KEY = 'SPT_DEFAULT_DRIVE_FOLDER_LINK';
export const GS_SCHEMA_KEY = 'SPT_GS_SCHEMA_PREFERENCE_V1';
export const GS_LAST_SYNC_KEY = 'SPT_GOOGLE_SHEETS_LAST_SYNC_TIME';

/**
 * Mendapatkan URL Webhook Google Sheets dari penyimpanan lokal
 */
export function getStoredWebhookUrl(): string {
  try {
    return localStorage.getItem(GS_WEBHOOK_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Menyimpan URL Webhook Google Sheets
 */
export function saveStoredWebhookUrl(url: string): void {
  try {
    localStorage.setItem(GS_WEBHOOK_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save webhook URL:', e);
  }
}

/**
 * Mengambil konfigurasi dari server backend (/api/config)
 * Memungkinkan seluruh perangkat (Laptop, HP, semua operator) berbagi koneksi yang sama secara otomatis!
 */
export async function fetchServerSyncConfig(): Promise<{
  webhookUrl: string;
  spreadsheetId: string;
  defaultDriveLink: string;
  loginNoticeText: string;
  hasConfig: boolean;
} | null> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.webhookUrl) {
        saveStoredWebhookUrl(data.webhookUrl);
        if (data.spreadsheetId) localStorage.setItem(GS_SPREADSHEET_ID_KEY, data.spreadsheetId);
        if (data.defaultDriveLink) localStorage.setItem(GS_DRIVE_LINK_KEY, data.defaultDriveLink);
        if (data.loginNoticeText) localStorage.setItem('SPT_LOGIN_NOTICE_TEXT', data.loginNoticeText);
      }
      return data;
    }
  } catch (err) {
    // Mode offline / static deployment
  }
  return null;
}

/**
 * Menyimpan konfigurasi ke server backend (/api/config)
 * Sehingga ketika admin menyimpan di laptop, HP dan semua operator langsung mendapatkan koneksinya!
 */
export async function saveServerSyncConfig(config: {
  webhookUrl?: string;
  spreadsheetId?: string;
  defaultDriveLink?: string;
  loginNoticeText?: string;
  autoSync?: boolean;
}): Promise<boolean> {
  try {
    const activeWebhook = config.webhookUrl !== undefined ? config.webhookUrl : getStoredWebhookUrl();
    const activeSheetId = config.spreadsheetId !== undefined ? config.spreadsheetId : (localStorage.getItem(GS_SPREADSHEET_ID_KEY) || '');
    const activeDrive = config.defaultDriveLink !== undefined ? config.defaultDriveLink : (localStorage.getItem(GS_DRIVE_LINK_KEY) || '');
    const activeNotice = config.loginNoticeText !== undefined ? config.loginNoticeText : (localStorage.getItem('SPT_LOGIN_NOTICE_TEXT') || '');

    // 1. Simpan di localStorage perangkat saat ini
    if (activeWebhook) saveStoredWebhookUrl(activeWebhook);
    if (activeSheetId) localStorage.setItem(GS_SPREADSHEET_ID_KEY, activeSheetId);
    if (activeDrive) localStorage.setItem(GS_DRIVE_LINK_KEY, activeDrive);
    if (activeNotice) localStorage.setItem('SPT_LOGIN_NOTICE_TEXT', activeNotice);

    // 2. Simpan ke server backend agar semua perangkat lain (HP/Laptop) otomatis terhubung
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: activeWebhook,
        spreadsheetId: activeSheetId,
        defaultDriveLink: activeDrive,
        loginNoticeText: activeNotice,
      }),
    });
    return true;
  } catch (err) {
    console.warn('Failed to save to /api/config:', err);
    return false;
  }
}

/**
 * Deteksi dan terapkan konfigurasi sinkronisasi dari URL (untuk kemudahan saat ganti perangkat)
 */
export function detectAndApplyUrlConfig(): { applied: boolean; webhookUrl?: string } {
  try {
    if (typeof window === 'undefined') return { applied: false };

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    let webhookParam = searchParams.get('webhook') || searchParams.get('gs');
    let sheetIdParam = searchParams.get('sheetId');

    // Cek juga di hash (#config=...)
    if (!webhookParam && hash.includes('syncConfig=')) {
      try {
        const raw = hash.split('syncConfig=')[1];
        const decoded = JSON.parse(decodeURIComponent(raw));
        if (decoded.webhook) webhookParam = decoded.webhook;
        if (decoded.sheetId) sheetIdParam = decoded.sheetId;
      } catch (e) {}
    }

    if (webhookParam && webhookParam.trim()) {
      saveStoredWebhookUrl(webhookParam.trim());
      if (sheetIdParam) {
        localStorage.setItem(GS_SPREADSHEET_ID_KEY, sheetIdParam.trim());
      }

      // Bersihkan URL agar rapi tanpa reload
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return { applied: true, webhookUrl: webhookParam.trim() };
    }
  } catch (e) {
    console.error('Error applying URL config:', e);
  }
  return { applied: false };
}

export const PUBLIC_STANDALONE_APP_URL =
  'https://ais-pre-lilu2jquj5phq4a4ylfe4b-171290596840.asia-east1.run.app';

/**
 * Menghasilkan link bagikan lengkap dengan konfigurasi sinkronisasi otomatis
 * Sehingga ketika dibuka di perangkat baru (HP/Laptop lain), langsung otomatis tersinkron
 */
export function generateShareUrlWithConfig(baseUrl?: string): string {
  let effectiveBaseUrl = (baseUrl || '').trim();

  // Cegah URL internal editor AI Studio agar tidak pernah disalin ke operator
  if (
    !effectiveBaseUrl ||
    effectiveBaseUrl.includes('aistudio.google.com') ||
    effectiveBaseUrl === 'null' ||
    !effectiveBaseUrl.startsWith('http')
  ) {
    effectiveBaseUrl = PUBLIC_STANDALONE_APP_URL;
  }

  const webhook = getStoredWebhookUrl();
  const sheetId = localStorage.getItem(GS_SPREADSHEET_ID_KEY) || '';

  if (!webhook) return effectiveBaseUrl;

  try {
    const configObj = { webhook, sheetId };
    const encoded = encodeURIComponent(JSON.stringify(configObj));
    const url = new URL(effectiveBaseUrl);
    url.hash = `syncConfig=${encoded}`;
    return url.toString();
  } catch {
    return effectiveBaseUrl;
  }
}

/**
 * Mengubah baris-baris data dari Google Sheet menjadi SPTItem[]
 * Sekaligus menggabungkan dengan data lokal/server agar nama operator, rincian pegawai, dan biaya tidak hilang
 */
export function parseSheetRowsToSptItems(rows: any[], existingItems: SPTItem[] = []): SPTItem[] {
  if (!Array.isArray(rows) || rows.length === 0) return existingItems;

  // Siapkan map pencarian berdasarkan nomor SPT / nomor SPPD / ID perjalanan
  const existingMap = new Map<string, SPTItem>();
  existingItems.forEach((item) => {
    if (item.nomorSpt) existingMap.set(item.nomorSpt.trim().toLowerCase(), item);
    if (item.nomorSppd) existingMap.set(item.nomorSppd.trim().toLowerCase(), item);
    if (item.idPerjalanan) existingMap.set(item.idPerjalanan.trim().toLowerCase(), item);
  });

  const parsedList: SPTItem[] = [];
  const processedKeys = new Set<string>();

  rows.forEach((row, index) => {
    try {
      const isArrayRow = Array.isArray(row);

      // Normalisasi nama kolom (case insensitive & format fleksibel)
      const getVal = (keys: string[]): string => {
        if (isArrayRow) return '';
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return String(row[k]).trim();
          }
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const rowKey of Object.keys(row)) {
            const cleanRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanRowKey === cleanK && row[rowKey] !== undefined && row[rowKey] !== null) {
              const val = String(row[rowKey]).trim();
              if (val) return val;
            }
          }
        }
        return '';
      };

      // 1. Identitas Pokok
      const idPerjalanan =
        (isArrayRow ? String(row[0] || '').trim() : '') ||
        getVal(['ID_Perjalanan', 'idPerjalanan', 'ID Perjalanan', 'id']) ||
        `ST-${String(index + 1).padStart(3, '0')}`;

      const tanggalPengajuan =
        (isArrayRow ? String(row[1] || '').trim() : '') ||
        getVal(['Tanggal_Pengajuan', 'tanggalPengajuan', 'Tanggal Pengajuan', 'tanggalSpt', 'Tanggal_SPT']) ||
        new Date().toISOString().split('T')[0];

      // Nama Pegawai: cari di berbagai kemungkinan nama kolom resmi & singkatan
      let namaPegawaiRaw =
        (isArrayRow ? String(row[2] || '').trim() : '') ||
        getVal([
          'Nama_Pegawai',
          'Nama Pegawai',
          'namaPegawai',
          'nama_pegawai',
          'Pegawai Pelaksana',
          'Pegawai_Pelaksana',
          'pegawaipelaksana',
          'Daftar Pegawai Pelaksana',
          'Nama Petugas',
          'namaPetugas',
          'nama_petugas',
          'namaUtama',
          'nama',
          'Nama',
          'Pegawai',
          'pegawai',
          'Pelaksana',
          'pelaksana',
          'Petugas',
          'petugas',
        ]);

      const tujuanDinas =
        (isArrayRow ? String(row[3] || '').trim() : '') ||
        getVal(['Tujuan_Dinas', 'tujuanDinas', 'Tujuan Dinas', 'tujuan']) ||
        'Lumajang';

      const nomorSt =
        (isArrayRow ? String(row[4] || '').trim() : '') ||
        getVal(['Nomor_ST', 'nomorSt', 'Nomor SPT', 'nomorSpt', 'Nomor_SPT']) ||
        `800.1.11.1/${String(index + 1).padStart(3, '0')}/427.17/2026`;

      const linkFolderDrive =
        (isArrayRow ? String(row[5] || '').trim() : '') ||
        getVal(['Link_Folder_Drive', 'linkFolderDrive', 'Link Folder Drive', 'driveLink']) ||
        '';

      const sheetSppd =
        (isArrayRow ? String(row[6] || '').trim() : '') ||
        getVal(['Nomor_SPPD', 'nomorSppd', 'Nomor SPPD']);

      // Cek apakah item ini sudah ada di cache lokal/server sebelumnya (berdasarkan ID atau Nomor)
      const existingMatch =
        (idPerjalanan ? existingMap.get(idPerjalanan.trim().toLowerCase()) : undefined) ||
        (sheetSppd ? existingMap.get(sheetSppd.trim().toLowerCase()) : undefined) ||
        (nomorSt && !nomorSt.includes('/   /') ? existingMap.get(nomorSt.trim().toLowerCase()) : undefined);

      // Format Nomor SPPD Resmi Perbaikan #2: 000.1.2.3/nomor otomatis 3 digit/417.17/2026
      const nomorSppd =
        sheetSppd ||
        existingMatch?.nomorSppd ||
        `000.1.2.3/${String(index + 1).padStart(3, '0')}/417.17/2026`;

      const rowOperator = (isArrayRow ? String(row[7] || '').trim() : '') || getVal(['Operator', 'operator', 'Penginput']);
      // Preservasi Operator: Jika rowOperator kosong/ADMIN UTAMA namun existingMatch memiliki operator riil, utamakan operator asli
      const finalOperator = rowOperator && rowOperator.trim().toUpperCase() !== 'ADMIN UTAMA'
        ? rowOperator
        : (existingMatch?.operator && existingMatch.operator.trim().toUpperCase() !== 'ADMIN UTAMA')
        ? existingMatch.operator
        : (rowOperator || existingMatch?.operator || 'ADMIN UTAMA');

      const uraianKwitansi =
        getVal(['Uraian_Kwitansi', 'uraianKwitansi', 'Uraian Kwitansi', 'maksud']) ||
        existingMatch?.maksud ||
        `Melaksanakan tugas perjalanan dinas ke ${tujuanDinas}`;

      const kategoriDinas =
        getVal(['Kategori_Dinas', 'kategori', 'Kategori Dinas', 'jenisDinas']) ||
        (existingMatch?.jenisDinas === 'BIASA' ? 'Dinas Biasa' : 'Dinas Dalam Kota');

      const totalNominal =
        Number(getVal(['Total_Nominal', 'totalNominal', 'Total Nominal (Rp)', 'nominal'])) || 0;

      // Parsing pegawai: Ambil master pegawai tersimpan agar NIP, Pangkat, dan Jabatan otomatis sinkron
      const masterPegawaiList = getStoredMasterPegawai();
      let timPegawai: Pegawai[] = [];

      // 1. Cek jika ada JSON tim lengkap di kolom Tim_Pegawai_JSON
      const timJsonStr = getVal(['Tim_Pegawai_JSON', 'timJson', 'tim']);
      if (timJsonStr && timJsonStr.startsWith('[')) {
        try {
          const parsedTim = JSON.parse(timJsonStr);
          if (Array.isArray(parsedTim) && parsedTim.length > 0) {
            timPegawai = parsedTim;
          }
        } catch (e) {}
      }

      // 2. Jika ada existing match yang sudah punya data pegawai riil, utamakan tim dari existing
      const existingHasRealName =
        existingMatch &&
        existingMatch.tim &&
        existingMatch.tim.length > 0 &&
        existingMatch.tim.some((p) => p.nama && p.nama.trim().toLowerCase() !== 'pegawai pelaksana');

      if (timPegawai.length === 0 && existingHasRealName && existingMatch) {
        timPegawai = existingMatch.tim;
      }

      // 3. Jika belum ada, uraikan nama dari namaPegawaiRaw dan cocokkan dengan master pegawai
      if (timPegawai.length === 0) {
        if (!namaPegawaiRaw || namaPegawaiRaw.trim().toLowerCase() === 'pegawai pelaksana') {
          if (existingMatch?.tim && existingMatch.tim.length > 0) {
            timPegawai = existingMatch.tim;
          }
        }

        if (timPegawai.length === 0 && namaPegawaiRaw) {
          const namaList = namaPegawaiRaw.split(/[,;\n]/).map((n) => n.trim()).filter(Boolean);
          if (namaList.length > 0) {
            namaList.forEach((nama, pIdx) => {
              // Cari di master pegawai tersimpan
              const matchedMaster = masterPegawaiList.find(
                (m) => m.nama.trim().toLowerCase() === nama.trim().toLowerCase()
              );
              // Cari di existingMatch.tim jika ada
              const matchedExistingPeg = existingMatch?.tim?.find(
                (p) => p.nama.trim().toLowerCase() === nama.trim().toLowerCase()
              );

              timPegawai.push({
                nip:
                  matchedExistingPeg?.nip && matchedExistingPeg.nip !== '-'
                    ? matchedExistingPeg.nip
                    : matchedMaster?.nip || '-',
                nama,
                pangkat:
                  matchedExistingPeg?.pangkat &&
                  matchedExistingPeg.pangkat !== '-' &&
                  matchedExistingPeg.pangkat !== 'Penata / III c'
                    ? matchedExistingPeg.pangkat
                    : matchedMaster?.pangkat || '-',
                jabatanPegawai:
                  matchedExistingPeg?.jabatanPegawai &&
                  matchedExistingPeg.jabatanPegawai !== '-' &&
                  matchedExistingPeg.jabatanPegawai !== 'Pelaksana Tugas'
                    ? matchedExistingPeg.jabatanPegawai
                    : matchedMaster?.jabatanPegawai || '-',
                uangHarian: matchedExistingPeg?.uangHarian ?? (pIdx === 0 && totalNominal > 0 ? totalNominal : 0),
                penginapan: matchedExistingPeg?.penginapan ?? 0,
                transport: matchedExistingPeg?.transport ?? 0,
              });
            });
          }
        }
      }

      // Deteksi kelompok jabatan
      let kelompokJabatan: KelompokJabatan = existingMatch?.kelompokJabatan || 'KASUBAG_STAF';
      const upperSt = nomorSt.toUpperCase();
      if (!existingMatch?.kelompokJabatan) {
        if (upperSt.includes('BUPATI') || namaPegawaiRaw.toUpperCase().includes('INDAH AMPERAWATI')) {
          kelompokJabatan = 'BUPATI';
        } else if (namaPegawaiRaw.toUpperCase().includes('YUDHA ADJI KUSUMA')) {
          kelompokJabatan = 'WAKIL_BUPATI';
        } else if (namaPegawaiRaw.toUpperCase().includes('AGUS TRIYONO')) {
          kelompokJabatan = 'SEKRETARIS_DAERAH';
        }
      }

      const jenisDinas: JenisDinas =
        existingMatch?.jenisDinas ||
        (kategoriDinas.toUpperCase().includes('BIASA') ? 'BIASA' : 'DALAM_KOTA');

      const finalItem: SPTItem = {
        idPerjalanan,
        nomorSpt: nomorSt,
        nomorSppd,
        dasar: existingMatch?.dasar || 'Jadwal Kegiatan Bupati dan Wakil Bupati Lumajang',
        maksud: uraianKwitansi,
        tujuan: tujuanDinas,
        tanggalSpt: tanggalPengajuan,
        tanggalSpd: existingMatch?.tanggalSpd || tanggalPengajuan,
        tanggalMulai: existingMatch?.tanggalMulai || tanggalPengajuan,
        tanggalSelesai: existingMatch?.tanggalSelesai || tanggalPengajuan,
        kelompokJabatan,
        jenisDinas,
        operator: finalOperator,
        linkFolderDrive: linkFolderDrive || existingMatch?.linkFolderDrive || '',
        status: existingMatch?.status || 'AKTIF',
        alasanBatal: existingMatch?.alasanBatal,
        tanggalBatal: existingMatch?.tanggalBatal,
        tim: timPegawai,
      };

      // Cegah duplikasi record di daftar hasil
      const isAlreadyAdded = parsedList.some(
        (p) =>
          (p.idPerjalanan && finalItem.idPerjalanan && p.idPerjalanan.toLowerCase() === finalItem.idPerjalanan.toLowerCase()) ||
          (p.nomorSppd && finalItem.nomorSppd && p.nomorSppd.toLowerCase() === finalItem.nomorSppd.toLowerCase())
      );

      if (!isAlreadyAdded) {
        parsedList.push(finalItem);
      }

      if (finalItem.nomorSpt) processedKeys.add(finalItem.nomorSpt.trim().toLowerCase());
      if (finalItem.nomorSppd) processedKeys.add(finalItem.nomorSppd.trim().toLowerCase());
      if (finalItem.idPerjalanan) processedKeys.add(finalItem.idPerjalanan.trim().toLowerCase());
    } catch (err) {
      console.error('Error parsing row:', row, err);
    }
  });

  // Pertahankan item lokal yang baru dibuat dan belum ada di Google Sheets (tanpa duplikasi)
  existingItems.forEach((existing) => {
    const isProcessed =
      (existing.idPerjalanan && processedKeys.has(existing.idPerjalanan.trim().toLowerCase())) ||
      (existing.nomorSppd && processedKeys.has(existing.nomorSppd.trim().toLowerCase())) ||
      (existing.nomorSpt && !existing.nomorSpt.includes('/   /') && processedKeys.has(existing.nomorSpt.trim().toLowerCase()));

    const isAlreadyInParsed = parsedList.some(
      (p) =>
        (p.idPerjalanan && existing.idPerjalanan && p.idPerjalanan.toLowerCase() === existing.idPerjalanan.toLowerCase()) ||
        (p.nomorSppd && existing.nomorSppd && p.nomorSppd.toLowerCase() === existing.nomorSppd.toLowerCase())
    );

    if (!isProcessed && !isAlreadyInParsed) {
      parsedList.unshift(existing);
    }
  });

  return parsedList;
}

/**
 * Mengambil (PULL) seluruh data terbaru dari Google Sheets via Webhook GET
 * Sekaligus menyinkronkan dengan server backend agar semua perangkat mendapatkan data yang sama
 */
export async function pullDataFromGoogleSheets(
  customWebhookUrl?: string
): Promise<{ success: boolean; data?: SPTItem[]; message?: string; count?: number }> {
  let url = (customWebhookUrl || getStoredWebhookUrl()).trim();

  // Jika di perangkat belum tersimpan URL Webhook (misal baru buka lewat HP), ambil dari server!
  if (!url) {
    const serverCfg = await fetchServerSyncConfig();
    if (serverCfg?.webhookUrl) {
      url = serverCfg.webhookUrl.trim();
    }
  }

  // Ambil data cache lokal dan SELALU gabungkan dengan database server (/api/spt)
  // Memastikan data yang diinput oleh operator lain tidak pernah hilang atau tertinggal!
  let existingItems: SPTItem[] = [];
  try {
    const raw = localStorage.getItem('DATA_SPT_BIAYA_OFFICIAL_V7');
    if (raw) existingItems = JSON.parse(raw);
  } catch {}

  try {
    const serverRes = await fetch('/api/spt');
    if (serverRes.ok) {
      const sData = await serverRes.json();
      if (Array.isArray(sData) && sData.length > 0) {
        const itemMap = new Map<string, SPTItem>();
        // Utamakan data server terpusat
        sData.forEach((it) => {
          const key = (it.nomorSppd || it.idPerjalanan || '').toLowerCase();
          if (key) itemMap.set(key, it);
        });
        // Sertakan data lokal jika ada yang belum sempat terkirim
        existingItems.forEach((it) => {
          const key = (it.nomorSppd || it.idPerjalanan || '').toLowerCase();
          if (key && !itemMap.has(key)) itemMap.set(key, it);
        });
        existingItems = Array.from(itemMap.values());
      } else if (Array.isArray(sData) && sData.length === 0 && (!url || existingItems.length === 0)) {
        existingItems = [];
      }
    }
  } catch {}

  // Jika URL webhook tersedia, ambil langsung dari Google Sheets
  if (url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const parsedItems = parseSheetRowsToSptItems(result.data, existingItems);
          try {
            localStorage.setItem(GS_LAST_SYNC_KEY, new Date().toISOString());
            localStorage.setItem('DATA_SPT_BIAYA_OFFICIAL_V7', JSON.stringify(parsedItems));
            // Simpan salinan ke server agar perangkat offline / device lain tetap punya data
            fetch('/api/spt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedItems),
            }).catch(() => {});
          } catch (e) {}

          return {
            success: true,
            data: parsedItems,
            count: parsedItems.length,
            message: `Berhasil mengambil ${parsedItems.length} data dari Google Sheets.`,
          };
        } else if (Array.isArray(result)) {
          const parsedItems = parseSheetRowsToSptItems(result, existingItems);
          try {
            localStorage.setItem('DATA_SPT_BIAYA_OFFICIAL_V7', JSON.stringify(parsedItems));
            fetch('/api/spt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedItems),
            }).catch(() => {});
          } catch (e) {}
          return {
            success: true,
            data: parsedItems,
            count: parsedItems.length,
            message: `Berhasil mengambil ${parsedItems.length} data dari Google Sheets.`,
          };
        }
      }
    } catch (err: any) {
      console.warn('Pull from Google Sheets warning, checking server cache:', err);
    }
  }

  // Fallback cadangan: ambil data dari cache server terpusat (/api/spt)
  try {
    const serverRes = await fetch('/api/spt');
    if (serverRes.ok) {
      const sData = await serverRes.json();
      if (Array.isArray(sData)) {
        return {
          success: true,
          data: sData,
          count: sData.length,
          message:
            sData.length > 0
              ? `Berhasil memuat ${sData.length} data dari database terpusat.`
              : 'Database terpusat bersih (0 data).',
        };
      }
    }
  } catch (err) {}

  return {
    success: false,
    message: url ? 'Gagal mengambil data dari Google Sheets.' : 'Webhook Google Sheets belum dikonfigurasi.',
  };
}

/**
 * Mengirim (PUSH) 1 SPT baru ke Google Sheets via Webhook POST
 * Dan menyimpannya ke server backend agar operator & admin lain langsung melihat perubahannya
 */
export async function pushSingleSptToGoogleSheets(
  spt: SPTItem,
  customWebhookUrl?: string
): Promise<boolean> {
  let url = (customWebhookUrl || getStoredWebhookUrl()).trim();
  if (!url) {
    const serverCfg = await fetchServerSyncConfig();
    if (serverCfg?.webhookUrl) url = serverCfg.webhookUrl.trim();
  }

  const defaultDrive = localStorage.getItem(GS_DRIVE_LINK_KEY) || '-';
  let total = 0;
  spt.tim.forEach((p) => {
    total +=
      (Number(p.uangHarian) || 0) +
      (Number(p.penginapan) || 0) +
      (Number(p.transport) || 0) +
      (Number(p.uangRepresentasi) || 0);
  });

  const namaPegawaiAll = spt.tim.map((p) => p.nama).filter(Boolean).join(', ') || '-';

  const payload = {
    action: 'save_spt',
    // 1. Format Database Sesuai Spreadsheet Pengguna (data_base_spt - 6 Kolom)
    idPerjalanan: spt.idPerjalanan || `ST-${Date.now().toString().slice(-4)}`,
    tanggalPengajuan: spt.tanggalSpt,
    namaPegawai: namaPegawaiAll,
    tujuanDinas: spt.tujuan,
    nomorSt: spt.nomorSpt,
    linkFolderDrive: spt.linkFolderDrive || defaultDrive,

    // 2. Format Lengkap Akuntansi
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

  let pushSuccess = false;

  // 1. Kirim ke Webhook Google Apps Script
  if (url) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      pushSuccess = true;
    } catch (err) {
      console.error('Failed to push single SPT to Google Sheets:', err);
    }
  }

  // 2. Selalu update ke database server backend (/api/spt) agar perangkat lain segera dapat datanya
  try {
    fetch('/api/spt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spt),
    }).catch(() => {});
  } catch (e) {}

  return pushSuccess;
}

/**
 * Mengirim (PUSH) seluruh daftar SPT ke Google Sheets via Webhook POST
 */
export async function pushAllSptToGoogleSheets(
  daftarSpt: SPTItem[],
  customWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  let url = (customWebhookUrl || getStoredWebhookUrl()).trim();
  if (!url) {
    const serverCfg = await fetchServerSyncConfig();
    if (serverCfg?.webhookUrl) url = serverCfg.webhookUrl.trim();
  }

  // Simpan ke database server backend
  try {
    if (daftarSpt.length === 0) {
      fetch('/api/spt/reset', { method: 'POST' }).catch(() => {});
    } else {
      fetch('/api/spt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(daftarSpt),
      }).catch(() => {});
    }
  } catch (e) {}

  if (!url) {
    return { success: false, message: 'URL Webhook Google Sheets belum diisi.' };
  }

  const defaultDrive = localStorage.getItem(GS_DRIVE_LINK_KEY) || '-';

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
      // 6 Kolom Utama Sesuai Database Pengguna
      idPerjalanan,
      tanggalPengajuan: spt.tanggalSpt,
      namaPegawai: namaPegawaiAll,
      tujuanDinas: spt.tujuan,
      nomorSt: spt.nomorSpt,
      linkFolderDrive: spt.linkFolderDrive || defaultDrive,

      // Format Lengkap
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

  try {
    await fetch(url, {
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

    try {
      localStorage.setItem(GS_LAST_SYNC_KEY, new Date().toISOString());
    } catch (e) {}

    return {
      success: true,
      message: `Berhasil menyinkronkan ${payload.length} data ke Google Sheets!`,
    };
  } catch (err: any) {
    console.error('Failed to push all SPT to Google Sheets:', err);
    return {
      success: false,
      message: err.message || 'Gagal mengirim data ke Webhook Google Sheets.',
    };
  }
}

/**
 * Melakukan RESET TOTAL DATABASE:
 * 1. Menghapus seluruh data SPT dan Pegawai di server backend (/api/database/reset-total)
 * 2. Membersihkan seluruh penyimpanan lokal browser di perangkat ini (semua versi kunci cache)
 * 3. Mengirimkan instruksi pembersihan baris ke Google Sheets Webhook (jika terhubung)
 * 4. Memulai penomoran urut SPT dan SPD bersih dari 001
 */
export async function executeResetTotalDatabase(): Promise<{ success: boolean; message: string }> {
  // 1. Reset database server terpusat
  try {
    await fetch('/api/database/reset-total', { method: 'POST' });
  } catch (e) {
    console.warn('Gagal reset server database:', e);
  }

  // 2. Bersihkan seluruh penyimpanan lokal browser
  try {
    const keysToPurge = [
      'DATA_SPT_BIAYA_OFFICIAL_V7',
      'DATA_SPT_BIAYA_OFFICIAL_V6',
      'DATA_SPT_BIAYA_OFFICIAL_V5',
      'DATA_SPT_BIAYA_OFFICIAL_V4',
      'DATA_SPT_BIAYA_OFFICIAL_V3',
      'DATA_SPT_BIAYA_OFFICIAL_V2',
      'DATA_SPT_BIAYA_OFFICIAL_V1',
      'DATA_SPT_BIAYA_OFFICIAL',
      'SPT_TRANSACTIONS',
      'SPT_MASTER_PEGAWAI_LIST_V1',
      'SPT_TANDA_TANGAN_RECORDS_V1',
    ];
    keysToPurge.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('DATA_SPT_BIAYA_OFFICIAL_V7', JSON.stringify([]));
    localStorage.setItem('SPT_MASTER_PEGAWAI_LIST_V1', JSON.stringify([]));
    localStorage.setItem('SPT_LAST_RESET_TIMESTAMP', String(Date.now()));
  } catch (e) {}

  // 3. Kirim instruksi sync_all dengan array kosong ke Google Sheets
  let sheetsCleared = false;
  try {
    const res = await pushAllSptToGoogleSheets([]);
    sheetsCleared = res.success;
  } catch (e) {}

  return {
    success: true,
    message: sheetsCleared
      ? 'Database server, penyimpanan perangkat, dan Google Sheets berhasil dibersihkan total.'
      : 'Database server dan penyimpanan perangkat berhasil dibersihkan total.',
  };
}

