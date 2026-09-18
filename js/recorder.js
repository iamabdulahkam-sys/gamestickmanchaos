/**
 * Stickman Flag Chaos - In-Game 4K Screen Recorder Module
 * Captures pixel-perfect 4K 60 FPS video directly from HTML5 Canvas with synchronized Web Audio.
 * Supports custom save folder via File System Access API with automatic fallback to browser download.
 * Automatically saves per tournament and seamlessly continues recording for multi-tournament series.
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
    this.mimeType = this.detectSupportedMimeType();
  }

  /**
   * Detects optimal supported MIME type in current browser
   */
  detectSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return 'video/webm';

    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm',
      'video/mp4',
    ];

    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/webm';
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
          console.warn('Directory picker error, defaulting to browser downloads:', err);
        }
      }
    }
    this.saveDirHandle = null;
    this.saveFolderName = 'Browser Downloads (Default)';
    return this.saveFolderName;
  }

  /**
   * Starts recording canvas in 4K 60FPS with Web Audio
   * @param {number} tournamentNumber The index of the current tournament in the series
   */
  startRecording(tournamentNumber = 1) {
    if (this.isRecording) {
      this.stopAndSave(this.currentTournamentIndex);
    }

    this.currentTournamentIndex = tournamentNumber;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;

    try {
      const canvas = this.game.canvas;
      if (!canvas) {
        console.warn('Cannot record: Canvas element not found');
        return false;
      }

      // Capture 60 FPS video stream directly from game canvas
      const videoStream = canvas.captureStream(60);

      // Get audio stream from SoundManager if available
      let combinedStream = videoStream;
      const audioStream = this.game.sound ? this.game.sound.getAudioStream() : null;

      if (audioStream && audioStream.getAudioTracks().length > 0) {
        const audioTrack = audioStream.getAudioTracks()[0];
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          audioTrack,
        ]);
      }

      // Configure MediaRecorder with high bitrate for 4K quality (28 Mbps)
      const options = {
        mimeType: this.mimeType,
        videoBitsPerSecond: 28000000, // 28 Mbps for crisp 4K Ultra HD
        audioBitsPerSecond: 192000,   // 192 kbps high fidelity audio
      };

      this.mediaRecorder = new MediaRecorder(combinedStream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Start recording with 1-second chunks for smooth memory management
      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Update UI indicator
      if (this.game.ui) {
        this.game.ui.showRecIndicator();
        this.game.ui.updateRecTime('00:00');
      }

      console.log(`[GameRecorder] Started 4K recording for Tournament #${tournamentNumber} using ${this.mimeType}`);
      return true;
    } catch (err) {
      console.error('[GameRecorder] Failed to start MediaRecorder:', err);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stops the current tournament recording and automatically saves the video file
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
          const extension = this.mimeType.includes('mp4') ? 'mp4' : 'webm';
          const now = new Date();
          const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
          const filename = `Stickman_Tournament_${tournNum}_4K_${timestamp}.${extension}`;

          const blob = new Blob(this.recordedChunks, { type: this.mimeType });
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
                this.game.ui.showNatureAlert(`TOURNAMENT #${tournNum} SAVED (4K)!`);
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
            this.game.ui.showNatureAlert(`TOURNAMENT #${tournNum} RECORDING SAVED!`);
          }

          resolve(true);
        } catch (err) {
          console.error('[GameRecorder] Error saving video file:', err);
          resolve(false);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (stopErr) {
        console.warn('[GameRecorder] Error stopping MediaRecorder:', stopErr);
        resolve(false);
      }
    });
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
