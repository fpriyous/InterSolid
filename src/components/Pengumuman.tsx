import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Info, AlertCircle, Megaphone, Lock, Pencil } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, Timestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  date: string;
  authorId: string;
}

export default function Pengumuman({ isAdmin, user }: { isAdmin: boolean, user: User | null }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' as any });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Announcement[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data() as Announcement, id: doc.id });
      });
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addAnnouncement = async () => {
    if (!user || !form.title || !form.content) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          ...form,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...form,
          authorId: user.uid,
          authorName: user.displayName || 'Anonim',
          authorPhoto: user.photoURL || '',
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: Timestamp.now()
        });
      }
      setIsAdding(false);
      setEditingId(null);
      setForm({ title: '', content: '', priority: 'medium' });
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (a: Announcement) => {
    setForm({ title: a.title, content: a.content, priority: a.priority });
    setEditingId(a.id);
    setIsAdding(true);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user) return alert('Silakan login dulu');
    if (!isAdmin) return alert('Hanya admin yang bisa menghapus pengumuman!');
    try {
      console.log("Deleting announcement:", id);
      await deleteDoc(doc(db, 'announcements', id));
      setConfirmId(null);
      alert('Pengumuman dihapus.');
    } catch (e: any) {
      console.error("Delete announcement error:", e);
      alert('Gagal menghapus pengumuman: ' + (e.message || "Izin ditolak oleh server"));
      setConfirmId(null);
    }
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
      <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
        {user ? (
          !isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-3 border-2 border-dashed border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center justify-center gap-2 text-blue-500 text-xs font-bold hover:bg-blue-50 transition-all"
            >
              <Plus size={16}/> Posting Pengumuman Baru
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <h4 className="font-bold text-sm">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h4>
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
                <button onClick={() => { setIsAdding(false); setEditingId(null); setForm({ title: '', content: '', priority: 'medium' }); }} className="flex-1 py-2 text-xs font-bold text-gray-400">Batal</button>
                <button onClick={addAnnouncement} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20">{editingId ? 'Simpan Perubahan' : 'Posting'}</button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
            <Lock size={20} className="mx-auto mb-2 text-gray-300" />
            <p className="text-[10px] text-gray-400 uppercase tracking-tight">Login Google untuk posting pengumuman</p>
          </div>
        )}
      </div>

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
                {user && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(a)} className="text-gray-300 hover:text-blue-500 transition-colors">
                      <Pencil size={16}/>
                    </button>
                    <button onClick={() => setConfirmId(a.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </div>
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

      {/* Custom Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-8 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-500" size={32} />
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
            <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Pengumuman ini akan dihapus permanen</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmId(null)}
                className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                faqeee
              </button>
              <button 
                onClick={() => deleteAnnouncement(confirmId)}
                className="py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
              >
                reyal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
