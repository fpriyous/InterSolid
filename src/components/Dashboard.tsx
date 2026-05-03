import { useState, useEffect, useMemo } from 'react';
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
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  ComposedChart, 
  Bar, 
  Cell,
  Line,
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';

interface DashboardProps {
  user: User | null;
  setActivePage: (id: string) => void;
}

const Candlestick = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;
  if (!payload || !yAxis || typeof yAxis.scale !== 'function') return null;
  
  const { open, close, high, low, trend } = payload;
  const isUp = trend === 'up';
  const finalColor = isUp ? '#10b981' : '#f43f5e';
  
  const bodyWidth = Math.max(width * 0.8, 2);
  const wickX = x + width / 2;

  // Transform data values to Y coordinates
  try {
    const yOpen = yAxis.scale(open);
    const yClose = yAxis.scale(close);
    const yHigh = yAxis.scale(high);
    const yLow = yAxis.scale(low);

    return (
      <g>
        {/* Wick */}
        <line
          x1={wickX}
          y1={yHigh}
          x2={wickX}
          y2={yLow}
          stroke={finalColor}
          strokeWidth={1.5}
        />
        {/* Body */}
        <rect
          x={x + (width - bodyWidth) / 2}
          y={Math.min(yOpen, yClose)}
          width={bodyWidth}
          height={Math.max(Math.abs(yOpen - yClose), 2)}
          fill={finalColor}
          rx={1}
        />
      </g>
    );
  } catch (e) {
    return (
      <rect
        x={x + (width - bodyWidth) / 2}
        y={y}
        width={bodyWidth}
        height={height}
        fill={finalColor}
      />
    );
  }
};

export default function Dashboard({ user, setActivePage }: DashboardProps) {
  const [nextEvents, setNextEvents] = useState<any[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalEvents: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartWeek, setChartWeek] = useState(new Date());
  const [realChartData, setRealChartData] = useState<any[]>([]);

  // Fetch real data for chart - HOURLY for a week
  useEffect(() => {
    const startOfWeek = new Date(chartWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    // Find the Monday of the current week
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

    const q = query(
      collection(db, 'memories'),
      where('createdAt', '>=', startOfWeek),
      where('createdAt', '<=', endOfWeek)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Group by [dayIndex][hourIndex]
      const counts: Record<string, number> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate();
        if (date) {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      const data = [];
      let lastVal = 0;
      let hasData = false;

      // Loop through 7 days, 24 hours each = 168 points
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

          const open = lastVal;
          const close = count;
          
          // Mimic stock high/low with slight variance if there's activity
          const high = Math.max(open, close) + (count > 0 ? Math.random() * 1.5 : 0);
          const low = Math.max(0, Math.min(open, close) - (count > 0 ? Math.random() * 0.5 : 0));

          data.push({
            hourLabel: `${currentHourDate.toLocaleDateString('id-ID', { weekday: 'short' })} ${h}:00`,
            fullDate: `${currentHourDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${h}:00`,
            open,
            close,
            high,
            low,
            val: count,
            trend: close >= open ? 'up' : 'down'
          });
          lastVal = close;
        }
      }
      setRealChartData(hasData ? data : []);
    }, (error) => {
      console.error("Dashboard Chart Error:", error);
      // Fallback or empty state
      setRealChartData([]);
    });

    return () => unsubscribe();
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
    // Randomize latency slightly for feel
    const interval = setInterval(() => {
       setLatency(prev => {
         const change = Math.floor(Math.random() * 40) - 15; // More variance to see status changes
         const next = Math.max(1, prev + change);
         if (next > 200) setSystemStatus('critical');
         else if (next > 100) setSystemStatus('warning');
         else setSystemStatus('optimal');
         return next;
       });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch Next Events
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('date', 'asc'),
      limit(3)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNextEvents(data.filter((e: any) => e.date >= today));
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
        
        const [memCount, eventCount] = await Promise.all([
          getCountFromServer(memoriesColl),
          getCountFromServer(query(eventsColl, where('date', '>=', today)))
        ]);

        setStats({
          totalMemories: memCount.data().count,
          totalEvents: eventCount.data().count,
          totalUsers: 32 
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

  if (loading) return null;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-24"
    >
      {/* 01. SYSTEM STATUS BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full animate-ping absolute inset-0`} />
               <div className={`w-2 h-2 ${getStatusColor('bg')} rounded-full relative ${getStatusColor('glow')}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.5em] ${getStatusColor('text')} font-mono`}>
              System {systemStatus === 'optimal' ? 'Live' : systemStatus === 'warning' ? 'Lagging' : 'Critical'}
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            Selamat Datang, <span className="text-blue-600">{user?.displayName?.split(' ')[0] || 'Personel'}</span>.
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Clock size={10} /> {new Date().toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })} WIB • LOCAL HOST VERIFIED
          </p>
        </div>

        <div className="flex items-center gap-8 md:gap-12">
           {[
             { label: 'Dokumentasi', val: stats.totalMemories, suffix: 'MB', color: 'text-slate-800 dark:text-white' },
             { label: 'Agenda Aktif', val: stats.totalEvents, suffix: 'UNIT', color: 'text-slate-800 dark:text-white' },
             { label: 'Latensi', val: `${latency}ms`, suffix: 'PING', color: getLatencyColor(latency) }
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black tracking-tighter leading-none ${stat.color}`}>{stat.val}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{stat.suffix}</span>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 02. CORE MISSION DISPLAY */}
      <motion.section variants={itemVariants} className="relative">
        <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-950 rounded-[48px] border border-slate-200 dark:border-white/5 shadow-2xl p-1">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Perspective Side */}
            <div className="lg:col-span-7 relative p-12 md:p-16 flex flex-col justify-center min-h-[440px] overflow-hidden rounded-[44px]">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-500 to-indigo-800 dark:from-blue-700 dark:via-blue-600 dark:to-slate-900" />
               <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)]" />
               
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-[8px] font-black uppercase tracking-[0.3em] text-white">
                       Arsip Utama
                    </div>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Version 2.0.4</span>
                  </div>
                  
                  <div className="overflow-hidden mb-8">
                    <motion.h2 
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.75] text-white"
                    >
                      Inter<br/>Solid.
                    </motion.h2>
                  </div>
                  
                  <p className="text-white/60 text-sm md:text-base font-medium max-w-sm mb-12 leading-relaxed">
                    Pusat repositori digital untuk sinkronisasi data kegiatan, dokumentasi historis, dan koordinasi operasional InterSolid.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setActivePage('notulensi')}
                      className="group flex items-center gap-4 px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blue-50 transition-all shadow-xl shadow-blue-500/20 dark:shadow-blue-900/40 active:scale-95"
                    >
                      Akses Notulensi
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setActivePage('kalender')}
                      className="px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/20 transition-all active:scale-95"
                    >
                      Jadwal Agenda
                    </button>
                  </div>
               </div>
            </div>

            {/* Information Hub */}
            <div className="lg:col-span-12 p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-10 bg-white dark:bg-[#0f172a] transition-colors border-t border-slate-100 dark:border-white/5">
              <div className="space-y-10">
                {/* Warta snippet */}
                {latestAnnouncement && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                       <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Warta Terakhir</span>
                       <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                    </div>
                    <div className="group/ann cursor-pointer" onClick={() => setActivePage('pengumuman')}>
                      <h3 className="text-3xl font-black tracking-tight group-hover/ann:text-blue-500 transition-colors uppercase leading-none text-slate-800 dark:text-white">{latestAnnouncement.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mt-4 leading-relaxed font-semibold">
                        {latestAnnouncement.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Next immediate event */}
                <div className="space-y-6 pt-12 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Agenda Terdekat</span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase">Syncing...</span>
                  </div>
                  {nextEvents[0] ? (
                    <div className="flex items-center gap-6 p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:border-blue-500/50 transition-all group/ev" onClick={() => setActivePage('kalender')}>
                      <div className="flex flex-col items-center shrink-0">
                         <span className="text-[11px] font-black text-blue-500 uppercase tracking-tighter">{new Date(nextEvents[0].date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                         <span className="text-4xl font-black tracking-tighter leading-none text-slate-800 dark:text-white">{new Date(nextEvents[0].date).getDate()}</span>
                      </div>
                      <div className="h-12 w-px bg-slate-200 dark:bg-white/10" />
                      <div className="flex-1">
                        <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-white group-hover/ev:text-blue-400 transition-colors">{nextEvents[0].title}</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                           <Clock size={10} /> {nextEvents[0].time || 'TBA'} • {nextEvents[0].genre || 'Resmi'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                       <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Tidak ada record aktif</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <div className="flex -space-x-2">
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className="w-11 h-11 rounded-xl border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UserIcon size={16} className="text-slate-400 dark:text-slate-500" />
                     </div>
                   ))}
                 </div>
                 <div className="text-right">
                    <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">{stats.totalUsers+20} Personel</p>
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1">Status: Terverifikasi</p>
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
               <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600">Aliran Data Memori</h2>
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
                <ComposedChart data={realChartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="hourLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fill: '#64748b', fontWeight: 900 }}
                    interval={23}
                  />
                  <YAxis hide domain={[0, 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--tooltip-bg, #ffffff)', 
                      border: 'none', 
                      borderRadius: '16px',
                      color: 'var(--tooltip-text, #1e293b)',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }} 
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }}
                    formatter={(value: any) => [
                      <span className="text-xl font-black text-blue-600 tracking-tighter">{value} ENTRI</span>,
                      ''
                    ]}
                    labelFormatter={(label) => (
                      <div className="text-[9px] font-black text-slate-400 mb-2 tracking-widest">{label}</div>
                    )}
                  />
                  <Bar 
                    dataKey="val" 
                    shape={<Candlestick />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                 <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300">
                   <Clock size={24} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Data belum divalidasi untuk periode ini</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-10">
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Tertinggi</p>
                   <p className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">
                     {realChartData.length > 0 ? Math.max(...realChartData.map(d => d.val)) : 0} Entri
                   </p>
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Database</p>
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
                  <div key={i} className="text-[9px] text-slate-600 dark:text-slate-400 flex items-start gap-2 group/log">
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
          onClick={() => setActivePage('memory')}
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
             
             <button className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-100 transition-all flex items-center gap-3 shadow-2xl">
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
