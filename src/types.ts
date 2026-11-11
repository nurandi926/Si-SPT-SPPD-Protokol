export interface Pegawai {
  nip: string;
  nama: string;
  pangkat: string;
  jabatanPegawai: string;
  uangHarian: number;
  penginapan: number;
  transport: number;
  uangRepresentasi?: number; // Khusus Kelompok Bupati sampai Asisten Staf Ahli
}

export type KelompokJabatan =
  | 'BUPATI'
  | 'WAKIL_BUPATI'
  | 'SEKRETARIS_DAERAH'
  | 'ASISTEN_STAF_AHLI'
  | 'KABAG'
  | 'KASUBAG_STAF';

export const LABEL_KELOMPOK_JABATAN: Record<KelompokJabatan, string> = {
  BUPATI: '1. Bupati',
  WAKIL_BUPATI: '2. Wakil Bupati',
  SEKRETARIS_DAERAH: '3. Sekretaris Daerah',
  ASISTEN_STAF_AHLI: '4. Asisten & Staf Ahli',
  KABAG: '5. Kabag',
  KASUBAG_STAF: '6. Kasubag & Staf',
};

// Kelompok jabatan dari Bupati sampai Asisten Staf Ahli yang berhak atas komponen Uang Representatif
export function isKelompokUangRepresentasi(kelompokJabatan?: string): boolean {
  if (!kelompokJabatan) return false;
  return [
    'BUPATI',
    'WAKIL_BUPATI',
    'SEKRETARIS_DAERAH',
    'ASISTEN_STAF_AHLI',
  ].includes(kelompokJabatan);
}

export type UserRole = 'OPERATOR' | 'ADMINISTRATOR';
export type SpdStatus = 'AKTIF' | 'BATAL';
export type JenisDinas = 'DALAM_KOTA' | 'BIASA';

export interface OperatorAccount {
  id: string;
  nama: string;
  sandi: string;
  role: UserRole;
}

export interface SPTItem {
  idPerjalanan?: string; // ID_Perjalanan (misal: ST-001)
  nomorSpt: string;
  nomorSppd: string;
  dasar: string;
  maksud: string;
  tujuan: string;
  tanggalSpt: string;
  tanggalSpd: string; // Tanggal Surat Perjalanan Dinas
  tanggalMulai: string;
  tanggalSelesai: string;
  kelompokJabatan: KelompokJabatan;
  jenisDinas?: JenisDinas; // 'DALAM_KOTA' | 'BIASA'
  operator: string;
  pejabatKomitmen?: string;
  linkFolderDrive?: string; // Link_Folder_Drive Google Drive
  tim: Pegawai[];
  status?: SpdStatus;
  alasanBatal?: string;
  tanggalBatal?: string;
}

export interface PihakHadir {
  nama: string;
  jabatanInstansi: string;
}

export interface LaporanPerjalananDinas {
  id: string;
  nomorSppd: string;
  nomorSpt: string;
  nomorLaporan?: string;
  tanggalLaporan: string;
  // 1. Dasar (ngeling ke dasar SPT + tambah dasar manual)
  dasarUtama: string;
  dasarTambahan: string[];
  // 2. Maksud / Tujuan (ngeling ke maksud SPT)
  maksudTujuan: string;
  // 3. Waktu Pelaksanaan (ngeling ke tanggal pelaksanaan SPT)
  waktuPelaksanaan: string;
  // 4. Nama Petugas (ngeling ke tim SPT)
  petugas: Pegawai[];
  // 5. Daerah / Tujuan yang dikunjungi (ngeling ke tujuan SPT)
  daerahTujuan: string;
  // 6. Hadir dalam pertemuan (fleksibel multiple baris)
  hadirPertemuan: PihakHadir[];
  // 7. Petunjuk / arahan yang diberikan
  petunjukArahan: string;
  // 8. Masalah / temuan
  masalahTemuan: string;
  // 9. Saran tindakan
  saranTindakan: string;
  // 10. Lain-lain
  lainLain: string;
  // Metadata
  dibuatOleh: string;
  createdAt: string;
}

export interface UserSession {
  operator: string;
  role: UserRole;
}

export interface PejabatConfig {
  // 1. TTD SPT (Kabag Protokol & TU Pimpinan)
  ttdSptNama: string;
  ttdSptNip: string;
  ttdSptJabatan: string;
  ttdSptPangkat?: string;

  // 2. PPK di Dokumen SPD & Lampiran Rincian Perjadin
  ppkNama: string;
  ppkNip: string;
  ppkJabatan: string;

  // 3. PPTK di Dokumen Kwitansi
  pptkNama: string;
  pptkNip: string;
  pptkPangkat: string;
  pptkJabatan: string;

  // 4. Bendahara Pengeluaran di Dokumen Kwitansi
  bendaharaNama: string;
  bendaharaNip: string;
  bendaharaPangkat: string;
  bendaharaJabatan: string;

  // 5. Pimpinan Daerah (Bupati, Wabup, Sekda)
  bupatiNama: string;
  wakilBupatiNama: string;
  sekdaNama: string;
}

export interface MasterPegawai {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  jabatanPegawai: string;
}
