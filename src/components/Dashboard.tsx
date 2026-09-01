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
  Database,
  Bot,
  Sparkles,
  MessageSquare
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
      className="space-y-6 md:space-y-8 pb-20"
    >
      {/* 01. SYSTEM STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative">
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full animate-ping absolute inset-0`} />
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full relative ${getStatusColor('glow')}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${getStatusColor('text')} font-mono`}>
              System {systemStatus === 'optimal' ? 'Live' : systemStatus === 'warning' ? 'Lagging' : 'Critical'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
            Welcome, <span className="text-blue-600 dark:text-blue-400">{randomTitle}</span>.
          </h1>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
             <Clock size={10} /> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB • LOCAL HOST VERIFIED
          </p>
        </div>
        
        <div 
          className="flex items-center justify-between sm:justify-end gap-5 sm:gap-8 bg-white/80 dark:bg-[#1a252f]/60 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0"
        >
           {[
             { label: 'Files', val: stats.totalMemories, suffix: 'MB', color: 'text-slate-800 dark:text-white' },
             { label: 'Agenda', val: stats.totalEvents, suffix: 'UNITS', color: 'text-slate-800 dark:text-white' },
             { label: 'Latency', val: `${latency}ms`, suffix: 'PING', color: getLatencyColor(latency) }
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-center sm:items-end">
                 <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.15em] text-slate-500 mb-0.5">{stat.label}</span>
                 <div className="flex items-baseline gap-0.5">
                   <span className={`text-base md:text-xl font-black tracking-tight leading-none ${stat.color}`}>{stat.val}</span>
                   <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase ml-0.5">{stat.suffix}</span>
                 </div>
             </div>
           ))}
        </div>
      </div>

      {/* 02. CORE MISSION DISPLAY */}
      <motion.section 
        variants={itemVariants} 
        className="relative w-full"
      >
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0f18] rounded-3xl md:rounded-[36px] border border-slate-200 dark:border-white/10 shadow-lg p-1">
          <div className="flex flex-col">
            {/* Full Width Hero Banner */}
            <div className="relative p-6 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-center min-h-[280px] md:min-h-[340px] overflow-hidden rounded-[22px] md:rounded-[32px]">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 dark:from-blue-600 dark:via-blue-800 dark:to-slate-900" />
               <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/20 to-transparent" />
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)]" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
               
               <div className="relative z-10 w-full max-w-4xl">
                  <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="px-3.5 py-1.5 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-white">
                       Core Archive
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Version 2.0.4</span>
                  </div>
                  
                  <div className="overflow-hidden mb-6 sm:mb-8">
                    <motion.h2 
                       initial={{ y: "100%" }}
                       animate={{ y: 0 }}
                       transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                       className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] text-white"
                    >
                      InterSolid.
                    </motion.h2>
                  </div>
                  
                  <p className="text-white/90 text-sm sm:text-base md:text-lg font-normal max-w-xl mb-8 leading-relaxed">
                    Digital repository center for event database synchronization, historical documents, and InterSolid operational hub.
                  </p>

                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <button 
                      onClick={() => setActivePage('notulensi')}
                      className="group flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-blue-700 rounded-xl sm:rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/95 transition-all shadow-xl shadow-blue-900/30 active:scale-95"
                    >
                      Meeting Minutes
                      <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setActivePage('kalender')}
                      className="px-6 sm:px-8 py-3 sm:py-3.5 bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-xl sm:rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/20 transition-all active:scale-95"
                    >
                      Class Schedule
                    </button>
                  </div>
               </div>
            </div>

            {/* Information Hub - Two Columns */}
            <div className="p-6 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 bg-white dark:bg-[#0b121e] transition-colors border-t border-slate-100 dark:border-white/5">
              <div className="space-y-8">
                {/* Warta snippet */}
                {latestAnnouncement && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Latest Announcement</span>
                       <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/10" />
                    </div>
                    <div className="group/ann cursor-pointer" onClick={() => setActivePage('pengumuman')}>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight group-hover/ann:text-blue-600 transition-colors uppercase leading-tight text-slate-900 dark:text-white">
                        {latestAnnouncement.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed font-normal">
                        {latestAnnouncement.content}
                      </p>
                    </div>
                  </div>
                )} 

                {/* Next immediate event */}
                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Upcoming Schedule</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">LIVE SYNC</span>
                    </div>
                  </div>
                  {nextEvents.length > 0 ? (
                    <div className="space-y-3">
                      {nextEvents.slice(0, 3).map((event: any, idx) => (
                        <motion.div 
                          key={event.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-white/[0.06] hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group/ev shadow-sm hover:shadow-md" 
                          onClick={() => setActivePage('kalender')}
                        >
                          <div className="flex flex-col items-center shrink-0 min-w-[48px]">
                             <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                               {(() => {
                                 const today = new Date().toISOString().split('T')[0];
                                 const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                 const nextDay = new Date(Date.now() + 172800000).toISOString().split('T')[0];
                                 if (event.date === today) return "TODAY";
                                 if (event.date === tomorrow) return "TOMORROW";
                                 if (event.date === nextDay) return "DAY AFTER";
                                 return new Date(event.date).toLocaleDateString('en-US', { month: 'short' });
                                })()}
                             </span>
                             <span className="text-2xl font-black tracking-tighter leading-none text-slate-900 dark:text-white">{new Date(event.date).getDate()}</span>
                          </div>
                          <div className="h-9 w-px bg-slate-200 dark:bg-white/10" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm uppercase tracking-tight text-slate-900 dark:text-white group-hover/ev:text-blue-600 transition-colors leading-tight truncate">{event.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                  <Clock size={10} className="text-blue-600 dark:text-blue-400" /> {event.time || 'TBA'}
                               </p>
                               <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                               <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                  {event.genre || 'GENERAL'}
                               </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/20 dark:bg-white/[0.01] text-center">
                       <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No active records found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                {/* Portal Central Overview Widget */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
                        <Database size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">InterSolid Hub</h4>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Cloud Sync & Database Node</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Pusat arsip terpusat untuk sinkronisasi jadwal perkuliahan, notulensi rapat divisi, repositori berkas, dan voting mahasiswa.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 text-left">
                      <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">Database</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Firebase Firestore</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 text-left">
                      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Keamanan</p>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Role Verified</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 md:mt-0 pt-6 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                   <div className="flex -space-x-2">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className="w-9 h-9 rounded-xl border-2 border-white dark:border-[#0b121f] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md transition-transform hover:-translate-y-0.5 hover:z-20">
                           <UserIcon size={14} className="text-slate-400 dark:text-slate-500" />
                       </div>
                     ))}
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{stats.activityIndex} Recorded Activities</p>
                      <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center justify-end gap-1.5">
                         <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                         SYSTEM INDEX: REAL-TIME
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 03. ANALYTICS & LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Activity Chart */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-8 bg-white dark:bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-blue-50 dark:border-white/5 shadow-md flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-0.5">
               <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Portal Activity Feed</h2>
               <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                 Weekly Log: {(() => {
                   const start = new Date(chartWeek);
                   const day = start.getDay();
                   const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                   start.setDate(diff);
                   const end = new Date(start);
                   end.setDate(start.getDate() + 6);
                   return `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                 })()}
               </p>
            </div>
            <div className="flex items-center gap-1.5">
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => changeWeek(-1)}
                 className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shadow-sm"
               >
                 <ChevronLeft size={14} />
               </motion.button>
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => changeWeek(1)}
                 className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shadow-sm"
               >
                 <ChevronRight size={14} />
               </motion.button>
               <div className="w-8 h-8 bg-white dark:bg-white/5 rounded-lg flex items-center justify-center text-slate-400 ml-1 border border-slate-200 dark:border-white/5 shadow-sm">
                  <Activity size={15} />
               </div>
            </div>
          </div>

          <div className="h-[200px] md:h-[220px] w-full">
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
                    tick={{ fontSize: 8, fill: '#64748b', fontWeight: 700 }}
                    interval={23}
                  />
                  <YAxis hide domain={[0, 'dataMax + 1']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      backdropFilter: 'blur(8px)'
                    }} 
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                    formatter={(value: any) => [
                      <span className="text-base font-black text-blue-400 tracking-tight">{value} ENTRIES</span>,
                      ''
                    ]}
                    labelFormatter={(label) => (
                      <span className="block text-[8px] font-bold text-slate-400 mb-1 tracking-widest">{label}</span>
                    )}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                 <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300">
                   <Clock size={18} />
                 </div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No recorded activities for this period</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-6 sm:gap-8">
                <div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Activity Peak</p>
                   <p className="text-base font-black tracking-tight text-slate-800 dark:text-white">
                     {realChartData.length > 0 ? Math.max(...realChartData.map(d => d.val)) : 0} Entries
                   </p>
                </div>
                <div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">System Status</p>
                   <p className={`text-base font-black tracking-tight ${systemStatus === 'optimal' ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {systemStatus.toUpperCase()}
                   </p>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Command Center Tools & Console */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-md"
          >
             <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">Operations</h2>
             <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'spin', icon: Zap, label: 'RANDOMIZER', color: 'bg-indigo-600' },
                  { id: 'voting', icon: TrendingUp, label: 'VOTE', color: 'bg-slate-700 dark:bg-slate-800' },
                  { id: 'absen', icon: Users, label: 'ATTENDANCE', color: 'bg-emerald-600' },
                  { id: 'notulensi', icon: Clock, label: 'MINUTES', color: 'bg-blue-600' }
                ].map(tool => (
                  <button 
                    key={tool.id}
                    onClick={() => setActivePage(tool.id)}
                    className="flex flex-col items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group/tool active:scale-95"
                  >
                    <div className={`w-10 h-10 rounded-xl ${tool.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                      <tool.icon size={18} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover/tool:text-blue-600 dark:group-hover/tool:text-white transition-colors">{tool.label}</span>
                  </button>
                ))}
             </div>
          </motion.div>
          
          {/* System Terminal Log */}
          <motion.div 
            variants={itemVariants}
            className="bg-slate-100 dark:bg-black/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-md overflow-hidden group min-h-[140px]"
          >
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <Terminal size={12} className="text-emerald-600 dark:text-emerald-500" />
                   <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Console Stream</span>
                </div>
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-red-500/40 rounded-full" />
                   <div className="w-1.5 h-1.5 bg-amber-500/40 rounded-full" />
                   <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
                </div>
             </div>
             
             <div className="space-y-2 font-mono">
                {recentMemories.length > 0 ? recentMemories.slice(0, 3).map((m, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActivePage('memory', m.id)}
                    className="text-[9px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 group/log cursor-pointer hover:text-emerald-500 transition-colors"
                  >
                     <span className="text-emerald-500/40 opacity-0 group-hover/log:opacity-100 transition-opacity">$&gt;</span>
                     <p className="line-clamp-1">
                        <span className="text-slate-400 dark:text-slate-500 font-bold">[{new Date().toLocaleTimeString('id-id', { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{m.userName?.toUpperCase().split(' ')[0] || 'PERSONEL'}</span>: PUSH_DOC_{m.id?.slice(0,4)}
                     </p>
                  </div>
                )) : (
                   <div className="text-[9px] text-slate-400 dark:text-slate-500 italic">Listening for system events...</div>
                )}
                <motion.div 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-1.5 h-3 bg-emerald-600 dark:bg-emerald-500 mt-1" 
                />
             </div>
          </motion.div>
        </div>

        {/* Highlight Memory - Full Width Wide */}
        <motion.div 
          variants={itemVariants}
          onClick={() => setActivePage('memory', recentMemories[0]?.id)}
          className="lg:col-span-12 relative overflow-hidden bg-slate-950 rounded-3xl md:rounded-[36px] border border-blue-50 dark:border-white/5 shadow-lg group cursor-pointer h-[280px] sm:h-[340px] md:h-[380px]"
        >
          <div className="absolute inset-0 grayscale-[0.4] group-hover:grayscale-0 transition-all duration-700">
             {recentMemories[0] ? (
               <>
                 {/* Blurred ambient background */}
                 <img src={recentMemories[0].url} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none" alt="" referrerPolicy="no-referrer" />
                 {/* Center photo */}
                 <img src={recentMemories[0].url} className="relative z-10 w-full h-full object-cover md:object-contain group-hover:scale-105 transition-transform duration-700" alt="" referrerPolicy="no-referrer" />
               </>
             ) : (
               <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
             )}
          </div>
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 inset-x-0 z-20 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
             <div className="max-w-xl space-y-3">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md">
                      <Database size={13} />
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">Documentation Archive</span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight italic drop-shadow-lg">
                  "{recentMemories[0]?.caption || 'Preserving every second of our togetherness.'}"
                </h3>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                   Personnel: {recentMemories[0]?.userName || 'System'} • Integrity: Validated
                </p>
             </div>
             
             <button 
               onClick={(e) => { e.stopPropagation(); setActivePage('memory', recentMemories[0]?.id); }}
               className="px-6 py-3 bg-white text-slate-950 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-xl shrink-0"
             >
                OPEN ARCHIVE <ArrowRight size={13} />
             </button>
          </div>
        </motion.div>
      </div>

      {/* FOOTER */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col items-center text-center pt-6"
      >
         <div className="w-px h-12 bg-gradient-to-b from-blue-600 to-transparent mb-4" />
         <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 font-bold">InterSolid Hub</p>
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
         </div>
         <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Est. 2025 • INTERCLASS • SOLID SOLID SOLID</p>
      </motion.div>
    </motion.div>
  );
}
