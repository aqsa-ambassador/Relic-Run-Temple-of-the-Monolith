import React from 'react';
import { X, Magnet, Shield, Zap, Sparkles, Coins, ArrowUp } from 'lucide-react';
import { UpgradeConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: UpgradeConfig[];
  onUpgrade: (upgradeId: string, cost: number) => void;
  totalCoins: number;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  onUpgrade,
  totalCoins,
}) => {
  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Magnet':
        return <Magnet className="w-5 h-5 text-sky-400" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'Coins':
        return <Coins className="w-5 h-5 text-amber-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h2 className="text-xl font-cinzel font-bold text-amber-300 tracking-wide">
              Ancient Relic Forge & Upgrades
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Empower your artifacts to survive deeper inside the Monolith's corridors.
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

        {/* Upgrades List */}
        <div className="flex flex-col gap-3 mt-1">
          {upgrades.map((u) => {
            const cost = u.baseCost * u.level;
            const isMax = u.level >= u.maxLevel;
            const canAfford = totalCoins >= cost && !isMax;

            return (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                    {renderIcon(u.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-cinzel font-bold text-stone-100 text-sm">{u.name}</h3>
                      {/* Level Progress Pips */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: u.maxLevel }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2.5 h-1.5 rounded-sm ${
                              idx < u.level ? 'bg-amber-400' : 'bg-stone-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 leading-snug">{u.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  {isMax ? (
                    <span className="text-xs font-cinzel text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      MAX RANK
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playMenuClick();
                        onUpgrade(u.id, cost);
                      }}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-cinzel font-bold tracking-wider transition-colors ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-md'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      UPGRADE ({cost} ✦)
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
