import * as XLSX from 'xlsx';
import { SPTItem } from '../types';
import { formatTanggalIndo, getDeskripsiLengkapKwitansi } from './formatters';

export function exportRekapSptToExcel(
  sptList: SPTItem[],
  periodeBulan: string,
  filterStatusLabel: string = 'SPD Aktif'
) {
  let grandTotalNominal = 0;

  // Hanya menampilkan:
  // 1. Uraian sesuai di kwitansi
  // 2. Total nominal sesuai di kwitansi
  // 3. Tanggal kegiatan
  const dataRows = sptList.map((spt, index) => {
    let sumTotal = 0;
    spt.tim.forEach((p) => {
      sumTotal +=
        (Number(p.uangHarian) || 0) +
        (Number(p.penginapan) || 0) +
        (Number(p.transport) || 0) +
        (Number(p.uangRepresentasi) || 0);
    });

    grandTotalNominal += sumTotal;

    const uraianKwitansi = getDeskripsiLengkapKwitansi(spt);
    const tanggalKegiatan =
      spt.tanggalMulai === spt.tanggalSelesai
        ? formatTanggalIndo(spt.tanggalMulai)
        : `${formatTanggalIndo(spt.tanggalMulai)} s/d ${formatTanggalIndo(spt.tanggalSelesai)}`;

    return {
      'No': index + 1,
      'Uraian (Sesuai di Kwitansi)': uraianKwitansi,
      'Total Nominal (Rp)': sumTotal,
      'Tanggal Kegiatan': tanggalKegiatan,
    };
  });

  // Baris Total Akumulasi
  const totalRow = {
    'No': 'TOTAL',
    'Uraian (Sesuai di Kwitansi)': `Total ${sptList.length} Perjalanan Dinas`,
    'Total Nominal (Rp)': grandTotalNominal,
    'Tanggal Kegiatan': '',
  };

  const finalRows = [...dataRows, totalRow];

  // Buat Worksheet
  const worksheet = XLSX.utils.json_to_sheet(finalRows);

  // Set lebar kolom otomatis agar rapi
  worksheet['!cols'] = [
    { wch: 6 },   // No
    { wch: 80 },  // Uraian Sesuai Kwitansi
    { wch: 22 },  // Total Nominal
    { wch: 28 },  // Tanggal Kegiatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kwitansi');

  const safePeriode = (periodeBulan || 'Semua_Bulan').replace(/[^a-zA-Z0-9]/g, '_');
  const safeFilter = filterStatusLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Rekap_Kwitansi_Perjalanan_Dinas_${safePeriode}_${safeFilter}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
