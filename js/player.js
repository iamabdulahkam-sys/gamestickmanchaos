/**
 * Stickman Flag Chaos - Player / Stickman Fighter Module
 * Handles stickman physics body, procedural cartoon ragdoll limbs, health, and combat actions.
 */

import { CONFIG } from './config.js';
import { Flags } from './flags.js';
import { sound } from './audio.js';

export class StickmanFighter {
  constructor(physics, countryData, startX, startY, cornerIndex = 0, customMaxHp = null, customScale = 1.0) {
    this.physics = physics;
    this.country = countryData;
    this.name = countryData.name;
    this.cornerIndex = cornerIndex;

    this.scale = customScale || 1.0;
    this.punchRange = (CONFIG.FIGHTER.PUNCH_RANGE + 8) * this.scale;

    this.maxHp = customMaxHp || CONFIG.FIGHTER.BASE_HP;
    this.hp = this.maxHp;
    this.state = 'IDLE'; // IDLE, CHASE, ATTACK, DODGE, KNOCKED_BACK, RECOVER, KO
    this.facing = 1; // 1 = right, -1 = left
    this.isGrounded = false;
    this.isKO = false;
    this.koTimer = 0;
    this.alpha = 1.0;

    this.punchCooldown = 0;
    this.punchAnim = 0; // 0 to 1
    this.hitFlashTimer = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.stunTimer = 0;
    this.isVictoryPose = false;
    this.celebrateTime = 0;

    // Equipped weapon/item state
    this.equippedItem = null;

    this.bodyColor = countryData.bodyColor || countryData.primaryColor || '#181B2A';
    this.target = null;
    this.headRadius = CONFIG.FIGHTER.HEAD_RADIUS;

    this.initPhysics(startX, startY);
  }

  equipItem(itemConfig, effects) {
    this.equippedItem = {
      type: itemConfig.id,
      name: itemConfig.name,
      bonusDamage: itemConfig.bonusDamage || 16,
      hitsLeft: itemConfig.maxHits || 5,
      maxHits: itemConfig.maxHits || 5,
      color: itemConfig.color || '#FFE600',
      speedBoost: itemConfig.speedBoost || 1.0,
      knockbackMult: itemConfig.knockbackMult || 1.5,
      comicWord: itemConfig.comicWord || 'POWER UP!',
      isRanged: !!itemConfig.isRanged,
      blastRadius: itemConfig.blastRadius || 0,
      duration: 16.0,
    };
  }

  initPhysics(x, y) {
    const { Bodies, Body } = this.physics;

    const width = 22 * this.scale;
    const height = 46 * this.scale;
    const chamferRadius = Math.max(3, 10 * this.scale);

    // Create main body (capsule/chamfered rectangle scaled to player count)
    this.body = Bodies.rectangle(x, y, width, height, {
      chamfer: { radius: chamferRadius },
      density: 0.002,
      friction: 0.1,
      frictionAir: CONFIG.PHYSICS.AIR_RESISTANCE,
      restitution: 0.35,
      collisionFilter: {
        category: CONFIG.PHYSICS.STICKMAN_COLLISION_CATEGORY,
        mask: CONFIG.PHYSICS.WALL_COLLISION_CATEGORY | CONFIG.PHYSICS.STICKMAN_COLLISION_CATEGORY,
      },
      label: `fighter_${this.country.id}`,
    });

    // Moderate rotational inertia so stickman tilts funnily but doesn't get stuck upside down
    Body.setInertia(this.body, 14000 * Math.pow(this.scale, 2));
    this.body.fighterInstance = this;

    this.physics.addBody(this.body);
  }

  jump(forwardImpulse = 0, jumpMultiplier = 1.0) {
    if (!this.body || this.isKO || !this.isGrounded || this.isVictoryPose) return;
    const { Body } = this.physics;
    const forceScale = Math.pow(this.scale, 2);
    Body.applyForce(this.body, this.body.position, {
      x: (forwardImpulse * 0.006 + (Math.random() - 0.5) * 0.004) * forceScale * jumpMultiplier,
      y: -CONFIG.FIGHTER.JUMP_FORCE * forceScale * jumpMultiplier,
    });
    this.isGrounded = false;
    sound.playJump();
  }

  move(direction, isSprint = false) {
    if (!this.body || this.isKO || this.stunTimer > 0 || this.isVictoryPose) return;
    const { Body } = this.physics;

    this.facing = direction > 0 ? 1 : -1;
    const currentVx = this.body.velocity.x;

    const moveMult = this.physics.movementSpeedMultiplier !== undefined ? this.physics.movementSpeedMultiplier : 1.0;
    const speedBoost = (this.equippedItem?.speedBoost || 1.0) * moveMult;
    const maxSpd = (isSprint ? CONFIG.FIGHTER.MAX_SPEED * 1.35 : CONFIG.FIGHTER.MAX_SPEED) * speedBoost;
    const forceScale = Math.pow(this.scale, 2);
    const force = (isSprint ? CONFIG.FIGHTER.SPRINT_FORCE : CONFIG.FIGHTER.MOVE_FORCE) * speedBoost * forceScale;

    if (Math.abs(currentVx) < maxSpd) {
      Body.applyForce(this.body, this.body.position, {
        x: direction * force,
        y: 0,
      });
    }
  }

  punch(effects) {
    if (!this.body || this.isKO || this.punchCooldown > 0 || this.stunTimer > 0 || this.isVictoryPose) return;

    this.punchCooldown = CONFIG.FIGHTER.PUNCH_COOLDOWN_MS / 1000;
    this.punchAnim = 1.0;

    // Custom sound based on equipped weapon
    if (this.equippedItem?.type === 'hammer') {
      sound.playBonk();
    } else if (this.equippedItem?.type === 'star') {
      sound.playZap();
    } else if (this.equippedItem?.type === 'laser') {
      sound.playLaser();
    } else if (this.equippedItem?.type === 'missile') {
      sound.playRocket();
    } else {
      sound.playPunch();
    }

    // Check ranged weapon firing (Laser beam or Rocket Missile)
    if (this.equippedItem?.isRanged) {
      const items = this.game?.items || this.physics?.game?.items;
      if (items) {
        if (this.equippedItem.type === 'laser') {
          const allFighters = this.game?.fighters || [];
          items.spawnLaser(this, this.physics, allFighters, effects);
        } else if (this.equippedItem.type === 'missile') {
          items.spawnMissile(this, this.physics, effects);
        }
      }

      // Decrement weapon hits / ammo
      this.equippedItem.hitsLeft--;
      if (this.equippedItem.hitsLeft <= 0) {
        if (effects) {
          const px = this.body.position.x + this.facing * 18 * this.scale;
          const py = this.body.position.y - 4 * this.scale;
          effects.addLandDust(px, py);
          effects.addHitEffect(px, py - 14 * this.scale, 'POOF!', true, this.scale);
        }
        this.equippedItem = null;
      }
      return;
    }

    // Check hit against target
    if (this.target && !this.target.isKO && this.target.body) {
      const dx = this.target.body.position.x - this.body.position.x;
      const dy = this.target.body.position.y - this.body.position.y;
      const dist = Math.hypot(dx, dy);

      // Must be within punch range and roughly in front
      const isFacingTarget = (dx > 0 && this.facing > 0) || (dx < 0 && this.facing < 0);
      const hitReach = (CONFIG.FIGHTER.PUNCH_RANGE + 6) * this.scale;
      if (dist < hitReach && isFacingTarget) {
        const bonusDamage = this.equippedItem ? this.equippedItem.bonusDamage : 0;
        const damage =
          Math.floor(
            CONFIG.FIGHTER.PUNCH_DAMAGE_MIN +
              Math.random() * (CONFIG.FIGHTER.PUNCH_DAMAGE_MAX - CONFIG.FIGHTER.PUNCH_DAMAGE_MIN + 1)
          ) + bonusDamage;

        // Knockback vector
        const kbDirX = this.facing;
        // In upper arena, spike victim downward towards ring center; in lower arena, pop slightly up
        const isHighUp = this.body.position.y < (this.physics.center.y - 30);
        const kbDirY = isHighUp ? 0.65 : -0.55;
        const kbMult = this.equippedItem ? this.equippedItem.knockbackMult : 1.0;
        const kbForce = CONFIG.FIGHTER.PUNCH_KNOCKBACK * kbMult * (0.85 + Math.random() * 0.3);

        const hitX = (this.body.position.x + this.target.body.position.x) / 2;
        const hitY = (this.body.position.y + this.target.body.position.y) / 2 - 10 * this.scale;

        const isWeapon = !!this.equippedItem;
        const isCritical = damage >= (CONFIG.FIGHTER.PUNCH_DAMAGE_MAX - 1);
        if (effects) {
          const hitWord = this.equippedItem ? this.equippedItem.comicWord : null;
          effects.addHitEffect(hitX, hitY, hitWord, isCritical || isWeapon, this.scale);
          if (this.equippedItem) {
            effects.addShockwave(hitX, hitY, this.equippedItem.color, 65);
          }
        }

        this.target.takeDamage(damage, { x: kbDirX * kbForce, y: kbDirY * kbForce }, this, effects);

        // Decrement weapon hits
        if (this.equippedItem) {
          this.equippedItem.hitsLeft--;
          if (this.equippedItem.hitsLeft <= 0) {
            if (effects) {
              effects.addLandDust(hitX, hitY);
              effects.addHitEffect(hitX, hitY - 14 * this.scale, 'POOF!', true, this.scale);
            }
            this.equippedItem = null;
          }
        }
      }
    }
  }

  takeDamage(amount, knockback, attacker, effects) {
    if (!this.body || this.isKO) return;

    const dmg = Math.max(0, Number(amount) || 0);
    const game = this.game || attacker?.game;
    if (game && dmg > 0) {
      game.totalDamageDealt = (game.totalDamageDealt || 0) + dmg;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.16;
    this.stunTimer = 0.22;
    this.state = 'KNOCKED_BACK';

    const { Body } = this.physics;
    Body.setVelocity(this.body, {
      x: this.body.velocity.x * 0.3 + knockback.x,
      y: this.body.velocity.y * 0.2 + knockback.y,
    });

    // Angular tilt for cartoon hit reaction
    Body.setAngularVelocity(this.body, (Math.random() - 0.5) * 0.3);

    if (this.hp <= 0) {
      this.triggerKO(effects);
    }
  }

  triggerKO(effects) {
    if (!this.body) return;
    this.isKO = true;
    this.state = 'KO';
    this.koTimer = 3.0; // 3 seconds before removal

    sound.playKO();

    if (effects) {
      effects.addKOSparks(this.body.position.x, this.body.position.y, this.scale);
    }

    // Launch into air with hilarious ragdoll spin
    const { Body } = this.physics;
    Body.setVelocity(this.body, {
      x: (Math.random() - 0.5) * 12,
      y: -10 - Math.random() * 5,
    });
    Body.setAngularVelocity(this.body, (Math.random() > 0.5 ? 1 : -1) * 0.4);

    // Disable fighter-to-fighter collision so survivors fight without obstruction
    this.body.collisionFilter.mask = CONFIG.PHYSICS.WALL_COLLISION_CATEGORY;
  }

  update(dt, effects) {
    if (!this.body) return;
    // Cooldown timers
    if (this.punchCooldown > 0) this.punchCooldown -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0 && !this.isKO) {
        this.state = 'RECOVER';
      }
    }

    if (this.punchAnim > 0) {
      this.punchAnim = Math.max(0, this.punchAnim - dt * 4.5);
    }

    // Update equipped item duration
    if (this.equippedItem) {
      this.equippedItem.duration -= dt;
      if (this.equippedItem.duration <= 0) {
        if (effects) {
          effects.addLandDust(this.body.position.x, this.body.position.y);
          effects.addHitEffect(this.body.position.x, this.body.position.y - 12 * this.scale, 'POOF!', true, this.scale);
        }
        this.equippedItem = null;
      }
    }

    // Check if grounded: must have low vertical speed AND be in lower region of the arena
    const isAtLowerHalf = this.body.position.y >= (this.physics.center.y - 20);
    this.isGrounded = isAtLowerHalf && Math.abs(this.body.velocity.y) < 0.85;

    // Running / walking animation stride
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
    const isMoving = Math.abs(this.body.velocity.x) > 0.2 || this.state === 'CHASE' || this.state === 'ATTACK';
    if (isMoving) {
      this.walkCycle += dt * (Math.max(2.2, speed) * 4.2);
    } else if (!this.isGrounded && !this.isKO) {
      // Flutter kicks in air or low-G
      this.walkCycle += dt * 6.5;
    }

    // Upright stabilization torque (spring-like uprighting for cartoon balance)
    if (!this.isKO) {
      const { Body } = this.physics;
      if (this.isVictoryPose) {
        this.celebrateTime = (this.celebrateTime || 0) + dt;
        Body.setVelocity(this.body, {
          x: this.body.velocity.x * 0.82,
          y: this.body.velocity.y,
        });
        Body.setAngle(this.body, this.body.angle * 0.8);
        Body.setAngularVelocity(this.body, this.body.angularVelocity * 0.4);
        this.walkCycle = 0;
      } else {
        const angle = this.body.angle;
        const uprightForce = -angle * 0.08;
        Body.setAngularVelocity(this.body, this.body.angularVelocity * 0.9 + uprightForce);
      }
    }

    // KO fade out
    if (this.isKO) {
      this.koTimer -= dt;
      if (this.koTimer < 1.0) {
        this.alpha = Math.max(0, this.koTimer);
      }
    }
  }

  draw(ctx) {
    if (!this.body || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const posX = this.body.position.x;
    const posY = this.body.position.y;
    const angle = this.body.angle;

    ctx.translate(posX, posY);
    ctx.rotate(angle);
    if (this.scale && this.scale !== 1.0) {
      ctx.scale(this.scale, this.scale);
    }

    // Hit flash tint
    const isFlashing = this.hitFlashTimer > 0;
    const stickColor = isFlashing ? '#FFFFFF' : (this.bodyColor || '#181B2A');
    const accentColor = isFlashing ? '#FFE600' : this.country.primaryColor;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Torso anchor points relative to body center (0,0)
    const neckY = -18;
    const hipY = 10;

    // --- LEGS (Articulated Hip -> Knee -> Foot Cartoon Animation) ---
    const legLength = CONFIG.FIGHTER.LEG_LENGTH;
    const thighLen = legLength * 0.52;
    const shinLen = legLength * 0.54;

    const isMoving = Math.abs(this.body.velocity.x) > 0.2 || this.state === 'CHASE' || this.state === 'ATTACK';

    const drawArticulatedLeg = (hipX, phaseOffset) => {
      const phase = this.walkCycle + phaseOffset;
      let kneeX, kneeY, footX, footY;

      if (this.isKO) {
        kneeX = hipX + (hipX < 0 ? -9 : 9);
        kneeY = hipY + thighLen * 0.8;
        footX = kneeX + (hipX < 0 ? -6 : 6);
        footY = kneeY + shinLen * 0.6;
      } else if (this.isVictoryPose) {
        // Firm upright victory stance: standing still with feet planted
        kneeX = hipX;
        kneeY = hipY + thighLen;
        footX = hipX + (hipX < 0 ? -3.5 : 3.5);
        footY = hipY + legLength;
      } else if (!this.isGrounded && Math.abs(this.body.velocity.y) > 1.2) {
        // Airborne jump / dive pose
        const tuck = Math.sin(phase) * 0.4;
        kneeX = hipX + this.facing * 8;
        kneeY = hipY + thighLen * 0.65;
        footX = kneeX - this.facing * 5 + tuck * 6;
        footY = kneeY + shinLen * 0.75;
      } else if (isMoving) {
        // Dynamic walking / running cycle with bending knee and lifting foot
        const stride = Math.sin(phase);
        const lift = Math.max(0, -Math.cos(phase));

        const thighAngle = stride * 0.68;
        kneeX = hipX + Math.sin(thighAngle) * thighLen;
        kneeY = hipY + Math.cos(thighAngle) * thighLen;

        const kneeBend = lift * 1.15;
        const shinAngle = thighAngle - kneeBend * this.facing;
        footX = kneeX + Math.sin(shinAngle) * shinLen;
        footY = kneeY + Math.cos(shinAngle) * shinLen - lift * 5.5;
      } else {
        // Resting stance
        kneeX = hipX;
        kneeY = hipY + thighLen;
        footX = hipX + (hipX < 0 ? -2 : 2);
        footY = hipY + legLength;
      }

      // Draw leg segments
      ctx.strokeStyle = stickColor;
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Foot / shoe
      ctx.fillStyle = stickColor;
      ctx.beginPath();
      ctx.ellipse(footX + this.facing * 2, footY, 3.8, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw left and right legs
    drawArticulatedLeg(-4, 0);
    drawArticulatedLeg(4, Math.PI);

    // --- TORSO ---
    ctx.strokeStyle = stickColor;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, neckY);
    ctx.stroke();

    // --- ARMS ---
    const shoulderY = neckY + 4;
    let leftHandX = -12, leftHandY = shoulderY + 12;
    let rightHandX = 12, rightHandY = shoulderY + 12;

    if (this.isKO) {
      leftHandX = -18; leftHandY = shoulderY - 8;
      rightHandX = 18; rightHandY = shoulderY - 10;
    } else if (this.isVictoryPose) {
      // Victory celebration: standing still with both hands raised high in the air \o/
      const wave = Math.sin((this.celebrateTime || 0) * 4) * 1.5;
      leftHandX = -14 + wave * 0.3;
      leftHandY = shoulderY - 20 + wave;
      rightHandX = 14 - wave * 0.3;
      rightHandY = shoulderY - 20 - wave;
    } else if (this.punchAnim > 0) {
      const punchReach = 18 + Math.sin(this.punchAnim * Math.PI) * 22;
      if (this.facing > 0) {
        rightHandX = punchReach;
        rightHandY = shoulderY + 2;
        leftHandX = -8;
        leftHandY = shoulderY + 8;
      } else {
        leftHandX = -punchReach;
        leftHandY = shoulderY + 2;
        rightHandX = 8;
        rightHandY = shoulderY + 8;
      }
    } else if (isMoving) {
      const armPhase = this.walkCycle;
      leftHandX = -Math.sin(armPhase) * 11;
      leftHandY = shoulderY + 12;
      rightHandX = Math.sin(armPhase) * 11;
      rightHandY = shoulderY + 12;
    }

    // Back arm
    ctx.strokeStyle = stickColor;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(this.facing > 0 ? leftHandX : rightHandX, this.facing > 0 ? leftHandY : rightHandY);
    ctx.stroke();

    // Front arm
    ctx.beginPath();
    ctx.moveTo(0, shoulderY);
    ctx.lineTo(this.facing > 0 ? rightHandX : leftHandX, this.facing > 0 ? rightHandY : leftHandY);
    ctx.stroke();

    // Active hand coordinates
    const activeHandX = this.facing > 0 ? rightHandX : leftHandX;
    const activeHandY = this.facing > 0 ? rightHandY : leftHandY;

    // Render Hand or Equipped Cartoon Weapon
    if (this.equippedItem) {
      ctx.save();
      ctx.translate(activeHandX, activeHandY);
      ctx.scale(this.facing, 1);

      if (this.equippedItem.type === 'glove') {
        // Giant Puffy Red Boxing Glove
        ctx.fillStyle = '#FF1E56';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(6, -2, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(-2, 4, 10, 5, 2.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(9, -5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.equippedItem.type === 'hammer') {
        // Squeaky Toy Mallet
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(-4, 10);
        ctx.lineTo(8, -12);
        ctx.stroke();

        ctx.fillStyle = '#FFE600';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2.2;
        ctx.translate(8, -12);
        ctx.rotate(0.35);
        ctx.beginPath();
        ctx.roundRect(-12, -7, 24, 14, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(-3, -7, 6, 14);
      } else if (this.equippedItem.type === 'chili') {
        // Spicy Chili Pepper
        ctx.fillStyle = '#FF2200';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(12, 0, 10, 8);
        ctx.quadraticCurveTo(2, 10, -2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00E676';
        ctx.beginPath();
        ctx.arc(0, -7, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (this.equippedItem.type === 'star') {
        // Magic Zap Star Wand
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.lineTo(7, -8);
        ctx.stroke();

        ctx.fillStyle = '#FFE600';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2;
        ctx.translate(7, -8);
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const rOut = 8;
          const rIn = 3.6;
          const a1 = (s * 4 * Math.PI) / 5 - Math.PI / 2;
          const a2 = a1 + (2 * Math.PI) / 10;
          if (s === 0) ctx.moveTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
          else ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
          ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.equippedItem.type === 'laser') {
        // Cyber Laser Blaster in hand
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(0, -5, 14, 7, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(4, -3, 6, 3);

        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 2, 4, 6);
      } else if (this.equippedItem.type === 'missile') {
        // Cartoon Rocket Launcher in hand
        ctx.fillStyle = '#FF3B00';
        ctx.strokeStyle = '#0C0E17';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-4, -6, 16, 8, [0, 2, 2, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFE600';
        ctx.beginPath();
        ctx.moveTo(12, -6);
        ctx.lineTo(18, -2);
        ctx.lineTo(12, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Launcher grip
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-2, 2, 4, 6);
      }
      ctx.restore();
    } else {
      // Standard fist
      const gloveRadius = this.punchAnim > 0 ? 6.5 : 4.5;
      ctx.fillStyle = this.punchAnim > 0 ? accentColor : stickColor;
      ctx.beginPath();
      ctx.arc(activeHandX, activeHandY, gloveRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- HEAD (FLAG CIRCLE) ---
    const headX = 0;
    const headY = neckY - this.headRadius + 2;

    Flags.drawFlagHead(ctx, this.country.id, headX, headY, this.headRadius);

    // Cartoon facial expression (eyes)
    ctx.save();
    if (this.isKO) {
      // X_X eyes for KO
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      const drawX = (cx, cy) => {
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy + 3);
        ctx.moveTo(cx + 3, cy - 3); ctx.lineTo(cx - 3, cy + 3);
        ctx.stroke();
      };
      drawX(headX - 5, headY - 1);
      drawX(headX + 5, headY - 1);
    } else if (isFlashing) {
      // Squinting eyes when hit (> <)
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headX - 7, headY - 3); ctx.lineTo(headX - 4, headY); ctx.lineTo(headX - 7, headY + 3);
      ctx.moveTo(headX + 7, headY - 3); ctx.lineTo(headX + 4, headY); ctx.lineTo(headX + 7, headY + 3);
      ctx.stroke();
    } else {
      // Determined cartoon eyes looking in facing direction
      const eyeOffsetX = this.facing * 3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(headX + eyeOffsetX - 4, headY - 1, 3.2, 0, Math.PI * 2);
      ctx.arc(headX + eyeOffsetX + 4, headY - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(headX + eyeOffsetX - 4 + this.facing * 1.2, headY - 1, 1.6, 0, Math.PI * 2);
      ctx.arc(headX + eyeOffsetX + 4 + this.facing * 1.2, headY - 1, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Floating Weapon / Powerup Badge above Head
    if (this.equippedItem && !this.isKO) {
      ctx.save();
      const badgeY = headY - this.headRadius - 10;
      ctx.fillStyle = 'rgba(12, 14, 23, 0.85)';
      ctx.strokeStyle = this.equippedItem.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-16, badgeY - 7, 32, 14, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.equippedItem.color;
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`★${this.equippedItem.hitsLeft}`, 0, badgeY);
      ctx.restore();
    }

    ctx.restore();
  }

  destroy() {
    if (this.body) {
      this.physics.removeBody(this.body);
      this.body = null;
    }
  }
}
