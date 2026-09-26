/**
 * Procedural Web Audio API Sound Synthesizer
 * No external audio files needed - runs hermetically anywhere with zero latency.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;
  private drumIntervalId: number | null = null;
  private drumStep: number = 0;
  private coinPitchIndex: number = 0;
  private coinFrequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.isMusicEnabled = !this.isMusicEnabled;
    if (this.isMusicEnabled) {
      this.startAmbientDrums();
    } else {
      this.stopAmbientDrums();
    }
    return this.isMusicEnabled;
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  // JUMP SOUND: Swift airy upward pitch glide
  public playJump() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // SLIDE SOUND: Gritty friction noise + low sweep
  public playSlide() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  // COIN SOUND: Clean resonant bell with melodic scale succession
  public playCoin() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const freq = this.coinFrequencies[this.coinPitchIndex % this.coinFrequencies.length];
    this.coinPitchIndex = (this.coinPitchIndex + 1) % this.coinFrequencies.length;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // RESET COIN PITCH
  public resetCoinPitch() {
    this.coinPitchIndex = 0;
  }

  // GEM SOUND: Dual sparkling bell
  public playGem() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [1046.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.2, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.25);
    });
  }

  // LANE CHANGE / SWIPE SWOOSH
  public playSwipe() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  // POWERUP COLLECTED
  public playPowerUp() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const chords = [392, 523.25, 659.25, 783.99];
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.25, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  // FUSION TRIGGERED (EPIC HARMONIC FANFARE)
  public playFusion() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Sub-bass sweep
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(160, now + 0.3);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.65);

    // Radiant triad
    [440, 554.37, 659.25, 880, 1108.7].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + idx * 0.05);

      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.55);
    });
  }

  // ELEMENTAL PORTAL ENTER
  public playPortal() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.45);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  // STUMBLE / TRIP WARNING
  public playStumble() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  // MONOLITHIC GOLEM ROAR
  public playGolemRoar() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(75, now);
    osc1.frequency.linearRampToValueAtTime(110, now + 0.3);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.85);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(72, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.85);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(580, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.85);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
  }

  // CRASH / GAME OVER
  public playCrash() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    
    // Low punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);

    // Stone shatter noise
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // PET ABILITY TRIGGER
  public playPetAbility() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // PROCEDURAL AMBIENT TRIBAL DRUMS
  public startAmbientDrums() {
    this.initCtx();
    if (!this.isMusicEnabled || this.drumIntervalId !== null) return;

    // 130 BPM tempo
    const stepTime = (60 / 130 / 2) * 1000; // 16th-note ticks
    this.drumStep = 0;

    this.drumIntervalId = window.setInterval(() => {
      if (this.isMuted || !this.isMusicEnabled || !this.ctx || !this.musicGain) return;

      const now = this.ctx.currentTime;
      const step = this.drumStep % 16;
      this.drumStep++;

      // Heavy temple kick on steps 0, 4, 8, 11, 14 (tribal syncopation)
      if (step === 0 || step === 4 || step === 8 || step === 11 || step === 14) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(step === 0 ? 110 : 85, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.18);
      }

      // Resonant ancient log drum on steps 2, 6, 10, 12
      if (step === 2 || step === 6 || step === 10 || step === 12) {
        const logOsc = this.ctx.createOscillator();
        const logGain = this.ctx.createGain();
        logOsc.type = 'triangle';
        logOsc.frequency.setValueAtTime(step === 2 ? 220 : 180, now);
        logOsc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
        logGain.gain.setValueAtTime(0.2, now);
        logGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        logOsc.connect(logGain);
        logGain.connect(this.musicGain);
        logOsc.start(now);
        logOsc.stop(now + 0.12);
      }

      // Shaker rattle on alternating 16th notes
      if (step % 2 === 1) {
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.03), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4000;
        const shkGain = this.ctx.createGain();
        shkGain.gain.setValueAtTime(0.08, now);
        shkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(hp);
        hp.connect(shkGain);
        shkGain.connect(this.musicGain);
        src.start(now);
      }
    }, stepTime);
  }

  public stopAmbientDrums() {
    if (this.drumIntervalId !== null) {
      clearInterval(this.drumIntervalId);
      this.drumIntervalId = null;
    }
  }

  public playMenuClick() {
    this.initCtx();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const sound = new SoundEngine();
