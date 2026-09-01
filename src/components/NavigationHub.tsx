import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  Calendar, 
  CheckCircle, 
  RotateCw, 
  Vote, 
  FileText, 
  MessageSquare, 
  Bell, 
  Sparkles, 
  Video, 
  Trophy, 
  Image as ImageIcon,
  Search, 
  X, 
  ChevronDown, 
  Command, 
  GraduationCap, 
  Bot, 
  HeartHandshake,
  Layers,
  ArrowRight,
  Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

export interface MenuItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  desc: string;
  description?: string;
  badge?: string;
  category: 'akademik' | 'ai' | 'komunitas';
  accentColor: {
    bg: string;
    text: string;
    border: string;
    glow: string;
    lightBg: string;
  };
}

export const ALL_MENU_ITEMS: MenuItem[] = [
  // AKADEMIK
  {
    id: 'home',
    label: 'Dashboard',
    shortLabel: 'Overview',
    icon: LayoutGrid,
    desc: 'Pusat ringkasan aktivitas, statistik, dan status portal.',
    category: 'akademik',
    badge: 'Utama',
    accentColor: {
      bg: 'bg-blue-500',
      text: 'text-blue-500 dark:text-blue-400',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      lightBg: 'bg-blue-50 dark:bg-blue-950/40'
    }
  },
  {
    id: 'kalender',
    label: 'Jadwal & Agenda',
    shortLabel: 'Jadwal',
    icon: Calendar,
    desc: 'Jadwal kuliah, deadline tugas, dan agenda kelas.',
    category: 'akademik',
    badge: 'Sinkron',
    accentColor: {
      bg: 'bg-indigo-500',
      text: 'text-indigo-500 dark:text-indigo-400',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-500/20',
      lightBg: 'bg-indigo-50 dark:bg-indigo-950/40'
    }
  },
  {
    id: 'notulensi',
    label: 'Notulensi Rapat',
    shortLabel: 'Notulensi',
    icon: FileText,
    desc: 'Arsip notulensi pertemuan dan catatan materi kelas.',
    category: 'akademik',
    badge: 'Dokumen',
    accentColor: {
      bg: 'bg-sky-500',
      text: 'text-sky-500 dark:text-sky-400',
      border: 'border-sky-500/30',
      glow: 'shadow-sky-500/20',
      lightBg: 'bg-sky-50 dark:bg-sky-950/40'
    }
  },
  {
    id: 'pengumuman',
    label: 'Pengumuman',
    shortLabel: 'Woro-woro',
    icon: Bell,
    desc: 'Broadcast edaran resmi dan informasi penting angkatan.',
    category: 'akademik',
    badge: 'Broadcast',
    accentColor: {
      bg: 'bg-cyan-500',
      text: 'text-cyan-500 dark:text-cyan-400',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      lightBg: 'bg-cyan-50 dark:bg-cyan-950/40'
    }
  },
  {
    id: 'absen',
    label: 'Kas & Absensi',
    shortLabel: 'Kas & Absen',
    icon: CheckCircle,
    desc: 'Rekapitulasi keuangan kas kelas dan presensi digital.',
    category: 'akademik',
    badge: 'Finansial',
    accentColor: {
      bg: 'bg-teal-500',
      text: 'text-teal-500 dark:text-teal-400',
      border: 'border-teal-500/30',
      glow: 'shadow-teal-500/20',
      lightBg: 'bg-teal-50 dark:bg-teal-950/40'
    }
  },

  // AI & STUDI
  {
    id: 'study',
    label: 'Auto Paham Tutor',
    shortLabel: 'AI Tutor',
    icon: Sparkles,
    desc: 'Asisten AI cerdas untuk pendalaman materi Hubungan Internasional.',
    category: 'ai',
    badge: 'Gemini AI',
    accentColor: {
      bg: 'bg-violet-500',
      text: 'text-violet-500 dark:text-violet-400',
      border: 'border-violet-500/30',
      glow: 'shadow-violet-500/20',
      lightBg: 'bg-violet-50 dark:bg-violet-950/40'
    }
  },
  {
    id: 'interlingo',
    label: 'InterLingo Mandarin',
    shortLabel: 'InterLingo',
    icon: Trophy,
    desc: 'Kuis interaktif dan latihan kosakata Mandarin mahasiswa HI.',
    category: 'ai',
    badge: 'Gamifikasi',
    accentColor: {
      bg: 'bg-amber-500',
      text: 'text-amber-500 dark:text-amber-400',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20',
      lightBg: 'bg-amber-50 dark:bg-amber-950/40'
    }
  },

  // KOMUNITAS & FUN
  {
    id: 'memory',
    label: 'Memo Galeri',
    shortLabel: 'Galeri',
    icon: ImageIcon,
    desc: 'Galeri dokumentasi foto kenangan portrait & landscape.',
    category: 'komunitas',
    badge: 'Dokumentasi',
    accentColor: {
      bg: 'bg-rose-500',
      text: 'text-rose-500 dark:text-rose-400',
      border: 'border-rose-500/30',
      glow: 'shadow-rose-500/20',
      lightBg: 'bg-rose-50 dark:bg-rose-950/40'
    }
  },
  {
    id: 'profiles',
    label: 'Video Profile',
    shortLabel: 'Video Profil',
    icon: Video,
    desc: 'Video perkenalan 10 detik profil mahasiswa angkatan.',
    category: 'komunitas',
    badge: '10s Reel',
    accentColor: {
      bg: 'bg-pink-500',
      text: 'text-pink-500 dark:text-pink-400',
      border: 'border-pink-500/30',
      glow: 'shadow-pink-500/20',
      lightBg: 'bg-pink-50 dark:bg-pink-950/40'
    }
  },
  {
    id: 'aspirasi',
    label: 'Yapping Anonim',
    shortLabel: 'Yapping',
    icon: MessageSquare,
    desc: 'Saluran aspirasi, curhat, dan obrolan bebas tanpa identitas.',
    category: 'komunitas',
    badge: 'Anonim',
    accentColor: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-500 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    }
  },
  {
    id: 'voting',
    label: 'Voting & Polling',
    shortLabel: 'Voting',
    icon: Vote,
    desc: 'Musyawarah digital dan jajak pendapat real-time angkatan.',
    category: 'komunitas',
    badge: 'Demokrasi',
    accentColor: {
      bg: 'bg-purple-500',
      text: 'text-purple-500 dark:text-purple-400',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/20',
      lightBg: 'bg-purple-50 dark:bg-purple-950/40'
    }
  },
  {
    id: 'spin',
    label: 'Spin Wheel',
    shortLabel: 'Spin Wheel',
    icon: RotateCw,
    desc: 'Roda putar acak penentu giliran dan pembagian kelompok.',
    category: 'komunitas',
    badge: 'Acak',
    accentColor: {
      bg: 'bg-orange-500',
      text: 'text-orange-500 dark:text-orange-400',
      border: 'border-orange-500/30',
      glow: 'shadow-orange-500/20',
      lightBg: 'bg-orange-50 dark:bg-orange-950/40'
    }
  }
];

export const CATEGORIES = [
  {
    id: 'akademik',
    title: 'Akademik & Kelas',
    shortTitle: 'Akademik',
    icon: GraduationCap,
    desc: 'Dashboard, Jadwal, Notulensi, Pengumuman, dan Kas',
    count: 5,
    tag: 'Core'
  },
  {
    id: 'ai',
    title: 'AI & Pembelajaran',
    shortTitle: 'AI & Studi',
    icon: Sparkles,
    desc: 'Auto Paham Tutor dan InterLingo Mandarin',
    count: 2,
    tag: 'Smart'
  },
  {
    id: 'komunitas',
    title: 'Komunitas & Hiburan',
    shortTitle: 'Komunitas',
    icon: HeartHandshake,
    desc: 'Memo Galeri, Video Profile, Yapping, Voting, Spin Wheel',
    count: 5,
    tag: 'Social'
  }
];

interface NavigationHubProps {
  activePage: string;
  onNavigate: (page: string, id?: string | null) => void;
  isCommandOpen: boolean;
  setIsCommandOpen: (open: boolean) => void;
}

export function NavigationHub({ activePage, onNavigate, isCommandOpen, setIsCommandOpen }: NavigationHubProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'akademik' | 'ai' | 'komunitas'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeItem = ALL_MENU_ITEMS.find(m => m.id === activePage) || ALL_MENU_ITEMS[0];
  const activeCategory = activeItem?.category || 'akademik';

  // Listen to keyboard shortcut Ctrl+K or Cmd+K or / to open Command Center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(!isCommandOpen);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, setIsCommandOpen]);

  const handleMouseEnterCategory = (catId: string) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setHoveredCategory(catId);
  };

  const handleMouseLeaveCategory = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 180);
  };

  return (
    <>
      {/* ─── MODISH DESKTOP & TABLET CAPSULE DOCK ─── */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-[#15212b]/95 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-inner backdrop-blur-xl relative">
        {CATEGORIES.map((cat) => {
          const isCategoryActive = activeCategory === cat.id;
          const isCategoryHovered = hoveredCategory === cat.id;
          const itemsInCat = ALL_MENU_ITEMS.filter(m => m.category === cat.id);

          return (
            <div 
              key={cat.id} 
              className="relative"
              onMouseEnter={() => handleMouseEnterCategory(cat.id)}
              onMouseLeave={handleMouseLeaveCategory}
            >
              <button
                onClick={() => {
                  if (hoveredCategory === cat.id) {
                    setHoveredCategory(null);
                  } else {
                    setHoveredCategory(cat.id);
                  }
                }}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 select-none ${
                  isCategoryActive 
                    ? 'text-slate-900 dark:text-white font-extrabold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                {isCategoryActive && (
                  <motion.div 
                    layoutId="desktop-active-category-pill" 
                    className="absolute inset-0 bg-white dark:bg-[#20303e] rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60" 
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1.5">
                  <cat.icon 
                    size={14} 
                    className={isCategoryActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} 
                  />
                  <span>{cat.shortTitle}</span>

                  {/* Micro pill showing currently active item inside this category */}
                  {isCategoryActive && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200/40 dark:border-blue-700/30">
                      {activeItem.shortLabel}
                    </span>
                  )}

                  <ChevronDown 
                    size={12} 
                    className={`transition-transform duration-200 opacity-60 ${isCategoryHovered ? 'rotate-180 text-blue-500' : ''}`} 
                  />
                </span>
              </button>

              {/* Ultra-Modish Category Mega-Flyout Card */}
              <AnimatePresence>
                {isCategoryHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-0 mt-2 w-72 bg-white/95 dark:bg-[#131e28]/95 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/90 p-2 z-50 overflow-hidden backdrop-blur-2xl"
                    onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                    onMouseLeave={handleMouseLeaveCategory}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <div className="flex items-center gap-1.5">
                        <cat.icon size={13} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">{cat.title}</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{itemsInCat.length} Alat</span>
                    </div>

                    <div className="space-y-1">
                      {itemsInCat.map((item) => {
                        const isCurrent = activePage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id);
                              setHoveredCategory(null);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between text-left group ${
                              isCurrent
                                ? `${item.accentColor.lightBg} ${item.accentColor.text} font-bold shadow-xs border ${item.accentColor.border}`
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                isCurrent 
                                  ? `${item.accentColor.bg} text-white shadow-sm` 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-500'
                              }`}>
                                <item.icon size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="leading-tight truncate">{item.label}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-1 font-normal">{item.desc}</p>
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Universal Quick Command / Bento Hub Trigger Button */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/60 dark:hover:bg-slate-800/50 group"
          title="Semua Fitur & Command Palette (Ctrl+K atau /)"
        >
          <Layers size={14} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden lg:inline">Semua</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">12</span>
        </button>
      </nav>

      {/* ─── ULTRA-MODISH BENTO COMMAND CENTER MODAL ─── */}
      <AnimatePresence>
        {isCommandOpen && (
          <div className="fixed inset-0 z-[140] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandOpen(false)}
              className="absolute inset-0 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md"
            />

            {/* Modal Dialog Content */}
            <motion.div 
              initial={{ y: "100%", opacity: 0.5, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#111c26] rounded-t-[36px] md:rounded-[32px] shadow-2xl border border-slate-200/90 dark:border-slate-800/90 z-10 max-h-[92vh] md:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Top Header with Aesthetic Search */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-[#14202c]/50">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 md:hidden" />
                
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Layers size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg sm:text-xl font-black text-slate-900 dark:text-white">Semua Fitur InterSolid</h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          12 Modul
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Setiap modul terintegrasi penuh dan dapat diakses langsung</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCommandOpen(false)}
                    className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    placeholder="Ketik untuk mencari modul (contoh: kalender, AI tutor, galeri, kas, yapping, voting)..."
                    className="w-full pl-10 pr-9 py-3 bg-white dark:bg-[#1a2734] rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200/80 dark:border-slate-700/80 transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs Chips */}
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pt-1">
                  {[
                    { id: 'all', label: 'Semua (12)', icon: Layers },
                    { id: 'akademik', label: 'Akademik (5)', icon: GraduationCap },
                    { id: 'ai', label: 'AI & Studi (2)', icon: Sparkles },
                    { id: 'komunitas', label: 'Komunitas & Fun (5)', icon: HeartHandshake },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'bg-white dark:bg-[#1a2632] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80'
                      }`}
                    >
                      <tab.icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bento Grid Feature Modules (Scrollable) */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                {CATEGORIES.map((section) => {
                  if (activeTab !== 'all' && activeTab !== section.id) return null;

                  const filteredItems = ALL_MENU_ITEMS.filter(item => 
                    item.category === section.id && (
                      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.shortLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <section.icon size={15} className="text-blue-500" />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {section.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {filteredItems.length} Fitur
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredItems.map((item) => {
                          const isCurrent = activePage === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                onNavigate(item.id);
                                setIsCommandOpen(false);
                              }}
                              className={`p-4 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between border group relative overflow-hidden ${
                                isCurrent 
                                  ? `${item.accentColor.lightBg} ${item.accentColor.border} border-2 shadow-md ${item.accentColor.glow}` 
                                  : 'bg-white dark:bg-[#16222d] hover:bg-slate-50 dark:hover:bg-[#1b2b38] border-slate-200/70 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-lg'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                  isCurrent 
                                    ? `${item.accentColor.bg} text-white shadow-md` 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                  <item.icon size={20} />
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {item.badge && (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                      isCurrent 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-500'
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className={`font-bold text-sm mb-1 leading-snug ${
                                  isCurrent ? item.accentColor.text : 'text-slate-900 dark:text-white group-hover:text-blue-500'
                                }`}>
                                  {item.label}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {item.desc}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                                <span>{isCurrent ? 'Sedang Dibuka' : 'Klik untuk Buka'}</span>
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform text-blue-500" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* No Search Results */}
                {ALL_MENU_ITEMS.filter(i => 
                  i.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  i.desc.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="text-center py-12 bg-slate-50 dark:bg-[#14202c] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Tidak ada modul yang cocok dengan "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs text-blue-500 font-bold hover:underline"
                    >
                      Tampilkan Semua Modul
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Footer Info */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-[#0f171f] border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline">Navigasi Cepat:</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px]">⌘K</kbd>
                    <span>/</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px]">/</kbd>
                    <span>Cari Cepat</span>
                  </div>
                </div>
                <span className="font-bold text-blue-500">InterSolid HI Portal</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
