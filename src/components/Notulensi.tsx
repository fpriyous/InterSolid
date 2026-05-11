import { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { Plus, Trash2, FileText, Search, Clock, Pencil, Download, Bold, Italic, List as ListIcon, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Image as ImageIcon, Underline as UnderlineIcon, ArrowLeft, Save, Loader2, X, Undo, Redo, Upload, Lock, Unlock, History, RotateCcw } from 'lucide-react';
import { db, storage, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, Timestamp, updateDoc, setDoc, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
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

const MenuBar = ({ editor, onAddImage, onOpenHistory }: { editor: any, onAddImage: () => void, onOpenHistory: () => void }) => {
  if (!editor || editor.isDestroyed || !editor.extensionManager) return null;
  
  // Force re-render on any editor state change to update active states immediately
  const [, setUpdate] = useState(0);
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.extensionManager) return;
    const updateHandler = () => {
      if (!editor.isDestroyed && editor.extensionManager) {
        setUpdate(v => v + 1);
      }
    };
    
    editor.on('transaction', updateHandler);
    editor.on('selectionUpdate', updateHandler);
    editor.on('update', updateHandler);
    
    return () => {
      if (editor && !editor.isDestroyed && editor.extensionManager) {
        try {
          editor.off('transaction', updateHandler);
          editor.off('selectionUpdate', updateHandler);
          editor.off('update', updateHandler);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [editor]);

  const safeIsActive = (name: string, attributes?: any) => {
    if (!editor || editor.isDestroyed || !editor.commands) return false;
    try {
      // Verify extensionManager and getExtension via duck typing before calling isActive
      if (!(editor as any).extensionManager?.extensions) return false;
      return editor.isActive(name, attributes);
    } catch (e) {
      return false;
    }
  };

  const safeCan = () => {
    if (!editor || editor.isDestroyed || !editor.commands) return { undo: () => false, redo: () => false };
    try {
      if (!(editor as any).extensionManager?.extensions) return { undo: () => false, redo: () => false };
      return editor.can();
    } catch (e) {
      return { undo: () => false, redo: () => false };
    }
  };

  return (
    <div className="flex items-center gap-0.5 p-1.5 md:p-2 bg-white dark:bg-[#1a252f] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar transition-colors">
      
      {/* History Actions */}
      <div className="flex items-center gap-0.5 mr-1 md:mr-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!editor || editor.isDestroyed || !editor.extensionManager) return;
            editor.chain().focus().undo().run();
          }}
          disabled={!safeCan().undo()}
          className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={14} strokeWidth={3} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!editor || editor.isDestroyed || !editor.extensionManager) return;
            editor.chain().focus().redo().run();
          }}
          disabled={!safeCan().redo()}
          className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-all"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={14} strokeWidth={3} />
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
          title="Lihat Riwayat Perubahan"
        >
          <History size={14} strokeWidth={2.5}/>
          <span className="text-[10px] font-bold hidden md:inline">Riwayat</span>
        </button>
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

      {/* Formatting Tools */}
      <div className="flex items-center gap-0.5 mx-2">
        {[
          { name: 'bold', icon: Bold, title: 'Bold (Ctrl+B)' },
          { name: 'italic', icon: Italic, title: 'Italic (Ctrl+I)' },
          { name: 'underline', icon: UnderlineIcon, title: 'Underline (Ctrl+U)' },
        ].map((tool) => {
          const isActive = safeIsActive(tool.name);
          return (
            <motion.button
              key={tool.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!editor || editor.isDestroyed || !editor.extensionManager) return;
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
          const isActive = safeIsActive('heading', { level: h.level });
          return (
            <motion.button
              key={h.level}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={h.title}
              onClick={() => {
                if (!editor || editor.isDestroyed || !editor.extensionManager) return;
                editor.chain().focus().toggleHeading({ level: h.level as any }).run();
              }}
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
          const isActive = safeIsActive({ textAlign: tool.align } as any);
          return (
            <motion.button
              key={tool.align}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              title={tool.title}
              onClick={() => {
                if (!editor || editor.isDestroyed || !editor.extensionManager) return;
                editor.chain().focus().setTextAlign(tool.align).run();
              }}
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
          { name: 'bulletList', icon: ListIcon, title: 'Bullet List' },
          { name: 'orderedList', icon: ListOrdered, title: 'Ordered List' },
        ].map((tool) => {
          const isActive = safeIsActive(tool.name);
          return (
            <motion.button
              key={tool.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!editor || editor.isDestroyed || !editor.extensionManager) return;
                if (tool.name === 'bulletList') editor.chain().focus().toggleBulletList().run();
                else if (tool.name === 'orderedList') editor.chain().focus().toggleOrderedList().run();
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [connStatus, setConnStatus] = useState<string>('connecting');
  const [pollSyncActive, setPollSyncActive] = useState(false);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const connRetryCount = useRef(0);

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
      
      if (editor && !editor.isDestroyed && (editor as any).extensionManager) {
        editor.chain().focus().setImage({ src: downloadURL }).run();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert('Gagal mengunggah gambar: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isConnectedRef = useRef(false);

  // Handle Yjs and Websocket initialization
  useEffect(() => {
    // We only need collaboration when editing an active note
    if (!editingId || !isAdding || !user) {
      if (provider) {
        console.log(`[Collaboration] Cleaning up session for: ${editingId}`);
        try {
          provider.disconnect();
          provider.destroy();
        } catch (e) {
          console.warn('[Collaboration] Cleanup warning:', e);
        }
      }
      setYDoc(null);
      setProvider(null);
      setIsConnected(false);
      isConnectedRef.current = false;
      setConnStatus('idle');
      return;
    }

    console.log(`[Collaboration] Initializing session for: ${editingId}`);
    setConnStatus('connecting');
    setPollSyncActive(false);
    
    // Fallback detection: if not connected in 7s, switch to Firestore sync (polling mode)
    const fallbackTimeout = setTimeout(() => {
      if (!isConnectedRef.current) {
        console.warn('[Collaboration] WebSocket connection taking too long. Activating Firestore Polling Sync...');
        setPollSyncActive(true);
      }
    }, 7000);
    
    // Create Yjs Doc
    const doc = new Y.Doc();
    
    // Determine the WS URL dynamically
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/collaboration`;
    
    console.log(`[Collaboration] Attempting connection to: ${wsUrl}/${editingId}`);
    
    // Create side-effect provider
    const wsProvider = new WebsocketProvider(wsUrl, editingId, doc, {
      connect: true,
      params: { u: user.uid, v: '2' },
      disableBc: true
    });
    
    const statusHandler = (event: any) => {
      console.log(`[Collaboration] Status (${editingId}): ${event.status}`);
      setConnStatus(event.status);
      const connected = event.status === 'connected';
      setIsConnected(connected);
      isConnectedRef.current = connected;
      
      if (connected) {
        connRetryCount.current = 0;
        setPollSyncActive(false); // Stop polling if WS connects
      }
    };

    wsProvider.on('status', statusHandler);
    
    wsProvider.on('sync', (isSynced: boolean) => {
      console.log(`[Collaboration] Sync (${editingId}):`, isSynced);
      if (isSynced) {
        setConnStatus('synced');
      }
    });

    // Handle specific errors
    wsProvider.on('connection-error', (err: any) => {
      console.error(`[Collaboration] Connection Error (${editingId}):`, err);
      setConnStatus('error');
    });

    wsProvider.on('connection-close', (err: any) => {
      console.warn(`[Collaboration] Connection Closed (${editingId}):`, err);
      setConnStatus('disconnected');
    });

    // Set local awareness for cursors
    const color = user.photoURL?.includes('gradient') ? '#3b82f6' : '#' + Math.floor(Math.random() * 16777215).toString(16);
    wsProvider.awareness.setLocalStateField('user', {
      name: user.displayName || 'Anonim',
      color: color,
      isTyping: false,
      avatar: user.photoURL || ''
    });

    // Update active users from awareness
    const handleAwarenessChange = () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const active = states
        .map(([id, s]: [number, any]) => ({
          clientId: id,
          ...s.user
        }))
        .filter(s => s && s.name);
      setActiveUsers(active);
    };

    wsProvider.awareness.on('change', handleAwarenessChange);

    setYDoc(doc);
    setProvider(wsProvider);

    return () => {
      console.log(`[Collaboration] Disconnecting session for: ${editingId}`);
      clearTimeout(fallbackTimeout);
      wsProvider.off('status', statusHandler);
      wsProvider.awareness.off('change', handleAwarenessChange);
      wsProvider.disconnect();
      wsProvider.destroy();
      doc.destroy();
    };
  }, [editingId, isAdding, user?.uid]); // Stability: only re-init if editing target or user ID changes

  // Add stable user color based on UID
  const userColor = useMemo(() => {
    if (!user) return '#3b82f6';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const index = user.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, [user?.uid]);

  const extensions = useMemo(() => [
    StarterKit.configure({
      history: yDoc ? false : {}, 
    }),
    Underline,
    Image,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: 'Mulai mengetik catatan materi atau rapat di sini...',
    }),
    ...(yDoc ? [
      Collaboration.configure({
        document: yDoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: user?.displayName || 'Anonim',
          color: userColor,
        },
      }),
    ] : []),
  ], [yDoc, provider, user?.displayName, userColor]);

  const editor = useEditor({
    extensions,
    content: yDoc ? undefined : (notes.find(n => n.id === editingId)?.htmlContent) || '',
    editable: !selectedNote?.isLocked || isAdmin,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-6 leading-relaxed text-gray-700 dark:text-gray-200 outline-none select-text cursor-text',
        style: 'pointer-events: auto !important;'
      },
    },
    onUpdate: () => {
      // Logic for save is handled in the separate useEffect
    }
  }, [extensions, editingId]); 

  // Polling Fallback Logic: Listen to Firestore if WebSocket fails
  useEffect(() => {
    if (!pollSyncActive || !editingId || !editor || editor.isDestroyed || isConnected) return;

    console.log(`[Collaboration] Running in Polling Sync Mode for: ${editingId}`);
    
    const unsubscribe = onSnapshot(doc(db, 'notes', editingId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Only apply remote content if:
      // 1. We aren't typing locally (wait 2s after last key)
      // 2. The author of the change isn't us (or it was restored)
      // 3. User is NOT actively editing (no typingTimeout)
      const remoteHtml = data.htmlContent || '';
      const localHtml = editor.getHTML();
      
      if (!typingTimeout.current && remoteHtml !== localHtml && data.updatedBy !== user?.uid) {
        console.log('[Collaboration] Applying Firestore content update (Polling Mode)');
        editor.commands.setContent(remoteHtml, false);
      }
    });

    return () => unsubscribe();
  }, [pollSyncActive, editingId, editor, isConnected, user?.uid]);

  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const lastHistorySave = useRef<number>(0);
  const autoSaveTimeout = useRef<any>(null);
  const typingTimeout = useRef<any>(null);

  // Fetch History snapshots
  const fetchNoteHistory = async () => {
    if (!editingId) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'notes', editingId, 'history'), 
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistoryDocs(data);
    } catch (e) {
      console.error('Fetch history error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save history snapshot (Throttled to once per minute of activity)
  const saveHistorySnapshot = async () => {
    if (!editor || editor.isDestroyed || !editor.extensionManager || !editingId || !user) return;
    const now = Date.now();
    if (now - lastHistorySave.current < 60000) return; // Minimum 1 minute interval

    const html = editor.getHTML();
    if (!html || html === '<p></p>') return;

    try {
      await addDoc(collection(db, 'notes', editingId, 'history'), {
        htmlContent: html,
        timestamp: serverTimestamp(),
        editorName: user.displayName || 'Anonim',
        editorId: user.uid,
        editorPhoto: user.photoURL || ''
      });
      lastHistorySave.current = now;
      console.log('[History] Snapshot saved');
    } catch (e) {
      console.warn('History save error:', e);
    }
  };

  // Auto-save result to Firestore (for persistence and polling sync)
  useEffect(() => {
    if (!editor || !isAdding || !editingId) return;

    const handleUpdate = () => {
      if (!editor || editor.isDestroyed || !editor.extensionManager) return;
      
      // Manage typing awareness if connected
      if (isConnected && provider) {
        try {
          provider.awareness.setLocalStateField('user', {
            ...provider.awareness.getLocalState()?.user,
            isTyping: true
          });

          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => {
            if (provider && provider.awareness && !editor.isDestroyed) {
              try {
                provider.awareness.setLocalStateField('user', {
                  ...provider.awareness.getLocalState()?.user,
                  isTyping: false
                });
              } catch (e) {
                // Ignore awareness cleanup errors on disconnect
              }
            }
          }, 2000);
        } catch (e) {
          // Ignore awareness errors
        }
      }

      setSaveStatus('saving');
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(async () => {
        if (!editor || editor.isDestroyed || !editor.extensionManager) {
          setSaveStatus('idle');
          return;
        }
        
        try {
          const html = editor.getHTML();
          const text = editor.getText();
          
          await updateDoc(doc(db, 'notes', editingId), {
            content: text.substring(0, 200),
            htmlContent: html,
            updatedAt: Timestamp.now(),
            updatedBy: user?.uid
          });
          
          saveHistorySnapshot();
          setSaveStatus('saved');
          setTimeout(() => {
            if (setSaveStatus) setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 3000);
        } catch (e) {
          console.error('Auto-save error:', e);
          setSaveStatus('idle');
        }
      }, 3000); // Shorter debounce for polling mode
    };

    if (editor && !editor.isDestroyed) {
      editor.on('update', handleUpdate);
    }
    return () => {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      
      if (editor && !editor.isDestroyed) {
        try {
          editor.off('update', handleUpdate);
        } catch (e) {
          // Silent catch
        }
      }
    };
  }, [editor, isAdding, editingId, user, isConnected, provider]);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
    n.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Note[] = [];
      snapshot.forEach((docSnapshot) => {
        data.push({ ...docSnapshot.data() as any, id: docSnapshot.id });
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

    // REMOVED author-only restriction to allow universal editing as requested
    
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
      handleFirestoreError(e, OperationType.UPDATE, `notes/${id}`);
      alert('Gagal mengubah status kunci: ' + e.message);
    }
  };

  const addNote = async () => {
    if (!user || !editor || editor.isDestroyed) return;
    
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
      
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent('');
      }
      
      logPortalActivity('note_create', 'Membuat catatan baru', user);
    } catch (e: any) {
      console.error(e);
      handleFirestoreError(e, OperationType.CREATE, 'notes');
      alert('Gagal memulai catatan baru: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExitEditor = async () => {
    if (editingId && editor && !editor.isDestroyed) {
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
      handleFirestoreError(e, OperationType.DELETE, `notes/${id}`);
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
                setEditingId(n.id);
                setIsAdding(true);
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
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white dark:bg-[#1a252f] backdrop-blur-xl gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button 
                    onClick={handleExitEditor}
                    className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all shrink-0"
                    title="Simpan & Keluar"
                  >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/60 leading-none">Dokumen Berbagi</span>
                      {saveStatus === 'saving' && (
                        <span className="flex items-center gap-1 text-[9px] text-gray-400 animate-pulse">
                          <Loader2 size={8} className="animate-spin" /> Menyimpan...
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="text-[9px] text-green-500 font-bold">Tersimpan ke Cloud</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Judul Dokumen..." 
                      value={newNote.title}
                      onChange={e => {
                        const title = e.target.value;
                        setNewNote(prev => ({...prev, title}));
                        if (editingId) {
                          updateDoc(doc(db, 'notes', editingId), { title, updatedAt: Timestamp.now() });
                        }
                      }}
                      className="w-full bg-transparent text-lg md:text-xl font-bold outline-none text-slate-900 dark:text-white truncate"
                    />
                  </div>
                </div>
                
                {/* Live Collaboration Status & Tags */}
                <div className="flex items-center justify-between md:justify-end gap-3 px-1">
                  <div 
                    title={`Status: ${connStatus}`}
                    onClick={() => {
                        if (provider && !isConnected) {
                            console.log('[Collaboration] Manual reconnect triggered');
                            provider.connect();
                        }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 ${isConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : pollSyncActive ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : connStatus === 'connecting' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'} border rounded-full transition-all cursor-pointer hover:shadow-md active:scale-95`}
                  >
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : pollSyncActive ? 'bg-amber-400 animate-pulse' : connStatus === 'connecting' ? 'bg-amber-500 animate-bounce' : 'bg-red-400'}`} />
                    <span className={`text-[8px] md:text-[9px] font-black uppercase ${isConnected ? 'text-green-600 dark:text-green-400' : pollSyncActive ? 'text-amber-600 dark:text-amber-400' : connStatus === 'connecting' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} tracking-tighter`}>
                      {isConnected ? (connStatus === 'synced' ? 'SINKRONASI AKTIF' : 'MENYINKRONKAN...') : pollSyncActive ? 'MODE POLLING AKTIF' : connStatus === 'connecting' ? 'MENYAMBUNGKAN...' : 'Gagal Konek (Klik Reconnect)'}
                    </span>
                  </div>

                  {/* Presence avatars */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {activeUsers.map((u) => (
                        <motion.div 
                          initial={{ scale: 0, x: 20 }}
                          animate={{ scale: 1, x: 0 }}
                          key={u.clientId} 
                          className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-white dark:border-[#1a252f] flex items-center justify-center text-[10px] font-black text-white shadow-md transition-all group relative shrink-0"
                          style={{ backgroundColor: u.color, zIndex: u.isTyping ? 10 : 1 }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                          {u.isTyping && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-[#1a252f] flex items-center justify-center">
                              <span className="flex gap-[1px]">
                                <span className="w-[2px] h-[2px] bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-[2px] h-[2px] bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-[2px] h-[2px] bg-white rounded-full animate-bounce"></span>
                              </span>
                            </div>
                          )}
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900/90 text-white text-[8px] rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 backdrop-blur-sm border border-white/10">
                            {u.name} {u.isTyping ? '(Sedang mengetik...)' : ''}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {activeUsers.some(u => u.isTyping && u.name !== user?.displayName) && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[9px] font-bold text-blue-500 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-900/30 hidden md:flex"
                      >
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                        </div>
                        {activeUsers.find(u => u.isTyping && u.name !== user?.displayName)?.name} sedang menulis...
                      </motion.span>
                    )}
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
            {editor && (editor as any).extensionManager && (editor as any).extensionManager.extensions && editor.commands ? (
              <MenuBar 
                editor={editor} 
                onAddImage={() => setShowImageModal(true)} 
                onOpenHistory={() => {
                  fetchNoteHistory();
                  setShowHistory(true);
                }}
              />
            ) : (
              <div className="h-[48px] bg-gray-50/50 dark:bg-gray-900/50 flex items-center px-4 gap-2 border-b border-gray-100 dark:border-gray-800">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-bold text-gray-400">Menunggu Sinkronisasi Tiptap...</span>
              </div>
            )}

              {/* Editor Area */}
              <div key={editingId || 'no-editor'} className="max-h-[650px] overflow-y-auto custom-scrollbar bg-white dark:bg-transparent relative">
                <AnimatePresence>
                  {showHistory && (
                      <motion.div 
                      key="history-panel"
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="absolute inset-y-0 right-0 w-full sm:w-[320px] bg-white dark:bg-[#1a252f] border-l border-gray-100 dark:border-gray-800 shadow-2xl z-[500] flex flex-col pointer-events-auto"
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                          <History size={16} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Riwayat Perubahan</span>
                        </div>
                        <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-all z-10">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {loadingHistory ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                             <Loader2 size={24} className="animate-spin text-blue-500" />
                             <span className="text-[9px] font-bold">Memuat arsip...</span>
                          </div>
                        ) : historyDocs.length === 0 ? (
                          <div className="text-center py-12 opacity-30 italic text-[10px]">Belum ada riwayat tercatat.</div>
                        ) : (
                          historyDocs.map((hDoc, idx) => (
                            <div key={hDoc.id} className="group relative">
                              <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-amber-500/20 group-hover:bg-amber-500 transition-all rounded-full" />
                              <div className="pl-4">
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter mb-1">
                                  {hDoc.timestamp?.toDate().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-black text-white shrink-0">
                                    {hDoc.editorName?.[0]?.toUpperCase()}
                                  </div>
                                  <span className="text-[10px] font-bold truncate">{hDoc.editorName}</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (!editor || editor.isDestroyed || !editor.commands || !(editor as any).extensionManager) {
                                      alert("Editor belum siap.");
                                      return;
                                    }

                                    const confirmed = window.confirm("Pulihkan ke versi ini?");
                                    if (!confirmed) return;

                                     try {
                                      setSaveStatus('saving');
                                      if (yDoc) {
                                        try {
                                          const xmlFragment = yDoc.getXmlFragment('default');
                                          yDoc.transact(() => {
                                            xmlFragment.delete(0, xmlFragment.length);
                                            editor.commands.setContent(hDoc.htmlContent, true);
                                          });
                                        } catch (yErr) {
                                          editor.commands.setContent(hDoc.htmlContent, true);
                                        }
                                      } else {
                                        editor.commands.setContent(hDoc.htmlContent, true);
                                      }

                                      if (editingId) {
                                        await updateDoc(doc(db, 'notes', editingId), {
                                          htmlContent: hDoc.htmlContent,
                                          content: editor.getText().substring(0, 200),
                                          updatedAt: Timestamp.now(),
                                          updatedBy: user?.uid + " (Restored)"
                                        });
                                      }
                                      
                                      setShowHistory(false);
                                      setSaveStatus('saved');
                                      alert("Berhasil dipulihkan!");
                                    } catch (err) {
                                      console.error(err);
                                      alert("Gagal memulihkan.");
                                    }
                                  }}
                                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                  <RotateCcw size={12} strokeWidth={3} /> PULIHKAN VERSI INI
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20">
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                          <b>Tips Anti-Vandalisme:</b> Riwayat menyimpan 20 perubahan terakhir secara otomatis. Gunakan tombol pulihkan jika ada konten yang sengaja dirusak.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div key={`editor-content-${editingId}`} className="editor-content-container">
                  {editor && (editor as any).extensionManager && (editor as any).extensionManager.extensions && editor.commands ? (
                    <EditorContent editor={editor} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/30 dark:bg-gray-900/10 rounded-2xl">
                      <Loader2 size={32} className="animate-spin text-blue-500 opacity-50" />
                      <p className="text-[10px] font-black font-mono tracking-widest uppercase text-gray-400">Synchronizing Session...</p>
                    </div>
                  )}
                </div>
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
                        if (input.value && editor && !editor.isDestroyed && (editor as any).extensionManager) {
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
