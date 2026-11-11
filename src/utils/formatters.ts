export function formatTanggalIndo(stringTanggal: string): string {
  if (!stringTanggal || stringTanggal === '-') return '-';
  try {
    const opsi: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(stringTanggal).toLocaleDateString('id-ID', opsi);
  } catch {
    return stringTanggal;
  }
}

export function terbilangRupiah(nominal: number): string {
  if (isNaN(nominal) || nominal < 0) return 'Nol Rupiah';
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    let temp = '';
    if (n < 12) {
      temp = ' ' + bilangan[n];
    } else if (n < 20) {
      temp = konversi(n - 10) + ' Belas';
    } else if (n < 100) {
      temp = konversi(Math.floor(n / 10)) + ' Puluh' + konversi(n % 10);
    } else if (n < 200) {
      temp = ' Seratus' + konversi(n - 100);
    } else if (n < 1000) {
      temp = konversi(Math.floor(n / 100)) + ' Ratus' + konversi(n % 100);
    } else if (n < 2000) {
      temp = ' Seribu' + konversi(n - 1000);
    } else if (n < 1000000) {
      temp = konversi(Math.floor(n / 1000)) + ' Ribu' + konversi(n % 1000);
    } else if (n < 1000000000) {
      temp = konversi(Math.floor(n / 1000000)) + ' Juta' + konversi(n % 1000000);
    } else if (n < 1000000000000) {
      temp = konversi(Math.floor(n / 1000000000)) + ' Milyar' + konversi(n % 1000000000);
    }
    return temp;
  }

  const hasil = konversi(Math.floor(nominal)).trim();
  return (hasil || 'Nol') + ' Rupiah';
}

export function formatRupiah(nominal: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nominal || 0);
}

export function hitungDurasiHari(tglMulai: string, tglSelesai: string): number {
  if (!tglMulai || !tglSelesai) return 1;
  const d1 = new Date(tglMulai).getTime();
  const d2 = new Date(tglSelesai).getTime();
  if (isNaN(d1) || isNaN(d2)) return 1;
  const diffTime = d2 - d1;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// PPK Kolom 1 SPD per operator
export function getPpkKolom1(operatorName?: string, customPpk?: string): string {
  if (customPpk && customPpk.trim()) return customPpk.trim();
  const name = (operatorName || '').toUpperCase();
  if (name.includes('ALFAN')) {
    return 'Penyediaan Dana Penunjang Operasional Kepala Daerah dan Wakil Kepala Daerah';
  }
  if (name.includes('KURNIAWAN')) {
    return 'Fasilitasi Keprotokolan';
  }
  if (name.includes('UMI')) {
    return 'Penyelenggaraan Rapat Koordinasi dan Konsultasi SKPD';
  }
  return 'Penyelenggaraan Rapat Koordinasi dan Konsultasi SKPD';
}

// Kode Rekening Dokumen SPT, SPD, dan Kwitansi:
// Dinas Dalam Kota = 5.1.02.04.001.00003
// Dinas Biasa = 5.1.02.04.001.00001
export function getKodeRekening(jenisDinas?: 'DALAM_KOTA' | 'BIASA'): string {
  return jenisDinas === 'BIASA' ? '5.1.02.04.001.00001' : '5.1.02.04.001.00003';
}

// Uraian Keterangan Awal Kwitansi
export function getUraianKwitansiAwal(jenisDinas?: 'DALAM_KOTA' | 'BIASA'): string {
  return jenisDinas === 'BIASA'
    ? 'Belanja Perjalanan Dinas Biasa'
    : 'Belanja Perjalanan Dinas Dalam Kota';
}

// Format lengkap uraian kwitansi sesuai input data
export function getDeskripsiLengkapKwitansi(spt: {
  tim: { nama: string }[];
  tanggalMulai: string;
  maksud: string;
  tujuan: string;
  jenisDinas?: 'DALAM_KOTA' | 'BIASA';
}): string {
  const awalan = getUraianKwitansiAwal(spt.jenisDinas);
  const namaPegawaiPertama = spt.tim[0] ? spt.tim[0].nama : '-';
  const teksDkk = spt.tim.length > 1 ? ' dkk' : '';
  const tglMulaiIndo = formatTanggalIndo(spt.tanggalMulai);
  return `${awalan} a.n. ${namaPegawaiPertama}${teksDkk} pada tanggal ${tglMulaiIndo} guna ${spt.maksud} yang bertempat di ${spt.tujuan}.`;
}

