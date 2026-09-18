/**
 * Stickman Flag Chaos - Canvas HUD & Overlay Renderer
 * Renders in-engine 4K Fighter HP Cards, Live Standings, Tournament Banner,
 * and Champion Victory Card directly into the HTML5 Canvas context.
 * 
 * Guarantees that video recording captures complete game info at native 4K 60FPS
 * without including the top-bar, and with ZERO changes to game logic/physics.
 */

import { Flags } from './flags.js';

export class CanvasHUD {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.showStandings = true; // Enabled for recordings and live view
    this.pulseTime = 0;
    this.lastGameContext = null;

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
   * Handles interactive clicks on canvas HUD elements (e.g. Champion card buttons)
   */
  handleClick(canvasX, canvasY, game) {
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

    // 1. Draw In-Game Tournament Phase Banner (Top Center)
    if (game.tournament && game.tournament.isActive) {
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

    // 4. Draw Champion Victory Card (Right Side outside Arena when match/tournament concludes)
    const isGameOver = game.state === 'RESULT' || game.winnerDeclared || Boolean(game.winner);
    const isPodium = Boolean(game.tournament?.isActive && game.tournament?.podiumResults);

    if (isGameOver || isPodium) {
      const champion = game.winner || (game.tournament?.podiumResults ? game.tournament.podiumResults[0] : null);
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
}
