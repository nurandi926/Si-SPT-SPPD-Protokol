import React, { useState } from 'react';
import { MasterPegawai } from '../types';
import { saveStoredMasterPegawai } from '../utils/pejabatConfig';
import {
  Users,
  Search,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck,
} from 'lucide-react';

interface MasterPegawaiManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPegawaiList: MasterPegawai[];
  onUpdateList: (newList: MasterPegawai[]) => void;
}

export const MasterPegawaiManagerModal: React.FC<MasterPegawaiManagerModalProps> = ({
  isOpen,
  onClose,
  masterPegawaiList,
  onUpdateList,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newNip, setNewNip] = useState('');
  const [newPangkat, setNewPangkat] = useState('');
  const [newJabatan, setNewJabatan] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredList = masterPegawaiList.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.nama.toLowerCase().includes(q) ||
      p.nip.toLowerCase().includes(q) ||
      (p.jabatanPegawai && p.jabatanPegawai.toLowerCase().includes(q)) ||
      (p.pangkat && p.pangkat.toLowerCase().includes(q))
    );
  });

  const handleDeletePegawai = (id: string, nama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pegawai "${nama}" dari daftar tersimpan?`)) {
      const updated = masterPegawaiList.filter((p) => p.id !== id);
      onUpdateList(updated);
      saveStoredMasterPegawai(updated, true);
      setNotification(`✅ Pegawai "${nama}" berhasil dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      alert('Nama pegawai harus diisi!');
      return;
    }

    const newEntry: MasterPegawai = {
      id: `peg_${Date.now()}`,
      nip: newNip.trim() || '-',
      nama: newNama.trim(),
      pangkat: newPangkat.trim() || '-',
      jabatanPegawai: newJabatan.trim() || '-',
    };

    const updated = [newEntry, ...masterPegawaiList];
    onUpdateList(updated);
    saveStoredMasterPegawai(updated, true);

    setNewNama('');
    setNewNip('');
    setNewPangkat('');
    setNewJabatan('');
    setIsAddingNew(false);

    setNotification(`✅ Pegawai "${newEntry.nama}" berhasil ditambahkan ke daftar tersimpan.`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                Kelola & Hapus Pegawai Tersimpan
              </h3>
              <p className="text-[11px] text-blue-200">
                Data tersimpan otomatis tersinkron antara akun Operator dan Admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifikasi */}
        {notification && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              {masterPegawaiList.length} Pegawai
            </span>
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'Batal Tambah' : 'Tambah Pegawai'}</span>
            </button>
          </div>
        </div>

        {/* Formulir Tambah Pegawai Baru (Jika diaktifkan) */}
        {isAddingNew && (
          <form onSubmit={handleAddNew} className="p-4 bg-blue-50/70 border-b border-blue-200 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold text-blue-950 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
              Tambah Data Pegawai Baru ke Tersimpan:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  placeholder="Contoh: BUDI SANTOSO, S.AP"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">NIP Pegawai</label>
                <input
                  type="text"
                  placeholder="Contoh: 19850101 201001 1 005 (atau tanda -)"
                  value={newNip}
                  onChange={(e) => setNewNip(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Pangkat / Golongan</label>
                <input
                  type="text"
                  placeholder="Contoh: Penata Muda / III a"
                  value={newPangkat}
                  onChange={(e) => setNewPangkat(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Jabatan Pegawai</label>
                <input
                  type="text"
                  placeholder="Contoh: Staf Protokol"
                  value={newJabatan}
                  onChange={(e) => setNewJabatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                Simpan ke Daftar
              </button>
            </div>
          </form>
        )}

        {/* Daftar Pegawai (Tabel List) */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                {masterPegawaiList.length === 0
                  ? 'Belum ada data pegawai tersimpan.'
                  : 'Tidak ada pegawai yang cocok dengan pencarian.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                {masterPegawaiList.length === 0
                  ? 'Data pegawai akan otomatis tersimpan saat Anda mengklik "Simpan Pegawai" di formulir SPT, atau klik "Tambah Pegawai" di atas.'
                  : 'Coba ubah kata kunci pencarian Anda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition shadow-2xs group"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1">
                      {p.nama}
                    </h5>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>NIP: <strong className="text-slate-700 font-mono">{p.nip}</strong></span>
                      {p.pangkat && p.pangkat !== '-' && (
                        <span>Pangkat: <strong className="text-slate-700">{p.pangkat}</strong></span>
                      )}
                      {p.jabatanPegawai && p.jabatanPegawai !== '-' && (
                        <span>Jabatan: <strong className="text-slate-700">{p.jabatanPegawai}</strong></span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePegawai(p.id, p.nama)}
                    className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg border border-rose-200 transition cursor-pointer flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                    title={`Hapus pegawai ${p.nama} dari daftar tersimpan`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-slate-600">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            Menghapus pegawai di sini otomatis menghapusnya dari pilihan autocomplete di semua akun operator.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
