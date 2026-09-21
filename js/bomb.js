/**
 * Stickman Flag Chaos - Time Bomb Module
 * Manages periodic time bomb spawning, sizzling fuse animation, audio ticking,
 * and high-impact cartoon KABOOM explosions that blast fighters across the arena.
 */

import { CONFIG } from './config.js';
import { sound } from './audio.js';

export class BombManager {
  constructor() {
    this.bombs = [];
    this.enabled = true;
    this.intervalKey = 'normal'; // frequent, normal, rare
    this.fuseTime = 5.0; // 3, 5, 8
    this.spawnTimer = 10.0;
    this.idCounter = 1;
    this.isTournamentMode = false;
    this.maxConcurrentBombs = 1;
  }

  setTournamentMode(isTournament) {
    this.isTournamentMode = Boolean(isTournament);
    if (this.isTournamentMode) {
      // In tournament: 2 to 3 active bombs in the arena!
      this.maxConcurrentBombs = Math.floor(Math.random() * 2) + 2;
      this.spawnTimer = 1.5;
    } else {
      this.maxConcurrentBombs = 1;
    }
  }

  setSettings(opts = {}) {
    if (opts.enabled !== undefined) this.enabled = Boolean(opts.enabled);
    if (opts.intervalKey && CONFIG.BOMB_CONFIG.intervals[opts.intervalKey]) {
      this.intervalKey = opts.intervalKey;
    }
    if (opts.fuseTime) {
      this.fuseTime = parseFloat(opts.fuseTime) || 5.0;
    }
  }

  getIntervalRange() {
    if (this.isTournamentMode) {
      // Rapid spawn interval during tournament to maintain 2-3 bombs
      return 2.5 + Math.random() * 3.0;
    }
    const cfg = CONFIG.BOMB_CONFIG.intervals[this.intervalKey] || CONFIG.BOMB_CONFIG.intervals.normal;
    return cfg.min + Math.random() * (cfg.max - cfg.min);
  }

  clear() {
    this.bombs = [];
    this.spawnTimer = this.isTournamentMode ? 1.5 : this.getIntervalRange();
  }

  update(dt, physics, fighters, effects, isBattleOver = false) {
    if (!this.enabled || isBattleOver) {
      this.bombs = [];
      return;
    }

    // 1. Spawning (Supports 2-3 concurrent bombs in tournament mode)
    const maxAllowed = this.isTournamentMode ? this.maxConcurrentBombs : 1;
    if (this.bombs.length < maxAllowed) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.getIntervalRange();
        this.spawnRandomBomb(physics);
      }
    }

    // 2. Update Active Bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.timer -= dt;
      bomb.sparkPhase += dt * 18;

      // Handle audio ticking
      bomb.tickIntervalTimer -= dt;
      const curTickInterval = bomb.timer < 1.5 ? 0.22 : (bomb.timer < 3.0 ? 0.45 : 0.9);
      if (bomb.tickIntervalTimer <= 0) {
        bomb.tickIntervalTimer = curTickInterval;
        sound.playTick(bomb.timer < 2.0);
      }

      // Check detonation
      if (bomb.timer <= 0) {
        this.detonate(bomb, physics, fighters, effects);
        this.bombs.splice(i, 1);
        if (this.isTournamentMode) {
          this.maxConcurrentBombs = Math.floor(Math.random() * 2) + 2;
        }
      }
    }
  }

  spawnRandomBomb(physics) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (physics.radius * 0.62);
    const x = physics.center.x + Math.cos(angle) * dist;
    const y = physics.center.y + Math.sin(angle) * dist * 0.85;

    const bomb = {
      id: this.idCounter++,
      x,
      y,
      radius: 16,
      timer: this.fuseTime,
      maxTimer: this.fuseTime,
      sparkPhase: 0,
      tickIntervalTimer: 0.8,
    };

    this.bombs.push(bomb);
  }

  detonate(bomb, physics, fighters, effects) {
    const { x, y } = bomb;

    // Cartoon Audio & Comic Popups
    sound.playKaboom();

    if (effects) {
      effects.addHitEffect(x, y - 10, 'KABOOM!');
      effects.addShockwave(x, y, '#FF3B00', 160);
      effects.triggerScreenShake(14);
      effects.addLandDust(x, y + 8);
    }

    // Radial Blast Physics on Fighters
    const blastRadius = 155;
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f.body || f.isKO) continue;

      const fPos = f.body.position;
      const dx = fPos.x - x;
      const dy = fPos.y - y;
      const dist = Math.hypot(dx, dy);

      if (dist < blastRadius) {
        const forceRatio = 1 - dist / blastRadius;
        const damage = Math.round(14 + forceRatio * 24); // 14 to 38 damage
        const angle = Math.atan2(dy, dx);
        const blastSpeed = (9.5 + forceRatio * 16.0) * physics.bounceMultiplier;

        // Blast velocity outwards
        physics.Body.setVelocity(f.body, {
          x: Math.cos(angle) * blastSpeed,
          y: Math.sin(angle) * blastSpeed - 5.5,
        });

        f.takeDamage(damage, { x: Math.cos(angle) * 8, y: -7 }, null, effects);
        f.stunTimer = 0.45;

        const g = this.game || physics?.game;
        if (g && f.country) {
          g.addBattleEvent({
            type: 'bomb',
            icon: '💣',
            country: f.country,
            text: `${f.country.name} hit by Bomb! (-${damage} HP)`,
            detail: `-${damage}`,
            color: '#F97316',
          });
        }
      }
    }
  }

  draw(ctx) {
    if (!this.enabled) return;

    for (let i = 0; i < this.bombs.length; i++) {
      const bomb = this.bombs[i];
      const { x, y, radius, timer } = bomb;

      ctx.save();

      // 1. Floor shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + radius * 0.9, radius * 1.1, radius * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Danger Pulse Ring (flashes when close to 0)
      if (timer < 2.5) {
        const pulseRatio = (Math.sin(bomb.sparkPhase * 1.5) + 1) / 2;
        ctx.strokeStyle = `rgba(255, 30, 30, ${0.3 + pulseRatio * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 8 + pulseRatio * 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Sizzling Fuse
      const fuseStartX = x + 3;
      const fuseStartY = y - radius * 0.85;
      const fuseEndX = x + 10;
      const fuseEndY = y - radius * 1.6;

      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fuseStartX, fuseStartY);
      ctx.quadraticCurveTo(x + 14, y - radius * 1.2, fuseEndX, fuseEndY);
      ctx.stroke();

      // Sizzling sparks on fuse tip
      const sparkColor = Math.random() > 0.5 ? '#FFE600' : '#FF4500';
      ctx.fillStyle = sparkColor;
      for (let s = 0; s < 4; s++) {
        const sAngle = bomb.sparkPhase + (s * Math.PI) / 2;
        const sDist = 3 + Math.sin(bomb.sparkPhase * 2 + s) * 4;
        ctx.beginPath();
        ctx.arc(fuseEndX + Math.cos(sAngle) * sDist, fuseEndY + Math.sin(sAngle) * sDist, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Bomb Metallic Cap / Collar
      ctx.fillStyle = '#C0A050';
      ctx.fillRect(x - 5, y - radius - 3, 10, 5);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - 5, y - radius - 3, 10, 5);

      // 5. Spherical Bomb Body
      const bombGrad = ctx.createRadialGradient(
        x - radius * 0.35,
        y - radius * 0.35,
        radius * 0.15,
        x,
        y,
        radius
      );
      bombGrad.addColorStop(0, timer < 1.0 && Math.sin(bomb.sparkPhase * 2) > 0 ? '#FF3333' : '#3A3E4D');
      bombGrad.addColorStop(1, '#0C0E14');

      ctx.fillStyle = bombGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#12141D';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Specular highlight spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x - radius * 0.35, y - radius * 0.35, 3.5, 2.2, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // 6. Floating Countdown Badge
      const countNum = Math.max(1, Math.ceil(timer));
      const badgeY = y - radius - 20;

      ctx.fillStyle = timer < 1.5 ? '#FF2222' : '#1A1D28';
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.arc(x, badgeY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Fredoka", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countNum.toString(), x, badgeY + 1);

      ctx.restore();
    }
  }
}
