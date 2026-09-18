/**
 * Stickman Flag Chaos - Renderer Module
 * Canvas 2D rendering engine for Octagon Arena, multiple background themes,
 * center obstacles (bumper, pillars, platform, spinner), stickmen, and effects.
 */

import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = CONFIG.CANVAS.WIDTH;
    this.height = CONFIG.CANVAS.HEIGHT;
    this.renderScale = 1.0;
    this.currentTheme = CONFIG.THEMES.neon;
    this.wallImpacts = []; // Visual wall impact rings
  }

  setTheme(themeKey) {
    if (CONFIG.THEMES[themeKey]) {
      this.currentTheme = CONFIG.THEMES[themeKey];
    }
  }

  addWallImpactVisual(x, y) {
    this.wallImpacts.push({
      x,
      y,
      radius: 6,
      maxRadius: 36,
      alpha: 1.0,
      color: this.currentTheme.wallBorder,
    });
  }

  update(dt) {
    for (let i = this.wallImpacts.length - 1; i >= 0; i--) {
      const imp = this.wallImpacts[i];
      imp.radius += dt * 75;
      imp.alpha -= dt * 2.8;
      if (imp.alpha <= 0) {
        this.wallImpacts.splice(i, 1);
      }
    }
  }

  render(physics, fighters, effects, debugMode = false, weather = null, items = null, bombs = null) {
    const { ctx, width, height } = this;

    // Reset transform to identity and clear entire physical pixel buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply resolution scale for HiDPI / 4K native sharpness
    const scale = this.renderScale || 1.0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Apply screen shake
    ctx.save();
    ctx.translate(effects.screenShakeOffset.x, effects.screenShakeOffset.y);

    // 1. Draw Background Environment (Themes)
    this.drawBackground(ctx, width, height);

    // 2. Draw Octagon Arena (Floor & Walls)
    this.drawArena(ctx, physics);

    // 3. Draw Center Arena Obstacles
    this.drawObstacles(ctx, physics);

    // 4. Draw Wall & Obstacle Impact Visuals
    this.drawWallImpacts(ctx);

    // 5. Draw Shadows
    this.drawShadows(ctx, fighters, physics);

    // 5.5 Draw Spawned Weapon Items
    if (items) {
      if (typeof items.draw === 'function') {
        items.draw(ctx);
      } else if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].draw) items[i].draw(ctx);
        }
      }
    }

    // 5.6 Draw Time Bombs on Arena Floor
    if (bombs && typeof bombs.draw === 'function') {
      bombs.draw(ctx);
    }

    // 6. Draw Fighters
    for (let i = 0; i < fighters.length; i++) {
      fighters[i].draw(ctx);
    }

    // 7. Draw Particles & Comic Popups
    effects.draw(ctx);

    // 8. Draw Weather Effects (Rain, Wind, Lightning)
    if (weather) {
      weather.draw(ctx, width, height);
    }

    // 9. Draw Debug Visuals if active
    if (debugMode) {
      this.drawDebugOverlay(ctx, physics, fighters);
    }

    ctx.restore();
  }

  drawBackground(ctx, width, height) {
    const theme = this.currentTheme;
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      100,
      width / 2,
      height / 2,
      height * 0.95
    );
    bgGrad.addColorStop(0, theme.bgRadial[0]);
    bgGrad.addColorStop(1, theme.bgRadial[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Background grid / pattern for cartoon depth
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1.2;
    const gridSize = 42;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawArena(ctx, physics) {
    const vertices = physics.arenaVertices || physics.octagonVertices;
    const { center, radius, walls } = physics;
    if (!vertices || vertices.length < 3) return;

    const theme = this.currentTheme;
    const shape = physics.arenaShape || 'octagon';

    // A. Draw Arena Floor
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    // Floor fill
    const floorGrad = ctx.createRadialGradient(
      center.x,
      center.y,
      40,
      center.x,
      center.y,
      Math.max(radius || 290, 320)
    );
    floorGrad.addColorStop(0, theme.floorAccent);
    floorGrad.addColorStop(1, theme.floorColor);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Floor inner markings (customized per arena shape)
    ctx.strokeStyle = theme.ringColor;
    if (shape === 'rectangle_full' || shape === 'rectangle') {
      const inset = shape === 'rectangle_full' ? 65 : 40;
      const x1 = vertices[0].x + inset;
      const y1 = vertices[0].y + inset;
      const w = vertices[1].x - vertices[0].x - inset * 2;
      const h = vertices[2].y - vertices[1].y - inset * 2;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);

      // Center ring circle & center line
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, shape === 'rectangle_full' ? 120 : 75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(center.x, y1);
      ctx.lineTo(center.x, y1 + h);
      ctx.stroke();
    } else {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      // Center decorative polygon / star
      ctx.beginPath();
      const miniR = radius * 0.2;
      const sides = shape === 'star' ? 10 : (shape === 'circle' ? 16 : 8);
      for (let i = 0; i < sides; i++) {
        let r = miniR;
        if (shape === 'star') {
          r = i % 2 === 0 ? miniR : miniR * 0.5;
        }
        const a = (i * 2 * Math.PI) / sides + (shape === 'star' ? -Math.PI / 2 : Math.PI / sides);
        const px = center.x + Math.cos(a) * r;
        const py = center.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = theme.ringColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();

    // B. Draw Arena Walls
    ctx.save();
    const numWalls = vertices.length;
    for (let i = 0; i < numWalls; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % numWalls];

      // Wall outer shadow/bevel
      ctx.strokeStyle = '#0C0E17';
      ctx.lineWidth = CONFIG.ARENA.WALL_THICKNESS + 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Main wall body
      ctx.strokeStyle = theme.wallColor;
      ctx.lineWidth = CONFIG.ARENA.WALL_THICKNESS;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Neon interior edge line
      ctx.strokeStyle = theme.wallBorder;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawObstacles(ctx, physics) {
    const obstacles = physics.obstacles;
    if (!obstacles || obstacles.length === 0) return;

    const theme = this.currentTheme;

    ctx.save();
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const data = obs.obstacleData;
      if (!data) continue;

      const pos = obs.position;
      const angle = obs.angle;

      if (data.type === 'bumper') {
        const pulse = data.scalePulse || 1.0;
        const curRadius = data.radius * pulse;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 6, curRadius * 1.05, curRadius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer rim with impact flash
        const isPulsing = pulse > 1.05;
        ctx.fillStyle = isPulsing ? '#FFFFFF' : theme.wallColor;
        ctx.strokeStyle = isPulsing ? '#FFE600' : theme.obstacleColor;
        ctx.lineWidth = isPulsing ? 6 : 4;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, curRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner bouncy spring ring
        ctx.fillStyle = isPulsing ? '#FFE600' : theme.obstacleColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, curRadius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Cartoon star emblem in center
        ctx.fillStyle = isPulsing ? '#000000' : '#FFFFFF';
        ctx.beginPath();
        const rStar = curRadius * 0.32;
        for (let s = 0; s < 8; s++) {
          const r = s % 2 === 0 ? rStar : rStar * 0.45;
          const a = (s * Math.PI) / 4;
          const sx = pos.x + Math.cos(a) * r;
          const sy = pos.y + Math.sin(a) * r;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      } else if (data.type === 'pillar') {
        // Pillar Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 6, data.radius * 1.1, data.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pillar Body
        ctx.fillStyle = theme.wallColor;
        ctx.strokeStyle = theme.obstacleColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, data.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, data.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (data.type === 'platform') {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        // Platform shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-data.width / 2, 8, data.width, 10);

        // Platform slab
        ctx.fillStyle = theme.wallColor;
        ctx.strokeStyle = theme.obstacleColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-data.width / 2, -data.height / 2, data.width, data.height, 8);
        ctx.fill();
        ctx.stroke();

        // Hazard / cartoon stripe pattern on surface
        ctx.fillStyle = theme.obstacleColor;
        for (let x = -data.width / 2 + 15; x < data.width / 2 - 10; x += 30) {
          ctx.beginPath();
          ctx.roundRect(x, -3, 14, 6, 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (data.type === 'spinner') {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        // Spinner bar
        ctx.fillStyle = theme.wallColor;
        ctx.strokeStyle = theme.obstacleColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-data.width / 2, -data.height / 2, data.width, data.height, 8);
        ctx.fill();
        ctx.stroke();

        // End bumper circles
        ctx.fillStyle = theme.obstacleColor;
        ctx.beginPath();
        ctx.arc(-data.width / 2 + 10, 0, 7, 0, Math.PI * 2);
        ctx.arc(data.width / 2 - 10, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // Central axis pivot pin
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawWallImpacts(ctx) {
    ctx.save();
    for (let i = 0; i < this.wallImpacts.length; i++) {
      const imp = this.wallImpacts[i];
      ctx.globalAlpha = Math.max(0, imp.alpha);
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawShadows(ctx, fighters, physics) {
    ctx.save();
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f.body || f.alpha <= 0.05) continue;

      const pos = f.body.position;
      const fScale = f.scale || 1.0;
      // Calculate floor projection below character
      const shadowY = pos.y + 26 * fScale;
      const heightAboveFloor = Math.max(0, shadowY - pos.y);
      const scale = Math.max(0.3, 1 - heightAboveFloor / 200) * fScale;

      ctx.globalAlpha = 0.3 * f.alpha * Math.min(1.0, scale);
      ctx.fillStyle = '#080A12';
      ctx.beginPath();
      ctx.ellipse(pos.x, shadowY, 18 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawDebugOverlay(ctx, physics, fighters) {
    ctx.save();
    ctx.lineWidth = 1.5;

    // Draw Matter bodies wireframes
    const allBodies = physics.Composite.allBodies(physics.world);
    for (let i = 0; i < allBodies.length; i++) {
      const b = allBodies[i];
      ctx.strokeStyle = b.isStatic ? 'rgba(0, 255, 100, 0.4)' : 'rgba(0, 240, 255, 0.8)';
      ctx.beginPath();
      const vertices = b.vertices;
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let j = 1; j < vertices.length; j++) {
        ctx.lineTo(vertices[j].x, vertices[j].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Velocity vectors for dynamic bodies
      if (!b.isStatic) {
        ctx.strokeStyle = '#FF3366';
        ctx.beginPath();
        ctx.moveTo(b.position.x, b.position.y);
        ctx.lineTo(b.position.x + b.velocity.x * 6, b.position.y + b.velocity.y * 6);
        ctx.stroke();
      }
    }

    // Draw AI targeting lines & state labels
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f.body || f.isKO) continue;

      // Target line
      if (f.target && !f.target.isKO && f.target.body) {
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(f.body.position.x, f.body.position.y);
        ctx.lineTo(f.target.body.position.x, f.target.body.position.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // State label
      ctx.fillStyle = '#FFE600';
      ctx.fillText(
        `${f.state} | HP: ${Math.round(f.hp)}`,
        f.body.position.x,
        f.body.position.y - 45
      );
    }

    ctx.restore();
  }
}
