import React, { useState, useRef } from 'react';
import { SPTItem, PejabatConfig } from '../types';
import { DocumentRenderer } from './DocumentRenderer';
import { Printer, Download, X, CheckCircle, Loader2, FileStack } from 'lucide-react';

declare const html2pdf: any;

interface DocumentPreviewModalProps {
  spt: SPTItem | null;
  initialDoc?: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED';
  customPejabatConfig?: PejabatConfig;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  spt,
  initialDoc = 'MERGED',
  customPejabatConfig,
  onClose,
}) => {
  const [currentTab, setCurrentTab] = useState<'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED'>(
    initialDoc as any
  );
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!spt) return null;

  // Single-Click Unified Merged PDF Download (Kwitansi + Lampiran Rincian + SPT + SPD)
  const handleDownloadMergedPdf = async () => {
    setIsExporting('Menyiapkan berkas merger lengkap (1. Kwitansi + 2. Rincian + 3. SPT + 4. SPD)...');
    try {
      if (currentTab !== 'MERGED') {
        setCurrentTab('MERGED');
        await new Promise((r) => setTimeout(r, 500));
      }

      const element = printAreaRef.current;
      if (!element) return;

      const cleanNum = spt.nomorSppd.replace(/[\/.]/g, '_');
      const filename = `Dokumen_Lengkap_Kwitansi_Rincian_SPT_SPD_${cleanNum}.pdf`;

      if (typeof html2pdf !== 'undefined') {
        const totalHeight = element.scrollHeight;
        const opt = {
          margin: [8, 8, 8, 8],
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
            windowHeight: totalHeight + 1000,
            windowWidth: 850,
          },
          jsPDF: { unit: 'pt', format: [612, 936], orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'], after: ['.html2pdf__page-break', '.page-break-after'] },
        };

        try {
          const worker = html2pdf().set(opt).from(element);
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
          setSuccessMsg('✅ Dokumen merger lengkap (1. Kwitansi + 2. Rincian + 3. SPT + 4. SPD) berhasil diunduh!');
        } catch (blobErr) {
          console.warn('Fallback to direct save:', blobErr);
          await html2pdf().set(opt).from(element).save();
          setSuccessMsg('✅ Dokumen berhasil diunduh!');
        }
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        // Fallback clean print iframe
        handlePrint();
      }
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback clean print iframe
      handlePrint();
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = () => {
    const element = printAreaRef.current;
    if (!element) {
      window.print();
      return;
    }

    const cleanNum = spt.nomorSppd.replace(/[\/.]/g, '_');
    const docTitle = `Dokumen_Perjalanan_Dinas_${cleanNum}`;

    // Buat iframe cetak terisolasi agar tidak terpotong oleh overflow/modal di halaman pertama
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
                margin: 8mm 10mm;
              }
              * {
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #000000;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .html2pdf__page-break, .page-break-after {
                page-break-after: always !important;
                break-after: page !important;
                display: block !important;
                clear: both !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
              .document-page-wrapper {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                width: 100% !important;
              }
              .document-page {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
              }
              table {
                page-break-inside: avoid;
              }
              tr {
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
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
        }, 3000);
      }, 400);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pratinjau Dokumen Dinas Folio F4
              </h3>
              <p className="text-xs text-slate-300">
                SPT: <span className="text-blue-300 font-semibold">{spt.nomorSpt}</span> | SPPD:{' '}
                <span className="text-amber-300 font-semibold">{spt.nomorSppd}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Urutan Tab Sesuai Permintaan: 1. Kwitansi 2. Rincian 3. SPT 4. SPD */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg flex-wrap">
            <button
              onClick={() => setCurrentTab('MERGED')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition flex items-center gap-1.5 ${
                currentTab === 'MERGED'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileStack className="w-4 h-4" />
              <span>Semua Dokumen Tergabung</span>
            </button>

            <button
              onClick={() => setCurrentTab('KWITANSI')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
                currentTab === 'KWITANSI'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Kwitansi
            </button>

            <button
              onClick={() => setCurrentTab('RINCIAN')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
                currentTab === 'RINCIAN'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Lampiran Rincian (SPD)
            </button>

            <button
              onClick={() => setCurrentTab('SPT')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
                currentTab === 'SPT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Surat Tugas (SPT)
            </button>

            <button
              onClick={() => setCurrentTab('SPD')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
                currentTab === 'SPD'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Surat Perjalanan Dinas (SPD)
            </button>
          </div>

          {/* SINGLE PRIMARY DOWNLOAD BUTTON AS REQUESTED: 1 KLIK TERDOWNLOAD LENGKAP */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleDownloadMergedPdf}
              disabled={isExporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              title="Unduh 1. Kwitansi, 2. Rincian, 3. SPT, dan 4. SPD tergabung dalam 1 file PDF sekaligus"
            >
              <Download className="w-4 h-4 text-purple-200" />
              <span>Download 1-Klik PDF Lengkap (1. Kwitansi + 2. Rincian + 3. SPT + 4. SPD)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition cursor-pointer"
              title="Cetak langsung menggunakan dialog print (Simpan sebagai PDF)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Print)</span>
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {isExporting && (
          <div className="bg-purple-50 border-b border-purple-200 px-5 py-2 text-xs text-purple-700 flex items-center gap-2 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            {isExporting}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-700 flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* Paper Sheet View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div
            id="printable-document"
            ref={printAreaRef}
            className="bg-white shadow-xl rounded-sm border border-slate-300 transition-all"
            style={{
              width: '760px',
              minHeight: '940px',
              padding: currentTab === 'KWITANSI' ? '15px' : '20px 20px',
            }}
          >
            <DocumentRenderer
              spt={spt}
              jenisDokumen={currentTab}
              customPejabatConfig={customPejabatConfig}
            />
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            💡 Berkas merger tersusun rapi: Halaman 1: Kwitansi 2 Rangkap Folio F4, Halaman 2: Lampiran Rincian Biaya, Halaman 3: Surat Tugas (SPT), dan Halaman 4: Surat Perjalanan Dinas (SPD).
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded hover:bg-slate-200"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
