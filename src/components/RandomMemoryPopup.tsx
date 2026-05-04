import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function RandomMemoryPopup() {
  const [memory, setMemory] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const fetchRandomMemory = async () => {
      // Don't fetch if tab is not visible
      if (document.hidden) return;
      
      const q = query(collection(db, 'memories'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docs = snapshot.docs;
          const randomDoc = docs[Math.floor(Math.random() * docs.length)];
          setMemory({ id: randomDoc.id, ...randomDoc.data() });
          setIsVisible(true);
          
          // Auto hide after 12 seconds
          setTimeout(() => setIsVisible(false), 12000);
        }
        unsubscribe(); // Unsubscribe after one pick
      }, (error) => console.error("Error fetching random memory:", error));
    };

    // First delay 1.5 minutes (90,000 ms)
    // Then every 1.5 minutes
    const interval = setInterval(() => {
      fetchRandomMemory();
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  if (!memory) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
           initial={{ opacity: 0, scale: 0.8, y: 50 }}
           animate={{ 
             opacity: 1, 
             scale: 1, 
             y: 0
           }}
           exit={{ opacity: 0, scale: 0.8, y: 50, filter: 'blur(10px)' }}
           transition={{ 
             type: "spring",
             damping: 30,
             stiffness: 200
           }}
           className="fixed bottom-24 right-6 md:right-10 z-[200] w-48 md:w-64 cursor-pointer group pointer-events-auto"
           onClick={() => setIsVisible(false)}
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-white dark:bg-[#1a252f] border border-blue-100 dark:border-blue-900/30 p-2.5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden">
            {/* Minimalist Image Container */}
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-900/50">
              {memory.type === 'image' ? (
                <img src={memory.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" alt="" />
              ) : (
                <video src={memory.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" autoPlay muted loop playsInline />
              )}
              
              {/* Overlay with Minimal Text */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-wider truncate drop-shadow-md">
                    {memory.title || 'Kenangan'}
                  </h3>
                  <p className="text-[8px] font-bold text-blue-400/90 uppercase tracking-widest drop-shadow-md">
                    {memory.displayDate ? new Date(memory.displayDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Arsip'}
                  </p>
                </div>
              </div>

              {/* Close Icon on Hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white/50">
                   <X size={10} />
                </div>
              </div>
            </div>

            {/* Subtle Label (Optional, for context) */}
            <div className="mt-2 text-center">
               <span className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-white/20">Nostalgia Moment</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
