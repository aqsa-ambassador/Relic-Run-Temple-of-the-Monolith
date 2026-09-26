import React from 'react';
import { X, Check, Lock, UserCheck } from 'lucide-react';
import { CharacterConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

interface CharacterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterConfig[];
  selectedCharacterId: string;
  onSelectCharacter: (char: CharacterConfig) => void;
  onUnlockCharacter: (charId: string, cost: number) => void;
  totalCoins: number;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  isOpen,
  onClose,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onUnlockCharacter,
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
              Archaeologist Guild
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Choose your temple runner. Each adventurer possesses unique passive talents.
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

        {/* Characters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-1">
          {characters.map((c) => {
            const isSelected = c.id === selectedCharacterId;
            const canAfford = totalCoins >= c.cost;

            return (
              <div
                key={c.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/50'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div>
                  {/* Avatar circle */}
                  <div
                    className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl shadow-inner border-2 border-stone-700 mb-3"
                    style={{ backgroundColor: c.modelColor }}
                  >
                    🤠
                  </div>

                  <div className="text-center">
                    <h3 className="font-cinzel font-bold text-stone-100 text-sm">{c.name}</h3>
                    <span className="text-[11px] text-amber-400/90 font-medium">{c.title}</span>
                  </div>

                  {/* Passive Perk */}
                  <div className="mt-3 p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-center">
                    <span className="text-[10px] uppercase font-cinzel font-bold text-stone-400 block mb-0.5">
                      Passive Perk
                    </span>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      {c.passiveDescription}
                    </p>
                  </div>
                </div>

                {/* Button */}
                <div className="mt-4 pt-3 border-t border-stone-800/80">
                  {c.unlocked ? (
                    <button
                      onClick={() => {
                        sound.playMenuClick();
                        onSelectCharacter(c);
                      }}
                      disabled={isSelected}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-cinzel font-bold tracking-wider transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      {isSelected ? 'ACTIVE RUNNER' : 'SELECT'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playMenuClick();
                        onUnlockCharacter(c.id, c.cost);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-cinzel font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      UNLOCK ({c.cost} ✦)
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
