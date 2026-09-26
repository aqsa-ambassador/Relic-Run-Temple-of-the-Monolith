import React from 'react';
import { X, Check, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { PetConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

interface PetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  pets: PetConfig[];
  selectedPetId: string;
  onSelectPet: (pet: PetConfig) => void;
  onUnlockPet: (petId: string, cost: number) => void;
  totalCoins: number;
}

export const PetSelectModal: React.FC<PetSelectModalProps> = ({
  isOpen,
  onClose,
  pets,
  selectedPetId,
  onSelectPet,
  onUnlockPet,
  totalCoins,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h2 className="text-xl font-cinzel font-bold text-amber-300 tracking-wide">
              Companion Pet Sanctuary
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Select an animal guardian that runs beside you and triggers supernatural abilities.
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

        {/* Currency display */}
        <div className="flex items-center justify-end gap-2 py-3 text-xs">
          <span className="text-stone-400">Your Coin Purse:</span>
          <span className="font-mono-numbers font-bold text-amber-300 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800">
            {totalCoins.toLocaleString()} ✦
          </span>
        </div>

        {/* Pet Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-1">
          {pets.map((p) => {
            const isSelected = p.id === selectedPetId;
            const canAfford = totalCoins >= p.cost;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/50'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/10"
                        style={{ backgroundColor: p.glowColor }}
                      >
                        🐾
                      </div>
                      <div>
                        <h3 className="font-cinzel font-bold text-stone-100 text-sm">{p.name}</h3>
                        <span className="text-[11px] text-stone-400 font-medium">{p.species}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-cinzel text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-300 mt-3 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Ability Box */}
                  <div className="mt-3 p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-cinzel font-bold text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {p.abilityName}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                      {p.abilityDescription}
                    </p>
                    <div className="mt-1.5 text-[10px] text-stone-500 font-mono-numbers">
                      Triggers every <span className="text-amber-200 font-semibold">{p.cooldownMeters}m</span> · Duration <span className="text-amber-200 font-semibold">{p.durationSeconds}s</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-stone-800/80">
                  {p.unlocked ? (
                    <button
                      onClick={() => {
                        sound.playMenuClick();
                        onSelectPet(p);
                      }}
                      disabled={isSelected}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-cinzel font-bold tracking-wider transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      {isSelected ? 'BONDED GUARDIAN' : 'EQUIP COMPANION'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playMenuClick();
                        onUnlockPet(p.id, p.cost);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-cinzel font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      UNLOCK ({p.cost} ✦)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
