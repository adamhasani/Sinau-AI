import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Loader2, User } from 'lucide-react';
import { HistoricalFigure } from '../types';
import { getHistoricalFigureResponse } from '../services/geminiService';

const FIGURES: HistoricalFigure[] = [
  {
    name: "Socrates",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Socrates_Louvre.jpg",
    bio: "Filsuf Yunani Kuno, bapak filsafat Barat yang dikenal dengan metode dialektikanya.",
    personality: "Tukang tanya, skeptis namun bijak, selalu mencari hakikat kebenaran melalui pertanyaan mendalam."
  },
  {
    name: "Albert Einstein",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg",
    bio: "Fisikawan teoretis yang mengembangkan teori relativitas.",
    personality: "Genius, santai, punya rasa ingin tahu tinggi, sering menggunakan analogi imajinatif."
  },
  {
    name: "R.A. Kartini",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kartini",
    bio: "Pahlawan nasional Indonesia, pelopor kebangkitan perempuan pribumi.",
    personality: "Cerdas, visioner, empatik, bicaranya lembut namun penuh semangat perjuangan dan pendidikan."
  }
];

interface HistoricalChatProps {
  onClose: () => void;
}

const HistoricalChat: React.FC<HistoricalChatProps> = ({ onClose }) => {
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !selectedFigure || loading) return;
    
    const userMsg = { role: 'user' as const, parts: [{ text: input }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await getHistoricalFigureResponse(selectedFigure, [...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Maaf, hubungan dimensi waktu terputus..." }] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px]"
      >
        <div className="p-8 bg-sky-600 dark:bg-sky-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {selectedFigure && (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                <img 
                  src={selectedFigure.avatar} 
                  alt="" 
                  className="w-full h-full object-cover object-top" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200">Historical Figure Chat</span>
              <h3 className="text-2xl font-bold line-clamp-1">{selectedFigure ? `Ngobrol Bareng ${selectedFigure.name}` : "Pilih Tokoh Sejarah"}</h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-95"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!selectedFigure ? (
          <div className="flex-1 p-8 grid grid-cols-3 gap-6 overflow-y-auto">
            {FIGURES.map(f => (
              <button 
                key={f.name}
                onClick={() => {
                  setSelectedFigure(f);
                  setMessages([{ role: 'model', parts: [{ text: `Salam! Saya ${f.name}. Ada yang ingin kamu diskusikan denganku hari ini?` }] }]);
                }}
                className="group flex flex-col items-center gap-4 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-sky-500 transition-all hover:bg-sky-50 dark:hover:bg-sky-900/20"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner shrink-0">
                  <img 
                    src={f.avatar} 
                    alt={f.name} 
                    className="w-full h-full object-cover object-top filter grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-900 dark:text-white capitalize text-base">{f.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{f.bio.split(',')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
              {messages.map((m, i) => (
                <div key={`hist-msg-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-sky-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                  }`}>
                    {m.parts[0].text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memulai Mesin Waktu...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex gap-4">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={`Tanya ke ${selectedFigure.name}...`}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 py-5 outline-none border border-slate-100 dark:border-slate-800 font-medium text-slate-700 dark:text-white"
                  />
                <button 
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button 
                onClick={() => setSelectedFigure(null)}
                className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-sky-500 transition-colors"
              >
                ← Ganti Tokoh
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default HistoricalChat;
