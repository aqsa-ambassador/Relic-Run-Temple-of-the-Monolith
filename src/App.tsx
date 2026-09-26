/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TempleRunnerEngine } from './game/threeEngine';
import { GameMode, ElementalZone, PowerUpType, FusionType, PetConfig, CharacterConfig, UpgradeConfig } from './types/game';
import { INITIAL_PETS, INITIAL_CHARACTERS, INITIAL_UPGRADES } from './data/gameData';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PetSelectModal } from './components/PetSelectModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';
import { InstructionsModal } from './components/InstructionsModal';
import { MobileControls } from './components/MobileControls';
import { sound } from './audio/soundEngine';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TempleRunnerEngine | null>(null);

  // Persistence State
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    const saved = localStorage.getItem('relic_total_coins');
    return saved ? parseInt(saved, 10) : 250; // starting bonus
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('relic_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [maxDistance, setMaxDistance] = useState<number>(() => {
    const saved = localStorage.getItem('relic_max_distance');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [pets, setPets] = useState<PetConfig[]>(() => {
    const saved = localStorage.getItem('relic_pets');
    return saved ? JSON.parse(saved) : INITIAL_PETS;
  });

  const [selectedPetId, setSelectedPetId] = useState<string>(() => {
    const saved = localStorage.getItem('relic_selected_pet');
    return saved || 'fox';
  });

  const [characters, setCharacters] = useState<CharacterConfig[]>(() => {
    const saved = localStorage.getItem('relic_characters');
    return saved ? JSON.parse(saved) : INITIAL_CHARACTERS;
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(() => {
    const saved = localStorage.getItem('relic_selected_character');
    return saved || 'drake';
  });

  const [upgrades, setUpgrades] = useState<UpgradeConfig[]>(() => {
    const saved = localStorage.getItem('relic_upgrades');
    return saved ? JSON.parse(saved) : INITIAL_UPGRADES;
  });

  // Game Run State
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [runCoins, setRunCoins] = useState<number>(0);
  const [runGems, setRunGems] = useState<number>(0);
  const [petMeter, setPetMeter] = useState<number>(0);
  const [petReady, setPetReady] = useState<boolean>(false);
  const [golemDistance, setGolemDistance] = useState<number>(100);
  const [zone, setZone] = useState<ElementalZone>('normal');
  const [activePowerUps, setActivePowerUps] = useState<{ type: PowerUpType; remaining: number }[]>([]);
  const [activeFusion, setActiveFusion] = useState<{ type: FusionType; name: string; remaining: number } | null>(null);

  // Modals
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);

  // Game Over Details
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [gameOverStats, setGameOverStats] = useState<{
    score: number;
    distance: number;
    coins: number;
    gems: number;
    fusions: number;
  }>({ score: 0, distance: 0, coins: 0, gems: 0, fusions: 0 });
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Active configurations
  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('relic_total_coins', totalCoins.toString());
  }, [totalCoins]);

  useEffect(() => {
    localStorage.setItem('relic_high_score', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('relic_max_distance', maxDistance.toString());
  }, [maxDistance]);

  useEffect(() => {
    localStorage.setItem('relic_pets', JSON.stringify(pets));
  }, [pets]);

  useEffect(() => {
    localStorage.setItem('relic_selected_pet', selectedPetId);
  }, [selectedPetId]);

  useEffect(() => {
    localStorage.setItem('relic_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('relic_selected_character', selectedCharacterId);
  }, [selectedCharacterId]);

  useEffect(() => {
    localStorage.setItem('relic_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  // Initialise Three.js Runner Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new TempleRunnerEngine(
      containerRef.current,
      selectedCharacter,
      selectedPet,
      {
        onScoreUpdate: (stats) => {
          setScore(stats.score);
          setDistance(stats.distance);
          setRunCoins(stats.coins);
          setRunGems(stats.gems);
          setPetMeter(stats.petMeter);
          setPetReady(stats.petReady);
          setGolemDistance(stats.golemDistance);
          setZone(stats.zone);
          setActivePowerUps(stats.activePowerUps);
          setActiveFusion(stats.activeFusion);
        },
        onGameOver: (reason, stats) => {
          setGameOverReason(reason);
          setGameOverStats(stats);
          setGameMode('gameover');

          // Update saved coin purse & records
          setTotalCoins((prev) => prev + stats.coins + stats.gems * 5);

          let newRecord = false;
          if (stats.score > highScore) {
            setHighScore(stats.score);
            newRecord = true;
          }
          if (stats.distance > maxDistance) {
            setMaxDistance(stats.distance);
          }
          setIsNewRecord(newRecord);
        },
        onFusionTriggered: (fusionName) => {
          // Handled via audio & HUD
        },
        onPortalEnter: (portalZone) => {
          setZone(portalZone);
        },
        onPetAbilityTriggered: (petName, abilityName) => {
          // Handled in audio & HUD
        },
      }
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update engine if character or pet changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCharacter(selectedCharacter);
      engineRef.current.setPet(selectedPet);
    }
  }, [selectedCharacter, selectedPet]);

  // Handle Swipe Gestures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameMode !== 'playing' || isPaused) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameMode !== 'playing' || isPaused || !engineRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 30; // 30px swipe threshold

    if (Math.max(absX, absY) > threshold) {
      if (absX > absY) {
        if (dx > 0) {
          engineRef.current.moveRight();
        } else {
          engineRef.current.moveLeft();
        }
      } else {
        if (dy > 0) {
          engineRef.current.slide();
        } else {
          engineRef.current.jump();
        }
      }
    }
  };

  // Start / Restart Run
  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    setGameMode('playing');
    setIsPaused(false);
    setScore(0);
    setDistance(0);
    setRunCoins(0);
    setRunGems(0);
    setZone('normal');
    setActivePowerUps([]);
    setActiveFusion(null);
    engineRef.current.resetRun();
    engineRef.current.start();
  }, []);

  // Pause toggle
  const handlePauseToggle = useCallback(() => {
    if (!engineRef.current || gameMode !== 'playing') return;
    if (isPaused) {
      engineRef.current.resume();
      setIsPaused(false);
    } else {
      engineRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused, gameMode]);

  // Pet ability trigger
  const handleTriggerPet = useCallback(() => {
    if (engineRef.current && gameMode === 'playing') {
      engineRef.current.triggerPetAbility();
    }
  }, [gameMode]);

  // Unlock / Select Handlers
  const handleSelectPet = (pet: PetConfig) => {
    setSelectedPetId(pet.id);
    setIsPetModalOpen(false);
  };

  const handleUnlockPet = (petId: string, cost: number) => {
    if (totalCoins < cost) return;
    setTotalCoins((prev) => prev - cost);
    setPets((prev) =>
      prev.map((p) => (p.id === petId ? { ...p, unlocked: true } : p))
    );
    setSelectedPetId(petId);
  };

  const handleSelectCharacter = (char: CharacterConfig) => {
    setSelectedCharacterId(char.id);
    setIsCharacterModalOpen(false);
  };

  const handleUnlockCharacter = (charId: string, cost: number) => {
    if (totalCoins < cost) return;
    setTotalCoins((prev) => prev - cost);
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, unlocked: true } : c))
    );
    setSelectedCharacterId(charId);
  };

  const handleUpgrade = (upgradeId: string, cost: number) => {
    if (totalCoins < cost) return;
    setTotalCoins((prev) => prev - cost);
    setUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, level: u.level + 1 } : u))
    );
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Three.js 3D Viewport Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Main Menu State */}
      {gameMode === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenPets={() => setIsPetModalOpen(true)}
          onOpenCharacters={() => setIsCharacterModalOpen(true)}
          onOpenShop={() => setIsShopModalOpen(true)}
          onOpenInstructions={() => setIsInstructionsModalOpen(true)}
          selectedPet={selectedPet}
          selectedCharacter={selectedCharacter}
          highScore={highScore}
          maxDistance={maxDistance}
          totalCoins={totalCoins}
        />
      )}

      {/* In-Game HUD */}
      {gameMode === 'playing' && (
        <>
          <HUD
            score={score}
            distance={distance}
            coins={runCoins}
            gems={runGems}
            pet={selectedPet}
            petMeter={petMeter}
            petReady={petReady}
            golemDistance={golemDistance}
            zone={zone}
            activePowerUps={activePowerUps}
            activeFusion={activeFusion}
            isPaused={isPaused}
            onPauseToggle={handlePauseToggle}
            onTriggerPet={handleTriggerPet}
          />

          {/* On-screen touch buttons for mobile */}
          <MobileControls
            onMoveLeft={() => engineRef.current?.moveLeft()}
            onMoveRight={() => engineRef.current?.moveRight()}
            onJump={() => engineRef.current?.jump()}
            onSlide={() => engineRef.current?.slide()}
            onTriggerPet={handleTriggerPet}
          />
        </>
      )}

      {/* Pause Screen Overlay */}
      {isPaused && gameMode === 'playing' && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-cinzel font-black tracking-wider text-amber-300 uppercase">
              Expedition Paused
            </h3>
            <p className="text-xs text-stone-400 mt-1">Catch your breath before resuming the chase.</p>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => {
                  sound.playMenuClick();
                  handlePauseToggle();
                }}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-bold text-xs tracking-wider transition-colors cursor-pointer shadow-md"
              >
                RESUME SPRINT
              </button>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setGameMode('menu');
                  setIsPaused(false);
                  engineRef.current?.destroy();
                }}
                className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs tracking-wider transition-colors cursor-pointer border border-stone-700"
              >
                QUIT TO CAMP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      <GameOverModal
        isOpen={gameMode === 'gameover'}
        reason={gameOverReason}
        stats={gameOverStats}
        highScore={highScore}
        maxDistance={maxDistance}
        isNewRecord={isNewRecord}
        onRestart={handleStartGame}
        onHome={() => setGameMode('menu')}
      />

      {/* Pet Sanctuary Modal */}
      <PetSelectModal
        isOpen={isPetModalOpen}
        onClose={() => setIsPetModalOpen(false)}
        pets={pets}
        selectedPetId={selectedPetId}
        onSelectPet={handleSelectPet}
        onUnlockPet={handleUnlockPet}
        totalCoins={totalCoins}
      />

      {/* Archaeologist Character Guild Modal */}
      <CharacterSelectModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={handleSelectCharacter}
        onUnlockCharacter={handleUnlockCharacter}
        totalCoins={totalCoins}
      />

      {/* Relic Forge Shop Modal */}
      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        upgrades={upgrades}
        onUpgrade={handleUpgrade}
        totalCoins={totalCoins}
      />

      {/* Instructions Guide Modal */}
      <InstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={() => setIsInstructionsModalOpen(false)}
      />
    </div>
  );
}
