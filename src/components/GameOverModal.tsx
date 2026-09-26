import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Trophy, Skull, Flame, Sparkles } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface GameOverModalProps {
  isOpen: boolean;
  reason: string;
  stats: {
    score: number;
    distance: number;
    coins: number;
    gems: number;
    fusions: number;
  };
  highScore: number;
  maxDistance: number;
  isNewRecord: boolean;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  reason,
  stats,
  highScore,
  maxDistance,
  isNewRecord,
  onRestart,
  onHome,
}) => {
  useEffect(() => {
    if (isOpen && isNewRecord) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ec4899', '#38bdf8', '#10b981'],
      });
    }
  }, [isOpen, isNewRecord]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-2xl text-center">
        {/* Skull / Danger emblem */}
        <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/80 mx-auto flex items-center justify-center text-rose-400 mb-3 shadow-inner">
          <Skull className="w-7 h-7" />
        </div>

        {/* Title & Death Cause */}
        <h2 className="text-2xl font-cinzel font-black tracking-wider text-rose-400 uppercase">
          Expedition Terminated
        </h2>
        <p className="text-xs text-stone-300 mt-1.5 px-4 leading-relaxed font-medium">
          "{reason}"
        </p>

        {/* New Record Banner */}
        {isNewRecord && (
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-cinzel font-bold">
            <Trophy className="w-3.5 h-3.5" />
            NEW EXPEDITION RECORD!
          </div>
        )}

        {/* Run Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 text-left">
          {/* Final Score */}
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[11px] font-cinzel text-stone-400 uppercase block">Final Score</span>
            <span className="text-lg font-mono-numbers font-bold text-amber-300">
              {stats.score.toLocaleString()}
            </span>
          </div>

          {/* Distance Ran */}
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[11px] font-cinzel text-stone-400 uppercase block">Distance Traversed</span>
            <span className="text-lg font-mono-numbers font-bold text-amber-200">
              {stats.distance.toLocaleString()} <span className="text-xs text-stone-400 font-normal">meters</span>
            </span>
          </div>

          {/* Gold Coins Collected */}
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[11px] font-cinzel text-stone-400 uppercase block">Loot Recovered</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono-numbers font-bold text-amber-400 text-base">
                {stats.coins.toLocaleString()} ✦
              </span>
              {stats.gems > 0 && (
                <span className="font-mono-numbers font-bold text-rose-400 text-sm">
                  +{stats.gems} ♦
                </span>
              )}
            </div>
          </div>

          {/* Relic Fusions */}
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[11px] font-cinzel text-stone-400 uppercase block">Relic Fusions</span>
            <span className="text-lg font-mono-numbers font-bold text-purple-300">
              {stats.fusions} <span className="text-xs text-stone-400 font-normal">synergies</span>
            </span>
          </div>
        </div>

        {/* Personal Records row */}
        <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-lg bg-stone-950/40 text-xs text-stone-400 border border-stone-800/60 font-mono-numbers">
          <span>High Score: <strong className="text-stone-200">{highScore.toLocaleString()}</strong></span>
          <span>Max Distance: <strong className="text-stone-200">{maxDistance.toLocaleString()}m</strong></span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => {
              sound.playMenuClick();
              onHome();
            }}
            className="flex-1 py-3 px-4 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            CAMP
          </button>

          <button
            onClick={() => {
              sound.playMenuClick();
              onRestart();
            }}
            className="flex-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            RUN AGAIN
          </button>
        </div>
      </div>
    </div>
  );
};
