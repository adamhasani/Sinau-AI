import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  Map as MapIcon, 
  Layers, 
  Lightbulb, 
  MessageCircle, 
  ChevronRight, 
  BookOpen,
  ArrowRight,
  User,
  Send,
  Loader2,
  CheckCircle2,
  HelpCircle,
  GraduationCap,
  XCircle,
  X,
  History as HistoryIcon,
  RotateCcw,
  Star,
  Trophy,
  Target,
  LogOut,
  Download,
  Settings,
  LayoutDashboard,
  Brain,
  Upload as UploadIcon,
  Crown,
  RefreshCw,
  Trash2,
  PlusCircle,
  Menu,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { generateStudyPack, getStudyCoachResponse } from './services/geminiService';
import PomodoroTimer from './components/PomodoroTimer';
import InteractiveQuiz from './components/InteractiveQuiz';
import StudyAnalytics from './components/StudyAnalytics';
import MindMap from './components/MindMap';
import HistoricalChat from './components/HistoricalChat';
import FileUpload from './components/FileUpload';
import { calculateNextReview, getMasteryColor } from './services/srsService';
import { StudyPack } from './types';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, increment, collection, query, where, getDocs, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [placeholderText, setPlaceholderText] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [studyPack, setStudyPack] = useState<StudyPack | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'roadmap' | 'flashcards' | 'quiz' | 'stats' | 'mindmap'>('summary');
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [history, setHistory] = useState<StudyPack[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isHistoricalChatOpen, setIsHistoricalChatOpen] = useState(false);

  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Real-time Study Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);

    // Sync to DB every 30 seconds to prevent data loss
    const syncInterval = setInterval(async () => {
      if (sessionSeconds > 0) {
        if (user) {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              studyTimeSeconds: increment(sessionSeconds)
            });
            setSessionSeconds(0);
          } catch (e) {
            console.error("Auto-sync failed", e);
          }
        } else {
          // Update local study time
          const currentTotal = parseInt(localStorage.getItem('sh_guest_study_time') || '0');
          localStorage.setItem('sh_guest_study_time', (currentTotal + sessionSeconds).toString());
          setSessionSeconds(0);
        }
      }
    }, 30000);

    const handleUnload = () => {
      if (sessionSeconds > 0 && !user) {
        const currentTotal = parseInt(localStorage.getItem('sh_guest_study_time') || '0');
        localStorage.setItem('sh_guest_study_time', (currentTotal + sessionSeconds).toString());
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, sessionSeconds]);

  useEffect(() => {
    const allTopics = [
      "Sejarah Kecerdasan Buatan (AI)",
      "Tokoh Sejarah Islam Terpenting",
      "Pengertian Ekonomi Digital",
      "Konsep Dasar Fisika Kuantum",
      "Rumus Dasar Kalkulus",
      "Mekanisme Evolusi Biologi",
      "Struktur Sistem Politik Dunia",
      "Algoritma dan Struktur Data",
      "Anatomi Tubuh Manusia",
      "Ekonomi Makro dan Mikro",
      "Hukum Internasional",
      "Psikologi Perkembangan",
      "Sosiologi Masyarakat Modern",
      "Teks Proklamasi Kemerdekaan",
      "Teori Relativitas Einstein",
      "Teknik Kimia Industri",
      "Arsitektur Berkelanjutan",
      "Manajemen Bisnis Start-up",
      "Seni Rupa Antroposen",
      "Jurnalistik Investigasi",
      "Dasar Pemrograman Python",
      "Sistem Basis Data Terdistribusi",
      "Etika Bisnis dan Profesionalisme",
      "Geopolitik Asia Tenggara"
    ];

    if (topic.trim().length > 1 && !loading) {
      const filtered = allTopics.filter(s => 
        s.toLowerCase().includes(topic.toLowerCase()) && 
        s.toLowerCase() !== topic.toLowerCase()
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
    setSuggestionIdx(-1);
  }, [topic, loading]);

  useEffect(() => {
    if (loading) return;
    
    const typewriterSuggestions = [
      "Sejarah Kecerdasan Buatan (AI)",
      "Tokoh Sejarah Islam Terpenting",
      "Pengertian Ekonomi Digital",
      "Konsep Dasar Fisika Kuantum",
      "Rumus Dasar Kalkulus",
      "Mekanisme Evolusi Biologi",
      "Struktur Sistem Politik Dunia"
    ];
    
    let currentSuggestionIdx = 0;
    let currentCharIdx = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const type = () => {
      const currentFullText = typewriterSuggestions[currentSuggestionIdx];
      
      if (isDeleting) {
        setPlaceholderText(currentFullText.substring(0, currentCharIdx - 1));
        currentCharIdx--;
        typingSpeed = 50;
      } else {
        setPlaceholderText(currentFullText.substring(0, currentCharIdx + 1));
        currentCharIdx++;
        typingSpeed = 100;
      }

      if (!isDeleting && currentCharIdx === currentFullText.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at the end
      } else if (isDeleting && currentCharIdx === 0) {
        isDeleting = false;
        currentSuggestionIdx = (currentSuggestionIdx + 1) % typewriterSuggestions.length;
        typingSpeed = 500; // Pause before next
      }

      setTimeout(type, typingSpeed);
    };

    const timeout = setTimeout(type, typingSpeed);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // Initialize guest profile if not logged in
        const savedXP = localStorage.getItem('sh_guest_xp');
        const savedLevel = localStorage.getItem('sh_guest_level');
        const savedStudyTime = localStorage.getItem('sh_guest_study_time');
        
        setUserProfile({
          uid: 'guest',
          displayName: 'Guest Scholar',
          xp: savedXP ? parseInt(savedXP) : 0,
          level: savedLevel ? parseInt(savedLevel) : 1,
          studyTimeSeconds: savedStudyTime ? parseInt(savedStudyTime) : 0,
          dailyStreak: 1
        });
        
        // Load local history
        const localHistory = localStorage.getItem('sh_history');
        if (localHistory) {
          try {
            setHistory(JSON.parse(localHistory));
          } catch (e) {
            console.error("Local history corrupt", e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Data Listener (User Profile)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data());
      } else {
        // Initial setup
        const initialProfile = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          xp: 0,
          level: 1,
          studyTimeSeconds: 0,
          dailyStreak: 1,
          lastActive: new Date().toISOString()
        };
        setDoc(doc(db, 'users', user.uid), initialProfile);
      }
    });
    return () => unsub();
  }, [user]);

  // Load History from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'studyPacks'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const packs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Deduplicate by ID using a simple object map to avoid shadowed Map conflict
      const packMap: Record<string, any> = {};
      packs.forEach(p => {
        packMap[p.id] = p;
      });
      const uniquePacks = Object.values(packMap);
      setHistory(uniquePacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (resolvedTheme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const addXP = async (amount: number) => {
    const newXP = (userProfile?.xp || 0) + amount;
    const newLevel = Math.floor(newXP / 1000) + 1;
    
    // Update local state first for immediate feedback
    setUserProfile((prev: any) => ({ ...prev, xp: newXP, level: newLevel }));

    if (!user) {
      localStorage.setItem('sh_guest_xp', newXP.toString());
      localStorage.setItem('sh_guest_level', newLevel.toString());
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        xp: newXP,
        level: newLevel,
        lastActive: new Date().toISOString()
      });
    } catch (e) {
      console.error("XP update failed", e);
    }
  };

  const handleGenerate = async () => {
    if (loading || (!topic.trim() && !selectedFile)) return;
    setLoading(true);
    setLoadingStatus("Menganalisis topik & file...");

    try {
      let fileData;
      if (selectedFile) {
        setLoadingStatus("Mengekstraksi konten dari file...");
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(selectedFile);
        });
        fileData = { base64: base64Data, mimeType: selectedFile.type };
      }

      setLoadingStatus("AI sedang meracik roadmap & materi (biasanya 10-15 detik)...");
      
      // Artificial progress updates to keep user engaged
      const statusInterval = setInterval(() => {
        const statuses = [
          "Membangun visualisasi mind-map...",
          "Menyusun flashcards interaktif...",
          "Membuat ringkasan eksekutif...",
          "Menyiapkan kuis menantang...",
          "Menghaluskan detail penjelasan..."
        ];
        setLoadingStatus(prev => {
          const currentIndex = statuses.indexOf(prev);
          if (currentIndex === -1 || currentIndex === statuses.length - 1) return statuses[0];
          return statuses[currentIndex + 1];
        });
      }, 3000);

      const pack = await generateStudyPack(topic || "Ekstraksi Materi Baru", fileData);
      clearInterval(statusInterval);
      setLoadingStatus("Hampir selesai...");
      
      const packData = {
        ...pack,
        id: crypto.randomUUID(), // Local ID for consistency
        userId: user?.uid || 'guest',
        createdAt: new Date().toISOString(),
        unlockedLevel: 0
      };
      
      if (user) {
        const docRef = await addDoc(collection(db, 'studyPacks'), packData);
        setStudyPack({ ...packData, id: docRef.id } as any);
      } else {
        // Save to local history
        const newHistory = [packData, ...history].slice(0, 50); // Keep last 50
        setHistory(newHistory);
        localStorage.setItem('sh_history', JSON.stringify(newHistory));
        setStudyPack(packData as any);
      }
      
      addXP(50); // XP for generating packs
      setActiveTab('summary');
      setFlippedCards([]);
      setUnlockedLevel(0);
      setSelectedFile(null);
      setTopic('');
    } catch (error) {
      console.error(error);
      alert("Maaf, terjadi kesalahan saat meracik materi. Coba lagi ya!");
    } finally {
      setLoading(false);
    }
  };

  const deleteStudyPack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    
    if (user) {
      try {
        await deleteDoc(doc(db, 'studyPacks', id));
      } catch (error) {
        console.error("Delete failed", error);
      }
    } else {
      const newHistory = history.filter(h => h.id !== id && h.topic !== id);
      setHistory(newHistory);
      localStorage.setItem('sh_history', JSON.stringify(newHistory));
    }

    if (studyPack?.id === id || studyPack?.topic === id) {
      setStudyPack(null);
    }
  };

  const handleFlashcardReview = async (idx: number, quality: number) => {
    if (!studyPack) return;
    
    const card = studyPack.flashcards[idx];
    const srs = calculateNextReview(
      quality, 
      1, // default interval
      card.mastery || 0, // using mastery as repetitions for now
      2.5 // ease factor
    );

    const newCards = [...studyPack.flashcards];
    newCards[idx] = {
      ...card,
      mastery: (card.mastery || 0) + (quality >= 4 ? 1 : 0),
      nextReview: srs.nextReviewDate
    };

    const updatedPack = { ...studyPack, flashcards: newCards };
    setStudyPack(updatedPack);

    if (user && studyPack.id) {
      try {
        const docRef = doc(db, 'studyPacks', studyPack.id);
        await updateDoc(docRef, {
          flashcards: newCards
        });
      } catch (e) {
        console.error("SRS update failed", e);
      }
    } else {
      // Update local history
      const newHistory = history.map(h => h.id === studyPack.id ? updatedPack : h);
      setHistory(newHistory);
      localStorage.setItem('sh_history', JSON.stringify(newHistory));
    }

    addXP(quality >= 4 ? 20 : 10);
    toggleCard(idx); // Flip back to front after review for better feedback
  };

  function handleFirestoreError(error: any, operation: string, path: string) {
    const errInfo = {
      error: error?.message || String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }

  const handlePomodoroFinish = async (type: string) => {
    const bonus = type === 'pomodoro' ? 100 : 20;
    addXP(bonus);
    
    if (user) {
      // Log session
      try {
        await addDoc(collection(db, 'users', user.uid, 'sessions'), {
          type,
          timestamp: new Date().toISOString(),
          xpAwarded: bonus
        });
      } catch (e) {
        console.error("Session logging failed", e);
      }
    }
  };

  const handleExportPDF = () => {
    if (!studyPack) return;
    const content = `
      SCHOLARHUB AI - STUDY PACK: ${studyPack.topic.toUpperCase()}
      
      ELI5 SUMMARY:
      ${studyPack.eli5}
      
      DETAILED EXPLANATION:
      ${studyPack.detailedExplanation}
      
      ROADMAP:
      ${studyPack.roadmap.map((r, i) => `${i+1}. ${r.step}\n${r.description}`).join('\n\n')}
      
      SUMMARY CARDS:
      ${studyPack.summary.map(s => `[${s.title}]\n${s.content}`).join('\n\n')}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScholarHub_${studyPack.topic.replace(/\s/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addXP(10); // XP for exporting
  };

  const themes = {
    light: { 
      bg: 'bg-[#F8FAF5]', 
      primary: 'bg-emerald-600', 
      text: 'text-slate-900', 
      card: 'bg-white', 
      border: 'border-emerald-100', 
      accent: 'text-emerald-600', 
      muted: 'text-slate-500',
      header: 'bg-white/80',
      input: 'bg-slate-50'
    },
    dark: { 
      bg: 'bg-[#05070A]', 
      primary: 'bg-[#2CBD6C]', 
      text: 'text-slate-100', 
      card: 'bg-[#161B22]', 
      border: 'border-slate-800/80', 
      accent: 'text-emerald-400', 
      muted: 'text-slate-400',
      header: 'bg-[#05070A]/80',
      input: 'bg-slate-900/50'
    }
  };

  const currentTheme = themes[resolvedTheme] || themes.light;
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([
    { role: 'model', parts: [{ text: "Halo! Saya Coach ScholarHub. Ada yang bisa saya bantu dengan strategi belajarmu hari ini?" }] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('sh_theme', newTheme);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = { role: 'user' as const, parts: [{ text: chatInput }] };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // Optimasi: Hanya kirim 10 pesan terakhir untuk menghemat token
      const recentMessages = chatMessages.slice(-9);
      const response = await getStudyCoachResponse([...recentMessages, userMsg]);
      setChatMessages(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', parts: [{ text: "Waduh, koneksi Coach lagi bermasalah. Tanya lagi bentar ya!" }] }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleCard = (idx: number) => {
    setFlippedCards(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden transition-colors duration-500 ${resolvedTheme === 'dark' ? 'dark' : ''} ${currentTheme.bg} ${currentTheme.text} font-sans selection:bg-emerald-100 selection:text-emerald-900`}>
      {/* Visual Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60"></div>
        <div className="absolute inset-0 bg-grid opacity-30"></div>
        <div className="absolute inset-0 bg-noise"></div>
        
        {/* Animated Blobs */}
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 120, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-sky-500/10 blur-[100px] rounded-full"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-emerald-400/5 blur-[150px] rounded-full"
        />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 ${currentTheme.header} backdrop-blur-md border-b ${currentTheme.border}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setStudyPack(null); setIsSidebarOpen(false); }}>
              <div className={`w-9 h-9 ${currentTheme.primary} rounded-xl flex items-center justify-center transition-all group-hover:rotate-12 group-hover:scale-110 shadow-lg shadow-emerald-500/20 cursor-pointer`}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl md:text-2xl tracking-tight font-display bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Sinau AI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-3">
              {user && (
                <div className="flex flex-col items-end mr-1">
                   <div className="flex items-center gap-1.5">
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">LVL {userProfile?.level || 1}</span>
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   </div>
                   <span className="text-[9px] font-bold text-slate-400 tracking-[0.1em]">{userProfile?.xp || 0} XP</span>
                </div>
              )}
              
              {user ? (
                <>
                  <button 
                   onClick={() => setActiveTab('stats')}
                   className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden border-2 border-emerald-500/20 hover:border-emerald-500 transition-all font-bold flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                    )}
                  </button>
                  <button 
                   onClick={logout}
                   className="p-1.5 md:p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </>
              ) : (
                <button 
                 onClick={loginWithGoogle}
                 className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Theme Switcher */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200 dark:border-white/5 backdrop-blur-md">
               {(['light', 'dark', 'system'] as const).map(t => (
                 <button 
                   key={t}
                   onClick={() => changeTheme(t)}
                   className={`p-1.5 sm:px-3 sm:py-1 rounded-full transition-all cursor-pointer flex items-center gap-2 ${
                     theme === t 
                       ? 'bg-emerald-600 text-white shadow-[0_2px_10px_rgba(5,150,105,0.3)] ring-1 ring-emerald-400/20' 
                       : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                   }`}
                   title={t.toUpperCase()}
                 >
                   {t === 'light' && <Sun className="w-3.5 h-3.5" />}
                   {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
                   {t === 'system' && <Monitor className="w-3.5 h-3.5" />}
                   <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{t}</span>
                 </button>
               ))}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 md:pb-20 flex flex-col lg:flex-row gap-6 md:gap-8 overflow-x-hidden">
        
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar Tools */}
        <aside className={`fixed lg:relative inset-y-0 left-0 w-80 lg:w-72 xl:w-80 space-y-6 shrink-0 z-50 lg:z-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform duration-300 lg:transition-none bg-white dark:bg-[#050B14] lg:bg-transparent p-6 lg:p-0 border-r lg:border-none ${currentTheme.border} overflow-y-auto custom-scrollbar`}>
          <div className="flex lg:hidden items-center justify-between mb-8">
            <span className="font-black text-xl tracking-tight text-emerald-500 uppercase">Library & Tools</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="contents space-y-6 pr-2">
            {userProfile && (
               <section className={`${currentTheme.card} p-6 rounded-3xl border ${currentTheme.border} shadow-sm overflow-hidden`}>
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Statistik Belajar</h3>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mastery XP</div>
                        <div className="text-sm font-black text-emerald-500">{userProfile.xp}</div>
                     </div>
                    <button 
                      onClick={() => {
                        setActiveTab('stats');
                        setStudyPack(null);
                        setIsSidebarOpen(false);
                      }}
                      className="w-full py-3 bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20 cursor-pointer"
                     >
                       Lihat Dashboard Lengkap
                     </button>
                  </div>
               </section>
            )}

            <section className={`${currentTheme.card} p-6 rounded-3xl border ${currentTheme.border} shadow-sm overflow-hidden`}>
              <div className="flex items-center gap-2 mb-4 px-1">
                <HistoryIcon className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Library Riwayat</h3>
              </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {history.length > 0 ? (
                    // Filter out duplicates by topic to keep it clean for the user
                    Array.from(new Map<string, StudyPack>(history.map(item => [item.topic, item])).values()).map((h) => (
                      <div key={h.id || h.topic} className="relative group/item px-1 py-0.5">
                        <button
                          onClick={() => {
                            setStudyPack(h);
                            setActiveTab('summary');
                            setUnlockedLevel(0);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl transition-all border animate-in fade-in slide-in-from-left-2 duration-300 pr-10 cursor-pointer ${
                            (h.id && studyPack?.id === h.id) || (!h.id && studyPack?.topic === h.topic)
                              ? resolvedTheme === 'dark' 
                                 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_5px_15px_rgba(0,0,0,0.2)]' 
                                 : 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                              : `bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${currentTheme.muted} border-transparent`
                          }`}
                        >
                          <div className="font-black text-[10px] uppercase tracking-wider truncate max-w-[150px]">{h.topic}</div>
                          <div className={`text-[9px] mt-0.5 font-bold opacity-60 uppercase tracking-widest ${(h.id && studyPack?.id === h.id) || (!h.id && studyPack?.topic === h.topic) ? 'text-emerald-500/80' : ''}`}>
                            {h.roadmap.length} Misi
                          </div>
                        </button>
                        <button 
                          onClick={(e) => deleteStudyPack(h.id || h.topic, e)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white text-slate-400 transition-all z-10 cursor-pointer"
                          title="Hapus materi"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                  <div className="text-xs text-slate-300 font-bold p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    Belum ada materi
                  </div>
                )}
              </div>
            </section>

            <section className={`${currentTheme.card} p-6 rounded-[2.5rem] border ${currentTheme.border} shadow-lg relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                <Sparkles className="w-32 h-32" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-1 flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-500" /> Study Companion
              </h3>
              <div className="space-y-4">
                <button 
                  onClick={() => { setIsChatOpen(!isChatOpen); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 p-4 ${resolvedTheme === 'dark' ? 'bg-[#1C2128] hover:bg-[#222831] border-white/5' : 'bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 transition-all'} border rounded-[1.75rem] transition-all text-left group relative overflow-hidden cursor-text`}
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:bg-emerald-500 group-hover:text-white shadow-sm">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className={`font-black text-sm tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors`}>Study Coach AI</div>
                    <div className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-0.5 group-hover:text-emerald-500/50 transition-colors">Digital Strategist</div>
                  </div>
                </button>

                <button 
                  onClick={() => { setIsHistoricalChatOpen(true); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 p-4 ${resolvedTheme === 'dark' ? 'bg-[#1C2128] hover:bg-[#222831] border-white/5 shadow-2xl shadow-indigo-900/10' : 'bg-indigo-50/50 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all'} border rounded-[1.75rem] transition-all text-left group relative overflow-hidden cursor-pointer`}
                >
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-indigo-500/5 rounded-full group-hover:scale-125 transition-transform duration-700" />
                  <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-indigo-500/20">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2">
                      <div className={`font-black text-sm tracking-tight ${resolvedTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-900'} group-hover:text-indigo-500 font-serif italic`}>Ajak Ngobrol Tokoh</div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">Dimensi Waktu</span>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section className={`${currentTheme.card} p-6 rounded-3xl border ${currentTheme.border} shadow-sm`}>
              <PomodoroTimer onComplete={handlePomodoroFinish} />
              <p className="mt-4 text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest">+100 XP SETIAP SESI SELESAI</p>
            </section>

            <footer className="px-6 py-8 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 text-center">
              Sinau AI // 2026 Edition
            </footer>
          </div>
        </aside>

        <section className="flex-1 w-full min-w-0">
          {/* Main Content Areas */}
          <AnimatePresence mode="wait">
            {activeTab === 'stats' ? (
              <motion.div 
                key="global-stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto mt-8"
              >
                <div className="flex items-center justify-between mb-8 px-4">
                   <h2 className="text-3xl font-black tracking-tight">Dashboard Belajar</h2>
                   <button 
                    onClick={() => {
                      setStudyPack(null);
                      setActiveTab('summary');
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-600 flex items-center gap-2"
                   >
                     <PlusCircle className="w-4 h-4" /> Mulai Topik Baru
                   </button>
                </div>
                <StudyAnalytics 
                  xp={userProfile?.xp || 0}
                  level={userProfile?.level || 1}
                  studyTimeSeconds={(userProfile?.studyTimeSeconds || 0) + sessionSeconds}
                  dailyStreak={userProfile?.dailyStreak || 1}
                />
              </motion.div>
             ) : !studyPack ? (
              <>
                <motion.div 
                   key="landing"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="max-w-2xl mx-auto mt-12 text-center"
              >
                 <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1]">
                  Upgrade cara belajarmu dengan <span className="text-emerald-500 bg-clip-text">Sinau AI.</span>
                </h1>
                <p className="text-slate-500 md:text-xl mb-12 max-w-lg mx-auto font-medium leading-relaxed">
                  Platform belajar gamified berbasis AI—pilih topik, kuasai roadmap, dan kumpulin XP.
                </p>
                
                <div className="relative group max-w-lg mx-auto space-y-4">
                  <FileUpload 
                    onFileSelect={setSelectedFile} 
                    selectedFile={selectedFile} 
                    onClear={() => setSelectedFile(null)} 
                  />
                  
                  <div className="relative">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200`}></div>
                      <div className={`relative ${currentTheme.card} rounded-2xl flex items-center p-2 border ${currentTheme.border} shadow-sm overflow-hidden cursor-text`}>
                        {loading && (
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "0%" }}
                            transition={{ duration: 15, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-1 bg-emerald-500 z-20"
                            style={{ width: "100%" }}
                          />
                        )}
                        <div className="pl-4 text-emerald-500">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        </div>
                        <input 
                          type="text" 
                          value={topic}
                          onChange={(e) => {
                            setTopic(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => topic.length > 1 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (suggestionIdx >= 0) {
                                setTopic(filteredSuggestions[suggestionIdx]);
                                setShowSuggestions(false);
                              } else {
                                handleGenerate();
                              }
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setSuggestionIdx(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setSuggestionIdx(prev => Math.max(prev - 1, -1));
                            } else if (e.key === 'Escape') {
                              setShowSuggestions(false);
                            }
                          }}
                          placeholder={loading ? loadingStatus : (topic ? (selectedFile ? "Kasih instruksi tambahan (opsional)..." : "Ketik topik belajar lo...") : placeholderText)}
                          disabled={loading}
                          className={`w-full h-12 px-4 outline-none ${currentTheme.text} font-medium bg-transparent disabled:opacity-50`}
                        />
                        <button 
                          onClick={handleGenerate}
                          disabled={loading || (!topic.trim() && !selectedFile)}
                          className={`h-12 px-6 ${currentTheme.primary} text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                        >
                          {loading ? null : <Sparkles className="w-4 h-4" />}
                          {loading ? "Meracik..." : "Racik"}
                        </button>
                      </div>

                      <AnimatePresence>
                        {showSuggestions && filteredSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute top-full left-0 right-0 mt-2 ${currentTheme.card} ${currentTheme.border} border rounded-2xl shadow-xl z-50 overflow-hidden`}
                          >
                            {filteredSuggestions.map((s, i) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setTopic(s);
                                  setShowSuggestions(false);
                                }}
                                onMouseEnter={() => setSuggestionIdx(i)}
                                className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${
                                  suggestionIdx === i 
                                    ? (resolvedTheme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                                    : (resolvedTheme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')
                                }`}
                              >
                                <Search className="w-4 h-4 opacity-40" />
                                {s}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {loading && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse text-center"
                        >
                          {loadingStatus}
                        </motion.div>
                      )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                 key="landing-features"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.4 }}
                 className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 md:mt-32 max-w-5xl mx-auto px-4 pb-20"
              >
                {[
                  { icon: Brain, title: "Visual Mindmap", desc: "Lihat kaitan antar konsep secara visual. Gak cuma teks, tapi peta pikiran otomatis.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { icon: MapIcon, title: "Misi Roadmap", desc: "Belajar jadi misi yang harus lo selesein. Buka level demi level buat kuasai topik.", color: "text-sky-500", bg: "bg-sky-500/10" },
                  { icon: Target, title: "Arena Kuis", desc: "Uji mental lo di arena kuis. Kumpulin XP dan buktiin kalo lo udah beneran paham.", color: "text-amber-500", bg: "bg-amber-500/10" }
                ].map((f, i) => (
                  <div key={i} className={`${currentTheme.card} p-8 rounded-[2.5rem] border ${currentTheme.border} relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
                    <div className={`absolute -right-4 -top-4 w-32 h-32 ${f.bg} blur-3xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                    <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform`}>
                      <f.icon className={`w-7 h-7 ${f.color}`} />
                    </div>
                    <h3 className="text-xl font-black mb-3 tracking-tight">{f.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium">{f.desc}</p>
                  </div>
                ))}
              </motion.div>
            </>
            ) : (
              <motion.div 
                key={studyPack.id || 'study-pack-viewer'}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Result Display */}
                {/* Main Result Card */}
                <div className={`${currentTheme.card} rounded-3xl border ${currentTheme.border} overflow-hidden shadow-sm`}>
                <div className={`p-4 md:p-8 border-b ${currentTheme.border} flex flex-col md:flex-row md:items-end justify-between gap-6`}>
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Generasi Berhasil</span>
                      </div>
                      <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all"
                      >
                        <Download className="w-3 h-3" /> Export Note
                      </button>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight capitalize leading-tight">{studyPack.topic}</h2>
                  </div>
                  
                  <div className={`grid grid-cols-5 items-center ${resolvedTheme === 'dark' ? 'bg-[#050B14]' : 'bg-slate-100'} p-1.5 rounded-3xl border ${currentTheme.border} w-full xl:w-auto xl:min-w-[550px]`}>
                    {[
                      { id: 'summary', icon: Layers, label: 'Note' },
                      { id: 'mindmap', icon: Brain, label: 'Visual' },
                      { id: 'roadmap', icon: MapIcon, label: 'Path' },
                      { id: 'flashcards', icon: BookOpen, label: 'Flash' },
                      { id: 'quiz', icon: HelpCircle, label: 'Arena' }
                    ].map(tab => (
                      <button 
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`flex flex-col items-center justify-center gap-1.5 px-1 py-3 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer group relative overflow-hidden ${
                           activeTab === tab.id 
                             ? 'bg-emerald-500 text-white shadow-[0_5px_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/20' 
                             : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                         }`}
                       >
                        <tab.icon className={`w-3.5 h-3.5 shrink-0 ${activeTab === tab.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                        <span className="hidden xs:inline">{tab.label}</span>
                        {activeTab === tab.id && (
                          <motion.div 
                            layoutId="activeTabGlow"
                            className="absolute -bottom-4 w-12 h-8 bg-white/20 blur-xl"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 md:p-8">
                    <AnimatePresence mode="wait">
                      {activeTab === 'roadmap' ? (
                        <motion.div 
                          key="roadmap"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-12"
                        >
                          {/* Mission Briefing Header */}
                          <div className={`${resolvedTheme === 'dark' ? 'bg-[#0D3167]' : 'bg-slate-900'} text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group`}>
                             <div className="absolute -right-8 -bottom-8 opacity-10 transform group-hover:scale-125 transition-transform duration-1000">
                                <MapIcon className="w-64 h-64" />
                             </div>
                             <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                   <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                                      <Sparkles className="w-5 h-5 text-white" />
                                   </div>
                                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Mission Briefing</span>
                                </div>
                                <h3 className="text-3xl font-bold tracking-tighter mb-4">Misi Penguasaan: {studyPack.topic}</h3>
                                <p className="text-white/60 text-sm leading-relaxed max-w-2xl font-medium italic">
                                  "{studyPack.detailedExplanation.split('\n')[0]}"
                                </p>
                                <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center">
                                   <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                         <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mission Progress</div>
                                         <div className="text-[10px] font-bold text-emerald-400">{Math.round((unlockedLevel / studyPack.roadmap.length) * 100)}%</div>
                                      </div>
                                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                         <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(unlockedLevel / studyPack.roadmap.length) * 100}%` }}
                                            className={`h-full ${currentTheme.primary}`}
                                         />
                                      </div>
                                   </div>
                                   <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Rewards</div>
                                      <div className="text-xs font-bold flex items-center gap-2">
                                         <Trophy className="w-3 h-3 text-amber-400" /> +500 Rank XP
                                      </div>
                                   </div>
                                   <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Level Unlocked</div>
                                      <div className="text-xs font-bold flex items-center gap-2">
                                         <Target className="w-3 h-3 text-sky-400" /> Stage {unlockedLevel + 1}
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                            {studyPack.roadmap.map((step, i) => {
                              const isLocked = i > unlockedLevel;
                              const isCompleted = i < unlockedLevel;
                              const isActive = i === unlockedLevel;

                              return (
                                  <motion.div 
                                  key={`roadmap-step-${i}`} 
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className={`flex gap-8 relative group ${isLocked ? 'cursor-not-allowed grayscale-[0.8] opacity-60' : 'cursor-pointer'}`}
                                  onClick={() => !isLocked && setSelectedStepIdx(i)}
                                >
                                  <div className="flex flex-col items-center shrink-0">
                                     <div className="relative">
                                        <motion.div 
                                          whileHover={!isLocked ? { scale: 1.1, rotate: 5 } : {}}
                                          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg z-10 transition-all border-2 shadow-sm ${
                                            isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' : 
                                            isActive ? 'bg-sky-50 border-sky-500 text-sky-600 ring-4 ring-sky-50' : 
                                            isLocked ? 'bg-slate-100 border-slate-200 text-slate-300' :
                                            'bg-white border-slate-200 text-slate-400'
                                          }`}
                                        >
                                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : 
                                           i === studyPack.roadmap.length - 1 ? <Trophy className="w-6 h-6" /> : 
                                           i + 1}
                                        </motion.div>
                                        {!isLocked && <div className="absolute inset-0 bg-sky-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />}
                                     </div>
                                     {i < studyPack.roadmap.length - 1 && (
                                       <div className="w-1 h-full bg-slate-100 my-2 rounded-full relative overflow-hidden">
                                            <motion.div 
                                              initial={{ height: 0 }}
                                              animate={{ height: isCompleted ? '100%' : '0%' }}
                                              transition={{ duration: 1 }}
                                              className="absolute top-0 w-full bg-gradient-to-b from-emerald-400 to-sky-400"
                                            />
                                         </div>
                                       )}
                                    </div>
                                  <div className="pb-12 pt-2 flex-1">
                                     <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <h4 className={`font-black text-2xl md:text-3xl tracking-tight leading-tight ${isLocked ? 'text-slate-400' : `${currentTheme.text} group-hover:${currentTheme.accent}`}`}>
                                          {step.step}
                                          {isLocked && <span className="ml-2 text-sm opacity-50">🔒</span>}
                                        </h4>
                                        <div className="flex gap-2">
                                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                            isActive ? 'bg-sky-500/10 border-sky-500/20 text-sky-600' : 
                                            isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                            'bg-slate-100 border-slate-200 text-slate-400'
                                          }`}>
                                            {isCompleted ? 'Completed' : isActive ? 'Next Mission' : 'Locked'}
                                          </span>
                                        </div>
                                     </div>
                                     <div className={`${currentTheme.card} ${resolvedTheme === 'dark' ? 'bg-gradient-to-br from-[#0A2E63]/90 to-[#0A1221]/90 hover:from-[#123E7D]/90 hover:to-[#0A1221]/95 border-sky-900/40 shadow-[0_10px_30px_rgba(0,0,0,0.3)]' : 'hover:bg-slate-50 transition-all shadow-sm group-hover:shadow-md'} backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border ${currentTheme.border} relative overflow-hidden group/card`}>
                                        <p className={`text-lg md:text-xl font-medium relative z-10 leading-relaxed ${isLocked ? (resolvedTheme === 'dark' ? 'text-slate-700' : 'text-slate-300') : (resolvedTheme === 'dark' ? 'text-emerald-50/90' : 'text-slate-600')}`}>
                                          {step.description}
                                        </p>
                                        {!isLocked && (
                                          <div className={`mt-6 flex items-center justify-between border-t ${resolvedTheme === 'dark' ? 'border-white/5' : 'border-slate-100'} pt-6`}>
                                             <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5">
                                                   <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-slate-200'}`} />
                                                   {isActive ? 'KLIK UNTUK BELAJAR' : 'DAPAT DIREVIEW'}
                                                </div>
                                             </div>
                                             <ChevronRight className={`w-5 h-5 transition-transform group-hover/card:translate-x-1 ${isActive ? 'text-emerald-400' : 'text-slate-300'}`} />
                                          </div>
                                        )}
                                     </div>
                                  </div>
                                  </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ) : activeTab === 'summary' ? (
                        <motion.div 
                          key="summary"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="space-y-8"
                        >
                           {/* Detailed Explanation Section */}
                           <div className={`p-6 md:p-10 ${currentTheme.card} border ${currentTheme.border} rounded-[2.5rem] shadow-sm`}>
                              <div className="flex items-center gap-3 mb-6">
                                 <div className={`w-10 h-10 ${resolvedTheme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-50 text-indigo-600'} rounded-xl flex items-center justify-center`}>
                                    <BookOpen className="w-5 h-5" />
                                 </div>
                                 <h3 className="text-2xl font-bold tracking-tight">Penjelasan Detail</h3>
                              </div>
                              <div className="prose prose-slate max-w-none">
                                 {studyPack.detailedExplanation.split('\n\n').map((para, i) => (
                                   <p key={`para-${i}`} className={`${resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'} text-xl leading-relaxed font-normal mb-8`}>{para}</p>
                                 ))}
                              </div>
                            </div>

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className={`md:col-span-3 p-6 md:p-10 ${resolvedTheme === 'dark' ? 'bg-[#0E1B31]' : 'bg-emerald-50'} border ${resolvedTheme === 'dark' ? 'border-[#1E3A5F]' : 'border-emerald-500/10'} rounded-[2.5rem] relative overflow-hidden group shadow-sm`}>
                                <div className={`absolute top-0 right-0 p-8 ${resolvedTheme === 'dark' ? 'text-emerald-500/10' : 'text-emerald-200/50'} transform translate-x-1/4 -translate-y-1/4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000`}>
                                   <Sparkles className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                   <div className="flex items-center gap-3 mb-4">
                                      <div className={`w-10 h-10 ${currentTheme.card} ${currentTheme.border} border shadow-sm rounded-xl flex items-center justify-center`}>
                                         <Lightbulb className={`w-5 h-5 ${currentTheme.accent}`} />
                                      </div>
                                      <h4 className={`font-bold ${resolvedTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-900'} text-lg`}>ELI5 Strategy</h4>
                                   </div>
                                   <p className={`${resolvedTheme === 'dark' ? 'text-slate-200' : 'text-emerald-900/70'} text-xl leading-relaxed font-medium italic max-w-3xl`}>
                                     "{studyPack.eli5}"
                                   </p>
                                </div>
                             </div>
                            {studyPack.summary.map((card, i) => (
                              <div key={`summary-${i}`} className={`p-6 md:p-8 rounded-[2rem] border transition-all hover:shadow-xl hover:-translate-y-1 ${
                                i % 3 === 0 
                                  ? `${currentTheme.card} ${currentTheme.border} ${resolvedTheme === 'dark' ? 'shadow-emerald-500/5' : ''} md:col-span-2` 
                                  : `bg-emerald-900 border-emerald-800 text-white`
                              }`}>
                                <div className="flex items-center justify-between mb-6">
                                   <h4 className={`font-bold text-xl tracking-tight ${i % 3 === 0 ? currentTheme.text : 'text-white'}`}>{card.title}</h4>
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i % 3 === 0 ? (resolvedTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500') : 'bg-white/10 text-white/50'}`}>
                                      {i % 2 === 0 ? <Layers className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                   </div>
                                </div>
                                <p className={`text-base leading-relaxed font-medium ${i % 3 === 0 ? (resolvedTheme === 'dark' ? 'text-slate-300' : currentTheme.muted) : 'text-emerald-100/70'}`}>{card.content}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : activeTab === 'mindmap' && studyPack.mindMapNodes ? (
                        <motion.div
                          key="mindmap"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-4"
                        >
                           <div className="flex items-center justify-between px-2">
                             <div>
                               <h3 className="text-xl font-bold">Visual Mind Map</h3>
                               <p className="text-xs text-slate-400 font-medium">Representasi visual konsep belajar lo</p>
                             </div>
                             <div className="flex gap-2">
                                <span className="px-3 py-1 bg-sky-500/10 text-sky-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                                  {studyPack.mindMapNodes.length} Nodes
                                </span>
                             </div>
                           </div>
                           <div className="w-full overflow-hidden flex justify-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
  <MindMap 
                          nodes={studyPack.mindMapNodes} 
                          edges={studyPack.mindMapEdges || []} 
                          theme={resolvedTheme as 'light' | 'dark'}
                        />
</div>
                        </motion.div>
                      ) : activeTab === 'flashcards' ? (
                        <motion.div 
                          key="flashcards"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          <div className="flex justify-between items-center px-4">
                             <div>
                                <h3 className="text-2xl font-bold tracking-tight">Active Recall Arena</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Spaced Repetition System (SRS) Active</p>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</span>
                                   <span className="text-sm font-black text-emerald-500">
                                      {studyPack.flashcards.filter((c: any) => (c.mastery || 0) >= 3).length}/{studyPack.flashcards.length}
                                   </span>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {studyPack.flashcards.map((card, i) => (
                               <div key={`flashcard-${i}`} className="flex flex-col gap-4">
                                 <div 
                                  onClick={() => toggleCard(i)}
                                  className={`h-64 cursor-pointer perspective-1000 group relative`}
                                 >
                                    <motion.div 
                                      initial={false}
                                      animate={{ rotateY: flippedCards.includes(i) ? 180 : 0 }}
                                      transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                      className="w-full h-full relative transform-style-3d shadow-xl rounded-[2.5rem]"
                                    >
                                      {/* Front */}
                                      <div className={`absolute inset-0 backface-hidden ${currentTheme.card} border-2 ${flippedCards.includes(i) ? 'border-emerald-500' : currentTheme.border} rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center`}
                                           style={{ transform: 'rotateY(0deg)' }}>
                                         <div className="absolute top-6 left-8 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getMasteryColor(card.mastery || 0)}`} />
                                            <span className={`text-[10px] font-black ${resolvedTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-[0.2em]`}>Konsep #${i+1}</span>
                                         </div>
                                         <div className={`text-2xl font-black tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'} italic leading-relaxed px-4`}>"{card.front}"</div>
                                         <div className={`absolute bottom-6 flex items-center gap-2 text-[10px] font-black ${resolvedTheme === 'dark' ? 'text-emerald-500/40' : 'text-emerald-600/70'} uppercase tracking-widest animate-pulse`}>
                                            <RotateCcw className="w-3.5 h-3.5" /> Klik buat Intip
                                         </div>
                                      </div>
                                      
                                      {/* Back */}
                                      <div 
                                        className={`absolute inset-0 backface-hidden ${resolvedTheme === 'dark' ? 'bg-slate-900 border-emerald-500 text-emerald-50' : 'bg-emerald-900 border-emerald-800 text-white'} border-2 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar cursor-pointer`}
                                        style={{ transform: 'rotateY(180deg)' }}
                                      >
                                         <div className={`absolute top-6 left-8 text-[10px] font-black ${resolvedTheme === 'dark' ? 'text-emerald-500/50' : 'text-emerald-100/50'} uppercase tracking-[0.2em]`}>Penjelasan</div>
                                         <p className="text-lg font-medium leading-relaxed">{card.back}</p>
                                      </div>
                                    </motion.div>
                                 </div>

                                 <div className={`h-12 min-h-[48px] ${resolvedTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                   <AnimatePresence>
                                     {flippedCards.includes(i) && (
                                       <motion.div 
                                         initial={{ opacity: 0, scale: 0.95 }}
                                         animate={{ opacity: 1, scale: 1 }}
                                         exit={{ opacity: 0, scale: 0.95 }}
                                         className="flex gap-2 px-2"
                                       >
                                          {[
                                            { l: 'Hard', v: 1, c: 'bg-rose-500' },
                                            { l: 'Okay', v: 3, c: 'bg-amber-500' },
                                            { l: 'Good', v: 4, c: 'bg-sky-500' },
                                            { l: 'Easy', v: 5, c: 'bg-emerald-500' }
                                          ].map(btn => (
                                            <button 
                                              key={btn.l}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleFlashcardReview(i, btn.v);
                                              }}
                                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:brightness-110 active:scale-95 transition-all shadow-md ${btn.c}`}
                                            >
                                              {btn.l}
                                            </button>
                                          ))}
                                       </motion.div>
                                     )}
                                   </AnimatePresence>
                                 </div>
                               </div>
                             ))}
                          </div>
                        </motion.div>
                      ) : activeTab === 'quiz' ? (
                        <motion.div 
                          key="quiz"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="max-w-xl mx-auto"
                        >
                           {studyPack.quiz.length > 0 ? (
                             <InteractiveQuiz questions={studyPack.quiz} onComplete={(score) => addXP(score * 20)} />
                           ) : (
                             <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                               Kuis sedang diracik...
                             </div>
                           )}
                        </motion.div>
                      ) : activeTab === 'stats' ? (
                        <motion.div 
                         key="stats"
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="max-w-2xl mx-auto"
                        >
                          <StudyAnalytics 
                             xp={userProfile?.xp || 0}
                             level={userProfile?.level || 1}
                             studyTimeSeconds={(userProfile?.studyTimeSeconds || 0) + sessionSeconds}
                             dailyStreak={userProfile?.dailyStreak || 1}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                </div>
              </div>

              {/* Back to Home Button */}
              <button 
                onClick={() => setStudyPack(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors pl-8 px-4 py-2 border-l border-slate-200"
              >
                Cari Topik Lain <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
          </AnimatePresence>
        </section>
      </main>

      {/* Floating Chatbot UI */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] ${currentTheme.card} border ${currentTheme.border} rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden`}
          >
            <div className={`p-4 border-b ${currentTheme.border} flex items-center justify-between ${resolvedTheme === 'dark' ? 'bg-slate-900' : 'bg-emerald-900'} text-white`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs">Study Coach AI</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                    <span className="text-[9px] font-bold text-white/50 tracking-wide">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${resolvedTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
              {chatMessages.map((m, i) => (
                <div key={`msg-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-emerald-600 text-white font-medium rounded-tr-none' 
                      : `${currentTheme.card} border ${currentTheme.border} ${currentTheme.text} rounded-tl-none`
                  }`}>
                    {m.parts[0].text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className={`${currentTheme.card} border ${currentTheme.border} p-4 rounded-2xl rounded-tl-none flex gap-1`}>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={`p-4 ${currentTheme.card} border-t ${currentTheme.border}`}>
               <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Tanya tips belajar cara teknik Feynman..."
                    className={`flex-1 px-4 py-3 ${currentTheme.input} outline-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                 />
                 <button 
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className={`w-10 h-10 ${currentTheme.primary} text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50`}
                 >
                    {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 </button>
               </div>
               <div className="mt-3 flex justify-center">
                  <p className={`text-[9px] ${currentTheme.muted} font-bold uppercase tracking-widest`}>Powered by Gemini AI</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoricalChatOpen && (
          <HistoricalChat onClose={() => setIsHistoricalChatOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStepIdx !== null && studyPack && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedStepIdx(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`${currentTheme.card} w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]`}
              onClick={e => e.stopPropagation()}
            >
              <div className={`p-8 bg-emerald-600 dark:bg-emerald-800 text-white flex justify-between items-center`}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Modul Belajar - Step {selectedStepIdx + 1}</span>
                    <h3 className="text-2xl font-bold">{studyPack.roadmap[selectedStepIdx].step}</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStepIdx(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-95"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
              </div>
              <div className={`p-8 overflow-y-auto space-y-6 ${currentTheme.card}`}>
                  <div className="prose prose-emerald max-w-none">
                    {studyPack.roadmap[selectedStepIdx].content.split('\n\n').map((p, i) => (
                      <p key={`roadmap-content-${i}`} className={`${currentTheme.text} opacity-80 leading-relaxed font-medium text-lg`}>{p}</p>
                    ))}
                  </div>
                  
                  <div className={`p-6 ${resolvedTheme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'} border border-emerald-100 dark:border-emerald-900/30 rounded-3xl`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Key Takeaway</span>
                    </div>
                    <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-emerald-100' : 'text-emerald-900'} font-medium`}>
                      Setelah memahami bagian ini, lo udah satu langkah lebih dekat buat jadi master di topik {studyPack.topic}!
                    </p>
                  </div>
              </div>
              <div className={`p-8 border-t ${currentTheme.border} ${currentTheme.card} flex gap-4`}>
                  <button 
                    onClick={async () => {
                      if (selectedStepIdx !== null && selectedStepIdx === unlockedLevel) {
                        const nextLevel = unlockedLevel + 1;
                        setUnlockedLevel(nextLevel);
                        addXP(30); 
                        if (user && (studyPack as any).id) {
                          await updateDoc(doc(db, 'studyPacks', (studyPack as any).id), {
                            unlockedLevel: nextLevel
                          });
                        }
                      }
                      setSelectedStepIdx(null);
                    }}
                    className={`flex-1 py-4 ${currentTheme.primary} text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" /> Tandai Selesai & Lanjut
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS for flip card */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { 
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden; 
        }
        .transform-style-3d { 
          transform-style: preserve-3d; 
          -webkit-transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}

