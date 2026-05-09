import { motion } from 'motion/react';
import { Trophy, Zap, Target, Clock, TrendingUp } from 'lucide-react';

interface StatsProps {
  xp: number;
  level: number;
  studyTimeSeconds: number;
  dailyStreak: number;
}

export default function StudyAnalytics({ xp, level, studyTimeSeconds, dailyStreak }: StatsProps) {
  const nextLevelXp = (level + 1) * 1000;
  const progress = (xp % 1000) / 1000 * 100;

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Level & XP card */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute -right-8 -top-8 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
          <Trophy className="w-40 h-40" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pangkat Scholar</span>
              <h3 className="text-2xl font-black text-white tracking-tighter">Level {level}</h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">{xp} / {nextLevelXp} XP</span>
            </div>
          </div>
          
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">Bantu dirimu naik level dengan menyelesaikan sesi fokus & kuis!</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Study Time</span>
          </div>
          <div className="text-2xl font-black text-white">{formatTime(studyTimeSeconds)}</div>
        </div>
        
        <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Streak</span>
          </div>
          <div className="text-2xl font-black text-white">{dailyStreak} Days</div>
        </div>
      </div>
    </div>
  );
}
