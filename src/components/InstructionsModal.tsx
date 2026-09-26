import React from 'react';
import { X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Sparkles, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h2 className="text-xl font-cinzel font-bold text-amber-300 tracking-wide">
              Expedition Guide & Controls
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Master the ancient temple mechanics to outrun the Monolith.
            </p>
          </div>
          <button
            onClick={() => {
              sound.playMenuClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-center">
            <span className="text-xs font-mono font-bold text-amber-400 block mb-1">A / ← or Swipe</span>
            <span className="text-[11px] font-cinzel text-stone-300 font-semibold block">Turn / Lane Left</span>
            <span className="text-[10px] text-stone-500">Switch lane or pivot 90°</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-center">
            <span className="text-xs font-mono font-bold text-amber-400 block mb-1">D / → or Swipe</span>
            <span className="text-[11px] font-cinzel text-stone-300 font-semibold block">Turn / Lane Right</span>
            <span className="text-[10px] text-stone-500">Switch lane or pivot 90°</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-center">
            <span className="text-xs font-mono font-bold text-amber-400 block mb-1">W / Space / ↑</span>
            <span className="text-[11px] font-cinzel text-stone-300 font-semibold block">Leap Jump</span>
            <span className="text-[10px] text-stone-500">Clear chasms & tree logs</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-center">
            <span className="text-xs font-mono font-bold text-amber-400 block mb-1">S / ↓ / Down</span>
            <span className="text-[11px] font-cinzel text-stone-300 font-semibold block">Slide Roll</span>
            <span className="text-[10px] text-stone-500">Roll under blades & fire</span>
          </div>
        </div>

        {/* Core Twists Section */}
        <div className="mt-5 space-y-3">
          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
            <div className="flex items-center gap-2 text-xs font-cinzel font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              The Monolithic Stone Golem Chase
            </div>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              A towering ancient golem constantly stalks right behind you. Bumping into obstacles or stumbling slows you down and brings the creature within striking range. Stumble twice without recovering, and the golem crushes you!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
            <div className="flex items-center gap-2 text-xs font-cinzel font-bold text-amber-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Active Companion Pet System
            </div>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Your animal pet runs alongside you! As you cover meters, your pet's energy meter charges up. Once full, unleash abilities like Spirit Path (hazard obliteration), Prowler's Harvest (3x coin magnet), or Earthshaker Howl (knocks back the Golem).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
            <div className="flex items-center gap-2 text-xs font-cinzel font-bold text-amber-300">
              <Compass className="w-4 h-4 text-sky-400" />
              Elemental Shift Portals & Relic Fusions
            </div>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Sprint through giant glowing Torus rings to enter Frost Zones (slippery ground with 3x coins) or Windstorm Zones (floaty low-gravity jumps). Grab two different relics in succession to trigger Mythic Fusions like <strong className="text-stone-200">Void Vortex</strong> or <strong className="text-stone-200">Juggernaut Ram</strong>!
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playMenuClick();
            onClose();
          }}
          className="mt-6 w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-cinzel font-bold tracking-wider transition-colors cursor-pointer"
        >
          READY FOR THE RUN
        </button>
      </div>
    </div>
  );
};
