import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Info, AlertCircle, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  date: string;
}

export default function Pengumuman({ isAdmin }: { isAdmin: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('IS_announcements');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Selamat Datang di InterSolid', content: 'Gunakan portal ini untuk memantau agenda kelas, iuran, hingga menyalurkan aspirasi secara anonim.', priority: 'medium', date: '01 Mei 2024' }
    ];
  });
  
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' as any });

  useEffect(() => {
    localStorage.setItem('IS_announcements', JSON.stringify(announcements));
  }, [announcements]);

  const addAnnouncement = () => {
    if (!form.title || !form.content) return;
    const item: Announcement = {
      id: Date.now().toString(),
      ...form,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    setAnnouncements([item, ...announcements]);
    setIsAdding(false);
    setForm({ title: '', content: '', priority: 'medium' });
  };

  const deleteAnnouncement = (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-900/20';
      case 'medium': return 'border-blue-500 bg-blue-50 text-blue-500 dark:bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-50 text-gray-500 dark:bg-gray-800/50';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {isAdmin && (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-3 border-2 border-dashed border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center justify-center gap-2 text-blue-500 text-xs font-bold hover:bg-blue-50 transition-all"
            >
              <Plus size={16}/> Posting Pengumuman Baru
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <h4 className="font-bold text-sm">Buat Pengumuman</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Judul Pengumuman..." 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                />
                <select 
                  value={form.priority}
                  onChange={e => setForm({...form, priority: e.target.value as any})}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                >
                  <option value="low">Prioritas: Rendah</option>
                  <option value="medium">Prioritas: Sedang</option>
                  <option value="high">Prioritas: Penting!</option>
                </select>
              </div>
              <textarea 
                placeholder="Tuliskan detail pengumuman..." 
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                className="w-full px-4 py-3 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none h-32 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs font-bold text-gray-400">Batal</button>
                <button onClick={addAnnouncement} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20">Posting</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-sm flex flex-col md:flex-row">
            <div className={`w-full md:w-2 ${getPriorityColor(a.priority)} border-l-4`} />
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getPriorityColor(a.priority)} border-none shadow-sm`}>
                    {a.priority === 'high' ? <AlertCircle size={16}/> : a.priority === 'medium' ? <Info size={16}/> : <Megaphone size={16}/>}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{a.title}</h3>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400">{a.date}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteAnnouncement(a.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-loose whitespace-pre-wrap">{a.content}</p>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Bell size={48} className="mx-auto mb-4" />
            <p className="text-sm">Tidak ada pengumuman baru.</p>
          </div>
        )}
      </div>
    </div>
  );
}
