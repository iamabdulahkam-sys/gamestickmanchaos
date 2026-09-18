/**
 * Stickman Flag Chaos - AI Module
 * AI State Machine and behavior controller for automated chaotic stickman battles.
 * Features smart team targeting, item acquisition, attacker cap (slot system),
 * crowd separation force (Boids flocking), and anti-clump breakout maneuvers.
 */

import { CONFIG } from './config.js';

class FighterAI {
  constructor(fighter) {
    this.fighter = fighter;
    this.state = 'IDLE'; // IDLE, CHASE, ATTACK, DODGE, RECOVER
    this.decisionTimer = Math.random() * 0.3;
    this.attackDelayTimer = 0;
    this.jumpCooldown = 0;
    this.targetSwitchTimer = 1.8 + Math.random() * 2.0;
    this.targetItem = null;
    this.clumpStuckTimer = 0;
  }

  update(allFighters, dt, effects, items = [], attackerCounts = null) {
    if (!this.fighter.body || this.fighter.isKO) return;

    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
    if (this.attackDelayTimer > 0) this.attackDelayTimer -= dt;
    this.targetSwitchTimer -= dt;

    // If knocked back, let physics handle it
    if (this.fighter.state === 'KNOCKED_BACK') {
      return;
    }

    const myPos = this.fighter.body.position;
    const arenaCenter = this.fighter.physics.center;
    const distFromCenter = Math.hypot(myPos.x - arenaCenter.x, myPos.y - arenaCenter.y);
    const nearWall = distFromCenter > this.fighter.physics.radius * 0.88;
    const forceScale = Math.pow(this.fighter.scale || 1.0, 2);

    // --- ANTI-CLUMP SYSTEM: Crowd Separation Force (Boids Flocking Repulsion) ---
    const crowdRadius = Math.max(26, ((CONFIG.AI && CONFIG.AI.CROWD_SEPARATION_RADIUS) || 35) * (this.fighter.scale || 1.0));
    const minCrowdCount = (CONFIG.AI && CONFIG.AI.CROWD_SEPARATION_MIN_COUNT) || 3;
    let neighborCount = 0;
    let avgNeighborX = 0;
    let avgNeighborY = 0;

    for (let i = 0; i < allFighters.length; i++) {
      const other = allFighters[i];
      if (other !== this.fighter && !other.isKO && other.body) {
        const odx = other.body.position.x - myPos.x;
        const ody = other.body.position.y - myPos.y;
        const odist = Math.hypot(odx, ody);
        if (odist < crowdRadius) {
          neighborCount++;
          avgNeighborX += other.body.position.x;
          avgNeighborY += other.body.position.y;
        }
      }
    }

    if (neighborCount >= minCrowdCount) {
      avgNeighborX /= neighborCount;
      avgNeighborY /= neighborCount;
      const awayX = myPos.x - avgNeighborX;
      const awayY = myPos.y - avgNeighborY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      const repulseDirX = awayX !== 0 ? awayX / awayDist : (Math.random() > 0.5 ? 1 : -1);

      // Vertical separation: if in upper arena, ALWAYS push DOWNWARD away from ceiling!
      let repulseDirY;
      if (myPos.y < arenaCenter.y - 30) {
        repulseDirY = 1.0; // PUSH DOWN AWAY FROM CEILING!
      } else if (myPos.y > arenaCenter.y + 40) {
        repulseDirY = -0.6; // Anti-trample lift when on floor
      } else {
        repulseDirY = awayY / awayDist;
      }

      // Apply soft lateral & vertical repulsion
      this.fighter.physics.Body.applyForce(this.fighter.body, myPos, {
        x: repulseDirX * 0.0034 * forceScale,
        y: repulseDirY * 0.0032 * forceScale,
      });

      // --- ANTI-CLUMP SYSTEM: Breakout High Hop & Downward Dive ---
      this.clumpStuckTimer += dt;
      if (this.clumpStuckTimer > 0.35 && this.jumpCooldown <= 0) {
        this.clumpStuckTimer = 0;
        if (myPos.y < arenaCenter.y - 40) {
          // STUCK AT TOP: Perform downward dive towards ring center!
          this.fighter.physics.Body.setVelocity(this.fighter.body, {
            x: (Math.random() - 0.5) * 5,
            y: 4.5,
          });
          this.fighter.move(repulseDirX);
          this.jumpCooldown = 0.75;
        } else if (this.fighter.isGrounded) {
          // STUCK AT BOTTOM: High hop into air
          const jumpDir = nearWall ? (arenaCenter.x > myPos.x ? 1 : -1) : repulseDirX;
          this.fighter.jump(jumpDir, 1.35); // boosted breakout hop
          this.jumpCooldown = 0.7 + Math.random() * 0.4;
        }
      }
    } else {
      this.clumpStuckTimer = Math.max(0, this.clumpStuckTimer - dt * 1.5);
    }

    // 1. Check nearby uncollected items if fighter has no weapon
    if (!this.fighter.equippedItem && items && items.length > 0) {
      let closestItem = null;
      let minItemDist = 200; // seeking radius
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const d = Math.hypot(it.x - myPos.x, it.y - myPos.y);
        if (d < minItemDist) {
          minItemDist = d;
          closestItem = it;
        }
      }
      this.targetItem = closestItem;
    } else {
      this.targetItem = null;
    }

    // If targeting an item to get more damage, actively run to it!
    if (this.targetItem) {
      const idx = this.targetItem.x - myPos.x;
      const idy = this.targetItem.y - myPos.y;
      const idist = Math.hypot(idx, idy);

      if (idist > 18) {
        this.state = 'CHASE';
        const idir = idx > 0 ? 1 : -1;
        this.fighter.move(idir, true);

        if (idy < -25 && this.fighter.isGrounded && this.jumpCooldown <= 0) {
          this.fighter.jump(idir);
          this.jumpCooldown = 0.5;
        }
        return;
      }
    }

    // 2. Acquire or maintain target opponent (with Attacker Cap)
    const maxAttackers = (CONFIG.AI && CONFIG.AI.MAX_ATTACKERS_PER_TARGET) || 2;
    const isOvercrowded =
      attackerCounts &&
      this.fighter.target &&
      (attackerCounts.get(this.fighter.target) || 0) > maxAttackers;

    const shouldRetarget =
      !this.fighter.target ||
      this.fighter.target.isKO ||
      !this.fighter.target.body ||
      this.targetSwitchTimer <= 0 ||
      isOvercrowded;

    if (shouldRetarget) {
      this.acquireTarget(allFighters, attackerCounts);
      this.targetSwitchTimer = 1.8 + Math.random() * 2.2;
    }

    const target = this.fighter.target;
    if (!target || !target.body) {
      this.state = 'IDLE';
      return;
    }

    const targetPos = target.body.position;
    const dx = targetPos.x - myPos.x;
    const dy = targetPos.y - myPos.y;
    const dist = Math.hypot(dx, dy);

    // 3. Proximity check with arena center / walls
    if (nearWall) {
      const toCenterX = arenaCenter.x - myPos.x;
      this.fighter.move(toCenterX > 0 ? 1 : -1);
      if (this.fighter.isGrounded && this.jumpCooldown <= 0 && Math.random() < 0.4) {
        this.fighter.jump(toCenterX > 0 ? 1 : -1);
        this.jumpCooldown = 0.6;
      }
    }

    // Anti-bottom clumping
    const isAtBottom = myPos.y > arenaCenter.y + 35;
    if (isAtBottom && this.fighter.isGrounded && this.jumpCooldown <= 0 && (Math.random() < 0.12 || dy < -15)) {
      this.fighter.jump(dx > 0 ? 1 : -1);
      this.jumpCooldown = 0.5 + Math.random() * 0.5;
    }

    // Mid-air pursuit propulsion in Float / Low-G / Zero-G modes
    if (!this.fighter.isGrounded && this.fighter.physics.gravityMode !== 'normal') {
      const dirNormX = dist > 1 ? dx / dist : 0;
      let dirNormY = dist > 1 ? dy / dist : 0;
      // In upper arena, clamp upward propulsion to 0 to prevent ceiling clumping
      if (myPos.y < arenaCenter.y - 60 && dirNormY < 0) {
        dirNormY = 0;
      }
      this.fighter.physics.Body.applyForce(this.fighter.body, myPos, {
        x: dirNormX * 0.0024 * forceScale,
        y: dirNormY * 0.0024 * forceScale,
      });
    }

    // 4. Core AI Combat & Active Pursuit Tree
    const isRanged = this.fighter.equippedItem?.isRanged;
    const effectivePunchRange = isRanged ? 280 : (this.fighter.punchRange || (CONFIG.FIGHTER.PUNCH_RANGE + 8));
    if (dist <= effectivePunchRange) {
      // IN ATTACK RANGE: Strike aggressively!
      this.state = 'ATTACK';
      this.fighter.facing = dx > 0 ? 1 : -1;

      // Keep light forward pressure to prevent drifting away (only if melee)
      if (!isRanged) {
        this.fighter.move(this.fighter.facing * 0.4);
      }

      if (this.attackDelayTimer <= 0 && this.fighter.punchCooldown <= 0) {
        this.fighter.punch(effects);
        this.attackDelayTimer = 0.08 + Math.random() * 0.22;

        // Tactical hop or dodge
        if (Math.random() < CONFIG.FIGHTER.DODGE_CHANCE && this.fighter.isGrounded) {
          this.fighter.move(-this.fighter.facing);
          if (Math.random() < 0.45 && this.jumpCooldown <= 0) {
            this.fighter.jump(-this.fighter.facing);
            this.jumpCooldown = 0.55;
          }
        }
      }
    } else {
      // ACTIVE PURSUIT: Close the distance vigorously!
      this.state = 'CHASE';
      const dir = dx > 0 ? 1 : -1;
      const isSprint = dist > 80;
      this.fighter.move(dir, isSprint);

      // Jump towards target if on different height (only when in lower arena)
      const isLowerHalf = this.fighter.body.position.y > (arenaCenter.y - 30);
      const shouldJumpForHeight = dy < -22 && dist < 170 && isLowerHalf;
      const closingHopChance = Math.random() < 0.045 && isLowerHalf;

      if (this.fighter.isGrounded && this.jumpCooldown <= 0 && (shouldJumpForHeight || closingHopChance)) {
        this.fighter.jump(dir);
        this.jumpCooldown = 0.45 + Math.random() * 0.5;
      }
    }
  }

  acquireTarget(allFighters, attackerCounts = null) {
    // 1. Prioritize opponents from DIFFERENT teams/countries
    let candidates = allFighters.filter(
      (f) => f !== this.fighter && !f.isKO && f.body && f.country.id !== this.fighter.country.id
    );

    // 2. Fallback to any alive opponent (FFA with same country)
    if (candidates.length === 0) {
      candidates = allFighters.filter((f) => f !== this.fighter && !f.isKO && f.body);
    }

    if (candidates.length === 0) {
      if (this.fighter.target && attackerCounts) {
        attackerCounts.set(this.fighter.target, Math.max(0, (attackerCounts.get(this.fighter.target) || 0) - 1));
      }
      this.fighter.target = null;
      return;
    }

    // 3. Attacker Cap (Slot System): Limit each opponent to max 2 attackers
    const maxAttackers = (CONFIG.AI && CONFIG.AI.MAX_ATTACKERS_PER_TARGET) || 2;
    let pool = candidates;
    if (attackerCounts && candidates.length > 1) {
      const available = candidates.filter((c) => (attackerCounts.get(c) || 0) < maxAttackers);
      if (available.length > 0) {
        pool = available;
      }
    }

    const oldTarget = this.fighter.target;

    // Choose closest opponent with 85% probability, 15% random
    if (Math.random() < 0.85) {
      let nearest = null;
      let minDist = Infinity;
      const myPos = this.fighter.body.position;

      for (let i = 0; i < pool.length; i++) {
        const other = pool[i];
        const dist = Math.hypot(other.body.position.x - myPos.x, other.body.position.y - myPos.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = other;
        }
      }
      this.fighter.target = nearest;
    } else {
      this.fighter.target = pool[Math.floor(Math.random() * pool.length)];
    }

    // Keep attackerCounts actively synchronized across sequential AI updates
    if (attackerCounts) {
      if (oldTarget && oldTarget !== this.fighter.target) {
        attackerCounts.set(oldTarget, Math.max(0, (attackerCounts.get(oldTarget) || 0) - 1));
      }
      if (this.fighter.target) {
        attackerCounts.set(this.fighter.target, (attackerCounts.get(this.fighter.target) || 0) + 1);
      }
    }
  }
}

export class AIManager {
  constructor() {
    this.controllers = new Map();
  }

  registerFighter(fighter) {
    const key = fighter.cornerIndex !== undefined ? fighter.cornerIndex : fighter.country.id;
    this.controllers.set(key, new FighterAI(fighter));
  }

  removeFighter(fighterKey) {
    this.controllers.delete(fighterKey);
  }

  clear() {
    this.controllers.clear();
  }

  update(fighters, dt, effects, items = []) {
    // 1. Calculate active target distribution (Attacker Cap Tracking)
    const attackerCounts = new Map();
    for (const [_, ctrl] of this.controllers) {
      const tgt = ctrl.fighter?.target;
      if (tgt && !tgt.isKO && ctrl.fighter && !ctrl.fighter.isKO) {
        attackerCounts.set(tgt, (attackerCounts.get(tgt) || 0) + 1);
      }
    }

    for (let i = 0; i < fighters.length; i++) {
      const f = fighters[i];
      const key = f.cornerIndex !== undefined ? f.cornerIndex : f.country.id;
      let ai = this.controllers.get(key);
      if (!ai) {
        ai = new FighterAI(f);
        this.controllers.set(key, ai);
      }
      ai.update(fighters, dt, effects, items, attackerCounts);
    }
  }
}
