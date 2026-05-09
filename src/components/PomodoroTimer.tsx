import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PomodoroProps {
  onComplete?: (type: 'pomodoro' | 'break') => void;
}

export default function PomodoroTimer({ onComplete }: PomodoroProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      const finishedType = isBreak ? 'break' : 'pomodoro';
      if (onComplete) onComplete(finishedType);
      
      const nextIsBreak = !isBreak;
      setIsBreak(nextIsBreak);
      setTimeLeft(nextIsBreak ? 5 * 60 : 25 * 60);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, onComplete]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak ? (timeLeft / (5 * 60)) * 100 : (timeLeft / (25 * 60)) * 100;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 h-1 bg-sky-500 transition-all duration-1000" style={{ width: `${100 - progress}%` }} />
      
      <div className="flex items-center gap-3 mb-4">
        {isBreak ? <Coffee className="w-5 h-5 text-emerald-400" /> : <Brain className="w-5 h-5 text-sky-400" />}
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">
          {isBreak ? 'Istirahat' : 'Fokus Belajar'}
        </span>
      </div>

      <div className="text-4xl font-mono font-medium mb-6 tracking-tighter">
        {formatTime(timeLeft)}
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          className={`flex-1 flex items-center justify-center h-10 rounded-lg transition-all cursor-pointer ${
            isActive ? 'bg-slate-800 hover:bg-slate-700' : 'bg-sky-600 hover:bg-sky-500'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={resetTimer}
          className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
