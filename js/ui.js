/**
 * Stickman Flag Chaos - UI Module
 * Manages external HUD, custom roster selection, stickman body color customizer,
 * background themes, center obstacles, countdown, and winner celebrations.
 * Strictly adheres to kid-friendly cartoon styling with NO emojis (pure SVGs only).
 */

import { CONFIG } from './config.js';
import { Flags } from './flags.js';
import { sound } from './audio.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // Element references
    this.announcerEl = null;
    this.winnerModal = document.getElementById('winner-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.debugPanel = document.getElementById('debug-panel');
    this.fpsCounter = document.getElementById('fps-counter');
    this.soundBtn = document.getElementById('btn-sound');
    this.pauseBtn = document.getElementById('btn-pause');
    this.rosterBtn = document.getElementById('btn-roster');
    this.hudBandTop = null;
    this.hudBandBottom = null;
    this.canvasWrapper = document.getElementById('canvas-wrapper');
    this.klasemenPanel = null;
    this.klasemenListEl = null;
    this.klasemenChip = null;
    this.klasemenCountBadge = null;
    this.klasemenChipBadge = null;
    this.klasemenRows = new Map();
    this.isKlasemenOpen = true;

    // Tournament elements (rendered directly in CanvasHUD)
    this.tournamentBanner = null;
    this.tournamentBannerTitle = null;
    this.tournamentBannerDesc = null;
    this.tournamentIntroModal = null;
    this.tournamentClearedModal = null;
    this.tournamentPodiumModal = null;
    this.tournamentSetupModal = document.getElementById('tournament-setup-modal');




    this.fighterCards = [];
    this.announcerTimer = null;

    // Roster configuration state
    this.targetFighterCount = 4;
    this.countryCustomColors = new Map(); // id -> hex color
    this.selectedCountryIds = ['indonesia', 'japan', 'usa', 'brazil'];
    this.rosterSearchQuery = '';

    // Initialize default colors
    CONFIG.COUNTRIES.forEach((c) => {
      this.countryCustomColors.set(c.id, c.bodyColor || c.primaryColor);
    });

    this.setupEventListeners();
    this.renderRosterGrid();
  }

  setupEventListeners() {
    // Sound button
    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        this.updateSoundIcon(isMuted);
      });
    }

    // Pause button
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        const paused = this.game.togglePause();
        this.updatePauseIcon(paused);
      });
    }

    // Restart button
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.game.restartMatch();
      });
    }

    // Klasemen toggle & controls
    const btnKlasemen = document.getElementById('btn-klasemen');
    if (btnKlasemen) {
      btnKlasemen.addEventListener('click', () => this.toggleKlasemen());
    }

    const btnKlasemenMin = document.getElementById('btn-klasemen-minimize');
    if (btnKlasemenMin) {
      btnKlasemenMin.addEventListener('click', () => this.minimizeKlasemen());
    }

    const btnKlasemenClose = document.getElementById('btn-klasemen-close');
    if (btnKlasemenClose) {
      btnKlasemenClose.addEventListener('click', () => this.hideKlasemen());
    }

    if (this.klasemenChip) {
      this.klasemenChip.addEventListener('click', () => this.showKlasemen());
    }

    // Tournament Mode controls
    const btnTournament = document.getElementById('btn-tournament');
    if (btnTournament) {
      btnTournament.addEventListener('click', () => {
        this.showTournamentSetupModal();
      });
    }

    const btnModalTournament = document.getElementById('btn-modal-tournament');
    if (btnModalTournament) {
      btnModalTournament.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('active');
        this.showTournamentSetupModal();
      });
    }

    // Tournament Setup Modal controls
    const btnSetupClose = document.getElementById('tournament-setup-close');
    const btnSetupCancel = document.getElementById('btn-tournament-setup-cancel');
    if (btnSetupClose) {
      btnSetupClose.addEventListener('click', () => this.hideTournamentSetupModal());
    }
    if (btnSetupCancel) {
      btnSetupCancel.addEventListener('click', () => this.hideTournamentSetupModal());
    }

    const presetBtns = document.querySelectorAll('.t-preset-group .t-preset-btn');
    const countInput = document.getElementById('tournament-count-input');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.count;
        if (val === 'infinite') {
          if (countInput) {
            countInput.value = '999';
            countInput.disabled = true;
          }
        } else {
          if (countInput) {
            countInput.value = val;
            countInput.disabled = false;
          }
        }
      });
    });

    if (countInput) {
      countInput.addEventListener('input', () => {
        const val = countInput.value;
        presetBtns.forEach((b) => {
          b.classList.toggle('active', b.dataset.count === val);
        });
      });
    }

    // Tournament Recording Controls & Options (Default: 4K, 60 Mbps, MP4)
    const recordToggle = document.getElementById('tournament-record-toggle');
    const recordOptionsContainer = document.getElementById('tournament-record-options');
    if (recordToggle && recordOptionsContainer) {
      recordToggle.addEventListener('change', () => {
        recordOptionsContainer.style.display = recordToggle.checked ? 'flex' : 'none';
      });
    }

    const setupRecordButtonGroup = (groupId) => {
      const group = document.getElementById(groupId);
      if (!group) return;
      const btns = group.querySelectorAll('.t-record-opt-btn');
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    };

    setupRecordButtonGroup('t-record-res-group');
    setupRecordButtonGroup('t-record-bitrate-group');
    setupRecordButtonGroup('t-record-format-group');

    const btnStartSeries = document.getElementById('btn-start-tournament-series');
    if (btnStartSeries) {
      btnStartSeries.addEventListener('click', () => {
        const activePreset = document.querySelector('.t-preset-group .t-preset-btn.active');
        let count = 1;
        if (activePreset && activePreset.dataset.count === 'infinite') {
          count = 'infinite';
        } else if (countInput) {
          count = Math.max(1, parseInt(countInput.value, 10) || 1);
        }

        let recordOptions = null;
        if (recordToggle && recordToggle.checked) {
          const activeRes = document.querySelector('#t-record-res-group .t-record-opt-btn.active');
          const activeBitrate = document.querySelector('#t-record-bitrate-group .t-record-opt-btn.active');
          const activeFormat = document.querySelector('#t-record-format-group .t-record-opt-btn.active');

          recordOptions = {
            enabled: true,
            resolutionKey: activeRes ? activeRes.dataset.res : '4k',
            videoBitsPerSecond: activeBitrate ? parseInt(activeBitrate.dataset.bitrate, 10) : 60_000_000,
            format: activeFormat ? activeFormat.dataset.format : 'mp4',
            fps: 60,
            includeAudio: true,
          };
        }

        this.hideTournamentSetupModal();
        this.game.startTournament(count, null, recordOptions);
      });
    }

    const btnSkipIntro = document.getElementById('btn-tournament-skip-intro');
    if (btnSkipIntro) {
      btnSkipIntro.addEventListener('click', () => {
        if (this.game.tournament) this.game.tournament.skipIntro();
      });
    }

    const btnIntroExit = document.getElementById('tournament-intro-exit');
    if (btnIntroExit) {
      btnIntroExit.addEventListener('click', () => {
        if (this.game.tournament) this.game.tournament.exitTournament();
      });
    }

    const btnBannerExit = document.getElementById('btn-tournament-exit');
    if (btnBannerExit) {
      btnBannerExit.addEventListener('click', () => {
        if (this.game.tournament) this.game.tournament.exitTournament();
      });
    }

    const btnClearedNext = document.getElementById('btn-cleared-next');
    if (btnClearedNext) {
      btnClearedNext.addEventListener('click', () => {
        if (this.game.tournament) this.game.tournament.advanceToNextStage();
      });
    }

    // Podium modal click to advance or return
    if (this.tournamentPodiumModal) {
      this.tournamentPodiumModal.addEventListener('click', () => {
        if (!this.tournamentPodiumModal.classList.contains('active')) return;
        if (this.game.tournament && this.game.tournament.isActive) {
          if (this.game.tournament.isShowingPodiumCountdown) {
            this.game.tournament.skipPodiumTimerAndStartNext();
          } else {
            this.hideTournamentPodium();
            this.game.tournament.exitTournament();
          }
        } else {
          this.hideTournamentPodium();
        }
      });
    }

    // Roster & Settings open
    if (this.rosterBtn && this.settingsModal) {
      this.rosterBtn.addEventListener('click', () => {
        this.switchTab('setup');
        this.settingsModal.classList.add('active');
      });
    }

    const settingsBtn = document.getElementById('btn-settings');
    const settingsClose = document.getElementById('settings-close');
    if (settingsBtn && this.settingsModal) {
      settingsBtn.addEventListener('click', () => {
        this.syncResolutionUI(this.game.resolutionKey);
        this.switchTab('arena');
        this.settingsModal.classList.add('active');
      });
    }
    if (settingsClose && this.settingsModal) {
      settingsClose.addEventListener('click', () => {
        this.settingsModal.classList.remove('active');
      });
    }

    // Modal Tabs
    const tabSetup = document.getElementById('tab-btn-setup');
    const tabArena = document.getElementById('tab-btn-arena');
    const tabChaos = document.getElementById('tab-btn-chaos');
    if (tabSetup) tabSetup.addEventListener('click', () => this.switchTab('setup'));
    if (tabArena) tabArena.addEventListener('click', () => this.switchTab('arena'));
    if (tabChaos) tabChaos.addEventListener('click', () => this.switchTab('chaos'));

    // Fighter Count buttons
    const countBtns = document.querySelectorAll('.count-btn');
    countBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const count = parseInt(e.target.dataset.count, 10);
        this.setFighterCount(count);
      });
    });

    // Search bar input for 100 countries
    const searchInput = document.getElementById('roster-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.rosterSearchQuery = e.target.value.toLowerCase().trim();
        this.renderRosterGrid();
      });
    }

    // Quick Action buttons
    const btnRandom = document.getElementById('btn-roster-random');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => this.pickRandomRoster());
    }

    const btnAll = document.getElementById('btn-roster-all');
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        this.selectedCountryIds = CONFIG.COUNTRIES.map((c) => c.id);
        this.renderRosterGrid();
      });
    }

    const btnTop16 = document.getElementById('btn-roster-top16');
    if (btnTop16) {
      btnTop16.addEventListener('click', () => {
        this.selectedCountryIds = CONFIG.COUNTRIES.slice(0, 16).map((c) => c.id);
        this.renderRosterGrid();
      });
    }

    const btnClear = document.getElementById('btn-roster-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.selectedCountryIds = [CONFIG.COUNTRIES[0].id, CONFIG.COUNTRIES[1].id];
        this.renderRosterGrid();
      });
    }

    const btnFlagColors = document.getElementById('btn-colors-flag');
    if (btnFlagColors) {
      btnFlagColors.addEventListener('click', () => this.setAllColorsToFlag());
    }

    const btnBlackColors = document.getElementById('btn-colors-black');
    if (btnBlackColors) {
      btnBlackColors.addEventListener('click', () => this.setAllColorsToBlack());
    }

    // Apply & Start Battle button
    const applyBtn = document.getElementById('btn-apply-roster');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applySettingsAndStart();
      });
    }

    // Winner actions & minimize
    const playAgainBtn = document.getElementById('btn-play-again');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        this.hideWinner();
        this.game.restartMatch();
      });
    }

    const winnerRosterBtn = document.getElementById('btn-winner-roster');
    if (winnerRosterBtn) {
      winnerRosterBtn.addEventListener('click', () => {
        this.hideWinner();
        this.switchTab('setup');
        if (this.settingsModal) this.settingsModal.classList.add('active');
      });
    }

    const winnerMinBtn = document.getElementById('btn-winner-minimize');
    const winnerCard = document.getElementById('winner-card');
    const winnerChip = document.getElementById('winner-min-chip');

    if (winnerMinBtn && winnerCard && winnerChip) {
      winnerMinBtn.addEventListener('click', () => {
        winnerCard.style.display = 'none';
        winnerChip.style.display = 'flex';
      });

      winnerChip.addEventListener('click', () => {
        winnerCard.style.display = 'block';
        winnerChip.style.display = 'none';
      });
    }

    // Resolution / Sharpness select
    const resolutionSelect = document.getElementById('setting-resolution');
    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', (e) => {
        this.game.setResolution(e.target.value);
      });
    }

    // Arena shape select
    const arenaShapeSelect = document.getElementById('setting-arena-shape');
    if (arenaShapeSelect) {
      arenaShapeSelect.addEventListener('change', (e) => {
        this.game.setArenaShape(e.target.value);
      });
    }

    // Theme select
    const themeSelect = document.getElementById('setting-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.game.setTheme(e.target.value);
      });
    }

    // Obstacle select
    const obstacleSelect = document.getElementById('setting-obstacle');
    if (obstacleSelect) {
      obstacleSelect.addEventListener('change', (e) => {
        this.game.setObstacle(e.target.value);
      });
    }

    // Arena size select
    const arenaSizeSelect = document.getElementById('setting-arena-size');
    if (arenaSizeSelect) {
      arenaSizeSelect.addEventListener('change', (e) => {
        this.game.setArenaSize(e.target.value);
      });
    }

    // Bounce speed select
    const bounceSelect = document.getElementById('setting-bounce');
    if (bounceSelect) {
      bounceSelect.addEventListener('change', (e) => {
        this.game.setBounceSpeed(e.target.value);
      });
    }

    // Gravity mode select
    const gravitySelect = document.getElementById('setting-gravity');
    if (gravitySelect) {
      gravitySelect.addEventListener('change', (e) => {
        this.game.setGravityMode(e.target.value);
      });
    }

    // Weather select
    const weatherSelect = document.getElementById('setting-weather');
    if (weatherSelect) {
      weatherSelect.addEventListener('change', (e) => {
        this.game.setWeather(e.target.value);
      });
    }

    // Volume slider
    const volumeSlider = document.getElementById('setting-volume');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        sound.setVolume(parseFloat(e.target.value));
      });
    }

    // Fighter HP select
    const hpSelect = document.getElementById('setting-hp');
    if (hpSelect) {
      hpSelect.addEventListener('change', (e) => {
        this.game.setFighterHp(e.target.value);
      });
    }

    // Movement speed select
    const moveSpdSelect = document.getElementById('setting-movement-speed');
    if (moveSpdSelect) {
      moveSpdSelect.addEventListener('change', (e) => {
        this.game.setMovementSpeed(e.target.value);
      });
    }

    // Wind strength select
    const windStrSelect = document.getElementById('setting-wind-strength');
    if (windStrSelect) {
      windStrSelect.addEventListener('change', (e) => {
        this.game.setWindStrength(e.target.value);
      });
    }

    // Lightning settings
    const lightCountSelect = document.getElementById('setting-lightning-count');
    const lightIntSelect = document.getElementById('setting-lightning-interval');
    const updateLightning = () => {
      this.game.setLightningSettings({
        count: lightCountSelect?.value,
        intervalKey: lightIntSelect?.value,
      });
    };
    if (lightCountSelect) lightCountSelect.addEventListener('change', updateLightning);
    if (lightIntSelect) lightIntSelect.addEventListener('change', updateLightning);

    // Bomb settings
    const bombEnSelect = document.getElementById('setting-bomb-enabled');
    const bombIntSelect = document.getElementById('setting-bomb-interval');
    const bombFuseSelect = document.getElementById('setting-bomb-fuse');
    const updateBomb = () => {
      this.game.setBombSettings({
        enabled: bombEnSelect?.value === 'true',
        intervalKey: bombIntSelect?.value,
        fuseTime: parseFloat(bombFuseSelect?.value || '5.0'),
      });
    };
    if (bombEnSelect) bombEnSelect.addEventListener('change', updateBomb);
    if (bombIntSelect) bombIntSelect.addEventListener('change', updateBomb);
    if (bombFuseSelect) bombFuseSelect.addEventListener('change', updateBomb);

    // Debug buttons
    const debugPause = document.getElementById('debug-btn-pause');
    const debugRestart = document.getElementById('debug-btn-restart');
    const debugPunch = document.getElementById('debug-btn-punch');
    if (debugPause) debugPause.addEventListener('click', () => this.game.togglePause());
    if (debugRestart) debugRestart.addEventListener('click', () => this.game.restartMatch());
    if (debugPunch) debugPunch.addEventListener('click', () => this.game.triggerTestPunch());
  }

  switchTab(tabKey) {
    const tabSetup = document.getElementById('tab-btn-setup');
    const tabArena = document.getElementById('tab-btn-arena');
    const tabChaos = document.getElementById('tab-btn-chaos');
    const paneSetup = document.getElementById('tab-content-setup');
    const paneArena = document.getElementById('tab-content-arena');
    const paneChaos = document.getElementById('tab-content-chaos');

    tabSetup?.classList.toggle('active', tabKey === 'setup');
    tabArena?.classList.toggle('active', tabKey === 'arena');
    tabChaos?.classList.toggle('active', tabKey === 'chaos');

    paneSetup?.classList.toggle('active', tabKey === 'setup');
    paneArena?.classList.toggle('active', tabKey === 'arena');
    paneChaos?.classList.toggle('active', tabKey === 'chaos');
  }

  setFighterCount(count) {
    this.targetFighterCount = count;
    document.querySelectorAll('.count-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === count);
    });

    // Adjust selected countries to match count
    if (count <= 8) {
      if (this.selectedCountryIds.length > count) {
        this.selectedCountryIds = this.selectedCountryIds.slice(0, count);
      } else if (this.selectedCountryIds.length < count) {
        const remaining = CONFIG.COUNTRIES.map((c) => c.id).filter(
          (id) => !this.selectedCountryIds.includes(id)
        );
        while (this.selectedCountryIds.length < count && remaining.length > 0) {
          this.selectedCountryIds.push(remaining.shift());
        }
      }
    } else {
      // For large team matches (> 8 fighters), ensure at least 2 teams are selected
      if (this.selectedCountryIds.length < 2) {
        this.selectedCountryIds = ['indonesia', 'japan', 'usa', 'brazil'];
      }
    }

    this.renderRosterGrid();
  }

  pickRandomRoster() {
    const shuffled = [...CONFIG.COUNTRIES].sort(() => 0.5 - Math.random());
    const count = this.targetFighterCount <= 8 ? this.targetFighterCount : Math.min(shuffled.length, Math.max(4, Math.floor(this.targetFighterCount / 4)));
    this.selectedCountryIds = shuffled.slice(0, Math.min(count, 100)).map((c) => c.id);
    this.renderRosterGrid();
  }

  setAllColorsToFlag() {
    CONFIG.COUNTRIES.forEach((c) => {
      this.countryCustomColors.set(c.id, c.primaryColor);
    });
    this.renderRosterGrid();
  }

  setAllColorsToBlack() {
    CONFIG.COUNTRIES.forEach((c) => {
      this.countryCustomColors.set(c.id, '#181B2A');
    });
    this.renderRosterGrid();
  }

  renderRosterGrid() {
    const gridEl = document.getElementById('roster-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const countBadge = document.getElementById('roster-count-badge');
    if (countBadge) {
      countBadge.textContent = `Selected: ${this.selectedCountryIds.length} / 100`;
    }

    const query = this.rosterSearchQuery || '';
    const filtered = CONFIG.COUNTRIES.filter((country) => {
      if (!query) return true;
      return (
        country.name.toLowerCase().includes(query) ||
        country.id.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'roster-empty-msg';
      emptyMsg.textContent = 'No country matching search.';
      emptyMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #889; padding: 20px; font-weight: 700;';
      gridEl.appendChild(emptyMsg);
      return;
    }

    filtered.forEach((country) => {
      const isSelected = this.selectedCountryIds.includes(country.id);
      const currentColor = this.countryCustomColors.get(country.id) || country.primaryColor;

      const card = document.createElement('div');
      card.className = `roster-card ${isSelected ? 'selected' : ''}`;
      card.dataset.id = country.id;

      card.innerHTML = `
        <div class="roster-check-indicator"></div>
        <div class="roster-flag-wrap">${Flags.getFlagSvg(country.id)}</div>
        <span class="roster-country-name">${country.name}</span>
        <div class="roster-color-row" title="Customize Body Color">
          <span class="roster-color-label">Color</span>
          <input type="color" class="roster-color-input" value="${currentColor}" data-id="${country.id}">
        </div>
      `;

      // Toggle country selection on card click
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('roster-color-input')) return;

        if (this.selectedCountryIds.includes(country.id)) {
          if (this.selectedCountryIds.length > 2) {
            this.selectedCountryIds = this.selectedCountryIds.filter((id) => id !== country.id);
            if (this.targetFighterCount <= 8) {
              this.targetFighterCount = this.selectedCountryIds.length;
              this.syncCountButtons(this.targetFighterCount);
            }
          }
        } else {
          const maxAllowed = this.targetFighterCount <= 8 ? this.targetFighterCount : 100;
          if (this.selectedCountryIds.length < maxAllowed) {
            this.selectedCountryIds.push(country.id);
            if (this.targetFighterCount <= 8) {
              this.targetFighterCount = this.selectedCountryIds.length;
              this.syncCountButtons(this.targetFighterCount);
            }
          }
        }
        this.renderRosterGrid();
      });

      // Color picker input event
      const colorInput = card.querySelector('.roster-color-input');
      colorInput.addEventListener('input', (e) => {
        this.countryCustomColors.set(country.id, e.target.value);
      });

      gridEl.appendChild(card);
    });
  }

  syncCountButtons(count) {
    document.querySelectorAll('.count-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === count);
    });
  }

  applySettingsAndStart() {
    // Build array of chosen country configs
    const roster = this.selectedCountryIds.map((id) => {
      const base = CONFIG.COUNTRIES.find((c) => c.id === id);
      return {
        ...base,
        bodyColor: this.countryCustomColors.get(id) || base.primaryColor,
      };
    });

    const arenaShape = document.getElementById('setting-arena-shape')?.value || 'octagon';
    const themeKey = document.getElementById('setting-theme')?.value || 'neon';
    const obstacleKey = document.getElementById('setting-obstacle')?.value || 'none';
    const bounceSpeed = document.getElementById('setting-bounce')?.value || '1.0';
    const gravityMode = document.getElementById('setting-gravity')?.value || 'normal';
    const weatherType = document.getElementById('setting-weather')?.value || 'none';
    const hpPreset = document.getElementById('setting-hp')?.value || '250';
    const movementSpeed = document.getElementById('setting-movement-speed')?.value || '1.0';
    const windStrength = document.getElementById('setting-wind-strength')?.value || 'strong';
    const lightningCount = document.getElementById('setting-lightning-count')?.value || '2';
    const lightningInterval = document.getElementById('setting-lightning-interval')?.value || 'normal';
    const bombEnabled = document.getElementById('setting-bomb-enabled')?.value === 'true';
    const bombInterval = document.getElementById('setting-bomb-interval')?.value || 'normal';
    const bombFuse = parseFloat(document.getElementById('setting-bomb-fuse')?.value || '5.0');
    const resolution = document.getElementById('setting-resolution')?.value || 'auto';

    this.game.startMatchWithSettings({
      roster,
      fighterCount: this.targetFighterCount,
      arenaShape,
      themeKey,
      obstacleKey,
      bounceSpeed,
      gravityMode,
      weatherType,
      hpPreset,
      movementSpeed,
      windStrength,
      lightningSettings: { count: lightningCount, intervalKey: lightningInterval },
      bombSettings: { enabled: bombEnabled, intervalKey: bombInterval, fuseTime: bombFuse },
      resolution,
    });
    this.settingsModal.classList.remove('active');
  }

  syncResolutionUI(key) {
    const resolutionSelect = document.getElementById('setting-resolution');
    if (resolutionSelect && key) {
      resolutionSelect.value = key;
    }
  }

  updateSoundIcon(isMuted) {
    if (!this.soundBtn) return;
    if (isMuted) {
      this.soundBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="ui-icon" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      `;
      this.soundBtn.setAttribute('title', 'Unmute Sound (M)');
    } else {
      this.soundBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="ui-icon" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      `;
      this.soundBtn.setAttribute('title', 'Mute Sound (M)');
    }
  }

  updatePauseIcon(isPaused) {
    if (!this.pauseBtn) return;
    if (isPaused) {
      this.pauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="ui-icon" width="22" height="22" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      `;
    } else {
      this.pauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="ui-icon" width="22" height="22" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
    }
  }

  /**
   * Initializes dynamic external HUD bands (Top & Bottom outside Arena)
   * Adaptive: Individual cards for <= 8 fighters; Country Team Leaderboard for > 8 fighters!
   */
  initFighterHUD(fighters) {
    this.fighterCards = [];
    this.teamCards = [];
    if (this.hudBandTop) this.hudBandTop.innerHTML = '';
    if (this.hudBandBottom) this.hudBandBottom.innerHTML = '';

    const count = fighters.length;

    // Initialize Klasemen Standings
    this.initKlasemen(fighters);

    if (count <= 8) {
      // Individual Fighter HUD
      const topCount = Math.ceil(count / 2);

      for (let i = 0; i < count; i++) {
        const fighter = fighters[i];
        const targetBand = i < topCount ? this.hudBandTop : this.hudBandBottom;
        if (!targetBand) continue;

        const card = document.createElement('div');
        card.className = 'fighter-hud-card';
        card.id = `fighter-hud-${fighter.country.id}-${i}`;

        const flagSvg = Flags.getFlagSvg(fighter.country.id);

        card.innerHTML = `
          <div class="hud-header">
            <div class="hud-flag-container">${flagSvg}</div>
            <div class="hud-info">
              <span class="hud-name">${fighter.name}</span>
              <span class="hud-badge status-ready" id="badge-${fighter.country.id}-${i}">READY</span>
            </div>
          </div>
          <div class="hud-hp-track">
            <div class="hud-hp-fill" id="hp-fill-${fighter.country.id}-${i}" style="width: 100%;"></div>
          </div>
          <div class="hud-hp-nums" id="hp-text-${fighter.country.id}-${i}">${fighter.maxHp} / ${fighter.maxHp}</div>
        `;

        targetBand.appendChild(card);

        this.fighterCards.push({
          fighter,
          cardEl: card,
          badgeEl: card.querySelector(`#badge-${fighter.country.id}-${i}`),
          hpFillEl: card.querySelector(`#hp-fill-${fighter.country.id}-${i}`),
          hpTextEl: card.querySelector(`#hp-text-${fighter.country.id}-${i}`),
        });
      }
    } else {
      // Large Team Leaderboard HUD (> 8 fighters, up to 100)
      const teamMap = new Map();
      fighters.forEach((f) => {
        const cid = f.country.id;
        if (!teamMap.has(cid)) {
          teamMap.set(cid, {
            country: f.country,
            fighters: [],
          });
        }
        teamMap.get(cid).fighters.push(f);
      });

      const teams = Array.from(teamMap.values());
      const topCount = Math.ceil(teams.length / 2);

      teams.forEach((team, idx) => {
        const targetBand = idx < topCount ? this.hudBandTop : this.hudBandBottom;
        if (!targetBand) return;

        const card = document.createElement('div');
        card.className = 'team-hud-card';
        card.id = `team-hud-${team.country.id}`;

        const flagSvg = Flags.getFlagSvg(team.country.id);

        card.innerHTML = `
          <div class="team-header">
            <div class="hud-flag-container">${flagSvg}</div>
            <span class="hud-name">${team.country.name}</span>
            <span class="team-alive-badge" id="team-badge-${team.country.id}">${team.fighters.length}/${team.fighters.length} ALIVE</span>
          </div>
          <div class="team-hp-track">
            <div class="team-hp-fill" id="team-fill-${team.country.id}" style="width: 100%;"></div>
          </div>
        `;

        targetBand.appendChild(card);

        this.teamCards.push({
          countryId: team.country.id,
          fighters: team.fighters,
          cardEl: card,
          badgeEl: card.querySelector(`#team-badge-${team.country.id}`),
          hpFillEl: card.querySelector(`#team-fill-${team.country.id}`),
        });
      });
    }

    // Hide fighter HUD cards if Klasemen leaderboard is open
    this.syncHudVisibility();
  }

  /**
   * Updates HP bars and status badges in real-time
   */
  updateFighterHUD() {
    if (this.teamCards && this.teamCards.length > 0) {
      for (let i = 0; i < this.teamCards.length; i++) {
        const { fighters, badgeEl, hpFillEl, cardEl } = this.teamCards[i];
        const total = fighters.length;
        const alive = fighters.filter((f) => !f.isKO).length;
        const totalHp = fighters.reduce((sum, f) => sum + (f.isKO ? 0 : f.hp), 0);
        const fighterMax = fighters[0]?.maxHp || 250;
        const maxTotalHp = total * fighterMax;
        const percent = Math.max(0, Math.min(100, (totalHp / maxTotalHp) * 100));

        if (hpFillEl) {
          hpFillEl.style.width = `${percent}%`;
          if (percent > 50) {
            hpFillEl.style.background = 'linear-gradient(90deg, #00FF87, #60EFA0)';
          } else if (percent > 22) {
            hpFillEl.style.background = 'linear-gradient(90deg, #FFAE00, #FFCC00)';
          } else {
            hpFillEl.style.background = 'linear-gradient(90deg, #FF1E56, #FF6080)';
          }
        }

        if (badgeEl) {
          if (alive === 0) {
            badgeEl.textContent = `0/${total} KO`;
            cardEl.classList.add('all-ko');
          } else {
            badgeEl.textContent = `${alive}/${total} ALIVE`;
            cardEl.classList.remove('all-ko');
          }
        }
      }
    } else {
      for (let i = 0; i < this.fighterCards.length; i++) {
        const { fighter, badgeEl, hpFillEl, hpTextEl, cardEl } = this.fighterCards[i];
        if (!hpFillEl || !hpTextEl) continue;

        const hpPercent = Math.max(0, Math.min(100, (fighter.hp / fighter.maxHp) * 100));
        hpFillEl.style.width = `${hpPercent}%`;
        hpTextEl.textContent = `${Math.round(fighter.hp)} / ${fighter.maxHp}`;

        // Color gradation based on HP
        if (hpPercent > 55) {
          hpFillEl.style.background = 'linear-gradient(90deg, #00FF87, #60EFA0)';
          cardEl.classList.remove('hp-low');
        } else if (hpPercent > 25) {
          hpFillEl.style.background = 'linear-gradient(90deg, #FFAE00, #FFCC00)';
          cardEl.classList.remove('hp-low');
        } else {
          hpFillEl.style.background = 'linear-gradient(90deg, #FF1E56, #FF6080)';
          cardEl.classList.add('hp-low');
        }

        // Update badge status
        if (fighter.isKO) {
          badgeEl.textContent = 'KO';
          badgeEl.className = 'hud-badge status-ko';
          cardEl.classList.add('is-ko');
        } else if (this.game.state === 'BATTLE') {
          badgeEl.textContent = 'FIGHTING';
          badgeEl.className = 'hud-badge status-fighting';
        } else {
          badgeEl.textContent = 'READY';
          badgeEl.className = 'hud-badge status-ready';
        }
      }
    }

    // Update Klasemen standings in real-time
    this.updateKlasemen();
  }

  /**
   * Initializes Live Battle Standings / Klasemen DOM rows
   */
  initKlasemen(fighters) {
    // DOM #klasemen-panel has been removed; In-Engine Canvas Standings is used directly
  }

  /**
   * Updates Klasemen rows
   */
  updateKlasemen() {
    // Handled directly inside CanvasHUD (drawStandings)
  }

  syncHudVisibility() {
    // No-op
  }

  showKlasemen() {
    this.isKlasemenOpen = true;
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showStandings = true;
    }
    const btn = document.getElementById('btn-klasemen');
    if (btn) btn.classList.add('active');
  }

  hideKlasemen() {
    this.isKlasemenOpen = false;
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showStandings = false;
    }
    const btn = document.getElementById('btn-klasemen');
    if (btn) btn.classList.remove('active');
  }

  minimizeKlasemen() {
    this.hideKlasemen();
  }

  toggleKlasemen() {
    const nextState = this.game?.renderer?.hud ? !this.game.renderer.hud.showStandings : !this.isKlasemenOpen;
    if (nextState) {
      this.showKlasemen();
    } else {
      this.hideKlasemen();
    }
  }

  /**
   * Shows centered countdown: 3 -> 2 -> 1 -> FIGHT!
   */
  showCountdown(text, isFight = false) {
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showCountdown(text, isFight);
    }
    if (!this.announcerEl) return;
    this.announcerEl.textContent = text;
    this.announcerEl.className = 'center-announcer active' + (isFight ? ' fight-text' : '');

    clearTimeout(this.announcerTimer);
    this.announcerTimer = setTimeout(() => {
      this.announcerEl.className = 'center-announcer';
    }, isFight ? 1100 : 700);
  }

  /**
   * Shows KO banner for knocked out fighter
   */
  showKOAnnounce(fighterName) {
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showKO(fighterName);
    }
    if (!this.announcerEl || this.game.state === 'RESULT') return;
    this.announcerEl.textContent = `${String(fighterName).toUpperCase()} OUT!`;
    this.announcerEl.className = 'center-announcer active ko-announce';

    clearTimeout(this.announcerTimer);
    this.announcerTimer = setTimeout(() => {
      this.announcerEl.className = 'center-announcer';
    }, 1200);
  }

  /**
   * Shows banner when an entire country team is eliminated
   */
  showTeamEliminatedAnnounce(countryOrName) {
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showTeamEliminated(countryOrName);
    }
    if (!this.announcerEl || this.game.state === 'RESULT') return;
    const nameStr =
      typeof countryOrName === 'object' && countryOrName !== null
        ? countryOrName.name || countryOrName.id
        : countryOrName;
    this.announcerEl.textContent = `${String(nameStr).toUpperCase()} OUT!`;
    this.announcerEl.className = 'center-announcer active ko-announce';

    clearTimeout(this.announcerTimer);
    this.announcerTimer = setTimeout(() => {
      this.announcerEl.className = 'center-announcer';
    }, 1300);
  }

  /**
   * Shows banner for dynamic weather & nature shifts during match
   */
  showNatureAlert(text) {
    if (this.game?.renderer?.hud) {
      this.game.renderer.hud.showNatureAlert(text);
    }
    if (!this.announcerEl || this.game.state === 'RESULT') return;
    this.announcerEl.textContent = String(text).toUpperCase();
    this.announcerEl.className = 'center-announcer active nature-alert';

    clearTimeout(this.announcerTimer);
    this.announcerTimer = setTimeout(() => {
      this.announcerEl.className = 'center-announcer';
    }, 1800);
  }

  /**
   * Shows the 4K recording indicator in the HUD
   */
  showRecIndicator() {
    if (this.recIndicator) {
      this.recIndicator.classList.remove('hidden');
    }
  }

  /**
   * Hides the 4K recording indicator
   */
  hideRecIndicator() {
    if (this.recIndicator) {
      this.recIndicator.classList.add('hidden');
    }
  }

  /**
   * Updates the timer on the 4K recording indicator
   * @param {string} timeText Formatted mm:ss string
   */
  updateRecTime(timeText) {
    if (this.recTime) {
      this.recTime.textContent = timeText;
    }
  }

  /**
   * Displays Winner screen celebration.
   * When Canvas HUD is active (default), Champion Card is rendered directly onto the HTML5 Canvas
   * (drawChampionCard) to ensure 100% video recording capture in 4K NVENC and zero out-of-canvas HTML overlay overflow.
   */
  showWinner(winnerFighter) {
    if (this.game?.renderer?.hud?.enabled) {
      if (this.winnerModal) this.winnerModal.classList.remove('active');
      return;
    }

    if (!this.winnerModal || !winnerFighter) return;

    const flagContainer = document.getElementById('winner-flag');
    const nameEl = document.getElementById('winner-name');
    const chipNameEl = document.getElementById('winner-chip-name');
    const winnerCard = document.getElementById('winner-card');
    const winnerChip = document.getElementById('winner-min-chip');

    // Reset visibility to expanded card
    if (winnerCard) winnerCard.style.display = 'block';
    if (winnerChip) winnerChip.style.display = 'none';

    const countryId = winnerFighter.country?.id || winnerFighter.id;
    const countryName = winnerFighter.country?.name || winnerFighter.name || 'Champion';

    if (flagContainer && countryId && typeof Flags !== 'undefined') {
      flagContainer.innerHTML = Flags.getFlagSvg(countryId);
    }
    if (nameEl) {
      nameEl.textContent = countryName.toUpperCase();
    }
    if (chipNameEl) {
      chipNameEl.textContent = `${countryName.toUpperCase()} WINS!`;
    }

    this.winnerModal.classList.add('active');
  }

  hideWinner() {
    if (this.winnerModal) {
      this.winnerModal.classList.remove('active');
    }
    const winnerCard = document.getElementById('winner-card');
    const winnerChip = document.getElementById('winner-min-chip');
    if (winnerCard) winnerCard.style.display = 'block';
    if (winnerChip) winnerChip.style.display = 'none';
  }

  updateFPS(fps) {
    if (this.fpsCounter) {
      this.fpsCounter.textContent = `${Math.round(fps)} FPS`;
    }
  }

  setDebugVisible(visible) {
    if (this.debugPanel) {
      this.debugPanel.style.display = visible ? 'block' : 'none';
    }
  }

  /* --------------------------------------------------------------------------
     Tournament Mode UI Handlers
     -------------------------------------------------------------------------- */

  /**
   * Displays tournament intro (handled directly by CanvasHUD)
   */
  showTournamentIntro(stage, countries, conditions, secondsLeft = 30) {
    if (this.settingsModal) this.settingsModal.classList.remove('active');
    if (this.winnerModal) this.winnerModal.classList.remove('active');
  }

  updateTournamentIntroTimer(secondsLeft) {
    // Handled directly inside CanvasHUD
  }

  hideTournamentIntro() {
    // Handled directly inside CanvasHUD
  }

  setTournamentBanner(title, desc) {
    // Handled directly inside CanvasHUD
  }

  removeTournamentBanner() {
    // Handled directly inside CanvasHUD
  }

  /**
   * Displays Stage Cleared (handled directly by CanvasHUD)
   */
  showTournamentStageCleared(stage, nextStage, qualifiers, eliminated) {
    // Handled directly inside CanvasHUD
  }

  updateStageClearedCountdown(seconds) {
    // Handled directly inside CanvasHUD
  }

  hideTournamentStageCleared() {
    // Handled directly inside CanvasHUD
  }

  showTournamentSetupModal() {
    if (this.tournamentSetupModal) {
      this.tournamentSetupModal.classList.add('active');
    }
  }

  hideTournamentSetupModal() {
    if (this.tournamentSetupModal) {
      this.tournamentSetupModal.classList.remove('active');
    }
  }

  /**
   * Displays the Grand Final Podium (handled directly by CanvasHUD)
   */
  showTournamentPodium(topResults, hasNextTournament = false, secondsLeft = 30) {
    // Handled directly inside CanvasHUD (drawTournamentPodium)
  }

  updatePodiumNextCountdown(seconds) {
    // Handled directly inside CanvasHUD
  }

  hideTournamentPodium() {
    // Handled directly inside CanvasHUD
  }
}

