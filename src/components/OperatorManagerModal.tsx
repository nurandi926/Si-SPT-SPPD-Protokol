import React, { useState } from 'react';
import { OperatorAccount, UserRole, SPTItem } from '../types';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  KeyRound,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { getStoredWebhookUrl, GS_SPREADSHEET_ID_KEY } from '../services/googleSheetsSync';

interface OperatorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: OperatorAccount[];
  onSaveOperators: (newOperators: OperatorAccount[], nameChanges?: Record<string, string>) => void;
  onResetDefault: () => void;
  currentUser?: { operator: string; role: UserRole } | null;
  daftarSpt?: SPTItem[];
}

export const OperatorManagerModal: React.FC<OperatorManagerModalProps> = ({
  isOpen,
  onClose,
  operators,
  onSaveOperators,
  onResetDefault,
  currentUser,
  daftarSpt = [],
}) => {
  const [list, setList] = useState<OperatorAccount[]>(operators);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('OPERATOR');

  // Google Sheets integration info for inspection
  const storedSheetId = typeof window !== 'undefined' ? localStorage.getItem(GS_SPREADSHEET_ID_KEY) : '';
  const storedWebhook = typeof window !== 'undefined' ? getStoredWebhookUrl() : '';
  const spreadsheetDisplayId = storedSheetId
    ? (storedSheetId.length > 14 ? storedSheetId.substring(0, 14) + '...' : storedSheetId)
    : (storedWebhook ? 'ID Otomatis Webhook' : 'Basis Data Server');

  // New Operator Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR');

  const [notification, setNotification] = useState<string | null>(null);

  // Sync when prop changes
  React.useEffect(() => {
    setList(operators);
  }, [operators, isOpen]);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartEdit = (op: OperatorAccount) => {
    setEditingId(op.id);
    setEditName(op.nama);
    setEditPassword(op.sandi);
    setEditRole(op.role);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPassword('');
  };

  const handleSaveEdit = (id: string) => {
    const trimmedName = editName.trim();
    const trimmedPass = editPassword.trim();
    if (!trimmedName || !trimmedPass) {
      alert('Nama operator dan kata sandi tidak boleh kosong.');
      return;
    }

    const oldOp = list.find((o) => o.id === id);
    if (!oldOp) return;

    // Check duplicate name
    const isDuplicate = list.some((o) => o.id !== id && o.nama.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      alert(`Operator dengan nama "${trimmedName}" sudah terdaftar.`);
      return;
    }

    const nameChanges: Record<string, string> = {};
    if (oldOp.nama !== trimmedName) {
      nameChanges[oldOp.nama] = trimmedName;
    }

    const updated = list.map((item) =>
      item.id === id
        ? { ...item, nama: trimmedName, sandi: trimmedPass, role: editRole }
        : item
    );

    setList(updated);
    onSaveOperators(updated, Object.keys(nameChanges).length > 0 ? nameChanges : undefined);
    setEditingId(null);
    showNotice(`Berhasil memperbarui data operator "${trimmedName}".`);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    const trimmedPass = newPassword.trim();
    if (!trimmedName || !trimmedPass) {
      alert('Harap isi nama dan kata sandi operator baru.');
      return;
    }

    const isDuplicate = list.some((o) => o.nama.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      alert(`Operator dengan nama "${trimmedName}" sudah terdaftar.`);
      return;
    }

    const newOp: OperatorAccount = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nama: trimmedName,
      sandi: trimmedPass,
      role: newRole,
    };

    const updated = [...list, newOp];
    setList(updated);
    onSaveOperators(updated);
    setNewName('');
    setNewPassword('');
    setNewRole('OPERATOR');
    setIsAdding(false);
    showNotice(`Operator "${trimmedName}" berhasil ditambahkan.`);
  };

  const handleDelete = (id: string, name: string) => {
    // Check if last administrator
    const op = list.find((o) => o.id === id);
    if (op?.role === 'ADMINISTRATOR') {
      const adminCount = list.filter((o) => o.role === 'ADMINISTRATOR').length;
      if (adminCount <= 1) {
        alert('Tidak dapat menghapus Administrator terakhir. Sistem memerlukan setidaknya satu Administrator.');
        return;
      }
    }

    if (window.confirm(`Yakin ingin menghapus operator "${name}" dari sistem?`)) {
      const updated = list.filter((o) => o.id !== id);
      setList(updated);
      onSaveOperators(updated);
      showNotice(`Operator "${name}" telah dihapus.`);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Kembalikan daftar operator ke daftar bawaan awal (Candra Mardiyati, Budi Utomo, Siti Aminah, Ahmad Subarjo, Admin Utama)?'
      )
    ) {
      onResetDefault();
      setEditingId(null);
      setIsAdding(false);
      showNotice('Daftar operator telah dikembalikan ke pengaturan awal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center border border-blue-400/40">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Kelola Nama Operator & Sandi</h3>
              <p className="text-xs text-slate-300">
                Atur nama staf, operator entri SPT/SPD, dan kata sandi akses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice alert banner */}
        {notification && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-5 py-2 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Informasi:</strong> Anda dapat mengganti nama operator (misal dari contoh{' '}
              <em>Candra Mardiyati</em> menjadi nama petugas riil Anda), mengubah kata sandi, atau
              menambah operator baru. Nama yang Anda ubah akan langsung muncul di pilihan masuk
              (login) dan formulir entri SPT.
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span className="text-xs font-bold text-slate-700">
              Total Terdaftar: <span className="text-blue-700 font-extrabold">{list.length} Orang</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition cursor-pointer"
                title="Kembalikan nama operator bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Bawaan</span>
              </button>

              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Operator Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* Add New Operator Card */}
          {isAdding && (
            <form
              onSubmit={handleAddNew}
              className="bg-slate-50 border-2 border-blue-300 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" /> Form Tambah Operator Baru
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Operator
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rahmat Hidayat"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kata Sandi (Password)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: rahmat123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Peran (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  >
                    <option value="OPERATOR">Operator (Entri SPT)</option>
                    <option value="ADMINISTRATOR">Administrator (Akses Penuh)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan Operator Baru
                </button>
              </div>
            </form>
          )}

          {/* List of Operators */}
          <div className="space-y-2">
            {list.map((op, idx) => {
              const isEditing = editingId === op.id;

              if (isEditing) {
                return (
                  <div
                    key={op.id}
                    className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 space-y-2 animate-in fade-in duration-100"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>✏️ Mengubah Operator: {op.nama}</span>
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Mode Edit
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Nama Operator
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Kata Sandi
                        </label>
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Peran (Role)
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full px-2.5 py-1.5 text-xs border border-amber-400 rounded-lg bg-white"
                        >
                          <option value="OPERATOR">Operator</option>
                          <option value="ADMINISTRATOR">Administrator</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(op.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                );
              }

              const operatorSptCount = daftarSpt.filter(
                (s) => s.operator && s.operator.trim().toLowerCase() === op.nama.trim().toLowerCase()
              ).length;

              return (
                <div
                  key={op.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-[210px]">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200 shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{op.nama}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            op.role === 'ADMINISTRATOR'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {op.role}
                        </span>
                        {currentUser?.operator === op.nama && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-semibold">
                            (Anda)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <KeyRound className="w-3 h-3 text-slate-400" />
                        <span>
                          Sandi: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">{op.sandi}</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KOLOM CEK INTEGRASI GOOGLE SHEETS */}
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sheet: <strong className="text-slate-900 font-bold">data_base_spt</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">
                        Spreadsheet ID: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-slate-700">{spreadsheetDisplayId}</code>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {operatorSptCount} SPT Terdata
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(op)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer"
                      title="Ubah nama atau kata sandi operator ini"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Ubah</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(op.id, op.nama)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                      title="Hapus operator ini"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Perubahan nama tersimpan otomatis dan siap digunakan saat login.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
