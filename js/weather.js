/**
 * Stickman Flag Chaos - Weather Module
 * Dynamic weather and environmental chaos: rainstorms, lifting wind storms with randomized strength & durations,
 * and multi-strike lightning barrages.
 */

import { CONFIG } from './config.js';
import { sound } from './audio.js';

export class WeatherManager {
  constructor() {
    this.type = 'none'; // none, rain, wind, lightning, chaos
    this.chaosCycleTimer = 0;
    this.currentChaosMode = 'none';

    // Rain particles
    this.raindrops = [];
    this.ripples = [];

    // Wind gusts with duration & random strength
    this.windStrengthKey = 'strong'; // breeze, strong, typhoon
    this.windPhase = 'gust'; // gust, calm
    this.windPhaseTimer = 4.0;
    this.windForceX = 0;
    this.windLiftY = 0;
    this.windStreaks = [];
    this.windSwirls = [];

    // Lightning strikes
    this.lightningStrikeCount = 2; // 1, 2, 4
    this.lightningIntervalKey = 'normal'; // rare, normal, intense
    this.lightningTimer = 5.0;
    this.lightningBolts = [];
    this.screenFlashAlpha = 0;
    this.pendingLightningTimeouts = [];
  }

  setWeather(type) {
    this.type = type;
    this.currentChaosMode = type === 'chaos' ? 'rain' : type;
    this.chaosCycleTimer = 10.0;
    this.raindrops = [];
    this.ripples = [];
    this.windStreaks = [];
    this.windSwirls = [];
    this.windForceX = 0;
    this.windLiftY = 0;
    this.windPhase = 'gust';
    this.windPhaseTimer = 4.0;
    this.lightningBolts = [];
    this.lightningTimer = 5.0;
  }

  setWindStrength(key) {
    if (CONFIG.WIND_CONFIG.strengths[key]) {
      this.windStrengthKey = key;
    }
  }

  setLightningOptions(opts = {}) {
    if (opts.count) this.lightningStrikeCount = parseInt(opts.count, 10) || 2;
    if (opts.intervalKey && CONFIG.LIGHTNING_CONFIG.intervals[opts.intervalKey]) {
      this.lightningIntervalKey = opts.intervalKey;
    }
  }

  getLightningInterval() {
    const cfg = CONFIG.LIGHTNING_CONFIG.intervals[this.lightningIntervalKey] || CONFIG.LIGHTNING_CONFIG.intervals.normal;
    return cfg.min + Math.random() * (cfg.max - cfg.min);
  }

  stopLightning() {
    this.lightningBolts = [];
    if (this.pendingLightningTimeouts) {
      this.pendingLightningTimeouts.forEach((t) => clearTimeout(t));
      this.pendingLightningTimeouts = [];
    }
    this.lightningTimer = 999999;
  }

  update(dt, physics, fighters, effects, isBattleOver = false) {
    if (isBattleOver) {
      this.stopLightning();
    }
    const activeMode = this.type === 'chaos' ? this.currentChaosMode : this.type;

    // Chaos cycle switching
    if (this.type === 'chaos') {
      this.chaosCycleTimer -= dt;
      if (this.chaosCycleTimer <= 0) {
        this.chaosCycleTimer = 8.0 + Math.random() * 6.0;
        const modes = ['rain', 'wind', 'lightning'];
        this.currentChaosMode = modes[Math.floor(Math.random() * modes.length)];
      }
    }

    // Screen flash decay
    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 4.5);
    }

    // 1. Rain Update
    if (activeMode === 'rain' || (this.type === 'chaos' && activeMode === 'rain')) {
      if (this.raindrops.length < 160) {
        for (let i = 0; i < 6; i++) {
          this.raindrops.push({
            x: Math.random() * CONFIG.CANVAS.WIDTH * 1.3 - 150,
            y: -30,
            vx: -3.5 + Math.random() * 1.5,
            vy: 26 + Math.random() * 9,
            len: 18 + Math.random() * 12,
            alpha: 0.45 + Math.random() * 0.4,
          });
        }
      }

      for (let i = this.raindrops.length - 1; i >= 0; i--) {
        const drop = this.raindrops[i];
        drop.x += drop.vx * dt * 60;
        drop.y += drop.vy * dt * 60;

        // Splashes at arena floor and lower boundary rather than cutting off in mid-air
        const groundThreshold = physics.center.y + (physics.radius || 280) * (0.65 + Math.random() * 0.35);
        if (drop.y > groundThreshold || drop.y > CONFIG.CANVAS.HEIGHT - 40) {
          if (this.ripples.length < 45 && Math.random() < 0.4) {
            this.ripples.push({
              x: drop.x,
              y: Math.min(drop.y, groundThreshold),
              radius: 2,
              maxRadius: 10 + Math.random() * 8,
              alpha: 0.65,
            });
          }
          this.raindrops.splice(i, 1);
        }
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += dt * 28;
        r.alpha -= dt * 1.7;
        if (r.alpha <= 0) {
          this.ripples.splice(i, 1);
        }
      }
    }

    // 2. Wind Update (with active duration & lifting updraft)
    if (activeMode === 'wind' || (this.type === 'chaos' && activeMode === 'wind')) {
      this.windPhaseTimer -= dt;

      if (this.windPhaseTimer <= 0) {
        if (this.windPhase === 'gust') {
          // Switch to calm lull
          this.windPhase = 'calm';
          this.windPhaseTimer =
            CONFIG.WIND_CONFIG.CALM_DURATION_MIN +
            Math.random() * (CONFIG.WIND_CONFIG.CALM_DURATION_MAX - CONFIG.WIND_CONFIG.CALM_DURATION_MIN);
          this.windForceX = 0;
          this.windLiftY = 0;
        } else {
          // Switch to heavy gust
          this.windPhase = 'gust';
          this.windPhaseTimer =
            CONFIG.WIND_CONFIG.GUST_DURATION_MIN +
            Math.random() * (CONFIG.WIND_CONFIG.GUST_DURATION_MAX - CONFIG.WIND_CONFIG.GUST_DURATION_MIN);

          const strengthConf =
            CONFIG.WIND_CONFIG.strengths[this.windStrengthKey] || CONFIG.WIND_CONFIG.strengths.strong;
          const dir = Math.random() > 0.5 ? 1 : -1;

          this.windForceX = dir * (0.0036 + Math.random() * 0.0042) * strengthConf.forceMult;
          this.windLiftY = -(0.0016 + Math.random() * 0.0032) * strengthConf.liftMult; // Updraft force!

          sound.playWind();
        }
      }

      // If active gust, spawn streaks & swirls and apply lifting forces
      if (this.windPhase === 'gust') {
        const dir = this.windForceX > 0 ? 1 : -1;

        if (this.windStreaks.length < 36) {
          this.windStreaks.push({
            x: dir > 0 ? -60 : CONFIG.CANVAS.WIDTH + 60,
            y: physics.center.y - 220 + Math.random() * 440,
            speed: dir * (16 + Math.random() * 16),
            length: 45 + Math.random() * 65,
            alpha: 0.4 + Math.random() * 0.4,
          });
        }

        if (this.windSwirls.length < 12 && Math.random() < 0.25) {
          this.windSwirls.push({
            x: dir > 0 ? -40 : CONFIG.CANVAS.WIDTH + 40,
            y: physics.center.y - 180 + Math.random() * 360,
            radius: 8 + Math.random() * 14,
            angle: 0,
            speedX: dir * (10 + Math.random() * 10),
            speedY: -1.5 + Math.random() * 3.0,
            alpha: 0.5,
          });
        }

        // Apply physical push and lifting force to fighters
        for (let i = 0; i < fighters.length; i++) {
          const f = fighters[i];
          if (f.body && !f.isKO) {
            const fScale = f.scale || 1.0;
            const forceScale = Math.pow(fScale, 2);
            // Only apply upward lift if fighter is in lower arena; in upper arena, wind is horizontal only
            const isBelowCenter = f.body.position.y > (physics.center.y - 30);
            const appliedLiftY = isBelowCenter ? this.windLiftY : 0;
            physics.Body.applyForce(f.body, f.body.position, {
              x: this.windForceX * forceScale,
              y: appliedLiftY * forceScale,
            });

            // Random slight turbulence roll
            if (Math.random() < 0.15) {
              f.body.torque += (Math.random() - 0.5) * 0.02 * forceScale;
            }
          }
        }
      }

      // Update wind streaks
      for (let i = this.windStreaks.length - 1; i >= 0; i--) {
        const s = this.windStreaks[i];
        s.x += s.speed * dt * 60;
        if (s.x < -120 || s.x > CONFIG.CANVAS.WIDTH + 120) {
          this.windStreaks.splice(i, 1);
        }
      }

      // Update wind swirls
      for (let i = this.windSwirls.length - 1; i >= 0; i--) {
        const sw = this.windSwirls[i];
        sw.x += sw.speedX * dt * 60;
        sw.y += sw.speedY * dt * 60;
        sw.angle += dt * 8.0;
        sw.alpha -= dt * 0.2;
        if (sw.alpha <= 0 || sw.x < -80 || sw.x > CONFIG.CANVAS.WIDTH + 80) {
          this.windSwirls.splice(i, 1);
        }
      }
    }

    // 3. Lightning Update (with strike count and configurable intervals)
    if (!isBattleOver && (activeMode === 'lightning' || (this.type === 'chaos' && activeMode === 'lightning'))) {
      this.lightningTimer -= dt;

      if (this.lightningTimer <= 0) {
        this.lightningTimer = this.getLightningInterval();
        const numStrikes = this.lightningStrikeCount || 2;
        for (let s = 0; s < numStrikes; s++) {
          const tid = setTimeout(() => {
            this.triggerLightningStrike(physics, fighters, effects);
          }, s * 140);
          this.pendingLightningTimeouts.push(tid);
        }
      }

      // Update active bolts
      for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
        const bolt = this.lightningBolts[i];
        bolt.duration -= dt;
        if (bolt.duration <= 0) {
          this.lightningBolts.splice(i, 1);
        }
      }
    }
  }

  triggerLightningStrike(physics, fighters, effects) {
    const cx = physics.center.x + (Math.random() - 0.5) * physics.radius * 1.1;
    const cy = physics.center.y + (Math.random() - 0.5) * physics.radius * 0.8;

    const points = [{ x: cx + (Math.random() - 0.5) * 60, y: 0 }];
    const segments = 8;
    for (let i = 1; i < segments; i++) {
      const progress = i / segments;
      const targetX = points[0].x + (cx - points[0].x) * progress;
      const targetY = cy * progress;
      points.push({
        x: targetX + (Math.random() - 0.5) * 35,
        y: targetY,
      });
    }
    points.push({ x: cx, y: cy });

    this.lightningBolts.push({
      points,
      duration: 0.18,
      impactX: cx,
      impactY: cy,
    });

    this.screenFlashAlpha = 0.5;
    sound.playThunder();
    sound.playZap();

    if (effects) {
      effects.addHitEffect(cx, cy, 'ZAP!');
      effects.triggerScreenShake(8);
      effects.addShockwave(cx, cy, '#00F0FF', 80);
    }

    // Shockwave explosion at impact
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (f.body && !f.isKO) {
        const dx = f.body.position.x - cx;
        const dy = f.body.position.y - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < 115) {
          const force = (1 - dist / 115) * 11.5;
          const angle = Math.atan2(dy, dx);
          physics.Body.setVelocity(f.body, {
            x: f.body.velocity.x * 0.2 + Math.cos(angle) * force,
            y: f.body.velocity.y * 0.2 + Math.sin(angle) * force - 5,
          });
          f.takeDamage(12, { x: Math.cos(angle) * 6, y: -6 }, null, effects);
        }
      }
    }
  }

  draw(ctx, width, height) {
    const activeMode = this.type === 'chaos' ? this.currentChaosMode : this.type;

    // 1. Draw Rain
    if (this.raindrops.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#A5D8F3';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < this.raindrops.length; i++) {
        const d = this.raindrops[i];
        ctx.globalAlpha = Math.min(1.0, d.alpha * 1.25);
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 1.6, d.y + d.len * 1.25);
        ctx.stroke();
      }

      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#C2ECFF';
      for (let i = 0; i < this.ripples.length; i++) {
        const r = this.ripples[i];
        ctx.globalAlpha = r.alpha;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius * 1.6, r.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Wind Streaks & Swirls
    if (this.windStreaks.length > 0 || this.windSwirls.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.2;

      for (let i = 0; i < this.windStreaks.length; i++) {
        const s = this.windStreaks[i];
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length * (s.speed > 0 ? 1 : -1), s.y - 2);
        ctx.stroke();
      }

      // Draw swirling air spirals
      ctx.strokeStyle = 'rgba(210, 245, 255, 0.6)';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < this.windSwirls.length; i++) {
        const sw = this.windSwirls[i];
        ctx.globalAlpha = sw.alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, sw.angle, sw.angle + Math.PI * 1.4);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Draw Lightning Bolts
    if (this.lightningBolts.length > 0) {
      ctx.save();
      for (let b = 0; b < this.lightningBolts.length; b++) {
        const bolt = this.lightningBolts[b];
        const pts = bolt.points;

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4.2;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Draw Screen Flash
    if (this.screenFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlashAlpha})`;
      ctx.fillRect(-100, -100, width + 200, height + 200);
      ctx.restore();
    }
  }
}
