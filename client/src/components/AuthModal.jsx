import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, LogIn, UserPlus, X, Loader2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    username: 'hasanah',
    displayName: 'Hasanah (Anda)',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hasanah',
    role: 'Akun Utama',
  },
  {
    username: 'budi',
    displayName: 'Budi Santoso',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi',
    role: 'Teman Chat 1',
  },
  {
    username: 'siti',
    displayName: 'Siti Rahma',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti',
    role: 'Teman Chat 2',
  },
  {
    username: 'andi',
    displayName: 'Andi Pratama',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andi',
    role: 'Teman Chat 3',
  },
];

export default function AuthModal({ isOpen, onClose }) {
  const { user, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen && user) return null;

  const handleQuickLogin = async (accUsername) => {
    setLoading(true);
    setError('');
    try {
      await login(accUsername, 'password123');
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login akun demo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register(username, password, displayName);
      } else {
        await login(username, password);
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal autentikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-whatsapp-dark text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                {user ? 'Ganti Pengguna' : 'Masuk ke WhatsApp Web'}
              </h2>
              <p className="text-xs text-white/80">
                Pilih akun instan untuk langsung menguji chat realtime
              </p>
            </div>
          </div>
          {user && onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Quick 1-click accounts */}
          <div>
            <label className="text-xs font-semibold text-whatsapp-muted uppercase tracking-wider block mb-3">
              ⚡ Akun Demo Instan (Sekali Klik)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const isCurrent = user?.username === acc.username;

                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickLogin(acc.username)}
                    disabled={loading}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      isCurrent
                        ? 'border-whatsapp-green bg-whatsapp-green/5 ring-1 ring-whatsapp-green'
                        : 'border-whatsapp-border hover:border-whatsapp-green/50 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={acc.avatar}
                      alt={acc.displayName}
                      className="w-10 h-10 rounded-full bg-slate-200 border object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#111b21] truncate">
                        {acc.displayName}
                      </p>
                      <p className="text-[11px] text-whatsapp-muted truncate">
                        {isCurrent ? '● Sedang Aktif' : acc.role}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-whatsapp-border"></div>
            <span className="flex-shrink mx-4 text-xs text-whatsapp-muted uppercase">
              atau akun kustom
            </span>
            <div className="flex-grow border-t border-whatsapp-border"></div>
          </div>

          {/* Custom login / register form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-whatsapp-muted block mb-1">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rina Anggraini"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-whatsapp-border focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-whatsapp-muted block mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="username unik (tanpa spasi)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-whatsapp-border focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-whatsapp-muted block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-whatsapp-border focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-whatsapp-green hover:bg-whatsapp-dark text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" /> Daftar Akun Baru
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Masuk
                </>
              )}
            </button>

            <p className="text-center text-xs text-whatsapp-muted pt-2">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-whatsapp-green font-semibold hover:underline"
              >
                {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
