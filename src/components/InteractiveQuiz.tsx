import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy, Target, Star } from 'lucide-react';

interface QuizProps {
  questions: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  onComplete?: (score: number) => void;
}

export default function InteractiveQuiz({ questions, onComplete }: QuizProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOpt(idx);
    setIsAnswered(true);
    if (idx === questions[currentIdx].answer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOpt(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
      if (onComplete) onComplete(score);
    }
  };

  const resetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    let feedback = "Terus berjuang! Belajar lagi yuk.";
    let ColorClass = "text-rose-500";
    if (percentage >= 80) {
      feedback = "Luar Biasa! Kamu menguasai topik ini.";
      ColorClass = "text-emerald-500";
    } else if (percentage >= 50) {
      feedback = "Bagus! Dikit lagi perfect nih.";
      ColorClass = "text-sky-500";
    }

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#050B14] p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 dark:border-white/5 text-center shadow-2xl space-y-10"
      >
        <div className="relative inline-block">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-100 dark:border-white/5 shadow-xl">
            {percentage >= 80 ? <Trophy className="w-10 h-10 md:w-14 md:h-14 text-emerald-500" /> : <Target className="w-10 h-10 md:w-14 md:h-14 text-sky-400" />}
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="absolute top-0 right-0 bg-white dark:bg-[#050B14] shadow-lg rounded-full p-2 border border-slate-100 dark:border-white/5 text-amber-500"
          >
            <Star className="w-5 h-5 fill-current" />
          </motion.div>
        </div>

        <div>
          <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-4 dark:text-white font-display uppercase">Quiz Selesai!</h3>
          <p className={`${ColorClass} font-black text-lg md:text-xl uppercase tracking-widest`}>{feedback}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Score</div>
            <div className="text-3xl md:text-4xl font-black dark:text-white font-display text-emerald-500">{percentage}%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Benar</div>
            <div className="text-3xl md:text-4xl font-black dark:text-white font-display text-sky-500">{score}/{questions.length}</div>
          </div>
        </div>

        <button 
          onClick={resetQuiz}
          className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" /> Ulangi Arena Kuis
        </button>
      </motion.div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="bg-white dark:bg-[#050B14] p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl transition-colors">
      <div className="flex justify-between items-center mb-10">
        <div>
          <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.25em] bg-emerald-500/10 dark:bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/20">
            Modul Evaluasi
          </span>
          <h4 className="text-[10px] font-black text-slate-400 mt-4 tracking-[0.2em] uppercase">PERTANYAAN {currentIdx + 1} DARI {questions.length}</h4>
        </div>
        <div className="w-16 h-16 md:w-20 md:h-20 relative">
             <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-900"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="175.8"
                  strokeDashoffset={175.8 - (175.8 * ((currentIdx + 1) / questions.length))}
                  className="text-emerald-500 transition-all duration-700"
                />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900 dark:text-white">
                {Math.round(((currentIdx + 1) / questions.length) * 100)}%
             </div>
        </div>
      </div>

      <h3 className="text-2xl md:text-3xl font-black mb-10 md:mb-12 text-slate-900 dark:text-white leading-[1.2] font-display">{q.question}</h3>

      <div className="space-y-4 mb-10 md:mb-12">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const isSelected = i === selectedOpt;
          
          let borderColor = "border-slate-100 dark:border-white/5";
          let bgColor = "hover:bg-slate-50 dark:hover:bg-slate-900/50";
          let icon = null;

          if (isAnswered) {
            if (isCorrect) {
              borderColor = "border-emerald-500 ring-4 ring-emerald-500/10";
              bgColor = "bg-emerald-500/5 dark:bg-emerald-500/10";
              icon = <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-auto" />;
            } else if (isSelected) {
              borderColor = "border-rose-500 ring-4 ring-rose-500/10";
              bgColor = "bg-rose-500/5 dark:bg-rose-500/10";
              icon = <XCircle className="w-6 h-6 text-rose-500 ml-auto" />;
            }
          }

          return (
            <button
              key={`opt-${i}`}
              onClick={() => handleOptionClick(i)}
              disabled={isAnswered}
              className={`w-full flex items-center text-left p-6 border-2 rounded-2xl transition-all font-bold group cursor-pointer disabled:cursor-default ${borderColor} ${bgColor} ${isSelected && !isAnswered ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-4 ring-emerald-500/10' : ''}`}
            >
              <div className={`w-12 h-12 flex items-center justify-center border rounded-xl mr-6 text-sm font-black transition-all shadow-sm shrink-0 ${isSelected || (isAnswered && isCorrect) ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-white/10'}`}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="flex-1 text-lg font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{opt}</span>
              {icon}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="p-8 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-[2.5rem]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Analisis Poin Materi</span>
              </div>
              <p className="text-lg text-slate-600 dark:text-gray-400 leading-relaxed font-medium italic opacity-90">"{q.explanation}"</p>
            </div>
            
            <button 
              onClick={nextQuestion}
              className="w-full flex items-center justify-center gap-3 py-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 transition-all font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 group cursor-pointer"
            >
              {currentIdx < questions.length - 1 ? 'Misi Berikutnya' : 'Selesaikan Arena'} 
              <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
