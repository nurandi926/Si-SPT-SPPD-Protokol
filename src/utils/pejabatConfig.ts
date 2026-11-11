import { PejabatConfig, MasterPegawai } from '../types';

export const PEJABAT_STORAGE_KEY = 'SPT_OFFICIALS_CONFIG_V1';
export const MASTER_PEGAWAI_KEY = 'SPT_MASTER_PEGAWAI_LIST_V1';

export const DEFAULT_PEJABAT_CONFIG: PejabatConfig = {
  // 1. TTD SPT (Kepala Bagian Protokol dan Komunikasi Pimpinan)
  ttdSptNama: 'YUDI PRASETIYO ANDY PUTRO, S.STP',
  ttdSptNip: '19800305 199810 1 001',
  ttdSptJabatan: 'Kepala Bagian Protokol dan Komunikasi Pimpinan',
  ttdSptPangkat: 'Pembina / IV a',

  // 2. PPK Dokumen SPD & Lampiran Rincian Biaya
  ppkNama: 'YUDI PRASETIYO ANDY PUTRO, S.STP',
  ppkNip: '19800305 199810 1 001',
  ppkJabatan: 'Pejabat Pembuat Komitmen',

  // 3. PPTK Dokumen Kwitansi
  pptkNama: 'CANDRA MARDIYATI, S.M.',
  pptkNip: '19750429 201001 2 006',
  pptkPangkat: 'Penata / III c',
  pptkJabatan: 'Pejabat Pelaksana Teknis Kegiatan',

  // 4. Bendahara Pengeluaran Pembantu di Kwitansi & Rincian
  bendaharaNama: 'BAKTI HARI PURWANTO',
  bendaharaNip: '19820129 201001 1 002',
  bendaharaPangkat: 'Pengatur / II c',
  bendaharaJabatan: 'Bendahara Pengeluaran Pembantu',

  // 5. Pimpinan Daerah (Bupati & Wakil Bupati untuk format andi 1 & andi 2)
  bupatiNama: 'INDAH AMPERAWATI',
  wakilBupatiNama: 'YUDHA ADJI KUSUMA',
  sekdaNama: 'Drs. AGUS TRIYONO, M.Si',
};

// Dimulai kosong dari awal sesuai permintaan pengguna
export const DEFAULT_MASTER_PEGAWAI: MasterPegawai[] = [];

export function getStoredPejabatConfig(): PejabatConfig {
  try {
    const raw = localStorage.getItem(PEJABAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PEJABAT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load pejabat config:', e);
  }
  return DEFAULT_PEJABAT_CONFIG;
}

export function saveStoredPejabatConfig(cfg: PejabatConfig): void {
  try {
    localStorage.setItem(PEJABAT_STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Failed to save pejabat config:', e);
  }
}

export function mergeMasterPegawaiLists(
  primary: MasterPegawai[],
  secondary: MasterPegawai[]
): MasterPegawai[] {
  const result: MasterPegawai[] = [...primary];
  secondary.forEach((item) => {
    const exists = result.some(
      (p) => p.nama.trim().toLowerCase() === item.nama.trim().toLowerCase()
    );
    if (!exists && item.nama.trim()) {
      result.push(item);
    }
  });
  return result;
}

export function getStoredMasterPegawai(): MasterPegawai[] {
  try {
    const raw = localStorage.getItem(MASTER_PEGAWAI_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Hapus 6 pegawai default lama jika masih ada di cache perangkat
        const cleaned = parsed.filter(
          (p) => !['peg_candra', 'peg_siska', 'peg_yudi', 'peg_agus', 'peg_yudha', 'peg_indah'].includes(p.id)
        );
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Failed to load master pegawai:', e);
  }
  return [];
}

/**
 * Menyimpan daftar master pegawai ke localStorage DAN menyinkronkannya ke server (/api/pegawai)
 * Sehingga pegawai yang disimpan oleh operator langsung otomatis tersimpan di akun admin!
 */
export function saveStoredMasterPegawai(list: MasterPegawai[], syncToServer = true): void {
  try {
    // Hapus data lama bawaan
    const cleaned = list.filter(
      (p) => !['peg_candra', 'peg_siska', 'peg_yudi', 'peg_agus', 'peg_yudha', 'peg_indah'].includes(p.id)
    );
    localStorage.setItem(MASTER_PEGAWAI_KEY, JSON.stringify(cleaned));
    if (syncToServer) {
      fetch('/api/pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      }).catch((e) => console.warn('Failed to sync master pegawai to server:', e));
    }
  } catch (e) {
    console.error('Failed to save master pegawai:', e);
  }
}

/**
 * Mengambil daftar master pegawai terpusat dari server backend (/api/pegawai)
 * Memastikan nama pegawai yang diinput operator otomatis masuk ke akun admin
 */
export async function fetchServerMasterPegawai(): Promise<MasterPegawai[] | null> {
  try {
    const res = await fetch('/api/pegawai');
    if (res.ok) {
      const serverList = await res.json();
      if (Array.isArray(serverList)) {
        const cleaned = serverList.filter(
          (p) => !['peg_candra', 'peg_siska', 'peg_yudi', 'peg_agus', 'peg_yudha', 'peg_indah'].includes(p.id)
        );
        localStorage.setItem(MASTER_PEGAWAI_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (err) {
    // Offline / static fallback
  }
  return null;
}

/**
 * Reset master pegawai terpusat di server dan perangkat ke kosong
 */
export async function resetMasterPegawaiServer(): Promise<MasterPegawai[]> {
  try {
    await fetch('/api/pegawai/reset', { method: 'POST' });
  } catch (e) {}
  localStorage.setItem(MASTER_PEGAWAI_KEY, JSON.stringify([]));
  return [];
}

