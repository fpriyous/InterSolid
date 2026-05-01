import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  genre: string;
  time: string;
  note: string;
}

const GENRE_COLORS: Record<string, string> = {
  tugas: '#ef4444',
  uts: '#991b1b',
  event: '#3b82f6',
  libur: '#22c55e',
  materi: '#f59e0b',
  lainnya: '#a855f7'
};

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Kalender() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<Record<string, Event[]>>(() => {
    const saved = localStorage.getItem('IS_events');
    return saved ? JSON.parse(saved) : {};
  });

  const [form, setForm] = useState({ title: '', genre: 'tugas', time: '', note: '' });

  useEffect(() => {
    localStorage.setItem('IS_events', JSON.stringify(events));
  }, [events]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const handleAddEvent = () => {
    if (!form.title) return;
    const newEvents = { ...events };
    if (!newEvents[selectedDate]) newEvents[selectedDate] = [];
    newEvents[selectedDate].push({
      id: Date.now().toString(),
      ...form
    });
    setEvents(newEvents);
    setForm({ title: '', genre: 'tugas', time: '', note: '' });
  };

  const deleteEvent = (date: string, id: string) => {
    const newEvents = { ...events };
    newEvents[date] = newEvents[date].filter(e => e.id !== id);
    setEvents(newEvents);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
          <h3 className="font-serif text-xl font-bold">{MONTHS[month]} {year}</h3>
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">Hari Ini</button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={18}/></button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-7 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
              <span key={d} className="text-center text-[10px] uppercase font-bold text-gray-400 tracking-wider py-2">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`prev-${i}`} className="aspect-square flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm">
                {prevMonthDays - firstDay + 1 + i}
              </div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayEvents = events[dateKey] || [];
              const isSelected = selectedDate === dateKey;
              const isToday = new Date().toISOString().split('T')[0] === dateKey;

              return (
                <div 
                  key={d} 
                  onClick={() => setSelectedDate(dateKey)}
                  className={`aspect-square rounded-xl cursor-pointer flex flex-col items-center justify-center relative transition-all ${
                    isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  } ${isToday && !isSelected ? 'border border-blue-200 dark:border-blue-800' : ''}`}
                >
                  <span className={`text-sm font-medium ${isToday && !isSelected ? 'text-blue-500 font-bold' : ''}`}>{d}</span>
                  <div className="flex gap-0.5 mt-1">
                    {dayEvents.map((e, idx) => (
                      <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? 'white' : GENRE_COLORS[e.genre] }} />
                    ))}
                  </div>
                </div>
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
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {(events[selectedDate] || []).length > 0 ? (
              events[selectedDate].map((e) => (
                <div key={e.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex gap-3 border-l-4 group" style={{ borderLeftColor: GENRE_COLORS[e.genre] }}>
                  <div className="flex-1">
                    <div className="font-bold text-xs">{e.title}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                      <span className="uppercase font-bold" style={{ color: GENRE_COLORS[e.genre] }}>{e.genre}</span>
                      {e.time && <span>• {e.time}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteEvent(selectedDate, e.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
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
          <h4 className="font-bold text-sm mb-4">Tambah Jadwal</h4>
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
            <button 
              onClick={handleAddEvent}
              className="w-full py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
              Tambah Jadwal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
