/**
 * Stickman Flag Chaos - In-Game 4K Screen & Tab Recorder Module
 * Captures full tab view (Canvas, Standings, Champion Podium, Topbar, Surrounding UI)
 * with synchronized Web Audio and Tab Audio using Tab Capture API (getDisplayMedia).
 * Encodes directly to standard MP4 (H.264/AAC).
 * Automatically saves per tournament and seamlessly retains stream across multi-tournament series.
 */

export class GameRecorder {
  constructor(game) {
    this.game = game;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.elapsedSeconds = 0;
    this.currentTournamentIndex = 1;
    this.saveDirHandle = null;
    this.saveFolderName = 'Browser Downloads (Default)';
    this.displayStream = null;
    this.combinedStream = null;
    this.audioMixerDest = null;
    this.mimeType = this.detectSupportedMimeType();
  }

  /**
   * Detects optimal supported MP4 MIME type in current browser
   */
  detectSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return 'video/mp4';

    const types = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/mp4';
  }

  /**
   * Prompts user to select a local folder on their PC using the File System Access API
   * @returns {Promise<string>} The selected folder name or fallback message
   */
  async chooseSaveDirectory() {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        this.saveDirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'videos',
        });
        this.saveFolderName = this.saveDirHandle.name || 'Custom Folder';
        return this.saveFolderName;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[GameRecorder] Directory picker error, defaulting to browser downloads:', err);
        }
      }
    }
    this.saveDirHandle = null;
    this.saveFolderName = 'Browser Downloads (Default)';
    return this.saveFolderName;
  }

  /**
   * Acquires video stream via Tab Capture API (getDisplayMedia) to record
   * the full tab (Canvas + Standings + Podium + Topbar).
   * Reuses active stream across tournaments in a series without asking permission again.
   * Gracefully falls back to canvas capture if prompt is cancelled or unsupported.
   * @returns {Promise<MediaStream|null>}
   */
  async acquireStream() {
    // 1. Reuse existing active display stream if already granted during this tournament series
    if (this.displayStream && this.displayStream.active) {
      const activeVideo = this.displayStream.getVideoTracks().filter((t) => t.readyState === 'live');
      if (activeVideo.length > 0) {
        return this.displayStream;
      }
    }

    // 2. Request Tab Capture via getDisplayMedia
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const displayPromise = navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            frameRate: { ideal: 60, max: 60 },
          },
          audio: {
            suppressLocalAudioPlayback: false,
          },
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          systemAudio: 'include',
        });

        // 10-second safety timeout so recorder never hangs if prompt is dismissed silently
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getDisplayMedia timeout')), 10000)
        );

        const stream = await Promise.race([displayPromise, timeoutPromise]);

        this.displayStream = stream;

        // Clean up if user manually clicks "Stop sharing" on the browser banner
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener('ended', () => {
            console.log('[GameRecorder] Tab/screen capture ended by user');
            this.stopAllStreams();
          });
        }

        return stream;
      } catch (err) {
        console.warn('[GameRecorder] getDisplayMedia cancelled, timed out or unavailable, falling back to canvas capture:', err);
      }
    }

    // 3. Fallback: Direct canvas capture stream
    if (this.game.canvas?.captureStream) {
      return this.game.canvas.captureStream(60);
    }

    return null;
  }

  /**
   * Combines video stream with synchronized game Web Audio and Tab Audio into a single MediaStream
   * @param {MediaStream} rawStream
   * @returns {MediaStream}
   */
  createCombinedStream(rawStream) {
    if (!rawStream) return null;

    const videoTracks = rawStream.getVideoTracks();
    const tabAudioTracks = rawStream.getAudioTracks();

    // Get Web Audio synthesizer stream from SoundManager
    const gameAudioStream = this.game.sound ? this.game.sound.getAudioStream() : null;
    const gameAudioTracks = gameAudioStream ? gameAudioStream.getAudioTracks() : [];

    const finalAudioTracks = [];

    // If both tab audio and game audio exist, mix them via Web Audio AudioContext
    if (tabAudioTracks.length > 0 && gameAudioTracks.length > 0 && this.game.sound?.ctx) {
      try {
        const audioCtx = this.game.sound.ctx;
        if (!this.audioMixerDest) {
          this.audioMixerDest = audioCtx.createMediaStreamDestination();
        }
        const tabSource = audioCtx.createMediaStreamSource(new MediaStream([tabAudioTracks[0]]));
        const gameSource = audioCtx.createMediaStreamSource(new MediaStream([gameAudioTracks[0]]));
        tabSource.connect(this.audioMixerDest);
        gameSource.connect(this.audioMixerDest);
        finalAudioTracks.push(...this.audioMixerDest.stream.getAudioTracks());
      } catch (e) {
        console.warn('[GameRecorder] Failed to mix tab and game audio, using game audio track:', e);
        finalAudioTracks.push(gameAudioTracks[0]);
      }
    } else if (gameAudioTracks.length > 0) {
      finalAudioTracks.push(gameAudioTracks[0]);
    } else if (tabAudioTracks.length > 0) {
      finalAudioTracks.push(tabAudioTracks[0]);
    }

    return new MediaStream([
      ...videoTracks,
      ...finalAudioTracks,
    ]);
  }

  /**
   * Starts recording the tournament in 4K MP4 with full UI and synchronized audio
   * @param {number} tournamentNumber The index of the current tournament in the series
   * @returns {Promise<boolean>}
   */
  async startRecording(tournamentNumber = 1) {
    if (this.isRecording) {
      await this.stopAndSave(this.currentTournamentIndex);
    }

    this.currentTournamentIndex = tournamentNumber;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;

    try {
      const rawStream = await this.acquireStream();
      if (!rawStream) {
        console.warn('[GameRecorder] Cannot record: No video stream available');
        return false;
      }

      this.combinedStream = this.createCombinedStream(rawStream);
      if (!this.combinedStream) {
        console.warn('[GameRecorder] Failed to create combined stream');
        return false;
      }

      this.mimeType = this.detectSupportedMimeType();

      // Configure MediaRecorder for 4K quality with crisp MP4 encoding
      const options = {
        mimeType: this.mimeType,
        videoBitsPerSecond: 28000000, // 28 Mbps for 4K Ultra HD
        audioBitsPerSecond: 192000,   // 192 kbps high fidelity audio
      };

      try {
        this.mediaRecorder = new MediaRecorder(this.combinedStream, options);
      } catch (optErr) {
        console.warn(`[GameRecorder] Options ${this.mimeType} rejected, falling back to default options:`, optErr);
        this.mediaRecorder = new MediaRecorder(this.combinedStream);
      }

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Slice chunks every 1 second for steady buffer management
      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Update UI HUD
      if (this.game.ui) {
        this.game.ui.showRecIndicator();
        this.game.ui.updateRecTime('00:00');
      }

      console.log(`[GameRecorder] Started 4K MP4 recording for Tournament #${tournamentNumber} using ${this.mimeType}`);
      return true;
    } catch (err) {
      console.error('[GameRecorder] Failed to start MediaRecorder:', err);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stops the current tournament recording and automatically saves the video file as .mp4
   * @param {number} tournamentNumber The index of the tournament completed
   * @returns {Promise<boolean>}
   */
  async stopAndSave(tournamentNumber = null) {
    if (!this.isRecording || !this.mediaRecorder) {
      return false;
    }

    const tournNum = tournamentNumber || this.currentTournamentIndex || 1;
    this.isRecording = false;

    if (this.game.ui) {
      this.game.ui.hideRecIndicator();
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const extension = 'mp4';
          const now = new Date();
          const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
          const filename = `Stickman_Tournament_${tournNum}_4K_${timestamp}.${extension}`;

          const blob = new Blob(this.recordedChunks, { type: this.mimeType || 'video/mp4' });
          this.recordedChunks = [];

          // 1. Save directly into chosen directory via File System Access API if user selected one
          if (this.saveDirHandle) {
            try {
              const fileHandle = await this.saveDirHandle.getFileHandle(filename, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              console.log(`[GameRecorder] Video saved directly to ${this.saveFolderName}/${filename}`);

              if (this.game.ui) {
                this.game.ui.showNatureAlert(`TOURNAMENT #${tournNum} SAVED (MP4)!`);
              }
              resolve(true);
              return;
            } catch (fsErr) {
              console.warn('[GameRecorder] Failed to write directly to folder, falling back to download:', fsErr);
            }
          }

          // 2. Fallback: Standard browser download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1500);

          console.log(`[GameRecorder] Video downloaded automatically as ${filename}`);
          if (this.game.ui) {
            this.game.ui.showNatureAlert(`TOURNAMENT #${tournNum} MP4 RECORDING SAVED!`);
          }

          resolve(true);
        } catch (err) {
          console.error('[GameRecorder] Error saving video file:', err);
          resolve(false);
        }
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          resolve(false);
        }
      } catch (stopErr) {
        console.warn('[GameRecorder] Error stopping MediaRecorder:', stopErr);
        resolve(false);
      }
    });
  }

  /**
   * Cleanly closes all display and media streams (called on tournament exit)
   */
  stopAllStreams() {
    if (this.displayStream) {
      try {
        this.displayStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.displayStream = null;
    }
    if (this.combinedStream) {
      try {
        this.combinedStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.combinedStream = null;
    }
    this.audioMixerDest = null;
  }

  /**
   * Updates recording elapsed timer
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isRecording) return;

    this.elapsedSeconds += dt;

    if (this.game.ui) {
      const minutes = Math.floor(this.elapsedSeconds / 60);
      const seconds = Math.floor(this.elapsedSeconds % 60);
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      this.game.ui.updateRecTime(formatted);
    }
  }
}
