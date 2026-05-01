import { useState, useEffect } from 'react';
import { MessageSquare, Send, Smile, Image as ImageIcon, Trash2, Heart } from 'lucide-react';

interface AspirasiMessage {
  id: string;
  text: string;
  sticker?: string;
  image?: string;
  likes: number;
  date: string;
}

const STICKERS = ['🔥', '👍', '❤️', '🙌', '😢', '😂', '👀', '💯', '🙏', '✨'];

export default function Aspirasi({ isAdmin }: { isAdmin: boolean }) {
  const [messages, setMessages] = useState<AspirasiMessage[]>(() => {
    const saved = localStorage.getItem('IS_aspirasi');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [inputText, setInputText] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('');
  const [showStickers, setShowStickers] = useState(false);

  useEffect(() => {
    localStorage.setItem('IS_aspirasi', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = () => {
    if (!inputText && !selectedSticker) return;
    const msg: AspirasiMessage = {
      id: Date.now().toString(),
      text: inputText,
      sticker: selectedSticker,
      likes: 0,
      date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([msg, ...messages]);
    setInputText('');
    setSelectedSticker('');
    setShowStickers(false);
  };

  const likeMessage = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m));
  };

  const deleteMessage = (id: string) => {
    if (!confirm('Hapus pesan aspirasi ini?')) return;
    setMessages(messages.filter(m => m.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-xl shadow-blue-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <MessageSquare size={20}/>
          </div>
          <div className="flex-1 space-y-4">
            <textarea 
              placeholder="Tulis aspirasi atau pesan anonim di sini..." 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
            
            {selectedSticker && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full w-fit">
                <span className="text-lg">{selectedSticker}</span>
                <button onClick={() => setSelectedSticker('')} className="text-[10px] uppercase font-bold text-blue-500 hover:text-red-500">Batal</button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowStickers(!showStickers)}
                  className={`p-2 rounded-lg transition-colors ${showStickers ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <Smile size={18}/>
                </button>
                <button className="p-2 text-gray-300 cursor-not-allowed">
                  <ImageIcon size={18}/>
                </button>
              </div>
              <button 
                onClick={sendMessage}
                className="px-6 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={!inputText && !selectedSticker}
              >
                Kirim <Send size={14}/>
              </button>
            </div>

            {showStickers && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl animate-in fade-in slide-in-from-top-2">
                {STICKERS.map(s => (
                  <button 
                    key={s} 
                    onClick={() => {
                      setSelectedSticker(s);
                      setShowStickers(false);
                    }}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-white dark:bg-[#1a252f] p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm relative group overflow-hidden">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-500">ANON</span>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">{m.date}</span>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <button onClick={() => deleteMessage(m.id)} className="p-1.5 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14}/>
                  </button>
                )}
                <button 
                  onClick={() => likeMessage(m.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                >
                  <Heart size={12} className={m.likes > 0 ? 'fill-rose-500' : ''}/>
                  <span className="text-[10px] font-bold">{m.likes}</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              {m.sticker && <span className="text-4xl animate-bounce duration-1000">{m.sticker}</span>}
              {m.text && <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{m.text}</p>}
            </div>

            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <p className="text-sm font-serif italic">Belum ada aspirasi. Jadilah yang pertama memberikan suara!</p>
          </div>
        )}
      </div>
    </div>
  );
}
