export type GameMode = 'menu' | 'playing' | 'paused' | 'gameover';

export type BiomeType = 'ruins' | 'bridge' | 'mineshaft' | 'jungle';

export type ElementalZone = 'normal' | 'frost' | 'windstorm' | 'inferno';

export type PowerUpType = 'magnet' | 'shield' | 'dash' | 'multiplier';

export type FusionType = 'void_vortex' | 'aegis_graviton' | 'juggernaut_ram' | 'solar_storm';

export interface PetConfig {
  id: string;
  name: string;
  species: string;
  color: string;
  glowColor: string;
  accentColor: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
  cooldownMeters: number; // triggers every X meters
  durationSeconds: number;
  unlocked: boolean;
  cost: number;
  level: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  modelColor: string;
  clothColor: string;
  passiveDescription: string;
  passiveMultiplier: number;
  unlocked: boolean;
  cost: number;
}

export interface UpgradeConfig {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  description: string;
  icon: string;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remainingTime: number;
  duration: number;
}

export interface ActiveFusion {
  type: FusionType;
  name: string;
  remaining: number;
  remainingTime?: number;
  duration: number;
  description: string;
}

export interface GameStats {
  score: number;
  distance: number;
  coins: number;
  gems: number;
  highScore: number;
  maxDistance: number;
  totalCoins: number;
  causeOfDeath: string;
  fusionsTriggered: number;
  portalsPassed: number;
  golemDistance: number; // 0 (caught) to 100 (safe distance)
}
