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

    // In-Engine Canvas Announcer State (Countdown 3-2-1, Weather Alerts)
    this.announcer = {
      text: '',
      subText: '',
      type: 'none', // 'countdown', 'fight', 'nature'
      country: null,
      timer: 0,
      duration: 0.8,
    };

    // In-Engine Elimination Feed (Transparent, Snappy ~1.1s, Multi-Out Stacking)
    this.eliminationFeed = [];

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
    if (this.announcer && this.announcer.timer > 0) {
      this.announcer.timer -= dt;
      if (this.announcer.timer <= 0) {
        this.announcer.type = 'none';
        this.announcer.text = '';
        this.announcer.country = null;
      }
    }

    if (this.eliminationFeed && this.eliminationFeed.length > 0) {
      for (let i = this.eliminationFeed.length - 1; i >= 0; i--) {
        const item = this.eliminationFeed[i];
        item.timer -= dt;
        if (item.timer <= 0) {
          this.eliminationFeed.splice(i, 1);
        }
      }
    }
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

    // 2. Fighter Health & Status Cards removed per user preference (Standings panel handles all fighters cleanly)

    // 3. Draw Live Battle Standings Panel (Left Side outside Arena)
    if (this.showStandings && game.fighters && game.fighters.length > 1) {
      this.drawStandings(ctx, width, height, game);
    }

    // 4. Draw Right Side Panel (Stage Mission & Elimination Feed during battle) or Champion Card (when match concludes)
    const isGameOver = game.state === 'RESULT' || game.winnerDeclared || Boolean(game.winner);
    if (isGameOver) {
      const champion = game.winner;
      if (champion) {
        this.drawChampionCard(ctx, width, height, champion, game);
      }
    } else if (game.fighters && game.fighters.length > 1) {
      this.drawRightPanel(ctx, width, height, game);
    }

    // 5. Draw In-Engine Announcer (Countdown 3-2-1-FIGHT!, Country Out, KO, Weather Shifts)
    this.drawAnnouncer(ctx, width, height, game);

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

    // Active weather condition badge for tournament
    const weatherType = tournament.stageConditions?.weatherType || tournament.game?.weather?.type || 'none';
    let weatherText = '☀️ CLEAR';
    let weatherColor = '#94A3B8';
    let weatherBg = 'rgba(148, 163, 184, 0.18)';
    let weatherBorder = 'rgba(148, 163, 184, 0.4)';
    switch (weatherType) {
      case 'rain':
        weatherText = '🌧️ RAIN';
        weatherColor = '#38BDF8';
        weatherBg = 'rgba(56, 189, 248, 0.22)';
        weatherBorder = 'rgba(56, 189, 248, 0.55)';
        break;
      case 'wind':
        const wStr = tournament.stageConditions?.windStrength ? ` - ${tournament.stageConditions.windStrength.toUpperCase()}` : '';
        weatherText = `💨 WIND${wStr}`;
        weatherColor = '#2DD4BF';
        weatherBg = 'rgba(45, 212, 191, 0.22)';
        weatherBorder = 'rgba(45, 212, 191, 0.55)';
        break;
      case 'lightning':
        weatherText = '⚡ THUNDER';
        weatherColor = '#FBBF24';
        weatherBg = 'rgba(251, 191, 36, 0.22)';
        weatherBorder = 'rgba(251, 191, 36, 0.55)';
        break;
      case 'chaos':
        weatherText = '🌀 CHAOS';
        weatherColor = '#F472B6';
        weatherBg = 'rgba(244, 114, 182, 0.22)';
        weatherBorder = 'rgba(244, 114, 182, 0.55)';
        break;
      default:
        weatherText = '☀️ CLEAR';
        weatherColor = '#94A3B8';
        weatherBg = 'rgba(148, 163, 184, 0.18)';
        weatherBorder = 'rgba(148, 163, 184, 0.4)';
        break;
    }

    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", -apple-system, sans-serif';
    const textMetrics = ctx.measureText(text);

    ctx.font = 'bold 11px "Segoe UI", -apple-system, sans-serif';
    const weatherMetrics = ctx.measureText(weatherText);
    const weatherPillW = weatherMetrics.width + 16;
    const weatherPillH = 20;

    const bannerWidth = Math.max(260, textMetrics.width + weatherPillW + 54);
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

    // Stage Text
    ctx.font = 'bold 13px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bannerX + 28, bannerY + bannerHeight / 2);

    // Weather Pill Badge on right side of banner
    const pillX = bannerX + bannerWidth - weatherPillW - 8;
    const pillY = bannerY + (bannerHeight - weatherPillH) / 2;

    ctx.fillStyle = weatherBg;
    ctx.beginPath();
    this.roundRect(ctx, pillX, pillY, weatherPillW, weatherPillH, 10);
    ctx.fill();

    ctx.strokeStyle = weatherBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = 'bold 11px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = weatherColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(weatherText, pillX + weatherPillW / 2, pillY + weatherPillH / 2);

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
    // 1. Obtain full standings grouped by country
    let list = game.getStandings ? game.getStandings() : [];
    if (!list || list.length === 0) {
      // Fallback to fighters if getStandings is empty
      const fighters = [...game.fighters];
      fighters.sort((a, b) => {
        if (!a.isKO && b.isKO) return -1;
        if (a.isKO && !b.isKO) return 1;
        if (!a.isKO && !b.isKO) return (b.hp || 0) - (a.hp || 0);
        return (b.eliminationOrder || 0) - (a.eliminationOrder || 0);
      });
      list = fighters.map((f) => ({
        country: f.country,
        name: f.name || f.country?.name,
        isAlive: !f.isKO,
        totalHp: f.hp || 0,
        maxHp: f.maxHp || 250,
        hpPercent: f.maxHp > 0 ? ((f.hp || 0) / f.maxHp) * 100 : 0,
      }));
    }

    const total = list.length;
    if (total === 0) return;

    // 2. Count alive countries
    const aliveCount = list.filter((item) => item.isAlive).length;

    // 3. Adaptive multi-column sizing to fit all countries cleanly
    let numCols = 1;
    let rowsPerCol = total;
    let colW = 230;
    let rowH = 24;
    let panelW = 244;
    const headerH = 32;

    if (total <= 10) {
      numCols = 1;
      rowsPerCol = total;
      colW = 230;
      rowH = 24;
      panelW = 244;
    } else if (total <= 18) {
      numCols = 1;
      rowsPerCol = total;
      colW = 230;
      rowH = 20;
      panelW = 244;
    } else if (total <= 32) {
      numCols = 2;
      rowsPerCol = Math.ceil(total / 2);
      colW = 126;
      rowH = 18.5;
      panelW = colW * 2 + 18; // 270px
    } else {
      // 33 to 64 countries (e.g. Round of 64)
      numCols = 2;
      rowsPerCol = Math.ceil(total / 2); // 32 rows
      colW = 128;
      rowH = 17.5;
      panelW = colW * 2 + 18; // 274px
    }

    const panelX = 14;
    const panelH = headerH + rowsPerCol * rowH + 8;
    // Keep panel comfortably positioned within vertical bounds
    const panelY = Math.max(52, Math.min(68, (height - panelH) / 2));

    ctx.save();

    // Backdrop shadow and panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
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
    const aliveBadgeText = `${aliveCount}/${total} ALIVE`;
    ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
    ctx.fillStyle = aliveCount > 0 ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 59, 48, 0.25)';
    const badgeW = Math.max(68, ctx.measureText(aliveBadgeText).width + 14);
    const badgeX = panelX + panelW - badgeW - 8;
    const badgeY = panelY + headerH / 2 - 9;
    ctx.beginPath();
    this.roundRect(ctx, badgeX, badgeY, badgeW, 18, 4);
    ctx.fill();

    ctx.fillStyle = aliveCount > 0 ? '#34C759' : '#FF3B30';
    ctx.textAlign = 'center';
    ctx.fillText(aliveBadgeText, badgeX + badgeW / 2, badgeY + 9);

    // Divider line between columns if numCols === 2
    if (numCols === 2) {
      const divX = panelX + 8 + colW + 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(divX, panelY + headerH + 4);
      ctx.lineTo(divX, panelY + panelH - 6);
      ctx.stroke();
    }

    // Render All Country Rows
    for (let i = 0; i < total; i++) {
      const entry = list[i];
      const colIdx = Math.floor(i / rowsPerCol);
      const rowIdx = i % rowsPerCol;

      const colStartX = panelX + 8 + colIdx * (colW + 2);
      const rowY = panelY + headerH + 4 + rowIdx * rowH;
      const isAlive = entry.isAlive;
      const rank = i + 1;

      // 1. Rank Number
      ctx.font = numCols === 2 ? 'bold 9px "Courier New", monospace' : 'bold 10px "Courier New", monospace';
      ctx.fillStyle = !isAlive
        ? '#64748B'
        : rank === 1
        ? '#FFD700'
        : rank === 2
        ? '#C0C0C0'
        : rank === 3
        ? '#CD7F32'
        : '#E2E8F0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const rankStr = `#${rank}`;
      ctx.fillText(rankStr, colStartX + 2, rowY + rowH / 2);

      const rankW = numCols === 2 ? 18 : 22;

      // 2. Flag icon
      const flagR = numCols === 2 ? 5.5 : 7;
      const flagCx = colStartX + rankW + flagR + 2;
      const flagCy = rowY + rowH / 2;
      if (entry.country) {
        if (!isAlive) ctx.globalAlpha = 0.55;
        Flags.drawFlagHead(ctx, entry.country, flagCx, flagCy, flagR);
        ctx.globalAlpha = 1.0;
      }

      // 3. Country Name
      const nameX = flagCx + flagR + 4;
      const rawName = entry.country?.name || entry.name || 'Country';
      const maxChars = numCols === 2 ? 6 : 11;
      const displayName = rawName.length > maxChars ? rawName.substring(0, maxChars - 1) + '…' : rawName;

      ctx.font = numCols === 2 ? 'bold 9px "Segoe UI", sans-serif' : 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = isAlive ? '#F8FAFC' : '#64748B';
      ctx.textAlign = 'left';
      ctx.fillText(displayName, nameX, rowY + rowH / 2);

      // Subtle strikethrough for OUT countries
      if (!isAlive) {
        const nameW = ctx.measureText(displayName).width;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(nameX - 1, rowY + rowH / 2);
        ctx.lineTo(nameX + nameW + 1, rowY + rowH / 2);
        ctx.stroke();
      }

      // 4. Status Indicator (ALIVE HP Bar vs OUT Badge)
      if (!isAlive) {
        // Red OUT badge
        ctx.font = '900 8px "Segoe UI", Impact, sans-serif';
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'right';
        ctx.fillText('OUT', colStartX + colW - 4, rowY + rowH / 2);
      } else {
        // Mini dynamic HP Bar
        const barW = numCols === 2 ? 22 : 36;
        const barH = numCols === 2 ? 3.5 : 4.5;
        const barX = colStartX + colW - barW - 4;
        const barY = rowY + rowH / 2 - barH / 2;
        const ratio = Math.max(0, Math.min(1, (entry.hpPercent || 0) / 100));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        this.roundRect(ctx, barX, barY, barW, barH, 2);
        ctx.fill();

        ctx.fillStyle = ratio > 0.5 ? '#22C55E' : ratio > 0.25 ? '#F59E0B' : '#EF4444';
        ctx.beginPath();
        this.roundRect(ctx, barX, barY, Math.max(2, barW * ratio), barH, 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // 3.5. RIGHT-SIDE BATTLE HUD PANEL (STAGE MISSION, ROADMAP & LIVE OUT FEED)
  // ==========================================================================
  drawRightPanel(ctx, width, height, game) {
    let list = game.getStandings ? game.getStandings() : [];
    if (!list || list.length === 0) return;

    for (let i = 0; i < list.length; i++) {
      list[i].rank = i + 1;
    }

    const isTournament = Boolean(game.tournament && game.tournament.isActive);
    const stage = isTournament && game.tournament.stages ? game.tournament.stages[game.tournament.currentStageIndex] : null;
    const stageName = stage ? (stage.name || stage.title || 'STAGE').toUpperCase() : 'BATTLE ARENA';
    const advCount = stage ? (stage.advanceCount || 1) : 1;
    const totalCount = list.length;
    const aliveCount = list.filter((e) => e.isAlive).length;

    // Eliminated countries sorted by elimination order descending (most recently eliminated on top)
    const eliminated = list
      .filter((e) => !e.isAlive)
      .sort((a, b) => (b.eliminationOrder || 0) - (a.eliminationOrder || 0));

    // Environmental hazard
    const weatherType = (game.tournament?.stageConditions?.weatherType || game.weather?.weatherType || 'none').toLowerCase();
    let hazard = { icon: '☀️', label: 'CLEAR SKY', desc: 'Standard battle conditions', color: '#94A3B8' };
    if (weatherType === 'thunder' || weatherType === 'lightning') {
      hazard = { icon: '⚡', label: 'THUNDER', desc: 'Random lightning strikes (-60 HP)', color: '#FBBF24' };
    } else if (weatherType === 'rain') {
      hazard = { icon: '🌧️', label: 'RAIN', desc: 'Slippery floor & low friction', color: '#38BDF8' };
    } else if (weatherType === 'wind') {
      hazard = { icon: '💨', label: 'WIND', desc: 'Strong gusts push fighters', color: '#2DD4BF' };
    } else if (weatherType === 'chaos') {
      hazard = { icon: '🌀', label: 'CHAOS', desc: 'High frequency weapon drops', color: '#F472B6' };
    }

    // Dynamic Sizing (symmetrical with left Standings panel)
    const panelW = 240;
    const panelX = width - panelW - 14;
    const headerH = 32;
    const missionBoxH = 74;
    const roadmapH = isTournament ? 32 : 0;
    const hazardH = 24;
    const feedHeaderH = 22;
    const maxFeedItems = 6;
    const visibleFeedCount = Math.min(maxFeedItems, eliminated.length);
    const feedBodyH = visibleFeedCount === 0 ? 38 : visibleFeedCount * 20 + 4;
    const footerH = 22;

    const panelH =
      headerH +
      6 +
      missionBoxH +
      6 +
      (isTournament ? roadmapH + 6 : 0) +
      hazardH +
      6 +
      feedHeaderH +
      feedBodyH +
      footerH +
      8;

    const panelY = Math.max(52, Math.min(68, (height - panelH) / 2));

    ctx.save();

    // 1. Panel Backdrop & Border (Matches Standings panel glassmorphism)
    ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Header Bar
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, headerH, [12, 12, 0, 0]);
    ctx.fill();

    // Header Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#00E5FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const headerTitle = isTournament ? '🎯  STAGE MISSION' : '⚔️  BATTLE ARENA';
    ctx.fillText(headerTitle, panelX + 12, panelY + headerH / 2);

    // Header Badge (Top Advance or Remaining)
    const badgeText = isTournament ? `TOP ${advCount} ADVANCE` : `${aliveCount} ALIVE`;
    ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
    const badgeW = ctx.measureText(badgeText).width + 14;
    const badgeX = panelX + panelW - badgeW - 8;
    const badgeY = panelY + headerH / 2 - 9;
    ctx.fillStyle = isTournament ? 'rgba(255, 230, 0, 0.18)' : 'rgba(52, 199, 89, 0.22)';
    ctx.beginPath();
    this.roundRect(ctx, badgeX, badgeY, badgeW, 18, 4);
    ctx.fill();

    ctx.fillStyle = isTournament ? '#FFE600' : '#34C759';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 9);

    let curY = panelY + headerH + 6;
    const contentX = panelX + 8;
    const contentW = panelW - 16;

    // 3. Section 1: Stage Goal & Objective Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    this.roundRect(ctx, contentX, curY, contentW, missionBoxH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Stage Name
    ctx.font = '900 13px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stageName, contentX + 8, curY + 8);

    if (isTournament) {
      const neededOut = Math.max(1, totalCount - advCount);
      const currentOut = Math.max(0, totalCount - aliveCount);
      const remainingToFall = Math.max(0, aliveCount - advCount);
      const progressRatio = Math.min(1, currentOut / neededOut);

      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94A3B8';
      const statusStr = remainingToFall === 0 ? '✓ Target reached! Stage ending...' : `${remainingToFall} countries must fall`;
      ctx.fillText(statusStr, contentX + 8, curY + 26);

      // Qualification Progress Bar
      const barY = curY + 44;
      const barH = 5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      this.roundRect(ctx, contentX + 8, barY, contentW - 16, barH, 2.5);
      ctx.fill();

      if (progressRatio > 0) {
        ctx.fillStyle = remainingToFall === 0 ? '#00FF87' : '#00E5FF';
        ctx.beginPath();
        this.roundRect(ctx, contentX + 8, barY, Math.max(4, (contentW - 16) * progressRatio), barH, 2.5);
        ctx.fill();
      }

      ctx.font = 'bold 9px "Segoe UI", monospace';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentOut}/${neededOut} OUT`, contentX + contentW - 8, curY + 54);
      ctx.textAlign = 'left';
    } else {
      ctx.font = '600 10.5px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Free For All Elimination Battle', contentX + 8, curY + 26);
      ctx.fillStyle = '#34C759';
      ctx.fillText(`Active: ${aliveCount} / ${totalCount} Stickmen`, contentX + 8, curY + 44);
    }

    curY += missionBoxH + 6;

    // 4. Section 2: Tournament Stages Roadmap (If Tournament)
    if (isTournament) {
      const roadmapLabels = ['64', '32', '16', 'QF', 'SF', '🏆'];
      const currentIdx = game.tournament.currentStageIndex || 0;
      const pillGap = 4;
      const pillW = Math.floor((contentW - pillGap * 5) / 6);
      const pillH = 22;

      for (let s = 0; s < 6; s++) {
        const px = contentX + s * (pillW + pillGap);
        const isPast = s < currentIdx;
        const isCurrent = s === currentIdx;

        ctx.beginPath();
        this.roundRect(ctx, px, curY, pillW, pillH, 4);

        if (isCurrent) {
          ctx.fillStyle = 'rgba(255, 230, 0, 0.22)';
          ctx.fill();
          ctx.strokeStyle = '#FFE600';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.font = '900 9px Impact, sans-serif';
          ctx.fillStyle = '#FFE600';
        } else if (isPast) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.font = 'bold 9px "Segoe UI", sans-serif';
          ctx.fillStyle = '#22C55E';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.font = 'bold 8.5px "Segoe UI", sans-serif';
          ctx.fillStyle = '#64748B';
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = isPast ? '✓' : roadmapLabels[s];
        ctx.fillText(label, px + pillW / 2, curY + pillH / 2);
      }

      curY += roadmapH + 6;
    }

    // 5. Section 3: Environmental Hazard Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    this.roundRect(ctx, contentX, curY, contentW, hazardH, 5);
    ctx.fill();
    ctx.strokeStyle = hazard.color + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hazard.color;
    ctx.fillText(`${hazard.icon} ${hazard.label}:`, contentX + 6, curY + hazardH / 2);

    const labelW = ctx.measureText(`${hazard.icon} ${hazard.label}:`).width;
    ctx.font = '500 9px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    const maxDescW = contentW - labelW - 14;
    ctx.fillText(this.truncateText(ctx, hazard.desc, maxDescW), contentX + 8 + labelW, curY + hazardH / 2);

    curY += hazardH + 6;

    // 6. Section 4: Live Elimination Feed Header
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📜  RECENT OUTS', contentX + 2, curY + feedHeaderH / 2);

    if (eliminated.length > 0) {
      ctx.font = 'bold 8.5px "Segoe UI", monospace';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'right';
      ctx.fillText(`${eliminated.length} OUT`, contentX + contentW - 2, curY + feedHeaderH / 2);
    }

    curY += feedHeaderH;

    // Section 4b: Elimination Feed Items
    if (eliminated.length === 0) {
      // Empty state
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      this.roundRect(ctx, contentX, curY, contentW, feedBodyH, 6);
      ctx.fill();

      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️  All nations in battle', contentX + contentW / 2, curY + feedBodyH / 2 - 6);
      ctx.font = '8px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Out countries will appear here', contentX + contentW / 2, curY + feedBodyH / 2 + 7);
    } else {
      const rowH = 20;
      for (let i = 0; i < visibleFeedCount; i++) {
        const item = eliminated[i];
        const rowY = curY + i * (rowH + 1);

        // Row background
        ctx.fillStyle = i === 0 ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.07)';
        ctx.beginPath();
        this.roundRect(ctx, contentX, rowY, contentW, rowH, 4);
        ctx.fill();

        if (i === 0) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Rank Number
        ctx.font = 'bold 8.5px "Courier New", monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${item.rank}`, contentX + 4, rowY + rowH / 2);

        // Flag Icon
        const flagR = 5;
        const flagCx = contentX + 28;
        const flagCy = rowY + rowH / 2;
        if (item.country) {
          Flags.drawFlagHead(ctx, item.country, flagCx, flagCy, flagR);
        }

        // Country Name
        const nameX = flagCx + flagR + 5;
        const rawName = item.country?.name || item.name || 'Country';
        const displayName = rawName.length > 10 ? rawName.substring(0, 9) + '…' : rawName;
        ctx.font = 'bold 9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#F1F5F9';
        ctx.textAlign = 'left';
        ctx.fillText(displayName, nameX, rowY + rowH / 2);

        // Strikethrough for eliminated
        const textW = ctx.measureText(displayName).width;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nameX - 1, rowY + rowH / 2);
        ctx.lineTo(nameX + textW + 1, rowY + rowH / 2);
        ctx.stroke();

        // OUT Badge
        ctx.font = '900 8px Impact, "Arial Black", sans-serif';
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'right';
        ctx.fillText('OUT', contentX + contentW - 6, rowY + rowH / 2);
      }
    }

    curY += feedBodyH + 4;

    // 7. Footer: Match Clock & Stats
    const matchSec = Math.floor(game.matchTime || 0);
    const mins = Math.floor(matchSec / 60);
    const secs = matchSec % 60;
    const clockStr = `⏱️ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    ctx.font = 'bold 9px "Segoe UI", monospace';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(clockStr, contentX + 4, curY + footerH / 2);

    const totalDmg = Math.round(game.totalDamageDealt || 0);
    ctx.textAlign = 'right';
    ctx.fillText(`💥 ${totalDmg} DMG`, contentX + contentW - 4, curY + footerH / 2);

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

  // ==========================================================================
  // IN-ENGINE ANNOUNCER (COUNTDOWN, COUNTRY OUT, KO, WEATHER SHIFTS)
  // ==========================================================================
  showCountdown(text, isFight = false) {
    if (this.eliminationFeed) {
      this.eliminationFeed = [];
    }
    const dur = isFight ? 1.1 : 0.75;
    this.announcer = {
      text: String(text),
      subText: isFight ? 'CLASH!' : '',
      type: isFight ? 'fight' : 'countdown',
      country: null,
      timer: dur,
      duration: dur,
    };
  }

  showTeamEliminated(countryOrName) {
    let country = null;
    let countryName = '';

    if (typeof countryOrName === 'object' && countryOrName !== null) {
      country = countryOrName;
      countryName = country.name || country.id || 'Country';
    } else if (typeof countryOrName === 'string') {
      countryName = countryOrName;
      country =
        CONFIG.COUNTRIES.find(
          (c) =>
            c.name.toLowerCase() === countryName.toLowerCase() ||
            c.id.toLowerCase() === countryName.toLowerCase()
        ) || null;
    }

    const id = country ? country.id : countryName.toLowerCase();

    // Prevent duplicate entry if already in active feed
    if (this.eliminationFeed.some((item) => item.id === id)) return;

    // Limit active items to max 2 for clean vertical multi-out stacking
    if (this.eliminationFeed.length >= 2) {
      this.eliminationFeed.shift();
    }

    const dur = 1.1; // Snappy 1.1 seconds lifetime
    this.announcer = {
      text: `${countryName.toUpperCase()} OUT!`,
      subText: 'ELIMINATED',
      type: 'team_out',
      country: country,
      timer: dur,
      duration: dur,
    };
    this.eliminationFeed.push({
      id: id,
      country: country,
      countryName: countryName,
      text: `${countryName.toUpperCase()} OUT!`,
      timer: dur,
      duration: dur,
    });
  }

  showKO(fighterName, country = null) {
    let c = country;
    let name = String(fighterName || '');
    if (!c && typeof fighterName === 'string') {
      c =
        CONFIG.COUNTRIES.find(
          (item) =>
            item.name.toLowerCase() === name.toLowerCase() ||
            item.id.toLowerCase() === name.toLowerCase()
        ) || null;
    }

    const displayName = c ? c.name : name;
    const id = c ? c.id : displayName.toLowerCase();

    if (this.eliminationFeed.some((item) => item.id === id)) return;

    if (this.eliminationFeed.length >= 2) {
      this.eliminationFeed.shift();
    }

    const dur = 1.1;
    this.eliminationFeed.push({
      id: id,
      country: c,
      countryName: displayName,
      text: `${displayName.toUpperCase()} OUT!`,
      timer: dur,
      duration: dur,
    });
  }

  showNatureAlert(text) {
    const dur = 1.8;
    this.announcer = {
      text: String(text).toUpperCase(),
      subText: 'WEATHER SHIFT',
      type: 'nature',
      country: null,
      timer: dur,
      duration: dur,
    };
  }

  drawAnnouncer(ctx, width, height, game) {
    // 1. Draw In-Engine Elimination Feed (Transparent, Snappy ~1.1s, Multi-Out Stacking)
    if (this.eliminationFeed && this.eliminationFeed.length > 0) {
      this.drawEliminationFeed(ctx, width, height);
    }

    // 2. Draw General Announcer (Countdown 3-2-1, FIGHT!, Weather Shifts)
    if (!this.announcer || this.announcer.timer <= 0 || !this.announcer.text) return;

    const { text, subText, type, timer, duration } = this.announcer;
    const elapsed = Math.max(0, duration - timer);

    ctx.save();

    if (type === 'countdown') {
      // Scale punch: 1.45 -> 1.0
      const progress = Math.min(1, elapsed / 0.12);
      const scale = 1.45 - progress * 0.45;
      const alpha = timer < 0.15 ? timer / 0.15 : 1.0;

      const cx = width / 2;
      const cy = height * 0.42;

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Outer radial aura
      const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
      aura.addColorStop(0, 'rgba(255, 230, 0, 0.48)');
      aura.addColorStop(0.55, 'rgba(255, 180, 0, 0.18)');
      aura.addColorStop(1, 'rgba(255, 180, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.fill();

      // Bold Comic Number
      ctx.font = '900 110px "Segoe UI", Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Thick black cartoon stroke
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';
      ctx.strokeText(text, 0, 0);

      // Yellow energy gradient fill
      const grad = ctx.createLinearGradient(0, -55, 0, 45);
      grad.addColorStop(0, '#FFFF88');
      grad.addColorStop(0.45, '#FFE600');
      grad.addColorStop(1, '#FF9900');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#FFE600';
      ctx.shadowBlur = 24;
      ctx.fillText(text, 0, 0);

    } else if (type === 'fight') {
      // Explosive scale: 1.6 -> 1.0
      const progress = Math.min(1, elapsed / 0.14);
      const scale = 1.6 - progress * 0.6;
      const alpha = timer < 0.22 ? timer / 0.22 : 1.0;

      const cx = width / 2;
      const cy = height * 0.42;

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Dramatic explosive shockwave aura
      const flash = ctx.createRadialGradient(0, 0, 20, 0, 0, 180);
      flash.addColorStop(0, 'rgba(255, 46, 147, 0.58)');
      flash.addColorStop(0.5, 'rgba(255, 23, 68, 0.22)');
      flash.addColorStop(1, 'rgba(255, 0, 60, 0)');
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(0, 0, 180, 0, Math.PI * 2);
      ctx.fill();

      // FIGHT! Text
      ctx.font = '900 120px "Segoe UI", Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Black outline
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';
      ctx.strokeText('FIGHT!', 0, 0);

      // Vibrant Pink / Crimson comic gradient
      const grad = ctx.createLinearGradient(0, -60, 0, 50);
      grad.addColorStop(0, '#FF88DD');
      grad.addColorStop(0.4, '#FF1744');
      grad.addColorStop(1, '#FF7700');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#FF2E93';
      ctx.shadowBlur = 32;
      ctx.fillText('FIGHT!', 0, 0);

    } else if (type === 'nature') {
      // Dynamic weather alert banner
      const progress = Math.min(1, elapsed / 0.12);
      const scale = 0.88 + progress * 0.12;
      const alpha = timer < 0.25 ? timer / 0.25 : 1.0;

      const cx = width / 2;
      const cy = height * 0.44;

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.font = '900 30px "Segoe UI", Impact, "Arial Black", sans-serif';
      const textMetrics = ctx.measureText(text);
      const bannerW = Math.max(320, textMetrics.width + 56);
      const bannerH = 64;
      const bannerX = -bannerW / 2;
      const bannerY = -bannerH / 2;

      ctx.fillStyle = 'rgba(6, 18, 28, 0.94)';
      ctx.beginPath();
      this.roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, 0, -6);
      ctx.fillStyle = '#00F0FF';
      ctx.fillText(text, 0, -6);

      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#A5F3FC';
      ctx.fillText('ENVIRONMENTAL SHIFT', 0, 15);
    }

    ctx.restore();
  }

  /**
   * Renders the in-engine elimination feed directly over the arena without any solid/black box.
   * Features:
   * 1. 100% transparent backdrop (arena remains fully visible).
   * 2. Snappy ~1.1s duration (pop-in scale, gentle upward drift, smooth fade-out).
   * 3. Multi-Out / Double Elimination vertical stacking (Row 1 & Row 2 if 2 countries eliminated close together).
   */
  drawEliminationFeed(ctx, width, height) {
    if (!this.eliminationFeed || this.eliminationFeed.length === 0) return;

    const count = this.eliminationFeed.length;
    const cy = height * 0.40;
    const isDouble = count >= 2;

    for (let i = 0; i < count; i++) {
      const item = this.eliminationFeed[i];
      const elapsed = Math.max(0, item.duration - item.timer);

      // Pop-in scale punch: 1.28 -> 1.0 in first 0.12s
      const popProgress = Math.min(1, elapsed / 0.12);
      const scale = 1.28 - popProgress * 0.28;

      // Gentle upward drift of ~12px over 1.1s
      const driftY = -((elapsed / item.duration) * 12);

      // Smooth fade-out in final 0.25s
      const alpha = item.timer < 0.25 ? Math.max(0, item.timer / 0.25) : 1.0;

      // Stack rows vertically if multiple countries eliminated
      const baseY = isDouble ? (cy - 24 + i * 48) : cy;
      const posX = width / 2;
      const posY = baseY + driftY;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      const fontSize = isDouble ? 33 : 37;
      ctx.font = `900 ${fontSize}px "Segoe UI", Impact, "Arial Black", sans-serif`;
      ctx.textBaseline = 'middle';

      const textMetrics = ctx.measureText(item.text);
      const flagW = item.country ? (isDouble ? 42 : 46) : 0;
      const flagH = item.country ? (isDouble ? 27 : 30) : 0;
      const gap = item.country ? 14 : 0;
      const totalW = flagW + gap + textMetrics.width;
      const startX = -totalW / 2;

      // 1. Render country flag with drop shadow and crisp white border (NO black background box)
      if (item.country) {
        const flagX = startX;
        const flagY = -flagH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        this.drawFlag(ctx, item.country, flagX, flagY, flagW, flagH, 3.5);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.roundRect(ctx, flagX, flagY, flagW, flagH, 3.5);
        ctx.stroke();
      }

      // 2. Render "[COUNTRY] OUT!" text with thick black stroke and vivid crimson gradient
      const textX = startX + flagW + gap;
      ctx.textAlign = 'left';

      // Thick black comic stroke guarantees 100% readability over any arena surface
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.shadowColor = 'transparent';
      ctx.strokeText(item.text, textX, 0);

      // Crimson & Red gradient fill with glowing neon drop shadow
      const grad = ctx.createLinearGradient(0, -fontSize * 0.45, 0, fontSize * 0.45);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.22, '#FF3366');
      grad.addColorStop(0.75, '#FF1744');
      grad.addColorStop(1, '#C62828');
      ctx.fillStyle = grad;

      ctx.shadowColor = '#FF1744';
      ctx.shadowBlur = 14;
      ctx.fillText(item.text, textX, 0);

      ctx.restore();
    }
  }
}
