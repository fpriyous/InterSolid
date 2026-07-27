import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, Trash2, ArrowRight, Loader2, 
  BookOpen, Plus, MessageSquare, Edit2, Check, X, Database, 
  Search, BookOpenText, GraduationCap, Clock, HelpCircle, AlertCircle, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, 
  query, orderBy, updateDoc, where, serverTimestamp, Timestamp 
} from 'firebase/firestore';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: any;
  updatedAt: any;
  personality?: string;
  model?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
}

const QUICK_PROMPTS = [
  { label: "⚡ Rebutan Colokan & Realisme", text: "Jelasin teori Realisme dalam HI pakai analogi mahasiswa rebutan colokan di kelas dong!" },
  { label: "🤝 Teori Liberalisme & Jastip", text: "Gimana analogi Liberalisme Institusional kalau dihubungkan dengan fenomena jastip makanan kelas?" },
  { label: "🌍 Geopolitik vs Geostrategi", text: "Apa sih perbedaan mendasar antara Geopolitik dan Geostrategi? Kasih contoh rill yang gampang dipahami." },
  { label: "✍️ Tips Skripsi HI Mematikan", text: "Gimana tips merumuskan Masalah Penelitian (Research Question) di skripsi HI biar dosen pembimbing langsung ACC?" }
];

const KNOWLEDGE_CATEGORIES = [
  "Teori Utama HI",
  "Metodologi Penelitian",
  "Isu Global Terkini",
  "Tips & Trik Skripsi",
  "Sejarah Hubungan Internasional",
  "Lain-lain"
];

const PERSONALITIES = [
  {
    id: 'default',
    name: 'THE CATALYST',
    roleName: 'The Catalyst',
    icon: '✨',
    desc: 'Bukan sekadar chatbot biasa. Manifestasi dari keyakinan mutlak bahwa setiap mahasiswa memiliki potensi intelektual yang jauh lebih besar daripada yang mereka kira.',
    color: 'from-violet-600 to-indigo-800',
    avatarColor: 'bg-violet-600',
    welcomeText: 'Halo, Rekan Diskusi! 👋\n\nSaya **The Catalyst**. Saya di sini bukan untuk menyuapi Anda jawaban instan atau menyelesaikan tugas kuliah Anda secara pasif.\n\nSaya hadir untuk bermitra dengan Anda, meruntuhkan rintangan belajar, dan bersama-sama menembus batas pemahaman Hubungan Internasional kita. Di sini, proses berpikir, rasa penasaran, dan keberanian menganalisis jauh lebih berharga daripada hafalan kaku atau sekadar deretan angka UTS/UAS.\n\nMari kita mulai. Ada isu global, fenomena riil, atau konsep HI apa yang membuat Anda penasaran hari ini? ... Silakan ajukan pertanyaan Anda atau klik salah satu topik di bawah! 👇'
  }
];

export default function StudyCompanion({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  
  // Chat States
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState<string>('default');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-chat');
  
  // Knowledge States
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  
  // Knowledge Form States
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(KNOWLEDGE_CATEGORIES[0]);
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState('');
  const [submittingKnowledge, setSubmittingKnowledge] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Selected article for viewing modal
  const [activeKnowledgeItem, setActiveKnowledgeItem] = useState<KnowledgeItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user's chat threads in real-time (isolated by UID)
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingThreads(true);
    
    const q = query(
      collection(db, 'study_chats'), 
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadList: ChatThread[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        threadList.push({
          id: doc.id,
          userId: data.userId,
          title: data.title || 'Obrolan Tanpa Judul',
          messages: data.messages || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          personality: data.personality || 'default',
          model: data.model || 'deepseek-chat'
        });
      });
      
      // Sort threadList client-side by updatedAt descending
      threadList.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt instanceof Date ? a.updatedAt.getTime() : (typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : 0));
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt instanceof Date ? b.updatedAt.getTime() : (typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : 0));
        return timeB - timeA;
      });
      
      setThreads(threadList);
      setLoadingThreads(false);
      
      // Auto-select first thread if none is active
      if (threadList.length > 0 && !activeThreadId) {
        setActiveThreadId(threadList[0].id);
        setMessages(threadList[0].messages);
      }
    }, (error) => {
      console.error("Failed to load chat threads:", error);
      setLoadingThreads(false);
      handleFirestoreError(error, OperationType.LIST, 'study_chats');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Synchronize message stream when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      const activeThread = threads.find(t => t.id === activeThreadId);
      if (activeThread) {
        setMessages(activeThread.messages);
        setSelectedPersonality(activeThread.personality || 'default');
        setSelectedModel(activeThread.model || 'deepseek-chat');
      }
    } else {
      setMessages([]);
      setSelectedPersonality('default');
      setSelectedModel('deepseek-chat');
    }
  }, [activeThreadId, threads]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 2. Fetch study knowledge base in real-time
  useEffect(() => {
    setLoadingKnowledge(true);
    const q = query(collection(db, 'study_knowledge'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: KnowledgeItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          title: data.title || '',
          category: data.category || '',
          content: data.content || '',
          createdBy: data.createdBy || '',
          createdByName: data.createdByName || 'Anonim',
          createdAt: data.createdAt
        });
      });
      setKnowledgeItems(items);
      setLoadingKnowledge(false);
    }, (error) => {
      console.error("Failed to load knowledge database:", error);
      setLoadingKnowledge(false);
      handleFirestoreError(error, OperationType.LIST, 'study_knowledge');
    });

    return () => unsubscribe();
  }, []);

  // 3. Create a new chat thread
  const handleCreateThread = async (initialTitle: string = 'Obrolan Baru', personalityId: string = selectedPersonality) => {
    if (!user?.uid) return;
    try {
      const activePers = PERSONALITIES.find(p => p.id === personalityId) || PERSONALITIES[0];
      const defaultWelcome: ChatMessage = {
        id: 'welcome_' + Date.now(),
        role: 'model',
        text: activePers.welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const docRef = await addDoc(collection(db, 'study_chats'), {
        userId: user.uid,
        title: initialTitle,
        messages: [defaultWelcome],
        personality: activePers.id,
        model: selectedModel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setActiveThreadId(docRef.id);
      setMessages([defaultWelcome]);
      logPortalActivity('study_companion', `Membuka sesi konsultasi baru dengan ${activePers.name}`, user);
    } catch (err: any) {
      console.error("Error creating chat thread:", err);
      alert("Gagal membuat obrolan baru: " + err.message);
    }
  };

  // 4. Rename a thread
  const handleRenameThread = async (threadId: string) => {
    if (!renameValue.trim()) return;
    try {
      const threadRef = doc(db, 'study_chats', threadId);
      await updateDoc(threadRef, {
        title: renameValue.trim(),
        updatedAt: serverTimestamp()
      });
      setRenamingThreadId(null);
      setRenameValue('');
    } catch (err: any) {
      console.error("Error renaming thread:", err);
      alert("Gagal mengubah judul: " + err.message);
    }
  };

  // 5. Delete a thread
  const handleDeleteThread = async (threadId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Apakah kamu yakin ingin menghapus obrolan "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'study_chats', threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error("Error deleting thread:", err);
      alert("Gagal menghapus obrolan: " + err.message);
    }
  };

  // 5.5 Handle PDF/TXT file upload & text extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError('');
    setIsParsingFile(true);

    try {
      // Handle plain text files
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setNewContent(text);
          if (!newTitle) {
            const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            setNewTitle(titleWithoutExt);
          }
          setIsParsingFile(false);
        };
        reader.onerror = () => {
          setFormError("Gagal membaca file teks.");
          setIsParsingFile(false);
        };
        reader.readAsText(file);
        return;
      }

      // Handle PDF files
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          document.head.appendChild(script);
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            
            let extractedText = '';
            const maxPages = Math.min(pdf.numPages, 30);
            
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              extractedText += pageText + '\n\n';
            }

            if (pdf.numPages > 30) {
              extractedText += `\n\n... [Materi dipotong karena dokumen asli memiliki ${pdf.numPages} halaman. Batas ekstraksi adalah 30 halaman awal untuk menjaga kestabilan database]`;
            }

            setNewContent(extractedText.trim());
            if (!newTitle) {
              const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
              setNewTitle(titleWithoutExt);
            }
            logPortalActivity('study_companion', `Berhasil mengekstrak teks dari PDF "${file.name}"`, user);
          } catch (err: any) {
            console.error("Error reading PDF content:", err);
            setFormError(`Gagal mengekstrak konten PDF: ${err.message || 'Format tidak didukung'}`);
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setFormError("Gagal membaca file PDF.");
          setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      setFormError("Format file tidak didukung. Harap unggah file PDF (.pdf) atau Teks (.txt) saja.");
      setIsParsingFile(false);
    } catch (err: any) {
      console.error("File upload error:", err);
      setFormError(`Gagal membaca file: ${err.message}`);
      setIsParsingFile(false);
    }
  };

  // 6. Add/Edit Knowledge Base material
  const handleSubmitKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newTitle.trim()) return setFormError('Judul wajib diisi!');
    if (!newContent.trim()) return setFormError('Materi/konten ilmu wajib diisi!');

    setSubmittingKnowledge(true);
    try {
      if (editingKnowledgeId) {
        // Edit Mode
        const docRef = doc(db, 'study_knowledge', editingKnowledgeId);
        await updateDoc(docRef, {
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim()
        });
        logPortalActivity('study_knowledge', `Memperbarui materi Database Ilmu: "${newTitle.trim()}"`, user);
      } else {
        // Create Mode
        await addDoc(collection(db, 'study_knowledge'), {
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Solidaritas',
          createdAt: serverTimestamp()
        });
        logPortalActivity('study_knowledge', `Menambahkan materi baru ke Database Ilmu: "${newTitle.trim()}"`, user);
      }

      // Reset form
      setNewTitle('');
      setNewCategory(KNOWLEDGE_CATEGORIES[0]);
      setNewContent('');
      setIsAddingKnowledge(false);
      setEditingKnowledgeId(null);
    } catch (err: any) {
      console.error("Error saving knowledge base entry:", err);
      setFormError("Gagal menyimpan data: " + err.message);
    } finally {
      setSubmittingKnowledge(false);
    }
  };

  // 7. Delete Knowledge item
  const handleDeleteKnowledge = async (item: KnowledgeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Apakah kamu yakin ingin menghapus materi "${item.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'study_knowledge', item.id));
      logPortalActivity('study_knowledge', `Menghapus materi Database Ilmu: "${item.title}"`, user);
    } catch (err: any) {
      console.error("Error deleting knowledge:", err);
      alert("Gagal menghapus data: " + err.message);
    }
  };

  // 8. Edit Knowledge button click handler
  const handleEditKnowledgeClick = (item: KnowledgeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewTitle(item.title);
    setNewCategory(item.category);
    setNewContent(item.content);
    setEditingKnowledgeId(item.id);
    setIsAddingKnowledge(true);
  };

  // Update personality for the active thread
  const handleSelectPersonality = async (persId: string) => {
    setSelectedPersonality(persId);
    if (activeThreadId) {
      try {
        const threadRef = doc(db, 'study_chats', activeThreadId);
        await updateDoc(threadRef, {
          personality: persId,
          updatedAt: serverTimestamp()
        });
        logPortalActivity('study_companion', `Mengubah tutor pendamping menjadi ${PERSONALITIES.find(p => p.id === persId)?.name}`, user);
      } catch (err) {
        console.error("Gagal mengubah kepribadian di Firestore:", err);
      }
    }
  };

  // Update model for the active thread
  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    if (activeThreadId) {
      try {
        const threadRef = doc(db, 'study_chats', activeThreadId);
        await updateDoc(threadRef, {
          model: modelId,
          updatedAt: serverTimestamp()
        });
        logPortalActivity('study_companion', `Mengubah model otak AI menjadi ${modelId}`, user);
      } catch (err) {
        console.error("Gagal mengubah model di Firestore:", err);
      }
    }
  };

  // 9. Send Chat message & dynamically ground with Knowledge Base
  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    let threadIdToUse = activeThreadId;

    // Create a thread if none exists
    if (!threadIdToUse) {
      try {
        const activePers = PERSONALITIES.find(p => p.id === selectedPersonality) || PERSONALITIES[0];
        const defaultWelcome: ChatMessage = {
          id: 'welcome_' + Date.now(),
          role: 'model',
          text: activePers.welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const docRef = await addDoc(collection(db, 'study_chats'), {
          userId: user.uid,
          title: textToSend.substring(0, 24) + (textToSend.length > 24 ? '...' : ''),
          messages: [defaultWelcome],
          personality: activePers.id,
          model: selectedModel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        threadIdToUse = docRef.id;
        setActiveThreadId(docRef.id);
      } catch (err) {
        console.error("Failed to auto-create thread:", err);
        return;
      }
    }

    const currentThread = threads.find(t => t.id === threadIdToUse) || { title: 'Obrolan Baru', messages: [] };

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistically update frontend and freeze loading status
    const updatedMessages = [...currentThread.messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 🧠 Grounding Mechanism (RAG on Client side)
      // We look for matching words in titles and content of our custom class curated Knowledge Database!
      const userTextLower = textToSend.toLowerCase();
      const matchedKnowledge = knowledgeItems.filter(item => {
        // Simple keywords extraction
        const titleWords = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const hasKeywordMatch = titleWords.some(word => userTextLower.includes(word)) || 
          item.category.toLowerCase().includes(userTextLower) ||
          userTextLower.includes(item.title.toLowerCase());
        return hasKeywordMatch;
      });

      // Pass the top 5 relevant class notes, or default to latest 3 class notes if nothing specific matched.
      const knowledgeContext = matchedKnowledge.length > 0 
        ? matchedKnowledge.slice(0, 5) 
        : knowledgeItems.slice(0, 3);

      // Log context grounding info
      if (knowledgeContext.length > 0) {
        console.log(`[RAG Grounding] Grounded with ${knowledgeContext.length} materials from class database.`);
      }

      // Convert history for API call
      const chatHistory = updatedMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/study-companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatHistory,
          personality: selectedPersonality,
          model: selectedModel,
          knowledgeContext: knowledgeContext.map(k => ({
            title: k.title,
            category: k.category,
            content: k.content
          }))
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        console.error('[Server Non-JSON Response]:', rawText);
        if (!res.ok) {
          throw new Error(`Server Vercel mengembalikan status HTTP ${res.status}. Pastikan DEEPSEEK_API_KEY sudah dikonfigurasi di Environment Variables Vercel Dashboard Anda.`);
        } else {
          throw new Error(`Respon server tidak valid: ${rawText.substring(0, 100)}`);
        }
      }

      if (res.ok && data.status === 'success') {
        const aiMsg: ChatMessage = {
          id: Math.random().toString(),
          role: 'model',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const finalMessages = [...updatedMessages, aiMsg];
        setMessages(finalMessages);

        // Update thread in Firestore securely
        const threadRef = doc(db, 'study_chats', threadIdToUse);
        
        // Auto rename default thread title if it's still "Obrolan Baru" or similar
        const needsRename = currentThread.title === 'Obrolan Baru' || currentThread.title === 'Obrolan Tanpa Judul';
        const newTitleValue = needsRename 
          ? textToSend.substring(0, 24) + (textToSend.length > 24 ? '...' : '') 
          : currentThread.title;

        await updateDoc(threadRef, {
          title: newTitleValue,
          messages: finalMessages,
          updatedAt: serverTimestamp()
        });

      } else {
        throw new Error(data.error || `Gagal memproses AI (HTTP ${res.status})`);
      }
    } catch (err: any) {
      console.error("AI Companion error:", err);
      const errMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'model',
        text: `⚠️ **Gagal Menghubungi DeepSeek AI**\n\n${err.message || 'Terjadi gangguan koneksi ke server.'}\n\n*Petunjuk:* Jika Anda menggunakan Vercel, pastikan Anda telah memasukkan \`DEEPSEEK_API_KEY\` di menu **Settings > Environment Variables** pada Vercel Dashboard, lalu lakukan Redeploy.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe and fast client-side markdown formatter
  const formatText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lineIdx) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let processedLine = isBullet ? line.trim().substring(2) : line;

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(processedLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(processedLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-[#111827] dark:text-white bg-blue-500/5 px-1 rounded">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < processedLine.length) {
        parts.push(processedLine.substring(lastIndex));
      }

      const content = parts.map((part, partIdx) => {
        if (typeof part === 'string') {
          const italicRegex = /\*(.*?)\*/g;
          const iParts = [];
          let iLastIndex = 0;
          let iMatch;

          while ((iMatch = italicRegex.exec(part)) !== null) {
            if (iMatch.index > iLastIndex) {
              iParts.push(part.substring(iLastIndex, iMatch.index));
            }
            iParts.push(<em key={iMatch.index} className="italic text-gray-700 dark:text-gray-300">{iMatch[1]}</em>);
            iLastIndex = italicRegex.lastIndex;
          }

          if (iLastIndex < part.length) {
            iParts.push(part.substring(iLastIndex));
          }
          return iParts;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-5 list-disc mb-1.5 text-gray-600 dark:text-[#b4cbd9]">
            {content}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="mb-2 text-gray-600 dark:text-[#b4cbd9] leading-relaxed min-h-[1rem]">
          {content}
        </p>
      );
    });
  };

  // Filtered knowledge articles
  const filteredKnowledge = knowledgeItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Visual Header / Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141e26] p-5 rounded-3xl border border-blue-50 dark:border-blue-900/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-gray-800 dark:text-white">Auto Paham AI & Database Ilmu</h2>
            <p className="text-xs text-gray-400 dark:text-gray-400">Pusat Belajar Kolaboratif dan Konsultasi Teori HI InterSolid</p>
          </div>
        </div>

        {/* Beautiful Navigation Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200/40 dark:border-gray-800/20">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-[#1a252f] text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Tanya AI (Auto Paham)
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'knowledge'
                ? 'bg-white dark:bg-[#1a252f] text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Database Ilmu Kelas
            {knowledgeItems.length > 0 && (
              <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                {knowledgeItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: AUTO PAHAM CHAT (Isolated per user, persistent) */}
        {activeTab === 'chat' && (
          <motion.div
            key="chat-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"
          >
            {/* Sidebar Left: Info & Chat Session list */}
            <div className="lg:col-span-1 space-y-4">
              {/* Dynamic Core AI Profile widget */}
              {(() => {
                const activePers = PERSONALITIES.find(p => p.id === selectedPersonality) || PERSONALITIES[0];
                return (
                  <div className={`bg-gradient-to-br ${activePers.color} rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/10 transition-all duration-300`}>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md text-xl animate-pulse">
                      {activePers.icon}
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-1">{activePers.roleName}</h3>
                    <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2.5 py-0.5 rounded-full font-bold">Tutor HI Aktif</span>
                    <p className="text-xs text-indigo-100 mt-4 leading-relaxed">
                      {activePers.desc}
                    </p>
                    
                    {/* Micro RAG Indicator */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-100">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Memori Database Ilmu:
                      </span>
                      <span className="font-bold bg-white/10 px-2 py-0.5 rounded">
                        {knowledgeItems.length} Artikel
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Chat Threads Container */}
              <div className="bg-white dark:bg-[#141e26] rounded-3xl p-5 border border-blue-50 dark:border-blue-900/10 shadow-sm flex flex-col max-h-[450px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Riwayat Obrolan</span>
                  <button
                    onClick={() => handleCreateThread()}
                    className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-500 rounded-lg transition-all"
                    title="Obrolan Baru"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {loadingThreads ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-[10px] text-gray-400">Memuat obrolan...</span>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[11px] text-gray-400 mb-3">Belum ada riwayat obrolan.</p>
                    <button
                      onClick={() => handleCreateThread()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Mulai Obrolan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1.5 custom-scrollbar">
                    {threads.map((thread) => {
                      const isActive = activeThreadId === thread.id;
                      const isRenaming = renamingThreadId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            if (!isRenaming) {
                              setActiveThreadId(thread.id);
                            }
                          }}
                          className={`group w-full flex items-center justify-between p-3 rounded-2xl text-[11px] font-bold cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-gray-50 hover:bg-indigo-50 dark:bg-gray-900/40 dark:hover:bg-indigo-950/20 border-transparent text-gray-600 dark:text-[#b4cbd9]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-500'}`} />
                            
                            {isRenaming ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameThread(thread.id);
                                  if (e.key === 'Escape') setRenamingThreadId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-0.5 rounded text-[11px] border border-indigo-300 focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate pr-1">{thread.title}</span>
                            )}
                          </div>

                          {/* Quick controls */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isRenaming ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRenameThread(thread.id);
                                  }}
                                  className="p-1 hover:bg-green-500 rounded text-green-500 hover:text-white transition-all"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingThreadId(null);
                                  }}
                                  className="p-1 hover:bg-red-500 rounded text-red-500 hover:text-white transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingThreadId(thread.id);
                                    setRenameValue(thread.title);
                                  }}
                                  className={`p-1 rounded transition-all ${
                                    isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400'
                                  }`}
                                  title="Ganti Nama"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteThread(thread.id, thread.title, e)}
                                  className={`p-1 rounded transition-all ${
                                    isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-red-500/20 text-red-400'
                                  }`}
                                  title="Hapus Obrolan"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Main Column: active chat stream & quick prompts */}
            <div className="lg:col-span-3 flex flex-col h-[650px] bg-white dark:bg-[#141e26] rounded-[32px] shadow-xl border border-blue-50 dark:border-blue-900/10 overflow-hidden">
              {/* Chat Header */}
              {(() => {
                const activePers = PERSONALITIES.find(p => p.id === selectedPersonality) || PERSONALITIES[0];
                return (
                  <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-b border-blue-50 dark:border-blue-900/10 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${activePers.avatarColor} text-white rounded-2xl flex items-center justify-center text-lg shadow-sm shrink-0`}>
                        {activePers.icon}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-gray-800 dark:text-white">
                          {threads.find(t => t.id === activeThreadId)?.title || 'Mulai Obrolan Baru'}
                        </h3>
                        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Tutor Aktif: {activePers.roleName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedModel}
                        onChange={(e) => handleSelectModel(e.target.value)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[10px] font-bold text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-xl border-none focus:outline-none transition-all cursor-pointer"
                        title="Pilih Otak AI"
                      >
                        <option value="deepseek-chat">🧠 DeepSeek V3 (Chat)</option>
                        <option value="deepseek-reasoner">🧐 DeepSeek R1 (Reasoner)</option>
                      </select>

                      {activeThreadId && (
                        <button
                          onClick={(e) => {
                            const active = threads.find(t => t.id === activeThreadId);
                            if (active) handleDeleteThread(active.id, active.title, e);
                          }}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                          title="Reset Obrolan Ini"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-3xl flex items-center justify-center text-indigo-500">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="max-w-md">
                      <h4 className="font-serif text-sm font-bold text-gray-700 dark:text-white">Konsultasi Kosong</h4>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        Silakan kirim pesan pertama kamu di bawah, atau klik salah satu rekomendasi pertanyaan di bawah ini untuk memulai analisis teori Hubungan Internasional!
                      </p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-sm ${
                          m.role === 'user' 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500'
                        }`}>
                          {m.role === 'user' ? (
                            user?.photoURL ? (
                              <img src={user.photoURL} alt="Me" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )
                          ) : (
                            PERSONALITIES.find(p => p.id === (threads.find(t => t.id === activeThreadId)?.personality || 'default'))?.icon || '🎓'
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-indigo-500 text-white rounded-tr-none'
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-tl-none border border-blue-50/40 dark:border-blue-900/5'
                        }`}>
                          <div className="space-y-1">
                            {formatText(m.text)}
                          </div>
                          <span className={`text-[9px] block text-right mt-2 ${
                            m.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                          }`}>
                            {m.timestamp}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 max-w-[85%]"
                      >
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center shrink-0 text-sm">
                          {PERSONALITIES.find(p => p.id === selectedPersonality)?.icon || '🎓'}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl rounded-tl-none border border-blue-50/40 dark:border-blue-900/5">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                            <span className="text-xs text-gray-400 font-medium">
                              {PERSONALITIES.find(p => p.id === selectedPersonality)?.roleName || 'Auto Paham'} sedang merumuskan jawaban...
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Panel Inside Chat */}
              <div className="px-6 py-2.5 bg-gray-50/20 dark:bg-gray-900/10 border-t border-blue-50/50 dark:border-blue-900/5 overflow-x-auto whitespace-nowrap flex gap-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt.text)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 transition-all"
                  >
                    <BookOpen className="w-3 h-3" />
                    {prompt.label}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-blue-50 dark:border-blue-900/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(input);
                  }}
                  className="relative flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLoading ? "Mohon tunggu sebentar..." : "Tanya seputar teori HI atau materi di Database Ilmu..."}
                    disabled={isLoading}
                    className="w-full pl-5 pr-14 py-4 rounded-2xl bg-white dark:bg-[#1a252f] border border-blue-100/50 dark:border-blue-900/20 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 transition-all text-[#1f2b36] dark:text-[#ddeaf2]"
                  />
                  
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2.5 p-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-[10px] text-center text-gray-400 mt-2.5">
                  Bicara santai namun tajam akademis. Obrolan ini tersinkronisasi di Cloud dan dipisahkan per mahasiswa.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: CO-CURATED KNOWLEDGE BASE (Database Ilmu) */}
        {activeTab === 'knowledge' && (
          <motion.div
            key="knowledge-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Control Bar: Search & Categories */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white dark:bg-[#141e26] p-5 rounded-3xl border border-blue-50 dark:border-blue-900/10 shadow-sm">
              {/* Search */}
              <div className="md:col-span-4 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari materi, kategori, atau keyword..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 text-xs border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              {/* Categories */}
              <div className="md:col-span-6 overflow-x-auto whitespace-nowrap flex gap-1.5 pr-2 custom-scrollbar">
                <button
                  onClick={() => setSelectedCategory('Semua')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                    selectedCategory === 'Semua'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-500 dark:text-[#b4cbd9]'
                  }`}
                >
                  Semua Kategori
                </button>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-500 dark:text-[#b4cbd9]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Add New Button */}
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => {
                    setEditingKnowledgeId(null);
                    setNewTitle('');
                    setNewCategory(KNOWLEDGE_CATEGORIES[0]);
                    setNewContent('');
                    setIsAddingKnowledge(true);
                  }}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[11px] font-bold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Ilmu
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            {isAddingKnowledge ? (
              /* Slide down/Inline form for Adding/Editing Knowledge */
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white dark:bg-[#141e26] rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/10 shadow-lg"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
                  <h3 className="font-serif font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    {editingKnowledgeId ? 'Edit Materi Ilmu' : 'Tambah Materi Ilmu Baru ke Database Kelas'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingKnowledge(false);
                      setEditingKnowledgeId(null);
                    }}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitKnowledge} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Judul Topik / Teori</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Misal: Teori Realisme Klasik (Hans Morgenthau)"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-xs border border-gray-200/50 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Kategori Bidang</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-xs border border-gray-200/50 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-gray-800 dark:text-gray-100"
                      >
                        {KNOWLEDGE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Ekstraksi Otomatis via PDF / TXT</label>
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center transition-all hover:bg-gray-100/50 dark:hover:bg-gray-900/60 relative group min-h-[110px]">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        disabled={isParsingFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      />
                      <div className="flex flex-col items-center gap-2">
                        {isParsingFile ? (
                          <>
                            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Mengekstrak isi dokumen...</span>
                            <span className="text-[10px] text-gray-400">Teks PDF sedang dikonversi & diekstrak langsung ke kolom di bawah</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-7 h-7 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Punya PDF atau Teks Materi? Unggah di Sini</span>
                            <span className="text-[10px] text-gray-400">Mendukung file .pdf atau .txt (Maksimal 30 halaman pertama)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Isi Ringkasan Materi (Materi & Penjelasan)</label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={6}
                      placeholder="Masukkan ringkasan materi kuliah, penjelasan konsep rill, teori dasar, atau tips skripsi. Penjelasan yang komprehensif akan sangat membantu Auto Paham AI memahami konteks dengan akurat!"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-xs border border-gray-200/50 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingKnowledge(false);
                        setEditingKnowledgeId(null);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submittingKnowledge}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {submittingKnowledge ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        'Simpan ke Database'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : null}

            {/* Knowledge grid */}
            {loadingKnowledge ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-xs text-gray-400">Menghubungkan ke pusat data perpustakaan kelas...</span>
              </div>
            ) : filteredKnowledge.length === 0 ? (
              <div className="bg-white dark:bg-[#141e26] p-12 rounded-3xl text-center border border-blue-50 dark:border-blue-900/10">
                <BookOpenText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-sm text-gray-700 dark:text-gray-300">Belum ada materi ditemukan</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
                  Coba ganti kategori pencarian, kata kunci, atau mulailah berkolaborasi dengan menambahkan ringkasan ilmu pertamamu di kelas!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredKnowledge.map((item) => {
                  const canEdit = item.createdBy === user.uid || isAdmin;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveKnowledgeItem(item)}
                      className="bg-white dark:bg-[#141e26] rounded-3xl border border-blue-50/50 dark:border-blue-900/5 p-6 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer shadow-sm relative group"
                    >
                      <div>
                        {/* Category Badge & Controls */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 rounded-full">
                            {item.category}
                          </span>
                          
                          {canEdit && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleEditKnowledgeClick(item, e)}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-gray-400 hover:text-indigo-500 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteKnowledge(item, e)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-serif font-bold text-sm text-gray-800 dark:text-white line-clamp-2 mb-2 group-hover:text-indigo-500 transition-colors">
                          {item.title}
                        </h4>

                        {/* Snippet */}
                        <p className="text-xs text-gray-400 dark:text-gray-400 line-clamp-4 leading-relaxed mb-4">
                          {item.content}
                        </p>
                      </div>

                      {/* Footer contributor info */}
                      <div className="pt-4 border-t border-gray-100/60 dark:border-gray-800/20 flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-gray-400">
                          <User className="w-3 h-3" />
                          Oleh: <span className="font-bold text-gray-500 dark:text-gray-300 truncate max-w-[100px]">{item.createdByName}</span>
                        </span>
                        
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Baru'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL / VIEW DRAWER: Knowledge Base Entry Details */}
      <AnimatePresence>
        {activeKnowledgeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#141e26] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-blue-50 dark:border-blue-900/10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest font-black bg-indigo-500 text-white px-3 py-1 rounded-full">
                    {activeKnowledgeItem.category}
                  </span>
                  <span className="text-xs text-gray-400">Database Ilmu InterSolid</span>
                </div>
                <button
                  onClick={() => setActiveKnowledgeItem(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Material Content */}
              <div className="p-6 overflow-y-auto space-y-4">
                <h3 className="font-serif text-lg font-black text-gray-800 dark:text-white leading-snug">
                  {activeKnowledgeItem.title}
                </h3>
                
                {/* Contributor Row */}
                <div className="flex items-center gap-3 text-xs text-gray-400 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Kontributor: <span className="font-bold text-gray-600 dark:text-gray-300">{activeKnowledgeItem.createdByName}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ditambahkan: {activeKnowledgeItem.createdAt ? new Date(activeKnowledgeItem.createdAt.seconds * 1000).toLocaleDateString() : 'Sesaat yang lalu'}
                  </span>
                </div>

                {/* Main Content Body */}
                <div className="text-xs md:text-sm text-gray-600 dark:text-[#b4cbd9] whitespace-pre-line leading-relaxed font-normal">
                  {activeKnowledgeItem.content}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/30">
                <button
                  onClick={() => {
                    // Start talking to AI grounded with this topic
                    setActiveTab('chat');
                    setActiveKnowledgeItem(null);
                    handleSend(`Tolong jelaskan tentang "${activeKnowledgeItem.title}" yang tercatat di Database Ilmu kelas!`);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
                >
                  <Bot className="w-4 h-4" />
                  Diskusikan Materi Ini Dengan AI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
