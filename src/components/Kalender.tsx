import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Lock, Pencil, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, logPortalActivity } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import { User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface Event {
  id: string;
  title: string;
  genre: string;
  time: string;
  note: string;
  date: string;
  authorId: string;
  memoryUrl?: string;
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const GENRE_COLORS: Record<string, string> = {
  tugas: '#3a9ce5',
  uts: '#f59e0b',
  event: '#10b981',
  libur: '#ef4444',
  materi: '#8b5cf6',
  lainnya: '#6b7280'
};

export default function Kalender({ user, isAdmin, setActivePage }: { user: User | null, isAdmin: boolean, setActivePage?: (page: string, targetId?: string | null) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  const [memories, setMemories] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', genre: 'tugas', time: '', note: '' });

  useEffect(() => {
    // Listen to events
    const qEvents = collection(db, 'events');
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const allEvents: Record<string, Event[]> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as Event;
        const date = data.date;
        if (!allEvents[date]) allEvents[date] = [];
        allEvents[date].push({ ...data, id: doc.id });
      });
      setEvents(allEvents);
      if (allEvents) setLoading(false);
    }, (error) => {
      console.error("Kalender events listener error:", error);
    });

    // Listen to memories
    const qMemories = collection(db, 'memories');
    const unsubscribeMemories = onSnapshot(qMemories, (snapshot) => {
      const allMemories: Record<string, any[]> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.displayDate; // Memory uses displayDate
        if (date) {
          if (!allMemories[date]) allMemories[date] = [];
          allMemories[date].push({ ...data, id: doc.id });
        }
      });
      setMemories(allMemories);
    }, (error) => {
      console.error("Kalender memories listener error:", error);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeMemories();
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const handleAddEvent = async () => {
    if (!user || !form.title) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), {
          ...form,
          updatedAt: Timestamp.now()
        });
      } else {
        const eventData = {
          ...form,
          date: selectedDate,
          authorId: user.uid,
          createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, 'events'), eventData);
        logPortalActivity('event_create', `Jadwal: ${form.title}`, user);
        // Otomatis sinkronkan ke calendar pembuat
        addToGoogleCalendar({ ...eventData, id: docRef.id } as Event, true);
      }
      setForm({ title: '', genre: 'tugas', time: '', note: '' });
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (e: Event) => {
    setForm({ title: e.title, genre: e.genre, time: e.time, note: e.note });
    setEditingId(e.id);
  };

  const deleteEvent = async (id: string) => {
    if (!isAdmin) return alert('Hanya admin yang bisa menghapus jadwal!');
    try {
      await deleteDoc(doc(db, 'events', id));
      setConfirmId(null);
    } catch (e: any) {
      console.error("Delete event error:", e);
      alert('Gagal menghapus jadwal: ' + (e.message || "Izin ditolak"));
      setConfirmId(null);
    }
  };

  const addToGoogleCalendar = async (e: Event, isAuto = false) => {
    const token = localStorage.getItem('googleAccessToken');
    
    // Jika manual klik atau tidak ada token, gunakan cara URL Template (cara lama yang handal)
    if (!isAuto && !token) {
      try {
        const [y, m, d] = e.date.split('-');
        let startDateTime = `${y}${m}${d}`;
        let endDateTime = `${y}${m}${d}`;

        if (e.time && e.time.includes(':')) {
          const [hours, minutes] = e.time.split(':');
          const startHour = hours.padStart(2, '0');
          const startMin = minutes.padStart(2, '0');
          const endHour = String(Math.min(23, Number(startHour) + 1)).padStart(2, '0');
          startDateTime += `T${startHour}${startMin}00`;
          endDateTime += `T${endHour}${startMin}00`;
        }

        const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
        const url = `${baseUrl}&text=${encodeURIComponent(e.title)}&details=${encodeURIComponent(e.note || '')}&dates=${startDateTime}/${endDateTime}`;
        window.open(url, '_blank');
      } catch (err) {
        console.error("URL generation error:", err);
      }
      return;
    }

    // Jika ada token, coba gunakan API Google secara "Silent"
    if (token) {
      try {
        const hasValidTime = e.time && e.time.includes(':');
        const [h, min] = hasValidTime ? e.time.split(':') : ['09', '00'];
        
        const start = `${e.date}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`;
        const endH = String(Math.min(23, Number(h) + 1)).padStart(2, '0');
        const end = `${e.date}T${endH}:${min.padStart(2, '0')}:00`;
        
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            'summary': e.title,
            'description': e.note || 'Ditambahkan via InterSolid',
            'start': { 
              'dateTime': new Date(start).toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'end': { 
              'dateTime': new Date(end).toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'reminders': { 'useDefault': true }
          })
        });

        if (response.ok) {
          console.log('Google Calendar Sync Success');
        } else {
          const err = await response.json();
          console.error('Calendar API Error Response:', err);
          if (err.error?.code === 401) {
            localStorage.removeItem('googleAccessToken');
            if (!isAuto) alert('Sesi Google habis. Silakan Login ulang untuk sinkronisasi otomatis.');
          } else {
            // Fallback to manual if silent fails
            if (!isAuto) {
              const [y, m, d] = e.date.split('-');
              const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${y}${m}${d}/${y}${m}${d}`;
              window.open(url, '_blank');
            }
          }
        }
      } catch (err) {
        console.error('Google Calendar API Error:', err);
        if (!isAuto) alert('Gagal sinkronisasi otomatis. Coba hubungkan ulang Google Anda.');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 pb-20 md:pb-0">
      <div className="lg:col-span-2 bg-white dark:bg-[#1a252f] rounded-[32px] border border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-xl shadow-blue-500/5">
        <div className="p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800">
          <h3 className="font-serif text-2xl md:text-3xl font-bold">{MONTHS[month]} <span className="text-blue-500">{year}</span></h3>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex gap-1.5">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-200"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-200"><ChevronRight size={18}/></button>
            </div>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl transition-all">Hari Ini</button>
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 bg-blue-50/50 dark:bg-blue-950/20 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${localStorage.getItem('googleAccessToken') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`} />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {localStorage.getItem('googleAccessToken') ? 'Google API: Aktif' : 'Google API: Terputus'}
              </span>
            </div>
            {!localStorage.getItem('googleAccessToken') && (
              <button 
                onClick={() => {
                  const provider = new GoogleAuthProvider();
                  provider.addScope('https://www.googleapis.com/auth/calendar.events');
                  signInWithPopup(auth, provider).then(result => {
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    if (credential?.accessToken) {
                      localStorage.setItem('googleAccessToken', credential.accessToken);
                      window.location.reload();
                    }
                  });
                }}
                className="text-[10px] font-black uppercase text-blue-500 hover:underline"
              >
                Hubungkan Sekarang
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
              <span key={d} className="text-center text-[10px] uppercase font-bold text-gray-400 tracking-wider py-2">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`prev-${i}`} className="aspect-square flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs md:text-sm font-bold opacity-30 select-none">
                {prevMonthDays - firstDay + 1 + i}
              </div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayEvents = events[dateKey] || [];
              const dayMemories = memories[dateKey] || [];
              const isSelected = selectedDate === dateKey;
              const isToday = new Date().toISOString().split('T')[0] === dateKey;

              return (
                <motion.div 
                  key={d} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`aspect-square rounded-2xl cursor-pointer flex flex-col items-center justify-center relative transition-all duration-300 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 -translate-y-1' 
                      : 'hover:bg-blue-50 dark:hover:bg-blue-950/40 bg-white dark:bg-transparent border border-slate-100 dark:border-white/5'
                  } ${isToday && !isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1a252f]' : ''}`}
                >
                  <span className={`text-xs md:text-sm font-black ${isToday && !isSelected ? 'text-blue-500' : isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{d}</span>
                  <div className="flex flex-wrap items-center justify-center gap-0.5 mt-1 px-1">
                    {dayEvents.map((e, idx) => (
                      <div key={`ev-${idx}`} className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : GENRE_COLORS[e.genre] }} />
                    ))}
                    {dayMemories.length > 0 && (
                      <div className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.5)]'}`} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
          <h4 className="font-serif text-lg font-bold mb-4 flex items-center justify-between">
            Detail Jadwal 
            <span className="text-xs text-blue-500 font-sans">{selectedDate}</span>
          </h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {([...(events[selectedDate] || []), ...(memories[selectedDate] || []).map(m => ({
              id: m.id,
              title: m.title || 'Momen Berharga',
              genre: 'memory',
              time: '',
              note: m.caption,
              date: m.displayDate,
              authorId: m.userId,
              memoryUrl: m.url,
              userName: m.userName
            }))]).length > 0 ? (
              [...(events[selectedDate] || []), ...(memories[selectedDate] || []).map(m => ({
                id: m.id,
                title: m.title || 'Momen Berharga',
                genre: 'memory',
                time: '',
                note: m.caption,
                date: m.displayDate,
                authorId: m.userId,
                memoryUrl: m.url,
                userName: m.userName
              }))].map((e: any) => (
                <div key={e.id} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl flex gap-3 border-l-4 group transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md" style={{ borderLeftColor: e.genre === 'memory' ? '#ec4899' : GENRE_COLORS[e.genre] }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-100">{e.title}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                      <span className="uppercase font-black tracking-widest text-[8px]" style={{ color: e.genre === 'memory' ? '#ec4899' : GENRE_COLORS[e.genre] }}>{e.genre}</span>
                      {e.time && <span>• {e.time}</span>}
                      {e.userName && <span className="opacity-60 truncate">By {e.userName}</span>}
                    </div>
                    {e.memoryUrl && (
                      <button 
                        onClick={() => setActivePage?.('memory', e.id)}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-bold hover:bg-blue-500 hover:text-white transition-all overflow-hidden"
                      >
                        <ImageIcon size={10} /> LIHAT MOMEN
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {e.genre !== 'memory' && (
                      <button 
                        onClick={() => addToGoogleCalendar(e)} 
                        className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-green-500 transition-colors shadow-sm"
                        title="Tambah ke Google Calendar"
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                    {user && e.genre !== 'memory' && (
                      <>
                        <button onClick={() => startEdit(e)} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 transition-colors shadow-sm">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setConfirmId(e.id)} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 opacity-30">
                <CalendarIcon size={32} className="mx-auto mb-2" />
                <p className="text-xs">Tidak ada jadwal</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
          <h4 className="font-bold text-sm mb-4">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</h4>
          {user ? (
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Judul Jadwal..." 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={form.genre}
                  onChange={e => setForm({...form, genre: e.target.value})}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                >
                  <option value="tugas">Tugas</option>
                  <option value="uts">UTS/UAS</option>
                  <option value="event">Event</option>
                  <option value="libur">Libur</option>
                  <option value="materi">Materi</option>
                  <option value="lainnya">Lainnya</option>
                </select>
                <input 
                  type="time" 
                  value={form.time}
                  onChange={e => setForm({...form, time: e.target.value})}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                />
              </div>
              <textarea 
                placeholder="Catatan..." 
                value={form.note}
                onChange={e => setForm({...form, note: e.target.value})}
                className="w-full px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none h-20 resize-none"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleAddEvent}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                >
                  {editingId ? 'Simpan' : 'Tambah Jadwal'}
                </button>
                {editingId && (
                  <button 
                    onClick={() => { setEditingId(null); setForm({ title: '', genre: 'tugas', time: '', note: '' }); }}
                    className="px-4 py-2 text-xs font-bold text-gray-400"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
              <Lock size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-[10px] text-gray-400 uppercase tracking-tight">Login Google untuk menambah jadwal</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-8 max-w-xs w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Jadwal ini akan dihapus permanen</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmId(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => deleteEvent(confirmId)}
                  className="py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                >
                  reyal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
