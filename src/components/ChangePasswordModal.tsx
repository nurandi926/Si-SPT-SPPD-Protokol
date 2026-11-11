import React, { useState, useEffect } from 'react';
import { UserSession, OperatorAccount } from '../types';
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  Copy,
  Lock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  operators: OperatorAccount[];
  onUpdatePassword: (operatorName: string, newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  operators,
  onUpdatePassword,
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Cari data operator saat ini dari list
  const currentOpData = operators.find(
    (o) => o.nama.trim().toLowerCase() === (currentUser?.operator || '').trim().toLowerCase()
  );

  const currentPassword = currentOpData?.sandi || '-';

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowCurrentPassword(true);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleCopy = () => {
    if (currentPassword && currentPassword !== '-') {
      navigator.clipboard.writeText(currentPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setErrorMsg('Kata sandi baru tidak boleh kosong.');
      return;
    }

    if (trimmedNew.length < 3) {
      setErrorMsg('Kata sandi minimal 3 karakter agar aman.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok. Silakan periksa kembali!');
      return;
    }

    if (trimmedNew === currentPassword) {
      setErrorMsg('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
      return;
    }

    onUpdatePassword(currentUser.operator, trimmedNew);
    setSuccessMsg(`✅ Kata sandi akun ${currentUser.operator} berhasil diubah menjadi: "${trimmedNew}"`);
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center border border-blue-400/40 text-blue-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Kelola Kata Sandi Akun</h3>
              <p className="text-xs text-slate-300">Pantau dan ganti kata sandi operator Anda</p>
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Card Pantau Sandi Saat Ini (Fitur Pemantau Sandi Operator) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Informasi Akun Operator
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                {currentUser.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
              <span>Nama Pengguna:</span>
              <span className="font-bold text-slate-900">{currentUser.operator}</span>
            </div>

            {/* Kotak Pemantau Sandi Aktif */}
            <div className="bg-white border border-slate-300 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  Kata Sandi Aktif Saat Ini:
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                  {showCurrentPassword ? currentPassword : '••••••••'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  title={showCurrentPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition cursor-pointer"
                  title="Salin sandi ke clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              * Anda dapat memantau sandi Anda kapan saja di sini agar tidak lupa saat masuk ke perangkat lain.
            </p>
          </div>

          {/* Form Ganti Sandi Baru */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Ganti Kata Sandi Baru:</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru:
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi baru..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ulangi Kata Sandi Baru:
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Ketik ulang kata sandi baru..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Sandi Baru</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
