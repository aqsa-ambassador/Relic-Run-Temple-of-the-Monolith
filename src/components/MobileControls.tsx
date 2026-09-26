import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface MobileControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onTriggerPet: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  onTriggerPet,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none flex items-center justify-between px-4 sm:hidden z-20">
      {/* Left/Right Directional Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onMoveLeft();
          }}
          onClick={onMoveLeft}
          className="w-13 h-13 rounded-2xl bg-stone-900/80 active:bg-amber-600/80 border border-stone-700/80 text-stone-200 active:text-stone-950 flex items-center justify-center shadow-lg backdrop-blur-sm transition-transform active:scale-95"
          aria-label="Move or Turn Left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onMoveRight();
          }}
          onClick={onMoveRight}
          className="w-13 h-13 rounded-2xl bg-stone-900/80 active:bg-amber-600/80 border border-stone-700/80 text-stone-200 active:text-stone-950 flex items-center justify-center shadow-lg backdrop-blur-sm transition-transform active:scale-95"
          aria-label="Move or Turn Right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Jump & Slide Action Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onSlide();
          }}
          onClick={onSlide}
          className="w-13 h-13 rounded-2xl bg-stone-900/80 active:bg-amber-600/80 border border-stone-700/80 text-stone-200 active:text-stone-950 flex flex-col items-center justify-center shadow-lg backdrop-blur-sm transition-transform active:scale-95"
          aria-label="Slide Roll"
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[9px] font-cinzel font-bold">SLIDE</span>
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onJump();
          }}
          onClick={onJump}
          className="w-13 h-13 rounded-2xl bg-amber-600/90 active:bg-amber-500 border border-amber-400 text-stone-950 flex flex-col items-center justify-center shadow-xl backdrop-blur-sm transition-transform active:scale-95 font-bold"
          aria-label="Jump Leap"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[9px] font-cinzel font-black">JUMP</span>
        </button>
      </div>
    </div>
  );
};
