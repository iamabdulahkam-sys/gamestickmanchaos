/**
 * Stickman Flag Chaos - Audio Module
 * Web Audio API synthesizer for kid-friendly cartoon sound effects.
 * Completely self-contained with zero external asset dependencies.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.mediaStreamDest = null;
    this.muted = false;
    this.volume = 0.6;
    this.initialized = false;
    this.setupUserGestureUnlock();
  }

  /**
   * Sets up global listeners to resume AudioContext seamlessly on first user interaction,
   * fully compliant with browser autoplay policies.
   */
  setupUserGestureUnlock() {
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', unlock, true);
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      window.addEventListener('touchstart', unlock, true);
    }
  }

  /**
   * Initializes audio context on user interaction.
   */
  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        if (this.ctx.createMediaStreamDestination) {
          this.mediaStreamDest = this.ctx.createMediaStreamDestination();
        }
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureActive() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Silently caught until user gesture unlocks the audio context
      });
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) {
      this.ensureActive();
    }
    return this.muted;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Retrieves Web Audio MediaStream for screen recording synchronization
   */
  getAudioStream() {
    this.ensureActive();
    if (!this.mediaStreamDest && this.ctx && this.ctx.createMediaStreamDestination) {
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
    }
    return this.mediaStreamDest ? this.mediaStreamDest.stream : null;
  }

  createMasterGain() {
    if (!this.ctx || this.muted) return null;
    // Comply with browser autoplay policy: only connect nodes if context is running
    if (this.ctx.state !== 'running') return null;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.connect(this.ctx.destination);
    if (this.mediaStreamDest) {
      try {
        gain.connect(this.mediaStreamDest);
      } catch (e) {}
    }
    return gain;
  }

  /**
   * Cartoon Punch / Whack sound (pitch drop + noise thud)
   */
  playPunch() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    // Tonal punch body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.12);

    // Cartoon slap noise snap
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
  }

  /**
   * Cartoon BONK / Wall impact sound
   */
  playBonk() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Cartoon Jump whoosh sound
   */
  playJump() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.14);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Cartoon wall bounce / spring sound
   */
  playBounce() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(360, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Kid-friendly Cartoon KO sound (descending whistle + sparkle)
   */
  playKO() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    // Slide down
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.45);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.45);

    // Cute sparkle chime
    [784, 987, 1318].forEach((freq, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const chimeStart = t + 0.2 + idx * 0.09;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, chimeStart);

      chimeGain.gain.setValueAtTime(0.25, chimeStart);
      chimeGain.gain.exponentialRampToValueAtTime(0.01, chimeStart + 0.2);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(master);
      chimeOsc.start(chimeStart);
      chimeOsc.stop(chimeStart + 0.2);
    });
  }

  /**
   * Countdown beeps (3, 2, 1) and Fight bell
   */
  playCountdown(count) {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (count > 0) {
      // 3, 2, 1 beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.18);
    } else {
      // FIGHT bell!
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.6);
    }
  }

  /**
   * Victory Fanfare Arpeggio
   */
  playVictory() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = t + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.45, startT);
      gain.gain.exponentialRampToValueAtTime(0.01, startT + 0.35);

      osc.connect(gain);
      gain.connect(master);
      osc.start(startT);
      osc.stop(startT + 0.35);
    });
  }

  /**
   * Cartoon Bumper Super Bounce Sound
   */
  playBumper() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.28);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  /**
   * Cartoon Thunder & Lightning crack
   */
  playThunder() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;

    // Lightning sharp crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.15);

    // Deep rolling thunder
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
  }

  /**
   * Cartoon Electric Zap
   */
  playZap() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.05);
    osc.frequency.linearRampToValueAtTime(200, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Wind gust whoosh
   */
  playWind() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.25);
    osc.frequency.linearRampToValueAtTime(90, t + 0.5);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * Cartoon Item Pickup Chime (rising bright arpeggio)
   */
  playItemPickup() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0, t + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.5, t + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.16);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.16);
    });
  }

  /**
   * Cartoon Clock / Bomb Tick (short high percussive click)
   */
  playTick(isFast = false) {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isFast ? 1760 : 1200; // A6 or D6
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.035);

    gain.gain.setValueAtTime(isFast ? 0.45 : 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Cartoon Time Bomb Explosion (deep KABOOM blast with noise thud)
   */
  playKaboom() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;

    // Sub bass drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.65);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.65);

    // Filtered noise blast
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.7);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.linearRampToValueAtTime(90, t + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
  }

  /**
   * High-tech Sci-Fi Laser Blaster zap sound (swept sawtooth pitch sweep)
   */
  playLaser() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.15);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Cartoon Rocket Missile Launch Whoosh sound
   */
  playRocket() {
    this.ensureActive();
    const master = this.createMasterGain();
    if (!master) return;

    const t = this.ctx.currentTime;

    // Rocket motor hiss/whoosh
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(950, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t);

    // Whistle tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.3);

    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export const sound = new SoundManager();
