/**
 * Stickman Flag Chaos - Background Ticker Module
 * Uses an inline Web Worker to provide an unthrottled 60 FPS heartbeat clock
 * when the game tab is in the background (document.hidden = true).
 */

export class BackgroundTicker {
  constructor(onTick) {
    this.onTick = onTick;
    this.worker = null;
    this.isBackground = false;
    this.workerBlobUrl = null;

    this.initWorker();
    this.setupVisibilityListener();
  }

  initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    const workerSource = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (!timer) {
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 1000 / 60);
          }
        } else if (e.data === 'stop') {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      };
    `;

    try {
      const blob = new Blob([workerSource], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerBlobUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick' && this.isBackground && typeof this.onTick === 'function') {
          this.onTick(1 / 60);
        }
      };
    } catch (err) {
      console.warn('[BackgroundTicker] Failed to initialize Web Worker:', err);
    }
  }

  setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.startBackgroundMode();
      } else {
        this.stopBackgroundMode();
      }
    });
  }

  startBackgroundMode() {
    this.isBackground = true;
    if (this.worker) {
      this.worker.postMessage('start');
    }
  }

  stopBackgroundMode() {
    this.isBackground = false;
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  destroy() {
    this.stopBackgroundMode();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
  }
}
