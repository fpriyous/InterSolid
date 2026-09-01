import { useState, useEffect, lazy, Suspense } from 'react';
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
  ChevronDown,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  X,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Bot,
  Video,
  Trophy,
  Search,
  BookOpen,
  Users,
  Grid,
  Layers
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
import GodMode from './components/GodMode';
import AIBypassChat from './components/AIBypassChat';
import { NavigationHub, ALL_MENU_ITEMS, MenuItem } from './components/NavigationHub';

// Lazy Load Feature Components
const Kalender = lazy(() => import('./components/Kalender'));
const List = lazy(() => import('./components/List'));
const SpinWheel = lazy(() => import('./components/SpinWheel'));
const Voting = lazy(() => import('./components/Voting'));
const Notulensi = lazy(() => import('./components/Notulensi'));
const Aspirasi = lazy(() => import('./components/Aspirasi'));
const Pengumuman = lazy(() => import('./components/Pengumuman'));
const Memory = lazy(() => import('./components/Memory'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const RandomMemoryPopup = lazy(() => import('./components/RandomMemoryPopup'));
const StudyCompanion = lazy(() => import('./components/StudyCompanion'));
const VideoProfiles = lazy(() => import('./components/VideoProfiles'));
const InterLingo = lazy(() => import('./components/InterLingo'));

const ADMIN_PIN = '313';

export default function App() {
  const [activePage, setActivePage] = useState<string>('home');
  const [targetId, setTargetId] = useState<string | null>(null);

  const navigateToPage = (page: string, id: string | null = null) => {
    if (page === 'bypass') {
      setIsAIBypassOpen(true);
      setIsMenuOpen(false);
      return;
    }
    setActivePage(page);
    setTargetId(id);
    setIsMenuOpen(false);
  };
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
  const [authError, setAuthError] = useState<'unauthenticated' | 'unauthorized' | null>(null);
  const [appAlert, setAppAlert] = useState<{ title: string; message: string; type?: 'info' | 'error' | 'success' } | null>(null);

  // God Mode Secret Trigger States
  const [logoClicks, setLogoClicks] = useState(0);
  const [showGodMode, setShowGodMode] = useState(false);
  const [isAIBypassOpen, setIsAIBypassOpen] = useState(false);

  useEffect(() => {
    (window as any).showAuthError = (type: 'unauthenticated' | 'unauthorized') => {
      setAuthError(type);
    };
    (window as any).showAppAlert = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
      setAppAlert({ title, message, type });
    };
    return () => {
      delete (window as any).showAuthError;
      delete (window as any).showAppAlert;
    };
  }, []);

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
        (window as any).showAppAlert?.('Belum Login Google', 'Sistem berhasil meningkatkan status layar ke Admin AKTIF. Namun, Anda tetap memerlukan login Google untuk dapat menyimpan, memperbaharui, atau menghapus data riil dari Firebase.', 'info');
      }
      
      setShowPinModal(false);
      setPinInput('');
    } else {
      (window as any).showAppAlert?.('PIN Salah', 'Kode PIN admin yang dimasukkan salah, silakan coba lagi.', 'error');
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
        (window as any).showAppAlert?.(
          'Petunjuk Masuk Google',
          'Situs ini menggunakan otentikasi resmi dan aman dari Google Firebase. Cara Masuk: Pada jendela Google "Situs Berbahaya / Belum Diverifikasi", silakan klik "Lanjutan / Advanced" di kiri bawah -> lalu pilih "Buka gen-lang-client-... (Tidak Aman)". Jika ada kendala, silakan hubungi pengurus kelas Anda.',
          'info'
        );
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
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px] animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-blue-500/50 animate-pulse">Setting up Module...</p>
        </div>
      }>
        {(() => {
          switch (activePage) {
            case 'kalender': return <Kalender user={user} isAdmin={effectiveAdmin} setActivePage={navigateToPage} />;
            case 'absen': return <List isAdmin={effectiveAdmin} user={user} />;
            case 'spin': return <SpinWheel user={user} />;
            case 'voting': return <Voting isAdmin={effectiveAdmin} user={user} />;
            case 'notulensi': return <Notulensi isAdmin={effectiveAdmin} user={user} />;
            case 'aspirasi': return <Aspirasi isAdmin={effectiveAdmin} isDewa={isDewa} user={user} />;
            case 'memory': return <Memory isAdmin={effectiveAdmin} user={user} targetId={targetId} setTargetId={setTargetId} />;
            case 'pengumuman': return <Pengumuman isAdmin={effectiveAdmin} user={user} />;
            case 'study': return <StudyCompanion user={user} isAdmin={effectiveAdmin} />;
            case 'profiles': return <VideoProfiles user={user} isAdmin={effectiveAdmin} />;
            case 'interlingo': return <InterLingo user={user} isAdmin={effectiveAdmin} />;
            default: return <Dashboard user={user} setActivePage={navigateToPage} />;
          }
        })()}
      </Suspense>
    );
  };

  const currentItem = ALL_MENU_ITEMS.find(m => m.id === activePage);

  return (
    <div className="min-h-screen bg-[#f2f7fc] dark:bg-[#0e161e] text-[#1f2b36] dark:text-[#ddeaf2] transition-colors duration-300 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden pb-20 md:pb-0">
      <SplashCursor />
      
      {/* Modern High-End Header with Integrated Aesthetic Navigation Hub */}
      <header className="sticky top-0 z-[60] h-14 md:h-16 bg-white/90 dark:bg-[#111a22]/95 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/60 px-3 sm:px-4 md:px-6 flex items-center justify-between transition-colors">
        {/* Left: Brand Identity */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
          onClick={() => {
            navigateToPage('home');
            setLogoClicks(prev => {
              const next = prev + 1;
              if (next >= 5) {
                setShowGodMode(true);
                (window as any).showAppAlert?.('🌐 JALUR DALAM DIAKTIFKAN 🌐', 'Anda berhasil mengakses panel kontrol God Mode rahasia mahasiswa berprestasi!', 'success');
                return 0;
              }
              return next;
            });
          }}
          title="Klik 5x untuk akses jalur rahasia"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif text-base sm:text-lg md:text-xl font-black tracking-tight leading-none text-slate-900 dark:text-white">InterSolid</h1>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40">HI</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500 block -mt-0.5">Portal Mahasiswa</span>
          </div>
        </div>

        {/* Center: Aesthetic Navigation Hub */}
        <NavigationHub 
          activePage={activePage} 
          onNavigate={navigateToPage} 
          isCommandOpen={isMenuOpen} 
          setIsCommandOpen={setIsMenuOpen} 
        />

        {/* Right: Unified System Actions & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Admin / Dewa Mode Indicator Button */}
          <button 
            onClick={() => effectiveAdmin ? (isDewa ? null : setIsAdmin(false)) : setShowPinModal(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              effectiveAdmin 
                ? (isDewa 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 shadow-sm shadow-amber-500/10' 
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30 shadow-sm shadow-emerald-500/10') 
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isDewa ? "Status: Dewa (Full Root Power)" : effectiveAdmin ? "Status: Admin Aktif (Klik untuk nonaktifkan)" : "Buka Akses Admin (PIN)"}
          >
            {effectiveAdmin ? (
              <>
                <ShieldCheck size={15} className={isDewa ? 'text-amber-500 animate-pulse' : 'text-emerald-500'} />
                <span className="hidden sm:inline font-black text-[11px]">{isDewa ? 'Dewa' : 'Admin'}</span>
              </>
            ) : (
              <>
                <ShieldAlert size={15} />
                <span className="hidden lg:inline text-[11px]">Admin PIN</span>
              </>
            )}
          </button>
          
          {/* Dark / Light Mode Switcher */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? "Ganti ke Tema Terang (Day Mode)" : "Ganti ke Tema Gelap (Dark Mode)"}
          >
            {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* Quick Menu Launcher (Mobile & Tablet) */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
            title="Buka Semua Menu & Bento Command Hub"
          >
            <Grid size={17} />
          </button>
          
          {/* User Profile Pill / Login CTA */}
          {user ? (
            <div className="flex items-center gap-1.5 ml-0.5">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center gap-2 p-0.5 pr-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={`${user.displayName || 'User'} - Klik untuk kelola akun & menu`}
              >
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                    alt={user.displayName || ''} 
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-blue-300 dark:border-blue-700 object-cover shadow-sm" 
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                <span className="hidden 2xl:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[90px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="ml-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <UserIcon size={14} /> 
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-28 md:pb-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activePage !== 'home' && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 dark:bg-[#15202b]/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                      Fitur Portal
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">InterSolid HI</span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{currentItem?.label}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentItem?.desc}</p>
                </div>
                <button 
                  onClick={() => navigateToPage('home')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all w-fit shrink-0 shadow-sm"
                >
                  <ArrowLeft size={15} /> Dashboard
                </button>
              </div>
            )}

            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Floating Navigation Dock (< 768px) */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[94%] max-w-[420px] bg-white/95 dark:bg-[#111a22]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 px-2 py-1.5 rounded-full shadow-[0_12px_35px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_35px_rgba(0,0,0,0.5)] flex items-center justify-between gap-1 overflow-hidden">
        {[
          { id: 'home', label: 'Dashboard', icon: LayoutGrid },
          { id: 'kalender', label: 'Jadwal', icon: Calendar },
          { id: 'study', label: 'AI Tutor', icon: Sparkles },
          { id: 'notulensi', label: 'Catatan', icon: FileText },
        ].map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateToPage(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-full flex-1 transition-all duration-200 ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-pill" 
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full" 
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] leading-none tracking-tight">{item.label}</span>
              </div>
            </button>
          );
        })}

        {/* Mobile Menu Launcher Button */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-full flex-1 transition-all ${
            isMenuOpen ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600 active:scale-95'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div className="w-5 h-5 flex items-center justify-center">
              <Grid size={18} />
            </div>
            <span className="text-[9px] leading-none tracking-tight">Semua</span>
          </div>
        </button>
      </nav>

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
                {notification.type === 'warning' ? 'MODERATOR WARNING' : 'System Message'}
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
                I Understand
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
                <h3 className="font-serif text-2xl font-bold">Admin Lock</h3>
                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest leading-relaxed">
                  Email: <span className="text-blue-500">{user?.email || 'Not Logged In'}</span><br/>
                  Admin: <span className={isAdmin ? 'text-green-500' : 'text-red-400'}>{isAdmin ? 'ACTIVE' : 'INACTIVE'}</span>
                </p>
                {!user && (
                  <div className="mt-4 p-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-bold">
                    WARNING: Must login with Google first for database permissions
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
                  Confirm PIN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful Custom Auth/Permission Error Popup */}
      <AnimatePresence>
        {authError && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthError(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-red-100 dark:border-red-900/30 overflow-hidden text-center z-10"
            >
              {authError === 'unauthenticated' ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-6 shadow-lg shadow-blue-500/10">
                    <UserIcon size={32} className="animate-pulse" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold mb-2">Authentication Required</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[#9aaabb] font-black mb-4">AUTHENTICATION_REQUIRED</p>
                  
                  {/* Highlighted exact quote requested by user */}
                  <div className="my-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                    <p className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                      "login dulu ea"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setAuthError(null);
                        handleLogin();
                      }}
                      className="w-full py-4 bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <UserIcon size={16} /> Login with Google Now
                    </button>
                    <button 
                      onClick={() => setAuthError(null)}
                      className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 text-[#6b7d91] dark:text-gray-400 rounded-2xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-lg shadow-red-500/10">
                    <ShieldAlert size={32} className="animate-bounce" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold mb-2">Access Denied</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[#9aaabb] font-black mb-4">ADMINISTRATOR_ONLY</p>
                  
                  {/* Highlighted exact quote requested by user */}
                  <div className="my-6 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100/50 dark:border-red-900/20">
                    <p className="font-serif text-sm font-semibold text-red-600 dark:text-red-400 leading-relaxed italic">
                      "aku admin, kamu hitam. mintol si admin hitam sana"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setAuthError(null);
                        setShowPinModal(true);
                      }}
                      className="w-full py-4 bg-red-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={16} /> Unlock Admin Access
                    </button>
                    <button 
                      onClick={() => setAuthError(null)}
                      className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 text-[#6b7d91] dark:text-gray-400 rounded-2xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Beautiful Custom App Alert Modal (Ganti alert Kasar) */}
      <AnimatePresence>
        {appAlert && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAppAlert(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-blue-50 dark:border-white/5 overflow-hidden text-center z-10 animate-in zoom-in-95 duration-200"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg leading-none ${
                appAlert.type === 'error' 
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 shadow-rose-500/10' 
                  : appAlert.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 shadow-emerald-500/10'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 shadow-blue-500/10'
              }`}>
                {appAlert.type === 'error' ? (
                  <ShieldAlert size={32} className="animate-bounce" />
                ) : appAlert.type === 'success' ? (
                  <ShieldCheck size={32} />
                ) : (
                  <Bell size={32} className="animate-pulse" />
                )}
              </div>

              <h3 className="font-serif text-2xl font-bold mb-2 text-slate-850 dark:text-white leading-tight">{appAlert.title}</h3>
              <p className="text-[9px] uppercase tracking-[0.3em] text-[#9aaabb] font-black mb-4">{appAlert.type ? `SYSTEM_${appAlert.type.toUpperCase()}` : 'SYSTEM_NOTIFICATION'}</p>
              
              <div className="my-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-350 leading-relaxed font-sans text-center">
                  {appAlert.message}
                </p>
              </div>

              <button 
                onClick={() => setAppAlert(null)}
                className={`w-full py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${
                  appAlert.type === 'error'
                    ? 'bg-rose-500 hover:bg-rose-650 shadow-rose-500/20'
                    : appAlert.type === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-650 shadow-emerald-500/20'
                    : 'bg-blue-500 hover:bg-blue-650 shadow-blue-500/20'
                }`}
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <GodMode isOpen={showGodMode} onClose={() => setShowGodMode(false)} />

      {/* Floating AI Bypass Action Copilot */}
      <AIBypassChat 
        user={user}
        isAdmin={effectiveAdmin}
        isDewa={isDewa}
        activePage={activePage}
        setActivePage={navigateToPage}
        onOpenAdminModal={() => setShowPinModal(true)}
        isOpenControlled={isAIBypassOpen}
        setIsOpenControlled={setIsAIBypassOpen}
      />

      {/* Global Background Features */}
      <Suspense fallback={null}>
        <RandomMemoryPopup />
      </Suspense>
    </div>
  );
}
