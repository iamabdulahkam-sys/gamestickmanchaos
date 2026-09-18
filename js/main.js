/**
 * Stickman Flag Chaos - Main Entry Point
 * Initializes canvas, handles responsive scaling, binds keyboard shortcuts, and boots game.
 */

import { CONFIG } from './config.js';
import { GameManager } from './game.js';
import { sound } from './audio.js';
import { FLAGS } from './flags.js';
import { CanvasRecorder } from './canvas-recorder.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element #game-canvas not found.');
    return;
  }

  // Set internal virtual resolution
  canvas.width = CONFIG.CANVAS.WIDTH;
  canvas.height = CONFIG.CANVAS.HEIGHT;

  // Responsive canvas container sizing
  function resizeCanvas() {
    const container = document.getElementById('canvas-wrapper');
    if (!container) return;

    const contWidth = container.clientWidth;
    const contHeight = container.clientHeight;

    const targetRatio = CONFIG.CANVAS.ASPECT_RATIO;
    const currentRatio = contWidth / contHeight;

    let renderW, renderH;

    if (currentRatio > targetRatio) {
      renderH = contHeight;
      renderW = contHeight * targetRatio;
    } else {
      renderW = contWidth;
      renderH = contWidth / targetRatio;
    }

    canvas.style.width = `${Math.floor(renderW)}px`;
    canvas.style.height = `${Math.floor(renderH)}px`;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  window.resizeCanvas = resizeCanvas;

  // Initialize Game Orchestrator
  const game = new GameManager(canvas);
  window.game = game;
  window.sound = sound;
  window.CONFIG = CONFIG;
  window.FLAGS = FLAGS;
  window.Flags = FLAGS;
  game.init();

  // Initialize isolated Native Canvas 4K Recorder
  window.canvasRecorder = new CanvasRecorder(game, canvas);

  // First interaction audio unlock
  const unlockAudio = () => {
    sound.ensureActive();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    // Escape or Enter: Dismiss or advance from podium modal if active
    if (e.code === 'Escape' || e.code === 'Enter') {
      const podiumModal = document.getElementById('tournament-podium-modal');
      if (podiumModal && podiumModal.classList.contains('active')) {
        e.preventDefault();
        if (game.tournament && game.tournament.isActive) {
          if (game.tournament.isShowingPodiumCountdown) {
            game.tournament.skipPodiumTimerAndStartNext();
          } else {
            game.ui.hideTournamentPodium();
            game.tournament.exitTournament();
          }
        } else {
          game.ui.hideTournamentPodium();
        }
        return;
      }
    }

    // Space: Pause/Resume
    if (e.code === 'Space') {
      e.preventDefault();
      const isPaused = game.togglePause();
      game.ui.updatePauseIcon(isPaused);
    }
    // R: Restart match
    else if (e.code === 'KeyR') {
      e.preventDefault();
      game.restartMatch();
    }
    // D: Toggle Debug Mode
    else if (e.code === 'KeyD') {
      e.preventDefault();
      game.debugMode = !game.debugMode;
      game.ui.setDebugVisible(game.debugMode);
    }
    // M: Toggle Mute
    else if (e.code === 'KeyM') {
      e.preventDefault();
      const isMuted = sound.toggleMute();
      game.ui.updateSoundIcon(isMuted);
    }
    // K: Toggle Standings / Klasemen
    else if (e.code === 'KeyK') {
      e.preventDefault();
      game.ui.toggleKlasemen();
    }
    // T: Start Tournament Mode
    else if (e.code === 'KeyT') {
      e.preventDefault();
      game.startTournament();
    }
  });
});
