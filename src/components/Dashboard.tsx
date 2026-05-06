import { useState, useEffect, useMemo, memo } from 'react';
import { 
  Calendar, 
  ImageIcon, 
  ChevronRight,
  ChevronLeft,
  Clock, 
  User as UserIcon,
  ArrowRight,
  TrendingUp,
  Zap,
  Users,
  Smile,
  ShieldAlert,
  Terminal,
  Activity,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  getCountFromServer,
  where,
  getDocs
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  user: User | null;
  setActivePage: (id: string, targetId?: string | null) => void;
}

export default function Dashboard({ user, setActivePage }: DashboardProps) {
  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalEvents: 0,
    activityIndex: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartWeek, setChartWeek] = useState(new Date());
  const [realChartData, setRealChartData] = useState<any[]>([]);

  // Fetch real data for chart - Total System Activity from multiple collections
  useEffect(() => {
    const startOfWeek = new Date(chartWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const now = new Date();
    if (startOfWeek > now) {
      setRealChartData([]);
      return;
    }

    // Prepare aggregation data structure
    const activityCounts: Record<string, number> = {};

    const collectionsToTrack = [
      'memories', 'notes', 'aspirasi', 'announcements', 
      'events', 'spin_logs', 'table_activity', 'absenTables', 'portal_logs'
    ];
    const unsubscribes = collectionsToTrack.map(collName => {
      const q = query(
        collection(db, collName),
        where('createdAt', '>=', startOfWeek),
        where('createdAt', '<=', endOfWeek)
      );

      return onSnapshot(q, () => {
        // Any change in any collection triggers a fresh aggregation
        updateAggregatedChart();
      }, (error) => {
        console.warn(`Chart listening error for ${collName}:`, error);
      });
    });

    const updateAggregatedChart = async () => {
      try {
        const counts: Record<string, number> = {};
        
        // Fetch current week for all relevant collections simultaneously
        // Wrapped in individual try-catch to prevent one blocked collection from failing the whole chart
        const snapshotPromises = collectionsToTrack.map(async (coll) => {
          try {
            return await getDocs(query(collection(db, coll), 
              where('createdAt', '>=', startOfWeek), 
              where('createdAt', '<=', endOfWeek)
            ));
          } catch (e) {
            console.warn(`Aggregation skipped for ${coll} due to permissions or missing data`);
            return null;
          }
        });

        const snapshots = await Promise.all(snapshotPromises);

        snapshots.forEach((snapshot, index) => {
          if (!snapshot) return;

          snapshot.forEach(doc => {
            const data = doc.data();
            let date: Date | null = null;
            
            // Check createdAt first, fallback to date for events
            if (data.createdAt) {
              date = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : 
                     data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt);
            } else if (data.date && collectionsToTrack[index] === 'events') {
              date = new Date(data.date);
            }

            if (date && !isNaN(date.getTime())) {
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
              counts[key] = (counts[key] || 0) + 1;
            }
          });
        });

        const data = [];
        let lastVal = 0;
        let hasData = false;

        for (let d = 0; d < 7; d++) {
          const currentD = new Date(startOfWeek);
          currentD.setDate(startOfWeek.getDate() + d);
          for (let h = 0; h < 24; h++) {
            const key = `${currentD.getFullYear()}-${currentD.getMonth()}-${currentD.getDate()}-${h}`;
            const currentHourDate = new Date(currentD);
            currentHourDate.setHours(h);
            const count = counts[key] || 0;
            if (count > 0) hasData = true;
            if (currentHourDate > now) break;
            data.push({
              hourLabel: `${currentHourDate.toLocaleDateString('id-ID', { weekday: 'short' })} ${h}:00`,
              fullDate: `${currentHourDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${h}:00`,
              val: count
            });
          }
        }
        setRealChartData(hasData ? data : []);
        setSystemStatus('optimal');
      } catch (err) {
        setSystemStatus('warning');
      }
    };

    updateAggregatedChart();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [chartWeek]);

  const changeWeek = (offset: number) => {
    setChartWeek(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + (offset * 7));
      return next;
    });
  };

  const [systemStatus, setSystemStatus] = useState<'optimal' | 'warning' | 'critical'>('optimal');
  const [latency, setLatency] = useState(2);

  // Helper for status colors
  const getStatusColor = (type: 'text' | 'bg' | 'border' | 'glow') => {
    switch (systemStatus) {
      case 'optimal':
        if (type === 'text') return 'text-emerald-500';
        if (type === 'bg') return 'bg-emerald-500';
        if (type === 'border') return 'border-emerald-500/20';
        return 'shadow-[0_0_10px_#10b981]';
      case 'warning':
        if (type === 'text') return 'text-amber-500';
        if (type === 'bg') return 'bg-amber-500';
        if (type === 'border') return 'border-amber-500/20';
        return 'shadow-[0_0_10px_#f59e0b]';
      case 'critical':
        if (type === 'text') return 'text-rose-500';
        if (type === 'bg') return 'bg-rose-500';
        if (type === 'border') return 'border-rose-500/20';
        return 'shadow-[0_0_10px_#f43f5e]';
    }
  };

  const getLatencyColor = (val: number) => {
    if (val < 50) return 'text-emerald-500';
    if (val < 150) return 'text-amber-500';
    return 'text-rose-500';
  };

  useEffect(() => {
    // Latency only - doesn't affect status unless absolutely needed
    const interval = setInterval(() => {
       setLatency(prev => {
         const change = Math.floor(Math.random() * 4) - 1; 
         return Math.max(1, prev + change);
       });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get today's date in WIB (UTC+7) or local format YYYY-MM-DD
    const now = new Date();
    // Offset for WIB if needed, but simple local date is usually best for the user
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // 1. Fetch Next Events - Robust: fetch all and filter in memory
    const eventsQuery = query(collection(db, 'events'));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const upcoming = data
        .filter((e: any) => {
          if (!e.date) return false;
          // Simple string comparison for YYYY-MM-DD
          return e.date >= todayStr;
        })
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(0, 3);

      console.log(`[Dashboard] Agenda Sync: Found ${data.length} total docs, matching ${upcoming.length} upcoming for date ${todayStr}`);
      setNextEvents(upcoming);
    }, (error) => {
      console.error("[Dashboard] Event sync error:", error);
    });

    // 2. Fetch Latest Announcement
    const notifQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
      if (!snapshot.empty) {
        setLatestAnnouncement({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });

    // 3. Fetch Memories
    const memoryQuery = query(
      collection(db, 'memories'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    const unsubscribeMemories = onSnapshot(memoryQuery, (snapshot) => {
      setRecentMemories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch Stats
    const getStats = async () => {
      try {
        const memoriesColl = collection(db, 'memories');
        const eventsColl = collection(db, 'events');
        const logsColl = collection(db, 'portal_logs');
        
        const [memCount, eventCount, logCount] = await Promise.all([
          getCountFromServer(memoriesColl),
          getCountFromServer(query(eventsColl, where('date', '>=', todayStr))),
          getCountFromServer(logsColl)
        ]);

        setStats({
          totalMemories: memCount.data().count,
          totalEvents: eventCount.data().count,
          activityIndex: logCount.data().count 
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getStats();

    return () => {
      unsubscribeEvents();
      unsubscribeNotif();
      unsubscribeMemories();
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const [randomTitle] = useState(() => {
    const titles = ['Diplomatés', 'Globalis', 'Internasionalis'];
    return titles[Math.floor(Math.random() * titles.length)];
  });

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-24"
    >
      {/* 01. SYSTEM STATUS BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1 md:px-2">
        <div className="space-y-1 md:space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full animate-ping absolute inset-0`} />
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full relative ${getStatusColor('glow')}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.5em] ${getStatusColor('text')} font-mono`}>
              System {systemStatus === 'optimal' ? 'Live' : systemStatus === 'warning' ? 'Lagging' : 'Critical'}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            Selamat Datang, <span className="text-blue-600">{randomTitle}</span>.
          </h1>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Clock size={10} /> {new Date().toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })} WIB • LOCAL HOST VERIFIED
          </p>
        </div>
        <div 
          className="flex items-center justify-between md:justify-end gap-6 md:gap-12 bg-white/80 dark:bg-[#1a252f]/60 backdrop-blur-xl p-4 rounded-3xl md:p-5 border border-slate-200 dark:border-white/10 shadow-lg"
        >
           {[
             { label: 'Files', val: stats.totalMemories, suffix: 'MB', color: 'text-slate-800 dark:text-white' },
             { label: 'Agenda', val: stats.totalEvents, suffix: 'UNIT', color: 'text-slate-800 dark:text-white' },
             { label: 'Latensi', val: `${latency}ms`, suffix: 'PING', color: getLatencyColor(latency) }
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-center md:items-end">
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{stat.label}</span>
                <div className="flex items-baseline gap-0.5 md:gap-1">
                  <span className={`text-lg md:text-2xl font-black tracking-tighter leading-none ${stat.color}`}>{stat.val}</span>
                  <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">{stat.suffix}</span>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 02. CORE MISSION DISPLAY */}
      <motion.section 
        variants={itemVariants} 
        className="relative -mr-4 md:-mr-10 lg:-mr-16"
      >
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0f18] rounded-l-[56px] md:rounded-[56px] border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-1">
          <div className="flex flex-col">
            {/* Perspective Side - Full Width Hero */}
            <div className="relative p-12 md:p-24 flex flex-col justify-center min-h-[460px] md:min-h-[600px] overflow-hidden rounded-l-[48px] md:rounded-[48px]">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 dark:from-blue-600 dark:via-blue-800 dark:to-slate-900" />
               <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/20 to-transparent" />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)]" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
               
               <div className="relative z-10 w-full max-w-5xl">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="px-5 py-2 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-white">
                       Arsip Utama
                    </div>
                    <div className="w-px h-6 bg-white/30" />
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Version 2.0.4</span>
                  </div>
                  
                  <div className="overflow-hidden mb-12">
                    <motion.h2 
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className="text-8xl md:text-[160px] font-black tracking-tighter leading-[0.7] text-white"
                    >
                      Inter<br/>Solid.
                    </motion.h2>
                  </div>
                  
                  <p className="text-white/90 text-lg md:text-2xl font-medium max-w-2xl mb-16 leading-relaxed">
                    Pusat repositori digital untuk sinkronisasi data kegiatan, dokumentasi historis, dan koordinasi operasional InterSolid.
                  </p>

                  <div className="flex flex-wrap gap-8">
                    <button 
                      onClick={() => setActivePage('notulensi')}
                      className="group flex items-center gap-6 px-14 py-7 bg-white text-blue-700 rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] hover:bg-white/95 transition-all shadow-2xl shadow-blue-900/40 active:scale-95"
                    >
                      Akses Notulensi
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setActivePage('kalender')}
                      className="px-14 py-7 bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] hover:bg-white/20 transition-all active:scale-95"
                    >
                      Jadwal Agenda
                    </button>
                  </div>
               </div>
            </div>

            {/* Information Hub - Distinct Block */}
            <div className="p-10 md:p-24 grid grid-cols-1 lg:grid-cols-2 gap-20 bg-white dark:bg-[#0b121e] transition-colors border-t border-slate-100 dark:border-white/5">
              <div className="space-y-16">
                {/* Warta snippet */}
                {latestAnnouncement && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                       <span className="text-[12px] font-black uppercase tracking-[0.6em] text-blue-600 dark:text-blue-400">Warta Terakhir</span>
                       <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/10" />
                    </div>
                    <div className="group/ann cursor-pointer" onClick={() => setActivePage('pengumuman')}>
                      <h3 className="text-5xl md:text-6xl font-black tracking-tighter group-hover/ann:text-blue-600 transition-colors uppercase leading-[0.85] text-slate-900 dark:text-white">{latestAnnouncement.title}</h3>
                      <p className="text-xl text-slate-600 dark:text-slate-400 line-clamp-3 mt-8 leading-relaxed font-medium">
                        {latestAnnouncement.content}
                      </p>
                    </div>
                  </div>
                )} 

                {/* Next immediate event */}
                <div className="space-y-10 pt-12 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.6em] text-emerald-600 dark:text-emerald-400">Agenda Terdekat</span>
                    <div className="flex items-center gap-2.5">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">LIVE SYNC</span>
                    </div>
                  </div>
                  {nextEvents.length > 0 ? (
                    <div className="space-y-4">
                      {nextEvents.slice(0, 3).map((event: any, idx) => (
                        <motion.div 
                          key={event.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center gap-6 p-6 rounded-[32px] bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-white/[0.06] hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group/ev shadow-md hover:shadow-xl dark:shadow-none" 
                          onClick={() => setActivePage('kalender')}
                        >
                          <div className="flex flex-col items-center shrink-0 min-w-[60px]">
                             <span className="text-[11px] font-black text-blue-600 uppercase tracking-tighter">
                               {(() => {
                                 const today = new Date().toISOString().split('T')[0];
                                 const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                 const nextDay = new Date(Date.now() + 172800000).toISOString().split('T')[0];
                                 if (event.date === today) return "HARI INI";
                                 if (event.date === tomorrow) return "BESOK";
                                 if (event.date === nextDay) return "LUSA";
                                 return new Date(event.date).toLocaleDateString('id-ID', { month: 'short' });
                               })()}
                             </span>
                             <span className="text-4xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">{new Date(event.date).getDate()}</span>
                          </div>
                          <div className="h-12 w-px bg-slate-200 dark:bg-white/10" />
                          <div className="flex-1">
                            <h4 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white group-hover/ev:text-blue-600 transition-colors leading-tight line-clamp-1">{event.title}</h4>
                            <div className="flex items-center gap-3 mt-2">
                               <p className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-[0.3em] flex items-center gap-1.5">
                                  <Clock size={12} className="text-blue-600" /> {event.time || 'TBA'}
                               </p>
                               <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                               <p className="text-[9px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-[0.3em]">
                                  {event.genre || 'UMUM'}
                               </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-white/10 bg-white/20 dark:bg-white/[0.01] text-center">
                       <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.6em]">Tidak ada record aktif</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="hidden md:block">
                  {/* Decorative element for balance */}
                  <div className="w-full aspect-square max-h-[300px] opacity-10 dark:opacity-20 pointer-events-none">
                     <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-blue-500">
                        <path d="M44.7,-76.4C58,-69.2,69.2,-58,76.4,-44.7C83.6,-31.4,86.7,-15.7,85.6,-0.6C84.5,14.5,79.2,28.9,71.1,41.4C63,53.8,52.1,64.3,39.3,71.5C26.5,78.7,11.8,82.5,-3.1,87.9C-18,93.4,-33.2,100.4,-45.5,95.5C-57.7,90.6,-67.1,73.8,-74.6,58.3C-82.1,42.8,-87.6,28.5,-89.7,13.6C-91.8,-1.3,-90.4,-16.8,-84.9,-30.9C-79.3,-45,-69.6,-57.7,-57.1,-65.4C-44.7,-73.2,-29.4,-76,-13.7,-81.4C2,-86.8,17.7,-94.7,33.3,-92.9C48.9,-91.1,64.4,-79.6,44.7,-76.4Z" transform="translate(100 100)" />
                     </svg>
                  </div>
                </div>

                <div className="mt-12 md:mt-0 pt-10 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                   <div className="flex -space-x-3">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className="w-12 h-12 rounded-2xl border-2 border-white dark:border-[#0b121f] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-lg transition-transform hover:-translate-y-1 hover:z-20">
                          <UserIcon size={18} className="text-slate-400 dark:text-slate-500" />
                       </div>
                     ))}
                   </div>
                   <div className="text-right">
                      <p className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{stats.activityIndex} Aktivitas Tercatat</p>
                      <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.5em] mt-2 flex items-center justify-end gap-2">
                         <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                         INDEKS SISTEM: REAL-TIME
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 03. ANALYTICS & LOGS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Activity Chart */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-8 bg-white dark:bg-[#0f172a] rounded-[48px] p-10 md:p-12 border border-blue-50 dark:border-white/5 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="space-y-1">
               <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600">Aliran Aktivitas Portal</h2>
               <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                 Log Pekan: {(() => {
                   const start = new Date(chartWeek);
                   const day = start.getDay();
                   const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                   start.setDate(diff);
                   const end = new Date(start);
                   end.setDate(start.getDate() + 6);
                   return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                 })()}
               </p>
            </div>
            <div className="flex items-center gap-2">
               <motion.button 
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => changeWeek(-1)}
                 className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-blue-500 transition-colors shadow-sm"
               >
                 <ChevronLeft size={16} />
               </motion.button>
               <motion.button 
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => changeWeek(1)}
                 className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-slate-400 hover:text-blue-500 transition-colors shadow-sm"
               >
                 <ChevronRight size={16} />
               </motion.button>
               <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 ml-2 border border-slate-200 dark:border-white/5 shadow-sm">
                  <Activity size={18} />
               </div>
            </div>
          </div>

          <div className="h-[240px] w-full">
            {realChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                  <XAxis 
                    dataKey="hourLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fill: '#64748b', fontWeight: 900 }}
                    interval={23}
                  />
                  <YAxis hide domain={[0, 'dataMax + 1']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      backdropFilter: 'blur(10px)'
                    }} 
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                    formatter={(value: any) => [
                      <span className="text-xl font-black text-blue-400 tracking-tighter">{value} ENTRI</span>,
                      ''
                    ]}
                    labelFormatter={(label) => (
                      <span className="block text-[9px] font-black text-slate-400 mb-2 tracking-widest">{label}</span>
                    )}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                 <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300">
                   <Clock size={24} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tidak ada aktivitas rekaman pada periode ini</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-10">
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Puncak Aktivitas</p>
                   <p className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">
                     {realChartData.length > 0 ? Math.max(...realChartData.map(d => d.val)) : 0} Entri
                   </p>
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Sistem</p>
                   <p className={`text-xl font-black tracking-tighter ${systemStatus === 'optimal' ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {systemStatus.toUpperCase()}
                   </p>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Command Center Tools */}
        <div className="md:col-span-4 space-y-10">
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 rounded-[48px] p-10 border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col h-full"
          >
             <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-10">Operasional</h2>
             <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'spin', icon: Zap, label: 'RANDOMIZER', color: 'bg-indigo-600' },
                  { id: 'voting', icon: TrendingUp, label: 'E-VOTING', color: 'bg-slate-700 dark:bg-slate-800' },
                  { id: 'absen', icon: Users, label: 'PRESENSI', color: 'bg-emerald-600' },
                  { id: 'notulensi', icon: Clock, label: 'NOTULENSI', color: 'bg-blue-600' }
                ].map(tool => (
                  <button 
                    key={tool.id}
                    onClick={() => setActivePage(tool.id)}
                    className="flex flex-col items-center gap-4 p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group/tool active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${tool.color} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                      <tool.icon size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 group-hover/tool:text-blue-600 dark:group-hover/tool:text-white transition-colors capitalize">{tool.label}</span>
                  </button>
                ))}
             </div>
          </motion.div>
          
          {/* System Terminal Log */}
          <motion.div 
            variants={itemVariants}
            className="bg-slate-100 dark:bg-black/90 backdrop-blur-xl rounded-[40px] p-8 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden group min-h-[160px]"
          >
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <Terminal size={12} className="text-emerald-600 dark:text-emerald-500" />
                   <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">Console Stream</span>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-1.5 h-1.5 bg-red-500/40 rounded-full" />
                   <div className="w-1.5 h-1.5 bg-amber-500/40 rounded-full" />
                   <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
                </div>
             </div>
             
             <div className="space-y-2.5 font-mono">
                {recentMemories.length > 0 ? recentMemories.slice(0, 4).map((m, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActivePage('memory', m.id)}
                    className="text-[9px] text-slate-600 dark:text-slate-400 flex items-start gap-2 group/log cursor-pointer hover:text-emerald-500 transition-colors"
                  >
                     <span className="text-emerald-500/40 opacity-0 group-hover/log:opacity-100 transition-opacity">$&gt;</span>
                     <p className="line-clamp-1">
                        <span className="text-slate-400 dark:text-slate-500 font-bold">[{new Date().toLocaleTimeString('id-id', { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>{' '}
                        <span className="text-blue-600 dark:text-blue-500 font-black">{m.userName?.toUpperCase().split(' ')[0] || 'PERSONEL'}</span>: PUSH_DOCUMENT_{m.id?.slice(0,4)}
                     </p>
                  </div>
                )) : (
                   <div className="text-[9px] text-slate-400 dark:text-slate-500 italic">Listening for system events...</div>
                )}
                <motion.div 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-1.5 h-3 bg-emerald-600 dark:bg-emerald-500 mt-2" 
                />
             </div>
          </motion.div>
        </div>

        {/* Highlight Memory - Full Width Wide */}
        <motion.div 
          variants={itemVariants}
          onClick={() => setActivePage('memory', recentMemories[0]?.id)}
          className="md:col-span-12 relative overflow-hidden bg-white dark:bg-slate-900 rounded-[56px] border border-blue-50 dark:border-white/5 shadow-xl group cursor-pointer h-[440px]"
        >
          <div className="absolute inset-0 grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000">
             {recentMemories[0] ? (
               <img src={recentMemories[0].url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
             )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 dark:from-slate-950 dark:via-slate-950/40 to-transparent" />
          
          <div className="absolute bottom-0 inset-x-0 p-12 md:p-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
             <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                      <Database size={16} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Arsip Dokumentasi</span>
                </div>
                <h3 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none italic drop-shadow-2xl">
                  "{recentMemories[0]?.caption || 'Menyimpan setiap detik kebersamaan kita.'}"
                </h3>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                   Personel: {recentMemories[0]?.userName || 'Sistem'} • Integritas: Validated
                </p>
             </div>
             
             <button 
               onClick={(e) => { e.stopPropagation(); setActivePage('memory', recentMemories[0]?.id); }}
               className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-100 transition-all flex items-center gap-3 shadow-2xl"
             >
                BUKA DATABASE <ArrowRight size={14} />
             </button>
          </div>
        </motion.div>
      </div>

      {/* FOOTER */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col items-center text-center pt-10"
      >
         <div className="w-px h-20 bg-gradient-to-b from-blue-600 to-transparent mb-8" />
         <div className="flex items-center gap-4 mb-3">
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-400 font-bold">InterSolid Hub</p>
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
         </div>
         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Est. 2025 • INTERCLASS • SOLID SOLID SOLID</p>
      </motion.div>
    </motion.div>
  );
}
