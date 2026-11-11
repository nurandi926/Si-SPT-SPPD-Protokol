import React from 'react';
import { SPTItem, PejabatConfig, isKelompokUangRepresentasi } from '../types';
import {
  formatTanggalIndo,
  terbilangRupiah,
  hitungDurasiHari,
  getPpkKolom1,
  getKodeRekening,
  getDeskripsiLengkapKwitansi,
} from '../utils/formatters';
import { getStoredPejabatConfig } from '../utils/pejabatConfig';

interface DocumentRendererProps {
  spt: SPTItem;
  jenisDokumen: 'SPT' | 'SPD' | 'RINCIAN' | 'KWITANSI' | 'MERGED';
  customPejabatConfig?: PejabatConfig;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  spt,
  jenisDokumen,
  customPejabatConfig,
}) => {
  const pejabatConfig = customPejabatConfig || getStoredPejabatConfig();
  const hasRepresentasi = isKelompokUangRepresentasi(spt.kelompokJabatan);

  const namaPegawaiPertama = spt.tim[0] ? spt.tim[0].nama : '-';
  const nipPegawaiPertama = spt.tim[0] ? spt.tim[0].nip : '-';
  const tglSptIndo = formatTanggalIndo(spt.tanggalSpt);
  const tglSpdIndo = formatTanggalIndo(spt.tanggalSpd || spt.tanggalSpt);
  const tglMulaiIndo = formatTanggalIndo(spt.tanggalMulai);
  const tglSelesaiIndo = formatTanggalIndo(spt.tanggalSelesai);
  const durasiHari = hitungDurasiHari(spt.tanggalMulai, spt.tanggalSelesai);

  const kodeRekening = getKodeRekening(spt.jenisDinas);
  const ppkKolom1 = getPpkKolom1(spt.operator, spt.pejabatKomitmen);

  let hitungTotalKwitansi = 0;
  let totalHarian = 0;
  let totalInap = 0;
  let totalTrans = 0;
  let totalRepresentasi = 0;

  spt.tim.forEach((p) => {
    const h = Number(p.uangHarian) || 0;
    const i = Number(p.penginapan) || 0;
    const t = Number(p.transport) || 0;
    const r = Number(p.uangRepresentasi) || 0;
    totalHarian += h;
    totalInap += i;
    totalTrans += t;
    totalRepresentasi += r;
    hitungTotalKwitansi += h + i + t + r;
  });

  // 1. Kop Garuda Pancasila untuk Bupati & Wakil Bupati (Sesuai Lampiran andi 1)
  const KopSuratGarudaBupati = (
    <div
      style={{
        textAlign: 'center',
        marginBottom: '10px',
        width: '100%',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <img
          src="/assets/aistudio/image_1c6b5fc7.png"
          alt="Garuda Pancasila Resmi"
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'contain',
          }}
        />
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: '13pt',
          fontWeight: 'bold',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          lineHeight: '1.2',
        }}
      >
        BUPATI LUMAJANG
      </h1>
    </div>
  );

  // 2. Kop Garuda Pancasila untuk Sekretaris Daerah (Sesuai Lampiran andi 2)
  const KopSuratGarudaWakilBupati = (
    <div
      style={{
        textAlign: 'center',
        marginBottom: '10px',
        width: '100%',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <img
          src="/assets/aistudio/image_1c6b5fc7.png"
          alt="Garuda Pancasila Resmi"
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'contain',
          }}
        />
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: '13pt',
          fontWeight: 'bold',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          lineHeight: '1.2',
        }}
      >
        WAKIL BUPATI LUMAJANG
      </h1>
    </div>
  );

  // Logo Resmi Kabupaten Lumajang untuk opsi Asisten s/d Kasubag
  const LogoKabLumajang = (
    <img
      src="/assets/aistudio/Seal_of_Lumajang_Regency.svg_23617579.png"
      alt="Logo Kabupaten Lumajang"
      style={{
        position: 'absolute',
        left: '12px',
        top: '2px',
        width: '54px',
        height: '70px',
        objectFit: 'contain',
      }}
    />
  );

  // 3. Kop Surat Standar Pemkab Lumajang (untuk Asisten, Staf Ahli, Kabag, Kasubag & Staf)
  const KopSuratStandar = (
    <div
      style={{
        textAlign: 'center',
        position: 'relative',
        marginBottom: '10px',
        paddingLeft: '75px',
        paddingRight: '10px',
        minHeight: '70px',
        boxSizing: 'border-box',
        width: '100%',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {LogoKabLumajang}
      <h2
        style={{
          margin: 0,
          fontSize: '12pt',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          lineHeight: '1.2',
          textTransform: 'uppercase',
        }}
      >
        PEMERINTAH KABUPATEN LUMAJANG
      </h2>
      <h1
        style={{
          margin: '1px 0 2px 0',
          fontSize: '14pt',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          lineHeight: '1.2',
          textTransform: 'uppercase',
        }}
      >
        SEKRETARIAT DAERAH
      </h1>
      <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.3', fontWeight: 'normal' }}>
        Jalan Alun – Alun Utara Nomor 7, Kelurahan Rogotrunan, Kecamatan Lumajang,
      </p>
      <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.3', fontWeight: 'normal' }}>
        Kabupaten Lumajang, Jawa Timur 67316,
      </p>
      <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.3', fontWeight: 'normal' }}>
        Telepon (0334) 881009, Faksimile (0334) 881009,
      </p>
      <div style={{ borderBottom: '3.5px double #000000', marginTop: '5px', width: '100%' }} />
    </div>
  );

  // Footer Resmi Khusus Format Garuda (andi 1 & andi 2)
  const FooterResmiGaruda = (
    <div
      style={{
        marginTop: '35px',
        textAlign: 'center',
        fontSize: '7.5pt',
        lineHeight: '1.35',
        color: '#1e293b',
        fontFamily: 'Arial, sans-serif',
        paddingTop: '8px',
      }}
    >
      <p style={{ margin: 0 }}>
        Jalan Alun-Alun Utara Nomor 7, Kelurahan Rogotrunan, Kecamatan Lumajang, Kabupaten Lumajang, Jawa Timur 67316
      </p>
      <p style={{ margin: 0 }}>
        Telepon (0334) 8780990, Fax (0334) 887461, Pos-el : Sekda.lumajang@gmail.com Laman www.lumajangkab.go.id
      </p>
      <p style={{ margin: '3px 0 0 0', fontSize: '7pt', color: '#64748b' }}>
        Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).
      </p>
    </div>
  );

  const BatalWatermark = spt.status === 'BATAL' ? (
    <div
      style={{
        backgroundColor: '#fee2e2',
        border: '2px solid #ef4444',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '12px',
        textAlign: 'center',
        color: '#b91c1c',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '11pt', letterSpacing: '1px' }}>
        ⚠️ DOKUMEN INI TELAH DIBATALKAN (TIDAK BERLAKU)
      </div>
      {spt.alasanBatal && (
        <div style={{ fontSize: '8.5pt', marginTop: '2px', color: '#7f1d1d' }}>
          Alasan Pembatalan: {spt.alasanBatal} {spt.tanggalBatal ? `(${spt.tanggalBatal})` : ''}
        </div>
      )}
    </div>
  ) : null;

  // Jika jenisDokumen adalah 'MERGED', render semua dokumen terurut sesuai permintaan resmi:
  // Halaman 1: Kwitansi (Folio F4 2 Rangkap)
  // Halaman 2: Lampiran Rincian Biaya Perjalanan Dinas
  // Halaman 3: Surat Tugas (SPT)
  // Halaman 4: Surat Perjalanan Dinas (SPD)
  if (jenisDokumen === 'MERGED') {
    return (
      <div className="merged-pdf-container" style={{ width: '740px', margin: '0 auto' }}>
        {/* Halaman 1: Kwitansi 2 Rangkap Folio F4 */}
        <div className="document-page-wrapper">
          <DocumentRenderer spt={spt} jenisDokumen="KWITANSI" customPejabatConfig={customPejabatConfig} />
        </div>
        <div
          className="html2pdf__page-break page-break-after"
          style={{ pageBreakAfter: 'always', breakAfter: 'page', height: '1px', margin: '20px 0', border: 'none' }}
        />

        {/* Halaman 2: Lampiran Rincian Biaya Perjalanan Dinas */}
        <div className="document-page-wrapper" style={{ paddingTop: '10px' }}>
          <DocumentRenderer spt={spt} jenisDokumen="RINCIAN" customPejabatConfig={customPejabatConfig} />
        </div>
        <div
          className="html2pdf__page-break page-break-after"
          style={{ pageBreakAfter: 'always', breakAfter: 'page', height: '1px', margin: '20px 0', border: 'none' }}
        />

        {/* Halaman 3: Surat Tugas (SPT) */}
        <div className="document-page-wrapper" style={{ paddingTop: '10px' }}>
          <DocumentRenderer spt={spt} jenisDokumen="SPT" customPejabatConfig={customPejabatConfig} />
        </div>
        <div
          className="html2pdf__page-break page-break-after"
          style={{ pageBreakAfter: 'always', breakAfter: 'page', height: '1px', margin: '20px 0', border: 'none' }}
        />

        {/* Halaman 4: Surat Perjalanan Dinas (SPD) */}
        <div className="document-page-wrapper" style={{ paddingTop: '10px' }}>
          <DocumentRenderer spt={spt} jenisDokumen="SPD" customPejabatConfig={customPejabatConfig} />
        </div>
      </div>
    );
  }

  // 1. RENDER DOKUMEN SPT
  if (jenisDokumen === 'SPT') {
    const isBupatiOrWabup = spt.kelompokJabatan === 'BUPATI' || spt.kelompokJabatan === 'WAKIL_BUPATI';
    const isSekda = spt.kelompokJabatan === 'SEKRETARIS_DAERAH';
    const isGarudaFormat = isBupatiOrWabup || isSekda;

    return (
      <div
        className="document-page"
        style={{
          width: '710px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          padding: '10px 25px 25px 25px',
        }}
      >
        {/* Kop Surat: Garuda Bupati untuk Bupati & Wabup, Garuda Wakil Bupati untuk Sekda, Standar untuk lainnya */}
        {isBupatiOrWabup && KopSuratGarudaBupati}
        {isSekda && KopSuratGarudaWakilBupati}
        {!isGarudaFormat && KopSuratStandar}

        {BatalWatermark}

        <div style={{ textAlign: 'center', marginBottom: '16px', marginTop: isGarudaFormat ? '12px' : '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '11pt',
              fontWeight: 'bold',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            SURAT TUGAS
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>
            Nomor : {spt.nomorSpt}
          </p>
        </div>

        <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse', marginBottom: '12px', border: 'none' }}>
          <tbody>
            <tr style={{ border: 'none' }}>
              <td style={{ width: '15%', verticalAlign: 'top', fontWeight: 'bold', border: 'none', padding: '3px 0' }}>
                Dasar
              </td>
              <td style={{ width: '3%', verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '3px 0' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'justify', border: 'none', padding: '3px 0', lineHeight: '1.35' }}>
                {spt.dasar}
              </td>
            </tr>
            <tr style={{ border: 'none' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  padding: '12px 0 8px 0',
                  letterSpacing: '0.5px',
                  border: 'none',
                  fontSize: '10pt',
                }}
              >
                MEMERINTAHKAN :
              </td>
            </tr>
            <tr style={{ border: 'none' }}>
              <td style={{ verticalAlign: 'top', fontWeight: 'bold', border: 'none', padding: '3px 0' }}>
                Kepada
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '4px 0' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', border: 'none', padding: '3px 0' }}>
                {spt.tim.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', marginBottom: '8px', fontSize: '10pt', lineHeight: '1.35' }}>
                    <div style={{ width: '20px', fontWeight: 'normal', textAlign: 'left' }}>
                      {idx + 1}.
                    </div>
                    <div style={{ flex: 1 }}>
                      <table style={{ width: '100%', fontSize: '10pt', border: 'none', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                        <tbody>
                          <tr style={{ border: 'none' }}>
                            <td style={{ width: '28%', padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              Nama
                            </td>
                            <td style={{ width: '3%', padding: '1px 0', border: 'none', textAlign: 'center' }}>:</td>
                            <td style={{ padding: '1px 0', border: 'none', fontWeight: 'bold', textAlign: 'left', verticalAlign: 'top', textTransform: 'uppercase' }}>
                              {p.nama}
                            </td>
                          </tr>
                          <tr style={{ border: 'none' }}>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              Pangkat/Golongan
                            </td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'center' }}>:</td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              {p.pangkat}
                            </td>
                          </tr>
                          <tr style={{ border: 'none' }}>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              NIP
                            </td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'center' }}>:</td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              {p.nip}
                            </td>
                          </tr>
                          <tr style={{ border: 'none' }}>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              Jabatan
                            </td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'center' }}>:</td>
                            <td style={{ padding: '1px 0', border: 'none', textAlign: 'left', verticalAlign: 'top' }}>
                              {p.jabatanPegawai}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </td>
            </tr>
            <tr style={{ border: 'none' }}>
              <td style={{ verticalAlign: 'top', fontWeight: 'bold', paddingTop: '8px', border: 'none' }}>
                Untuk
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'center', paddingTop: '8px', border: 'none' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'justify', paddingTop: '8px', border: 'none', lineHeight: '1.4' }}>
                {spt.maksud}
              </td>
            </tr>
            <tr style={{ border: 'none' }}>
              <td style={{ verticalAlign: 'top', fontWeight: 'bold', paddingTop: '12px', border: 'none', lineHeight: '1.2' }}>
                Pembebanan
                <br />
                biaya perjalanan
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'center', paddingTop: '12px', border: 'none' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', paddingTop: '12px', border: 'none' }}>
                <table style={{ width: '100%', fontSize: '10pt', border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ border: 'none' }}>
                      <td style={{ width: '30%', padding: '1px 0', border: 'none' }}>a. Atas Beban</td>
                      <td style={{ width: '3%', padding: '1px 0', border: 'none' }}>:</td>
                      <td style={{ padding: '1px 0', border: 'none' }}>
                        Bagian Protokol dan TU Pimpinan Setda Kabupaten Lumajang
                      </td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td style={{ padding: '1px 0', border: 'none' }}>b. Kode Rekening</td>
                      <td style={{ padding: '1px 0', border: 'none' }}>:</td>
                      <td style={{ padding: '1px 0', border: 'none', fontWeight: 'bold' }}>
                        {kodeRekening}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tanda Tangan SPT Berdasarkan Format */}
        {isBupatiOrWabup ? (
          // Format Bupati Lumajang (Sesuai Lampiran andi 1)
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', fontSize: '10pt' }}>
            <div style={{ width: '300px', textAlign: 'left', lineHeight: '1.35' }}>
              <div>Ditetapkan di Lumajang</div>
              <div>pada tanggal {tglSptIndo}</div>
              <div style={{ marginTop: '5px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                BUPATI LUMAJANG,
              </div>
              
              {/* TTE QR Code Box Resmi BSrE */}
              <div style={{ margin: '14px 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    border: '1px dashed #64748b',
                    borderRadius: '4px',
                    padding: '3px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>🛡️</span>
                  <span style={{ fontSize: '6pt', fontWeight: 'bold', color: '#1e293b' }}>BSrE</span>
                </div>
                <div style={{ fontSize: '7pt', color: '#475569', lineHeight: '1.2' }}>
                  Ditandatangani secara elektronik oleh
                  <br />
                  <strong style={{ color: '#0f172a' }}>BUPATI LUMAJANG</strong>
                </div>
              </div>

              <div
                style={{
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {pejabatConfig.bupatiNama}
              </div>
            </div>
          </div>
        ) : isSekda ? (
          // Format Wakil Bupati Lumajang (Sesuai Lampiran andi 2)
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', fontSize: '10pt' }}>
            <div style={{ width: '300px', textAlign: 'left', lineHeight: '1.35' }}>
              <div>Ditetapkan di Lumajang</div>
              <div>pada tanggal {tglSptIndo}</div>
              <div style={{ marginTop: '5px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                WAKIL BUPATI LUMAJANG,
              </div>
              
              {/* TTE QR Code Box Resmi BSrE */}
              <div style={{ margin: '14px 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    border: '1px dashed #64748b',
                    borderRadius: '4px',
                    padding: '3px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>🛡️</span>
                  <span style={{ fontSize: '6pt', fontWeight: 'bold', color: '#1e293b' }}>BSrE</span>
                </div>
                <div style={{ fontSize: '7pt', color: '#475569', lineHeight: '1.2' }}>
                  Ditandatangani secara elektronik oleh
                  <br />
                  <strong style={{ color: '#0f172a' }}>WAKIL BUPATI LUMAJANG</strong>
                </div>
              </div>

              <div
                style={{
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {pejabatConfig.wakilBupatiNama}
              </div>
            </div>
          </div>
        ) : (
          // Format Standar Setda (Asisten, Kabag, Kasubag)
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '35px', fontSize: '10pt' }}>
            <div style={{ width: '320px', textAlign: 'left', lineHeight: '1.35' }}>
              <div>Ditetapkan di Lumajang</div>
              <div>pada tanggal {tglSptIndo}</div>
              <div style={{ marginTop: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                a.n. SEKRETARIS DAERAH
              </div>
              <div style={{ fontWeight: 'bold', paddingLeft: '20px' }}>Asisten Administrasi</div>
              <div style={{ fontWeight: 'bold', paddingLeft: '45px', textDecoration: 'underline' }}>u.b.</div>
              <div style={{ fontWeight: 'bold' }}>{pejabatConfig.ttdSptJabatan}</div>
              <div
                style={{
                  marginTop: '45px',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textTransform: 'uppercase',
                }}
              >
                {pejabatConfig.ttdSptNama}
              </div>
              <div style={{ fontSize: '9.5pt', marginTop: '1px' }}>
                NIP. {pejabatConfig.ttdSptNip}
              </div>
            </div>
          </div>
        )}

        {/* Footer Resmi andi 1 & andi 2 */}
        {isGarudaFormat && FooterResmiGaruda}
      </div>
    );
  }

  // 2. RENDER DOKUMEN SPD
  // PERMINTAAN RESMI: Pada semua kelompok jabatan dokumen surat perjalanan dinas kop surat sesuai dengan kelompok jabatan kasubag & staf
  if (jenisDokumen === 'SPD') {
    return (
      <div
        className="document-page"
        style={{
          width: '710px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          padding: '10px 25px 25px 25px',
        }}
      >
        {/* Kop Surat Resmi Pemkab Lumajang Sesuai Kelompok Jabatan Kasubag & Staf */}
        {KopSuratStandar}

        {BatalWatermark}

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '9pt', marginBottom: '8px', lineHeight: '1.3' }}>
          <div style={{ width: '250px' }}>
            <table style={{ width: '100%', border: 'none', fontSize: '9pt', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td style={{ padding: '1px 0', width: '35%', border: 'none' }}>Nomor</td>
                  <td style={{ padding: '1px 0', width: '5%', border: 'none' }}>:</td>
                  <td style={{ padding: '1px 0', fontWeight: 'bold', border: 'none' }}>
                    {spt.nomorSppd}
                  </td>
                </tr>
                <tr style={{ border: 'none' }}>
                  <td style={{ padding: '1px 0', border: 'none' }}>Lembar ke</td>
                  <td style={{ padding: '1px 0', border: 'none' }}>:</td>
                  <td style={{ padding: '1px 0', border: 'none' }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'underline' }}>
            SURAT PERJALANAN DINAS
          </h3>
          <h4 style={{ margin: '1px 0 0 0', fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
            ( S P D )
          </h4>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', lineHeight: '1.35', border: '1.5px solid #000000' }}>
          <tbody>
            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', width: '5%', textAlign: 'center', verticalAlign: 'top' }}>
                1.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', width: '38%', verticalAlign: 'top' }}>
                Pejabat Pembuat Komitmen
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', width: '57%', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {ppkKolom1}
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                2.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Nama / NIP Pejabat / Pegawai yang melaksanakan perjalanan dinas
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {spt.tim.map((p, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    {idx + 1}. {p.nama} / <span style={{ fontSize: '8.5pt', fontWeight: 'normal' }}>NIP. {p.nip}</span>
                  </div>
                ))}
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                3.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Jabatan, Pangkat dan Golongan dari pejabat/pegawai yang melaksanakan perjalanan dinas
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', fontWeight: 'bold', verticalAlign: 'top' }}>
                {spt.tim.map((p, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    {idx + 1}. {p.jabatanPegawai} / <span style={{ fontSize: '8.5pt', fontWeight: 'normal' }}>{p.pangkat}</span>
                  </div>
                ))}
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                4.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Perjalanan dinas yang dilaksanakan
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                <table style={{ width: '100%', fontSize: '9.5pt', border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ border: 'none' }}>
                      <td style={{ padding: 0, width: '15%', border: 'none' }}>dari</td>
                      <td style={{ padding: 0, width: '5%', border: 'none' }}>:</td>
                      <td style={{ padding: 0, fontWeight: 'bold', border: 'none' }}>Lumajang</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td style={{ padding: '2px 0 0 0', border: 'none' }}>ke</td>
                      <td style={{ padding: '2px 0 0 0', width: '5%', border: 'none' }}>:</td>
                      <td style={{ padding: '2px 0 0 0', fontWeight: 'bold', border: 'none', textTransform: 'uppercase' }}>
                        {spt.tujuan}
                      </td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td colSpan={3} style={{ padding: '4px 0 0 0', fontSize: '9pt', color: '#222', border: 'none', fontStyle: 'italic' }}>
                        Dengan menggunakan Kendaraan Dinas Roda 4
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                5.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Perjalanan dinas direncanakan
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                <strong>
                  selama {durasiHari} ( {terbilangRupiah(durasiHari).replace(' Rupiah', '')} ) hari
                </strong>
                <br />
                dari tanggal : {tglMulaiIndo}
                <br />
                s.d. tanggal : {tglSelesaiIndo}
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                6.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Maksud Perjalanan Dinas
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'justify', verticalAlign: 'top' }}>
                {spt.maksud}
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                7.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Perhitungan biaya perjalanan
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                <table style={{ width: '100%', fontSize: '9.5pt', border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ border: 'none' }}>
                      <td style={{ padding: 0, width: '30%', border: 'none' }}>Atas beban</td>
                      <td style={{ padding: 0, width: '5%', border: 'none' }}>:</td>
                      <td style={{ padding: 0, border: 'none' }}>Bagian Protokol dan TU Pimpinan</td>
                    </tr>
                    <tr style={{ border: 'none' }}>
                      <td style={{ padding: '2px 0 0 0', border: 'none' }}>Kode Rekening</td>
                      <td style={{ padding: '2px 0 0 0', border: 'none' }}>:</td>
                      <td style={{ padding: '2px 0 0 0', fontWeight: 'bold', border: 'none' }}>
                        {kodeRekening}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr style={{ border: '1px solid #000000' }}>
              <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                8.
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                Keterangan lain-lain
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px', verticalAlign: 'top' }}>
                -
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tanda Tangan SPD */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', fontSize: '9.5pt', lineHeight: '1.4' }}>
          <div style={{ width: '320px', textAlign: 'left' }}>
            <div>Dikeluarkan di : Lumajang</div>
            <div>Pada tanggal : {tglSpdIndo}</div>
            <div style={{ borderBottom: '1.5px solid #000000', margin: '4px 0', width: '100%' }} />
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', marginBottom: '45px', letterSpacing: '0.5px' }}>
              PEJABAT PEMBUAT KOMITMEN
            </div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', textAlign: 'center' }}>
              {pejabatConfig.ppkNama}
            </div>
            <div style={{ textAlign: 'center', fontSize: '9pt' }}>
              NIP. {pejabatConfig.ppkNip}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. RENDER DOKUMEN RINCIAN BIAYA PERJALANAN DINAS (LAMPIRAN SPD SESUAI FORMAT RESMI)
  if (jenisDokumen === 'RINCIAN') {
    return (
      <div
        className="document-page"
        style={{
          width: '710px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          padding: '10px 25px 25px 25px',
        }}
      >
        {BatalWatermark}

        {/* Header Keterangan Lampiran Kwitansi */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', fontSize: '8.5pt' }}>
          <table style={{ border: 'none', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
            <tbody>
              <tr style={{ border: 'none' }}>
                <td style={{ border: 'none', padding: '1px 0', width: '130px' }}>Lampiran Kwitansi Nomor</td>
                <td style={{ border: 'none', padding: '1px 4px' }}>:</td>
                <td style={{ border: 'none', padding: '1px 0' }}>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 2026
                </td>
              </tr>
              <tr style={{ border: 'none' }}>
                <td style={{ border: 'none', padding: '1px 0' }}>Tanggal</td>
                <td style={{ border: 'none', padding: '1px 4px' }}>:</td>
                <td style={{ border: 'none', padding: '1px 0', fontWeight: 'bold' }}>
                  {tglMulaiIndo}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '8pt', textAlign: 'right', color: '#444' }}>
            SPPD No: <strong>{spt.nomorSppd}</strong>
          </div>
        </div>

        {/* Judul Rincian Biaya */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '11pt',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              textDecoration: 'underline',
            }}
          >
            RINCIAN BIAYA PERJALANAN DINAS
          </h3>
        </div>

        {/* Tabel Rincian Biaya Sesuai Template PDF Lampiran SPD */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8pt',
            lineHeight: '1.25',
            border: '1.5px solid #000000',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #000000', textAlign: 'center' }}>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '4%' }}>No</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '24%' : '28%' }}>Nama / NIP</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '11%' : '13%' }}>Uang Saku</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '9%' : '11%' }}>Lama Perjalanan</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '11%' : '12%' }}>Biaya Transport</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '11%' : '12%' }}>Penginapan</th>
              {hasRepresentasi && (
                <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '12%', backgroundColor: '#fef3c7', color: '#78350f' }}>
                  Uang Representasi
                </th>
              )}
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '12%' : '14%' }}>Jumlah</th>
              <th style={{ border: '1px solid #000000', padding: '6px 4px', width: hasRepresentasi ? '10%' : '12%' }}>Tanda Terima</th>
            </tr>
          </thead>
          <tbody>
            {spt.tim.map((p, idx) => {
              const h = Number(p.uangHarian) || 0;
              const trans = Number(p.transport) || 0;
              const inap = Number(p.penginapan) || 0;
              const rep = Number(p.uangRepresentasi) || 0;
              const subtotal = h + trans + inap + (hasRepresentasi ? rep : 0);

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{p.nama}</div>
                    <div style={{ fontSize: '7.5pt', color: '#111' }}>NIP. {p.nip}</div>
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>
                    {h > 0 ? `Rp ${h.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                    {durasiHari} Hari
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>
                    {trans > 0 ? `Rp ${trans.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>
                    {inap > 0 ? `Rp ${inap.toLocaleString('id-ID')}` : '-'}
                  </td>
                  {hasRepresentasi && (
                    <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', verticalAlign: 'top', backgroundColor: '#fffbeb' }}>
                      {rep > 0 ? `Rp ${rep.toLocaleString('id-ID')}` : '-'}
                    </td>
                  )}
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                    {subtotal > 0 ? `Rp ${subtotal.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px 4px', verticalAlign: 'bottom', height: '36px' }}>
                    <div style={{ fontSize: '7.5pt', color: '#222', paddingLeft: idx % 2 === 0 ? '2px' : '18px' }}>
                      {idx + 1}. ....................
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Baris Total */}
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #000000' }}>
              <td colSpan={2} style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', textTransform: 'uppercase' }}>
                TOTAL
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right' }}>
                {totalHarian > 0 ? `Rp ${totalHarian.toLocaleString('id-ID')}` : '-'}
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 3px', textAlign: 'center' }}>
                -
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right' }}>
                {totalTrans > 0 ? `Rp ${totalTrans.toLocaleString('id-ID')}` : '-'}
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right' }}>
                {totalInap > 0 ? `Rp ${totalInap.toLocaleString('id-ID')}` : '-'}
              </td>
              {hasRepresentasi && (
                <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', backgroundColor: '#fef3c7', color: '#78350f' }}>
                  {totalRepresentasi > 0 ? `Rp ${totalRepresentasi.toLocaleString('id-ID')}` : '-'}
                </td>
              )}
              <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                Rp {hitungTotalKwitansi.toLocaleString('id-ID')}
              </td>
              <td style={{ border: '1px solid #000000', padding: '6px' }}></td>
            </tr>

            {/* Baris Terbilang */}
            <tr style={{ border: '1px solid #000000' }}>
              <td
                colSpan={hasRepresentasi ? 9 : 8}
                style={{
                  border: '1px solid #000000',
                  padding: '7px 8px',
                  backgroundColor: '#f1f5f9',
                  fontStyle: 'italic',
                  fontSize: '8.5pt',
                }}
              >
                <strong>Terbilang : </strong> {terbilangRupiah(hitungTotalKwitansi)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3 Blok Tanda Tangan Sesuai Persis dengan PDF Lampiran SPD */}
        <div
          style={{
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: '1.1fr 1.1fr 1.1fr',
            gap: '12px',
            fontSize: '8pt',
            lineHeight: '1.3',
            textAlign: 'center',
          }}
        >
          {/* Kolom 1 (Kiri): Disahkan oleh Pejabat Pembuat Komitmen */}
          <div>
            <div style={{ fontWeight: 'normal' }}>Disahkan oleh</div>
            <div style={{ fontWeight: 'bold', marginBottom: '45px' }}>
              Pejabat Pembuat Komitmen
            </div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {pejabatConfig.ppkNama}
            </div>
            <div style={{ fontSize: '7.5pt' }}>
              NIP. {pejabatConfig.ppkNip}
            </div>
          </div>

          {/* Kolom 2 (Tengah): Telah dibayar sejumlah Bendahara Pengeluaran Pembantu */}
          <div>
            <div style={{ fontWeight: 'normal' }}>Telah dibayar sejumlah</div>
            <div style={{ fontWeight: 'bold' }}>
              Rp. {hitungTotalKwitansi.toLocaleString('id-ID')}
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '32px' }}>
              Bendahara Pengeluaran Pembantu
            </div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {pejabatConfig.bendaharaNama}
            </div>
            <div style={{ fontSize: '7.5pt' }}>
              NIP. {pejabatConfig.bendaharaNip}
            </div>
          </div>

          {/* Kolom 3 (Kanan): Lumajang, ... Yang menerima */}
          <div>
            <div>Lumajang, {tglMulaiIndo}</div>
            <div style={{ fontWeight: 'normal' }}>Telah menerima jumlah uang sebesar</div>
            <div style={{ fontWeight: 'bold' }}>
              Rp. {hitungTotalKwitansi.toLocaleString('id-ID')}
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '18px' }}>Yang menerima,</div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
              {namaPegawaiPertama}
            </div>
            <div style={{ fontSize: '7.5pt' }}>
              NIP. {nipPegawaiPertama}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. RENDER DOKUMEN KWITANSI (FOLIO F4 2 RANGKAP)
  if (jenisDokumen === 'KWITANSI') {
    const uraianKwitansiLengkap = getDeskripsiLengkapKwitansi(spt);

    const OrnamenSisiKiri = (
      <td
        style={{
          width: '30px',
          borderRight: '3px double #000000',
          padding: 0,
          verticalAlign: 'top',
          background: 'repeating-linear-gradient(45deg, #ffffff, #ffffff 4px, #334155 4px, #334155 5px)',
          opacity: 0.15,
        }}
      >
        &nbsp;
      </td>
    );

    const SatuBlokKwitansi = (
      <div
        style={{
          border: '2px solid #000000',
          padding: '12px 10px',
          width: '670px',
          minHeight: '400px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ width: '100%' }}>
          <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse', marginBottom: '5px', border: 'none' }}>
            <tbody>
              <tr style={{ border: 'none' }}>
                <td style={{ width: '25%', border: 'none', padding: 0 }}>Kwitansi Nomor</td>
                <td style={{ width: '35%', border: 'none', padding: 0 }}>
                  : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 2026
                </td>
                <td style={{ width: '40%', border: 'none', textAlign: 'right', fontWeight: 'bold', padding: 0 }}>
                  Kode Rekening : {kodeRekening}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginBottom: '8px', width: '100%' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '10pt',
                fontWeight: 'bold',
                textDecoration: 'underline',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              KWITANSI
            </h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <tbody>
              <tr style={{ border: 'none' }}>
                {OrnamenSisiKiri}
                <td style={{ paddingLeft: '10px', verticalAlign: 'top', border: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '8.5pt', lineHeight: '1.4' }}>
                    <tbody>
                      <tr style={{ border: 'none' }}>
                        <td style={{ width: '20%', verticalAlign: 'top', border: 'none', padding: '2px 0' }}>
                          Sudah terima dari
                        </td>
                        <td style={{ width: '3%', verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '2px 0' }}>
                          :
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'left', border: 'none', padding: '2px 0' }}>
                          Bendahara Pengeluaran Pembantu Bagian Protokol dan TU Pimpinan Kabupaten Lumajang
                        </td>
                      </tr>

                      <tr style={{ border: 'none' }}>
                        <td style={{ verticalAlign: 'middle', border: 'none', padding: '2px 0' }}>
                          Jumlah Uang
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: '2px 0' }}>
                          :
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '2px 0', border: 'none' }}>
                          <div
                            style={{
                              border: '1.5px solid #000000',
                              backgroundColor: '#f1f5f9',
                              padding: '3px 5px',
                              fontWeight: 'bold',
                              fontSize: '9pt',
                              textAlign: 'center',
                              textTransform: 'capitalize',
                              borderRadius: '2px',
                            }}
                          >
                            {terbilangRupiah(hitungTotalKwitansi)}
                          </div>
                        </td>
                      </tr>

                      <tr style={{ border: 'none' }}>
                        <td style={{ verticalAlign: 'top', paddingTop: '4px', border: 'none' }}>
                          Keperluan
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '4px', border: 'none' }}>
                          :
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'justify', paddingTop: '4px', border: 'none' }}>
                          {uraianKwitansiLengkap}
                          <div style={{ marginTop: '4px', fontSize: '8.5pt', lineHeight: '1.25' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Dengan Perincian :</div>
                            <table style={{ width: '210px', borderCollapse: 'collapse', fontSize: '8.5pt', border: 'none', marginLeft: '6px' }}>
                              <tbody>
                                <tr style={{ border: 'none' }}>
                                  <td style={{ padding: '1px 0', border: 'none', width: '35%' }}>Bruto</td>
                                  <td style={{ border: 'none', width: '15%', textAlign: 'right' }}>: Rp</td>
                                  <td style={{ textAlign: 'right', border: 'none', fontWeight: 'bold', width: '50%' }}>
                                    {hitungTotalKwitansi.toLocaleString('id-ID')},00
                                  </td>
                                </tr>
                                <tr style={{ border: 'none' }}>
                                  <td style={{ padding: '1px 0', border: 'none' }}>Pajak</td>
                                  <td style={{ border: 'none', textAlign: 'right' }}>: Rp</td>
                                  <td style={{ textAlign: 'right', border: 'none', width: '50%' }}>-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
                                </tr>
                                <tr style={{ borderTop: '1.5px solid #000000' }}>
                                  <td style={{ padding: '1px 0 0 0', border: 'none', fontWeight: 'bold' }}>Netto</td>
                                  <td style={{ border: 'none', paddingTop: '1px', textAlign: 'right', fontWeight: 'bold' }}>: Rp</td>
                                  <td style={{ textAlign: 'right', border: 'none', fontWeight: 'bold', paddingTop: '1px', width: '50%' }}>
                                    {hitungTotalKwitansi.toLocaleString('id-ID')},00
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>

                      <tr style={{ border: 'none' }}>
                        <td style={{ verticalAlign: 'middle', fontWeight: 'bold', border: 'none', paddingTop: '6px' }}>
                          Terbilang
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', border: 'none', paddingTop: '6px' }}>
                          Rp
                        </td>
                        <td style={{ verticalAlign: 'middle', paddingTop: '6px', border: 'none' }}>
                          <div
                            style={{
                              border: '1.5px solid #000000',
                              backgroundColor: '#e2e8f0',
                              width: '170px',
                              padding: '3px',
                              fontWeight: 900,
                              fontSize: '10pt',
                              textAlign: 'center',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {hitungTotalKwitansi.toLocaleString('id-ID')},00
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3 Tanda Tangan Kwitansi */}
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '8.5pt', textAlign: 'right', marginBottom: '4px', paddingRight: '55px', fontStyle: 'italic' }}>
            Lunas dibayar : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '8pt', lineHeight: '1.25', textAlign: 'center', width: '100%' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Mengetahui,</div>
              <div style={{ fontWeight: 'bold', marginBottom: '28px', marginTop: '1px' }}>PPTK</div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                {pejabatConfig.pptkNama}
              </div>
              <div style={{ fontSize: '7pt' }}>NIP. {pejabatConfig.pptkNip}</div>
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>Setuju dibayar,</div>
              <div style={{ fontWeight: 'bold', marginBottom: '28px', marginTop: '1px' }}>
                Bendahara Pengeluaran Pembantu
              </div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                {pejabatConfig.bendaharaNama}
              </div>
              <div style={{ fontSize: '7pt' }}>NIP. {pejabatConfig.bendaharaNip}</div>
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>Lumajang, {tglMulaiIndo}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '28px', marginTop: '1px' }}>Yang menerima,</div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                {namaPegawaiPertama}
              </div>
              <div style={{ fontSize: '7pt' }}>
                NIP. {nipPegawaiPertama !== '-' ? nipPegawaiPertama : '...................................'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div
        className="document-page"
        style={{
          width: '670px',
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingTop: '5px',
        }}
      >
        {BatalWatermark}
        {SatuBlokKwitansi}

        {/* Garis Potong/Lipat Pas Tengah Kertas Folio F4 */}
        <div
          style={{
            borderBottom: '2px dashed #000000',
            margin: '18px 0',
            textAlign: 'center',
            fontSize: '7.5pt',
            color: '#334155',
            fontFamily: 'Arial',
            fontStyle: 'italic',
            letterSpacing: '2px',
            width: '100%',
          }}
        >
          ✂️ LIPAT ATAU GUNTING DI SINI (PAS TENGAH KERTAS FOLIO F4) ✂️
        </div>

        {SatuBlokKwitansi}

        <div style={{ borderBottom: '2px dashed #000000', marginTop: '18px', width: '100%' }} />
      </div>
    );
  }

  return null;
};
