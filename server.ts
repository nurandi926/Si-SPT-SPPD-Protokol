import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'sync-config.json');
const SPT_FILE = path.join(DATA_DIR, 'spt-data.json');

// Pastikan folder data tersedia
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data dir:', e);
  }
}

app.use(express.json({ limit: '15mb' }));

// 1. API: Ambil Konfigurasi Sinkronisasi Global (Untuk Semua Perangkat: Laptop, HP, & Semua Operator)
app.get('/api/config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return res.json(data);
    }
    return res.json({
      webhookUrl: '',
      spreadsheetId: '',
      defaultDriveLink: '',
      loginNoticeText: '',
      hasConfig: false,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. API: Simpan Konfigurasi Sinkronisasi Global (Dijalankan saat Admin memasukkan Webhook Google Sheets)
// Sekali disimpan, seluruh perangkat yang membuka web app otomatis tersinkron!
app.post('/api/config', (req, res) => {
  try {
    const { webhookUrl, spreadsheetId, defaultDriveLink, loginNoticeText } = req.body;
    let existing: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (e) {}
    }

    const updated = {
      ...existing,
      webhookUrl: webhookUrl !== undefined ? String(webhookUrl).trim() : existing.webhookUrl || '',
      spreadsheetId: spreadsheetId !== undefined ? String(spreadsheetId).trim() : existing.spreadsheetId || '',
      defaultDriveLink: defaultDriveLink !== undefined ? String(defaultDriveLink).trim() : existing.defaultDriveLink || '',
      loginNoticeText: loginNoticeText !== undefined ? String(loginNoticeText).trim() : existing.loginNoticeText || '',
      hasConfig: Boolean(webhookUrl || existing.webhookUrl),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    console.error('Error saving config:', err);
    return res.status(500).json({ error: err.message });
  }
});

const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');

const DEFAULT_OPERATOR_ACCOUNTS_SERVER = [
  { id: 'op_alfan', nama: 'ALFAN BAHTIAR', sandi: 'alfan123', role: 'OPERATOR' },
  { id: 'op_kurniawan', nama: 'KURNIAWAN', sandi: 'kurniawan123', role: 'OPERATOR' },
  { id: 'op_umi', nama: 'UMI MAFTUKHAH', sandi: 'umi123', role: 'OPERATOR' },
  { id: 'op_admin', nama: 'ADMIN UTAMA', sandi: 'admin123', role: 'ADMINISTRATOR' },
];

// 3. API: Database SPT Terpusat (Smart Merge & Deduplikasi agar tidak terekam 2 nomor & nama tidak hilang)
app.get('/api/spt', (req, res) => {
  try {
    if (fs.existsSync(SPT_FILE)) {
      const data = JSON.parse(fs.readFileSync(SPT_FILE, 'utf8'));
      if (Array.isArray(data)) return res.json(data);
    }
    return res.json([]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/spt', (req, res) => {
  try {
    const incoming = req.body;

    // Jika dikirim array kosong [], berarti permintaan mengosongkan seluruh database SPT
    if (Array.isArray(incoming) && incoming.length === 0) {
      fs.writeFileSync(SPT_FILE, JSON.stringify([], null, 2), 'utf8');
      return res.json({ success: true, count: 0, data: [] });
    }

    let existingList: any[] = [];
    if (fs.existsSync(SPT_FILE)) {
      try {
        existingList = JSON.parse(fs.readFileSync(SPT_FILE, 'utf8'));
      } catch (e) {}
    }

    const itemsToMerge: any[] = Array.isArray(incoming) ? incoming : [incoming];
    const mergedList: any[] = [...existingList];

    itemsToMerge.forEach((newItem) => {
      if (!newItem) return;
      const newItemOp = (newItem.operator || '').trim().toLowerCase();
      const idKey = (newItem.idPerjalanan || '').trim().toLowerCase();
      const sppdKey = (newItem.nomorSppd || '').trim().toLowerCase();
      const sptKey = (newItem.nomorSpt || '').trim().toLowerCase();
      const isSptKosongan = sptKey.includes('/   /') || sptKey.includes('/  /');

      // PENTING: Hanya cocokkan sebagai item yang sama jika operatornya sama atau salah satunya ADMIN UTAMA
      // JANGAN PERNAH menimpa data operator A dengan data dari operator B!
      const existingIndex = mergedList.findIndex((ex) => {
        const exOp = (ex.operator || '').trim().toLowerCase();
        const exId = (ex.idPerjalanan || '').trim().toLowerCase();
        const exSppd = (ex.nomorSppd || '').trim().toLowerCase();
        const exSpt = (ex.nomorSpt || '').trim().toLowerCase();

        const isSameOperator =
          exOp === newItemOp ||
          exOp === 'admin utama' ||
          newItemOp === 'admin utama' ||
          !exOp ||
          !newItemOp;

        if (!isSameOperator) {
          // Berbeda operator! Pastikan tidak menimpa berkas operator lain!
          return false;
        }

        if (idKey && exId && idKey === exId) return true;
        if (sppdKey && exSppd && sppdKey === exSppd) return true;
        if (!isSptKosongan && sptKey && exSpt && sptKey === exSpt) return true;
        return false;
      });

      if (existingIndex >= 0) {
        const current = mergedList[existingIndex];
        // 1. Preservasi Operator: Jika current memiliki operator spesifik (bukan ADMIN UTAMA),
        // dan incoming adalah ADMIN UTAMA atau kosong (karena dari Google Sheets 6 kolom),
        // pertahankan operator asli!
        const preserveOperator =
          current.operator &&
          current.operator.trim().toUpperCase() !== 'ADMIN UTAMA' &&
          (!newItem.operator || newItem.operator.trim().toUpperCase() === 'ADMIN UTAMA');

        // 2. Preservasi Tim Pegawai: Jangan biarkan sync yang kekurangan data menimpa NIP, Pangkat, dan Jabatan yang valid
        let finalTim = newItem.tim || current.tim;
        const incomingHasGeneric =
          !newItem.tim ||
          newItem.tim.length === 0 ||
          newItem.tim.every((p: any) => !p.nama || p.nama.trim().toLowerCase() === 'pegawai pelaksana');
        const currentHasReal =
          current.tim &&
          current.tim.length > 0 &&
          current.tim.some((p: any) => p.nama && p.nama.trim().toLowerCase() !== 'pegawai pelaksana');

        if (incomingHasGeneric && currentHasReal) {
          finalTim = current.tim;
        } else if (current.tim && current.tim.length > 0 && newItem.tim && newItem.tim.length > 0) {
          finalTim = newItem.tim.map((nPeg: any, idx: number) => {
            const matchedCurrent =
              current.tim.find(
                (cPeg: any) =>
                  cPeg.nama &&
                  nPeg.nama &&
                  cPeg.nama.trim().toLowerCase() === nPeg.nama.trim().toLowerCase()
              ) || current.tim[idx];

            if (!matchedCurrent) return nPeg;

            return {
              ...nPeg,
              nip:
                nPeg.nip && nPeg.nip !== '-'
                  ? nPeg.nip
                  : matchedCurrent.nip || nPeg.nip || '-',
              pangkat:
                nPeg.pangkat &&
                nPeg.pangkat !== '-' &&
                nPeg.pangkat !== 'Penata / III c'
                  ? nPeg.pangkat
                  : matchedCurrent.pangkat || nPeg.pangkat || '-',
              jabatanPegawai:
                nPeg.jabatanPegawai &&
                nPeg.jabatanPegawai !== '-' &&
                nPeg.jabatanPegawai !== 'Pelaksana Tugas'
                  ? nPeg.jabatanPegawai
                  : matchedCurrent.jabatanPegawai || nPeg.jabatanPegawai || '-',
            };
          });
        }

        mergedList[existingIndex] = {
          ...current,
          ...newItem,
          tim: finalTim,
          operator: preserveOperator
            ? current.operator
            : newItem.operator || current.operator || 'ADMIN UTAMA',
        };
      } else {
        // Record Baru: Jika nomor SPPD bentrok dengan record lain, auto-increment agar tidak saling menimpa
        let assignedItem = { ...newItem };
        const sppdCollides = mergedList.some(
          (ex) => ex.nomorSppd && ex.nomorSppd.trim().toLowerCase() === sppdKey
        );
        if (sppdCollides) {
          let maxSppdNum = 0;
          mergedList.forEach((it) => {
            if (it.nomorSppd) {
              const m = it.nomorSppd.match(/\/\s*(\d{1,4})\s*\//);
              if (m) {
                const val = parseInt(m[1], 10);
                if (!isNaN(val) && val > maxSppdNum) maxSppdNum = val;
              }
            }
          });
          const nextCounter = String(maxSppdNum + 1).padStart(3, '0');
          assignedItem.nomorSppd = `000.1.2.3/${nextCounter}/417.17/2026`;
          assignedItem.idPerjalanan = `ST-${nextCounter}`;
        }

        mergedList.unshift(assignedItem);
      }
    });

    fs.writeFileSync(SPT_FILE, JSON.stringify(mergedList, null, 2), 'utf8');

    // Auto-Forward langsung ke Webhook Google Sheets dari server backend (tanpa perlu sinkronisasi manual)
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const webhookUrl = (cfg?.webhookUrl || '').trim();
        if (webhookUrl && webhookUrl.startsWith('http')) {
          const defaultDrive = cfg.defaultDriveLink || '-';
          itemsToMerge.forEach((itemToPush) => {
            if (!itemToPush) return;
            const namaPegawaiAll = Array.isArray(itemToPush.tim)
              ? itemToPush.tim.map((p: any) => p.nama).filter(Boolean).join(', ')
              : '-';

            let total = 0;
            if (Array.isArray(itemToPush.tim)) {
              itemToPush.tim.forEach((p: any) => {
                total +=
                  (Number(p.uangHarian) || 0) +
                  (Number(p.penginapan) || 0) +
                  (Number(p.transport) || 0) +
                  (Number(p.uangRepresentasi) || 0);
              });
            }

            const gsPayload = {
              action: 'save_spt',
              idPerjalanan: itemToPush.idPerjalanan || `ST-${Date.now().toString().slice(-4)}`,
              tanggalPengajuan: itemToPush.tanggalSpt,
              namaPegawai: namaPegawaiAll || '-',
              tujuanDinas: itemToPush.tujuan || '-',
              nomorSt: itemToPush.nomorSpt || '-',
              linkFolderDrive: itemToPush.linkFolderDrive || defaultDrive,

              nomorSpt: itemToPush.nomorSpt,
              nomorSppd: itemToPush.nomorSppd,
              tanggalKegiatan: itemToPush.tanggalMulai,
              namaUtama: itemToPush.tim && itemToPush.tim[0] ? itemToPush.tim[0].nama : '-',
              uraianKwitansi: itemToPush.maksud || '-',
              totalNominal: total,
              kategori: itemToPush.jenisDinas === 'BIASA' ? 'Dinas Biasa' : 'Dinas Dalam Kota',
              kodeRekening: '5.1.02.04.01.0001',
              operator: itemToPush.operator,
            };

            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(gsPayload),
            }).catch((e) => console.warn('Server auto-push to Google Sheets error:', e));
          });
        }
      } catch (e) {}
    }
    return res.json({ success: true, count: mergedList.length, data: mergedList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset SPT Terpusat (Untuk membersihkan duplikasi dan memulai nomor SPT/SPPD dari 001)
app.post('/api/spt/reset', (req, res) => {
  try {
    fs.writeFileSync(SPT_FILE, JSON.stringify([], null, 2), 'utf8');
    return res.json({ success: true, count: 0, data: [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset Total Database (SPT, Master Pegawai, dan Sesi) agar sistem 100% bersih dari awal
app.post('/api/database/reset-total', (req, res) => {
  try {
    fs.writeFileSync(SPT_FILE, JSON.stringify([], null, 2), 'utf8');
    fs.writeFileSync(PEGAWAI_FILE, JSON.stringify([], null, 2), 'utf8');
    return res.json({
      success: true,
      message: 'Database SPT dan Pegawai berhasil dibersihkan total ke 0.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API Operators (Agar ganti sandi oleh operator langsung tersimpan di server)
app.get('/api/operators', (req, res) => {
  try {
    if (fs.existsSync(OPERATORS_FILE)) {
      const data = JSON.parse(fs.readFileSync(OPERATORS_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return res.json(data);
    }
    fs.writeFileSync(OPERATORS_FILE, JSON.stringify(DEFAULT_OPERATOR_ACCOUNTS_SERVER, null, 2), 'utf8');
    return res.json(DEFAULT_OPERATOR_ACCOUNTS_SERVER);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/operators', (req, res) => {
  try {
    const list = req.body;
    if (Array.isArray(list)) {
      fs.writeFileSync(OPERATORS_FILE, JSON.stringify(list, null, 2), 'utf8');
      return res.json({ success: true, count: list.length });
    }
    return res.status(400).json({ error: 'Body must be array of operator accounts' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. API: Master Pegawai Terpusat (Otomatis tersimpan & tersinkron antara Operator & Akun Admin)
// 4. API: Master Pegawai Terpusat (Dimulai kosong dari awal sesuai permintaan)
const PEGAWAI_FILE = path.join(DATA_DIR, 'master-pegawai.json');

const DEFAULT_PEGAWAI_SERVER: any[] = [];

app.get('/api/pegawai', (req, res) => {
  try {
    if (fs.existsSync(PEGAWAI_FILE)) {
      const data = JSON.parse(fs.readFileSync(PEGAWAI_FILE, 'utf8'));
      if (Array.isArray(data)) {
        return res.json(data);
      }
    }
    fs.writeFileSync(PEGAWAI_FILE, JSON.stringify([], null, 2), 'utf8');
    return res.json([]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/pegawai', (req, res) => {
  try {
    const items = req.body;
    if (Array.isArray(items)) {
      fs.writeFileSync(PEGAWAI_FILE, JSON.stringify(items, null, 2), 'utf8');
      return res.json({ success: true, count: items.length });
    }
    return res.status(400).json({ error: 'Body must be an array of master pegawai' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset Master Pegawai Terpusat ke Kosong dari awal
app.post('/api/pegawai/reset', (req, res) => {
  try {
    fs.writeFileSync(PEGAWAI_FILE, JSON.stringify([], null, 2), 'utf8');
    return res.json({ success: true, reset: true, data: [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Jalankan Server dengan Vite Middleware di mode Dev / Static Serve di mode Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SI-SPT Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
