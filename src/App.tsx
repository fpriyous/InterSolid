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
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SplashCursor from './components/SplashCursor';
import FadeContent from './components/FadeContent';

// Import Feature Components
import Kalender from './components/Kalender';
import Absen from './components/Absen';
import SpinWheel from './components/SpinWheel';
import Voting from './components/Voting';
import Notulensi from './components/Notulensi';
import Aspirasi from './components/Aspirasi';
import Pengumuman from './components/Pengumuman';

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
  { id: 'absen', label: 'Absen', icon: CheckCircle, description: 'Data iuran dan kehadiran anggota kelas.' },
  { id: 'spin', label: 'Spin', icon: RotateCw, description: 'Pilih anggota secara acak atau bagi kelompok.' },
  { id: 'voting', label: 'Voting', icon: Vote, description: 'Lakukan pemungutan suara secara digital.' },
  { id: 'notulensi', label: 'Notulensi', icon: FileText, description: 'Catatan hasil rapat dan bahan materi.' },
  { id: 'aspirasi', label: 'Aspirasi', icon: MessageSquare, description: 'Kirim pesan dan saran secara anonim.' },
  { id: 'pengumuman', label: 'Pengumuman', icon: Bell, description: 'Informasi terbaru untuk seluruh anggota.' },
];

const ADMIN_PIN = '1234';

export default function App() {
  const [activePage, setActivePage] = useState<MenuId>('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark';
    }
    return false;
  });
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

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

  const handleAdminAuth = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
    } else {
      alert('PIN Salah!');
      setPinInput('');
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'kalender': return <Kalender />;
      case 'absen': return <Absen />;
      case 'spin': return <SpinWheel />;
      case 'voting': return <Voting isAdmin={isAdmin} />;
      case 'notulensi': return <Notulensi isAdmin={isAdmin} />;
      case 'aspirasi': return <Aspirasi isAdmin={isAdmin} />;
      case 'pengumuman': return <Pengumuman isAdmin={isAdmin} />;
      default: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FadeContent blur duration={1000} className="col-span-full">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-3xl p-10 mb-8 text-white shadow-xl shadow-blue-500/10">
              <div className="relative z-10">
                <span className="text-[10px] uppercase font-bold tracking-[3px] text-blue-100 opacity-80 mb-2 block">Selamat Datang di</span>
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-3 italic">Inter<span className="opacity-70">solid</span></h2>
                <p className="text-sm font-light text-blue-50 opacity-90">Portal resmi kegiatan dan administrasi kelas</p>
              </div>
              <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 font-serif italic text-7xl md:text-8xl select-none">
                {new Date().getDate()}
              </div>
            </div>
          </FadeContent>

          {MENU_ITEMS.filter(m => m.id !== 'home').map((item, i) => (
            <FadeContent key={item.id} delay={i * 100} blur>
              <div 
                onClick={() => setActivePage(item.id)}
                className="group p-6 bg-white dark:bg-[#1a252f] border border-blue-100 dark:border-blue-900/30 rounded-2xl cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <item.icon size={20} className="transition-colors" />
                </div>
                <h3 className="font-bold text-sm mb-1 uppercase tracking-tight">{item.label}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{item.description}</p>
                <div className="flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase tracking-wider">
                  Buka <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </FadeContent>
          ))}
        </div>
      );
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
            onClick={() => isAdmin ? setIsAdmin(false) : setShowPinModal(true)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isAdmin 
                ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {isAdmin ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-[#141e26]/95 backdrop-blur-md border-t border-blue-100 dark:border-blue-900/30 px-2 py-3 flex items-center justify-around pb-[calc(12px+env(safe-area-inset-bottom))]">
        {MENU_ITEMS.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${
              activePage === item.id ? 'text-blue-500 scale-110 font-bold' : 'text-gray-400'
            }`}
          >
            <item.icon size={18} />
            <span className="text-[9px] uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

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
                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest leading-relaxed">Gunakan PIN untuk membuka fitur pengelolaan data</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="password"
                  maxLength={6}
                  placeholder="••••"
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
                <p className="text-center text-[10px] text-gray-400">PIN: <span className="font-bold text-blue-500">1234</span></p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
