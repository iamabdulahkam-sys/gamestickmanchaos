/**
 * Stickman Flag Chaos - Flags Rendering Module
 * Procedural vector graphics for 100 country flags.
 * Supports both 2D Canvas circular fighter heads and clean SVG icons for HUD & Roster.
 * Strictly kid-friendly, ZERO emojis, 100% geometric vector accuracy.
 */

import { CONFIG } from './config.js';

function getCountry(countryOrId) {
  if (typeof countryOrId === 'object' && countryOrId !== null) return countryOrId;
  return CONFIG.COUNTRIES.find((c) => c.id === countryOrId) || CONFIG.COUNTRIES[0];
}

// Helper to draw a 5-point star on 2D canvas
function drawCanvasStar(ctx, cx, cy, rOut, rIn, fill, rotAngle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotAngle);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
    else ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
    ctx.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to generate SVG points for a 5-point star
function getSvgStar(cx, cy, rOut, rIn, fill, rotDeg = 0) {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2 + (rotDeg * Math.PI) / 180;
    const a2 = a1 + Math.PI / 5;
    points.push(`${(cx + Math.cos(a1) * rOut).toFixed(1)},${(cy + Math.sin(a1) * rOut).toFixed(1)}`);
    points.push(`${(cx + Math.cos(a2) * rIn).toFixed(1)},${(cy + Math.sin(a2) * rIn).toFixed(1)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${fill}"/>`;
}

export const Flags = {
  /**
   * Draw flag inside a circular head on a 2D Canvas context
   */
  drawFlagHead(ctx, countryOrId, x, y, radius) {
    const country = getCountry(countryOrId);
    const flag = country.flag || { type: 'horizontal_2', colors: [country.primaryColor, country.secondaryColor] };
    const { type, colors } = flag;

    ctx.save();
    // Clip circular head
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    const d = radius * 2;
    const left = x - radius;
    const top = y - radius;

    switch (type) {
      // 1. HORIZONTAL STRIPES
      case 'horizontal_2': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, radius);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, y, d, radius);
        break;
      }
      case 'horizontal_3': {
        const h3 = d / 3;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, h3);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h3, d, h3);
        ctx.fillStyle = colors[2]; ctx.fillRect(left, top + h3 * 2, d, h3);
        break;
      }
      case 'horizontal_5': {
        // Thailand: Red 1/6, White 1/6, Blue 2/6, White 1/6, Red 1/6
        const h6 = d / 6;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, h6);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h6, d, h6);
        ctx.fillStyle = colors[2]; ctx.fillRect(left, top + h6 * 2, d, h6 * 2);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h6 * 4, d, h6);
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top + h6 * 5, d, h6);
        break;
      }
      case 'horizontal_5_costa': {
        // Costa Rica: Blue, White, Red double, White, Blue
        const h6 = d / 6;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, h6);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h6, d, h6);
        ctx.fillStyle = colors[2]; ctx.fillRect(left, top + h6 * 2, d, h6 * 2);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h6 * 4, d, h6);
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top + h6 * 5, d, h6);
        break;
      }
      case 'horizontal_6_bird': {
        // Uganda: 6 black-yellow-red stripes with center disc
        const h6 = d / 6;
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = colors[i % 3];
          ctx.fillRect(left, top + h6 * i, d, h6);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(x, y, radius * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111111';
        ctx.beginPath(); ctx.arc(x, y, radius * 0.12, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'colombia_bars': {
        // Yellow 2/4, Blue 1/4, Red 1/4
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d * 0.5);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + d * 0.5, d, d * 0.25);
        ctx.fillStyle = colors[2]; ctx.fillRect(left, top + d * 0.75, d, d * 0.25);
        break;
      }
      case 'latvia_bars': {
        // Maroon 2/5, White 1/5, Maroon 2/5
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d * 0.4);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + d * 0.4, d, d * 0.2);
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top + d * 0.6, d, d * 0.4);
        break;
      }
      case 'spain_bars': {
        // Red 1/4, Yellow 2/4, Red 1/4
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d * 0.25);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, top + d * 0.25, d, d * 0.5);
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top + d * 0.75, d, d * 0.25);
        ctx.fillStyle = colors[2] || '#C60B1E';
        ctx.fillRect(x - radius * 0.45, y - radius * 0.2, radius * 0.28, radius * 0.4);
        break;
      }

      // 2. VERTICAL STRIPES
      case 'vertical_3': {
        const w3 = d / 3;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, w3, d);
        ctx.fillStyle = colors[1]; ctx.fillRect(left + w3, top, w3, d);
        ctx.fillStyle = colors[2]; ctx.fillRect(left + w3 * 2, top, w3, d);
        break;
      }
      case 'vertical_3_emblem': {
        // Mexico
        const w3 = d / 3;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, w3, d);
        ctx.fillStyle = colors[1]; ctx.fillRect(left + w3, top, w3, d);
        ctx.fillStyle = colors[2]; ctx.fillRect(left + w3 * 2, top, w3, d);
        ctx.fillStyle = '#8B5A2B';
        ctx.beginPath(); ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'vertical_3_star': {
        // Senegal / Cameroon
        const w3 = d / 3;
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, w3, d);
        ctx.fillStyle = colors[1]; ctx.fillRect(left + w3, top, w3, d);
        ctx.fillStyle = colors[2]; ctx.fillRect(left + w3 * 2, top, w3, d);
        drawCanvasStar(ctx, x, y, radius * 0.35, radius * 0.15, colors[3] || '#FFE600');
        break;
      }

      // 3. CHINA: FIVE GOLD STARS ON RED CANTON
      case 'star_canton':
      case 'china_stars': {
        ctx.fillStyle = colors[0]; // Red
        ctx.fillRect(left, top, d, d);
        // Big star in top left canton
        const bx = x - radius * 0.42;
        const by = y - radius * 0.42;
        drawCanvasStar(ctx, bx, by, radius * 0.36, radius * 0.15, colors[1]);
        // 4 small stars arc pointing to center of big star
        const stars = [
          [-0.1, -0.65, 0.4],
          [0.08, -0.46, 0.8],
          [0.08, -0.22, 0.0],
          [-0.08, -0.05, -0.4],
        ];
        stars.forEach(([sx, sy, rot]) => {
          drawCanvasStar(ctx, x + sx * radius, y + sy * radius, radius * 0.12, radius * 0.05, colors[1], rot);
        });
        break;
      }

      // 4. SOUTH KOREA: TAEGEUK & 4 TRIGRAMS
      case 'taegeuk': {
        ctx.fillStyle = colors[0]; // White field
        ctx.fillRect(left, top, d, d);
        const tR = radius * 0.46;
        // Red top half
        ctx.fillStyle = colors[1]; // Red
        ctx.beginPath(); ctx.arc(x, y, tR, Math.PI, 0); ctx.fill();
        // Blue bottom half
        ctx.fillStyle = colors[2]; // Blue
        ctx.beginPath(); ctx.arc(x, y, tR, 0, Math.PI); ctx.fill();
        // S-curve circles
        ctx.fillStyle = colors[1];
        ctx.beginPath(); ctx.arc(x - tR / 2, y, tR / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[2];
        ctx.beginPath(); ctx.arc(x + tR / 2, y, tR / 2, 0, Math.PI * 2); ctx.fill();

        // 4 Trigrams in corners (Geon, Gam, Ri, Gon)
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.8;
        const corners = [
          [-0.7, -0.7, -0.78], // Top-Left
          [0.7, -0.7, 0.78],   // Top-Right
          [-0.7, 0.7, 0.78],   // Bottom-Left
          [0.7, 0.7, -0.78],   // Bottom-Right
        ];
        corners.forEach(([cx, cy, ang]) => {
          ctx.save();
          ctx.translate(x + cx * radius * 0.65, y + cy * radius * 0.65);
          ctx.rotate(ang);
          for (let b = -4; b <= 4; b += 4) {
            ctx.beginPath();
            ctx.moveTo(-5, b); ctx.lineTo(5, b);
            ctx.stroke();
          }
          ctx.restore();
        });
        break;
      }

      // 5. VIETNAM & MOROCCO (STAR CENTER)
      case 'star_center': {
        ctx.fillStyle = colors[0];
        ctx.fillRect(left, top, d, d);
        drawCanvasStar(ctx, x, y, radius * 0.6, radius * 0.25, colors[1]);
        break;
      }

      // 6. CIRCLE CENTER (JAPAN & BANGLADESH)
      case 'circle_center': {
        ctx.fillStyle = colors[0];
        ctx.fillRect(left, top, d, d);
        ctx.fillStyle = colors[1];
        ctx.beginPath(); ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'circle_offset': {
        ctx.fillStyle = colors[0];
        ctx.fillRect(left, top, d, d);
        ctx.fillStyle = colors[1];
        ctx.beginPath(); ctx.arc(x - radius * 0.15, y, radius * 0.52, 0, Math.PI * 2); ctx.fill();
        break;
      }

      // 7. MALAYSIA (CANTON CRESCENT + STRIPES)
      case 'canton_crescent': {
        const sH = d / 10;
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
          ctx.fillRect(left, top + sH * i, d, sH);
        }
        ctx.fillStyle = colors[2];
        ctx.fillRect(left, top, radius * 1.05, radius * 1.05);
        ctx.fillStyle = colors[3];
        ctx.beginPath(); ctx.arc(x - radius * 0.6, y - radius * 0.5, radius * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[2];
        ctx.beginPath(); ctx.arc(x - radius * 0.5, y - radius * 0.5, radius * 0.24, 0, Math.PI * 2); ctx.fill();
        drawCanvasStar(ctx, x - radius * 0.35, y - radius * 0.5, radius * 0.16, radius * 0.07, colors[3]);
        break;
      }

      // 8. SINGAPORE (2 STRIPES + CRESCENT + 5 STARS)
      case 'horizontal_2_crescent': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, radius);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, y, d, radius);
        ctx.fillStyle = colors[1];
        ctx.beginPath(); ctx.arc(x - radius * 0.55, y - radius * 0.48, radius * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors[0];
        ctx.beginPath(); ctx.arc(x - radius * 0.45, y - radius * 0.48, radius * 0.24, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const sx = x - radius * 0.36 + Math.cos(a) * radius * 0.14;
          const sy = y - radius * 0.48 + Math.sin(a) * radius * 0.14;
          drawCanvasStar(ctx, sx, sy, radius * 0.06, radius * 0.025, colors[1]);
        }
        break;
      }

      // 9. GREECE (CANTON CROSS + STRIPES)
      case 'greece_canton': {
        const sH = d / 9;
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
          ctx.fillRect(left, top + sH * i, d, sH);
        }
        ctx.fillStyle = colors[0];
        ctx.fillRect(left, top, radius * 1.05, radius * 1.05);
        ctx.fillStyle = colors[1];
        const barW = radius * 0.22;
        ctx.fillRect(left + (radius * 1.05 - barW) / 2, top, barW, radius * 1.05);
        ctx.fillRect(left, top + (radius * 1.05 - barW) / 2, radius * 1.05, barW);
        break;
      }

      // 10. UNITED STATES
      case 'usa_stripes': {
        const sH = d / 10;
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
          ctx.fillRect(left, top + sH * i, d, sH);
        }
        ctx.fillStyle = colors[2];
        ctx.fillRect(left, top, radius * 1.05, radius * 1.05);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            drawCanvasStar(
              ctx,
              left + radius * 0.22 + col * radius * 0.32,
              top + radius * 0.22 + row * radius * 0.32,
              radius * 0.08,
              radius * 0.035,
              '#FFFFFF'
            );
          }
        }
        break;
      }

      // 11. UNITED KINGDOM (UNION JACK)
      case 'union_jack': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        ctx.strokeStyle = colors[1]; ctx.lineWidth = radius * 0.38;
        ctx.beginPath();
        ctx.moveTo(left, top); ctx.lineTo(left + d, top + d);
        ctx.moveTo(left + d, top); ctx.lineTo(left, top + d);
        ctx.stroke();
        ctx.strokeStyle = colors[2]; ctx.lineWidth = radius * 0.2;
        ctx.beginPath();
        ctx.moveTo(left, top); ctx.lineTo(left + d, top + d);
        ctx.moveTo(left + d, top); ctx.lineTo(left, top + d);
        ctx.stroke();
        ctx.fillStyle = colors[1];
        ctx.fillRect(x - radius * 0.26, top, radius * 0.52, d);
        ctx.fillRect(left, y - radius * 0.26, d, radius * 0.52);
        ctx.fillStyle = colors[2];
        ctx.fillRect(x - radius * 0.15, top, radius * 0.3, d);
        ctx.fillRect(left, y - radius * 0.15, d, radius * 0.3);
        break;
      }

      // 12. BRAZIL (RHOMBUS & GLOBE)
      case 'brazil_rhombus': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        ctx.fillStyle = colors[1];
        ctx.beginPath();
        ctx.moveTo(x, top + d * 0.14);
        ctx.lineTo(left + d * 0.9, y);
        ctx.lineTo(x, top + d * 0.86);
        ctx.lineTo(left + d * 0.1, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = colors[2];
        ctx.beginPath(); ctx.arc(x, y, radius * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(x, y + radius * 0.12, radius * 0.4, Math.PI * 1.1, Math.PI * 1.85);
        ctx.stroke();
        break;
      }

      // 13. NORDIC & DOUBLE CROSSES
      case 'cross_nordic': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        ctx.fillStyle = colors[1];
        const barW = radius * 0.35;
        ctx.fillRect(x - radius * 0.25, top, barW, d);
        ctx.fillRect(left, y - barW / 2, d, barW);
        break;
      }
      case 'cross_double': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        const wOuter = radius * 0.48;
        const wInner = radius * 0.26;
        ctx.fillStyle = colors[1];
        ctx.fillRect(x - radius * 0.25, top, wOuter, d);
        ctx.fillRect(left, y - wOuter / 2, d, wOuter);
        ctx.fillStyle = colors[2];
        ctx.fillRect(x - radius * 0.25 + (wOuter - wInner) / 2, top, wInner, d);
        ctx.fillRect(left, y - wInner / 2, d, wInner);
        break;
      }
      case 'swiss_cross': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        ctx.fillStyle = colors[1];
        const bW = radius * 0.34;
        const bL = radius * 0.95;
        ctx.fillRect(x - bW / 2, y - bL / 2, bW, bL);
        ctx.fillRect(x - bL / 2, y - bW / 2, bL, bW);
        break;
      }

      // 14. AUSTRALIA & NEW ZEALAND
      case 'australia_stars':
      case 'nz_stars': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(left, top, radius * 0.85, radius * 0.85);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(left + radius * 0.36, top, radius * 0.14, radius * 0.85);
        ctx.fillRect(left, top + radius * 0.36, radius * 0.85, radius * 0.14);
        const starCol = colors[2] || '#FFFFFF';
        drawCanvasStar(ctx, x + radius * 0.45, y - radius * 0.35, radius * 0.14, radius * 0.06, starCol);
        drawCanvasStar(ctx, x + radius * 0.6, y, radius * 0.12, radius * 0.05, starCol);
        drawCanvasStar(ctx, x + radius * 0.45, y + radius * 0.45, radius * 0.16, radius * 0.07, starCol);
        drawCanvasStar(ctx, x + radius * 0.25, y + radius * 0.15, radius * 0.12, radius * 0.05, starCol);
        break;
      }

      // 15. CRESCENTS (TURKEY, PAKISTAN, ALGERIA, TUNISIA)
      case 'star_crescent':
      case 'vertical_crescent':
      case 'split_crescent':
      case 'crescent_circle': {
        if (type === 'split_crescent') {
          ctx.fillStyle = colors[0]; ctx.fillRect(left, top, radius, d);
          ctx.fillStyle = colors[1]; ctx.fillRect(x, top, radius, d);
        } else if (type === 'vertical_crescent') {
          ctx.fillStyle = colors[1]; ctx.fillRect(left, top, radius * 0.5, d);
          ctx.fillStyle = colors[0]; ctx.fillRect(left + radius * 0.5, top, d - radius * 0.5, d);
        } else {
          ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, d);
        }
        const cresCol = colors[1] || '#FFFFFF';
        const cBg = (type === 'split_crescent' || type === 'vertical_crescent') ? (colors[1] || colors[0]) : colors[0];
        ctx.fillStyle = cresCol;
        ctx.beginPath(); ctx.arc(x - radius * 0.1, y, radius * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cBg;
        ctx.beginPath(); ctx.arc(x + radius * 0.04, y, radius * 0.38, 0, Math.PI * 2); ctx.fill();
        drawCanvasStar(ctx, x + radius * 0.34, y, radius * 0.22, radius * 0.09, cresCol);
        break;
      }

      // 16. TRIANGLES (PHILIPPINES, CUBA, CZECHIA, JORDAN, PALESTINE)
      case 'triangle_left':
      case 'triangle_left_star':
      case 'triangle_left_split':
      case 'triangle_stripes':
      case 'triangle_stripes_star': {
        ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, radius);
        ctx.fillStyle = colors[1]; ctx.fillRect(left, y, d, radius);
        ctx.fillStyle = colors[2] || '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(x + radius * 0.25, y);
        ctx.lineTo(left, top + d);
        ctx.closePath();
        ctx.fill();
        if (colors[3] || type === 'triangle_left_star' || type === 'triangle_stripes_star') {
          drawCanvasStar(ctx, left + radius * 0.4, y, radius * 0.22, radius * 0.09, colors[3] || '#FFFFFF');
        }
        break;
      }

      // DEFAULT FALLBACK: 3 stripes, 2 stripes, or solid
      default: {
        if (colors.length >= 3) {
          const h3 = d / 3;
          ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, h3);
          ctx.fillStyle = colors[1]; ctx.fillRect(left, top + h3, d, h3);
          ctx.fillStyle = colors[2]; ctx.fillRect(left, top + h3 * 2, d, h3);
        } else if (colors.length === 2) {
          ctx.fillStyle = colors[0]; ctx.fillRect(left, top, d, radius);
          ctx.fillStyle = colors[1]; ctx.fillRect(left, y, d, radius);
        } else {
          ctx.fillStyle = colors[0] || country.primaryColor;
          ctx.fillRect(left, top, d, d);
        }
        break;
      }
    }

    ctx.restore();

    // Bold cartoon head outline
    ctx.save();
    ctx.strokeStyle = '#12141D';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  /**
   * Returns clean SVG markup for a country flag
   */
  getFlagSvg(countryOrId) {
    const country = getCountry(countryOrId);
    const flag = country.flag || { type: 'horizontal_2', colors: [country.primaryColor, country.secondaryColor] };
    const { type, colors } = flag;

    let innerSvg = '';

    switch (type) {
      // 1. HORIZONTAL STRIPES
      case 'horizontal_2':
        innerSvg = `<rect width="36" height="12" fill="${colors[0]}"/><rect y="12" width="36" height="12" fill="${colors[1]}"/>`;
        break;

      case 'horizontal_3':
        innerSvg = `<rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[2]}"/>`;
        break;

      case 'horizontal_5':
        // Thailand: Red, White, Blue double, White, Red
        innerSvg = `<rect width="36" height="4" fill="${colors[0]}"/><rect y="4" width="36" height="4" fill="${colors[1]}"/><rect y="8" width="36" height="8" fill="${colors[2]}"/><rect y="16" width="36" height="4" fill="${colors[1]}"/><rect y="20" width="36" height="4" fill="${colors[0]}"/>`;
        break;

      case 'horizontal_5_costa':
        innerSvg = `<rect width="36" height="4" fill="${colors[0]}"/><rect y="4" width="36" height="4" fill="${colors[1]}"/><rect y="8" width="36" height="8" fill="${colors[2]}"/><rect y="16" width="36" height="4" fill="${colors[1]}"/><rect y="20" width="36" height="4" fill="${colors[0]}"/>`;
        break;

      case 'horizontal_6_bird':
        innerSvg = `<rect width="36" height="4" fill="${colors[0]}"/><rect y="4" width="36" height="4" fill="${colors[1]}"/><rect y="8" width="36" height="8" fill="${colors[2]}"/><rect y="12" width="36" height="4" fill="${colors[0]}"/><rect y="16" width="36" height="4" fill="${colors[1]}"/><rect y="20" width="36" height="4" fill="${colors[2]}"/><circle cx="18" cy="12" r="5" fill="#FFFFFF"/><circle cx="18" cy="12" r="2.5" fill="#111111"/>`;
        break;

      case 'colombia_bars':
        innerSvg = `<rect width="36" height="12" fill="${colors[0]}"/><rect y="12" width="36" height="6" fill="${colors[1]}"/><rect y="18" width="36" height="6" fill="${colors[2]}"/>`;
        break;

      case 'latvia_bars':
        innerSvg = `<rect width="36" height="9.5" fill="${colors[0]}"/><rect y="9.5" width="36" height="5" fill="${colors[1]}"/><rect y="14.5" width="36" height="9.5" fill="${colors[0]}"/>`;
        break;

      case 'spain_bars':
        innerSvg = `<rect width="36" height="6" fill="${colors[0]}"/><rect y="6" width="36" height="12" fill="${colors[1]}"/><rect y="18" width="36" height="6" fill="${colors[0]}"/><rect x="8" y="9" width="4" height="6" fill="${colors[2] || '#C60B1E'}"/>`;
        break;

      // 2. VERTICAL STRIPES
      case 'vertical_3':
        innerSvg = `<rect width="12" height="24" fill="${colors[0]}"/><rect x="12" width="12" height="24" fill="${colors[1]}"/><rect x="24" width="12" height="24" fill="${colors[2]}"/>`;
        break;

      case 'vertical_3_emblem':
        innerSvg = `<rect width="12" height="24" fill="${colors[0]}"/><rect x="12" width="12" height="24" fill="${colors[1]}"/><rect x="24" width="12" height="24" fill="${colors[2]}"/><circle cx="18" cy="12" r="3.5" fill="#8B5A2B"/>`;
        break;

      case 'vertical_3_star':
        innerSvg = `<rect width="12" height="24" fill="${colors[0]}"/><rect x="12" width="12" height="24" fill="${colors[1]}"/><rect x="24" width="12" height="24" fill="${colors[2]}"/>${getSvgStar(18, 12, 4.2, 1.8, colors[3] || '#FFE600')}`;
        break;

      // 3. CHINA (5 GOLD STARS ON RED)
      case 'star_canton':
      case 'china_stars':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          ${getSvgStar(6.5, 6.5, 4.5, 1.8, colors[1])}
          ${getSvgStar(13.5, 3.2, 1.4, 0.6, colors[1], 20)}
          ${getSvgStar(16.5, 5.8, 1.4, 0.6, colors[1], 40)}
          ${getSvgStar(16.5, 9.5, 1.4, 0.6, colors[1], 0)}
          ${getSvgStar(13.5, 12.2, 1.4, 0.6, colors[1], -20)}`;
        break;

      // 4. SOUTH KOREA (TAEGEUK & 4 TRIGRAMS)
      case 'taegeuk':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <path d="M 12,12 A 6,6 0 0,1 24,12 A 3,3 0 0,1 21,12 A 3,3 0 0,0 15,12 Z" fill="${colors[1]}"/>
          <path d="M 12,12 A 6,6 0 0,0 24,12 A 3,3 0 0,0 21,12 A 3,3 0 0,1 15,12 Z" fill="${colors[2]}"/>
          <!-- Top Left Trigram Geon (3 solid bars) -->
          <line x1="4.5" y1="4.5" x2="8.5" y2="7.5" stroke="#111" stroke-width="0.9"/>
          <line x1="3.5" y1="6" x2="7.5" y2="9" stroke="#111" stroke-width="0.9"/>
          <line x1="2.5" y1="7.5" x2="6.5" y2="10.5" stroke="#111" stroke-width="0.9"/>
          <!-- Top Right Trigram Gam -->
          <line x1="31.5" y1="4.5" x2="27.5" y2="7.5" stroke="#111" stroke-width="0.9"/>
          <line x1="32.5" y1="6" x2="28.5" y2="9" stroke="#111" stroke-width="0.9"/>
          <line x1="33.5" y1="7.5" x2="29.5" y2="10.5" stroke="#111" stroke-width="0.9"/>
          <!-- Bottom Left Trigram Ri -->
          <line x1="4.5" y1="19.5" x2="8.5" y2="16.5" stroke="#111" stroke-width="0.9"/>
          <line x1="3.5" y1="18" x2="7.5" y2="15" stroke="#111" stroke-width="0.9"/>
          <line x1="2.5" y1="16.5" x2="6.5" y2="13.5" stroke="#111" stroke-width="0.9"/>
          <!-- Bottom Right Trigram Gon -->
          <line x1="31.5" y1="19.5" x2="27.5" y2="16.5" stroke="#111" stroke-width="0.9"/>
          <line x1="32.5" y1="18" x2="28.5" y2="15" stroke="#111" stroke-width="0.9"/>
          <line x1="33.5" y1="16.5" x2="29.5" y2="13.5" stroke="#111" stroke-width="0.9"/>`;
        break;

      // 5. STAR CENTER (VIETNAM, MOROCCO)
      case 'star_center':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>${getSvgStar(18, 12, 7.5, 3.2, colors[1])}`;
        break;

      // 6. CIRCLE CENTER (JAPAN, BANGLADESH)
      case 'circle_center':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/><circle cx="18" cy="12" r="6.8" fill="${colors[1]}"/>`;
        break;
      case 'circle_offset':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/><circle cx="15" cy="12" r="6.5" fill="${colors[1]}"/>`;
        break;

      // 7. MALAYSIA
      case 'canton_crescent':
        innerSvg = `<rect width="36" height="24" fill="${colors[1]}"/>
          <rect y="2" width="36" height="2" fill="${colors[0]}"/>
          <rect y="6" width="36" height="2" fill="${colors[0]}"/>
          <rect y="10" width="36" height="2" fill="${colors[0]}"/>
          <rect y="14" width="36" height="2" fill="${colors[0]}"/>
          <rect y="18" width="36" height="2" fill="${colors[0]}"/>
          <rect y="22" width="36" height="2" fill="${colors[0]}"/>
          <rect width="18" height="13" fill="${colors[2]}"/>
          <circle cx="8.5" cy="6.5" r="4.2" fill="${colors[3]}"/>
          <circle cx="10" cy="6.5" r="3.4" fill="${colors[2]}"/>
          ${getSvgStar(12.5, 6.5, 2.2, 0.9, colors[3])}`;
        break;

      // 8. SINGAPORE
      case 'horizontal_2_crescent':
        innerSvg = `<rect width="36" height="12" fill="${colors[0]}"/><rect y="12" width="36" height="12" fill="${colors[1]}"/>
          <circle cx="7.5" cy="6" r="3.8" fill="${colors[1]}"/>
          <circle cx="9" cy="6" r="3.2" fill="${colors[0]}"/>
          ${getSvgStar(11, 4.2, 0.9, 0.4, colors[1])}
          ${getSvgStar(12.8, 5.5, 0.9, 0.4, colors[1])}
          ${getSvgStar(12.2, 7.5, 0.9, 0.4, colors[1])}
          ${getSvgStar(10, 7.5, 0.9, 0.4, colors[1])}
          ${getSvgStar(9.5, 5.5, 0.9, 0.4, colors[1])}`;
        break;

      // 9. GREECE
      case 'greece_canton':
        innerSvg = `<rect width="36" height="24" fill="${colors[1]}"/>
          <rect y="2.6" width="36" height="2.6" fill="${colors[0]}"/>
          <rect y="8" width="36" height="2.6" fill="${colors[0]}"/>
          <rect y="13.4" width="36" height="2.6" fill="${colors[0]}"/>
          <rect y="18.8" width="36" height="2.6" fill="${colors[0]}"/>
          <rect width="13.5" height="13.5" fill="${colors[0]}"/>
          <rect x="5" width="3.5" height="13.5" fill="${colors[1]}"/>
          <rect y="5" width="13.5" height="3.5" fill="${colors[1]}"/>`;
        break;

      // 10. UNITED STATES
      case 'usa_stripes':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <rect y="3.4" width="36" height="3.4" fill="${colors[1]}"/>
          <rect y="10.2" width="36" height="3.4" fill="${colors[1]}"/>
          <rect y="17" width="36" height="3.4" fill="${colors[1]}"/>
          <rect width="16" height="13.6" fill="${colors[2]}"/>
          <circle cx="4" cy="4" r="1" fill="#fff"/><circle cx="12" cy="4" r="1" fill="#fff"/>
          <circle cx="8" cy="7" r="1" fill="#fff"/><circle cx="4" cy="10" r="1" fill="#fff"/><circle cx="12" cy="10" r="1" fill="#fff"/>`;
        break;

      // 11. BRAZIL
      case 'brazil_rhombus':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <polygon points="18,3 33,12 18,21 3,12" fill="${colors[1]}"/>
          <circle cx="18" cy="12" r="5" fill="${colors[2]}"/>
          <path d="M 14,13 Q 18,10 22,12" stroke="#FFFFFF" stroke-width="1" fill="none"/>`;
        break;

      // 12. UNITED KINGDOM
      case 'union_jack':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <path d="M0,0 L36,24 M36,0 L0,24" stroke="${colors[1]}" stroke-width="4.5"/>
          <path d="M0,0 L36,24 M36,0 L0,24" stroke="${colors[2]}" stroke-width="2.5"/>
          <path d="M18,0 V24 M0,12 H36" stroke="${colors[1]}" stroke-width="6.5"/>
          <path d="M18,0 V24 M0,12 H36" stroke="${colors[2]}" stroke-width="3.5"/>`;
        break;

      // 13. CROSS NORDIC / DOUBLE
      case 'cross_nordic':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/><rect x="11" width="5" height="24" fill="${colors[1]}"/><rect y="9.5" width="36" height="5" fill="${colors[1]}"/>`;
        break;
      case 'cross_double':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/><rect x="10" width="7" height="24" fill="${colors[1]}"/><rect y="8.5" width="36" height="7" fill="${colors[1]}"/><rect x="11.5" width="4" height="24" fill="${colors[2]}"/><rect y="10" width="36" height="4" fill="${colors[2]}"/>`;
        break;
      case 'swiss_cross':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/><rect x="15" y="4" width="6" height="16" fill="${colors[1]}"/><rect x="9" y="9" width="18" height="6" fill="${colors[1]}"/>`;
        break;

      // 14. AUSTRALIA & NZ
      case 'australia_stars':
      case 'nz_stars':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <rect width="14" height="11" fill="#CC0000"/>
          <path d="M0,0 L14,11 M14,0 L0,11" stroke="#fff" stroke-width="1.8"/>
          <path d="M7,0 V11 M0,5.5 H14" stroke="#fff" stroke-width="2.6"/>
          ${getSvgStar(25, 6, 1.6, 0.7, colors[2] || '#FFFFFF')}
          ${getSvgStar(30, 11, 1.4, 0.6, colors[2] || '#FFFFFF')}
          ${getSvgStar(26, 17, 1.8, 0.8, colors[2] || '#FFFFFF')}
          ${getSvgStar(21, 13, 1.4, 0.6, colors[2] || '#FFFFFF')}`;
        break;

      // 15. CRESCENTS (TURKEY, PAKISTAN, ALGERIA, TUNISIA)
      case 'star_crescent':
      case 'vertical_crescent':
      case 'split_crescent':
      case 'crescent_circle': {
        const bg = type === 'split_crescent'
          ? `<rect width="18" height="24" fill="${colors[0]}"/><rect x="18" width="18" height="24" fill="${colors[1]}"/>`
          : type === 'vertical_crescent'
          ? `<rect width="9" height="24" fill="${colors[1]}"/><rect x="9" width="27" height="24" fill="${colors[0]}"/>`
          : `<rect width="36" height="24" fill="${colors[0]}"/>`;
        const cCol = colors[1] || '#FFFFFF';
        const maskCol = (type === 'split_crescent' || type === 'vertical_crescent') ? colors[1] : colors[0];
        innerSvg = `${bg}
          <circle cx="16" cy="12" r="6" fill="${cCol}"/>
          <circle cx="18" cy="12" r="5" fill="${maskCol}"/>
          ${getSvgStar(22, 12, 2.5, 1.1, cCol)}`;
        break;
      }

      // 16. TRIANGLES (PHILIPPINES, CUBA, CZECHIA, JORDAN, PALESTINE)
      case 'triangle_left':
      case 'triangle_left_star':
      case 'triangle_left_split':
      case 'triangle_stripes':
      case 'triangle_stripes_star':
        innerSvg = `<rect width="36" height="12" fill="${colors[0]}"/><rect y="12" width="36" height="12" fill="${colors[1]}"/>
          <polygon points="0,0 16,12 0,24" fill="${colors[2] || '#FFFFFF'}"/>
          ${(colors[3] || type === 'triangle_left_star' || type === 'triangle_stripes_star') ? getSvgStar(6, 12, 2.4, 1.0, colors[3] || '#FFFFFF') : ''}`;
        break;

      // 17. SPECIALS
      case 'canada_leaf':
        innerSvg = `<rect width="9" height="24" fill="${colors[0]}"/><rect x="9" width="18" height="24" fill="${colors[1]}"/><rect x="27" width="9" height="24" fill="${colors[0]}"/>${getSvgStar(18, 12, 5.5, 2.4, colors[0])}`;
        break;

      case 'saltire_cross':
        innerSvg = `<rect width="36" height="24" fill="${colors[0]}"/>
          <polygon points="0,0 36,0 18,12" fill="${colors[1]}"/>
          <polygon points="0,24 36,24 18,12" fill="${colors[1]}"/>
          <path d="M0,0 L36,24 M36,0 L0,24" stroke="${colors[2]}" stroke-width="3.5"/>`;
        break;

      case 'horizontal_3_chakra':
        innerSvg = `<rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[2]}"/>
          <circle cx="18" cy="12" r="3" fill="none" stroke="${colors[3]}" stroke-width="0.8"/><circle cx="18" cy="12" r="0.8" fill="${colors[3]}"/>`;
        break;

      case 'horizontal_3_sun':
        innerSvg = `<rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[0]}"/>
          <circle cx="18" cy="12" r="2.8" fill="${colors[2]}"/>`;
        break;

      case 'horizontal_3_star':
      case 'horizontal_3_stars':
        innerSvg = `<rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[2]}"/>
          ${getSvgStar(18, 12, 3.2, 1.4, colors[3] || '#FFE600')}`;
        break;

      case 'south_africa_y':
        innerSvg = `<rect width="36" height="12" fill="${colors[1]}"/><rect y="12" width="36" height="12" fill="${colors[2]}"/>
          <polygon points="0,0 14,12 0,24" fill="${colors[4] || '#000000'}"/>
          <path d="M0,0 L14,12 L36,12 M0,24 L14,12" stroke="${colors[0]}" stroke-width="4.5" fill="none"/>`;
        break;

      default:
        if (colors.length >= 3) {
          innerSvg = `<rect width="36" height="8" fill="${colors[0]}"/><rect y="8" width="36" height="8" fill="${colors[1]}"/><rect y="16" width="36" height="8" fill="${colors[2]}"/>`;
        } else if (colors.length === 2) {
          innerSvg = `<rect width="36" height="12" fill="${colors[0]}"/><rect y="12" width="36" height="12" fill="${colors[1]}"/>`;
        } else {
          innerSvg = `<rect width="36" height="24" fill="${colors[0] || country.primaryColor}"/>`;
        }
        break;
    }

    return `<svg viewBox="0 0 36 24" class="flag-icon">${innerSvg}<rect width="36" height="24" fill="none" stroke="#222" stroke-width="0.8"/></svg>`;
  },
};

export const FLAGS = Flags;
