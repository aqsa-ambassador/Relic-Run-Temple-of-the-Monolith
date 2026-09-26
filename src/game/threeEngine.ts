import * as THREE from 'three';
import { BiomeType, ElementalZone, PowerUpType, FusionType, ActiveFusion, PetConfig, CharacterConfig } from '../types/game';
import { sound } from '../audio/soundEngine';

export interface GameEngineCallbacks {
  onScoreUpdate: (stats: {
    score: number;
    distance: number;
    coins: number;
    gems: number;
    petMeter: number;
    petReady: boolean;
    golemDistance: number;
    zone: ElementalZone;
    activePowerUps: { type: PowerUpType; remaining: number }[];
    activeFusion: { type: FusionType; name: string; remaining: number } | null;
  }) => void;
  onGameOver: (reason: string, stats: { score: number; distance: number; coins: number; gems: number; fusions: number }) => void;
  onFusionTriggered: (fusionName: string) => void;
  onPortalEnter: (zone: ElementalZone) => void;
  onPetAbilityTriggered: (petName: string, abilityName: string) => void;
}

interface TrackTile {
  group: THREE.Group;
  type: 'straight' | 'turn_left' | 'turn_right' | 'chasm';
  position: THREE.Vector3;
  direction: THREE.Vector3; // forward heading
  right: THREE.Vector3;     // rightward vector
  rotationY: number;
  biome: BiomeType;
  length: number;
  active: boolean;
  obstacles: ObstacleInstance[];
  coins: CoinInstance[];
  powerUp: PowerUpInstance | null;
  portal: PortalInstance | null;
  turnTriggered?: boolean;
}

interface ObstacleInstance {
  group: THREE.Group;
  type: 'hurdle' | 'slide_blade' | 'left_block' | 'right_block' | 'center_block' | 'fire_ring';
  lane: number; // -1, 0, 1
  pos: THREE.Vector3;
  passed: boolean;
  cleared?: boolean;
}

interface CoinInstance {
  mesh: THREE.Mesh;
  type: 'coin' | 'gem';
  pos: THREE.Vector3;
  lane: number;
  collected: boolean;
}

interface PowerUpInstance {
  group: THREE.Group;
  type: PowerUpType;
  pos: THREE.Vector3;
  lane: number;
  collected: boolean;
}

interface PortalInstance {
  group: THREE.Group;
  zone: ElementalZone;
  pos: THREE.Vector3;
  passed: boolean;
}

export class TempleRunnerEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // Game State
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private speed: number = 24.0; // base running speed
  private baseSpeed: number = 24.0;
  private maxSpeed: number = 42.0;
  private distanceRan: number = 0;
  private score: number = 0;
  private coinsCollected: number = 0;
  private gemsCollected: number = 0;
  private fusionsCount: number = 0;
  private currentBiome: BiomeType = 'ruins';
  private currentZone: ElementalZone = 'normal';
  private zoneTimer: number = 0;

  // Selected character & pet
  private character: CharacterConfig;
  private pet: PetConfig;

  // Player physics & lane control
  private playerGroup: THREE.Group;
  private playerBodyMesh: THREE.Mesh;
  private playerLimbLeft: THREE.Mesh;
  private playerLimbRight: THREE.Mesh;
  private playerArmLeft: THREE.Mesh;
  private playerArmRight: THREE.Mesh;
  private playerHeadMesh: THREE.Mesh;
  private currentLane: number = 0; // -1: Left, 0: Center, 1: Right
  private targetLaneOffset: number = 0;
  private currentLaneOffset: number = 0;
  private laneWidth: number = 2.3;
  private playerY: number = 0;
  private playerVY: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private stumbleTimer: number = 0;
  private stumbleSpeedPenalty: number = 0;
  private runAnimTime: number = 0;

  // World Heading & Turns
  private worldPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentHeadingAngle: number = 0; // 0, -Math.PI/2, Math.PI/2, Math.PI
  private targetHeadingAngle: number = 0;
  private forwardVector: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private rightVector: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

  // Companion Pet 3D entity
  private petGroup: THREE.Group;
  private petMeter: number = 0;
  private petAbilityActive: boolean = false;
  private petAbilityTimer: number = 0;

  // Monolithic Stone Golem 3D entity
  private golemGroup: THREE.Group;
  private golemDistance: number = 10.0; // distance behind player
  private golemFistLeft: THREE.Mesh;
  private golemFistRight: THREE.Mesh;
  private golemEyeLeft: THREE.Mesh;
  private golemEyeRight: THREE.Mesh;
  private golemRoarTimer: number = 0;

  // Active Power-ups & Synergy Fusions
  private activePowerUps: Map<PowerUpType, { remaining: number; duration: number }> = new Map();
  private activeFusion: ActiveFusion | null = null;
  private magnetRadius: number = 9.0;

  // World Track Management & Pooling
  private trackTiles: TrackTile[] = [];
  private readonly tileLength: number = 20.0;
  private readonly visibleTilesCount: number = 16;
  private nextTileSpawnPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private nextTileHeading: number = 0;
  private tilesSpawnedCount: number = 0;

  // Particle systems
  private particlesGroup: THREE.Group;
  private ambientParticles: THREE.Points;
  private portalRingMesh: THREE.Mesh | null = null;

  // Lights
  private dirLight: THREE.DirectionalLight;
  private playerTorchLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;

  constructor(container: HTMLElement, character: CharacterConfig, pet: PetConfig, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.character = character;
    this.pet = pet;
    this.callbacks = callbacks;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1816, 0.018);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 350);
    this.camera.position.set(0, 4.2, 5.8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x141210);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.55);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    this.dirLight.position.set(20, 40, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    const shadowD = 25;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.dirLight);

    // Player Torch Glow
    this.playerTorchLight = new THREE.PointLight(0xf59e0b, 2.0, 18, 1.5);
    this.playerTorchLight.position.set(0, 2, -1);
    this.scene.add(this.playerTorchLight);

    // Build 3D Entities
    const { playerGroup, body, limbL, limbR, armL, armR, head } = this.createPlayerModel();
    this.playerGroup = playerGroup;
    this.playerBodyMesh = body;
    this.playerLimbLeft = limbL;
    this.playerLimbRight = limbR;
    this.playerArmLeft = armL;
    this.playerArmRight = armR;
    this.playerHeadMesh = head;
    this.scene.add(this.playerGroup);

    const { golemGroup, fistL, fistR, eyeL, eyeR } = this.createGolemModel();
    this.golemGroup = golemGroup;
    this.golemFistLeft = fistL;
    this.golemFistRight = fistR;
    this.golemEyeLeft = eyeL;
    this.golemEyeRight = eyeR;
    this.scene.add(this.golemGroup);

    this.petGroup = this.createPetModel();
    this.scene.add(this.petGroup);

    // Particle Group
    this.particlesGroup = new THREE.Group();
    this.scene.add(this.particlesGroup);
    this.ambientParticles = this.createAmbientDust();
    this.particlesGroup.add(this.ambientParticles);

    // Resize listener
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.handleKeyDown);

    // Initial world spawn
    this.resetRun();
  }

  // CREATE 3D PLAYER MODEL (Stylized Explorer)
  private createPlayerModel() {
    const group = new THREE.Group();

    // Torso / Jacket
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.1, 0.45);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.character.modelColor,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    // Adventurer Head / Hat
    const headGeo = new THREE.SphereGeometry(0.32, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.15;
    head.castShadow = true;
    group.add(head);

    // Explorer Fedora Hat
    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
    );
    hatBrim.position.y = 2.35;
    group.add(hatBrim);
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
    );
    hatTop.position.y = 2.52;
    group.add(hatTop);

    // Backpack
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.75, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    pack.position.set(0, 1.4, 0.35);
    group.add(pack);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.32, 0.9, 0.32);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const limbL = new THREE.Mesh(legGeo, legMat);
    limbL.position.set(-0.24, 0.55, 0);
    limbL.castShadow = true;
    group.add(limbL);

    const limbR = new THREE.Mesh(legGeo, legMat);
    limbR.position.set(0.24, 0.55, 0);
    limbR.castShadow = true;
    group.add(limbR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
    const armMat = new THREE.MeshStandardMaterial({ color: this.character.clothColor, roughness: 0.6 });

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.52, 1.35, 0);
    armL.castShadow = true;
    group.add(armL);

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.52, 1.35, 0);
    armR.castShadow = true;
    group.add(armR);

    // Torch in right hand
    const torchStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03 })
    );
    torchStick.rotation.x = Math.PI / 3;
    torchStick.position.set(0.56, 1.1, -0.35);
    group.add(torchStick);

    const flame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    flame.position.set(0.56, 1.35, -0.55);
    group.add(flame);

    // Active Shield Sphere (hidden by default)
    const shieldGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.name = 'playerShield';
    shieldMesh.position.y = 1.2;
    group.add(shieldMesh);

    return { playerGroup: group, body, limbL, limbR, armL, armR, head };
  }

  // CREATE 3D MONOLITHIC STONE GOLEM (Stalking behind)
  private createGolemModel() {
    const group = new THREE.Group();

    // Massive cracked granite torso
    const torsoGeo = new THREE.BoxGeometry(2.4, 2.8, 1.8);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.95,
      metalness: 0.2,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 2.4;
    torso.castShadow = true;
    group.add(torso);

    // Glowing ancient rune cracks on chest
    const runeGeo = new THREE.BoxGeometry(0.8, 1.4, 0.1);
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.set(0, 2.4, -0.92);
    group.add(rune);

    // Giant Blocky Head
    const headGeo = new THREE.BoxGeometry(1.6, 1.4, 1.4);
    const head = new THREE.Mesh(headGeo, torsoMat);
    head.position.y = 4.3;
    head.castShadow = true;
    group.add(head);

    // Glowing red menacing eyes
    const eyeGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.45, 4.35, -0.72);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.45, 4.35, -0.72);
    group.add(eyeR);

    // Heavy swinging stone fists / arms
    const fistGeo = new THREE.BoxGeometry(0.9, 2.2, 0.9);
    const fistMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

    const fistL = new THREE.Mesh(fistGeo, fistMat);
    fistL.position.set(-1.8, 2.2, 0);
    fistL.castShadow = true;
    group.add(fistL);

    const fistR = new THREE.Mesh(fistGeo, fistMat);
    fistR.position.set(1.8, 2.2, 0);
    fistR.castShadow = true;
    group.add(fistR);

    // Moss / Ivy patches on shoulders
    const mossGeo = new THREE.BoxGeometry(1.1, 0.35, 1.1);
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 1.0 });
    const mossL = new THREE.Mesh(mossGeo, mossMat);
    mossL.position.set(-1.2, 3.8, 0);
    group.add(mossL);
    const mossR = new THREE.Mesh(mossGeo, mossMat);
    mossR.position.set(1.2, 3.8, 0);
    group.add(mossR);

    return { golemGroup: group, fistL, fistR, eyeL, eyeR };
  }

  // CREATE 3D COMPANION PET
  private createPetModel(): THREE.Group {
    const group = new THREE.Group();

    if (this.pet.id === 'hawk') {
      // Celestial Sun Hawk (Floats aloft)
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: this.pet.color, roughness: 0.4 })
      );
      body.rotation.x = Math.PI / 2;
      group.add(body);

      const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.5);
      const wingMat = new THREE.MeshStandardMaterial({ color: this.pet.accentColor, emissive: this.pet.glowColor, emissiveIntensity: 0.4 });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.name = 'petWings';
      group.add(wings);
    } else {
      // Quadruped Pet (Spirit Fox, Panther, Wolf)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.45, 1.0),
        new THREE.MeshStandardMaterial({ color: this.pet.color, roughness: 0.5 })
      );
      body.position.y = 0.5;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.45, 5),
        new THREE.MeshStandardMaterial({ color: this.pet.accentColor, roughness: 0.5 })
      );
      head.rotation.x = -Math.PI / 2;
      head.position.set(0, 0.75, -0.6);
      group.add(head);

      // Ears
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), new THREE.MeshBasicMaterial({ color: this.pet.glowColor }));
      earL.position.set(-0.16, 1.0, -0.5);
      group.add(earL);
      const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), new THREE.MeshBasicMaterial({ color: this.pet.glowColor }));
      earR.position.set(0.16, 1.0, -0.5);
      group.add(earR);

      // Tail
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.22, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: this.pet.glowColor, emissive: this.pet.glowColor, emissiveIntensity: 0.5 })
      );
      tail.position.set(0, 0.8, 0.7);
      tail.rotation.x = Math.PI / 4;
      tail.name = 'petTail';
      group.add(tail);
    }

    // Luminous halo aura
    const haloGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    const haloMat = new THREE.MeshBasicMaterial({ color: this.pet.glowColor, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.1;
    halo.name = 'petHalo';
    group.add(halo);

    return group;
  }

  // AMBIENT ATMOSPHERIC DUST PARTICLES
  private createAmbientDust(): THREE.Points {
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = Math.random() * 20;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.18,
      transparent: true,
      opacity: 0.5,
    });
    return new THREE.Points(geo, mat);
  }

  // SPAWN INITIAL TRACK
  public resetRun() {
    this.distanceRan = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.gemsCollected = 0;
    this.fusionsCount = 0;
    this.speed = this.baseSpeed;
    this.currentLane = 0;
    this.currentLaneOffset = 0;
    this.targetLaneOffset = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.stumbleTimer = 0;
    this.stumbleSpeedPenalty = 0;
    this.currentBiome = 'ruins';
    this.currentZone = 'normal';
    this.zoneTimer = 0;
    this.golemDistance = 11.0;
    this.petMeter = 0;
    this.petAbilityActive = false;
    this.petAbilityTimer = 0;
    this.activePowerUps.clear();
    this.activeFusion = null;

    // Reset coordinates
    this.worldPosition.set(0, 0, 0);
    this.currentHeadingAngle = 0;
    this.targetHeadingAngle = 0;
    this.forwardVector.set(0, 0, -1);
    this.rightVector.set(1, 0, 0);

    this.playerGroup.position.set(0, 0, 0);
    this.playerGroup.rotation.y = 0;

    // Clear old track tiles
    for (const t of this.trackTiles) {
      this.scene.remove(t.group);
    }
    this.trackTiles = [];

    this.nextTileSpawnPos.set(0, 0, 0);
    this.nextTileHeading = 0;
    this.tilesSpawnedCount = 0;

    // Spawn starting safe runway (5 straight segments without obstacles)
    for (let i = 0; i < 5; i++) {
      this.spawnTrackTile('straight', false);
    }
    // Spawn remaining visible tiles
    for (let i = 5; i < this.visibleTilesCount; i++) {
      this.spawnNextTrackTile();
    }

    this.updateAtmosphereForZone('normal');
  }

  // SPAWN PROCEDURAL NEXT TILE
  private spawnNextTrackTile() {
    this.tilesSpawnedCount++;

    // Switch Biome every 20 tiles (~400 meters)
    if (this.tilesSpawnedCount % 22 === 0) {
      const biomes: BiomeType[] = ['ruins', 'bridge', 'mineshaft', 'jungle'];
      const nextIdx = (biomes.indexOf(this.currentBiome) + 1) % biomes.length;
      this.currentBiome = biomes[nextIdx];
    }

    // Decide tile type: Turn Left/Right or Straight or Chasm
    // Don't turn right after another turn (need at least 4 straights between turns)
    const recentTiles = this.trackTiles.slice(-4);
    const hasRecentTurn = recentTiles.some(t => t.type === 'turn_left' || t.type === 'turn_right');

    let tileType: 'straight' | 'turn_left' | 'turn_right' | 'chasm' = 'straight';
    const rand = Math.random();

    if (!hasRecentTurn && this.tilesSpawnedCount > 8) {
      if (rand < 0.16) {
        tileType = 'turn_left';
      } else if (rand < 0.32) {
        tileType = 'turn_right';
      } else if (rand < 0.42 && this.currentBiome === 'bridge') {
        tileType = 'chasm';
      }
    }

    this.spawnTrackTile(tileType, true);
  }

  // BUILD 3D TRACK TILE
  private spawnTrackTile(type: 'straight' | 'turn_left' | 'turn_right' | 'chasm', allowObstacles: boolean) {
    const tileGroup = new THREE.Group();
    const heading = this.nextTileHeading;
    const pos = this.nextTileSpawnPos.clone();
    tileGroup.position.copy(pos);
    tileGroup.rotation.y = heading;

    const fwd = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const rgt = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));

    const obstacles: ObstacleInstance[] = [];
    const coins: CoinInstance[] = [];
    let powerUp: PowerUpInstance | null = null;
    let portal: PortalInstance | null = null;

    const trackWidth = 7.2;
    const tileLen = this.tileLength;

    // Biome floor styling
    let floorMat: THREE.Material;
    let wallMat: THREE.Material;

    if (this.currentBiome === 'bridge') {
      // Wooden Planks with gaps
      floorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      wallMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.95 });
    } else if (this.currentBiome === 'mineshaft') {
      // Dark slate with iron rails
      floorMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      wallMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 });
    } else if (this.currentBiome === 'jungle') {
      // Mossy overgrown stone
      floorMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
      wallMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
    } else {
      // Ancient Temple Ruins (carved granite)
      floorMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 });
      wallMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.8 });
    }

    if (type === 'straight') {
      // Main track platform
      const floorGeo = new THREE.BoxGeometry(trackWidth, 1.2, tileLen);
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(0, -0.6, -tileLen / 2);
      floor.receiveShadow = true;
      tileGroup.add(floor);

      // Side balustrades / curbs
      const curbGeo = new THREE.BoxGeometry(0.5, 0.8, tileLen);
      const curbL = new THREE.Mesh(curbGeo, wallMat);
      curbL.position.set(-trackWidth / 2 + 0.25, 0.4, -tileLen / 2);
      tileGroup.add(curbL);
      const curbR = new THREE.Mesh(curbGeo, wallMat);
      curbR.position.set(trackWidth / 2 - 0.25, 0.4, -tileLen / 2);
      tileGroup.add(curbR);

      // Ancient Totem Pillars at corners
      if (this.tilesSpawnedCount % 2 === 0) {
        const pillarGeo = new THREE.CylinderGeometry(0.4, 0.45, 3.2, 8);
        const pillarL = new THREE.Mesh(pillarGeo, wallMat);
        pillarL.position.set(-trackWidth / 2 - 0.3, 1.6, -tileLen / 2);
        pillarL.castShadow = true;
        tileGroup.add(pillarL);

        const pillarR = new THREE.Mesh(pillarGeo, wallMat);
        pillarR.position.set(trackWidth / 2 + 0.3, 1.6, -tileLen / 2);
        pillarR.castShadow = true;
        tileGroup.add(pillarR);

        // Ancient Brazier with flickering fire
        const fire = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        fire.position.set(-trackWidth / 2 - 0.3, 3.3, -tileLen / 2);
        tileGroup.add(fire);
      }

      // Populate with Obstacles, Coins, PowerUps, or Portals
      if (allowObstacles) {
        const itemRoll = Math.random();

        // 1. Elemental Portal Gate (Rare: ~6% chance)
        if (itemRoll < 0.08 && this.tilesSpawnedCount > 15) {
          const zones: ElementalZone[] = ['frost', 'windstorm', 'inferno'];
          const chosenZone = zones[Math.floor(Math.random() * zones.length)];
          const portalGroup = this.createPortalGateMesh(chosenZone, trackWidth);
          portalGroup.position.set(0, 0, -tileLen / 2);
          tileGroup.add(portalGroup);

          const portalWorldPos = pos.clone().add(fwd.clone().multiplyScalar(tileLen / 2));
          portal = { group: portalGroup, zone: chosenZone, pos: portalWorldPos, passed: false };
        }
        // 2. Obstacles (~65% chance)
        else if (itemRoll < 0.72) {
          const obs = this.generateObstacleForTile(tileGroup, tileLen, pos, fwd, rgt);
          if (obs) obstacles.push(obs);
        }
        // 3. Power-Up Relic (~15% chance)
        else if (itemRoll < 0.88) {
          const ptypes: PowerUpType[] = ['magnet', 'shield', 'dash', 'multiplier'];
          const ptype = ptypes[Math.floor(Math.random() * ptypes.length)];
          const pLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
          const pGroup = this.createPowerUpMesh(ptype);
          pGroup.position.set(pLane * this.laneWidth, 1.2, -tileLen / 2);
          tileGroup.add(pGroup);

          const pWorldPos = pos.clone()
            .add(fwd.clone().multiplyScalar(tileLen / 2))
            .add(rgt.clone().multiplyScalar(pLane * this.laneWidth));
          powerUp = { group: pGroup, type: ptype, pos: pWorldPos, lane: pLane, collected: false };
        }

        // Spawn Coin Ribbon on straight track
        this.generateCoinsForTile(tileGroup, tileLen, pos, fwd, rgt, coins);
      }

      // Next spawn position advances straight forward
      this.nextTileSpawnPos.add(fwd.clone().multiplyScalar(tileLen));
    }
    else if (type === 'chasm') {
      // Broken Bridge / Gap Jump (missing floor middle)
      const partLen = tileLen * 0.3;
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 1.2, partLen), floorMat);
      f1.position.set(0, -0.6, -partLen / 2);
      tileGroup.add(f1);

      const f2 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 1.2, partLen), floorMat);
      f2.position.set(0, -0.6, -tileLen + partLen / 2);
      tileGroup.add(f2);

      // Warning glowing runes at the edge of the pit
      const runeBar = new THREE.Mesh(new THREE.BoxGeometry(trackWidth * 0.8, 0.1, 0.4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      runeBar.position.set(0, 0.05, -partLen);
      tileGroup.add(runeBar);

      // Obstacle: Must Jump!
      const obsWorldPos = pos.clone().add(fwd.clone().multiplyScalar(tileLen / 2));
      obstacles.push({
        group: tileGroup,
        type: 'hurdle', // requires jump
        lane: 0,
        pos: obsWorldPos,
        passed: false,
      });

      // Spawn coins in a high rainbow arc over the chasm
      for (let i = 0; i < 5; i++) {
        const t = (i + 1) / 6;
        const cMesh = this.createCoinMesh('coin');
        const cLocalZ = -tileLen * t;
        const cLocalY = 1.0 + Math.sin(t * Math.PI) * 3.2; // arc up to 4.2m
        cMesh.position.set(0, cLocalY, cLocalZ);
        tileGroup.add(cMesh);

        const cWorldPos = pos.clone().add(fwd.clone().multiplyScalar(Math.abs(cLocalZ)));
        cWorldPos.y = cLocalY;
        coins.push({ mesh: cMesh, type: 'coin', pos: cWorldPos, lane: 0, collected: false });
      }

      this.nextTileSpawnPos.add(fwd.clone().multiplyScalar(tileLen));
    }
    else if (type === 'turn_left' || type === 'turn_right') {
      // 90° CORNER INTERSECTION PLATFORM
      // Square intersection box (trackWidth x trackWidth)
      const interSize = trackWidth;
      const cornerFloor = new THREE.Mesh(new THREE.BoxGeometry(interSize, 1.2, interSize), floorMat);
      cornerFloor.position.set(0, -0.6, -interSize / 2);
      tileGroup.add(cornerFloor);

      const isLeft = type === 'turn_left';
      const deltaAngle = isLeft ? Math.PI / 2 : -Math.PI / 2;

      // Outer wall blocking straight ahead (player will crash into it if they don't turn!)
      const barrierGeo = new THREE.BoxGeometry(interSize, 3.2, 0.8);
      const barrier = new THREE.Mesh(barrierGeo, wallMat);
      barrier.position.set(0, 1.6, -interSize);
      barrier.castShadow = true;
      tileGroup.add(barrier);

      // Ancient glowing turn prompt glyph on the wall
      const arrowGeo = new THREE.OctahedronGeometry(0.7);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 2.0, -interSize + 0.5);
      tileGroup.add(arrow);

      // Inner corner post
      const postX = isLeft ? interSize / 2 : -interSize / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3.6, 8), wallMat);
      post.position.set(postX, 1.8, 0);
      tileGroup.add(post);

      // Advance spawn position to the corner center, then turn heading
      this.nextTileSpawnPos.add(fwd.clone().multiplyScalar(interSize / 2));
      this.nextTileHeading += deltaAngle;
      // Normalise angle to [-PI, PI]
      this.nextTileHeading = Math.atan2(Math.sin(this.nextTileHeading), Math.cos(this.nextTileHeading));

      const newFwd = new THREE.Vector3(-Math.sin(this.nextTileHeading), 0, -Math.cos(this.nextTileHeading));
      this.nextTileSpawnPos.add(newFwd.clone().multiplyScalar(interSize / 2));
    }

    this.scene.add(tileGroup);

    const tileRecord: TrackTile = {
      group: tileGroup,
      type,
      position: pos,
      direction: fwd,
      right: rgt,
      rotationY: heading,
      biome: this.currentBiome,
      length: tileLen,
      active: true,
      obstacles,
      coins,
      powerUp,
      portal,
    };

    this.trackTiles.push(tileRecord);

    // Recycle oldest tiles if count exceeds limit
    if (this.trackTiles.length > this.visibleTilesCount + 4) {
      const oldest = this.trackTiles.shift();
      if (oldest) {
        this.scene.remove(oldest.group);
      }
    }
  }

  // GENERATE OBSTACLE
  private generateObstacleForTile(
    tileGroup: THREE.Group,
    tileLen: number,
    tileWorldPos: THREE.Vector3,
    fwd: THREE.Vector3,
    rgt: THREE.Vector3
  ): ObstacleInstance | null {
    const obsTypes: ObstacleInstance['type'][] = ['hurdle', 'slide_blade', 'left_block', 'right_block', 'center_block', 'fire_ring'];
    const chosenType = obsTypes[Math.floor(Math.random() * obsTypes.length)];
    const obsGroup = new THREE.Group();
    let lane = 0;
    const zOffset = -tileLen * 0.55;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    if (chosenType === 'hurdle') {
      // Fallen ancient tree trunk or stone bar (MUST JUMP)
      const hurdle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 6.4, 8), woodMat);
      hurdle.rotation.z = Math.PI / 2;
      hurdle.position.set(0, 0.45, zOffset);
      hurdle.castShadow = true;
      obsGroup.add(hurdle);
    }
    else if (chosenType === 'slide_blade') {
      // Rotating swinging pendulum / low archway blade (MUST SLIDE)
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.5), stoneMat);
      archL.position.set(-3.2, 1.75, zOffset);
      obsGroup.add(archL);

      const archR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.5), stoneMat);
      archR.position.set(3.2, 1.75, zOffset);
      obsGroup.add(archR);

      // Low blade bar positioned at head height (1.6m high) so sliding rolls underneath
      const blade = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.2, 0.3), hazardMat);
      blade.position.set(0, 1.8, zOffset);
      obsGroup.add(blade);
    }
    else if (chosenType === 'fire_ring') {
      // Blazing ring obstacle (MUST SLIDE)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 8, 16), hazardMat);
      ring.position.set(0, 2.2, zOffset);
      obsGroup.add(ring);
    }
    else if (chosenType === 'left_block') {
      // Rubble pile blocking Left Lane (-1)
      lane = -1;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), stoneMat);
      rock.position.set(-this.laneWidth, 1.1, zOffset);
      rock.castShadow = true;
      obsGroup.add(rock);
    }
    else if (chosenType === 'right_block') {
      // Spiked totem blocking Right Lane (+1)
      lane = 1;
      const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.8, 6), stoneMat);
      totem.position.set(this.laneWidth, 1.4, zOffset);
      totem.castShadow = true;
      obsGroup.add(totem);
    }
    else if (chosenType === 'center_block') {
      // Ancient idol blocking Center Lane (0)
      lane = 0;
      const idol = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.4), stoneMat);
      idol.position.set(0, 1.3, zOffset);
      idol.castShadow = true;
      obsGroup.add(idol);
    }

    tileGroup.add(obsGroup);

    const obsWorldPos = tileWorldPos.clone()
      .add(fwd.clone().multiplyScalar(Math.abs(zOffset)))
      .add(rgt.clone().multiplyScalar(lane * this.laneWidth));

    return {
      group: obsGroup,
      type: chosenType,
      lane,
      pos: obsWorldPos,
      passed: false,
    };
  }

  // GENERATE COIN RIBBONS
  private generateCoinsForTile(
    tileGroup: THREE.Group,
    tileLen: number,
    tilePos: THREE.Vector3,
    fwd: THREE.Vector3,
    rgt: THREE.Vector3,
    coinsArray: CoinInstance[]
  ) {
    const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const numCoins = 4;
    const isGemRun = Math.random() < 0.15; // 15% chance to spawn rare gems

    for (let i = 0; i < numCoins; i++) {
      const zOffset = -tileLen * (0.25 + (i * 0.15));
      const type = isGemRun && i === numCoins - 1 ? 'gem' : 'coin';
      const cMesh = this.createCoinMesh(type);
      cMesh.position.set(lane * this.laneWidth, 0.85, zOffset);
      tileGroup.add(cMesh);

      const cWorldPos = tilePos.clone()
        .add(fwd.clone().multiplyScalar(Math.abs(zOffset)))
        .add(rgt.clone().multiplyScalar(lane * this.laneWidth));
      cWorldPos.y = 0.85;

      coinsArray.push({
        mesh: cMesh,
        type,
        pos: cWorldPos,
        lane,
        collected: false,
      });
    }
  }

  // CREATE 3D COIN / GEM MESH
  private createCoinMesh(type: 'coin' | 'gem'): THREE.Mesh {
    if (type === 'gem') {
      const geo = new THREE.OctahedronGeometry(0.35);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xec4899,
        emissive: 0xbe185d,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
      });
      return new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.9,
      });
      const coin = new THREE.Mesh(geo, mat);
      coin.rotation.x = Math.PI / 2;
      return coin;
    }
  }

  // CREATE POWERUP RELIC MESH
  private createPowerUpMesh(type: PowerUpType): THREE.Group {
    const group = new THREE.Group();
    let col = 0x38bdf8;
    if (type === 'shield') col = 0x10b981;
    if (type === 'dash') col = 0xf97316;
    if (type === 'multiplier') col = 0xa855f7;

    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.45, 1),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.2 })
    );
    group.add(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.06, 8, 16),
      new THREE.MeshBasicMaterial({ color: col })
    );
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    return group;
  }

  // CREATE ELEMENTAL PORTAL GATE MESH
  private createPortalGateMesh(zone: ElementalZone, trackWidth: number): THREE.Group {
    const group = new THREE.Group();
    let ringCol = 0x38bdf8; // Frost
    if (zone === 'windstorm') ringCol = 0xf59e0b;
    if (zone === 'inferno') ringCol = 0xef4444;

    // Glowing Ancient Stone Pillars on sides
    const pillarGeo = new THREE.BoxGeometry(0.8, 5.5, 0.8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-trackWidth / 2 + 0.4, 2.75, 0);
    group.add(pL);

    const pR = new THREE.Mesh(pillarGeo, pillarMat);
    pR.position.set(trackWidth / 2 - 0.4, 2.75, 0);
    group.add(pR);

    // Glowing Portal Torus Ring
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.28, 12, 24),
      new THREE.MeshStandardMaterial({ color: ringCol, emissive: ringCol, emissiveIntensity: 0.8, roughness: 0.2 })
    );
    torus.position.y = 2.6;
    torus.name = 'portalRing';
    group.add(torus);

    return group;
  }

  // ZONE ATMOSPHERE UPDATE
  private updateAtmosphereForZone(zone: ElementalZone) {
    if (zone === 'frost') {
      this.scene.fog = new THREE.FogExp2(0x0c4a6e, 0.022);
      this.renderer.setClearColor(0x082f49);
      this.ambientLight.color.setHex(0x7dd3fc);
    } else if (zone === 'windstorm') {
      this.scene.fog = new THREE.FogExp2(0x451a03, 0.02);
      this.renderer.setClearColor(0x291b00);
      this.ambientLight.color.setHex(0xfde68a);
    } else if (zone === 'inferno') {
      this.scene.fog = new THREE.FogExp2(0x450a0a, 0.024);
      this.renderer.setClearColor(0x2d0606);
      this.ambientLight.color.setHex(0xfca5a5);
    } else {
      // Normal Ruins
      this.scene.fog = new THREE.FogExp2(0x1a1816, 0.018);
      this.renderer.setClearColor(0x141210);
      this.ambientLight.color.setHex(0xffeedd);
    }
  }

  // INPUT ACTIONS
  public moveLeft() {
    if (!this.isRunning || this.isPaused) return;

    // Check if we are right on a 90° Turn Left intersection!
    const activeTurn = this.findNearbyTurn();
    if (activeTurn && activeTurn.type === 'turn_left' && !activeTurn.turnTriggered) {
      this.executeCornerTurn('left', activeTurn);
      return;
    }

    if (this.currentLane > -1) {
      this.currentLane--;
      this.targetLaneOffset = this.currentLane * this.laneWidth;
      sound.playSwipe();
    }
  }

  public moveRight() {
    if (!this.isRunning || this.isPaused) return;

    // Check if we are right on a 90° Turn Right intersection!
    const activeTurn = this.findNearbyTurn();
    if (activeTurn && activeTurn.type === 'turn_right' && !activeTurn.turnTriggered) {
      this.executeCornerTurn('right', activeTurn);
      return;
    }

    if (this.currentLane < 1) {
      this.currentLane++;
      this.targetLaneOffset = this.currentLane * this.laneWidth;
      sound.playSwipe();
    }
  }

  public jump() {
    if (!this.isRunning || this.isPaused) return;
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      // High floaty jump in windstorm zone!
      const jumpPower = this.currentZone === 'windstorm' ? 14.5 : 10.8;
      this.playerVY = jumpPower;
      sound.playJump();
    }
  }

  public slide() {
    if (!this.isRunning || this.isPaused) return;
    this.isSliding = true;
    this.slideTimer = 0.75; // duration of slide
    // Fast drop if in the air
    if (this.isJumping) {
      this.playerVY = -12.0;
    }
    sound.playSlide();
  }

  // Find if player is near a turn tile
  private findNearbyTurn(): TrackTile | null {
    for (const t of this.trackTiles) {
      if (t.type === 'turn_left' || t.type === 'turn_right') {
        const dist = this.worldPosition.distanceTo(t.position);
        if (dist < 6.5) {
          return t;
        }
      }
    }
    return null;
  }

  // EXECUTE 90° CORNER TURN
  private executeCornerTurn(dir: 'left' | 'right', tile: TrackTile) {
    tile.turnTriggered = true;
    sound.playSwipe();

    const delta = dir === 'left' ? Math.PI / 2 : -Math.PI / 2;
    this.targetHeadingAngle = this.currentHeadingAngle + delta;
    this.currentHeadingAngle = this.targetHeadingAngle;

    // Snap world position close to the intersection pivot
    this.forwardVector.set(-Math.sin(this.currentHeadingAngle), 0, -Math.cos(this.currentHeadingAngle));
    this.rightVector.set(Math.cos(this.currentHeadingAngle), 0, -Math.sin(this.currentHeadingAngle));

    // Reset lane to center on corner turn
    this.currentLane = 0;
    this.targetLaneOffset = 0;
    this.currentLaneOffset = 0;

    // Score bonus for clean corner drift
    this.score += 250;
  }

  // TRIGGER PET ABILITY (Manual click or auto)
  public triggerPetAbility() {
    if (!this.isRunning || this.isPaused || this.petAbilityActive) return;
    if (this.petMeter < this.pet.cooldownMeters) return;

    this.petMeter = 0;
    this.petAbilityActive = true;
    this.petAbilityTimer = this.pet.durationSeconds;
    sound.playPetAbility();
    this.callbacks.onPetAbilityTriggered(this.pet.name, this.pet.abilityName);

    // Immediate Pet Ability effects
    if (this.pet.id === 'fox') {
      // Clear obstacles ahead on visible tiles
      for (const t of this.trackTiles) {
        for (const obs of t.obstacles) {
          obs.cleared = true;
          obs.group.visible = false;
        }
      }
    } else if (this.pet.id === 'wolf') {
      // Knock back the chasing Golem to safe distance!
      this.golemDistance = 14.0;
      sound.playGolemRoar();
    }
  }

  // KEYBOARD HANDLER
  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isRunning || this.isPaused) return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.moveLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.moveRight();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      this.jump();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.slide();
    } else if (e.code === 'KeyE' || e.code === 'KeyF') {
      this.triggerPetAbility();
    }
  };

  // RESIZE HANDLER
  public onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // START RUN
  public start() {
    this.isRunning = true;
    this.isPaused = false;
    sound.startAmbientDrums();
    this.lastTime = performance.now();
    this.loop();
  }

  // PAUSE / RESUME
  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  // DESTROY / CLEANUP
  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    sound.stopAmbientDrums();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  // UPDATE CHARACTER & PET
  public setCharacter(char: CharacterConfig) {
    this.character = char;
  }

  public setPet(pet: PetConfig) {
    this.pet = pet;
    this.scene.remove(this.petGroup);
    this.petGroup = this.createPetModel();
    this.scene.add(this.petGroup);
  }

  // MAIN GAME LOOP
  private lastTime: number = performance.now();

  private loop = () => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.isPaused) return;

    this.update(dt);
    this.render();
  };

  // ENGINE UPDATE LOGIC
  private update(dt: number) {
    // 1. Calculate effective speed
    let effectiveSpeed = this.speed - this.stumbleSpeedPenalty;
    if (this.activePowerUps.has('dash') || this.activeFusion?.type === 'void_vortex' || this.activeFusion?.type === 'juggernaut_ram') {
      effectiveSpeed *= 1.45;
    }
    if (this.currentZone === 'inferno') {
      effectiveSpeed *= 1.25;
    }

    // Accelerate gradually over distance
    this.speed = Math.min(this.maxSpeed, this.baseSpeed + (this.distanceRan / 500) * 1.5);

    // 2. Advance World Position along forward vector
    const moveDist = effectiveSpeed * dt;
    this.worldPosition.add(this.forwardVector.clone().multiplyScalar(moveDist));
    this.distanceRan += moveDist;

    // Score calculation
    const baseMult = this.character.passiveMultiplier || 1.0;
    const zoneMult = this.currentZone === 'frost' ? 3.0 : 1.0;
    this.score += Math.floor(moveDist * 2.5 * baseMult * zoneMult);

    // 3. Stumble recovery
    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
      if (this.stumbleTimer <= 0) {
        this.stumbleSpeedPenalty = 0;
      }
    }

    // 4. Companion Pet Meter & Ability Duration
    if (!this.petAbilityActive) {
      this.petMeter += moveDist;
      // Auto-trigger if ready!
      if (this.petMeter >= this.pet.cooldownMeters) {
        this.triggerPetAbility();
      }
    } else {
      this.petAbilityTimer -= dt;
      if (this.petAbilityTimer <= 0) {
        this.petAbilityActive = false;
      }
    }

    // 5. Elemental Zone Timer
    if (this.currentZone !== 'normal') {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) {
        this.currentZone = 'normal';
        this.updateAtmosphereForZone('normal');
      }
    }

    // 6. Power-ups & Fusion Timers
    for (const [ptype, info] of Array.from(this.activePowerUps.entries())) {
      info.remaining -= dt;
      if (info.remaining <= 0) {
        this.activePowerUps.delete(ptype);
      }
    }

    if (this.activeFusion) {
      this.activeFusion.remaining -= dt;
      if (this.activeFusion.remaining <= 0) {
        this.activeFusion = null;
      }
    }

    // 7. Update Lane interpolation
    // Frost zone adds slippery sliding inertia!
    const laneLerpSpeed = this.currentZone === 'frost' ? 7.0 : 14.0;
    this.currentLaneOffset += (this.targetLaneOffset - this.currentLaneOffset) * Math.min(1.0, dt * laneLerpSpeed);

    // 8. Player Jumping & Gravity Physics
    const gravity = this.currentZone === 'windstorm' ? 16.0 : 28.0;
    if (this.isJumping) {
      this.playerY += this.playerVY * dt;
      this.playerVY -= gravity * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVY = 0;
        this.isJumping = false;
      }
    }

    // 9. Slide Timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 10. Update Player Model Position & Animation
    const playerWorldPos = this.worldPosition.clone().add(this.rightVector.clone().multiplyScalar(this.currentLaneOffset));
    playerWorldPos.y = this.playerY;
    this.playerGroup.position.copy(playerWorldPos);
    this.playerGroup.rotation.y = this.currentHeadingAngle;

    // Torch light follows player
    this.playerTorchLight.position.set(playerWorldPos.x, playerWorldPos.y + 2, playerWorldPos.z);
    this.dirLight.position.set(playerWorldPos.x + 15, playerWorldPos.y + 35, playerWorldPos.z + 15);
    this.dirLight.target = this.playerGroup;

    // Running animation bones
    this.runAnimTime += dt * effectiveSpeed * 1.2;
    if (this.isSliding) {
      this.playerGroup.scale.set(1.0, 0.45, 1.3);
      this.playerGroup.position.y = -0.15;
    } else {
      this.playerGroup.scale.set(1.0, 1.0, 1.0);
      const legAngle = Math.sin(this.runAnimTime) * 0.75;
      this.playerLimbLeft.rotation.x = legAngle;
      this.playerLimbRight.rotation.x = -legAngle;
      this.playerArmLeft.rotation.x = -legAngle;
      this.playerArmRight.rotation.x = legAngle;
      // Slight body bounce
      this.playerBodyMesh.position.y = 1.35 + Math.abs(Math.sin(this.runAnimTime)) * 0.08;
    }

    // Shield visibility
    const shieldMesh = this.playerGroup.getObjectByName('playerShield') as THREE.Mesh;
    const hasShield = this.activePowerUps.has('shield') || this.activeFusion !== null || (this.pet.id === 'hawk' && this.petAbilityActive);
    if (shieldMesh && shieldMesh.material) {
      (shieldMesh.material as THREE.MeshBasicMaterial).opacity = hasShield ? 0.6 : 0;
      shieldMesh.rotation.y += dt * 3.0;
    }

    // 11. Companion Pet Following
    const petTargetPos = this.worldPosition.clone()
      .add(this.rightVector.clone().multiplyScalar(this.currentLaneOffset + 1.8))
      .add(this.forwardVector.clone().multiplyScalar(-0.6));
    petTargetPos.y = this.pet.id === 'hawk' ? 2.5 + Math.sin(this.runAnimTime * 0.8) * 0.4 : this.playerY;

    this.petGroup.position.lerp(petTargetPos, dt * 10);
    this.petGroup.rotation.y = this.currentHeadingAngle;

    // Pet Wing / Tail animation
    const petWings = this.petGroup.getObjectByName('petWings');
    if (petWings) {
      petWings.rotation.z = Math.sin(this.runAnimTime * 2.5) * 0.35;
    }
    const petTail = this.petGroup.getObjectByName('petTail');
    if (petTail) {
      petTail.rotation.y = Math.sin(this.runAnimTime * 1.5) * 0.4;
    }

    // 12. Monolithic Golem Stalking Logic
    // If player runs smoothly, Golem gradually drops back
    if (this.stumbleTimer <= 0) {
      this.golemDistance = Math.min(14.0, this.golemDistance + dt * 0.45);
    } else {
      // Golem surges forward on stumble!
      this.golemDistance = Math.max(1.8, this.golemDistance - dt * 2.5);
    }

    // Golem catch game-over!
    if (this.golemDistance <= 2.2) {
      this.triggerGameOver('Smashed by the Monolithic Stone Golem!');
      return;
    }

    const golemPos = this.worldPosition.clone().add(this.forwardVector.clone().multiplyScalar(-this.golemDistance));
    this.golemGroup.position.copy(golemPos);
    this.golemGroup.rotation.y = this.currentHeadingAngle;

    // Golem Fist swinging animation
    const golemArmSwing = Math.sin(this.runAnimTime * 0.8) * 0.6;
    this.golemFistLeft.rotation.x = golemArmSwing;
    this.golemFistRight.rotation.x = -golemArmSwing;

    // 13. Third-Person Camera Positioning (Behind-the-Back smooth chase cam)
    const camOffset = this.forwardVector.clone().multiplyScalar(-5.4).add(new THREE.Vector3(0, 3.8, 0));
    // Follow lane offset slightly
    camOffset.add(this.rightVector.clone().multiplyScalar(this.currentLaneOffset * 0.4));
    const targetCamPos = this.worldPosition.clone().add(camOffset);
    this.camera.position.lerp(targetCamPos, dt * 12);

    const lookTarget = this.worldPosition.clone().add(this.forwardVector.clone().multiplyScalar(6)).add(new THREE.Vector3(0, 1.4, 0));
    this.camera.lookAt(lookTarget);

    // 14. Collision & Interaction Checks
    this.checkCollisions(playerWorldPos);

    // 15. Check for Corner Turn Failures (Falling off the track)
    this.checkCornerTurnFailure();

    // 16. Spawning Track Ahead
    const lastTile = this.trackTiles[this.trackTiles.length - 1];
    if (lastTile) {
      const distToFront = this.worldPosition.distanceTo(lastTile.position);
      if (distToFront < this.visibleTilesCount * this.tileLength * 0.85) {
        this.spawnNextTrackTile();
      }
    }

    // 17. Send HUD telemetry
    this.callbacks.onScoreUpdate({
      score: this.score,
      distance: Math.floor(this.distanceRan),
      coins: this.coinsCollected,
      gems: this.gemsCollected,
      petMeter: Math.min(100, (this.petMeter / this.pet.cooldownMeters) * 100),
      petReady: this.petMeter >= this.pet.cooldownMeters,
      golemDistance: Math.max(0, Math.min(100, ((this.golemDistance - 2) / 10) * 100)),
      zone: this.currentZone,
      activePowerUps: Array.from(this.activePowerUps.entries()).map(([k, v]) => ({ type: k, remaining: Math.ceil(v.remaining) })),
      activeFusion: this.activeFusion ? { type: this.activeFusion.type, name: this.activeFusion.name, remaining: Math.ceil(this.activeFusion.remaining) } : null,
    });
  }

  // CHECK CORNER TURN FAILURE
  private checkCornerTurnFailure() {
    for (const t of this.trackTiles) {
      if ((t.type === 'turn_left' || t.type === 'turn_right') && !t.turnTriggered) {
        // Did the player run past the intersection straight into the abyss/barrier?
        const toPlayer = this.worldPosition.clone().sub(t.position);
        const dotFwd = toPlayer.dot(t.direction);
        if (dotFwd > 4.5) {
          // Missed the turn! Fall off the cliff!
          sound.playCrash();
          this.triggerGameOver('Plunged off the temple precipice! Missed 90° turn.');
          return;
        }
      }
    }
  }

  // COLLISION DETECTION & ITEM COLLECTION
  private checkCollisions(playerPos: THREE.Vector3) {
    const isImmune = this.activePowerUps.has('shield') ||
      this.activePowerUps.has('dash') ||
      this.activeFusion !== null ||
      (this.pet.id === 'hawk' && this.petAbilityActive);

    const isMagnetActive = this.activePowerUps.has('magnet') ||
      this.activeFusion?.type === 'void_vortex' ||
      this.activeFusion?.type === 'aegis_graviton' ||
      (this.pet.id === 'panther' && this.petAbilityActive);

    const coinRadius = this.magnetRadius * (this.character.passiveMultiplier > 1.2 ? 1.3 : 1.0);

    for (const tile of this.trackTiles) {
      // 1. Obstacles
      for (const obs of tile.obstacles) {
        if (obs.passed || obs.cleared) continue;

        const dist = playerPos.distanceTo(obs.pos);
        if (dist < 2.0) {
          // Check dodge conditions:
          let avoided = false;

          if (obs.type === 'hurdle' && this.isJumping && this.playerY > 1.0) {
            avoided = true; // successfully jumped over!
          } else if ((obs.type === 'slide_blade' || obs.type === 'fire_ring') && this.isSliding) {
            avoided = true; // successfully slid under!
          } else if (obs.type === 'left_block' && this.currentLane !== -1) {
            avoided = true; // not in left lane
          } else if (obs.type === 'right_block' && this.currentLane !== 1) {
            avoided = true; // not in right lane
          } else if (obs.type === 'center_block' && this.currentLane !== 0) {
            avoided = true; // not in center lane
          }

          if (!avoided) {
            obs.passed = true;
            if (isImmune) {
              // Destroy obstacle with shield or fusion!
              sound.playCrash();
              obs.cleared = true;
              obs.group.visible = false;
              // Remove shield if standard shield
              if (this.activePowerUps.has('shield') && !this.activeFusion) {
                this.activePowerUps.delete('shield');
              }
            } else {
              // Stumble or Fatal Crash!
              if (this.golemDistance < 5.0) {
                // Already stumbled once and Golem was close -> Fatal hit!
                sound.playCrash();
                this.triggerGameOver('Stumbled into an ancient ruin hazard and caught by the Monolith!');
                return;
              } else {
                // First stumble: trip, slow down, Golem closes distance!
                sound.playStumble();
                this.stumbleTimer = 2.4;
                this.stumbleSpeedPenalty = 8.0;
                this.golemDistance = 3.5; // Golem lunges right behind you!
                sound.playGolemRoar();
              }
            }
          }
        }
      }

      // 2. Coins & Gems
      for (const coin of tile.coins) {
        if (coin.collected) continue;

        const dist = playerPos.distanceTo(coin.pos);

        // Magnetic Attraction
        if (isMagnetActive && dist < coinRadius) {
          coin.pos.lerp(playerPos, 0.22);
          coin.mesh.position.copy(coin.pos.clone().sub(tile.position));
        }

        if (dist < 1.6) {
          coin.collected = true;
          coin.mesh.visible = false;

          if (coin.type === 'gem') {
            this.gemsCollected++;
            this.score += 500;
            sound.playGem();
          } else {
            const coinVal = this.currentZone === 'frost' ? 3 : (this.pet.id === 'panther' && this.petAbilityActive ? 3 : 1);
            this.coinsCollected += coinVal;
            this.score += 50 * coinVal;
            sound.playCoin();
          }
        }
      }

      // 3. Power-Up Relics
      if (tile.powerUp && !tile.powerUp.collected) {
        const dist = playerPos.distanceTo(tile.powerUp.pos);
        if (dist < 2.0) {
          tile.powerUp.collected = true;
          tile.powerUp.group.visible = false;
          sound.playPowerUp();
          this.applyPowerUp(tile.powerUp.type);
        }
      }

      // 4. Elemental Portals
      if (tile.portal && !tile.portal.passed) {
        const dist = playerPos.distanceTo(tile.portal.pos);
        if (dist < 3.0) {
          tile.portal.passed = true;
          sound.playPortal();
          this.currentZone = tile.portal.zone;
          this.zoneTimer = 12.0; // 12 seconds in elemental zone
          this.updateAtmosphereForZone(tile.portal.zone);
          this.callbacks.onPortalEnter(tile.portal.zone);
        }
      }
    }
  }

  // POWERUP COLLECTION & FUSION SYNERGY
  private applyPowerUp(newType: PowerUpType) {
    const duration = 10.0;

    // Check for Fusion Synergy with currently active powerup!
    const activeTypes = Array.from(this.activePowerUps.keys());
    if (activeTypes.length > 0 && !activeTypes.includes(newType) && !this.activeFusion) {
      const otherType = activeTypes[0];
      const fusion = this.calculateFusion(otherType, newType);
      if (fusion) {
        this.activeFusion = fusion;
        this.fusionsCount++;
        sound.playFusion();
        this.callbacks.onFusionTriggered(fusion.name);
        return;
      }
    }

    this.activePowerUps.set(newType, { remaining: duration, duration });
  }

  // FUSION MATRIX
  private calculateFusion(a: PowerUpType, b: PowerUpType): ActiveFusion | null {
    const pair = [a, b].sort().join('+');
    if (pair === 'dash+magnet') {
      return {
        type: 'void_vortex',
        name: 'Void Vortex',
        remainingTime: 12.0,
        remaining: 12.0,
        duration: 12.0,
        description: 'Gravitational rift: Sucks all relics across the canyon while phasing through all obstacles!',
      };
    } else if (pair === 'magnet+shield') {
      return {
        type: 'aegis_graviton',
        name: 'Aegis Graviton',
        remainingTime: 12.0,
        remaining: 12.0,
        duration: 12.0,
        description: 'Magnetic forcefield: Deflects hazards into pure gold and pulls distant treasures.',
      };
    } else if (pair === 'dash+shield') {
      return {
        type: 'juggernaut_ram',
        name: 'Juggernaut Ram',
        remainingTime: 12.0,
        remaining: 12.0,
        duration: 12.0,
        description: 'Invulnerable battering ram: Obliterates any barrier into coin showers.',
      };
    } else {
      return {
        type: 'solar_storm',
        name: 'Solar Storm',
        remainingTime: 12.0,
        remaining: 12.0,
        duration: 12.0,
        description: 'Supercharged synergy: Triples score output and creates blazing coin trails.',
      };
    }
  }

  // TRIGGER GAME OVER
  private triggerGameOver(reason: string) {
    this.isRunning = false;
    sound.stopAmbientDrums();
    sound.playCrash();

    this.callbacks.onGameOver(reason, {
      score: this.score,
      distance: Math.floor(this.distanceRan),
      coins: this.coinsCollected,
      gems: this.gemsCollected,
      fusions: this.fusionsCount,
    });
  }

  // RENDER THREE.JS SCENE
  private render() {
    this.renderer.render(this.scene, this.camera);
  }
}
