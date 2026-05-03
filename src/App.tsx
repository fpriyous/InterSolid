import { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Calendar, 
  CheckCircle, 
  RotateCw, 
  Vote, 
  FileText, 
  MessageSquare, 
  Bell, 
  Sun, 
  Moon,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  X,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc, 
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from './lib/firebase';
import SplashCursor from './components/SplashCursor';
import FadeContent from './components/FadeContent';
import FocusText from './components/FocusText';

// Import Feature Components
import Kalender from './components/Kalender';
import List from './components/List';
import SpinWheel from './components/SpinWheel';
import Voting from './components/Voting';
import Notulensi from './components/Notulensi';
import Aspirasi from './components/Aspirasi';
import Pengumuman from './components/Pengumuman';
import Memory from './components/Memory';
import Dashboard from './components/Dashboard';
import RandomMemoryPopup from './components/RandomMemoryPopup';

type MenuId = string;

interface MenuItem {
  id: MenuId;
  label: string;
  icon: any;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Beranda', icon: LayoutGrid, description: 'Pantau ringkasan aktivitas kelas hari ini.' },
  { id: 'kalender', label: 'Kalender', icon: Calendar, description: 'Kelola data dan informasi Kalender di sini.' },
  { id: 'notulensi', label: 'Notulensi', icon: FileText, description: 'Catatan hasil rapat dan bahan materi.' },
  { id: 'aspirasi', label: 'Aspirasi', icon: MessageSquare, description: 'Kirim pesan dan saran secara anonim.' },
  { id: 'pengumuman', label: 'Pengumuman', icon: Bell, description: 'Informasi terbaru untuk seluruh anggota.' },
  { id: 'memory', label: 'Memories', icon: ImageIcon, description: 'Bagikan dan simpan momen indah kelas kita.' },
  { id: 'absen', label: 'List', icon: CheckCircle, description: 'Data iuran dan kehadiran anggota kelas.' },
  { id: 'voting', label: 'Voting', icon: Vote, description: 'Lakukan pemungutan suara secara digital.' },
  { id: 'spin', label: 'Spin', icon: RotateCw, description: 'Pilih anggota secara acak atau bagi kelompok.' },
];

const ADMIN_PIN = '313';

export default function App() {
  const [activePage, setActivePage] = useState<MenuId>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark';
    }
    return false;
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isDewa = user?.email?.toLowerCase() === 'fpriyous@gmail.com';
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  });

  // Effective Admin status (Dewa is always Admin)
  const effectiveAdmin = isAdmin || isDewa;

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [notification, setNotification] = useState<{ id: string, message: string, type?: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin.toString());
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const notif = snapshot.docs[0];
        const data = notif.data();
        setNotification({ 
          id: notif.id, 
          message: data.message,
          type: data.type 
        });
      }
    }, (error) => {
      console.warn("Notifications listener error (ignoring):", error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Removed automatic isAdmin here, let it be handled by effectiveAdmin or manual toggle
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleAdminAuth = async () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      
      if (user) {
        try {
          console.log("Saving admin record for user:", user.uid);
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            uid: user.uid,
            activatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("Admin record created/updated successfully.");
        } catch (e: any) {
          console.error("Gagal mendaftarkan admin di database:", e);
        }
      } else {
        alert('PERINGATAN: Anda belum login Google. Status Admin AKTIF di tampilan (UI), tetapi Anda mungkin tidak bisa menghapus data di database sebelum login.');
      }
      
      setShowPinModal(false);
      setPinInput('');
    } else {
      alert('PIN Salah!');
      setPinInput('');
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    const provider = new GoogleAuthProvider();
    // Tambahkan scope untuk akses Kalender
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    try {
      const result = await signInWithPopup(auth, provider);
      // Ambil Access Token untuk API Google
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('googleAccessToken', token);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelled by user (popup closed)');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Multiple login requests detected, one was cancelled.');
      } else {
        console.error('Login failed', error);
        alert('Gagal Login. Jika muncul pesan "Google belum memverifikasi", klik "Lanjutan" -> "Buka (Tidak Aman)".');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'kalender': return <Kalender user={user} isAdmin={effectiveAdmin} />;
      case 'absen': return <List isAdmin={effectiveAdmin} user={user} />;
      case 'spin': return <SpinWheel user={user} />;
      case 'voting': return <Voting isAdmin={effectiveAdmin} user={user} />;
      case 'notulensi': return <Notulensi isAdmin={effectiveAdmin} user={user} />;
      case 'aspirasi': return <Aspirasi isAdmin={effectiveAdmin} isDewa={isDewa} user={user} />;
      case 'memory': return <Memory isAdmin={effectiveAdmin} user={user} />;
      case 'pengumuman': return <Pengumuman isAdmin={effectiveAdmin} user={user} />;
      default: return <Dashboard user={user} setActivePage={setActivePage} />;
    }
  };

  const currentItem = MENU_ITEMS.find(m => m.id === activePage);

  return (
    <div className="min-h-screen bg-[#f2f7fc] dark:bg-[#0e161e] text-[#1f2b36] dark:text-[#ddeaf2] transition-colors duration-300 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden pb-20 md:pb-0">
      <SplashCursor />
      
      {/* Header */}
      <header className="sticky top-0 z-50 h-[62px] bg-white/90 dark:bg-[#141e26]/95 backdrop-blur-md border-b border-blue-100 dark:border-blue-900/30 px-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActivePage('home')}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight leading-tight">InterSolid</h1>
            <span className="text-[10px] uppercase tracking-widest text-[#9aaabb] font-medium">Portal Kelas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  activePage === item.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-[#6b7d91] hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            <button 
              onClick={() => effectiveAdmin ? (isDewa ? null : setIsAdmin(false)) : setShowPinModal(true)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                effectiveAdmin 
                  ? (isDewa ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400') 
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={isDewa ? "Akses Dewa Aktif" : effectiveAdmin ? "Akses Admin Aktif" : "Buka Akses Admin"}
            >
              {effectiveAdmin ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            </button>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Ganti Tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            
            {user ? (
              <div className="flex items-center gap-3 ml-2">
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || ''} 
                  className="w-8 h-8 rounded-full border border-blue-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" 
                  onClick={handleLogout}
                  title="Klik untuk Logout"
                />
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="ml-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                <UserIcon size={14} /> Login Google
              </button>
            )}
          </nav>

          {/* User Avatar on Mobile */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-7 h-7 rounded-full border border-blue-200 cursor-pointer" 
                onClick={() => setIsMenuOpen(true)}
              />
            )}
            {!user && (
              <button 
                onClick={handleLogin}
                className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"
              >
                <UserIcon size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1160px] mx-auto p-6 md:p-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activePage !== 'home' && (
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Fitur Modern</span>
                  <h2 className="font-serif text-3xl font-bold">{currentItem?.label}</h2>
                  <p className="text-sm text-gray-400 mt-1">{currentItem?.description}</p>
                </div>
                <button 
                  onClick={() => setActivePage('home')}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-[#1a252f] border border-blue-50 dark:border-blue-900/20 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 transition-all md:w-fit"
                >
                  <ArrowLeft size={16} /> Beranda
                </button>
              </div>
            )}

            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[92%] max-w-[440px] bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 px-2 py-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-between gap-1 overflow-hidden">
        <button
          onClick={() => setActivePage('home')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-[2rem] flex-1 transition-all duration-300 ${
            activePage === 'home' ? 'text-blue-500' : 'text-gray-400 active:scale-95'
          }`}
        >
          {activePage === 'home' && (
            <motion.div layoutId="nav-pill" className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/20 rounded-[1.8rem]" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-1">
             <LayoutGrid size={20} fill={activePage === 'home' ? "currentColor" : "none"} strokeWidth={2.5} />
             <span className={`text-[8px] font-black uppercase tracking-tighter ${activePage === 'home' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Home</span>
          </div>
        </button>

        {MENU_ITEMS.slice(1, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-[2rem] flex-1 transition-all duration-300 ${
              activePage === item.id ? 'text-blue-500' : 'text-gray-400 active:scale-95'
            }`}
          >
            {activePage === item.id && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/20 rounded-[1.8rem]" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <item.icon size={20} strokeWidth={2.5} />
              <span className={`text-[8px] font-black uppercase tracking-tighter ${activePage === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{item.label === 'Memories' ? 'Pics' : item.label.substring(0, 5)}</span>
            </div>
          </button>
        ))}

        <button
          onClick={() => setIsMenuOpen(true)}
          className={`relative flex flex-col items-center justify-center p-2 rounded-[2rem] flex-1 transition-all ${
            isMenuOpen ? 'text-blue-500' : 'text-gray-400 active:scale-95'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
              <span className="w-4 h-0.5 bg-current rounded-full" />
              <span className="w-4 h-0.5 bg-current rounded-full" />
              <span className="w-4 h-0.5 bg-current rounded-full" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-0 h-0 overflow-hidden">More</span>
          </div>
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[110] bg-white dark:bg-[#0e161e] rounded-t-[40px] p-8 pb-12 shadow-2xl border-t border-blue-50 dark:border-blue-900/20 md:hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-serif text-2xl font-bold">Semua Fitur</h3>
                  <p className="text-xs text-gray-400">Pilih menu yang Anda butuhkan</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      effectiveAdmin ? (isDewa ? null : setIsAdmin(false)) : setShowPinModal(true);
                      setIsMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      effectiveAdmin 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                    }`}
                  >
                    <ShieldCheck size={16} />
                    {effectiveAdmin ? 'Admin' : 'Akses'}
                  </button>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400"
                  >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex flex-col items-center gap-3 transition-all active:scale-90"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                      activePage === item.id 
                        ? 'bg-blue-500 text-white shadow-blue-500/30' 
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
                    }`}>
                      <item.icon size={24} />
                    </div>
                    <span className={`text-[11px] font-bold text-center ${activePage === item.id ? 'text-blue-500' : 'text-gray-500'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {user && (
                <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-[24px] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-md" />
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">{user.displayName}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin PIN Modal */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border ${notification.type === 'warning' ? 'border-orange-500/50 shadow-orange-500/20' : 'border-blue-100 dark:border-blue-900/30'} text-center`}
            >
              <div className={`w-16 h-16 ${notification.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${notification.type === 'warning' ? 'shadow-orange-500/40 animate-pulse' : ''}`}>
                <ShieldAlert size={32} />
              </div>
              <h3 className={`font-serif text-2xl font-bold mb-4 ${notification.type === 'warning' ? 'text-orange-500' : ''}`}>
                {notification.type === 'warning' ? 'PERINGATAN MODERATOR' : 'Pesan Sistem'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed italic">"{notification.message}"</p>
              <button 
                onClick={async () => {
                  if (notification) {
                    try {
                      await deleteDoc(doc(db, 'notifications', notification.id));
                      setNotification(null);
                    } catch (e: any) {
                      console.error("Gagal menghapus notifikasi:", e);
                    }
                  }
                }}
                className={`w-full py-4 text-white rounded-2xl text-sm font-bold shadow-lg transition-all ${notification.type === 'warning' ? 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600' : 'bg-blue-500 shadow-blue-500/20 hover:bg-blue-600'}`}
              >
                Saya Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-blue-100 dark:border-blue-900/30"
            >
              <button onClick={() => setShowPinModal(false)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500"><X size={20}/></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="font-serif text-2xl font-bold">Kunci Admin</h3>
                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest leading-relaxed">
                  Email: <span className="text-blue-500">{user?.email || 'Belum Login'}</span><br/>
                  Admin: <span className={isAdmin ? 'text-green-500' : 'text-red-400'}>{isAdmin ? 'AKTIF' : 'TIDAK AKTIF'}</span>
                </p>
                {!user && (
                  <div className="mt-4 p-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-bold">
                    PERINGATAN: Harus Login Google Dulu untuk Izin Hapus di Database
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <input 
                  type="password"
                  maxLength={3}
                  placeholder="•••"
                  value={pinInput}
                  autoFocus
                  onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                  className="w-full text-center text-4xl tracking-[0.5em] font-bold py-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  onClick={handleAdminAuth}
                  className="w-full py-4 bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                >
                  Konfirmasi PIN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Global Background Features */}
      <RandomMemoryPopup />
    </div>
  );
}
