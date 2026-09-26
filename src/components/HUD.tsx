import React from 'react';
import { Volume2, VolumeX, Music, Pause, Play, Sparkles, Zap, Shield, Magnet, Flame, Wind, Snowflake, AlertTriangle } from 'lucide-react';
import { ElementalZone, PowerUpType, FusionType, PetConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

interface HUDProps {
  score: number;
  distance: number;
  coins: number;
  gems: number;
  pet: PetConfig;
  petMeter: number;
  petReady: boolean;
  golemDistance: number;
  zone: ElementalZone;
  activePowerUps: { type: PowerUpType; remaining: number }[];
  activeFusion: { type: FusionType; name: string; remaining: number } | null;
  isPaused: boolean;
  onPauseToggle: () => void;
  onTriggerPet: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  distance,
  coins,
  gems,
  pet,
  petMeter,
  petReady,
  golemDistance,
  zone,
  activePowerUps,
  activeFusion,
  isPaused,
  onPauseToggle,
  onTriggerPet,
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

  // Danger level: golemDistance is 0 to 100 (100 = safe, 0 = caught)
  const dangerPercent = Math.max(0, Math.min(100, 100 - golemDistance));
  const isHighDanger = dangerPercent > 60;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5">
      {/* Cinematic Screen Vignette based on Golem proximity or active Zone */}
      {isHighDanger && (
        <div className="absolute inset-0 golem-vignette pointer-events-none transition-opacity duration-300 animate-pulse" />
      )}
      {zone === 'frost' && <div className="absolute inset-0 frost-vignette pointer-events-none" />}
      {zone === 'windstorm' && <div className="absolute inset-0 wind-vignette pointer-events-none" />}
      {activeFusion && <div className="absolute inset-0 fusion-vignette pointer-events-none" />}

      {/* TOP ROW: Stats & Navigation */}
      <div className="flex items-start justify-between gap-3 z-10">
        {/* Left: Distance & Score */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-amber-500/20 text-stone-100 shadow-lg">
            <span className="text-xs uppercase font-cinzel text-amber-400 tracking-wider">Distance</span>
            <span className="font-mono-numbers text-lg sm:text-xl font-bold text-amber-200">
              {distance.toLocaleString()}<span className="text-xs ml-0.5 text-stone-400">m</span>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-stone-950/80 backdrop-blur-md px-3.5 py-1 rounded-lg border border-stone-800 text-stone-300">
            <span className="text-xs uppercase font-cinzel text-stone-400">Score</span>
            <span className="font-mono-numbers text-sm sm:text-base font-semibold text-stone-100">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Center: Active Zone Banner / Fusion Alert */}
        <div className="flex flex-col items-center">
          {zone !== 'normal' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 border border-amber-400/40 shadow-lg animate-bounce">
              {zone === 'frost' && <Snowflake className="w-4 h-4 text-sky-400" />}
              {zone === 'windstorm' && <Wind className="w-4 h-4 text-amber-400" />}
              {zone === 'inferno' && <Flame className="w-4 h-4 text-rose-500" />}
              <span className="text-xs font-cinzel font-bold tracking-wide uppercase text-amber-300">
                {zone === 'frost' && 'Frost Realm · 3x Coins'}
                {zone === 'windstorm' && 'Windstorm · Floaty Jump'}
                {zone === 'inferno' && 'Inferno Surge · Speed Boost'}
              </span>
            </div>
          )}

          {activeFusion && (
            <div className="mt-1 flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/90 via-amber-900/90 to-purple-900/90 border border-purple-400/60 shadow-xl">
              <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
              <div className="text-center">
                <div className="text-xs font-cinzel font-black tracking-widest text-purple-200 uppercase">
                  {activeFusion.name}
                </div>
                <div className="text-[10px] text-amber-200 font-mono-numbers">
                  {activeFusion.remaining}s
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Currency & Controls */}
        <div className="flex items-center gap-2">
          {/* Gold Coins */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 shadow-md">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-200 flex items-center justify-center text-[9px] font-bold text-stone-950">
              ✦
            </div>
            <span className="font-mono-numbers text-sm sm:text-base font-bold text-amber-300">
              {coins.toLocaleString()}
            </span>
          </div>

          {/* Crimson Gems */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 shadow-md">
            <span className="text-xs text-rose-400">♦</span>
            <span className="font-mono-numbers text-sm sm:text-base font-bold text-rose-300">
              {gems}
            </span>
          </div>

          {/* Audio & Pause Controls (Interactive) */}
          <div className="flex items-center gap-1 pointer-events-auto ml-1">
            <button
              onClick={handleToggleMusic}
              title="Toggle Jungle Drums"
              className={`p-2 rounded-lg border transition-colors ${
                musicOn
                  ? 'bg-stone-900/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                  : 'bg-stone-950/80 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleMute}
              title="Toggle Sound Effects"
              className={`p-2 rounded-lg border transition-colors ${
                !muted
                  ? 'bg-stone-900/80 border-stone-700 text-amber-300 hover:bg-stone-800'
                  : 'bg-stone-950/80 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onPauseToggle}
              title="Pause Game"
              className="p-2 rounded-lg bg-stone-900/80 border border-stone-700 text-stone-200 hover:bg-stone-800 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE FLANKS: Golem Proximity (Left) & Companion Pet Ability (Right) */}
      <div className="flex items-end justify-between z-10 w-full mt-auto mb-2 pointer-events-none">
        {/* Left: Golem Pursuit Threat Bar */}
        <div className="flex flex-col gap-1 max-w-[170px] sm:max-w-[210px] bg-stone-950/85 backdrop-blur-md p-2.5 rounded-xl border border-stone-800 shadow-xl">
          <div className="flex items-center justify-between text-[11px] font-cinzel">
            <span className="flex items-center gap-1 text-stone-300 font-semibold">
              <AlertTriangle className={`w-3.5 h-3.5 ${isHighDanger ? 'text-rose-500 animate-bounce' : 'text-stone-500'}`} />
              Stone Golem
            </span>
            <span className={`font-mono-numbers font-bold ${isHighDanger ? 'text-rose-400' : 'text-stone-400'}`}>
              {Math.round(dangerPercent)}%
            </span>
          </div>

          {/* Threat Meter Bar */}
          <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
            <div
              className={`h-full transition-all duration-200 ${
                isHighDanger ? 'bg-gradient-to-r from-amber-500 to-rose-600' : 'bg-stone-600'
              }`}
              style={{ width: `${dangerPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-400 truncate">
            {isHighDanger ? 'DANGER: Golem stalking inches away!' : 'Safe pursuit distance'}
          </span>
        </div>

        {/* Right: Companion Pet Ability Card & Trigger Button */}
        <div className="flex flex-col items-end gap-1 pointer-events-auto">
          <button
            onClick={onTriggerPet}
            disabled={!petReady}
            className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 shadow-xl ${
              petReady
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-300 text-stone-950 font-bold hover:scale-105 active:scale-95 cursor-pointer animate-pulse ring-2 ring-amber-400/40'
                : 'bg-stone-950/85 backdrop-blur-md border-stone-800 text-stone-300 cursor-not-allowed opacity-90'
            }`}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner"
              style={{ backgroundColor: pet.glowColor, color: '#09090b' }}
            >
              🐾
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 text-[11px] font-cinzel font-semibold tracking-wide">
                <span>{pet.name}</span>
                <span className="text-[9px] opacity-70">[{pet.abilityName}]</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono-numbers">
                {petReady ? (
                  <span className="text-amber-950 font-black tracking-wide uppercase">READY! TAP / [E]</span>
                ) : (
                  <span>
                    Charge: {Math.floor(petMeter)}%
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: Active Power-up Badges */}
      <div className="flex items-center justify-center gap-2 z-10 pointer-events-none">
        {activePowerUps.map(p => (
          <div
            key={p.type}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/90 backdrop-blur-md border border-stone-700 text-stone-200 shadow-md"
          >
            {p.type === 'magnet' && <Magnet className="w-3.5 h-3.5 text-sky-400" />}
            {p.type === 'shield' && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
            {p.type === 'dash' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
            {p.type === 'multiplier' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
            <span className="text-xs uppercase font-cinzel text-stone-300 font-semibold">{p.type}</span>
            <span className="text-xs font-mono-numbers text-amber-300 font-bold">{p.remaining}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};
