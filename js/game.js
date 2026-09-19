/**
 * Stickman Flag Chaos - Game Orchestrator Module
 * Manages game loop, state flow (COUNTDOWN -> BATTLE -> RESULT), dynamic roster spawning,
 * custom themes, center obstacles, and match lifecycles.
 */

import { CONFIG } from './config.js';
import { PhysicsManager } from './physics.js';
import { EffectsManager } from './effects.js';
import { AIManager } from './ai.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { StickmanFighter } from './player.js';
import { WeatherManager } from './weather.js';
import { ItemManager } from './items.js';
import { BombManager } from './bomb.js';
import { sound } from './audio.js';
import { TournamentManager } from './tournament.js';
import { BackgroundTicker } from './ticker.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'LOBBY'; // LOBBY, COUNTDOWN, BATTLE, RESULT
    this.isPaused = false;
    this.debugMode = false;

    // Customization state
    this.currentThemeKey = 'neon';
    this.obstacleType = 'none';
    this.arenaShape = 'octagon';
    this.arenaSize = 'normal';
    this.customRoster = null;
    this.totalFighterCount = 4;
    this.bounceSpeed = 1.0;
    this.gravityMode = 'normal';
    this.weatherType = 'none';
    this.fighterMaxHp = CONFIG.FIGHTER.BASE_HP;
    this.movementSpeed = 1.0;
    this.resolutionKey = 'auto';

    // Core managers
    this.physics = new PhysicsManager();
    this.physics.game = this;
    this.effects = new EffectsManager();
    this.ai = new AIManager();
    this.weather = new WeatherManager();
    this.items = new ItemManager();
    this.bombs = new BombManager();
    this.sound = sound;
    this.renderer = new Renderer(canvas);
    this.ui = new UIManager(this);
    this.tournament = new TournamentManager(this);
    this.ticker = new BackgroundTicker((dt) => this.onBackgroundTick(dt));

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.lastTime = performance.now();
        }
      });
    }

    this.fighters = [];
    this.lastTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.winnerDeclared = false;
    this.confettiTimer = 0;
    this.eliminationCounter = 0;
    this.teamEliminations = new Map();
    this.crowdShockwaveCooldown = 0;

    this.setupPhysicsCallbacks();
  }

  setupPhysicsCallbacks() {
    this.physics.onWallImpact = (fighter, wallData, speed) => {
      if (fighter && fighter.body && speed > 3.0) {
        sound.playBonk();
        const pos = fighter.body.position;
        this.effects.addWallImpact(pos.x, pos.y, wallData.normal.x, wallData.normal.y);
        this.renderer.addWallImpactVisual(pos.x, pos.y);
      }
    };

    this.physics.onObstacleImpact = (fighter, obsBody, speed) => {
      if (fighter && fighter.body && speed > 1.8) {
        const type = obsBody.obstacleData?.type;
        const pos = fighter.body.position;

        if (type === 'bumper') {
          sound.playBumper();
          this.effects.addHitEffect(pos.x, pos.y, 'BOING!');
          this.effects.addShockwave(obsBody.position.x, obsBody.position.y, '#00F0FF', 90);
          if (obsBody.obstacleData) {
            obsBody.obstacleData.scalePulse = 1.45;
          }

          // Extra spring rebound impulse away from bumper center
          const dx = pos.x - obsBody.position.x;
          const dy = pos.y - obsBody.position.y;
          const angle = Math.atan2(dy, dx);
          const reboundSpeed = 11.0 * this.physics.bounceMultiplier;
          this.physics.Body.setVelocity(fighter.body, {
            x: Math.cos(angle) * reboundSpeed,
            y: Math.sin(angle) * reboundSpeed,
          });
        } else if (type === 'spinner') {
          sound.playBonk();
          this.effects.addHitEffect(pos.x, pos.y, 'WHAM!');
          this.effects.addShockwave(pos.x, pos.y, '#FFE600', 60);
          if (obsBody.obstacleData) {
            obsBody.obstacleData.scalePulse = 1.25;
          }
        } else {
          sound.playBonk();
          this.effects.addHitEffect(pos.x, pos.y, 'BONK!');
          if (obsBody.obstacleData) {
            obsBody.obstacleData.scalePulse = 1.2;
          }
        }

        this.renderer.addWallImpactVisual(pos.x, pos.y);
      }
    };
  }

  init() {
    // Check URL parameters for debug mode (?debug=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1') {
      this.debugMode = true;
      this.ui.setDebugVisible(true);
    }

    // Build default Arena Shape
    this.setArenaShape('octagon');

    // Apply default theme, obstacles, physics & weather
    this.setTheme('neon');
    this.setObstacle('none');
    this.setBounceSpeed(1.0);
    this.setGravityMode('normal');
    this.setWeather('none');

    // Load and apply saved resolution preference (Auto, 720p, 1080p, 1440p, 4K)
    let savedRes = 'auto';
    if (typeof localStorage !== 'undefined') {
      try {
        savedRes = localStorage.getItem('stickman_resolution') || 'auto';
      } catch (e) {}
    }
    this.setResolution(savedRes, false);

    // Start initial match
    this.startNewMatch();

    // Start requestAnimationFrame loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setArenaShape(shapeKey) {
    if (shapeKey === 'rectangle_full') shapeKey = 'rectangle';
    this.arenaShape = shapeKey || 'octagon';
    let r = CONFIG.ARENA.DEFAULT_RADIUS;
    if (this.arenaSize === 'small') r = CONFIG.ARENA.DEFAULT_RADIUS * 0.8;
    if (this.arenaSize === 'large') r = CONFIG.ARENA.DEFAULT_RADIUS * 1.15;

    const cx = CONFIG.CANVAS.WIDTH / 2;
    const cy = CONFIG.CANVAS.HEIGHT / 2;
    this.physics.buildArenaShape(this.arenaShape, cx, cy, r);
    this.physics.buildObstacles(this.obstacleType);
  }

  setTheme(themeKey) {
    this.currentThemeKey = themeKey;
    this.renderer.setTheme(themeKey);
  }

  setObstacle(obstacleKey) {
    this.obstacleType = obstacleKey;
    this.physics.buildObstacles(obstacleKey);
  }

  setBounceSpeed(mult) {
    this.bounceSpeed = parseFloat(mult) || 1.0;
    this.physics.setBounceSpeed(this.bounceSpeed);
  }

  setGravityMode(mode) {
    this.gravityMode = mode;
    this.physics.setGravityMode(mode);
  }

  setWeather(type) {
    this.weatherType = type;
    this.weather.setWeather(type);
  }

  setFighterHp(hp) {
    this.fighterMaxHp = parseInt(hp, 10) || CONFIG.FIGHTER.BASE_HP;
  }

  /**
   * Dynamically calculates fighter scale based on total player count:
   * Fewer players -> significantly larger, heroic cartoon fighters
   * More players -> smaller mini-fighters to prevent arena clumping
   * Smooth curve from ~1.38x (2 players) down to ~0.45x (100 players)
   */
  getFighterScale(totalCount) {
    const count = Math.max(2, totalCount || 4);
    const rawScale = 1.545 - 0.238 * Math.log(count);
    return Math.max(0.42, Math.min(1.45, Number(rawScale.toFixed(2))));
  }

  setMovementSpeed(spd) {
    this.movementSpeed = parseFloat(spd) || 1.0;
    this.physics.movementSpeedMultiplier = this.movementSpeed;
  }

  setBombSettings(opts) {
    this.bombs.setSettings(opts);
  }

  setWindStrength(str) {
    this.weather.setWindStrength(str);
  }

  setLightningSettings(opts) {
    this.weather.setLightningOptions(opts);
  }

  setResolution(resolutionKey, save = true) {
    const validKey = CONFIG.RESOLUTIONS && CONFIG.RESOLUTIONS[resolutionKey] ? resolutionKey : 'auto';
    this.resolutionKey = validKey;

    let targetWidth, targetHeight, scale;

    if (validKey === 'auto') {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const clampedDpr = Math.min(3.0, Math.max(1.0, dpr));
      targetWidth = Math.round(CONFIG.CANVAS.WIDTH * clampedDpr);
      targetHeight = Math.round(CONFIG.CANVAS.HEIGHT * clampedDpr);
      scale = clampedDpr;
    } else {
      const conf = CONFIG.RESOLUTIONS[validKey];
      targetWidth = conf.width;
      targetHeight = conf.height;
      scale = conf.scale;
    }

    if (this.canvas) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }
    if (this.renderer) {
      this.renderer.renderScale = scale;
    }

    if (save && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('stickman_resolution', validKey);
      } catch (e) {
        console.warn('Unable to persist resolution:', e);
      }
    }

    // Refresh UI dropdown if present
    if (this.ui && typeof this.ui.syncResolutionUI === 'function') {
      this.ui.syncResolutionUI(validKey);
    }
  }

  startMatchWithSettings(optionsOrRoster, themeKey, obstacleKey) {
    if (optionsOrRoster && typeof optionsOrRoster === 'object' && optionsOrRoster.roster) {
      const opts = optionsOrRoster;
      this.customRoster = opts.roster;
      this.totalFighterCount = opts.fighterCount || opts.roster.length;
      if (opts.arenaShape) this.setArenaShape(opts.arenaShape);
      this.setTheme(opts.themeKey || 'neon');
      this.setObstacle(opts.obstacleKey || 'none');
      if (opts.bounceSpeed) this.setBounceSpeed(opts.bounceSpeed);
      if (opts.gravityMode) this.setGravityMode(opts.gravityMode);
      if (opts.weatherType) this.setWeather(opts.weatherType);
      if (opts.hpPreset) this.setFighterHp(opts.hpPreset);
      if (opts.movementSpeed) this.setMovementSpeed(opts.movementSpeed);
      if (opts.bombSettings) this.setBombSettings(opts.bombSettings);
      if (opts.windStrength) this.setWindStrength(opts.windStrength);
      if (opts.lightningSettings) this.setLightningSettings(opts.lightningSettings);
      if (opts.resolution) this.setResolution(opts.resolution);
    } else {
      this.customRoster = optionsOrRoster;
      this.totalFighterCount = optionsOrRoster?.length || 4;
      this.setTheme(themeKey);
      this.setObstacle(obstacleKey);
    }
    this.startNewMatch();
  }

  setupMatch(options) {
    return this.startMatchWithSettings(options);
  }

  startNewMatch() {
    this.winnerDeclared = false;
    this.confettiTimer = 0;
    this.eliminationCounter = 0;
    this.teamEliminations = new Map();
    this.crowdShockwaveCooldown = 1.0;
    if (this.winnerTimeout) {
      clearTimeout(this.winnerTimeout);
      this.winnerTimeout = null;
    }
    this.ui.hideWinner();
    this.effects.clear();
    this.ai.clear();
    this.items.clear();
    this.bombs.clear();

    // Clean up previous fighters
    for (let i = 0; i < this.fighters.length; i++) {
      this.fighters[i].destroy();
    }
    this.fighters = [];

    // Rebuild obstacles for fresh match
    this.physics.buildObstacles(this.obstacleType);
    this.physics.setBounceSpeed(this.bounceSpeed);
    this.physics.setGravityMode(this.gravityMode);
    this.weather.setWeather(this.weatherType);

    // Reset country team announcement flags
    CONFIG.COUNTRIES.forEach((c) => {
      c.teamAnnouncedOut = false;
    });

    // Determine participating countries
    let selectedCountries;
    if (this.customRoster && this.customRoster.length >= 2) {
      selectedCountries = [...this.customRoster];
    } else {
      // Default 4 fighters (Indonesia, Japan, USA, Brazil)
      const defaultIds = ['indonesia', 'japan', 'usa', 'brazil'];
      selectedCountries = defaultIds.map((id) => {
        const c = CONFIG.COUNTRIES.find((item) => item.id === id);
        return {
          ...c,
          bodyColor: c.bodyColor || c.primaryColor,
        };
      });
    }

    const totalCount = this.totalFighterCount || selectedCountries.length;
    const fighterScale = this.getFighterScale(totalCount);
    const cx = this.physics.center.x;
    const cy = this.physics.center.y;
    const arenaRadius = this.physics.radius;

    for (let i = 0; i < totalCount; i++) {
      const country = selectedCountries[i % selectedCountries.length];

      let posX, posY;
      if (this.arenaShape === 'rectangle_full') {
        if (totalCount <= 8) {
          const a = (i * 2 * Math.PI) / totalCount - Math.PI / 2;
          posX = cx + Math.cos(a) * 360;
          posY = cy + Math.sin(a) * 200;
        } else {
          const phi = (1 + Math.sqrt(5)) / 2;
          const angle = i * 2 * Math.PI * phi;
          const layerFraction = Math.sqrt((i + 0.5) / totalCount);
          posX = cx + Math.cos(angle) * (layerFraction * 440);
          posY = cy + Math.sin(angle) * (layerFraction * 230);
        }
      } else if (this.arenaShape === 'rectangle') {
        if (totalCount <= 8) {
          const a = (i * 2 * Math.PI) / totalCount - Math.PI / 2;
          posX = cx + Math.cos(a) * 200;
          posY = cy + Math.sin(a) * 120;
        } else {
          const phi = (1 + Math.sqrt(5)) / 2;
          const angle = i * 2 * Math.PI * phi;
          const layerFraction = Math.sqrt((i + 0.5) / totalCount);
          posX = cx + Math.cos(angle) * (layerFraction * 230);
          posY = cy + Math.sin(angle) * (layerFraction * 130);
        }
      } else if (this.arenaShape === 'star') {
        if (totalCount <= 8) {
          const a = (i * 2 * Math.PI) / totalCount - Math.PI / 2;
          posX = cx + Math.cos(a) * 110;
          posY = cy + Math.sin(a) * 110;
        } else {
          const phi = (1 + Math.sqrt(5)) / 2;
          const angle = i * 2 * Math.PI * phi;
          const layerFraction = Math.sqrt((i + 0.5) / totalCount);
          const r = 25 + layerFraction * 105;
          posX = cx + Math.cos(angle) * r;
          posY = cy + Math.sin(angle) * r;
        }
      } else {
        // Octagon or Circle
        if (totalCount <= 8) {
          const a = (i * 2 * Math.PI) / totalCount - Math.PI / 2;
          const spawnRadius = arenaRadius * 0.52;
          posX = cx + Math.cos(a) * spawnRadius;
          posY = cy + Math.sin(a) * spawnRadius;
        } else {
          const phi = (1 + Math.sqrt(5)) / 2;
          const angle = i * 2 * Math.PI * phi;
          const layerFraction = Math.sqrt((i + 0.5) / totalCount);
          const r = arenaRadius * (0.15 + layerFraction * 0.72);
          posX = cx + Math.cos(angle) * r;
          posY = cy + Math.sin(angle) * r;
        }
      }

      const facing = posX < cx ? 1 : -1;
      const fighter = new StickmanFighter(
        this.physics,
        country,
        posX,
        posY,
        i,
        this.fighterMaxHp,
        fighterScale
      );
      fighter.game = this;
      fighter.facing = facing;

      // Initial random velocity to activate full octagon arena right from the start
      const initialSpeed = totalCount > 8 ? 2.5 : 1.2;
      const jitterAngle = Math.random() * Math.PI * 2;
      this.physics.Body.setVelocity(fighter.body, {
        x: Math.cos(jitterAngle) * initialSpeed,
        y: Math.sin(jitterAngle) * initialSpeed,
      });

      this.fighters.push(fighter);
      this.ai.registerFighter(fighter);
    }

    // Configure effects scaling and crowd count for current match
    this.effects.setFighterScale(fighterScale, totalCount);

    // Initialize external HUD (adaptive: individual or team leaderboard)
    this.ui.initFighterHUD(this.fighters);

    // Begin Countdown sequence (3, 2, 1, FIGHT!)
    this.runCountdown();
  }

  runCountdown() {
    this.state = 'COUNTDOWN';

    let count = 3;
    this.ui.showCountdown(count.toString());
    sound.playCountdown(count);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.ui.showCountdown(count.toString());
        sound.playCountdown(count);
      } else if (count === 0) {
        this.ui.showCountdown('FIGHT!', true);
        sound.playCountdown(0);
        this.state = 'BATTLE';
        clearInterval(timer);
      }
    }, 850);
  }

  restartMatch() {
    this.startNewMatch();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  setArenaSize(size) {
    this.arenaSize = size;
    this.setArenaShape(this.arenaShape);
  }

  triggerTestPunch() {
    if (this.fighters.length > 0) {
      const alive = this.fighters.filter((f) => !f.isKO);
      if (alive.length > 0) {
        alive[0].punch(this.effects);
      }
    }
  }

  gameLoop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.08);
    this.lastTime = currentTime;

    // Calculate FPS
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.ui.updateFPS(this.fps);
    }

    // Only update and render via RAF if tab is currently visible in foreground
    if (!this.ticker?.isBackground) {
      if (!this.isPaused) {
        this.update(dt);
      }

      // Always render current state with weather, items, and bombs
      this.renderer.render(
        this.physics,
        this.fighters,
        this.effects,
        this.debugMode,
        this.weather,
        this.items,
        this.bombs,
        this
      );
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Called by BackgroundTicker (Web Worker) at 60 FPS when tab is hidden.
   * Continues physics, tournament timers, AI, and canvas rendering unthrottled.
   */
  onBackgroundTick(dt) {
    if (!this.ticker?.isBackground) return;

    if (!this.isPaused) {
      this.update(dt);
    }

    // Keep rendering to canvas during background ticks so screen/tab capture remains active
    this.renderer.render(
      this.physics,
      this.fighters,
      this.effects,
      this.debugMode,
      this.weather,
      this.items,
      this.bombs,
      this
    );
  }

  update(dt) {
    // 1. Update Effects, Particles & Weather
    const isBattleOver = this.state === 'RESULT' || this.winnerDeclared;
    const aliveCount = this.fighters.filter((f) => !f.isKO).length;
    this.effects.totalFighterCount = aliveCount > 0 ? aliveCount : this.fighters.length;
    this.effects.update(dt);
    this.renderer.update(dt);
    this.weather.update(dt, this.physics, this.fighters, this.effects, isBattleOver);

    // Tournament mode lifecycle updates (intros, countdowns, transitions, nature shifts)
    if (this.tournament && this.tournament.isActive) {
      this.tournament.update(dt);
    }

    // 2. State specific updates
    if (this.state === 'BATTLE') {
      // Step Physics with fighters passed for anti-clump low-G buoyancy
      this.physics.update(dt, this.fighters);

      // Check Crowd Shockwave to disperse dense clusters of >8 fighters (non-damaging)
      this.checkCrowdShockwave(dt);

      // Item updates (periodic spawns, parachute fall, pickups)
      this.items.update(dt, this.physics, this.fighters, this.effects);

      // Time Bomb updates (ticking countdown, explosion shockwaves)
      this.bombs.update(dt, this.physics, this.fighters, this.effects, isBattleOver);

      // AI updates with smart targeting and nearby weapon seeking
      this.ai.update(this.fighters, dt, this.effects, this.items.items);

      // Update Fighters
      for (let i = 0; i < this.fighters.length; i++) {
        this.fighters[i].update(dt, this.effects);
      }

      // Keep fighters safely inside octagon
      this.physics.enforceArenaBounds(this.fighters);

      // Check Win / KO conditions
      this.checkBattleStatus();
    } else if (this.state === 'COUNTDOWN') {
      // Soft physics settling during countdown
      this.physics.update(dt * 0.5, this.fighters);
      for (let i = 0; i < this.fighters.length; i++) {
        this.fighters[i].update(dt, this.effects);
      }
    } else if (this.state === 'RESULT') {
      // Gentle physics for survivor celebration
      this.physics.update(dt, this.fighters);
      for (let i = 0; i < this.fighters.length; i++) {
        const fighter = this.fighters[i];
        if (!fighter.isKO) {
          fighter.celebrateTimer = (fighter.celebrateTimer || 0) + dt;
          if (fighter.celebrateTimer > 0.7) {
            fighter.celebrateTimer = 0;
            if (fighter.isGrounded) {
              fighter.jump((Math.random() - 0.5) * 0.4);
              fighter.punchTimer = 0.25;
            }
          }
        }
        fighter.update(dt, this.effects);
      }

      // Confetti bursts
      this.confettiTimer += dt;
      if (this.confettiTimer > 0.35) {
        this.confettiTimer = 0;
        this.effects.addConfettiBurst(this.physics.center.x + (Math.random() - 0.5) * 160, this.physics.center.y - 100, 18);
      }
    }

    // 3. Update External HUD
    this.ui.updateFighterHUD();
  }

  checkBattleStatus() {
    const aliveFighters = this.fighters.filter((f) => !f.isKO);

    // Track elimination order for individual fighters
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (f.isKO && !f.eliminationOrder) {
        f.eliminationOrder = ++this.eliminationCounter;
      }
    }

    // Track elimination order for whole country teams
    const aliveCountryIds = new Set(aliveFighters.map((f) => f.country.id));
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (!aliveCountryIds.has(f.country.id) && !this.teamEliminations.has(f.country.id)) {
        this.teamEliminations.set(f.country.id, ++this.eliminationCounter);
      }
    }

    // Check newly KO'd fighters or team eliminations announcements
    if (this.fighters.length <= 8) {
      for (let i = 0; i < this.fighters.length; i++) {
        const f = this.fighters[i];
        if (f.isKO && !f.announcedKO) {
          f.announcedKO = true;
          this.ui.showKOAnnounce(f.name);
        }
      }
    } else {
      // In large matches, announce when an entire country team is eliminated
      for (let i = 0; i < this.fighters.length; i++) {
        const f = this.fighters[i];
        if (!aliveCountryIds.has(f.country.id) && !f.country.teamAnnouncedOut) {
          f.country.teamAnnouncedOut = true;
          this.ui.showTeamEliminatedAnnounce(f.country);
        }
      }
    }

    // Tournament mode stage qualification check
    if (this.tournament && this.tournament.isActive) {
      const stageHandled = this.tournament.checkBattleStatus(aliveFighters, aliveCountryIds);
      if (stageHandled) return;
    }

    // Check if only 1 country remains alive (Regular Match)
    if (!this.tournament?.isActive && aliveCountryIds.size === 1 && !this.winnerDeclared && this.fighters.length > 1) {
      this.winnerDeclared = true;
      this.state = 'RESULT';
      const winner = aliveFighters[0];

      this.bombs.clear();
      this.weather.stopLightning();
      sound.playVictory();
      this.effects.addConfettiBurst(this.physics.center.x, this.physics.center.y, 50);

      this.winnerTimeout = setTimeout(() => {
        this.ui.showWinner(winner);
      }, 1000);
    }
  }

  /**
   * Evaluates crowd clustering. When >8 alive fighters gather in a tight clump,
   * triggers a powerful non-damaging dispersal shockwave to scatter the mob.
   */
  checkCrowdShockwave(dt) {
    if (this.state !== 'BATTLE') return;

    if (this.crowdShockwaveCooldown > 0) {
      this.crowdShockwaveCooldown -= dt;
      return;
    }

    const aliveFighters = this.fighters.filter((f) => !f.isKO && f.body);
    if (aliveFighters.length <= 8) return;

    const fighterScale = aliveFighters[0]?.scale || 1.0;
    // Clustering radius: scaled to fighter scale (~55px for 100 fighters, ~95px for 16 fighters)
    const clusterRadius = Math.max(55, 100 * fighterScale);
    const clusterRadiusSq = clusterRadius * clusterRadius;

    let maxCluster = null;
    let maxCount = 0;

    for (let i = 0; i < aliveFighters.length; i++) {
      const fi = aliveFighters[i];
      const posI = fi.body.position;
      const cluster = [fi];

      for (let j = 0; j < aliveFighters.length; j++) {
        if (i === j) continue;
        const fj = aliveFighters[j];
        const posJ = fj.body.position;
        const dx = posI.x - posJ.x;
        const dy = posI.y - posJ.y;
        if (dx * dx + dy * dy <= clusterRadiusSq) {
          cluster.push(fj);
        }
      }

      if (cluster.length > 8 && cluster.length > maxCount) {
        maxCount = cluster.length;
        maxCluster = cluster;
      }
    }

    if (maxCluster && maxCluster.length > 8) {
      this.triggerCrowdDispersalShockwave(maxCluster, clusterRadius, aliveFighters);
    }
  }

  /**
   * Disperses a dense crowd of >8 fighters radially outward with a sonic shockwave.
   * 100% NON-DAMAGING: Fighter HP is completely untouched!
   */
  triggerCrowdDispersalShockwave(cluster, clusterRadius, aliveFighters) {
    // 1. Calculate centroid (center of mass) of the mob
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < cluster.length; i++) {
      sumX += cluster[i].body.position.x;
      sumY += cluster[i].body.position.y;
    }
    const cx = sumX / cluster.length;
    const cy = sumY / cluster.length;

    // 2. Trigger audiovisual shockwave effects
    if (this.effects.addCrowdShockwave) {
      this.effects.addCrowdShockwave(cx, cy, clusterRadius * 1.6);
    } else {
      this.effects.addShockwave(cx, cy, '#00F0FF', clusterRadius * 1.6);
      this.effects.addHitEffect(cx, cy, 'SCATTER!', true);
    }

    if (this.sound && this.sound.playShockwave) {
      this.sound.playShockwave();
    } else if (this.sound && this.sound.playBumper) {
      this.sound.playBumper();
    }

    // 3. Blast all fighters within the expanded shockwave radius radially outward
    const blastRadius = clusterRadius * 1.55;
    const blastRadiusSq = blastRadius * blastRadius;
    const affected = aliveFighters.filter((f) => {
      const dx = f.body.position.x - cx;
      const dy = f.body.position.y - cy;
      return dx * dx + dy * dy <= blastRadiusSq;
    });

    const baseImpulseSpeed = 13.0 * (this.physics.bounceMultiplier || 1.0);

    for (let i = 0; i < affected.length; i++) {
      const f = affected[i];
      const pos = f.body.position;
      let dx = pos.x - cx;
      let dy = pos.y - cy;
      let dist = Math.hypot(dx, dy);

      if (dist < 1.0) {
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        dist = 1.0;
      }

      const nx = dx / dist;
      const ny = dy / dist;

      // Radially outwards with an upward pop (-2.5 to -4.5) to keep them airborne
      const popY = -3.5 + (Math.random() - 0.5) * 1.5;
      const speed = baseImpulseSpeed * (0.88 + Math.random() * 0.32);

      this.physics.Body.setVelocity(f.body, {
        x: nx * speed,
        y: ny * (speed * 0.6) + popY,
      });

      this.physics.Body.setAngularVelocity(f.body, (Math.random() - 0.5) * 0.45);

      // Cartoon hit flash & tumble reaction (WITHOUT REDUCING ANY HP)
      f.hitFlashTimer = 0.16;
      f.state = 'KNOCKED_BACK';
      f.stunTimer = 0.22;
      // CRITICAL: f.hp is NEVER modified! Zero damage!
    }

    // Cooldown prevents spamming shockwaves while fighters are already flying apart
    this.crowdShockwaveCooldown = 1.8;
  }

  startTournament(count = 1, customCountries = null, recordOptions = null) {
    this.tournament.startTournament(count, customCountries, recordOptions);
  }

  exitTournament() {
    this.tournament.exitTournament();
  }

  /**
   * Returns current battle standings sorted by:
   * 1. Alive status (Alive before KO)
   * 2. Highest HP first among alive ("hp yang paling tinggi paling atas")
   * 3. Most recently eliminated first among KO ("mati paling terakhir yang paling atas")
   */
  getStandings() {
    const countryMap = new Map();

    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      const cid = f.country.id;
      if (!countryMap.has(cid)) {
        countryMap.set(cid, {
          country: f.country,
          fighters: [],
          totalHp: 0,
          maxHp: 0,
          isAlive: false,
          eliminationOrder: 0,
          aliveCount: 0,
          totalCount: 0,
        });
      }
      const entry = countryMap.get(cid);
      entry.fighters.push(f);
      entry.totalCount++;

      if (!f.isKO && f.hp > 0) {
        entry.isAlive = true;
        entry.aliveCount++;
        entry.totalHp += Math.max(0, f.hp);
      }
      entry.maxHp += f.maxHp;
    }

    const standings = Array.from(countryMap.values());

    for (let i = 0; i < standings.length; i++) {
      const entry = standings[i];
      entry.hpPercent = entry.maxHp > 0 ? (entry.totalHp / entry.maxHp) * 100 : 0;
      if (entry.isAlive) {
        entry.eliminationOrder = Infinity;
      } else {
        let order = this.teamEliminations.get(entry.country.id) || 0;
        if (!order) {
          for (const f of entry.fighters) {
            if (f.eliminationOrder && f.eliminationOrder > order) {
              order = f.eliminationOrder;
            }
          }
        }
        entry.eliminationOrder = order;
      }
    }

    standings.sort((a, b) => {
      // 1. Alive always ranks above KO
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;

      // 2. Both Alive: sort by highest total HP descending ("hp paling tinggi paling atas")
      if (a.isAlive && b.isAlive) {
        if (b.totalHp !== a.totalHp) {
          return b.totalHp - a.totalHp;
        }
        return b.hpPercent - a.hpPercent;
      }

      // 3. Both KO: sort by elimination order descending ("mati paling terakhir yang paling atas")
      if (b.eliminationOrder !== a.eliminationOrder) {
        return b.eliminationOrder - a.eliminationOrder;
      }

      return a.country.name.localeCompare(b.country.name);
    });

    return standings;
  }
}

