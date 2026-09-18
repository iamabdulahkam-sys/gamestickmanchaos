/**
 * Stickman Flag Chaos - Items & Weapons Module
 * Manages periodic spawning, parachute drops, pickup detection, and rendering of cartoon weapons.
 */

import { CONFIG } from './config.js';
import { sound } from './audio.js';

export class ItemManager {
  constructor() {
    this.items = [];
    this.spawnTimer = 3.5; // First item spawns quickly!
    this.idCounter = 1;
  }

  update(dt, physics, fighters, effects) {
    // 1. Check Spawning
    if (this.items.length < CONFIG.ITEMS.MAX_ITEMS) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer =
          CONFIG.ITEMS.SPAWN_INTERVAL_MIN +
          Math.random() * (CONFIG.ITEMS.SPAWN_INTERVAL_MAX - CONFIG.ITEMS.SPAWN_INTERVAL_MIN);
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
      }

      ctx.restore();
    }
  }

  clear() {
    this.items = [];
    this.spawnTimer = 3.5;
  }
}
