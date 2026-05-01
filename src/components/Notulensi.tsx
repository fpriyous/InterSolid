import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Search, Clock } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tag: string;
  date: string;
}

export default function Notulensi({ isAdmin }: { isAdmin: boolean }) {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('IS_notes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', tag: 'rapat' });

  useEffect(() => {
    localStorage.setItem('IS_notes', JSON.stringify(notes));
  }, [notes]);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addNote = () => {
    if (!newNote.title || !newNote.content) return;
    const note: Note = {
      id: Date.now().toString(),
      ...newNote,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    setNotes([note, ...notes]);
    setIsAdding(false);
    setNewNote({ title: '', content: '', tag: 'rapat' });
  };

  const deleteNote = (id: string) => {
    if (!confirm('Hapus catatan ini?')) return;
    setNotes(notes.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari catatan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-blue-100 dark:border-blue-900/20 bg-white dark:bg-[#1a252f] outline-none shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {isAdmin && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setSelectedNote(null);
            }}
            className="w-full py-3 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={16}/> Tulis Catatan Baru
          </button>
        )}

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredNotes.map((n) => (
            <div 
              key={n.id}
              onClick={() => {
                setSelectedNote(n);
                setIsAdding(false);
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedNote?.id === n.id 
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'bg-white dark:bg-[#1a252f] border-blue-50 dark:border-blue-900/20 hover:bg-blue-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedNote?.id === n.id ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500'}`}>{n.tag}</span>
                <span className={`text-[9px] ${selectedNote?.id === n.id ? 'text-blue-100' : 'text-gray-400'}`}>{n.date}</span>
              </div>
              <h4 className="font-bold text-sm truncate">{n.title}</h4>
              <p className={`text-[10px] mt-1 line-clamp-2 ${selectedNote?.id === n.id ? 'text-blue-50' : 'text-gray-400'}`}>{n.content}</p>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div className="text-center py-10 opacity-30">
              <FileText size={40} className="mx-auto mb-2" />
              <p className="text-xs">Tidak ada catatan</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {isAdding ? (
          <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-8 shadow-sm h-full">
            <h3 className="font-serif text-xl font-bold mb-6">Tulis Catatan</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Judul</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Rapat Persiapan UTS" 
                    value={newNote.title}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Kategori</label>
                  <select 
                    value={newNote.tag}
                    onChange={e => setNewNote({...newNote, tag: e.target.value})}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                  >
                    <option value="rapat">Rapat Kelas</option>
                    <option value="materi">Ringkasan Materi</option>
                    <option value="tugas">Info Tugas</option>
                    <option value="umum">Informasi Umum</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Isi Catatan</label>
                <textarea 
                  placeholder="Tuliskan poin-poin penting di sini..." 
                  value={newNote.content}
                  onChange={e => setNewNote({...newNote, content: e.target.value})}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none h-[300px] resize-none leading-relaxed"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-2.5 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Batal</button>
                <button onClick={addNote} className="flex-2 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">Simpan Catatan</button>
              </div>
            </div>
          </div>
        ) : selectedNote ? (
          <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-10 shadow-sm min-h-[400px] relative group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-[10px] font-bold uppercase rounded-lg border border-blue-100 dark:border-blue-800">{selectedNote.tag}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><Clock size={12}/> {selectedNote.date}</span>
              </div>
              {isAdmin && (
                <button onClick={() => deleteNote(selectedNote.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={20}/>
                </button>
              )}
            </div>
            <h2 className="font-serif text-3xl font-bold mb-6 tracking-tight">{selectedNote.title}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-300 leading-loose whitespace-pre-wrap">{selectedNote.content}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-20 text-center shadow-sm h-full flex flex-col items-center justify-center">
            <FileText size={56} className="text-blue-50 mb-6" />
            <p className="text-gray-400 font-serif text-xl italic">"Catatan adalah jembatan antara pikiran dan ingatan."</p>
            <p className="text-[11px] text-gray-300 mt-2 uppercase font-bold tracking-[4px]">Pilih catatan untuk membaca</p>
          </div>
        )}
      </div>
    </div>
  );
}
