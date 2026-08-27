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
  Video,
  Trophy
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

type MenuId = string;

interface MenuItem {
  id: MenuId;
  label: string;
  icon: any;
  description: string;
}

const PRIMARY_MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Dashboard', icon: LayoutGrid, description: 'Monitor class activities and analytics in real-time.' },
  { id: 'kalender', label: 'Calendar', icon: Calendar, description: 'Manage and coordinate class schedules.' },
  { id: 'study', label: 'Auto Paham', icon: Sparkles, description: 'Consult with our dedicated AI Hubungan Internasional tutor.' },
  { id: 'notulensi', label: 'Notes', icon: FileText, description: 'Record minutes of meetings and class notes.' },
  { id: 'aspirasi', label: 'Yapping', icon: MessageSquare, description: 'Submit anonymous suggestions and questions.' },
  { id: 'pengumuman', label: 'Announce', icon: Bell, description: 'Broadcast updates and alerts to everyone.' },
];

const MORE_MENU_ITEMS: MenuItem[] = [
  { id: 'memory', label: 'Memo Galeri', icon: ImageIcon, description: 'Preserve and share visual highlights of our journey.' },
  { id: 'profiles', label: 'Video Profile', icon: Video, description: 'Browse and upload 10-second student perkenalan video profiles.' },
  { id: 'interlingo', label: 'InterLingo', icon: Trophy, description: 'Gamified mini-class to master simple Mandarin vocabulary.' },
  { id: 'absen', label: 'Data & Absen', icon: CheckCircle, description: 'Track digital checklists, attendance, and dues.' },
  { id: 'voting', label: 'Vote & Poll', icon: Vote, description: 'Host real-time polls and digital ballots.' },
  { id: 'spin', label: 'Spin Wheel', icon: RotateCw, description: 'Pick random class members or divide groups.' },
];

const MENU_ITEMS: MenuItem[] = [
  ...PRIMARY_MENU_ITEMS,
  ...MORE_MENU_ITEMS
];

const ADMIN_PIN = '313';

export default function App() {
  const [activePage, setActivePage] = useState<MenuId>('home');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

  const navigateToPage = (page: string, id: string | null = null) => {
    setActivePage(page);
    setTargetId(id);
    setIsMoreDropdownOpen(false);
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

  const currentItem = MENU_ITEMS.find(m => m.id === activePage);

  return (
    <div className="min-h-screen bg-[#f2f7fc] dark:bg-[#0e161e] text-[#1f2b36] dark:text-[#ddeaf2] transition-colors duration-300 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden pb-20 md:pb-0">
      <SplashCursor />
      
      {/* Header */}
      <header className="sticky top-0 z-[60] h-[56px] md:h-[62px] bg-white/90 dark:bg-[#141e26]/95 backdrop-blur-md border-b border-blue-100 dark:border-blue-900/30 px-4 md:px-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 md:gap-3 cursor-pointer group select-none"
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
        >
          <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <LayoutDashboard size={16} className="text-white md:hidden" />
            <LayoutDashboard size={18} className="text-white hidden md:block" />
          </div>
          <div>
            <h1 className="font-serif text-lg md:text-xl font-bold tracking-tight leading-tight">InterSolid</h1>
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-[#9aaabb] font-medium">Class Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            {PRIMARY_MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToPage(item.id)}
                className={`px-2.5 lg:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activePage === item.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold shadow-sm' 
                    : 'text-[#6b7d91] hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            ))}

            {/* More Menu Dropdown for Laptop & Desktop */}
            <div className="relative">
              <button
                onClick={() => setIsMoreDropdownOpen(prev => !prev)}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  MORE_MENU_ITEMS.some(m => m.id === activePage)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                    : isMoreDropdownOpen 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
                      : 'text-[#6b7d91] hover:bg-gray-100 dark:hover:bg-gray-800/80'
                }`}
              >
                <MoreHorizontal size={15} />
                <span>Fitur</span>
                {MORE_MENU_ITEMS.some(m => m.id === activePage) && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                )}
                <ChevronDown size={13} className={`transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMoreDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsMoreDropdownOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#141e26] rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-900/30 p-2 z-50 overflow-hidden"
                    >
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-gray-100 dark:border-gray-800 mb-1">
                        Fitur Tambahan
                      </div>
                      <div className="space-y-0.5">
                        {MORE_MENU_ITEMS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => navigateToPage(item.id)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between text-left ${
                              activePage === item.id
                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${activePage === item.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                <item.icon size={14} />
                              </div>
                              <span>{item.label}</span>
                            </div>
                            {activePage === item.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            
            <button 
              onClick={() => effectiveAdmin ? (isDewa ? null : setIsAdmin(false)) : setShowPinModal(true)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                effectiveAdmin 
                  ? (isDewa ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400') 
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={isDewa ? "Dewa Access Active" : effectiveAdmin ? "Admin Access Active" : "Unlock Admin Access"}
            >
              {effectiveAdmin ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            </button>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Switch Theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            
            {user ? (
              <div className="flex items-center gap-2 ml-1">
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || ''} 
                  className="w-7 h-7 rounded-full border border-blue-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" 
                  onClick={handleLogout}
                  title="Click to Logout"
                />
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="ml-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all flex items-center gap-1.5 shrink-0"
              >
                <UserIcon size={13} /> Login
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-28 md:pb-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activePage !== 'home' && (
              <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Modern Feature</span>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">{currentItem?.label}</h2>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">{currentItem?.description}</p>
                </div>
                <button 
                  onClick={() => navigateToPage('home')}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-[#1a252f] border border-blue-50 dark:border-blue-900/20 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 transition-all w-fit md:w-fit"
                >
                  <ArrowLeft size={16} /> Dashboard
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
          onClick={() => navigateToPage('home')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-[2rem] flex-1 transition-all duration-300 ${
            activePage === 'home' ? 'text-blue-500' : 'text-gray-400 active:scale-95'
          }`}
        >
          {activePage === 'home' && (
            <motion.div layoutId="nav-pill" className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/20 rounded-[1.8rem]" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-1">
             <LayoutGrid size={20} fill={activePage === 'home' ? "currentColor" : "none"} strokeWidth={2.5} />
             <span className={`text-[8px] font-black uppercase tracking-tighter ${activePage === 'home' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>Dashboard</span>
          </div>
        </button>

        {MENU_ITEMS.slice(1, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => navigateToPage(item.id)}
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
                  <h3 className="font-serif text-2xl font-bold">All Features</h3>
                  <p className="text-xs text-gray-400">Select the menu you need</p>
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
                    {effectiveAdmin ? 'Admin' : 'Access'}
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
                      navigateToPage(item.id);
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
      />

      {/* Global Background Features */}
      <Suspense fallback={null}>
        <RandomMemoryPopup />
      </Suspense>
    </div>
  );
}
