import React from 'react';
import { Play, Sparkles, User, ShoppingBag, BookOpen, Volume2, VolumeX, Music, Trophy, Compass, Shield } from 'lucide-react';
import { PetConfig, CharacterConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenPets: () => void;
  onOpenCharacters: () => void;
  onOpenShop: () => void;
  onOpenInstructions: () => void;
  selectedPet: PetConfig;
  selectedCharacter: CharacterConfig;
  highScore: number;
  maxDistance: number;
  totalCoins: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenPets,
  onOpenCharacters,
  onOpenShop,
  onOpenInstructions,
  selectedPet,
  selectedCharacter,
  highScore,
  maxDistance,
  totalCoins,
}) => {
  const [muted, setMuted] = React.useState(sound.getMuted());
  const [musicOn, setMusicOn] = React.useState(sound.getMusicEnabled());

  const handleToggleMute = () => {
    const next = sound.toggleMute();
    setMuted(next);
  };

  const handleToggleMusic = () => {
    const next = sound.toggleMusic();
    setMusicOn(next);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-8 z-30 select-none bg-radial from-stone-900/60 via-stone-950/85 to-stone-950">
      {/* Top Bar: Game Title, Currency & Settings */}
      <header className="flex items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-cinzel font-black text-lg shadow-md">
            ✦
          </div>
          <div>
            <h1 className="font-cinzel font-black tracking-widest text-lg sm:text-xl text-amber-300 uppercase">
              Relic Run
            </h1>
            <p className="text-[11px] text-stone-400 -mt-0.5 tracking-wider uppercase font-semibold">
              Temple of the Monolith
            </p>
          </div>
        </div>

        {/* Currency & Audio */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-stone-900/90 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-amber-300 shadow-md">
            <span className="text-amber-400 font-bold">✦</span>
            <span className="font-mono-numbers font-bold text-sm sm:text-base">
              {totalCoins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={handleToggleMusic}
            title="Toggle Jungle Drums"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              musicOn
                ? 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleMute}
            title="Toggle Sound Effects"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              !muted
                ? 'bg-stone-900 border-stone-700 text-amber-300 hover:bg-stone-800'
                : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Hero Centerpiece: Dramatic Title & Play Action */}
      <div className="flex flex-col items-center justify-center text-center my-auto py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs font-cinzel font-semibold mb-3">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          Endless 3D Temple Runner
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 drop-shadow-md">
          TEMPLE RUN
        </h2>
        <span className="text-sm sm:text-base font-cinzel tracking-widest text-amber-400 uppercase mt-1">
          Wrath of the Stone Golem
        </span>

        {/* High Score / Best Distance Pills */}
        <div className="flex items-center gap-4 mt-4 text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5 text-stone-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Best Score: <strong className="text-amber-200">{highScore.toLocaleString()}</strong></span>
          </div>
          <span className="text-stone-600">·</span>
          <div className="flex items-center gap-1.5 text-stone-300">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Record: <strong className="text-sky-200">{maxDistance.toLocaleString()}m</strong></span>
          </div>
        </div>

        {/* Big Start Expedition Button */}
        <button
          onClick={() => {
            sound.playMenuClick();
            onStartGame();
          }}
          className="group relative mt-7 px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-black text-base sm:text-lg tracking-widest uppercase shadow-2xl shadow-amber-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-amber-300/40"
        >
          <div className="flex items-center gap-3">
            <Play className="w-6 h-6 fill-stone-950 stroke-none" />
            <span>ENTER TEMPLE</span>
          </div>
        </button>
      </div>

      {/* Bottom Hub Cards: Runner, Pet, Forge, Guide */}
      <footer className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-800/80">
        {/* Companion Pet Sanctuary */}
        <button
          onClick={() => {
            sound.playMenuClick();
            onOpenPets();
          }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 transition-all text-left cursor-pointer group"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md"
            style={{ backgroundColor: selectedPet.glowColor, color: '#000' }}
          >
            🐾
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-cinzel text-amber-400 font-bold block">
              Companion Pet
            </span>
            <span className="text-xs font-bold text-stone-200 truncate block group-hover:text-amber-200">
              {selectedPet.name}
            </span>
          </div>
        </button>

        {/* Archaeologist Guild */}
        <button
          onClick={() => {
            sound.playMenuClick();
            onOpenCharacters();
          }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 transition-all text-left cursor-pointer group"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md text-stone-100"
            style={{ backgroundColor: selectedCharacter.modelColor }}
          >
            🤠
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-cinzel text-amber-400 font-bold block">
              Adventurer
            </span>
            <span className="text-xs font-bold text-stone-200 truncate block group-hover:text-amber-200">
              {selectedCharacter.name}
            </span>
          </div>
        </button>

        {/* Relic Forge Upgrades */}
        <button
          onClick={() => {
            sound.playMenuClick();
            onOpenShop();
          }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 transition-all text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-cinzel text-amber-400 font-bold block">
              Relic Forge
            </span>
            <span className="text-xs font-bold text-stone-200 truncate block group-hover:text-amber-200">
              Power Upgrades
            </span>
          </div>
        </button>

        {/* How to Play Guide */}
        <button
          onClick={() => {
            sound.playMenuClick();
            onOpenInstructions();
          }}
          className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 transition-all text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0 shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-cinzel text-stone-400 font-bold block">
              Guide
            </span>
            <span className="text-xs font-bold text-stone-200 truncate block group-hover:text-stone-100">
              Twists & Controls
            </span>
          </div>
        </button>
      </footer>
    </div>
  );
};
