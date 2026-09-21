/**
 * Stickman Flag Chaos - Tournament Manager
 * Manages 5-stage tournament progression:
 * 1. Round of 64 (64 -> 32 advance)
 * 2. Round of 32 (32 -> 16 advance)
 * 3. Round of 16 (16 -> 8 advance)
 * 4. Quarterfinals (8 -> 4 advance)
 * 5. Grand Finals (Final Four -> Top 4 Podium & Champion)
 *
 * Each stage features:
 * - 30-second country introduction showcase
 * - Randomized ring shape, visual theme, obstacle, gravity, weather, and wind gust
 * - Automatic progression from start to finish
 */

import { CONFIG } from './config.js';
import { sound } from './audio.js';

export class TournamentManager {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.currentStageIndex = 0;
    this.currentPool = [];
    this.stageQualifiers = [];
    this.stageEliminated = [];
    this.stageConditions = null;
    this.introTimer = null;
    this.introSecondsLeft = 30;
    this.transitionTimer = null;
    this.stageCleared = false;
    this.isStageBattleActive = false;

    // Multi-Tournament Continuous Series State
    this.totalTournaments = 1;
    this.completedTournaments = 0;
    this.podiumTransitionTimer = null;
    this.podiumSecondsLeft = 30;
    this.isRecordingEnabled = false;
    this.autoRecordActive = false;
    this.recordOptions = null;
    this.finalPodiumTimer = null;

    this.stages = [
      {
        id: 'stage_64',
        name: 'Round of 64',
        title: 'ROUND OF 64 - QUALIFIERS',
        totalCount: 64,
        advanceCount: 32,
        desc: '64 Countries Battling • Top 32 Advance to the Next Round!',
      },
      {
        id: 'stage_32',
        name: 'Round of 32',
        title: 'ROUND OF 32 - ELIMINATION',
        totalCount: 32,
        advanceCount: 16,
        desc: '32 Countries Battling • Top 16 Advance to Round of 16!',
      },
      {
        id: 'stage_16',
        name: 'Round of 16',
        title: 'ROUND OF 16 - SWEET SIXTEEN',
        totalCount: 16,
        advanceCount: 8,
        desc: '16 Countries Battling • Top 8 Advance to Quarterfinals!',
      },
      {
        id: 'stage_8',
        name: 'Quarterfinals',
        title: 'QUARTERFINALS - TOP 8',
        totalCount: 8,
        advanceCount: 4,
        desc: '8 Countries Battling • Top 4 Advance to Final Four!',
      },
      {
        id: 'stage_4',
        name: 'Grand Finals',
        title: 'GRAND FINALS - FINAL FOUR',
        totalCount: 4,
        advanceCount: 1,
        desc: 'Top 4 Countries Clash for the Championship Trophy!',
      },
    ];
  }

  /**
   * Generates randomized arena, obstacle, gravity, weather & wind conditions for a stage
   */
  generateRandomConditions() {
    const shapes = ['octagon', 'rectangle', 'star', 'circle'];
    const themes = ['neon', 'comic', 'cosmic', 'volcano', 'dojo'];
    const obstacles = ['none', 'bumper', 'pillars', 'platform', 'spinner'];
    const gravities = ['normal', 'float', 'zerog', 'wave'];
    const weathers = ['none', 'rain', 'wind', 'lightning', 'chaos'];
    const windStrengths = ['gentle', 'strong', 'typhoon'];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const shape = pick(shapes);
    const theme = pick(themes);
    const obstacle = pick(obstacles);
    const gravity = pick(gravities);
    const weather = pick(weathers);
    const wind = pick(windStrengths);

    return {
      arenaShape: shape,
      themeKey: theme,
      obstacleKey: obstacle,
      gravityMode: gravity,
      weatherType: weather,
      windStrength: wind,
      arenaShapeName: CONFIG.ARENA_SHAPES[shape]?.name || shape.toUpperCase(),
      themeName: CONFIG.THEMES[theme]?.name || theme.toUpperCase(),
      obstacleName: CONFIG.OBSTACLES[obstacle]?.name || obstacle.toUpperCase(),
      gravityName: CONFIG.GRAVITY_MODES[gravity]?.name || gravity.toUpperCase(),
      weatherName: CONFIG.WEATHER[weather]?.name || weather.toUpperCase(),
      windName: wind.toUpperCase(),
    };
  }

  /**
   * Starts Tournament Mode with specified tournament count (e.g. 1, 5, or 'infinite')
   * @param {number|string} count Number of tournaments in this sequence
   * @param {Array} customCountries Optional custom countries list
   * @param {Object} recordOptions Optional recording options { enabled, resolutionKey, videoBitsPerSecond, format, fps }
   */
  startTournament(count = 1, customCountries = null, recordOptions = null) {
    this.isActive = true;
    if (count === 'infinite' || count === Infinity) {
      this.totalTournaments = Infinity;
    } else {
      this.totalTournaments = Math.max(1, parseInt(count, 10) || 1);
    }
    this.completedTournaments = 0;
    this.recordOptions = recordOptions;
    this.isRecordingEnabled = !!(recordOptions && recordOptions.enabled);
    this.autoRecordActive = this.isRecordingEnabled;

    this.game.winner = null;
    this.game.winnerDeclared = false;

    this.launchNewTournamentInstance(customCountries);
  }

  /**
   * Starts a brand new, independent video recording session direct to disk for the current tournament instance.
   * Ensures any preceding tournament recording is fully saved and finalized first.
   */
  async startFreshTournamentRecording() {
    if (!this.isRecordingEnabled || !window.canvasRecorder) return;
    this.autoRecordActive = true;

    if (this.finalPodiumTimer) {
      clearTimeout(this.finalPodiumTimer);
      this.finalPodiumTimer = null;
    }

    // If an earlier tournament recording is still active/stopping, wait for it to fully finalize to disk
    if (window.canvasRecorder.state === 'RECORDING' || window.canvasRecorder.state === 'PAUSED' || window.canvasRecorder.state === 'STOPPING') {
      try {
        await window.canvasRecorder.stop();
      } catch (e) {
        console.warn('[Tournament] Error finalizing previous tournament recording:', e);
      }
    }

    // Fail-Forward Auto-Recovery: if canvasRecorder was left in an error/unexpected state, force-heal to IDLE
    if (window.canvasRecorder.state !== 'IDLE' && window.canvasRecorder.state !== 'COMPLETED') {
      window.canvasRecorder.state = 'IDLE';
    }

    // Brief 350ms delay to ensure file handles, GPU NVENC contexts and codecs are completely reset
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!this.isActive || !this.isRecordingEnabled) return;

    const opts = this.recordOptions || {};
    try {
      await window.canvasRecorder.start({
        resolutionKey: opts.resolutionKey || '4k',
        videoBitsPerSecond: opts.videoBitsPerSecond || 60_000_000,
        format: opts.format || 'mp4',
        fps: opts.fps || 60,
        includeAudio: opts.includeAudio !== false,
      });
      this.autoRecordActive = true;
      console.log(`[Tournament] Started fresh direct-to-disk recording for Tournament #${this.completedTournaments + 1}`);
    } catch (err) {
      console.error('[Tournament] Failed to start tournament recording session:', err);
      // Fail-Forward: Keep isRecordingEnabled true so subsequent tournaments continue recording automatically
      this.autoRecordActive = false;
    }
  }

  /**
   * Finalizes and saves the current tournament's video to disk.
   */
  async stopTournamentRecording() {
    if (this.finalPodiumTimer) {
      clearTimeout(this.finalPodiumTimer);
      this.finalPodiumTimer = null;
    }
    if (this.autoRecordActive && window.canvasRecorder) {
      if (window.canvasRecorder.state === 'RECORDING' || window.canvasRecorder.state === 'PAUSED' || window.canvasRecorder.state === 'STOPPING') {
        console.log(`[Tournament] Tournament #${this.completedTournaments} complete. Saving video direct to disk...`);
        try {
          await window.canvasRecorder.stop();
        } catch (err) {
          console.warn('[Tournament] Error stopping tournament recorder:', err);
        }
      }
      this.autoRecordActive = false;
    }
  }

  /**
   * Launches a brand new, completely independent tournament instance.
   * Every tournament reshuffles 64 countries from scratch, resets stages to Round of 64,
   * and generates fresh randomized conditions.
   */
  launchNewTournamentInstance(customCountries = null) {
    if (this.finalPodiumTimer) {
      clearTimeout(this.finalPodiumTimer);
      this.finalPodiumTimer = null;
    }
    if (this.podiumTransitionTimer) {
      clearInterval(this.podiumTransitionTimer);
      this.podiumTransitionTimer = null;
    }
    if (this.introTimer) {
      clearInterval(this.introTimer);
      this.introTimer = null;
    }
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Auto-record each tournament instance into its own independent video file direct to disk
    if (this.isRecordingEnabled) {
      this.startFreshTournamentRecording();
    }

    this.game.ui.hideTournamentPodium();
    this.game.winner = null;
    this.game.winnerDeclared = false;
    this.isStageBattleActive = false;
    this.stageCleared = false;
    this.podiumResults = null;
    this.currentStageIndex = 0;

    // Pick a fresh set of 64 countries independently
    let pool = [];
    if (customCountries && Array.isArray(customCountries) && customCountries.length > 0) {
      const selectedIds = new Set(customCountries.map((c) => c.id || c));
      pool = customCountries
        .map((c) => (typeof c === 'string' ? CONFIG.COUNTRIES.find((x) => x.id === c) : c))
        .filter(Boolean);
      const remaining = CONFIG.COUNTRIES.filter((c) => !selectedIds.has(c.id)).sort(() => 0.5 - Math.random());
      pool = [...pool, ...remaining].slice(0, 64);
    } else {
      const shuffled = [...CONFIG.COUNTRIES].sort(() => 0.5 - Math.random());
      pool = shuffled.slice(0, 64);
    }

    this.currentPool = pool.map((c) => ({
      ...c,
      bodyColor: c.bodyColor || c.primaryColor,
    }));



    this.startStageIntro();
  }

  /**
   * Starts the 30-second country showcase for the current stage
   */
  startStageIntro() {
    this.isStageBattleActive = false;
    this.stageCleared = false;
    this.game.winner = null;
    this.game.winnerDeclared = false;
    const stage = this.stages[this.currentStageIndex];
    if (!stage) return;

    // Generate random conditions for this stage
    this.stageConditions = this.generateRandomConditions();

    // Reset any previous match in background and show the new arena preview
    this.game.state = 'LOBBY';
    if (this.game.countdownTimer) {
      clearInterval(this.game.countdownTimer);
      this.game.countdownTimer = null;
    }
    if (this.game.renderer?.hud?.announcer) {
      this.game.renderer.hud.announcer.timer = 0;
      this.game.renderer.hud.announcer.text = '';
      this.game.renderer.hud.announcer.type = 'none';
    }
    this.game.setArenaShape(this.stageConditions.arenaShape);
    this.game.setTheme(this.stageConditions.themeKey);
    this.game.setObstacle(this.stageConditions.obstacleKey);
    this.game.weather.setWeather(this.stageConditions.weatherType);
    this.game.weather.setWindStrength(this.stageConditions.windStrength);
    this.game.physics.setGravityMode(this.stageConditions.gravityMode);
    this.game.physics.buildObstacles(this.stageConditions.obstacleKey);
    this.game.bombs.clear();
    this.game.items.clear();
    this.game.effects.clear();
    for (let i = 0; i < this.game.fighters.length; i++) {
      this.game.fighters[i].destroy();
    }
    this.game.fighters = [];

    // Reset intro timer & country reveal sequence
    this.introSecondsLeft = CONFIG.TOURNAMENT?.INTRO_DURATION_SECONDS || 10;
    this.isShowingIntro = true;
    this.introElapsed = 0;
    this.revealedCountriesCount = 0;

    // Inform UI to display intro modal
    this.game.ui.showTournamentIntro(stage, this.currentPool, this.stageConditions, this.introSecondsLeft);

    // Play stage intro sound
    sound.playCountdown(3);
  }

  /**
   * Skips the 10-second intro immediately and launches stage battle
   */
  skipIntro() {
    this.isShowingIntro = false;
    this.launchStageBattle();
  }

  /**
   * Launches the physics battle for the current stage with the randomized conditions
   */
  launchStageBattle() {
    this.isShowingIntro = false;
    this.stageCleared = false;
    this.isStageBattleActive = true;
    this.game.winner = null;
    this.game.winnerDeclared = false;
    this.game.ui.hideTournamentIntro();

    const stage = this.stages[this.currentStageIndex];
    const countries = this.currentPool;
    if (!this.stageConditions) {
      this.stageConditions = this.generateRandomConditions();
    }
    const cond = this.stageConditions;

    this.game.ui.setTournamentBanner(stage.title, stage.desc);

    // Enable enhanced bomb & weapon drop rates for tournament mode
    this.game.bombs.setTournamentMode(true);
    this.game.items.setTournamentMode(true);

    // Initialize dynamic in-match nature shift timer (11 to 16 seconds)
    this.natureShiftTimer = 11 + Math.random() * 5;

    // Start match with stage settings
    this.game.startMatchWithSettings({
      fighterCount: countries.length,
      roster: countries,
      arenaShape: cond.arenaShape,
      themeKey: cond.themeKey,
      obstacleKey: cond.obstacleKey,
      gravityMode: cond.gravityMode,
      weatherType: cond.weatherType,
      windStrength: cond.windStrength,
      hpPreset: 250,
      movementSpeed: '1.0',
    });
  }

  /**
   * Checks if stage qualification target has been met during battle
   * @param {Array} aliveFighters
   * @param {Set} aliveCountryIds
   */
  checkBattleStatus(aliveFighters, aliveCountryIds) {
    if (!this.isActive || !this.isStageBattleActive || this.stageCleared || this.game.state !== 'BATTLE') {
      return false;
    }

    if (!this.game.fighters || this.game.fighters.length === 0) {
      return false;
    }

    const stage = this.stages[this.currentStageIndex];
    if (!stage) return false;

    // Trigger stage cleared if remaining alive countries has reached or dropped below the qualification threshold
    // (Handles aliveCountryIds.size <= stage.advanceCount, including 0 when all remaining fighters are KO'd simultaneously)
    if (aliveCountryIds.size <= stage.advanceCount) {
      this.isStageBattleActive = false;
      this.onStageCleared(aliveFighters, aliveCountryIds);
      return true;
    }

    return false;
  }

  /**
   * Handles stage completion when survivors qualify
   */
  onStageCleared(aliveFighters, aliveCountryIds) {
    this.stageCleared = true;
    this.isStageBattleActive = false;

    // Stop fighting and jumping: command all survivors to stand still with raised hands
    for (let i = 0; i < this.game.fighters.length; i++) {
      const f = this.game.fighters[i];
      if (!f.isKO) {
        f.isVictoryPose = true;
      }
    }

    const stage = this.stages[this.currentStageIndex];

    // Get current standings to determine exact placement
    const standings = this.game.getStandings();

    // Identify qualifying countries:
    // Top stage.advanceCount countries from standings qualify (handles simultaneous elimination cleanly)
    const targetQualifiersCount = Math.min(standings.length, stage.advanceCount);
    const qualifiers = [];
    const eliminated = [];

    for (let i = 0; i < standings.length; i++) {
      const entry = standings[i];
      if (i < targetQualifiersCount) {
        qualifiers.push(entry.country);
      } else {
        eliminated.push(entry.country);
      }
    }

    // Stop battle hazards and reset tournament drop rates
    this.game.bombs.setTournamentMode(false);
    this.game.items.setTournamentMode(false);
    this.game.bombs.clear();
    this.game.weather.stopLightning();
    sound.playVictory();
    this.game.effects.addConfettiBurst(this.game.physics.center.x, this.game.physics.center.y, 60);

    // Is this the Grand Final (Final Four)?
    const isFinalStage = this.currentStageIndex === this.stages.length - 1;

    if (isFinalStage) {
      // Grand Tournament Podium (Winner)
      this.completedTournaments++;

      const top4Results = standings.slice(0, 4);
      this.podiumResults = top4Results;

      // Crown champion and declare game result state so engine and HUD celebrate victory
      const championCountry = top4Results[0]?.country || top4Results[0];
      this.game.winner = championCountry;
      this.game.winnerDeclared = true;
      this.game.state = 'RESULT';

      const hasNextTournament = this.completedTournaments < this.totalTournaments;

      setTimeout(() => {
        if (hasNextTournament) {
          this.podiumSecondsLeft = 30;
          this.isShowingPodiumCountdown = true;
          this.game.ui.showTournamentPodium(top4Results, true, Math.ceil(this.podiumSecondsLeft));
        } else {
          this.isShowingPodiumCountdown = false;
          this.game.ui.showTournamentPodium(top4Results, false);
        }

        // Save current tournament video after 8 seconds of podium celebration
        // (Captures champion, trophy, flag, and victory fanfare, then finalizes to disk so it stays lightweight)
        if (this.autoRecordActive) {
          if (this.finalPodiumTimer) {
            clearTimeout(this.finalPodiumTimer);
            this.finalPodiumTimer = null;
          }
          this.finalPodiumTimer = setTimeout(async () => {
            await this.stopTournamentRecording();
          }, 8000);
        }
      }, 1000);
    } else {
      // Stage Cleared Celebration & Preparation for Next Stage
      this.stageQualifiers = qualifiers;
      this.stageEliminated = eliminated;

      // Update pool for next stage
      this.currentPool = qualifiers;

      const nextStage = this.stages[this.currentStageIndex + 1];

      setTimeout(() => {
        this.game.ui.showTournamentStageCleared(stage, nextStage, qualifiers, eliminated);
        this.transitionSecondsLeft = 6;
        this.isShowingStageCleared = true;
      }, 1200);
    }
  }

  /**
   * Advances to next stage
   */
  advanceToNextStage() {
    this.isShowingStageCleared = false;
    this.game.ui.hideTournamentStageCleared();

    this.currentStageIndex++;
    if (this.currentStageIndex < this.stages.length) {
      this.startStageIntro();
    }
  }

  /**
   * Skips the 30-second countdown immediately and starts the next independent tournament
   */
  skipPodiumTimerAndStartNext() {
    this.isShowingPodiumCountdown = false;
    this.launchNewTournamentInstance();
  }

  /**
   * Exits Tournament Mode back to normal match
   */
  exitTournament() {
    this.stopTournamentRecording();
    this.isRecordingEnabled = false;
    this.autoRecordActive = false;

    this.isActive = false;
    this.isStageBattleActive = false;
    this.stageCleared = false;
    this.isShowingIntro = false;
    this.isShowingStageCleared = false;
    this.isShowingPodiumCountdown = false;
    this.podiumResults = null;
    this.game.winner = null;
    this.game.winnerDeclared = false;
    this.totalTournaments = 1;
    this.completedTournaments = 0;
    this.game.bombs.setTournamentMode(false);
    this.game.items.setTournamentMode(false);
    this.game.ui.hideTournamentIntro();
    this.game.ui.hideTournamentStageCleared();
    this.game.ui.hideTournamentPodium();
    this.game.ui.removeTournamentBanner();
    this.game.restartMatch();
  }

  /**
   * Updates tournament timers and stages seamlessly in both foreground and background
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isActive) return;

    // 1. Stage Intro Showcase countdown
    if (this.isShowingIntro) {
      this.introElapsed = (this.introElapsed || 0) + dt;
      const count = this.currentPool?.length || 0;

      // Sequential country reveal: reveal all countries with sound effect detik as each appears
      const totalRevealDuration = Math.min(2.4, Math.max(0.7, count * 0.036));
      const revealInterval = count > 0 ? totalRevealDuration / count : 0.036;
      const targetRevealed = Math.min(count, Math.floor(this.introElapsed / revealInterval));

      if (targetRevealed > (this.revealedCountriesCount || 0)) {
        const nextCount = Math.min(count, (this.revealedCountriesCount || 0) + Math.min(4, targetRevealed - (this.revealedCountriesCount || 0)));
        for (let i = (this.revealedCountriesCount || 0); i < nextCount; i++) {
          sound.playCountryTick(i, count);
        }
        this.revealedCountriesCount = nextCount;
      }

      const prevSec = Math.ceil(this.introSecondsLeft);
      this.introSecondsLeft -= dt;
      const curSec = Math.max(0, Math.ceil(this.introSecondsLeft));
      if (curSec !== prevSec) {
        this.game.ui.updateTournamentIntroTimer(curSec);
        if (curSec > 0 && curSec < 10) {
          sound.playTick(false);
        }
      }
      if (this.introSecondsLeft <= 0) {
        this.isShowingIntro = false;
        this.launchStageBattle();
      }
      return;
    }

    // 2. Stage Cleared Transition countdown
    if (this.isShowingStageCleared) {
      const prevSec = Math.ceil(this.transitionSecondsLeft);
      this.transitionSecondsLeft -= dt;
      const curSec = Math.max(0, Math.ceil(this.transitionSecondsLeft));
      if (curSec !== prevSec) {
        this.game.ui.updateStageClearedCountdown(curSec);
      }
      if (this.transitionSecondsLeft <= 0) {
        this.isShowingStageCleared = false;
        this.advanceToNextStage();
      }
      return;
    }

    // 3. Podium Next Tournament countdown
    if (this.isShowingPodiumCountdown) {
      const prevSec = Math.ceil(this.podiumSecondsLeft);
      this.podiumSecondsLeft -= dt;
      const curSec = Math.max(0, Math.ceil(this.podiumSecondsLeft));
      if (curSec !== prevSec) {
        this.game.ui.updatePodiumNextCountdown(curSec);
      }
      if (this.podiumSecondsLeft <= 0) {
        this.isShowingPodiumCountdown = false;
        this.launchNewTournamentInstance();
      }
      return;
    }

    if (!this.isStageBattleActive || this.stageCleared || this.game.state !== 'BATTLE') {
      return;
    }

    if (this.natureShiftTimer !== undefined) {
      this.natureShiftTimer -= dt;
      if (this.natureShiftTimer <= 0) {
        this.natureShiftTimer = 11 + Math.random() * 5;
        this.triggerDynamicNatureShift();
      }
    }
  }

  /**
   * Dynamically randomizes weather & nature conditions mid-battle in tournament mode
   */
  triggerDynamicNatureShift() {
    const weathers = ['none', 'rain', 'wind', 'lightning', 'chaos'];
    const currentW = this.game.weather.weatherType;
    const availableW = weathers.filter((w) => w !== currentW);
    const newWeather = availableW[Math.floor(Math.random() * availableW.length)];

    const winds = ['gentle', 'strong', 'typhoon'];
    const newWind = winds[Math.floor(Math.random() * winds.length)];

    // Apply new weather and wind
    this.game.weather.setWeather(newWeather);
    this.game.weather.setWindStrength(newWind);

    // Optional dynamic gravity shift (45% chance)
    const gravities = ['normal', 'float', 'wave'];
    let newGravity = null;
    if (Math.random() < 0.45) {
      newGravity = gravities[Math.floor(Math.random() * gravities.length)];
      this.game.physics.setGravityMode(newGravity);
    }

    // Build prominent announcer banner text
    let alertText = 'WEATHER SHIFT!';
    if (newWeather === 'rain') {
      alertText = 'HEAVY RAINSTORM!';
    } else if (newWeather === 'lightning') {
      alertText = 'THUNDERSTORM ALERT!';
    } else if (newWeather === 'wind') {
      alertText = `WIND SURGE: ${newWind.toUpperCase()}!`;
    } else if (newWeather === 'chaos') {
      alertText = 'CHAOTIC TEMPEST!';
    } else if (newGravity && newGravity !== 'normal') {
      alertText = 'LOW-G GRAVITY WAVE!';
    } else {
      alertText = 'CALM CLEAR SKY!';
    }

    this.game.ui.showNatureAlert(alertText);
    sound.playZap();
    this.game.effects.triggerScreenShake(6);
  }
}
