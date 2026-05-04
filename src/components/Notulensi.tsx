import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Plus, Trash2, FileText, Search, Clock, Pencil, Download, Bold, Italic, List as ListIcon, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Image as ImageIcon, Underline as UnderlineIcon, ArrowLeft, Save, Loader2, X, Undo, Redo, Upload, Lock, Unlock } from 'lucide-react';
import { db, storage, logPortalActivity } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, Timestamp, updateDoc, setDoc, where } from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import html2pdf from 'html2pdf.js';

interface Note {
  id: string;
  title: string;
  content: string; // Plain text for preview/search
  htmlContent: string; // Rich text content
  tag: string;
  date: string;
  authorId: string;
  isLocked?: boolean;
  createdAt: any;
}

const MenuBar = ({ editor, onAddImage }: { editor: any, onAddImage: () => void }) => {
  if (!editor) return null;
  
  // Force re-render on any editor state change to update active states immediately
  const [, setUpdate] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const updateHandler = () => setUpdate(v => v + 1);
    
    editor.on('transaction', updateHandler);
    editor.on('selectionUpdate', updateHandler);
    editor.on('update', updateHandler);
    
    return () => {
      editor.off('transaction', updateHandler);
      editor.off('selectionUpdate', updateHandler);
      editor.off('update', updateHandler);
    };
  }, [editor]);

  const addImage = () => {
    onAddImage();
  };

  return (
    <div className="flex items-center gap-0.5 p-1.5 md:p-2 bg-white dark:bg-[#1a252f] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar transition-colors">
      
      {/* History Actions */}
      <div className="flex items-center gap-0.5 mr-1 md:mr-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={14} strokeWidth={3} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-all"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={14} strokeWidth={3} />
        </button>
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

      {/* Formatting Tools */}
      <div className="flex items-center gap-0.5 mx-2">
        {[
          { name: 'bold', icon: Bold, action: () => editor.chain().focus().toggleBold().run(), title: 'Bold (Ctrl+B)' },
          { name: 'italic', icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), title: 'Italic (Ctrl+I)' },
          { name: 'underline', icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), title: 'Underline (Ctrl+U)' },
        ].map((tool) => {
          const isActive = editor.isActive(tool.name);
          return (
            <motion.button
              key={tool.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (tool.name === 'bold') editor.chain().focus().toggleBold().run();
                else if (tool.name === 'italic') editor.chain().focus().toggleItalic().run();
                else editor.chain().focus().toggleUnderline().run();
              }}
              title={tool.title}
              animate={{ 
                scale: isActive ? 1.05 : 1,
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#9ca3af'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all relative ${isActive ? 'shadow-lg shadow-blue-500/40 z-20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <tool.icon size={14} strokeWidth={isActive ? 3.5 : 3} />
              {isActive && (
                <motion.div 
                  layoutId="active-tool-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" 
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

      {/* Headings */}
      <div className="flex items-center gap-0.5 mx-2">
        {[
          { level: 1, icon: Heading1, title: 'Heading 1' },
          { level: 2, icon: Heading2, title: 'Heading 2' },
        ].map((h) => {
          const isActive = editor.isActive('heading', { level: h.level });
          return (
            <motion.button
              key={h.level}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={h.title}
              onClick={() => editor.chain().focus().toggleHeading({ level: h.level as any }).run()}
              animate={{ 
                scale: isActive ? 1.05 : 1,
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#9ca3af'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all relative ${isActive ? 'shadow-lg shadow-blue-500/40 z-20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <h.icon size={14} strokeWidth={isActive ? 3.5 : 3} />
              {isActive && (
                <motion.div 
                  layoutId="active-tool-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" 
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5 mx-2">
        {[
          { align: 'left', icon: AlignLeft, title: 'Align Left' },
          { align: 'center', icon: AlignCenter, title: 'Align Center' },
          { align: 'right', icon: AlignRight, title: 'Align Right' },
        ].map((tool) => {
          const isActive = editor.isActive({ textAlign: tool.align });
          return (
            <motion.button
              key={tool.align}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={tool.title}
              onClick={() => editor.chain().focus().setTextAlign(tool.align).run()}
              animate={{ 
                scale: isActive ? 1.05 : 1,
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#9ca3af'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all relative ${isActive ? 'shadow-lg shadow-blue-500/40 z-20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <tool.icon size={14} strokeWidth={isActive ? 3.5 : 3} />
              {isActive && (
                <motion.div 
                  layoutId="active-tool-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" 
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

      {/* Lists & Media */}
      <div className="flex items-center gap-0.5 ml-2">
        {[
          { name: 'bulletList', icon: ListIcon, action: () => editor.chain().focus().toggleBulletList().run(), title: 'Bullet List' },
          { name: 'orderedList', icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), title: 'Ordered List' },
        ].map((tool) => {
          const isActive = editor.isActive(tool.name);
          return (
            <motion.button
              key={tool.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={tool.action}
              title={tool.title}
              animate={{ 
                scale: isActive ? 1.05 : 1,
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive ? '#ffffff' : '#9ca3af'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all relative ${isActive ? 'shadow-lg shadow-blue-500/40 z-20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <tool.icon size={14} strokeWidth={isActive ? 3.5 : 3} />
              {isActive && (
                <motion.div 
                  layoutId="active-tool-dot"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" 
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

      </div>
    </div>

  );
};

export default function Notulensi({ isAdmin, user }: { isAdmin: boolean, user: User | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', tag: 'Materi' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const isConnected = true; // Simplified connection status
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar!');
      return;
    }

    setUploading(true);
    try {
      const storageRef = sRef(storage, `notes_images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      editor?.chain().focus().setImage({ src: downloadURL }).run();
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert('Gagal mengunggah gambar: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Presence effect (simple)
  useEffect(() => {
    if (!editingId || !user || !isAdding) return;
    
    const presenceRef = doc(collection(db, 'notes', editingId, 'presence'), user.uid);
    const setPresence = async (isActive: boolean) => {
      try {
        await setDoc(presenceRef, {
          name: user.displayName || 'Anonim',
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          lastActive: Timestamp.now(),
          isActive
        }, { merge: true });
      } catch (e) {
        console.warn('Presence error:', e);
      }
    };

    setPresence(true);
    const interval = setInterval(() => setPresence(true), 30000); // Heartbeat

    // Clean up
    return () => {
      clearInterval(interval);
      setPresence(false);
    };
  }, [editingId, user, isAdding]);

  // Track active users from presence collection
  useEffect(() => {
    if (!editingId || !isAdding) return;

    const q = query(collection(db, 'notes', editingId, 'presence'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Only show if active in last 2 minutes
        if (data.lastActive?.toDate().getTime() > Date.now() - 120000) {
          users.push(data);
        }
      });
      setActiveUsers(users);
    });

    return () => unsubscribe();
  }, [editingId, isAdding]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Mulai mengetik catatan materi atau rapat di sini...',
      }),
    ],
    content: '',
    editable: !selectedNote?.isLocked || isAdmin,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-6 leading-relaxed text-gray-700 dark:text-gray-200 outline-none select-text cursor-text',
        style: 'pointer-events: auto !important;'
      },
    },
    onUpdate: ({ editor }) => {
      if (isAdding && editingId) {
        setSaveStatus('saving');
      }
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Load existing content when editing
  useEffect(() => {
    if (editor && isAdding && editingId) {
      const note = notes.find(n => n.id === editingId);
      if (note && note.htmlContent && editor.getHTML() === '<p></p>') {
        editor.commands.setContent(note.htmlContent);
      }
    }
  }, [editor, isAdding, editingId, notes]);

  // Handle remote updates (simple real-time)
  useEffect(() => {
    if (!editor || !editingId || !isAdding) return;

    const unsubscribe = onSnapshot(doc(db, 'notes', editingId), (doc) => {
      const data = doc.data();
      if (data && data.htmlContent && data.updatedBy !== user?.uid) {
        const currentHtml = editor.getHTML();
        if (data.htmlContent !== currentHtml) {
          // Only update if difference is significant to avoid cursor jumps
          editor.commands.setContent(data.htmlContent, false);
        }
      }
    });

    return () => unsubscribe();
  }, [editor, editingId, isAdding, user]);

  // Auto-save effect
  useEffect(() => {
    if (!editor || !isAdding || !editingId) return;

    let timeout: any;
    const handleUpdate = () => {
      setSaveStatus('saving');
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const html = editor.getHTML();
        const text = editor.getText();
        try {
          await updateDoc(doc(db, 'notes', editingId), {
            content: text.substring(0, 200),
            htmlContent: html,
            updatedAt: Timestamp.now(),
            updatedBy: user?.uid
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
          console.error('Auto-save error:', e);
          setSaveStatus('idle');
        }
      }, 1500);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      clearTimeout(timeout);
    };
  }, [editor, isAdding, editingId, user]);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
    n.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Note[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data() as any, id: doc.id });
      });
      setNotes(data);
      
      // Update selectedNote if it exists to reflect changes (like locking)
      setSelectedNote(prev => {
        if (!prev) return null;
        return data.find(n => n.id === prev.id) || null;
      });
    }, (error) => console.error("Notulensi listener error:", error));
    return () => unsubscribe();
  }, []);

  const handleAction = (type: 'delete' | 'edit', id: string) => {
    if (!user) return alert('Login Google dulu');
    
    const n = notes.find(note => note.id === id);
    if (!n) return;

    if (n.isLocked && !isAdmin) {
      return alert('Catatan ini telah dikunci oleh Admin. Anda tidak dapat mengubah atau menghapusnya.');
    }

    if (!isAdmin && n.authorId !== user.uid) {
       return alert('Anda hanya dapat mengubah/menghapus catatan buatan sendiri.');
    }
    
    if (type === 'edit') {
      setNewNote({ 
        title: n.title, 
        tag: n.tag
      });
      setEditingId(id);
      setIsAdding(true);
      setSelectedNote(null);
    } else {
      setConfirmId(id);
    }
  };

  const toggleLock = async (id: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'notes', id), {
        isLocked: !currentStatus,
        updatedAt: Timestamp.now()
      });
    } catch (e: any) {
      alert('Gagal mengubah status kunci: ' + e.message);
    }
  };

  const addNote = async () => {
    if (!user || !editor) return;
    
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'notes'), {
        title: 'Catatan Baru',
        tag: 'Umum',
        content: '',
        htmlContent: '',
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        authorId: user.uid,
        isLocked: false,
        createdAt: Timestamp.now()
      });
      
      setEditingId(docRef.id);
      setNewNote({ title: 'Catatan Baru', tag: 'Umum' });
      setIsAdding(true);
      setSelectedNote(null);
      editor.commands.setContent('');
      
      logPortalActivity('note_create', 'Membuat catatan baru', user);
    } catch (e: any) {
      console.error(e);
      alert('Gagal memulai catatan baru: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExitEditor = async () => {
    if (editingId && editor) {
      const text = editor.getText().trim();
      const title = newNote.title.trim();
      
      // Cleanup: if both title is placeholder and content is empty, delete it
      if ((title === '' || title === 'Catatan Baru') && text === '') {
        try {
          await deleteDoc(doc(db, 'notes', editingId));
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
    }
    
    setIsAdding(false);
    setEditingId(null);
    setNewNote({ title: '', tag: 'Materi' });
  };

  const deleteNote = async (id: string) => {
    if (!isAdmin) return alert('Hanya admin yang bisa menghapus catatan!');
    try {
      console.log("Attempting to delete note:", id);
      await deleteDoc(doc(db, 'notes', id));
      if (selectedNote?.id === id) setSelectedNote(null);
      setConfirmId(null);
    } catch (e: any) {
      console.error("Delete note error detail:", e);
      alert('Gagal menghapus catatan: ' + (e.message || "Izin ditolak oleh server (Permission Denied)"));
      setConfirmId(null);
    }
  };

  const exportPDF = () => {
    if (!noteRef.current) return;
    const element = noteRef.current;
    const opt = {
      margin: 1,
      filename: `${selectedNote?.title || 'catatan'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
      {/* Sidebar Catatan */}
      {(!isAdding || !selectedNote) && (
      <div className={`${(selectedNote || isAdding) ? 'hidden lg:block' : 'block'} lg:col-span-1 space-y-4 pb-20 md:pb-0`}>
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari materi/rapat..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a252f] outline-none shadow-sm focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
          />
        </div>

        <button 
          onClick={() => {
            if (!user) return alert('Silakan Login Google dulu');
            addNote();
          }}
          className="w-full py-3.5 bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3}/>} Tulis Baru
        </button>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredNotes.map((n) => (
            <div 
              key={n.id}
              onClick={() => {
                setSelectedNote(n);
                setIsAdding(false);
              }}
              className={`p-5 rounded-[24px] border transition-all duration-300 transform cursor-pointer group ${
                selectedNote?.id === n.id 
                  ? 'bg-blue-500 text-white border-blue-400 shadow-xl shadow-blue-500/30 -translate-y-1' 
                  : 'bg-white dark:bg-[#1a252f] border-gray-200 dark:border-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <span className={`text-[8px] font-black uppercase tracking-[2px] px-2 py-1 rounded-lg ${selectedNote?.id === n.id ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500'}`}>{n.tag}</span>
                   {n.isLocked && <Lock size={10} className={selectedNote?.id === n.id ? 'text-white' : 'text-amber-500'} />}
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLock(n.id, !!n.isLocked); }}
                      className={`p-1 rounded-md transition-all ${n.isLocked ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-blue-500'}`}
                      title={n.isLocked ? "Buka Kunci" : "Kunci Catatan"}
                    >
                      {n.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                    </button>
                  )}
                  <span className={`text-[9px] font-medium opacity-60 ${selectedNote?.id === n.id ? 'text-white' : 'text-gray-400'}`}>{n.date}</span>
                </div>
              </div>
              <h4 className="font-bold text-sm leading-tight mb-2 line-clamp-1">{n.title}</h4>
              <p className={`text-[10px] line-clamp-1 opacity-70 italic ${selectedNote?.id === n.id ? 'text-blue-50' : 'text-gray-400'}`}>
                {n.content || 'Lihat isi catatan...'}
              </p>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div className="text-center py-16 grayscale opacity-20">
              <FileText size={64} className="mx-auto mb-4 stroke-1" />
              <p className="text-[10px] font-black uppercase tracking-widest">Arsip Kosong</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Area Kerja Editor / Viewer */}
      <div className={`${isAdding ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
        {isAdding ? (
          <div className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-gray-200 dark:border-blue-900/20 shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-300">
            {/* Header Editor */}
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <button 
                    onClick={handleExitEditor}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                    title="Selesai & Kembali"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Judul Catatan..." 
                      value={newNote.title}
                      onChange={e => {
                        const title = e.target.value;
                        setNewNote(prev => ({...prev, title}));
                        if (editingId) {
                          updateDoc(doc(db, 'notes', editingId), { title, updatedAt: Timestamp.now() });
                        }
                      }}
                      className="w-full bg-transparent text-lg md:text-xl font-serif font-bold outline-none border-b-2 border-transparent focus:border-blue-500/30 transition-all placeholder:text-gray-200"
                    />
                  </div>
                </div>
                
                {/* Live Collaboration Status & Tags */}
                <div className="flex items-center justify-between md:justify-end gap-3 px-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1 ${isConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30'} border rounded-full transition-colors`}>
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
                    <span className={`text-[8px] md:text-[9px] font-black uppercase ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'} tracking-tighter`}>
                      {isConnected ? 'LIVE SYNC' : 'Connecting...'}
                    </span>
                  </div>

                  {/* Presence avatars */}
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {activeUsers.map((u, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white dark:border-[#1a252f] flex items-center justify-center text-[8px] font-black text-white shadow-sm transition-all"
                        style={{ backgroundColor: u.color }}
                        title={u.name}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>

                  <select 
                    value={newNote.tag}
                    onChange={e => {
                      const tag = e.target.value;
                      setNewNote(prev => ({...prev, tag}));
                      if (editingId) {
                        updateDoc(doc(db, 'notes', editingId), { tag, updatedAt: Timestamp.now() });
                      }
                    }}
                    className="px-2 md:px-3 py-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-lg bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-1 focus:ring-blue-500/20 text-gray-500"
                  >
                    <option value="Rapat">Rapat</option>
                    <option value="Materi">Materi</option>
                    <option value="Memo">Memo</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

            {/* Toolbar */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <MenuBar editor={editor} onAddImage={() => setShowImageModal(true)} />

            {/* Editor Area */}
            <div className="max-h-[650px] overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : selectedNote ? (
          <div className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-gray-200 dark:border-blue-900/20 shadow-2xl relative group overflow-hidden flex flex-col animate-in fade-in duration-500">
             {/* Dynamic Accent */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-transparent to-blue-500 opacity-20" />
            
            <div className="p-8 pb-4 border-b border-gray-100 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-[9px] font-black uppercase tracking-[3px] rounded-full border border-blue-100 dark:border-blue-800/50 shadow-sm">{selectedNote.tag}</span>
                <span className="flex items-center gap-2 text-[10px] font-bold text-gray-300"><Clock size={12}/> {selectedNote.date}</span>
                {selectedNote.isLocked && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-full">
                    <Lock size={10} className="text-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Locked</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button 
                    onClick={() => toggleLock(selectedNote.id, !!selectedNote.isLocked)}
                    className={`p-2.5 rounded-xl transition-all ${selectedNote.isLocked ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}
                    title={selectedNote.isLocked ? "Buka Kunci" : "Kunci Catatan"}
                  >
                    {selectedNote.isLocked ? <Lock size={18}/> : <Unlock size={18}/>}
                  </button>
                )}
                <button 
                  onClick={exportPDF}
                  className="p-2.5 text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl transition-all"
                  title="Export PDF"
                >
                  <Download size={18}/>
                </button>
                <button 
                  onClick={() => handleAction('edit', selectedNote.id)} 
                  className={`p-2.5 rounded-xl transition-all ${selectedNote.isLocked && !isAdmin ? 'opacity-20 cursor-not-allowed text-gray-300' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10'}`}
                  title={selectedNote.isLocked && !isAdmin ? "Catatan Dikunci" : "Ubah Catatan"}
                  disabled={selectedNote.isLocked && !isAdmin}
                >
                  <Pencil size={18}/>
                </button>
                <button 
                  onClick={() => handleAction('delete', selectedNote.id)} 
                  className={`p-2.5 rounded-xl transition-all ${selectedNote.isLocked && !isAdmin ? 'opacity-20 cursor-not-allowed text-gray-300' : 'text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
                  title={selectedNote.isLocked && !isAdmin ? "Catatan Dikunci" : "Hapus"}
                  disabled={selectedNote.isLocked && !isAdmin}
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>

            <div className="p-10 pt-8 flex-1 overflow-y-auto max-h-[800px] custom-scrollbar" ref={noteRef}>
              <h2 className="font-serif text-4xl font-black mb-8 leading-[1.1] tracking-tight decoration-blue-500/30 underline-offset-8 transition-all group-hover:underline">{selectedNote.title}</h2>
              <div className="prose prose-base dark:prose-invert max-w-none prose-headings:font-serif prose-p:leading-relaxed prose-li:my-1 prose-img:max-h-[400px] prose-img:mx-auto prose-img:rounded-2xl prose-img:shadow-xl prose-p:text-gray-600 dark:prose-p:text-gray-300">
                {selectedNote.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedNote.htmlContent }} />
                ) : (
                  <p className="whitespace-pre-wrap">{selectedNote.content}</p>
                )}
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800/30 bg-gray-50/50 dark:bg-black/10 flex justify-between items-center">
               <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-300 tracking-[1px]">
                  <FileText size={14} className="opacity-40" /> InterSolid Documentation
               </div>
               <p className="text-[9px] font-bold text-gray-300 italic">Pencatatan Digital Kelas</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-gray-200 dark:border-blue-900/20 p-20 text-center shadow-2xl shadow-gray-200/50 h-full min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-200 mb-8 transform group-hover:rotate-12 transition-all duration-500 shadow-inner">
              <FileText size={48} className="stroke-1" />
            </div>
            <p className="text-gray-400 font-serif text-2xl italic mb-4 max-w-md">"Catatan yang rapi lahir dari pikiran yang terstruktur."</p>
            <div className="h-px w-12 bg-blue-500/30 mb-4" />
            <p className="text-[10px] text-gray-300 uppercase font-black tracking-[8px]">Arsip Digital Pintar</p>
          </div>
        )}
      </div>

      {/* Custom Global Modals */}
      <AnimatePresence>
        {/* Upload Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImageModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-blue-100 dark:border-blue-900/30"
            >
              <button 
                onClick={() => setShowImageModal(false)}
                className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"
                title="Tutup"
              >
                <X size={20} />
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                  <ImageIcon size={32} />
                </div>
                <h3 className="font-serif text-2xl font-bold">Tambah Gambar</h3>
                <p className="text-xs text-gray-400 mt-2 uppercase font-bold tracking-[2px]">Pilih metode input gambar</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setShowImageModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-4 bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> Unggah dari Perangkat
                </button>
                
                <div className="flex items-center gap-4 py-2 opacity-30">
                   <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                   <span className="text-[10px] font-bold uppercase">Atau</span>
                   <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase ml-1">Masukkan URL Langsung</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="image-url-input"
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('image-url-input') as HTMLInputElement;
                        if (input.value) {
                          editor.chain().focus().setImage({ src: input.value }).run();
                          setShowImageModal(false);
                        }
                      }}
                      className="px-4 bg-gray-100 dark:bg-gray-800 text-blue-500 rounded-xl hover:bg-blue-200 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmId && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-blue-100 dark:border-blue-900/30 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Catatan ini akan dihapus permanen</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmId(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => deleteNote(confirmId)}
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
