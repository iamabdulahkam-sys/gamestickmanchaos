/**
 * Stickman Flag Chaos - Effects & Particle System
 * Kid-friendly cartoon effects: POW/BONK popups, stars, dust, sparks, screen shake.
 */

import { CONFIG } from './config.js';

class StarParticle {
  constructor(x, y, vx, vy, color = '#FFD700', scale = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    const baseSize = 7 + Math.random() * 6;
    this.size = Math.max(2.8, baseSize * scale);
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 12;
    this.alpha = 1.0;
    this.life = 0.5 + Math.random() * 0.4;
    this.maxLife = this.life;
    this.color = color;
    this.outlineWidth = Math.max(0.8, 1.5 * scale);
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += 0.08 * dt * 60; // slight gravity
    this.angle += this.rotSpeed * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#181B2A';
    ctx.lineWidth = this.outlineWidth;

    // 4-point cartoon star
    ctx.beginPath();
    const rOuter = this.size;
    const rInner = this.size * 0.38;
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class DustParticle {
  constructor(x, y, vx, vy, scale = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = Math.max(2, (4 + Math.random() * 5) * scale);
    this.growth = (8 + Math.random() * 8) * scale;
    this.alpha = 0.75;
    this.life = 0.35 + Math.random() * 0.25;
    this.maxLife = this.life;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.radius += this.growth * dt;
    this.life -= dt;
    this.alpha = Math.max(0, (this.life / this.maxLife) * 0.75);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#C8D0E0';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ComicTextPopup {
  constructor(x, y, text, scale = 1.0, duration = null) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.rotation = (Math.random() - 0.5) * 0.45;
    this.scaleFactor = Math.max(0.42, Math.min(1.45, scale));

    // Dynamic scaling based on scaleFactor (0.45 at 100 players -> 1.38 at 2 players)
    const t = Math.max(0, Math.min(1, (this.scaleFactor - 0.45) / (1.38 - 0.45)));

    // Font: 11px up to 24px
    const minFont = CONFIG.EFFECTS.FONT_SIZE_MIN || 11;
    const maxFont = CONFIG.EFFECTS.FONT_SIZE_MAX || 24;
    this.fontSize = Math.round(minFont + t * (maxFont - minFont));

    // Outline width: 2.5px up to 6.5px
    const minOutline = CONFIG.EFFECTS.OUTLINE_WIDTH_MIN || 2.5;
    const maxOutline = CONFIG.EFFECTS.OUTLINE_WIDTH_MAX || 6.5;
    this.lineWidth = minOutline + t * (maxOutline - minOutline);

    // Duration: 0.35s at 100 players -> 0.65s at 2 players
    const minDur = CONFIG.EFFECTS.POPUP_DURATION_MIN || 0.35;
    const maxDur = CONFIG.EFFECTS.POPUP_DURATION_MAX || 0.65;
    this.life = duration !== null ? duration : minDur + t * (maxDur - minDur);
    this.maxLife = this.life;

    this.scale = 0.3;
    this.alpha = 1.0;
    this.colors = ['#FFE600', '#FF3366', '#00F0FF', '#FF9900'];
    this.fillColor = this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  update(dt) {
    this.life -= dt;
    const progress = 1 - this.life / this.maxLife;

    // Pop scale curve: overshoot then stabilize
    if (progress < 0.25) {
      this.scale = 0.3 + (progress / 0.25) * 1.05; // 0.3 -> 1.35
    } else if (progress < 0.45) {
      this.scale = 1.35 - ((progress - 0.25) / 0.2) * 0.35; // 1.35 -> 1.0
    } else {
      this.scale = 1.0;
    }

    this.y -= (16 + 12 * this.scaleFactor) * dt; // floats up proportionally
    this.alpha = Math.max(0, Math.min(1, this.life / (this.maxLife * 0.4)));
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    ctx.font = `900 ${this.fontSize}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Bold comic stroke outline
    ctx.strokeStyle = '#0E101A';
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'miter';
    ctx.strokeText(this.text, 0, 0);

    // Inner bright text
    ctx.fillStyle = this.fillColor;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 12;
    this.vy = -6 - Math.random() * 8;
    this.w = 7 + Math.random() * 6;
    this.h = 5 + Math.random() * 5;
    this.color = ['#FF2E93', '#00F0FF', '#FFE600', '#00FF66', '#FF6B00'][Math.floor(Math.random() * 5)];
    this.rotX = Math.random() * Math.PI;
    this.rotY = Math.random() * Math.PI;
    this.rotSpeedX = 4 + Math.random() * 8;
    this.rotSpeedY = 3 + Math.random() * 6;
    this.life = 2.0 + Math.random() * 1.5;
    this.maxLife = this.life;
    this.alpha = 1.0;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += 0.22 * dt * 60; // gravity
    this.vx *= 0.985;
    this.rotX += this.rotSpeedX * dt;
    this.rotY += this.rotSpeedY * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    const scaleX = Math.cos(this.rotX);
    const scaleY = Math.sin(this.rotY);
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

class ShockwaveRing {
  constructor(x, y, color = '#00F0FF', maxRadius = 75) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 8;
    this.maxRadius = maxRadius;
    this.alpha = 1.0;
    this.lineWidth = 4.5;
  }

  update(dt) {
    this.radius += dt * 190;
    this.lineWidth = Math.max(1, 4.5 * (1 - this.radius / this.maxRadius));
    this.alpha = Math.max(0, 1 - this.radius / this.maxRadius);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class EffectsManager {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.shockwaves = [];
    this.screenShake = 0;
    this.screenShakeOffset = { x: 0, y: 0 };
    this.currentFighterScale = 1.0;
    this.totalFighterCount = 4;
  }

  setFighterScale(scale, count = 4) {
    this.currentFighterScale = Math.max(0.42, Math.min(1.45, scale));
    this.totalFighterCount = count;
  }

  triggerScreenShake(amount = 6) {
    const scale = this.currentFighterScale || 1.0;
    this.screenShake = Math.max(this.screenShake, amount * Math.max(0.6, scale));
  }

  addShockwave(x, y, color = '#00F0FF', maxRadius = 80) {
    const scale = this.currentFighterScale || 1.0;
    this.shockwaves.push(new ShockwaveRing(x, y, color, maxRadius * scale));
    this.triggerScreenShake(5);
  }

  /**
   * Prominent dispersal shockwave triggered when >8 fighters cluster together
   */
  addCrowdShockwave(x, y, radius = 170) {
    const scale = this.currentFighterScale || 1.0;
    this.addShockwave(x, y, '#00F0FF', radius);
    this.addShockwave(x, y, '#FFE600', radius * 0.65);
    this.triggerScreenShake(7);

    // Explicit comic popup text
    this.addHitEffect(x, y, 'SCATTER!', true, scale);

    // Cyan & golden energy sparks burst
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = (3.5 + Math.random() * 4.5) * Math.max(0.7, scale);
      this.particles.push(
        new StarParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          ['#00F0FF', '#FFE600', '#FFFFFF'][i % 3],
          scale * 1.2
        )
      );
    }
  }

  addHitEffect(x, y, text = null, isCriticalOrWeapon = false, customScale = null) {
    const scale = customScale || this.currentFighterScale || 1.0;
    const maxPopups = CONFIG.EFFECTS.MAX_ACTIVE_POPUPS || 7;

    // Probability filtering based on crowd count:
    // <=8 fighters: 100% word chance.
    // 100 fighters: 20% word chance for regular punches.
    // Critical punches, weapons, and custom explicit words always display (100%).
    let spawnWord = true;
    if (!isCriticalOrWeapon && !text) {
      const N = this.totalFighterCount || 4;
      const minProb = CONFIG.EFFECTS.WORD_PROB_MIN || 0.20;
      const maxProb = CONFIG.EFFECTS.WORD_PROB_MAX || 1.0;
      const prob = N <= 8 ? maxProb : Math.max(minProb, maxProb - ((N - 8) / 92) * (maxProb - minProb));
      spawnWord = Math.random() < prob;
    }

    if (spawnWord) {
      const word = text || CONFIG.EFFECTS.COMIC_WORDS[Math.floor(Math.random() * CONFIG.EFFECTS.COMIC_WORDS.length)];
      if (this.popups.length >= maxPopups) {
        this.popups.shift(); // Dismiss oldest popup to guarantee max on-screen limit
      }
      this.popups.push(new ComicTextPopup(x, y - 20 * scale, word, scale));
    }

    this.triggerScreenShake(4.5);

    // Spawn stars & sparks scaled to fighter
    const starCount = this.totalFighterCount > 32 ? 4 : 6;
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.5 + Math.random() * 4.5) * Math.max(0.7, scale);
      this.particles.push(
        new StarParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          ['#FFD700', '#FFA500', '#FFFFFF'][Math.floor(Math.random() * 3)],
          scale
        )
      );
    }
  }

  addWallImpact(x, y, nx, ny) {
    const scale = this.currentFighterScale || 1.0;
    this.triggerScreenShake(3);
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 1.5;
      const angle = Math.atan2(ny, nx) + spread;
      const speed = (1.8 + Math.random() * 3.5) * Math.max(0.7, scale);
      this.particles.push(new DustParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, scale));
    }
  }

  addLandDust(x, y) {
    const scale = this.currentFighterScale || 1.0;
    for (let i = 0; i < 4; i++) {
      const vx = (i % 2 === 0 ? 1 : -1) * (1.2 + Math.random() * 1.8);
      this.particles.push(new DustParticle(x, y, vx, -0.4 - Math.random() * 0.8, scale));
    }
  }

  addKOSparks(x, y, customScale = null) {
    const scale = customScale || this.currentFighterScale || 1.0;
    const maxPopups = CONFIG.EFFECTS.MAX_ACTIVE_POPUPS || 7;

    // KO is high priority - make space if at limit
    if (this.popups.length >= maxPopups) {
      this.popups.shift();
    }
    this.popups.push(new ComicTextPopup(x, y - 28 * scale, 'KO!', scale));
    this.triggerScreenShake(7);

    // Big burst of stars scaled to fighter
    const starCount = this.totalFighterCount > 32 ? 9 : 14;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const speed = (3.5 + Math.random() * 4.5) * Math.max(0.7, scale);
      this.particles.push(
        new StarParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          ['#FFD700', '#FF3366', '#00F0FF'][i % 3],
          scale
        )
      );
    }
  }

  addConfettiBurst(cx, cy, count = 35) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new ConfettiParticle(cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 60));
    }
  }

  update(dt) {
    // Screen shake update
    if (this.screenShake > 0.1) {
      this.screenShakeOffset.x = (Math.random() - 0.5) * this.screenShake * 2;
      this.screenShakeOffset.y = (Math.random() - 0.5) * this.screenShake * 2;
      this.screenShake *= CONFIG.EFFECTS.SCREEN_SHAKE_DECAY;
    } else {
      this.screenShake = 0;
      this.screenShakeOffset.x = 0;
      this.screenShakeOffset.y = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Limit particles
    if (this.particles.length > CONFIG.EFFECTS.MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - CONFIG.EFFECTS.MAX_PARTICLES);
    }

    // Update popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.update(dt);
      if (popup.life <= 0) {
        this.popups.splice(i, 1);
      }
    }

    // Ensure hard cap on popups
    const maxPopups = CONFIG.EFFECTS.MAX_ACTIVE_POPUPS || 7;
    if (this.popups.length > maxPopups) {
      this.popups.splice(0, this.popups.length - maxPopups);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.update(dt);
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Render shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx);
    }
    // Render particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    // Render comic popups on top
    for (let i = 0; i < this.popups.length; i++) {
      this.popups[i].draw(ctx);
    }
  }

  clear() {
    this.particles = [];
    this.popups = [];
    this.shockwaves = [];
    this.screenShake = 0;
    this.screenShakeOffset = { x: 0, y: 0 };
  }
}
