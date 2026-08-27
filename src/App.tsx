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
  Grid
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

const CATEGORIZED_MENUS = [
  {
    category: 'Akademik & Perkuliahan',
    badge: 'Core',
    items: [
      { id: 'home', label: 'Dashboard', icon: LayoutGrid, desc: 'Pusat ringkasan aktivitas, statistik, dan status portal.' },
      { id: 'kalender', label: 'Jadwal & Agenda', icon: Calendar, desc: 'Jadwal perkuliahan, deadline tugas, dan agenda kelas.' },
      { id: 'notulensi', label: 'Notulensi Rapat', icon: FileText, desc: 'Arsip notulensi pertemuan dan catatan perkuliahan.' },
      { id: 'pengumuman', label: 'Pengumuman Resmi', icon: Bell, desc: 'Broadcast informasi penting dan edaran angkatan.' },
      { id: 'absen', label: 'Kas & Absensi', icon: CheckCircle, desc: 'Rekapitulasi keuangan kas kelas dan presensi digital.' },
    ]
  },
  {
    category: 'AI & Studi Mandiri',
    badge: 'AI Smart',
    items: [
      { id: 'study', label: 'Auto Paham Tutor', icon: Sparkles, desc: 'Asisten AI cerdas untuk pendalaman materi Hubungan Internasional.' },
    ]
  },
  {
    category: 'Komunitas & Hiburan',
    badge: 'Social & Fun',
    items: [
      { id: 'aspirasi', label: 'Yapping Anonim', icon: MessageSquare, desc: 'Saluran aspirasi, diskusi, dan obrolan bebas tanpa identitas.' },
      { id: 'voting', label: 'Voting & Polling', icon: Vote, desc: 'Musyawarah digital dan jajak pendapat real-time angkatan.' },
      { id: 'memory', label: 'Memo Galeri', icon: ImageIcon, desc: 'Galeri dokumentasi foto dan kenangan kebersamaan.' },
      { id: 'profiles', label: 'Video Profile', icon: Video, desc: 'Profil video perkenalan mahasiswa berdurasi 10 detik.' },
      { id: 'interlingo', label: 'InterLingo Mini', icon: Trophy, desc: 'Kuis interaktif kosakata Mandarin untuk mahasiswa HI.' },
      { id: 'spin', label: 'Spin Wheel', icon: RotateCw, desc: 'Roda putar acak penentu giliran dan pembagian kelompok.' },
    ]
  }
];

const ADMIN_PIN = '313';

export default function App() {
  const [activePage, setActivePage] = useState<MenuId>('home');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  const navigateToPage = (page: string, id: string | null = null) => {
    if (page === 'bypass') {
      setIsAIBypassOpen(true);
      setIsMoreDropdownOpen(false);
      setIsMenuOpen(false);
      return;
    }
    setActivePage(page);
    setTargetId(id);
    setIsMoreDropdownOpen(false);
    setIsMenuOpen(false);
    setMenuSearchQuery('');
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

  const currentItem = MENU_ITEMS.find(m => m.id === activePage);

  return (
    <div className="min-h-screen bg-[#f2f7fc] dark:bg-[#0e161e] text-[#1f2b36] dark:text-[#ddeaf2] transition-colors duration-300 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden pb-20 md:pb-0">
      <SplashCursor />
      
      {/* Modern High-End Header */}
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

        {/* Center: Desktop Navigation (>= 1200px / xl) */}
        <nav className="hidden xl:flex items-center bg-slate-100/80 dark:bg-[#18232c]/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800/70 shadow-inner">
          {PRIMARY_MENU_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateToPage(item.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="desktop-active-nav-pill" 
                    className="absolute inset-0 bg-white dark:bg-[#202f3c] rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50" 
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <item.icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}

          {/* Fitur Lainnya Dropdown */}
          <div className="relative ml-0.5">
            <button
              onClick={() => setIsMoreDropdownOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                MORE_MENU_ITEMS.some(m => m.id === activePage)
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                  : isMoreDropdownOpen 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid size={14} />
              <span>Semua Fitur</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold">12</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMoreDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMoreDropdownOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#15202b] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-2 z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Fitur & Alat Tambahan</span>
                      <button 
                        onClick={() => {
                          setIsMoreDropdownOpen(false);
                          setIsMenuOpen(true);
                        }}
                        className="text-[10px] text-blue-500 font-bold hover:underline"
                      >
                        Buka Semua
                      </button>
                    </div>
                    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                      {MORE_MENU_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => navigateToPage(item.id)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between text-left group ${
                            activePage === item.id
                              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              activePage === item.id 
                                ? 'bg-blue-500 text-white shadow-sm' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-500'
                            }`}>
                              <item.icon size={14} />
                            </div>
                            <div>
                              <p className="leading-tight">{item.label}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1 font-normal">{item.description}</p>
                            </div>
                          </div>
                          {activePage === item.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Center: Tablet Navigation (md to xl: 768px - 1199px) */}
        <nav className="hidden md:flex xl:hidden items-center bg-slate-100/80 dark:bg-[#18232c]/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800/70 shadow-inner">
          <button
            onClick={() => navigateToPage('home')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePage === 'home' 
                ? 'bg-white dark:bg-[#202f3c] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigateToPage('kalender')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePage === 'kalender' 
                ? 'bg-white dark:bg-[#202f3c] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50'
            }`}
          >
            <Calendar size={14} />
            <span>Jadwal</span>
          </button>
          <button
            onClick={() => navigateToPage('study')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePage === 'study' 
                ? 'bg-white dark:bg-[#202f3c] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50'
            }`}
          >
            <Sparkles size={14} />
            <span>Auto Paham</span>
          </button>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center gap-1.5 ml-1"
          >
            <Grid size={14} />
            <span>Menu (+9)</span>
          </button>
        </nav>

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
            className="xl:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
            title="Buka Semua Menu"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentItem?.description}</p>
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

      {/* Universal Command / All-Features Modal & Drawer (Works Flawlessly on Mobile, Tablet & Desktop) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog Content */}
            <motion.div 
              initial={{ y: "100%", opacity: 0.5, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#121c24] rounded-t-[32px] md:rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 z-10 max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header with Search */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 md:hidden" />
                
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg sm:text-xl font-black text-slate-900 dark:text-white">Semua Menu & Fitur</h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">12 Fitur</span>
                    </div>
                    <p className="text-xs text-slate-400">Pilih menu akademik, AI tutor, atau fitur komunitas</p>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Cari menu... (contoh: kalender, notulensi, kas, AI, voting, kuis)"
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-100/80 dark:bg-[#1a2632] rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-transparent transition-all"
                  />
                  {menuSearchQuery && (
                    <button 
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Categorized Features List (Scrollable) */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-6">
                {CATEGORIZED_MENUS.map((section, idx) => {
                  const filteredItems = section.items.filter(item => 
                    item.label.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
                    item.desc.toLowerCase().includes(menuSearchQuery.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {section.category}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {section.badge}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredItems.map((item) => {
                          const isActive = activePage === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigateToPage(item.id)}
                              className={`p-3 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 border ${
                                isActive 
                                  ? 'bg-blue-50/90 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 shadow-sm' 
                                  : 'bg-slate-50/60 dark:bg-[#16212b]/60 hover:bg-white dark:hover:bg-[#1a2733] border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                isActive 
                                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-105' 
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm'
                              }`}>
                                <item.icon size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-xs font-bold leading-tight ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {item.label}
                                  </p>
                                  {isActive && (
                                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">Aktif</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                                  {item.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* If search query has no results */}
                {CATEGORIZED_MENUS.every(s => s.items.filter(i => i.label.toLowerCase().includes(menuSearchQuery.toLowerCase()) || i.desc.toLowerCase().includes(menuSearchQuery.toLowerCase())).length === 0) && (
                  <div className="text-center py-10">
                    <p className="text-sm font-bold text-slate-400">Tidak ada menu yang sesuai dengan "{menuSearchQuery}"</p>
                    <button 
                      onClick={() => setMenuSearchQuery('')}
                      className="mt-2 text-xs text-blue-500 font-bold hover:underline"
                    >
                      Reset Pencarian
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Quick Controls & User Profile Footer */}
              <div className="p-4 bg-slate-50 dark:bg-[#0f171e] border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                {user ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || ''} 
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" 
                    />
                    <div className="min-w-0 flex-1 sm:flex-initial">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[180px]">{user.displayName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</span>
                        {effectiveAdmin && (
                          <span className={`text-[8px] font-black px-1 rounded ${isDewa ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isDewa ? 'DEWA' : 'ADMIN'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 w-full sm:w-auto text-center sm:text-left">
                    Masuk dengan Google untuk akses fitur personal
                  </div>
                )}

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      effectiveAdmin ? (isDewa ? null : setIsAdmin(false)) : setShowPinModal(true);
                      setIsMenuOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      effectiveAdmin 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    <span>{effectiveAdmin ? 'Admin Mode' : 'Buka Admin'}</span>
                  </button>

                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    title="Ganti Tema"
                  >
                    {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                  </button>

                  {user ? (
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <LogOut size={14} />
                      <span>Keluar</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        handleLogin();
                        setIsMenuOpen(false);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                    >
                      <UserIcon size={14} />
                      <span>Login</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
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
