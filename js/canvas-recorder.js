/**
 * Stickman Flag Chaos - Native Canvas 4K 60FPS Video Recorder Module
 *
 * Architecture:
 * - Direct Canvas Stream Capture: canvas.captureStream(60) -> MediaStream -> MediaRecorder
 * - Native 4K UHD Render: canvas.width = 3840, canvas.height = 2160, renderScale = 3.0
 *   (Preserves 100% of existing 1280x720 logical game coordinates, physics, and gameplay)
 * - Web Audio API Integration: Merges game AudioContext stream with video track
 * - Fully isolated: Zero mutations to existing gameplay, physics, AI, or scoring
 * - Standalone Floating Controller: START, PAUSE, RESUME, STOP, timer, and resolution controls
 */

export class CanvasRecorder {
  constructor(game, targetCanvas = null) {
    this.game = game;
    this.canvas = targetCanvas || this.detectGameCanvas();

    // State Machine: IDLE, RECORDING, PAUSED, STOPPING, COMPLETED, ERROR
    this.state = 'IDLE';
    this.errorMessage = null;

    // Recording Configuration
    this.config = {
      format: 'mp4', // 'mp4' (H.264/AVC1, VLC smooth) or 'webm' (VP9/VP8)
      resolutionKey: '4k', // '4k', '1440p', '1080p', 'native'
      fps: 60,
      videoBitsPerSecond: 40_000_000, // 40 Mbps default for crisp 4K UHD
      timesliceMs: 1000, // 1s chunks streaming
      includeAudio: true,
      restoreResolutionOnStop: true,
    };

    // Active Recording Session State
    this.mediaRecorder = null;
    this.videoStream = null;
    this.combinedStream = null;
    this.recordedChunks = [];
    this.startTime = 0;
    this.elapsedTimeMs = 0;
    this.timerInterval = null;
    this.previousResolution = 'auto';
    this.activeMimeType = '';
    this.isElectronFfmpeg = false;
    this.currentSessionId = null;
    this.lastSavedFile = null;
    this.lastSavedName = null;
    this.lastSavedSize = null;

    // Create and attach floating UI controller
    this.widgetEl = null;
    this.createUIWidget();
    this.bindKeyboardShortcuts();

    console.log('[CanvasRecorder] Native 4K Canvas Recorder initialized successfully.');
  }

  /**
   * Auto-detects the game canvas with robust fallbacks
   * @returns {HTMLCanvasElement|null}
   */
  detectGameCanvas() {
    let canvas = document.getElementById('game-canvas');
    if (canvas && canvas instanceof HTMLCanvasElement) {
      return canvas;
    }
    const allCanvases = document.querySelectorAll('canvas');
    for (const c of allCanvases) {
      if (c.width >= 1280 || c.id.includes('game') || c.id.includes('arena')) {
        return c;
      }
    }
    return allCanvases[0] || null;
  }

  /**
   * Evaluates browser support for Canvas Capture and MediaRecorder
   */
  checkBrowserSupport() {
    const hasCaptureStream = !!(this.canvas && (this.canvas.captureStream || this.canvas.mozCaptureStream));
    const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
    const supportedMime = this.getBestSupportedMimeType(this.config?.format || 'mp4');

    return {
      supported: hasCaptureStream && hasMediaRecorder && !!supportedMime,
      hasCaptureStream,
      hasMediaRecorder,
      mimeType: supportedMime,
    };
  }

  /**
   * Detects the best video codec supported by the browser
   */
  getBestSupportedMimeType(preferredFormat = this.config?.format || 'mp4') {
    if (typeof MediaRecorder === 'undefined') return '';

    let candidates = [];
    if (preferredFormat === 'mp4') {
      candidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1,opus',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
    } else {
      candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ];
    }

    for (const mime of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      } catch (e) {}
    }
    return '';
  }

  /**
   * Configures canvas to native 4K (or selected resolution) before capturing
   */
  prepareCanvasResolution() {
    if (!this.game) return;

    this.previousResolution = this.game.resolutionKey || 'auto';
    const resKey = this.config.resolutionKey;

    if (resKey === '4k' || resKey === '1440p' || resKey === '1080p') {
      // Set native render resolution via existing resolution manager
      if (typeof this.game.setResolution === 'function') {
        this.game.setResolution(resKey, false);
      }
    } else if (resKey === 'native') {
      // Keep current canvas resolution
    }

    console.log(
      `[CanvasRecorder] Canvas configured to ${this.canvas.width}x${this.canvas.height} (renderScale: ${this.game?.renderer?.renderScale})`
    );
  }

  /**
   * Starts native canvas recording
   * @param {Object} options Optional override configurations
   */
  async start(options = {}) {
    if (this.state === 'RECORDING') {
      console.warn('[CanvasRecorder] Already recording.');
      return;
    }

    this.errorMessage = null;

    // Check browser compatibility
    const support = this.checkBrowserSupport();
    if (!support.supported) {
      const err = !support.hasCaptureStream
        ? 'Canvas.captureStream is not supported in this browser.'
        : !support.hasMediaRecorder
        ? 'MediaRecorder is not supported in this browser.'
        : 'No compatible video recording codecs found.';
      this.handleError(err);
      return;
    }

    // Apply runtime options
    if (options.format) this.config.format = options.format;
    if (options.resolutionKey) this.config.resolutionKey = options.resolutionKey;
    if (options.videoBitsPerSecond) this.config.videoBitsPerSecond = options.videoBitsPerSecond;
    if (options.fps) this.config.fps = options.fps;
    if (typeof options.includeAudio === 'boolean') this.config.includeAudio = options.includeAudio;

    try {
      // 0. Electron FFmpeg Native GPU Recorder Integration
      this.isElectronFfmpeg = !!(typeof window !== 'undefined' && window.desktopApp?.isElectron && window.desktopApp?.startFfmpegRecording);
      if (this.isElectronFfmpeg) {
        const startRes = await window.desktopApp.startFfmpegRecording({
          resolutionKey: this.config.resolutionKey,
          fps: this.config.fps,
          videoBitsPerSecond: this.config.videoBitsPerSecond,
          includeAudio: this.config.includeAudio,
        });
        if (!startRes.success) {
          throw new Error(`FFmpeg GPU recorder failed to start: ${startRes.error}`);
        }
        this.currentSessionId = startRes.sessionId;
        console.log(`[CanvasRecorder] Desktop FFmpeg recorder active (${startRes.encoder}, session #${startRes.sessionId}). Target: ${startRes.filePath}`);
      }

      // Hide previous saved notification if visible
      const prevSavedBox = this.widgetEl?.querySelector('#cr-saved-box');
      if (prevSavedBox) prevSavedBox.classList.add('hidden');

      // 1. Prepare 4K Canvas Resolution
      this.prepareCanvasResolution();

      // 2. Capture native stream from canvas
      const captureFn = this.canvas.captureStream ? this.canvas.captureStream.bind(this.canvas) : this.canvas.mozCaptureStream.bind(this.canvas);
      this.videoStream = captureFn(this.config.fps);

      if (!this.videoStream || this.videoStream.getVideoTracks().length === 0) {
        throw new Error('Failed to obtain video track from canvas.captureStream.');
      }

      // 3. Obtain and mix Web Audio game track if enabled
      const tracks = [...this.videoStream.getVideoTracks()];
      if (this.config.includeAudio && this.game && this.game.sound) {
        try {
          const audioStream = this.game.sound.getAudioStream?.();
          if (audioStream && audioStream.getAudioTracks().length > 0) {
            tracks.push(audioStream.getAudioTracks()[0]);
            console.log('[CanvasRecorder] Synchronized Web Audio game track attached.');
          }
        } catch (audioErr) {
          console.warn('[CanvasRecorder] Audio track capture failed, proceeding video-only:', audioErr);
        }
      }

      this.combinedStream = new MediaStream(tracks);
      this.recordedChunks = [];
      const formatToUse = this.isElectronFfmpeg ? 'webm' : this.config.format;
      this.activeMimeType = this.getBestSupportedMimeType(formatToUse) || support.mimeType;

      // 4. Initialize MediaRecorder
      const recorderOptions = {
        mimeType: this.activeMimeType,
        videoBitsPerSecond: this.config.videoBitsPerSecond,
      };

      try {
        this.mediaRecorder = new MediaRecorder(this.combinedStream, recorderOptions);
      } catch (optErr) {
        console.warn(`[CanvasRecorder] Failed with options, falling back to default MediaRecorder:`, optErr);
        this.mediaRecorder = new MediaRecorder(this.combinedStream);
      }

      const activeSessionId = this.currentSessionId;
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          if (this.isElectronFfmpeg && window.desktopApp?.sendVideoChunk) {
            // Stream chunk direct to FFmpeg stdin on disk with session validation - zero RAM buildup
            event.data.arrayBuffer().then((buffer) => {
              window.desktopApp.sendVideoChunk(activeSessionId, buffer);
            });
          } else {
            this.recordedChunks.push(event.data);
          }
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[CanvasRecorder] MediaRecorder error:', event.error);
        this.handleError(event.error ? event.error.message : 'MediaRecorder runtime error.');
      };

      this.mediaRecorder.onstop = async () => {
        await this.finishAndDownload();
      };

      // 5. Start streaming chunks (250ms chunks in Electron for ultra-low latency direct-to-disk streaming)
      const timeslice = this.isElectronFfmpeg ? 250 : this.config.timesliceMs;
      this.mediaRecorder.start(timeslice);
      this.state = 'RECORDING';
      this.startTime = Date.now();
      this.elapsedTimeMs = 0;
      this.startTimer();

      this.updateUIWidget();
      console.log(`[CanvasRecorder] Started 4K Recording (${this.canvas.width}x${this.canvas.height} @ ${this.config.fps}fps, ${this.activeMimeType})`);
    } catch (err) {
      this.handleError(`Failed to start recording: ${err.message}`);
    }
  }

  /**
   * Pauses active recording
   */
  pause() {
    if (this.state !== 'RECORDING' || !this.mediaRecorder) return;
    try {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause();
        this.state = 'PAUSED';
        this.stopTimer();
        this.updateUIWidget();
        console.log('[CanvasRecorder] Recording paused.');
      }
    } catch (err) {
      console.warn('[CanvasRecorder] Error pausing MediaRecorder:', err);
    }
  }

  /**
   * Resumes paused recording
   */
  resume() {
    if (this.state !== 'PAUSED' || !this.mediaRecorder) return;
    try {
      if (this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
        this.state = 'RECORDING';
        this.startTime = Date.now() - this.elapsedTimeMs;
        this.startTimer();
        this.updateUIWidget();
        console.log('[CanvasRecorder] Recording resumed.');
      }
    } catch (err) {
      console.warn('[CanvasRecorder] Error resuming MediaRecorder:', err);
    }
  }

  /**
   * Stops recording and triggers auto-download
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.state === 'IDLE' || this.state === 'COMPLETED' || !this.mediaRecorder) {
      return this._stopPromise || Promise.resolve();
    }
    if (this.state === 'STOPPING' && this._stopPromise) {
      return this._stopPromise;
    }

    this.state = 'STOPPING';
    this.stopTimer();
    this.updateUIWidget();

    this._stopPromise = new Promise((resolve) => {
      this._stopResolve = resolve;
    });

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        await this.finishAndDownload();
      }
    } catch (err) {
      console.warn('[CanvasRecorder] Error stopping MediaRecorder:', err);
      await this.finishAndDownload();
    }

    return this._stopPromise;
  }

  /**
   * Compiles Blob, creates Object URL, downloads file, and frees memory
   */
  async finishAndDownload() {
    this.stopTimer();

    // Stop streams (only video track needs stopping; game audio track must stay alive for subsequent recordings)
    if (this.combinedStream) {
      this.combinedStream.getVideoTracks().forEach((track) => track.stop());
      this.combinedStream = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }

    // Direct-to-Disk Electron FFmpeg Recording Completion
    if (this.isElectronFfmpeg && window.desktopApp?.stopFfmpegRecording) {
      try {
        const result = await window.desktopApp.stopFfmpegRecording();
        this.lastSavedFile = result.filePath;
        this.lastSavedName = result.fileName;
        this.lastSavedSize = result.sizeMb;
        this.state = 'COMPLETED';
        this.restoreCanvasResolution();
        this.updateUIWidget();
        console.log(`[CanvasRecorder] Desktop 4K NVENC video saved: ${result.filePath} (${result.sizeMb} MB)`);
      } catch (err) {
        console.error('[CanvasRecorder] Error finalizing FFmpeg recording:', err);
        this.handleError(err.message);
      } finally {
        if (this._stopResolve) {
          const resolve = this._stopResolve;
          this._stopResolve = null;
          this._stopPromise = null;
          resolve();
        }
      }
      return;
    }

    if (!this.recordedChunks || this.recordedChunks.length === 0) {
      console.warn('[CanvasRecorder] No video data recorded.');
      this.state = 'IDLE';
      this.restoreCanvasResolution();
      this.updateUIWidget();
      return;
    }

    try {
      const mime = this.activeMimeType || (this.config.format === 'mp4' ? 'video/mp4' : 'video/webm');
      let blob = new Blob(this.recordedChunks, { type: mime });

      // If WebM format, patch duration and cues so it's seekable in VLC and other players
      if (mime.includes('webm') && this.elapsedTimeMs > 0) {
        try {
          blob = await this.patchWebmDuration(blob, this.elapsedTimeMs);
        } catch (patchErr) {
          console.warn('[CanvasRecorder] WebM duration patch skipped:', patchErr);
        }
      }

      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      console.log(`[CanvasRecorder] Video compilation finished: ${sizeMb} MB, ${this.recordedChunks.length} chunks.`);

      // Generate filename: game-recording-YYYY-MM-DD-HH-mm-ss.mp4 / .webm
      const now = new Date();
      const YYYY = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const HH = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const filename = `game-recording-${YYYY}-${MM}-${DD}-${HH}-${mm}-${ss}.${ext}`;

      // Create download link and trigger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up object URL and chunks to prevent memory leaks
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
        console.log(`[CanvasRecorder] Memory freed. Video saved as ${filename}`);
      }, 500);

      this.state = 'COMPLETED';
    } catch (err) {
      this.handleError(`Failed to save video: ${err.message}`);
    } finally {
      this.restoreCanvasResolution();
      if (this._stopResolve) {
        const resolve = this._stopResolve;
        this._stopResolve = null;
        this._stopPromise = null;
        resolve();
      }
      setTimeout(() => {
        if (this.state === 'COMPLETED') {
          this.state = 'IDLE';
          this.updateUIWidget();
        }
      }, 2500);
      this.updateUIWidget();
    }
  }

  /**
   * Injects exact duration into WebM EBML header to ensure seekability in VLC
   */
  async patchWebmDuration(blob, durationMs) {
    if (!durationMs || durationMs <= 0) return blob;
    try {
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);

      // Search for EBML Info tag: 0x15, 0x49, 0xA9, 0x66
      let infoPos = -1;
      for (let i = 0; i < Math.min(u8.length - 4, 2048); i++) {
        if (u8[i] === 0x15 && u8[i + 1] === 0x49 && u8[i + 2] === 0xa9 && u8[i + 3] === 0x66) {
          infoPos = i;
          break;
        }
      }

      if (infoPos !== -1) {
        // Search for Duration tag: 0x44, 0x89 within Info element
        for (let i = infoPos; i < Math.min(u8.length - 6, infoPos + 300); i++) {
          if (u8[i] === 0x44 && u8[i + 1] === 0x89) {
            const len = u8[i + 2];
            if (len === 0x84) {
              // 4-byte float32
              view.setFloat32(i + 3, durationMs, false);
              return new Blob([buffer], { type: blob.type });
            } else if (len === 0x88) {
              // 8-byte float64
              view.setFloat64(i + 3, durationMs, false);
              return new Blob([buffer], { type: blob.type });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[CanvasRecorder] WebM duration patching error:', err);
    }
    return blob;
  }

  /**
   * Restores resolution to previous setting if configured
   */
  restoreCanvasResolution() {
    // If a tournament series is still running, keep current resolution to prevent canvas redraw flashing
    if (this.game?.tournament?.isActive && this.game?.tournament?.isRecordingEnabled) {
      return;
    }
    if (this.config.restoreResolutionOnStop && this.game && this.previousResolution) {
      if (typeof this.game.setResolution === 'function') {
        this.game.setResolution(this.previousResolution, false);
      }
    }
  }

  /**
   * Internal timer management
   */
  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.elapsedTimeMs = Date.now() - this.startTime;
      this.updateTimerDisplay();
    }, 250);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  handleError(msg) {
    console.error(`[CanvasRecorder Error] ${msg}`);
    this.state = 'ERROR';
    this.errorMessage = msg;
    this.stopTimer();
    this.restoreCanvasResolution();
    this.updateUIWidget();
  }

  /**
   * Binds F9 hotkey to easily toggle recording
   */
  bindKeyboardShortcuts() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (this.state === 'IDLE' || this.state === 'COMPLETED' || this.state === 'ERROR') {
          this.start();
        } else if (this.state === 'RECORDING' || this.state === 'PAUSED') {
          this.stop();
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // Floating UI Controller Widget (Completely Isolated from Existing Game UI)
  // --------------------------------------------------------------------------

  createUIWidget() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('canvas-recorder-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'canvas-recorder-widget';
    widget.className = 'cr-widget cr-collapsed';

    widget.innerHTML = `
      <!-- Collapsed Pill View -->
      <button id="cr-pill-btn" class="cr-pill-btn" title="Native 4K Canvas Recorder (F9)">
        <span class="cr-pill-dot"></span>
        <span id="cr-pill-label" class="cr-pill-label">REC 4K</span>
        <span id="cr-pill-time" class="cr-pill-time hidden">00:00</span>
      </button>

      <!-- Expanded Control Card View -->
      <div id="cr-panel" class="cr-panel">
        <div class="cr-header">
          <div class="cr-title-row">
            <span class="cr-brand-icon">📹</span>
            <span class="cr-title">CANVAS 4K RECORDER</span>
          </div>
          <button id="cr-btn-close" class="cr-icon-btn" title="Minimize Widget">&times;</button>
        </div>

        <div class="cr-status-bar">
          <span id="cr-status-badge" class="cr-badge cr-badge-idle">IDLE</span>
          <span id="cr-timer" class="cr-timer">00:00</span>
        </div>

        <div class="cr-settings">
          <div class="cr-setting-row">
            <label for="cr-format-select">Format:</label>
            <select id="cr-format-select" class="cr-select">
              <option value="mp4" selected>MP4 (H.264) - VLC Smooth</option>
              <option value="webm">WebM (VP9) - Web</option>
            </select>
          </div>

          <div class="cr-setting-row">
            <label for="cr-res-select">Resolution:</label>
            <select id="cr-res-select" class="cr-select">
              <option value="4k" selected>4K UHD (3840×2160)</option>
              <option value="1440p">2K QHD (2560×1440)</option>
              <option value="1080p">Full HD (1920×1080)</option>
              <option value="native">Native Current</option>
            </select>
          </div>

          <div class="cr-setting-row">
            <label for="cr-bitrate-select">Bitrate:</label>
            <select id="cr-bitrate-select" class="cr-select">
              <option value="25000000">25 Mbps (Standard)</option>
              <option value="40000000" selected>40 Mbps (Crisp 4K)</option>
              <option value="60000000">60 Mbps (Ultra Quality)</option>
            </select>
          </div>

          <div class="cr-setting-row">
            <label class="cr-checkbox-label">
              <input type="checkbox" id="cr-audio-check" checked>
              <span>Capture Game Audio</span>
            </label>
          </div>

          <div class="cr-setting-row">
            <label class="cr-checkbox-label">
              <input type="checkbox" id="cr-standings-check" checked>
              <span>Record Live Standings</span>
            </label>
          </div>
        </div>

        <div id="cr-error-box" class="cr-error-box hidden"></div>

        <div class="cr-actions">
          <button id="cr-btn-start" class="cr-action-btn cr-btn-record">
            <span class="cr-btn-icon">●</span>
            <span>START REC</span>
          </button>
          <button id="cr-btn-pause" class="cr-action-btn cr-btn-pause hidden">
            <span>PAUSE</span>
          </button>
          <button id="cr-btn-resume" class="cr-action-btn cr-btn-resume hidden">
            <span>RESUME</span>
          </button>
          <button id="cr-btn-stop" class="cr-action-btn cr-btn-stop hidden">
            <span>STOP & SAVE</span>
          </button>
        </div>

        <div id="cr-saved-box" class="cr-saved-box hidden" style="margin: 8px 0; padding: 8px; background: rgba(0, 255, 135, 0.12); border: 1px solid #00ff87; border-radius: 6px; font-size: 11px;">
          <div style="color: #00ff87; font-weight: bold; margin-bottom: 3px;">✅ VIDEO SAVED DIRECT TO DISK</div>
          <div id="cr-saved-name" style="color: #eee; font-family: monospace; word-break: break-all; margin-bottom: 6px;"></div>
          <button id="cr-btn-open-folder" style="width: 100%; padding: 5px; background: #00ff87; color: #0c0e17; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;">📁 Open Recording Folder</button>
        </div>

        <div class="cr-footer">
          <span>Native Canvas Stream (60 FPS) • Hotkey: <b>F9</b></span>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    this.widgetEl = widget;

    // Bind widget interactions
    const pillBtn = widget.querySelector('#cr-pill-btn');
    const closeBtn = widget.querySelector('#cr-btn-close');
    const startBtn = widget.querySelector('#cr-btn-start');
    const pauseBtn = widget.querySelector('#cr-btn-pause');
    const resumeBtn = widget.querySelector('#cr-btn-resume');
    const stopBtn = widget.querySelector('#cr-btn-stop');
    const formatSelect = widget.querySelector('#cr-format-select');
    const resSelect = widget.querySelector('#cr-res-select');
    const bitrateSelect = widget.querySelector('#cr-bitrate-select');
    const audioCheck = widget.querySelector('#cr-audio-check');
    const standingsCheck = widget.querySelector('#cr-standings-check');

    pillBtn.addEventListener('click', () => {
      widget.classList.toggle('cr-collapsed');
    });

    closeBtn.addEventListener('click', () => {
      widget.classList.add('cr-collapsed');
    });

    startBtn.addEventListener('click', () => this.start());
    pauseBtn.addEventListener('click', () => this.pause());
    resumeBtn.addEventListener('click', () => this.resume());
    stopBtn.addEventListener('click', () => this.stop());

    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => {
        this.config.format = e.target.value;
      });
    }

    resSelect.addEventListener('change', (e) => {
      this.config.resolutionKey = e.target.value;
    });

    bitrateSelect.addEventListener('change', (e) => {
      this.config.videoBitsPerSecond = parseInt(e.target.value, 10) || 40_000_000;
    });

    audioCheck.addEventListener('change', (e) => {
      this.config.includeAudio = e.target.checked;
    });

    if (standingsCheck) {
      standingsCheck.addEventListener('change', (e) => {
        if (this.game?.renderer?.hud) {
          this.game.renderer.hud.showStandings = e.target.checked;
        }
      });
    }

    const openFolderBtn = widget.querySelector('#cr-btn-open-folder');
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => {
        if (window.desktopApp?.openVideoFolder) {
          window.desktopApp.openVideoFolder(this.lastSavedFile);
        }
      });
    }
  }

  updateTimerDisplay() {
    if (!this.widgetEl) return;
    const formatted = this.formatTime(this.elapsedTimeMs);
    const timerEl = this.widgetEl.querySelector('#cr-timer');
    const pillTimeEl = this.widgetEl.querySelector('#cr-pill-time');
    if (timerEl) timerEl.textContent = formatted;
    if (pillTimeEl) pillTimeEl.textContent = formatted;
  }

  updateUIWidget() {
    if (!this.widgetEl) return;

    const badge = this.widgetEl.querySelector('#cr-status-badge');
    const startBtn = this.widgetEl.querySelector('#cr-btn-start');
    const pauseBtn = this.widgetEl.querySelector('#cr-btn-pause');
    const resumeBtn = this.widgetEl.querySelector('#cr-btn-resume');
    const stopBtn = this.widgetEl.querySelector('#cr-btn-stop');
    const pill = this.widgetEl.querySelector('#cr-pill-btn');
    const pillTime = this.widgetEl.querySelector('#cr-pill-time');
    const errorBox = this.widgetEl.querySelector('#cr-error-box');
    const resSelect = this.widgetEl.querySelector('#cr-res-select');
    const bitrateSelect = this.widgetEl.querySelector('#cr-bitrate-select');

    // Reset controls
    startBtn.classList.add('hidden');
    pauseBtn.classList.add('hidden');
    resumeBtn.classList.add('hidden');
    stopBtn.classList.add('hidden');

    if (badge) {
      badge.className = 'cr-badge';
      badge.textContent = this.state;
    }

    if (errorBox) {
      if (this.state === 'ERROR' && this.errorMessage) {
        errorBox.textContent = this.errorMessage;
        errorBox.classList.remove('hidden');
      } else {
        errorBox.classList.add('hidden');
      }
    }

    switch (this.state) {
      case 'IDLE':
        badge?.classList.add('cr-badge-idle');
        startBtn.classList.remove('hidden');
        pill?.classList.remove('recording', 'paused');
        pillTime?.classList.add('hidden');
        if (resSelect) resSelect.disabled = false;
        if (bitrateSelect) bitrateSelect.disabled = false;
        break;

      case 'COMPLETED':
        badge?.classList.add('cr-badge-idle');
        if (badge) badge.textContent = 'SAVED';
        startBtn.classList.remove('hidden');
        pill?.classList.remove('recording', 'paused');
        pillTime?.classList.add('hidden');
        if (resSelect) resSelect.disabled = false;
        if (bitrateSelect) bitrateSelect.disabled = false;
        if (this.lastSavedName) {
          const savedBox = this.widgetEl.querySelector('#cr-saved-box');
          const savedName = this.widgetEl.querySelector('#cr-saved-name');
          if (savedBox && savedName) {
            savedName.textContent = `${this.lastSavedName} (${this.lastSavedSize} MB)`;
            savedBox.classList.remove('hidden');
          }
        }
        break;

      case 'RECORDING':
        badge?.classList.add('cr-badge-rec');
        pauseBtn.classList.remove('hidden');
        stopBtn.classList.remove('hidden');
        pill?.classList.add('recording');
        pill?.classList.remove('paused');
        pillTime?.classList.remove('hidden');
        if (resSelect) resSelect.disabled = true;
        if (bitrateSelect) bitrateSelect.disabled = true;
        break;

      case 'PAUSED':
        badge?.classList.add('cr-badge-paused');
        resumeBtn.classList.remove('hidden');
        stopBtn.classList.remove('hidden');
        pill?.classList.add('paused');
        pillTime?.classList.remove('hidden');
        break;

      case 'STOPPING':
        badge?.classList.add('cr-badge-stopping');
        break;

      case 'ERROR':
        badge?.classList.add('cr-badge-error');
        startBtn.classList.remove('hidden');
        pill?.classList.remove('recording', 'paused');
        pillTime?.classList.add('hidden');
        if (resSelect) resSelect.disabled = false;
        if (bitrateSelect) bitrateSelect.disabled = false;
        break;
    }
  }
}
