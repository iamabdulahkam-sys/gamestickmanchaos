/**
 * Stickman Flag Chaos - Items & Weapons Module
 * Manages periodic spawning, parachute drops, pickup detection, and rendering of cartoon weapons.
 */

import { CONFIG } from './config.js';
import { sound } from './audio.js';

export class ItemManager {
  constructor() {
    this.items = [];
    this.projectiles = [];
    this.spawnTimer = 3.5; // First item spawns quickly!
    this.idCounter = 1;
    this.isTournamentMode = false;
  }

  setTournamentMode(isTournament) {
    this.isTournamentMode = isTournament;
    if (isTournament) {
      this.spawnTimer = Math.min(this.spawnTimer, 1.8);
    }
  }

  update(dt, physics, fighters, effects) {
    // 1. Check Spawning
    const maxItems = this.isTournamentMode ? 6 : CONFIG.ITEMS.MAX_ITEMS;
    const minInterval = this.isTournamentMode ? 1.8 : CONFIG.ITEMS.SPAWN_INTERVAL_MIN;
    const maxInterval = this.isTournamentMode ? 4.2 : CONFIG.ITEMS.SPAWN_INTERVAL_MAX;

    if (this.items.length < maxItems) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = minInterval + Math.random() * (maxInterval - minInterval);
        this.spawnRandomItem(physics);
      }
    }

    // 2. Update existing items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.pulse += dt * 5.0;
      item.life -= dt;

      // Handle falling from ceiling with parachute
      if (item.falling) {
        item.y += item.vy * dt * 60;
        item.x += Math.sin(item.pulse * 0.8) * 0.45;

        // Check landing
        if (item.y >= item.targetY) {
          item.y = item.targetY;
          item.falling = false;
          if (effects) {
            effects.addLandDust(item.x, item.y + 6);
          }
        }
      } else {
        // Floating / bobbing gently on ground
        item.wobblePhase += dt * 3.5;
        item.y = item.targetY + Math.sin(item.wobblePhase) * 4.0;
      }

      // Despawn timeout
      if (item.life <= 0) {
        if (effects) {
          effects.addLandDust(item.x, item.y);
        }
        this.items.splice(i, 1);
        continue;
      }

      // Check collision/pickup with alive fighters
      for (let j = 0; j < fighters.length; j++) {
        const fighter = fighters[j];
        if (fighter.isKO || !fighter.body) continue;

        const fPos = fighter.body.position;
        const dist = Math.hypot(fPos.x - item.x, fPos.y - item.y);

        const pickupRadius = Math.max(16, CONFIG.ITEMS.PICKUP_RADIUS * (fighter.scale || 1.0));
        if (dist < pickupRadius) {
          // Fighter picks up item!
          fighter.equipItem(item.config, effects);
          sound.playItemPickup();

          if (effects) {
            effects.addHitEffect(item.x, item.y - 10, item.config.comicWord);
            effects.addShockwave(item.x, item.y, item.config.color, 50);
          }

          this.items.splice(i, 1);
          break;
        }
      }
    }

    // 3. Update active projectiles (Laser beams & Flying rockets)
    for (let p = this.projectiles.length - 1; p >= 0; p--) {
      const proj = this.projectiles[p];
      if (proj.type === 'laser') {
        proj.life -= dt;
        if (proj.life <= 0) {
          this.projectiles.splice(p, 1);
        }
      } else if (proj.type === 'missile') {
        proj.life -= dt;
        proj.x += proj.vx * dt * 60;
        proj.y += proj.vy * dt * 60;
        proj.vy += 0.045 * dt * 60; // slight cartoon gravity curve
        proj.smokeTimer -= dt;
        if (proj.smokeTimer <= 0) {
          proj.smokeTimer = 0.035;
          if (effects) {
            effects.addLandDust(proj.x - proj.facing * 14, proj.y);
          }
        }

        // Check boundary collision with arena
        let detonate = false;
        const distFromCenter = Math.hypot(proj.x - physics.center.x, proj.y - physics.center.y);
        if (distFromCenter >= physics.radius * 0.94 || proj.life <= 0) {
          detonate = true;
        }

        // Check direct hit with any other fighter
        if (!detonate) {
          for (let j = 0; j < fighters.length; j++) {
            const f = fighters[j];
            if (f === proj.shooter || f.isKO || !f.body) continue;
            const fDist = Math.hypot(f.body.position.x - proj.x, f.body.position.y - proj.y);
            if (fDist < Math.max(16, 22 * (f.scale || 1.0))) {
              detonate = true;
              break;
            }
          }
        }

        if (detonate) {
          this.detonateMissile(proj, physics, fighters, effects);
          this.projectiles.splice(p, 1);
        }
      }
    }
  }

  spawnLaser(fighter, physics, fighters, effects) {
    sound.playLaser();
    const fScale = fighter.scale || 1.0;
    const startX = fighter.body.position.x + fighter.facing * (16 * fScale);
    const startY = fighter.body.position.y - 4 * fScale;

    // Laser beam travels horizontally across the arena
    const beamLength = physics.radius * 1.6;
    const endX = startX + fighter.facing * beamLength;
    const endY = startY;

    // Piercing raycast: hits all enemies along the beam line
    const laserDmg = (fighter.equippedItem?.bonusDamage || 18) + Math.floor(Math.random() * 5);
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);

    for (let i = 0; i < fighters.length; i++) {
      const other = fighters[i];
      if (other === fighter || other.isKO || !other.body) continue;
      const op = other.body.position;
      const oScale = other.scale || 1.0;

      if (op.x >= minX - 12 && op.x <= maxX + 12 && Math.abs(op.y - startY) < 26 * oScale) {
        const kbForce = (fighter.equippedItem?.knockbackMult || 1.85) * CONFIG.FIGHTER.PUNCH_KNOCKBACK * 1.35;
        if (effects) {
          effects.addHitEffect(op.x, op.y, 'ZAP!', true, oScale);
          effects.addShockwave(op.x, op.y, '#00F0FF', 55);
        }
        other.takeDamage(laserDmg, { x: fighter.facing * kbForce, y: -kbForce * 0.4 }, fighter, effects);
      }
    }

    this.projectiles.push({
      type: 'laser',
      startX,
      startY,
      endX,
      endY,
      life: 0.22,
      maxLife: 0.22,
      color: '#00F0FF',
    });

    if (effects) {
      effects.addShockwave(startX, startY, '#00F0FF', 35);
      effects.triggerScreenShake(4.5);
      effects.addHitEffect(startX + fighter.facing * 30, startY - 10, 'PEW PEW!', true, fScale);
    }
  }

  spawnMissile(fighter, physics, effects) {
    sound.playRocket();
    const fScale = fighter.scale || 1.0;
    const startX = fighter.body.position.x + fighter.facing * (18 * fScale);
    const startY = fighter.body.position.y - 4 * fScale;
    const speed = 9.2;
    const vx = fighter.facing * speed;
    const vy = -0.7 + (Math.random() - 0.5) * 0.4;

    this.projectiles.push({
      type: 'missile',
      x: startX,
      y: startY,
      vx,
      vy,
      facing: fighter.facing,
      shooter: fighter,
      life: 3.5,
      blastRadius: 95,
      smokeTimer: 0,
      damage: 28,
    });

    if (effects) {
      effects.addShockwave(startX, startY, '#FF3B00', 30);
      effects.addLandDust(startX, startY);
    }
  }

  detonateMissile(proj, physics, fighters, effects) {
    const { x, y, blastRadius, damage, shooter } = proj;
    sound.playKaboom();
    if (effects) {
      effects.addHitEffect(x, y - 12, 'KABOOM!', true, 1.25);
      effects.addShockwave(x, y, '#FF3B00', blastRadius * 1.25);
      effects.triggerScreenShake(11);
      effects.addLandDust(x, y + 6);
    }

    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f.body || f.isKO) continue;
      const fPos = f.body.position;
      const dx = fPos.x - x;
      const dy = fPos.y - y;
      const dist = Math.hypot(dx, dy);

      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        const finalDamage = Math.max(8, Math.round(damage * falloff));
        const normX = dist > 1 ? dx / dist : (Math.random() > 0.5 ? 1 : -1);
        const normY = dist > 1 ? dy / dist : -0.6;
        const kbForce = CONFIG.FIGHTER.PUNCH_KNOCKBACK * 2.2 * falloff;

        f.takeDamage(
          finalDamage,
          { x: normX * kbForce, y: Math.min(-3.5, normY * kbForce) },
          shooter,
          effects
        );
      }
    }
  }

  spawnRandomItem(physics) {
    const types = Object.keys(CONFIG.ITEMS.TYPES);
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const config = CONFIG.ITEMS.TYPES[chosenType];

    // Pick random target location inside octagon
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (physics.radius * 0.62);
    const targetX = physics.center.x + Math.cos(angle) * dist;
    const targetY = physics.center.y + Math.sin(angle) * dist * 0.85;

    const newItem = {
      id: this.idCounter++,
      type: chosenType,
      config: config,
      x: targetX + (Math.random() - 0.5) * 20,
      y: physics.center.y - physics.radius - 30, // drops from sky
      targetX,
      targetY,
      vy: 1.8 + Math.random() * 0.8, // gentle parachute glide
      falling: true,
      life: 24.0,
      pulse: Math.random() * Math.PI * 2,
      wobblePhase: Math.random() * Math.PI * 2,
    };

    this.items.push(newItem);
  }

  draw(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { x, y, config, falling } = item;

      ctx.save();

      // 1. Draw floor landing shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(item.targetX, item.targetY + 12, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Parachute when falling
      if (falling) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.2;

        // Suspension lines
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 24);
        ctx.lineTo(x, y - 4);
        ctx.moveTo(x + 18, y - 24);
        ctx.lineTo(x, y - 4);
        ctx.moveTo(x, y - 28);
        ctx.lineTo(x, y - 4);
        ctx.stroke();

        // Parachute canopy
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(x, y - 24, 20, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // White decorative stripes on parachute
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(x, y - 24, 10, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 3. Pulsing Glow Aura on Ground
      const glowRadius = 18 + Math.sin(item.pulse) * 3.5;
      ctx.save();
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Specific Cartoon Weapon Item
      ctx.translate(x, y);

      if (item.type === 'glove') {
        // Red Giant Boxing Glove
        ctx.save();
        ctx.fillStyle = '#FF1E56';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.4;

        // Puffy glove head
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Thumb bump
        ctx.beginPath();
        ctx.arc(-7, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White wrist cuff
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(-8, 8, 16, 6, 3);
        ctx.fill();
        ctx.stroke();

        // Cartoon shine highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(3, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (item.type === 'hammer') {
        // Squeaky Toy Mallet
        ctx.save();
        // Wooden handle
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(0, -6);
        ctx.stroke();

        // Mallet Head (Yellow & Blue stripes)
        ctx.fillStyle = '#FFE600';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-13, -11, 26, 12, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(-4, -11, 8, 12);

        // Cute squeaker star
        ctx.fillStyle = '#FF2E93';
        ctx.beginPath();
        ctx.arc(-8, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (item.type === 'chili') {
        // Spicy Fire Chili Pepper
        ctx.save();
        ctx.fillStyle = '#FF2200';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;

        // Curved chili body
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.quadraticCurveTo(8, 0, 6, 10);
        ctx.quadraticCurveTo(0, 12, -4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Green stem & leaf
        ctx.fillStyle = '#00E676';
        ctx.beginPath();
        ctx.arc(-6, -9, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mini spark
        ctx.fillStyle = '#FFE600';
        ctx.beginPath();
        ctx.arc(8, -6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (item.type === 'star') {
        // Magic Zap Star Wand
        ctx.save();
        // Wand stick
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-5, 11);
        ctx.lineTo(3, -3);
        ctx.stroke();

        // Golden 5-pointed star
        ctx.fillStyle = '#FFE600';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2;
        ctx.translate(4, -4);
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const rOut = 9;
          const rIn = 4.2;
          const a1 = (s * 4 * Math.PI) / 5 - Math.PI / 2;
          const a2 = a1 + (2 * Math.PI) / 10;
          if (s === 0) ctx.moveTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
          else ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
          ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (item.type === 'laser') {
        // Cyber Laser Blaster Pickup
        ctx.save();
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-8, -5, 17, 9, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 8;
        ctx.fillRect(-2, -3, 7, 5);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-6, 3, 6, 8, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(9, -4, 3, 7);
        ctx.restore();
      } else if (item.type === 'missile') {
        // Cartoon Rocket Missile Pickup
        ctx.save();
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#FF3B00';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 20, [0, 0, 4, 4]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFE600';
        ctx.beginPath();
        ctx.moveTo(-7, -10);
        ctx.lineTo(0, -20);
        ctx.lineTo(7, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(-7, 4);
        ctx.lineTo(-13, 11);
        ctx.lineTo(-7, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(7, 4);
        ctx.lineTo(13, 11);
        ctx.lineTo(7, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFE600';
        ctx.fillRect(-3, 10, 6, 3);
        ctx.restore();
      }

      ctx.restore();
    }

    // 5. Draw active projectiles (Laser beams & Flying rockets)
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.type === 'laser') {
        ctx.save();
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        // Outer glow
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.endX, p.endY);
        ctx.stroke();

        // Bright core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.endX, p.endY);
        ctx.stroke();

        // Origin muzzle flare
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.startX, p.startY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'missile') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        // Rocket body
        ctx.fillStyle = '#FF3B00';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-10, -5, 18, 10, [0, 3, 3, 0]);
        ctx.fill();
        ctx.stroke();

        // Nosecone
        ctx.fillStyle = '#FFE600';
        ctx.beginPath();
        ctx.moveTo(8, -5);
        ctx.lineTo(17, 0);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tail fins
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-9, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-6, 5);
        ctx.lineTo(-12, 10);
        ctx.lineTo(-9, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Exhaust flame
        const flameLen = 8 + Math.random() * 8;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-10 - flameLen, 0);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }

  clear() {
    this.items = [];
    this.projectiles = [];
    this.spawnTimer = 3.5;
  }
}
