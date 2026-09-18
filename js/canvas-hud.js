/**
 * Stickman Flag Chaos - Canvas HUD & Overlay Renderer
 * Renders in-engine 4K Fighter HP Cards, Live Standings, Tournament Banner,
 * and Champion Victory Card directly into the HTML5 Canvas context.
 * 
 * Guarantees that video recording captures complete game info at native 4K 60FPS
 * without including the top-bar, and with ZERO changes to game logic/physics.
 */

import { Flags } from './flags.js';
import { CONFIG } from './config.js';

export class CanvasHUD {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.showStandings = true; // Enabled for recordings and live view
    this.pulseTime = 0;
    this.lastGameContext = null;
    this.flagImages = new Map();
    this.interactiveButtons = [];

    this.initFlagImages();

    if (this.renderer?.canvas) {
      this.renderer.canvas.addEventListener('click', (e) => {
        if (!this.lastGameContext) return;
        const rect = this.renderer.canvas.getBoundingClientRect();
        const scaleX = 1280 / rect.width;
        const scaleY = 720 / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        this.handleClick(clickX, clickY, this.lastGameContext);
      });
    }
  }

  update(dt) {
    this.pulseTime += dt;
  }

  /**
   * Handles interactive clicks on canvas HUD elements (e.g. Champion card, intro, stage cleared buttons)
   */
  handleClick(canvasX, canvasY, game) {
    if (!game) return false;

    // Check dynamic interactive canvas buttons first
    if (this.interactiveButtons && this.interactiveButtons.length > 0) {
      for (let i = this.interactiveButtons.length - 1; i >= 0; i--) {
        const btn = this.interactiveButtons[i];
        if (
          canvasX >= btn.x &&
          canvasX <= btn.x + btn.w &&
          canvasY >= btn.y &&
          canvasY <= btn.y + btn.h
        ) {
          if (typeof btn.onClick === 'function') {
            btn.onClick();
            return true;
          }
        }
      }
    }

    const isGameOver = game.state === 'RESULT' || game.winnerDeclared || Boolean(game.winner);
    if (!isGameOver) return false;

    const width = 1280;
    const height = 720;
    const cardW = 280;
    const cardH = 310;
    const cardX = width - cardW - 28;
    const cardY = height / 2 - cardH / 2;

    const btnPlayX = cardX + 18;
    const btnPlayY = cardY + 204;
    const btnPlayW = cardW - 36;
    const btnPlayH = 38;

    if (
      canvasX >= btnPlayX &&
      canvasX <= btnPlayX + btnPlayW &&
      canvasY >= btnPlayY &&
      canvasY <= btnPlayY + btnPlayH
    ) {
      game.restartMatch();
      return true;
    }

    const btnRosterX = cardX + 18;
    const btnRosterY = cardY + 252;
    const btnRosterW = cardW - 36;
    const btnRosterH = 34;

    if (
      canvasX >= btnRosterX &&
      canvasX <= btnRosterX + btnRosterW &&
      canvasY >= btnRosterY &&
      canvasY <= btnRosterY + btnRosterH
    ) {
      game.ui.openSettings();
      return true;
    }

    return false;
  }

  /**
   * Main render method called at the end of Renderer.render()
   */
  render(ctx, width, height, game) {
    if (!this.enabled || !game) return;
    this.lastGameContext = game;

    ctx.save();

    // 1. Tournament Overlays (Intro Showcase, Stage Cleared, Podium, or In-Game Banner)
    if (game.tournament && game.tournament.isActive) {
      if (game.tournament.isShowingIntro) {
        this.drawTournamentIntro(ctx, width, height, game.tournament);
        ctx.restore();
        return;
      }
      if (game.tournament.isShowingStageCleared) {
        this.drawTournamentStageCleared(ctx, width, height, game.tournament);
        ctx.restore();
        return;
      }
      if (game.tournament.isShowingPodiumCountdown || (game.tournament.stageCleared && game.tournament.podiumResults)) {
        this.drawTournamentPodium(ctx, width, height, game.tournament);
        ctx.restore();
        return;
      }
      this.drawTournamentBanner(ctx, width, height, game.tournament);
    }

    // 2. Draw Fighter Health & Status Cards (Corner Docked outside Arena)
    if (game.fighters && game.fighters.length > 0) {
      this.drawFighterCards(ctx, width, height, game);
    }

    // 3. Draw Live Battle Standings Panel (Left Side outside Arena)
    const isStandingsOpenInDOM = game.ui && !game.ui.klasemenPanel?.classList.contains('hidden');
    const isRecording = Boolean(window.canvasRecorder && window.canvasRecorder.state === 'RECORDING');
    
    // Display standings on canvas if toggled open in DOM or if recording with standings enabled
    if ((isStandingsOpenInDOM || (isRecording && this.showStandings)) && game.fighters && game.fighters.length > 1) {
      this.drawStandings(ctx, width, height, game);
    }

    // 4. Draw Champion Victory Card (Right Side outside Arena when match concludes)
    const isGameOver = game.state === 'RESULT' || game.winnerDeclared || Boolean(game.winner);
    if (isGameOver) {
      const champion = game.winner;
      if (champion) {
        this.drawChampionCard(ctx, width, height, champion, game);
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // 1. TOURNAMENT STAGE BANNER
  // ==========================================================================
  drawTournamentBanner(ctx, width, height, tournament) {
    const stage = tournament.stages ? tournament.stages[tournament.currentStageIndex] : null;
    if (!stage) return;

    const title = stage.name ? stage.name.toUpperCase() : 'TOURNAMENT';
    const sub = stage.advancingCount ? `${stage.advancingCount} ADVANCING` : '';

    const text = sub ? `${title}  •  ${sub}` : title;

    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", -apple-system, sans-serif';
    const textMetrics = ctx.measureText(text);
    const bannerWidth = Math.max(220, textMetrics.width + 48);
    const bannerHeight = 28;
    const bannerX = width / 2 - bannerWidth / 2;
    const bannerY = 16;

    // Background pill
    ctx.fillStyle = 'rgba(10, 14, 26, 0.88)';
    ctx.beginPath();
    this.roundRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 14);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Trophy icon / Accent dot
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(bannerX + 16, bannerY + bannerHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bannerX + 28, bannerY + bannerHeight / 2);

    ctx.restore();
  }

  // ==========================================================================
  // 2. FIGHTER HEALTH & STATUS CARDS (4 CORNERS)
  // ==========================================================================
  drawFighterCards(ctx, width, height, game) {
    const fighters = game.fighters;
    const count = fighters.length;

    // For 2 to 4 fighters: place at 4 corners
    // For 5 to 8 fighters: place 2 at each corner
    // Positions: [Top-Left, Top-Right, Bottom-Left, Bottom-Right]
    const cornerSlots = [
      { x: 20, y: 16 },                     // Top-Left
      { x: width - 210, y: 16 },            // Top-Right
      { x: 20, y: height - 76 },            // Bottom-Left
      { x: width - 210, y: height - 76 },   // Bottom-Right
      { x: 230, y: 16 },                    // Top-Left 2
      { x: width - 420, y: 16 },            // Top-Right 2
      { x: 230, y: height - 76 },           // Bottom-Left 2
      { x: width - 420, y: height - 76 },   // Bottom-Right 2
    ];

    const maxCards = Math.min(count, 8);
    for (let i = 0; i < maxCards; i++) {
      const fighter = fighters[i];
      const slot = cornerSlots[i];
      this.drawSingleFighterCard(ctx, slot.x, slot.y, 190, 60, fighter);
    }
  }

  drawSingleFighterCard(ctx, x, y, cardWidth, cardHeight, fighter) {
    const isKO = Boolean(fighter.isKO);
    const hp = Math.max(0, fighter.hp || 0);
    const maxHp = fighter.maxHp || 250;
    const hpRatio = Math.max(0, Math.min(1, hp / maxHp));

    ctx.save();

    // Card background
    ctx.fillStyle = isKO ? 'rgba(15, 18, 28, 0.72)' : 'rgba(10, 14, 26, 0.88)';
    ctx.beginPath();
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = isKO
      ? 'rgba(255, 59, 48, 0.35)'
      : fighter.color || 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isKO ? 1.2 : 1.8;
    ctx.stroke();

    // 1. Country Flag Head (Circular badge)
    const flagRadius = 14;
    const flagCx = x + flagRadius + 10;
    const flagCy = y + flagRadius + 10;

    if (fighter.country) {
      Flags.drawFlagHead(ctx, fighter.country, flagCx, flagCy, flagRadius);
      // Flag border ring
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(flagCx, flagCy, flagRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Fighter Name
    ctx.font = 'bold 12px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = isKO ? '#8E9BAE' : '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const rawName = fighter.name || fighter.country?.name || 'Fighter';
    const displayName = rawName.length > 13 ? rawName.substring(0, 12) + '…' : rawName;
    ctx.fillText(displayName, flagCx + flagRadius + 8, y + 8);

    // 3. Status Badge
    let badgeText = 'READY';
    let badgeBg = 'rgba(0, 229, 255, 0.2)';
    let badgeColor = '#00E5FF';

    if (isKO) {
      badgeText = 'KO';
      badgeBg = 'rgba(255, 59, 48, 0.25)';
      badgeColor = '#FF3B30';
    } else if (fighter.state === 'ATTACK' || fighter.state === 'HIT' || fighter.isPunching || fighter.isKicking) {
      badgeText = 'FIGHTING';
      badgeBg = 'rgba(52, 199, 89, 0.25)';
      badgeColor = '#34C759';
    }

    ctx.font = 'bold 8.5px "Segoe UI", sans-serif';
    const badgeMetrics = ctx.measureText(badgeText);
    const badgeW = badgeMetrics.width + 10;
    const badgeH = 14;
    const badgeX = flagCx + flagRadius + 8;
    const badgeY = y + 24;

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();

    ctx.fillStyle = badgeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

    // 4. HP Bar Track
    const barX = x + 10;
    const barY = y + cardHeight - 16;
    const barW = cardWidth - 20;
    const barH = 7;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, barW, barH, 3.5);
    ctx.fill();

    // 5. HP Bar Fill with dynamic color
    if (hpRatio > 0) {
      const fillW = Math.max(4, barW * hpRatio);
      let hpColor = '#34C759'; // Green (> 50%)
      if (hpRatio <= 0.25) hpColor = '#FF3B30'; // Red
      else if (hpRatio <= 0.5) hpColor = '#FFCC00'; // Yellow

      ctx.fillStyle = hpColor;
      ctx.beginPath();
      this.roundRect(ctx, barX, barY, fillW, barH, 3.5);
      ctx.fill();
    }

    // 6. Numeric HP Text (e.g. 250 / 250)
    ctx.font = 'bold 9.5px "Courier New", monospace';
    ctx.fillStyle = isKO ? '#718096' : '#CBD5E1';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.ceil(hp)} / ${maxHp}`, x + cardWidth - 10, barY - 2);

    ctx.restore();
  }

  // ==========================================================================
  // 3. LIVE STANDINGS (KLASEMEN) PANEL
  // ==========================================================================
  drawStandings(ctx, width, height, game) {
    const fighters = [...game.fighters];
    // Sort: Alive fighters first by HP desc, then KO fighters by eliminationOrder desc
    fighters.sort((a, b) => {
      if (!a.isKO && b.isKO) return -1;
      if (a.isKO && !b.isKO) return 1;
      if (!a.isKO && !b.isKO) return (b.hp || 0) - (a.hp || 0);
      return (b.eliminationOrder || 0) - (a.eliminationOrder || 0);
    });

    const displayCount = Math.min(fighters.length, 8);
    const panelX = 20;
    const panelY = 90;
    const panelW = 230;
    const rowH = 26;
    const headerH = 34;
    const panelH = headerH + displayCount * rowH + 10;

    ctx.save();

    // Backdrop shadow and panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header bar
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, headerH, [12, 12, 0, 0]);
    ctx.fill();

    // Header Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#00E5FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊  STANDINGS', panelX + 12, panelY + headerH / 2);

    // Alive Count Badge
    const aliveCount = fighters.filter((f) => !f.isKO).length;
    const aliveBadgeText = `${aliveCount} ALIVE`;
    ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(52, 199, 89, 0.25)';
    const badgeW = 56;
    const badgeX = panelX + panelW - badgeW - 10;
    const badgeY = panelY + headerH / 2 - 8;
    ctx.beginPath();
    this.roundRect(ctx, badgeX, badgeY, badgeW, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#34C759';
    ctx.textAlign = 'center';
    ctx.fillText(aliveBadgeText, badgeX + badgeW / 2, badgeY + 8);

    // Render Rows
    for (let i = 0; i < displayCount; i++) {
      const f = fighters[i];
      const rowY = panelY + headerH + 6 + i * rowH;
      const isKO = Boolean(f.isKO);

      // Rank number
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = i === 0 ? '#FFD700' : isKO ? '#64748B' : '#E2E8F0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${i + 1}`, panelX + 10, rowY + rowH / 2);

      // Flag icon
      const flagR = 7.5;
      const flagCx = panelX + 38;
      const flagCy = rowY + rowH / 2;
      if (f.country) {
        Flags.drawFlagHead(ctx, f.country, flagCx, flagCy, flagR);
      }

      // Fighter Name
      ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
      ctx.fillStyle = isKO ? '#64748B' : '#F8FAFC';
      const rawName = f.name || f.country?.name || 'Fighter';
      const name = rawName.length > 10 ? rawName.substring(0, 9) + '…' : rawName;
      ctx.fillText(name, flagCx + flagR + 8, rowY + rowH / 2);

      // Mini HP bar or Status
      if (isKO) {
        ctx.font = 'bold 9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FF3B30';
        ctx.textAlign = 'right';
        ctx.fillText('KO', panelX + panelW - 12, rowY + rowH / 2);
      } else {
        const miniBarW = 40;
        const miniBarH = 5;
        const miniBarX = panelX + panelW - miniBarW - 12;
        const miniBarY = rowY + rowH / 2 - miniBarH / 2;
        const ratio = Math.max(0, Math.min(1, (f.hp || 0) / (f.maxHp || 250)));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        this.roundRect(ctx, miniBarX, miniBarY, miniBarW, miniBarH, 2.5);
        ctx.fill();

        ctx.fillStyle = ratio > 0.5 ? '#34C759' : ratio > 0.25 ? '#FFCC00' : '#FF3B30';
        ctx.beginPath();
        this.roundRect(ctx, miniBarX, miniBarY, Math.max(2, miniBarW * ratio), miniBarH, 2.5);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // 4. CHAMPION VICTORY CARD (MATCH & TOURNAMENT WINNER)
  // ==========================================================================
  drawChampionCard(ctx, width, height, champion, game) {
    // Docked on the right side outside the center arena (matching user's screenshot layout)
    const cardW = 280;
    const cardH = 310;
    const cardX = width - cardW - 28;
    const cardY = height / 2 - cardH / 2;

    ctx.save();

    // 1. Card Background with dark glassmorphism
    ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    // 2. Shiny Gold Border with subtle pulsing glow
    const glowAlpha = 0.5 + Math.sin(this.pulseTime * 4) * 0.25;
    ctx.shadowColor = `rgba(255, 215, 0, ${glowAlpha})`;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // 3. Golden Trophy 🏆 Icon
    const trophyCx = cardX + cardW / 2;
    const trophyY = cardY + 24;
    this.drawTrophyIcon(ctx, trophyCx, trophyY, 20);

    // 4. "CHAMPION!" Title in radiant gold
    ctx.font = '900 22px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CHAMPION!', trophyCx, cardY + 52);

    // 5. Large Country Flag of Winner
    const flagRadius = 26;
    const flagCy = cardY + 114;
    if (champion.country) {
      Flags.drawFlagHead(ctx, champion.country, trophyCx, flagCy, flagRadius);
      // Gold circular ring around flag
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(trophyCx, flagCy, flagRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Winner's Country Name in large bold typography
    const countryName = (champion.country?.name || champion.name || 'CHAMPION').toUpperCase();
    ctx.font = '900 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(countryName, trophyCx, cardY + 148);

    // 7. Stats Subtitle
    const kills = champion.kills || 0;
    const finalHp = Math.max(0, Math.ceil(champion.hp || 0));
    const subtitle = `SURVIVOR  •  ${kills} KILLS  •  ${finalHp} HP`;

    ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(subtitle, trophyCx, cardY + 174);

    // 8. Action Buttons (Rendered in Canvas for video recording)
    // 8a. "PLAY AGAIN" Button (Cyan)
    const btnPlayX = cardX + 18;
    const btnPlayY = cardY + 204;
    const btnPlayW = cardW - 36;
    const btnPlayH = 38;

    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    this.roundRect(ctx, btnPlayX, btnPlayY, btnPlayW, btnPlayH, 8);
    ctx.fill();

    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#0A0E1A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY AGAIN', btnPlayX + btnPlayW / 2, btnPlayY + btnPlayH / 2);

    // 8b. "ROSTER / SETTINGS" Button (Dark Glass)
    const btnRosterX = cardX + 18;
    const btnRosterY = cardY + 252;
    const btnRosterW = cardW - 36;
    const btnRosterH = 34;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    this.roundRect(ctx, btnRosterX, btnRosterY, btnRosterW, btnRosterH, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROSTER / SETTINGS', btnRosterX + btnRosterW / 2, btnRosterY + btnRosterH / 2);

    ctx.restore();
  }

  /**
   * Vector trophy drawer for Champion Card
   */
  drawTrophyIcon(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#FFE600';
    ctx.strokeStyle = '#FFE600';
    ctx.lineWidth = 2;

    // Cup body
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.6, cy - size * 0.4);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.4);
    ctx.quadraticCurveTo(cx + size * 0.6, cy + size * 0.3, cx, cy + size * 0.5);
    ctx.quadraticCurveTo(cx - size * 0.6, cy + size * 0.3, cx - size * 0.6, cy - size * 0.4);
    ctx.fill();

    // Cup stem & base
    ctx.fillRect(cx - size * 0.12, cy + size * 0.5, size * 0.24, size * 0.3);
    ctx.fillRect(cx - size * 0.45, cy + size * 0.8, size * 0.9, size * 0.18);

    // Handles
    ctx.beginPath();
    ctx.arc(cx - size * 0.65, cy - size * 0.1, size * 0.28, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + size * 0.65, cy - size * 0.1, size * 0.28, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Cross-browser rounded rectangle helper
   */
  roundRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = typeof radius === 'number' ? radius : 8;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Pre-renders / caches vector SVG flags as HTMLImageElements for fast, 60 FPS rectangular canvas drawing
   */
  initFlagImages() {
    if (typeof Flags !== 'undefined' && typeof Flags.getFlagSvg === 'function' && typeof CONFIG !== 'undefined' && Array.isArray(CONFIG.COUNTRIES)) {
      for (const country of CONFIG.COUNTRIES) {
        try {
          const svg = Flags.getFlagSvg(country.id);
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.src = url;
          this.flagImages.set(country.id, img);
        } catch (e) {
          // Will safely fallback to Flags.drawFlagHead
        }
      }
    }
  }

  /**
   * Draws a rectangular country flag with rounded corners and border.
   * Uses cached SVG image if available, otherwise falls back to vector circular flag head.
   */
  drawFlag(ctx, country, x, y, w, h, radius = 2.5) {
    if (!country) return;
    const img = this.flagImages.get(country.id);
    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.save();
      this.roundRect(ctx, x, y, w, h, radius);
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, x, y, w, h, radius);
      ctx.stroke();
      ctx.restore();
    } else {
      Flags.drawFlagHead(ctx, country, x + w / 2, y + h / 2, Math.min(w, h) / 2);
    }
  }

  /**
   * Truncates text with ellipsis if it exceeds maxWidth in the current canvas context
   */
  truncateText(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  }

  // ==========================================================================
  // 5. TOURNAMENT INTRO SHOWCASE (ROUND TITLE, CONDITIONS, & PARTICIPANTS GRID)
  // ==========================================================================
  drawTournamentIntro(ctx, width, height, tournament) {
    this.interactiveButtons = [];
    const cardW = 1060;
    const cardH = 650;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.save();

    // 1. Semi-transparent dark card background
    ctx.fillStyle = 'rgba(12, 16, 28, 0.96)';
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    // 2. Glowing Gold Border
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Header Row
    const stage = (tournament.stages && tournament.stages[tournament.currentStageIndex]) || {
      name: 'Round of 32',
      desc: '32 Countries Battling • Top 16 Advance to Round of 16!',
    };

    // Trophy Box on left
    const boxX = cardX + 24;
    const boxY = cardY + 18;
    const boxSize = 44;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    this.roundRect(ctx, boxX, boxY, boxSize, boxSize, 10);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.drawTrophyIcon(ctx, boxX + boxSize / 2, boxY + boxSize / 2, 16);

    // Title & Subtitle
    ctx.font = '900 24px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((stage.name || 'STAGE').toUpperCase(), boxX + boxSize + 14, cardY + 31);

    ctx.font = '600 12.5px "Segoe UI", sans-serif';
    ctx.fillStyle = '#A0AEC0';
    ctx.fillText(stage.desc || 'Countries Clashing for Championship!', boxX + boxSize + 14, cardY + 51);

    // Exit (X) Button on top-right
    const exitW = 30;
    const exitH = 30;
    const exitX = cardX + cardW - 24 - exitW;
    const exitY = cardY + 22;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    this.roundRect(ctx, exitX, exitY, exitW, exitH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#A0AEC0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(exitX + 8, exitY + 8);
    ctx.lineTo(exitX + exitW - 8, exitY + exitH - 8);
    ctx.moveTo(exitX + exitW - 8, exitY + 8);
    ctx.lineTo(exitX + 8, exitY + exitH - 8);
    ctx.stroke();

    this.interactiveButtons.push({
      x: exitX,
      y: exitY,
      w: exitW,
      h: exitH,
      onClick: () => tournament.exitTournament(),
    });

    // 4. 10-Second Countdown Strip
    const stripX = cardX + 24;
    const stripY = cardY + 74;
    const stripW = cardW - 48;
    const stripH = 56;

    const stripGrad = ctx.createLinearGradient(stripX, stripY, stripX + stripW, stripY + stripH);
    stripGrad.addColorStop(0, 'rgba(255, 215, 0, 0.12)');
    stripGrad.addColorStop(1, 'rgba(0, 240, 255, 0.08)');
    ctx.fillStyle = stripGrad;
    ctx.beginPath();
    this.roundRect(ctx, stripX, stripY, stripW, stripH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Circular Timer Badge
    const timerCx = stripX + 34;
    const timerCy = stripY + stripH / 2;
    const timerR = 21;

    ctx.fillStyle = 'rgba(10, 12, 22, 0.85)';
    ctx.beginPath();
    ctx.arc(timerCx, timerCy, timerR, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.4 + Math.sin(this.pulseTime * 5) * 0.25;
    ctx.shadowColor = `rgba(255, 215, 0, ${pulse})`;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const secLeft = Math.max(0, Math.ceil(tournament.introSecondsLeft || 0));
    ctx.font = '900 18px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(secLeft, timerCx, timerCy - 3);

    ctx.font = '800 7px "Segoe UI", sans-serif';
    ctx.fillStyle = '#A0AEC0';
    ctx.fillText('SEC', timerCx, timerCy + 10);

    // Text next to timer
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Participating Countries Showcase', timerCx + timerR + 14, timerCy - 8);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#A0AEC0';
    ctx.fillText('Battle will start automatically when timer reaches zero...', timerCx + timerR + 14, timerCy + 10);

    // START BATTLE NOW Button
    const btnW = 184;
    const btnH = 38;
    const btnX = stripX + stripW - btnW - 10;
    const btnY = stripY + (stripH - btnH) / 2;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#00FF87');
    btnGrad.addColorStop(1, '#60EFFF');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    ctx.font = '900 12.5px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#0C1220';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START BATTLE NOW', btnX + (btnW - 14) / 2, btnY + btnH / 2);

    // Play triangle icon
    const triX = btnX + btnW - 20;
    const triY = btnY + btnH / 2;
    ctx.beginPath();
    ctx.moveTo(triX - 6, triY - 6);
    ctx.lineTo(triX + 4, triY);
    ctx.lineTo(triX - 6, triY + 6);
    ctx.closePath();
    ctx.fill();

    this.interactiveButtons.push({
      x: btnX,
      y: btnY,
      w: btnW,
      h: btnH,
      onClick: () => tournament.skipIntro(),
    });

    // 5. Stage Arena & Weather Conditions Box
    const condX = cardX + 24;
    const condY = cardY + 140;
    const condW = cardW - 48;
    const condH = 58;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.7)';
    ctx.beginPath();
    this.roundRect(ctx, condX, condY, condW, condH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('STAGE ARENA & WEATHER CONDITIONS (RANDOMIZED):', condX + 14, condY + 9);

    // Badges Row
    const cond = tournament.stageConditions || {};
    const condPills = [
      { label: 'Ring:', val: cond.arenaShapeName || 'Octagon Ring' },
      { label: 'Theme:', val: cond.themeName || 'Cyber Neon' },
      { label: 'Obstacle:', val: cond.obstacleName || 'None' },
      { label: 'Gravity:', val: cond.gravityName || 'Normal' },
      { label: 'Weather:', val: cond.weatherName || 'Clear Sky' },
      { label: 'Wind:', val: cond.windName || 'GENTLE' },
    ];

    let pillX = condX + 12;
    const pillY = condY + 26;
    const pillH = 22;

    for (const cp of condPills) {
      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      const labelW = ctx.measureText(cp.label).width;
      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      const valW = ctx.measureText(cp.val).width;
      const pillW = labelW + valW + 16;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      this.roundRect(ctx, pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      ctx.fillStyle = '#8B95B2';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cp.label, pillX + 6, pillY + pillH / 2);

      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      ctx.fillStyle = '#00F0FF';
      ctx.fillText(cp.val, pillX + 6 + labelW + 4, pillY + pillH / 2);

      pillX += pillW + 8;
    }

    // 6. Participating Countries Grid
    const countries = tournament.currentPool || [];
    ctx.font = '900 12.5px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`PARTICIPATING COUNTRIES (${countries.length}):`, cardX + 24, cardY + 210);

    const gridX = cardX + 24;
    const gridY = cardY + 230;
    const gridW = cardW - 48;
    const gridH = cardH - 245;

    const count = countries.length;
    let cols = 4;
    if (count > 32) cols = 6;
    else if (count <= 8) cols = 4;

    const rows = Math.ceil(count / cols);
    const gapX = cols === 6 ? 8 : 10;
    const gapY = cols === 6 ? 5 : 6;
    const colW = (gridW - (cols - 1) * gapX) / cols;
    const maxRowH = (gridH - (rows - 1) * gapY) / rows;
    const rowH = Math.min(cols === 6 ? 26 : 32, maxRowH);

    for (let i = 0; i < count; i++) {
      const c = countries[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = gridX + col * (colW + gapX);
      const py = gridY + row * (rowH + gapY);

      // Card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      this.roundRect(ctx, px, py, colW, rowH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Flag
      const flagW = Math.round(rowH * 0.72 * 1.4);
      const flagH = Math.round(flagW / 1.45);
      const fx = px + 6;
      const fy = py + (rowH - flagH) / 2;
      this.drawFlag(ctx, c, fx, fy, flagW, flagH, 2.5);

      // Name
      const nameX = fx + flagW + 8;
      const maxNameW = colW - (flagW + 28);
      ctx.font = `bold ${cols === 6 ? '10px' : '11.5px'} "Segoe UI", sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const nameStr = this.truncateText(ctx, c.name || 'Country', maxNameW);
      ctx.fillText(nameStr, nameX, py + rowH / 2);

      // Status Dot
      const dotCx = px + colW - 10;
      const dotCy = py + rowH / 2;
      ctx.fillStyle = c.bodyColor || c.primaryColor || '#00FF87';
      ctx.beginPath();
      ctx.arc(dotCx, dotCy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================================================
  // 6. TOURNAMENT STAGE CLEARED (QUALIFIERS VS ELIMINATED RESULTS)
  // ==========================================================================
  drawTournamentStageCleared(ctx, width, height, tournament) {
    this.interactiveButtons = [];
    const cardW = 980;
    const cardH = 580;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.save();

    // 1. Semi-transparent dark card background
    ctx.fillStyle = 'rgba(14, 20, 36, 0.96)';
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    // 2. Glowing Green Border
    ctx.shadowColor = 'rgba(0, 255, 135, 0.35)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#00FF87';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Header Row
    const stage = (tournament.stages && tournament.stages[tournament.currentStageIndex]) || { name: 'Round' };
    const nextStage = tournament.stages && tournament.stages[tournament.currentStageIndex + 1];
    const qualifiers = tournament.stageQualifiers || [];
    const eliminated = tournament.stageEliminated || [];

    // Checkmark Box on left
    const boxX = cardX + 24;
    const boxY = cardY + 20;
    const boxSize = 44;
    ctx.fillStyle = 'rgba(0, 255, 135, 0.15)';
    ctx.beginPath();
    this.roundRect(ctx, boxX, boxY, boxSize, boxSize, 10);
    ctx.fill();
    ctx.strokeStyle = '#00FF87';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Checkmark SVG vector
    ctx.strokeStyle = '#00FF87';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(boxX + 12, boxY + 22);
    ctx.lineTo(boxX + 20, boxY + 30);
    ctx.lineTo(boxX + 32, boxY + 14);
    ctx.stroke();

    // Title & Subtitle
    ctx.font = '900 24px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#00FF87';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(stage.name || 'STAGE').toUpperCase()} COMPLETE!`, boxX + boxSize + 14, cardY + 32);

    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#A0AEC0';
    const nextName = nextStage ? nextStage.name : 'Grand Finals';
    ctx.fillText(`${qualifiers.length} Countries Qualified for ${nextName}!`, boxX + boxSize + 14, cardY + 54);

    // 4. Two Columns: Qualifiers vs Eliminated
    const colPad = 24;
    const midGap = 16;
    const colW = (cardW - colPad * 2 - midGap) / 2;
    const colH = cardH - 160;
    const topY = cardY + 80;

    // Left Column: Qualifiers
    const qColX = cardX + colPad;
    ctx.fillStyle = 'rgba(10, 14, 24, 0.6)';
    ctx.beginPath();
    this.roundRect(ctx, qColX, topY, colW, colH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 135, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#00FF87';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('✓  QUALIFIED FOR NEXT ROUND', qColX + 14, topY + 12);

    // Right Column: Eliminated
    const eColX = qColX + colW + midGap;
    ctx.fillStyle = 'rgba(10, 14, 24, 0.6)';
    ctx.beginPath();
    this.roundRect(ctx, eColX, topY, colW, colH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 46, 147, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FF2E93';
    ctx.fillText('✕  ELIMINATED', eColX + 14, topY + 12);

    // Render Qualifiers Grid inside Left Column
    const qGridY = topY + 36;
    const qGridH = colH - 46;
    const qCols = qualifiers.length > 16 ? 3 : 2;
    const qRows = Math.ceil(qualifiers.length / qCols);
    const qItemW = (colW - 24 - (qCols - 1) * 8) / qCols;
    const qItemH = Math.min(28, (qGridH - (qRows - 1) * 6) / Math.max(1, qRows));

    for (let i = 0; i < qualifiers.length; i++) {
      const c = qualifiers[i];
      const col = i % qCols;
      const row = Math.floor(i / qCols);
      const ix = qColX + 12 + col * (qItemW + 8);
      const iy = qGridY + row * (qItemH + 6);

      ctx.fillStyle = 'rgba(0, 255, 135, 0.08)';
      ctx.beginPath();
      this.roundRect(ctx, ix, iy, qItemW, qItemH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 135, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const fW = Math.round(qItemH * 0.7 * 1.4);
      const fH = Math.round(fW / 1.45);
      this.drawFlag(ctx, c, ix + 5, iy + (qItemH - fH) / 2, fW, fH, 2);

      ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxW = qItemW - fW - 14;
      ctx.fillText(this.truncateText(ctx, c.name, maxW), ix + fW + 9, iy + qItemH / 2);
    }

    // Render Eliminated Grid inside Right Column
    const eGridY = topY + 36;
    const eGridH = colH - 46;
    const eCols = eliminated.length > 16 ? 3 : 2;
    const eRows = Math.ceil(eliminated.length / eCols);
    const eItemW = (colW - 24 - (eCols - 1) * 8) / eCols;
    const eItemH = Math.min(28, (eGridH - (eRows - 1) * 6) / Math.max(1, eRows));

    for (let i = 0; i < eliminated.length; i++) {
      const c = eliminated[i];
      const col = i % eCols;
      const row = Math.floor(i / eCols);
      const ix = eColX + 12 + col * (eItemW + 8);
      const iy = eGridY + row * (eItemH + 6);

      ctx.fillStyle = 'rgba(255, 46, 147, 0.05)';
      ctx.beginPath();
      this.roundRect(ctx, ix, iy, eItemW, eItemH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 46, 147, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const fW = Math.round(eItemH * 0.7 * 1.4);
      const fH = Math.round(fW / 1.45);
      this.drawFlag(ctx, c, ix + 5, iy + (eItemH - fH) / 2, fW, fH, 2);

      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#8B95B2';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxW = eItemW - fW - 14;
      ctx.fillText(this.truncateText(ctx, c.name, maxW), ix + fW + 9, iy + eItemH / 2);
    }

    // 5. Bottom Bar
    const bBarY = cardY + cardH - 58;
    const secLeft = Math.max(0, Math.ceil(tournament.transitionSecondsLeft || 0));

    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Advancing to ${nextName} in ${secLeft} seconds...`, cardX + 24, bBarY + 18);

    const btnW = 210;
    const btnH = 38;
    const btnX = cardX + cardW - 24 - btnW;
    const btnY = bBarY;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#00FF87');
    btnGrad.addColorStop(1, '#60EFFF');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    ctx.font = '900 12.5px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#0C1220';
    ctx.textAlign = 'center';
    ctx.fillText('ADVANCE TO NEXT ROUND', btnX + btnW / 2, btnY + btnH / 2);

    this.interactiveButtons.push({
      x: btnX,
      y: btnY,
      w: btnW,
      h: btnH,
      onClick: () => tournament.advanceToNextStage(),
    });

    ctx.restore();
  }

  // ==========================================================================
  // 7. TOURNAMENT GRAND FINALE PODIUM (CHAMPION RECOGNITION)
  // ==========================================================================
  drawTournamentPodium(ctx, width, height, tournament) {
    this.interactiveButtons = [];
    const cardW = 680;
    const cardH = 500;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.save();

    // 1. Radial Card Background
    ctx.fillStyle = 'rgba(14, 18, 32, 0.98)';
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    // 2. Glowing Gold Border
    const glow = 0.5 + Math.sin(this.pulseTime * 4) * 0.25;
    ctx.shadowColor = `rgba(255, 215, 0, ${glow})`;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Floating Trophy Halo
    const trophyCx = cardX + cardW / 2;
    const trophyY = cardY + 45;
    this.drawTrophyIcon(ctx, trophyCx, trophyY, 32);

    // 4. Title
    ctx.font = '900 24px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TOURNAMENT CHAMPION!', trophyCx, cardY + 95);

    // 5. Winner Flag & Name
    const results = tournament.podiumResults || [];
    const champion = results[0] || null;

    if (champion) {
      const country = champion.country || champion;
      const flagW = 90;
      const flagH = 60;
      const fx = trophyCx - flagW / 2;
      const fy = cardY + 140;

      this.drawFlag(ctx, country, fx, fy, flagW, flagH, 6);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      this.roundRect(ctx, fx, fy, flagW, flagH, 6);
      ctx.stroke();

      const champName = (country.name || 'CHAMPION').toUpperCase();
      ctx.font = '900 28px Impact, "Arial Black", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(champName, trophyCx, cardY + 215);

      // Crown badge
      const badgeText = 'TOURNAMENT CHAMPION';
      ctx.font = '900 13px Impact, sans-serif';
      const bW = ctx.measureText(badgeText).width + 32;
      const bH = 28;
      const bX = trophyCx - bW / 2;
      const bY = cardY + 260;

      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.beginPath();
      this.roundRect(ctx, bX, bY, bW, bH, 14);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, trophyCx, bY + bH / 2);

      // Congratulatory subtext
      ctx.font = '600 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('Congratulations! Conquered all obstacles and defeated 64 competing nations!', trophyCx, cardY + 315);
    }

    // 6. Action Button
    const btnW = 200;
    const btnH = 42;
    const btnX = trophyCx - btnW / 2;
    const btnY = cardY + cardH - 70;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#00FF87');
    btnGrad.addColorStop(1, '#60EFFF');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    ctx.font = '900 14px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#0C1220';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY AGAIN', trophyCx, btnY + btnH / 2);

    this.interactiveButtons.push({
      x: btnX,
      y: btnY,
      w: btnW,
      h: btnH,
      onClick: () => {
        if (tournament.isShowingPodiumCountdown && tournament.completedTournaments < tournament.totalTournaments) {
          tournament.skipPodiumTimerAndStartNext();
        } else {
          tournament.exitTournament();
        }
      },
    });

    ctx.restore();
  }
}
