/**
 * Stickman Flag Chaos - Physics Module
 * Wrapper around Matter.js managing engine, octagon arena boundaries, and collisions.
 */

import { CONFIG } from './config.js';

export class PhysicsManager {
  constructor() {
    if (!window.Matter) {
      throw new Error('Matter.js is required but not loaded.');
    }

    this.Engine = window.Matter.Engine;
    this.World = window.Matter.World;
    this.Bodies = window.Matter.Bodies;
    this.Body = window.Matter.Body;
    this.Composite = window.Matter.Composite;
    this.Events = window.Matter.Events;
    this.Vector = window.Matter.Vector;

    this.engine = this.Engine.create({
      gravity: {
        x: CONFIG.PHYSICS.GRAVITY.x,
        y: CONFIG.PHYSICS.GRAVITY.y,
        scale: 0.0012,
      },
    });

    this.world = this.engine.world;
    this.walls = [];
    this.obstacles = [];
    this.obstacleType = 'none';
    this.spinnerAngle = 0;
    this.bounceMultiplier = 1.0;
    this.gravityMode = 'normal';
    this.waveTimer = 0;
    this.arenaShape = 'octagon';
    this.arenaVertices = [];
    this.octagonVertices = [];
    this.center = { x: CONFIG.CANVAS.WIDTH / 2, y: CONFIG.CANVAS.HEIGHT / 2 };
    this.radius = CONFIG.ARENA.DEFAULT_RADIUS;

    this.onWallImpact = null;
    this.onObstacleImpact = null;
    this.onFighterCollision = null;

    this.setupCollisionEvents();
  }

  setBounceSpeed(mult) {
    this.bounceMultiplier = Math.max(0.05, parseFloat(mult) || 1.0);
    const wallRestitution = Math.min(0.98, CONFIG.ARENA.RESTITUTION * this.bounceMultiplier);
    this.walls.forEach((w) => {
      w.restitution = wallRestitution;
    });
    this.obstacles.forEach((obs) => {
      if (obs.obstacleData?.type === 'bumper') {
        obs.restitution = Math.min(1.6, 1.35 * this.bounceMultiplier);
      }
    });
  }

  setGravityMode(modeKey) {
    this.gravityMode = modeKey;
    const mode = CONFIG.GRAVITY_MODES[modeKey] || CONFIG.GRAVITY_MODES.normal;
    this.engine.gravity.y = mode.y;
  }

  /**
   * Builds arena walls according to shape (octagon, rectangle_full, rectangle, star, circle)
   */
  buildArenaShape(shapeKey = 'octagon', centerX = CONFIG.CANVAS.WIDTH / 2, centerY = CONFIG.CANVAS.HEIGHT / 2, radius = CONFIG.ARENA.DEFAULT_RADIUS) {
    this.arenaShape = shapeKey || 'octagon';
    this.center = { x: centerX, y: centerY };

    // Remove old walls if any
    if (this.walls.length > 0) {
      this.Composite.remove(this.world, this.walls);
      this.walls = [];
      this.arenaVertices = [];
      this.octagonVertices = [];
    }

    const vertices = [];
    const wallThickness = CONFIG.ARENA.WALL_THICKNESS;

    if (shapeKey === 'rectangle_full') {
      // Full Canvas bounds (with margin of 48px from canvas edges)
      this.radius = 500;
      const x1 = 48;
      const y1 = 48;
      const x2 = CONFIG.CANVAS.WIDTH - 48;
      const y2 = CONFIG.CANVAS.HEIGHT - 48;
      vertices.push({ x: x1, y: y1 });
      vertices.push({ x: x2, y: y1 });
      vertices.push({ x: x2, y: y2 });
      vertices.push({ x: x1, y: y2 });
    } else if (shapeKey === 'rectangle') {
      // Center Boxing / Wrestling Ring (680 x 440)
      this.radius = 240;
      const hw = 340;
      const hh = 220;
      vertices.push({ x: centerX - hw, y: centerY - hh });
      vertices.push({ x: centerX + hw, y: centerY - hh });
      vertices.push({ x: centerX + hw, y: centerY + hh });
      vertices.push({ x: centerX - hw, y: centerY + hh });
    } else if (shapeKey === 'star') {
      // Comic 5-pointed Star: 10 vertices
      this.radius = radius + 20; // ~310
      const outerR = this.radius;
      const innerR = this.radius * 0.52;
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        vertices.push({
          x: centerX + Math.cos(a) * r,
          y: centerY + Math.sin(a) * r,
        });
      }
    } else if (shapeKey === 'circle') {
      // Smooth Circular Ring: 32 segments
      this.radius = radius + 5; // ~295
      const segments = 32;
      for (let i = 0; i < segments; i++) {
        const a = (i * 2 * Math.PI) / segments;
        vertices.push({
          x: centerX + Math.cos(a) * this.radius,
          y: centerY + Math.sin(a) * this.radius,
        });
      }
    } else {
      // Default: Octagon (8 sides)
      this.radius = radius;
      const sides = 8;
      const offsetAngle = Math.PI / 8; // flat floor at bottom
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides + offsetAngle;
        vertices.push({
          x: centerX + Math.cos(a) * radius,
          y: centerY + Math.sin(a) * radius,
        });
      }
    }

    this.arenaVertices = vertices;
    this.octagonVertices = vertices; // Backwards compatibility

    const numWalls = vertices.length;
    const wallRestitution = Math.min(0.98, CONFIG.ARENA.RESTITUTION * this.bounceMultiplier);

    for (let i = 0; i < numWalls; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % numWalls];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Inward normal towards arena center
      const normalAngle = angle + Math.PI / 2;
      const toCenterX = centerX - midX;
      const toCenterY = centerY - midY;
      let nx = Math.cos(normalAngle);
      let ny = Math.sin(normalAngle);
      if (nx * toCenterX + ny * toCenterY < 0) {
        nx = -nx;
        ny = -ny;
      }

      const wall = this.Bodies.rectangle(midX, midY, length + 24, wallThickness, {
        isStatic: true,
        angle: angle,
        restitution: wallRestitution,
        friction: CONFIG.ARENA.FRICTION,
        collisionFilter: {
          category: CONFIG.PHYSICS.WALL_COLLISION_CATEGORY,
        },
        label: `wall_${i}`,
        wallData: {
          index: i,
          normal: { x: nx, y: ny },
          midX,
          midY,
          isFloor: ny < -0.3, // surfaces facing upwards act as floor
        },
      });

      this.walls.push(wall);
    }

    this.Composite.add(this.world, this.walls);
  }

  /**
   * Builds the 8 static walls of the Octagon Arena (Legacy alias)
   */
  buildOctagonArena(centerX, centerY, radius = CONFIG.ARENA.DEFAULT_RADIUS) {
    this.buildArenaShape('octagon', centerX, centerY, radius);
  }

  /**
   * Builds center arena obstacles (none, bumper, pillars, platform, spinner)
   */
  buildObstacles(type = 'none') {
    this.obstacleType = type;
    this.spinnerAngle = 0;

    // Remove old obstacles
    if (this.obstacles.length > 0) {
      this.Composite.remove(this.world, this.obstacles);
      this.obstacles = [];
    }

    const cx = this.center.x;
    const cy = this.center.y;

    if (type === 'bumper') {
      const bumper = this.Bodies.circle(cx, cy, 38, {
        isStatic: true,
        restitution: 1.35,
        friction: 0.05,
        collisionFilter: {
          category: CONFIG.PHYSICS.OBSTACLE_COLLISION_CATEGORY,
        },
        label: 'obstacle_bumper',
        obstacleData: {
          type: 'bumper',
          radius: 38,
          x: cx,
          y: cy,
          hitFlash: 0,
        },
      });
      this.obstacles.push(bumper);
    } else if (type === 'pillars') {
      const pLeft = this.Bodies.circle(cx - 85, cy, 26, {
        isStatic: true,
        restitution: 0.8,
        friction: 0.1,
        collisionFilter: {
          category: CONFIG.PHYSICS.OBSTACLE_COLLISION_CATEGORY,
        },
        label: 'obstacle_pillar_1',
        obstacleData: { type: 'pillar', radius: 26, x: cx - 85, y: cy },
      });
      const pRight = this.Bodies.circle(cx + 85, cy, 26, {
        isStatic: true,
        restitution: 0.8,
        friction: 0.1,
        collisionFilter: {
          category: CONFIG.PHYSICS.OBSTACLE_COLLISION_CATEGORY,
        },
        label: 'obstacle_pillar_2',
        obstacleData: { type: 'pillar', radius: 26, x: cx + 85, y: cy },
      });
      this.obstacles.push(pLeft, pRight);
    } else if (type === 'platform') {
      const platform = this.Bodies.rectangle(cx, cy + 18, 150, 20, {
        isStatic: true,
        chamfer: { radius: 8 },
        restitution: 0.35,
        friction: 0.25,
        collisionFilter: {
          category: CONFIG.PHYSICS.OBSTACLE_COLLISION_CATEGORY,
        },
        label: 'obstacle_platform',
        obstacleData: { type: 'platform', width: 150, height: 20, x: cx, y: cy + 18 },
      });
      this.obstacles.push(platform);
    } else if (type === 'spinner') {
      const bar = this.Bodies.rectangle(cx, cy, 155, 20, {
        isStatic: true,
        chamfer: { radius: 8 },
        restitution: 1.1,
        friction: 0.1,
        collisionFilter: {
          category: CONFIG.PHYSICS.OBSTACLE_COLLISION_CATEGORY,
        },
        label: 'obstacle_spinner',
        obstacleData: { type: 'spinner', width: 155, height: 20, x: cx, y: cy },
      });
      this.obstacles.push(bar);
    }

    if (this.obstacles.length > 0) {
      this.Composite.add(this.world, this.obstacles);
    }
  }

  setupCollisionEvents() {
    this.Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const { bodyA, bodyB } = pair;

        // Check Wall collision
        const isWallA = bodyA.label && bodyA.label.startsWith('wall_');
        const isWallB = bodyB.label && bodyB.label.startsWith('wall_');

        if (isWallA || isWallB) {
          const wallBody = isWallA ? bodyA : bodyB;
          const otherBody = isWallA ? bodyB : bodyA;

          if (otherBody.fighterInstance && this.onWallImpact) {
            const speed = this.Vector.magnitude(otherBody.velocity);
            this.onWallImpact(otherBody.fighterInstance, wallBody.wallData, speed, pair);
          }
        }

        // Check Obstacle collision
        const isObsA = bodyA.label && bodyA.label.startsWith('obstacle_');
        const isObsB = bodyB.label && bodyB.label.startsWith('obstacle_');

        if (isObsA || isObsB) {
          const obsBody = isObsA ? bodyA : bodyB;
          const otherBody = isObsA ? bodyB : bodyA;

          if (otherBody.fighterInstance && this.onObstacleImpact) {
            const speed = this.Vector.magnitude(otherBody.velocity);
            this.onObstacleImpact(otherBody.fighterInstance, obsBody, speed, pair);
          }
        }

        // Check Fighter vs Fighter collision
        if (bodyA.fighterInstance && bodyB.fighterInstance && this.onFighterCollision) {
          this.onFighterCollision(bodyA.fighterInstance, bodyB.fighterInstance, pair);
        }
      }
    });
  }

  addBody(body) {
    this.Composite.add(this.world, body);
  }

  removeBody(body) {
    this.Composite.remove(this.world, body);
  }

  /**
   * Ensures no fighter escapes outside arena boundaries
   */
  enforceArenaBounds(fighters) {
    if (this.arenaShape === 'rectangle_full') {
      const minX = 64;
      const maxX = CONFIG.CANVAS.WIDTH - 64;
      const minY = 64;
      const maxY = CONFIG.CANVAS.HEIGHT - 64;
      for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (!f.body || f.isKO) continue;
        const pos = f.body.position;
        if (pos.x < minX) {
          this.Body.setPosition(f.body, { x: minX + 15, y: pos.y });
          this.Body.setVelocity(f.body, { x: 3, y: f.body.velocity.y });
        } else if (pos.x > maxX) {
          this.Body.setPosition(f.body, { x: maxX - 15, y: pos.y });
          this.Body.setVelocity(f.body, { x: -3, y: f.body.velocity.y });
        }
        const headMargin = 22 * (f.scale || 1.0);
        const topLimit = minY + headMargin;
        if (pos.y < topLimit) {
          this.Body.setPosition(f.body, { x: pos.x, y: topLimit + 4 });
          this.Body.setVelocity(f.body, { x: f.body.velocity.x, y: Math.max(3.2, Math.abs(f.body.velocity.y)) });
        } else if (pos.y > maxY - 15) {
          this.Body.setPosition(f.body, { x: pos.x, y: maxY - 15 });
          this.Body.setVelocity(f.body, { x: f.body.velocity.x, y: -3 });
        }
      }
      return;
    }

    if (this.arenaShape === 'rectangle') {
      const hw = 320;
      const hh = 200;
      const minX = this.center.x - hw;
      const maxX = this.center.x + hw;
      const minY = this.center.y - hh;
      const maxY = this.center.y + hh;
      for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (!f.body || f.isKO) continue;
        const pos = f.body.position;
        if (pos.x < minX) {
          this.Body.setPosition(f.body, { x: minX + 15, y: pos.y });
          this.Body.setVelocity(f.body, { x: 3, y: f.body.velocity.y });
        } else if (pos.x > maxX) {
          this.Body.setPosition(f.body, { x: maxX - 15, y: pos.y });
          this.Body.setVelocity(f.body, { x: -3, y: f.body.velocity.y });
        }
        const headMargin = 22 * (f.scale || 1.0);
        const topLimit = minY + headMargin;
        if (pos.y < topLimit) {
          this.Body.setPosition(f.body, { x: pos.x, y: topLimit + 4 });
          this.Body.setVelocity(f.body, { x: f.body.velocity.x, y: Math.max(3.2, Math.abs(f.body.velocity.y)) });
        } else if (pos.y > maxY - 15) {
          this.Body.setPosition(f.body, { x: pos.x, y: maxY - 15 });
          this.Body.setVelocity(f.body, { x: f.body.velocity.x, y: -3 });
        }
      }
      return;
    }

    // Radial check for octagon, star, circle
    const maxDist = this.radius + 15;
    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      if (!f.body || f.isKO) continue;

      const dx = f.body.position.x - this.center.x;
      const dy = f.body.position.y - this.center.y;
      const dist = Math.hypot(dx, dy);

      // Top ceiling deflection for radial shapes (prevent ceiling sticking)
      if (dy < -(this.radius - 24) && f.body.velocity.y < 0) {
        this.Body.setVelocity(f.body, { x: f.body.velocity.x, y: Math.max(2.8, -f.body.velocity.y) });
      }

      if (dist > maxDist) {
        // Soft push back to inside arena boundary
        const angle = Math.atan2(dy, dx);
        const targetX = this.center.x + Math.cos(angle) * (this.radius - 25);
        const targetY = this.center.y + Math.sin(angle) * (this.radius - 25);
        this.Body.setPosition(f.body, { x: targetX, y: targetY });
        this.Body.setVelocity(f.body, {
          x: -Math.cos(angle) * 3,
          y: -Math.sin(angle) * 3,
        });
      }
    }
  }

  update(dt, fighters = []) {
    // Dynamic gravity wave mode
    if (this.gravityMode === 'wave') {
      this.waveTimer += dt;
      this.engine.gravity.y = 0.5 + Math.sin(this.waveTimer * 1.8) * 0.45;
    }

    // Floating / Low-G buoyancy: symmetric vertical balance around arena center
    if (this.gravityMode !== 'normal' && fighters.length > 0) {
      const mode = CONFIG.GRAVITY_MODES[this.gravityMode] || CONFIG.GRAVITY_MODES.float;
      const buoyancy = mode.buoyancy || 0.0022;

      for (let i = 0; i < fighters.length; i++) {
        const f = fighters[i];
        if (f.body && !f.isKO) {
          const dy = f.body.position.y - this.center.y;
          const forceScale = Math.pow(f.scale || 1.0, 2);
          if (dy > 40) {
            // Below center: lift gently upwards
            this.Body.applyForce(f.body, f.body.position, {
              x: (Math.random() - 0.5) * 0.0006 * forceScale,
              y: -buoyancy * forceScale * (1 + dy / 160),
            });
          } else if (dy < -40) {
            // Above center: push down towards arena center (prevents ceiling clustering!)
            this.Body.applyForce(f.body, f.body.position, {
              x: (Math.random() - 0.5) * 0.0006 * forceScale,
              y: buoyancy * forceScale * (1 + Math.abs(dy) / 160),
            });
          }
        }
      }
    }

    // Decay obstacle scale pulse animations
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.obstacleData && obs.obstacleData.scalePulse > 1.0) {
        obs.obstacleData.scalePulse = Math.max(1.0, obs.obstacleData.scalePulse - dt * 3.5);
      }
    }

    // Rotate spinner obstacle if active
    if (this.obstacleType === 'spinner') {
      this.spinnerAngle += dt * 2.2;
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (obs.obstacleData && obs.obstacleData.type === 'spinner') {
          this.Body.setAngle(obs, this.spinnerAngle);
        }
      }
    }

    // 60fps fixed delta time for physics stability
    const delta = Math.min(dt * 1000, 1000 / 30);
    this.Engine.update(this.engine, delta);
  }

  clear() {
    this.Composite.clear(this.world, false);
    this.walls = [];
    this.obstacles = [];
  }
}
