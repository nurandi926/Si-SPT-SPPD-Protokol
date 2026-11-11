import React, { useState, useRef } from 'react';
import { UserSession } from '../types';
import { LogOut, User, Users, ShieldCheck, Share2, KeyRound } from 'lucide-react';

interface HeaderProps {
  user: UserSession;
  onLogout: () => void;
  onOpenOperatorManager?: () => void;
  onOpenPejabatManager?: () => void;
  onOpenShareModal?: () => void;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenOperatorManager,
  onOpenPejabatManager,
  onOpenShareModal,
  onOpenChangePassword,
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('spt_custom_logo_v1') || null;
    } catch {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCustomLogo(result);
        try {
          localStorage.setItem('spt_custom_logo_v1', result);
        } catch {
          // Ignore quota error if too large
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setCustomLogo(null);
    try {
      localStorage.removeItem('spt_custom_logo_v1');
    } catch {
      // Ignore
    }
  };

  const DEFAULT_LOGO = '/assets/aistudio/protokl_depan_8d94f276.png';
  const isAdmin = user.role === 'ADMINISTRATOR';
  const activeLogo = customLogo || DEFAULT_LOGO;

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand with Official Protocol Logo & Custom Logo Support */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md border border-slate-700 overflow-hidden p-1">
              <img
                src={activeLogo}
                alt="Logo Bagian Protokol Lumajang"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback in case path error
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Edit Logo: Only Admin Utama (ADMINISTRATOR) can edit logo */}
            {isAdmin && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 hover:bg-blue-600 border border-slate-500 rounded-full flex items-center justify-center text-[10px] text-white shadow transition cursor-pointer"
                  title="Ganti / Upload Logo Kustom (Hanya Admin)"
                >
                  📷
                </button>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-1.5">
                SI-SPT Dashboard
              </h1>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Kab. Lumajang
              </span>
              {isAdmin && customLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="text-[10px] text-slate-400 hover:text-rose-300 underline cursor-pointer"
                  title="Kembalikan ke logo resmi protokol"
                >
                  Reset Logo
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Sistem Informasi Entri Surat Perintah Tugas & Perjalanan Dinas
            </p>
          </div>
        </div>

        {/* User Info & Actions: Bagikan Link HANYA UNTUK ADMIN UTAMA SESUAI PERMINTAAN */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isAdmin && onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700/80 hover:bg-sky-600 text-sky-100 hover:text-white border border-sky-500/60 text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Bagikan Tautan Web Aplikasi & Daftar Password Operator (Khusus Admin Utama)"
            >
              <Share2 className="w-4 h-4 text-sky-200" />
              <span className="hidden sm:inline">Bagikan Link</span>
              <span className="sm:hidden">Share</span>
            </button>
          )}

          {isAdmin && onOpenPejabatManager && (
            <button
              type="button"
              onClick={onOpenPejabatManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-600/60 text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Pengaturan Pejabat TTD SPT, PPK, PPTK & Bendahara (Khusus Admin Utama)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Pengaturan Pejabat & TTD</span>
              <span className="sm:hidden">Pejabat</span>
            </button>
          )}

          {isAdmin && onOpenOperatorManager && (
            <button
              type="button"
              onClick={onOpenOperatorManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700/60 text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Kelola & Ubah Daftar Nama Operator (Khusus Admin Utama)"
            >
              <Users className="w-4 h-4 text-blue-300" />
              <span className="hidden sm:inline">Kelola Operator</span>
              <span className="sm:hidden">Operator</span>
            </button>
          )}

          {/* Tombol Ganti / Pantau Sandi untuk Operator & Admin */}
          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 hover:text-white border border-amber-600/60 text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Pantau & Ganti Kata Sandi Akun Anda"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Ganti Sandi</span>
              <span className="sm:hidden">Sandi</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg">
            <User className="w-4 h-4 text-slate-300" />
            <span className="text-xs sm:text-sm font-semibold text-slate-100">
              {user.operator}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                user.role === 'ADMINISTRATOR'
                  ? 'bg-rose-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {user.role}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-700 text-white text-xs sm:text-sm font-medium rounded-lg transition shadow-xs cursor-pointer"
            title="Keluar dari sesi"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
};
