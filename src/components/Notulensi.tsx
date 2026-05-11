import { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { Plus, Trash2, FileText, Search, Clock, Pencil, Download, Bold, Italic, List as ListIcon, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Image as ImageIcon, Underline as UnderlineIcon, ArrowLeft, Save, Loader2, X, Undo, Redo, Upload, Lock, Unlock, History, RotateCcw, CloudUpload, CheckCircle2, FileCheck, FileEdit } from 'lucide-react';
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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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

  // Add beforeunload listener to prevent loss during sudden refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Cloud Awareness (Presence tracking for Polling Mode)
  useEffect(() => {
    if (!editingId || !user || !isAdding) return;

    // Heartbeat: Tell others we are viewing
    const presenceDoc = doc(db, 'note_presence', `${editingId}_${user.uid}`);
    
    const updatePresence = async (isTyping = false, cursorIndex = 0) => {
      try {
        await setDoc(presenceDoc, {
          uid: user.uid,
          noteId: editingId,
          name: user.displayName || 'Pengguna',
          photo: user.photoURL,
          color: userColor,
          lastSeen: serverTimestamp(),
          isTyping,
          cursorIndex
        }, { merge: true });
      } catch (e) {
        // Silently fail heartbeats
      }
    };

    const heartbeat = setInterval(() => {
      const pos = editor?.state.selection.from || 0;
      updatePresence(!!typingTimeout.current, pos);
    }, 2500); // More frequent heartbeats
    updatePresence(false, 0);

    // Listen to others in this specific note
    const q = query(
      collection(db, 'note_presence'), 
      where('noteId', '==', editingId)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const users: any[] = [];
      const now = Date.now();
      
      snap.forEach(d => {
        const data = d.data();
        const lastSeen = data.lastSeen?.toMillis() || 0;
        
        // Only include users seen in the last 20 seconds
        if (data.uid !== user.uid && (now - lastSeen < 20000)) {
           users.push({
             clientId: d.id,
             name: data.name,
             color: data.color,
             isTyping: data.isTyping,
             photo: data.photo,
             uid: data.uid,
             cursorIndex: data.cursorIndex || 0
           });
        }
      });
      
      // If we are connected via Yjs, Yjs handles awareness. 
      // If not, we use this Firestore-based awareness.
      if (!isConnectedRef.current) {
        setActiveUsers(users);
      }
    }, (error) => {
      console.warn('[Presence] Snapshot error:', error);
    });

    return () => {
      clearInterval(heartbeat);
      unsubscribe();
      // Only delete if we are actually exiting the doc
      setTimeout(() => {
        deleteDoc(presenceDoc).catch(() => {});
      }, 2000);
    }
  }, [editingId, user?.uid, isAdding]);

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
    
    // Fallback detection: if not connected in 3.5s, switch to Firestore sync (polling mode)
    const fallbackTimeout = setTimeout(() => {
      if (!isConnectedRef.current) {
        console.warn('[Collaboration] WebSocket connection taking too long. Activating Firestore Polling Sync...');
        setPollSyncActive(true);
      }
    }, 3500); // Shortened from 7s
    
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
      color: userColor,
      isTyping: false,
      photo: user.photoURL || '',
      uid: user.uid,
      cursor: null // Can store cursor position here for non-collaboration mode
    });

    // Update active users from awareness
    const handleAwarenessChange = () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const active = states
        .map(([id, s]: [number, any]) => ({
          clientId: id,
          name: s.user?.name,
          color: s.user?.color,
          isTyping: s.user?.isTyping,
          photo: s.user?.photo,
          uid: s.user?.uid
        }))
        .filter(s => s && s.name && s.uid !== user.uid);
      setActiveUsers(active);
    };

    wsProvider.awareness.on('change', handleAwarenessChange);

    // Initial seeding from Firestore if YDoc is empty after sync
    const handleInitialSync = (isSynced: boolean) => {
      if (isSynced && doc && editingId) {
        const xmlFragment = doc.getXmlFragment('default');
        if (xmlFragment.length === 0) {
          const existingNote = notes.find(n => n.id === editingId);
          if (existingNote?.htmlContent) {
            console.log('[Collaboration] Seeding Yjs from Firestore content');
            // We use a temporary tiptap editor if needed or directly manipulate Yjs
            // But since we have the editor instance usually, we can delegate it there
          }
        }
      }
    };
    wsProvider.on('sync', handleInitialSync);

    setYDoc(doc);
    setProvider(wsProvider);

    return () => {
      console.log(`[Collaboration] Disconnecting session for: ${editingId}`);
      clearTimeout(fallbackTimeout);
      wsProvider.off('status', statusHandler);
      wsProvider.off('sync', handleInitialSync);
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
        render: (user: any) => {
          const cursor = document.createElement('span')
          cursor.classList.add('collaboration-cursor__caret')
          cursor.style.color = user.color
          cursor.style.borderColor = user.color

          const label = document.createElement('div')
          label.classList.add('collaboration-cursor__label')
          label.style.backgroundColor = user.color
          label.insertBefore(document.createTextNode(user.name), null)
          
          cursor.insertBefore(label, null)
          return cursor
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

  // Seed Yjs content from Firestore if Yjs is empty
  useEffect(() => {
    if (!yDoc || !provider || !editor || editor.isDestroyed || !editingId || !isAdding) return;

    const seedIfEmpty = () => {
      if (!yDoc || !editor || editor.isDestroyed || !editingId) return;
      
      const xmlFragment = yDoc.getXmlFragment('default');
      // If Yjs is completely empty (no children in the fragment)
      if (xmlFragment.length === 0) {
        // Find the note - try state first, then fallback to current selectedNote
        const existingNote = notes.find(n => n.id === editingId) || selectedNote;
        
        if (existingNote?.htmlContent && existingNote.htmlContent !== '<p></p>') {
          console.log('[Collaboration] Yjs is empty, seeding from Firestore htmlContent');
          // Important: use a transaction
          yDoc.transact(() => {
             editor.commands.setContent(existingNote.htmlContent, true);
          });
        }
      }
    };

    if (provider.synced) {
      seedIfEmpty();
    } else {
      provider.once('sync', seedIfEmpty);
    }
  }, [yDoc, provider, editor, editingId, isAdding]);

  // Polling Fallback Logic: Listen to Firestore if WebSocket fails
  useEffect(() => {
    if (!pollSyncActive || !editingId || !editor || editor.isDestroyed || isConnected) return;

    console.log(`[Collaboration] Running in Polling Sync Mode for: ${editingId}`);
    
    const unsubscribe = onSnapshot(doc(db, 'notes', editingId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      const remoteHtml = data.htmlContent || '';
      const localHtml = editor.getHTML();
      
      if (!typingTimeout.current && remoteHtml !== localHtml && data.updatedBy !== user?.uid) {
        if (remoteHtml === '' || remoteHtml === '<p></p>') {
            if (localHtml.length > 20) return; 
        }
        
        console.log('[Collaboration] Applying Firestore content update (Polling Mode)');
        
        // Preserve selection and scroll position
        const { from, to } = editor.state.selection;
        const scrollPos = document.querySelector('.flex-1.overflow-y-auto')?.scrollTop;

        editor.commands.setContent(remoteHtml, false);
        
        try {
          // Restore selection if indices are still valid
          const maxPos = editor.state.doc.content.size;
          editor.commands.setTextSelection({ 
            from: Math.min(from, maxPos), 
            to: Math.min(to, maxPos) 
          });
          
          if (scrollPos !== undefined) {
            const el = document.querySelector('.flex-1.overflow-y-auto');
            if (el) el.scrollTop = scrollPos;
          }
        } catch (e) {
          // Fallback if selection restoration fails
        }
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
      
      // Manage typing awareness (Works for both WebSocket and Polling Presence)
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      
      if (isConnected && provider) {
        try {
          provider.awareness.setLocalStateField('user', {
            ...provider.awareness.getLocalState()?.user,
            isTyping: true
          });
        } catch (e) {}
      }

      typingTimeout.current = setTimeout(() => {
        if (isConnected && provider && provider.awareness && !editor.isDestroyed) {
          try {
            provider.awareness.setLocalStateField('user', {
              ...provider.awareness.getLocalState()?.user,
              isTyping: false
            });
          } catch (e) {}
        }
        typingTimeout.current = undefined;
      }, 800);

      setSaveStatus('saving');
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      
      // Much faster sync in polling mode to feel "live" (800ms vs 3000ms)
      const debounceTime = pollSyncActive && !isConnected ? 800 : 3000;
      
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
          setLastSavedAt(new Date());
          setTimeout(() => {
            if (setSaveStatus) setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 3000);
        } catch (e) {
          console.error('Auto-save error:', e);
          setSaveStatus('idle');
        }
      }, debounceTime); 
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
      const html = editor.getHTML().trim();
      const title = newNote.title.trim() || 'Tanpa Judul';
      const tag = newNote.tag;
      
      setSaveStatus('saving');
      
      try {
        // Final save for everything
        await updateDoc(doc(db, 'notes', editingId), {
          title: title,
          tag: tag,
          content: text.substring(0, 200),
          htmlContent: html,
          updatedAt: Timestamp.now(),
          updatedBy: user?.uid
        });

        setLastSavedAt(new Date());

        // Improved Cleanup: Only delete if it's literally untouched and just created
        // We check if the doc was created in the last 60 seconds to avoid deleting long-standing placeholder notes
        const currentNote = notes.find(n => n.id === editingId);
        const isVeryNew = currentNote?.createdAt && (Date.now() - currentNote.createdAt.toMillis() < 60000);
        
        if (isVeryNew && (title === 'Tanpa Judul' || title === 'Catatan Baru') && (text === '' || html === '<p></p>')) {
          console.log('[Cleanup] Deleting empty placeholder note');
          await deleteDoc(doc(db, 'notes', editingId));
        } else {
          saveHistorySnapshot();
        }
        setSaveStatus('saved');
      } catch (e) {
        console.error('Final save error:', e);
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
                setNewNote({ title: n.title, tag: n.tag });
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
            {/* Header Editor - Minimalist Google Docs Style */}
              <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a252f] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button 
                    onClick={handleExitEditor}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all shrink-0"
                    title="Simpan & Keluar"
                  >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 h-4 mb-0.5">
                      {saveStatus === 'saving' ? (
                        <span className="flex items-center gap-1 text-[9px] text-blue-500 font-black uppercase tracking-widest animate-pulse">
                          <CloudUpload size={10} strokeWidth={3} /> Menyimpan...
                        </span>
                      ) : lastSavedAt ? (
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-green-500" />
                          Terakhir disimpan {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Dokumen Berbagi</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Judul Dokumen..." 
                      value={newNote.title}
                      onChange={e => {
                        const title = e.target.value;
                        setNewNote(prev => ({ ...prev, title }));
                        if (editingId) {
                          updateDoc(doc(db, 'notes', editingId), { title, updatedAt: Timestamp.now() });
                        }
                      }}
                      className="w-full bg-transparent text-xl font-serif font-bold outline-none text-slate-800 dark:text-gray-100 truncate focus:bg-blue-50/10 dark:focus:bg-white/5 px-1.5 rounded -ml-1.5 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Presence indicator: Avatars of active users */}
                  <div className="flex items-center -space-x-2 mr-2">
                    {activeUsers.map((u, i) => (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={`presence-header-${u.uid || u.clientId}-${i}`} 
                        className="relative group/avatar"
                      >
                        <div 
                          title={`${u.name} ${u.isTyping ? '(Sedang mengetik...)' : ''}`}
                          className="w-9 h-9 rounded-full border-2 border-white dark:border-[#1a252f] flex items-center justify-center text-[10px] font-black text-white relative transition-transform hover:scale-110 hover:z-10 shadow-sm cursor-help"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.photo ? (
                             <img src={u.photo} alt={u.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                             u.name?.[0]?.toUpperCase()
                          )}
                          {u.isTyping && (
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                               <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </div>
                          )}
                        </div>
                        {/* Hover Tooltip/Label */}
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[9px] font-bold rounded opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 uppercase tracking-widest shadow-xl">
                          {u.name} {u.isTyping ? '• Sedang Mengetik' : ''}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 hidden md:block" />

                  <select 
                    value={newNote.tag}
                    onChange={e => {
                        const tag = e.target.value;
                        setNewNote(prev => ({ ...prev, tag }));
                        if (editingId) {
                          updateDoc(doc(db, 'notes', editingId), { tag, updatedAt: Timestamp.now() });
                        }
                    }}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 border border-blue-100 dark:border-blue-900/30 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="Rapat">Meeting</option>
                    <option value="Materi">Material</option>
                    <option value="Memo">Memo</option>
                    <option value="Umum">General</option>
                  </select>

                  <button 
                    onClick={() => {
                      fetchNoteHistory();
                      setShowHistory(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    title="Riwayat Versi"
                  >
                    <History size={18} />
                  </button>
                </div>
              </div>

            {/* Toolbar - Sticky like Google Docs */}
            <div className="sticky top-0 z-[100] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-all print:hidden">
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
                <div className="h-[52px] flex items-center px-8 gap-4 overflow-hidden">
                  <div className="flex gap-2.5">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                  <div className="h-5 w-px bg-gray-200 dark:bg-gray-800" />
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-500 opacity-60" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Establishing Connection...</span>
                  </div>
                </div>
              )}
              
              {/* Secondary Info Bar (Compact & Subtle) */}
              <div className="flex items-center justify-between px-8 py-2 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saving' ? (
                      <div className="flex items-center gap-1.5 text-blue-500 animate-pulse">
                        <CloudUpload size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Saving...</span>
                      </div>
                    ) : saveStatus === 'saved' ? (
                      <div className="flex items-center gap-1.5 text-green-500/80">
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Saved</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <FileCheck size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Ready</span>
                      </div>
                    )}
                  </div>
                  <div className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
                  {editor && (
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter opacity-60 hover:opacity-100 transition-opacity">
                        {editor.getText().trim().split(/\s+/).filter(word => word !== "").length} Words
                      </span>
                  )}
                  <div className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : pollSyncActive ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isConnected ? 'text-green-600 dark:text-green-400' : pollSyncActive ? 'text-amber-600' : 'text-red-500'}`}>
                      {isConnected ? 'Live Sync' : pollSyncActive ? 'Cloud Polling' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {activeUsers.length > 0 && (
                  <div className="flex items-center -space-x-2">
                    {activeUsers.slice(0, 3).map((u, i) => (
                      <div 
                        key={i} 
                        title={`${u.name} ${u.isTyping ? '(Typing...)' : ''}`}
                        className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[8px] font-black text-white relative transition-transform hover:scale-110 hover:z-10 shadow-sm"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name?.[0]?.toUpperCase()}
                        {u.isTyping && (
                          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-500 border-2 border-white dark:border-gray-900 rounded-full animate-bounce" />
                        )}
                      </div>
                    ))}
                    {activeUsers.length > 3 && (
                      <div className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-400">
                        +{activeUsers.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Document Content Background - Improved Blending */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#020617] custom-scrollbar scroll-smooth relative">
              {/* Subtle background glow/texture */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/[0.03] dark:bg-blue-500/[0.05] blur-[150px] rounded-full" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] blur-[150px] rounded-full" />
              </div>

              <div key={editingId || 'no-editor'} className="relative z-10 px-4 md:px-0">
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

                <div key={`editor-content-${editingId}`} className="editor-content-container relative flex-1 pb-32">
                  {/* Document Page Simulation - Modern Minimalist */}
                  <div className="page-simulation-container max-w-[850px] mx-auto my-6 md:my-12 bg-white dark:bg-[#0f172a] shadow-[0_2px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-xl min-h-[1056px] relative p-10 md:p-20 border border-gray-200/40 dark:border-blue-900/10 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:border-blue-700/20">
                    {editor && (editor as any).extensionManager && (editor as any).extensionManager.extensions && editor.commands ? (
                      <div className="prose prose-slate lg:prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-p:leading-relaxed selection:bg-blue-100 dark:selection:bg-blue-900/40">
                        <EditorContent editor={editor} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-64 gap-6">
                        <div className="relative">
                          <Loader2 size={48} className="animate-spin text-blue-600/30" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileEdit size={20} className="text-blue-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-[11px] font-black font-mono tracking-[0.2em] uppercase text-blue-600 dark:text-blue-400">
                            {pollSyncActive ? 'Activating Cloud Sync...' : 'Synchronizing Canvas...'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium italic">
                            Preparing your collaborative workspace
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Subtle Page indicators */}
                    <div className="absolute top-8 right-8 pointer-events-none">
                      <div className="flex flex-col items-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${pollSyncActive && !isConnected ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                               {pollSyncActive && !isConnected ? 'Sinkronisasi Cloud' : 'Koneksi Langsung'}
                            </span>
                         </div>
                      </div>
                    </div>

                    {/* Page Break Indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-10 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2">
                         <div className="h-px w-8 bg-gray-300" />
                         <span className="text-[8px] font-black uppercase tracking-[4px] text-gray-400">Halaman 1</span>
                         <div className="h-px w-8 bg-gray-300" />
                      </div>
                    </div>

                    {/* Manual Collaboration Cursors for Polling Mode */}
                    {pollSyncActive && !isConnected && editor && (
                      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                        {activeUsers.filter(u => u.cursorIndex !== undefined).map((u) => {
                          try {
                            const pos = Math.min(u.cursorIndex, editor.state.doc.content.size);
                            const coords = editor.view.coordsAtPos(pos);
                            const containerBounds = document.querySelector('.page-simulation-container')?.getBoundingClientRect();
                            
                            if (!coords || !containerBounds) return null;

                            // Calculate relative position within the editor container
                            const left = coords.left - containerBounds.left;
                            const top = coords.top - containerBounds.top;

                            return (
                              <motion.div 
                                key={`cursor-${u.clientId}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, x: left, y: top }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-0 left-0 pointer-events-none"
                              >
                                <div className="relative">
                                  {/* Caret */}
                                  <div 
                                    className="w-[2px] h-5 transition-colors animate-pulse"
                                    style={{ backgroundColor: u.color }}
                                  />
                                  {/* Label */}
                                  <div 
                                    className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[9px] font-black text-white whitespace-nowrap uppercase tracking-tighter"
                                    style={{ backgroundColor: u.color }}
                                  >
                                    {u.name}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })}
                      </div>
                    )}

                    {/* Collaborative Typing Indicator Pill */}
                    <AnimatePresence>
                      {activeUsers.some(u => u.isTyping) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute bottom-12 right-12 flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-full shadow-xl z-30"
                        >
                          <div className="flex -space-x-1">
                            {activeUsers.filter(u => u.isTyping).slice(0, 3).map(u => (
                              <div 
                                key={u.clientId} 
                                className="w-5 h-5 rounded-full border border-white dark:border-gray-900 flex items-center justify-center text-[6px] font-black text-white"
                                style={{ backgroundColor: u.color }}
                              >
                                {u.photo ? (
                                  <img src={u.photo} alt={u.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  u.name?.[0]?.toUpperCase()
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                            {activeUsers.filter(u => u.isTyping).length === 1 
                              ? `${activeUsers.find(u => u.isTyping)?.name} sedang mengetik...`
                              : `${activeUsers.filter(u => u.isTyping).length} orang sedang mengetik...`}
                          </span>
                          <div className="flex gap-0.5">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
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
              <h3 className="font-serif text-2xl font-bold mb-2">Hapus Catatan?</h3>
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Catatan ini akan dihapus permanen</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmId(null)}
                  className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
                >
                  Batalkan
                </button>
                <button 
                  onClick={() => deleteNote(confirmId)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
