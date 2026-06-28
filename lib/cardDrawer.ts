/**
 * cardDrawer.ts
 * Renders HealthMitra e-cards (front + back) onto canvas using Canvas 2D API.
 * Avoids html2canvas which breaks with Tailwind v4 oklch() colors.
 */

export interface CardData {
    name: string;
    memberId: string;
    cardUniqueId: string;
    relation: string;
    dob: string;
    age: number;
    gender: string;
    bloodGroup: string;
    planName: string;
    coverageAmount: number;
    validFrom: string;
    validTill: string;
    emergencyContact: string;
    adminVerified: boolean;
    photoUrl?: string;
    planFeatures?: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CARD_W = 860;
const CARD_H = 480;
const RADIUS = 20;
const WHITE = '#ffffff';

// ─── Utilities ───────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRONT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function drawFrontBackground(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, '#0f766e');
    grad.addColorStop(0.5, '#0d9488');
    grad.addColorStop(1, '#0891b2');
    roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
    ctx.fillStyle = grad;
    ctx.fill();

    // Decorative circles
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = WHITE;
    ctx.beginPath(); ctx.arc(CARD_W - 40, -80, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-40, CARD_H + 60, 170, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.04;
    ctx.beginPath(); ctx.arc(CARD_W / 2, CARD_H / 2, 130, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawFrontHeader(ctx: CanvasRenderingContext2D, adminVerified: boolean) {
    // Brand
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText('HEALTHMITRA', 36, 54);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Your Health, Our Priority', 36, 74);

    // Status badge
    const bx = CARD_W - 180, by = 30, bw = 150, bh = 30;
    roundRect(ctx, bx, by, bw, bh, 15);
    ctx.fillStyle = adminVerified ? '#4ade80' : '#fbbf24';
    ctx.fill();
    ctx.fillStyle = adminVerified ? '#14532d' : '#78350f';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(adminVerified ? '✓  Active' : '⚠  Pending Verification', bx + bw / 2, by + 20);
    ctx.textAlign = 'left';
}

async function drawMemberPhoto(ctx: CanvasRenderingContext2D, photoUrl: string | undefined) {
    const px = 36, py = 100, pw = 74, ph = 96;

    roundRect(ctx, px, py, pw, ph, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (photoUrl) {
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = photoUrl;
            });
            ctx.save();
            roundRect(ctx, px, py, pw, ph, 10);
            ctx.clip();
            ctx.drawImage(img, px, py, pw, ph);
            ctx.restore();
        } catch {
            drawPersonIcon(ctx, px + pw / 2, py + ph / 2);
        }
    } else {
        drawPersonIcon(ctx, px + pw / 2, py + ph / 2);
    }
}

function drawPersonIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy - 16, 17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + 34, 28, 0, Math.PI); ctx.fill();
}

function drawMemberInfo(ctx: CanvasRenderingContext2D, card: CardData) {
    const sx = 128, sy = 108;

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText(card.name.toUpperCase(), sx, sy);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Card ID:', sx, sy + 24);
    ctx.fillStyle = '#fcd34d';  // amber-300 to match front card
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText(card.cardUniqueId, sx + 50, sy + 24);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Member ID:', sx, sy + 40);
    ctx.fillStyle = '#fcd34d';  // amber-300 to match front card
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText(card.memberId, sx + 68, sy + 40);
}

function drawInfoGrid(ctx: CanvasRenderingContext2D, card: CardData) {
    const gx = 36, gy = 215, gw = 390, gh = 90;

    roundRect(ctx, gx, gy, gw, gh, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cells = [
        { label: 'DOB', value: card.dob || 'N/A' },
        { label: 'Age', value: card.age ? `${card.age} yrs` : 'N/A' },
        { label: 'Gender', value: card.gender === 'M' ? 'Male' : card.gender === 'F' ? 'Female' : (card.gender || 'N/A') },
        { label: 'Blood Group', value: card.bloodGroup || '—' },
        { label: 'Relation', value: card.relation || 'N/A' },
    ];

    const colW = gw / 3;
    cells.forEach((cell, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = gx + col * colW + 14;
        const cy = gy + row * 46 + 22;

        ctx.fillStyle = 'rgba(153,246,228,0.9)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.fillText(cell.label.toUpperCase(), cx, cy);

        ctx.fillStyle = WHITE;
        const isBG = cell.label === 'Blood Group';
        ctx.font = `bold ${isBG ? '18' : '12'}px Inter, system-ui, sans-serif`;
        if (isBG) ctx.fillStyle = '#fca5a5'; // light red for blood group emphasis
        ctx.fillText(cell.value, cx, cy + (isBG ? 20 : 16));
        if (isBG) ctx.fillStyle = WHITE;
    });
}

function drawRightPanel(ctx: CanvasRenderingContext2D, card: CardData) {
    const rx = 460, ry = 100;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rx - 22, 88);
    ctx.lineTo(rx - 22, CARD_H - 32);
    ctx.stroke();

    // Plan
    ctx.fillStyle = 'rgba(153,246,228,0.85)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('PLAN', rx, ry);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(card.planName.toUpperCase(), rx, ry + 18);

    // Coverage — always "No Limit"
    ctx.fillStyle = 'rgba(153,246,228,0.85)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('COVERAGE', rx, ry + 44);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText('No Limit', rx, ry + 62);

    // Validity box
    const vx = rx, vy = ry + 84, vw = CARD_W - rx - 100, vh = 74;
    roundRect(ctx, vx, vy, vw, vh, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(153,246,228,0.85)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('VALIDITY PERIOD', vx + 14, vy + 20);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('From:', vx + 14, vy + 40);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(card.validFrom || 'N/A', vx + 52, vy + 40);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Till:', vx + 14, vy + 58);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(card.validTill || 'N/A', vx + 42, vy + 58);

}


function drawFrontFooter(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, CARD_H - 42);
    ctx.lineTo(CARD_W - 36, CARD_H - 42);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HealthMitra Healthcare — This is a computer-generated card. Valid only when verified by admin.', CARD_W / 2, CARD_H - 18);
    ctx.textAlign = 'left';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACK CARD
// ═══════════════════════════════════════════════════════════════════════════════

function drawBackCard(ctx: CanvasRenderingContext2D, card: CardData) {
    // White background
    roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top header strip
    const headerH = 56;
    roundRect(ctx, 0, 0, CARD_W, headerH, RADIUS);
    const headerGrad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    headerGrad.addColorStop(0, '#0f766e');
    headerGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = headerGrad;
    ctx.fill();

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText('HEALTHMITRA', 36, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Plan Benefits & Contacts', 36, 44);

    // Admin verified badge on header
    const bv = card.adminVerified;
    const bBg = bv ? '#4ade80' : '#fbbf24';
    const bFg = bv ? '#14532d' : '#78350f';
    roundRect(ctx, CARD_W - 170, 14, 140, 28, 14);
    ctx.fillStyle = bBg;
    ctx.fill();
    ctx.fillStyle = bFg;
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bv ? '✓  Verified by Admin' : '⚠  Pending Verification', CARD_W - 100, 33);
    ctx.textAlign = 'left';

    // BENEFITS column
    const bx = 36, by = 78;
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.fillText('KEY BENEFITS', bx, by);

    const defaultBenefits = [
        'OPD Coverage – Unlimited as per Plan',
        'Unlimited Diagnostic Tests – 30% to 50% discount',
        'Medicine Home Delivery on 30% discount',
        'Free Annual Health Checkup (1 per member)',
        'Unlimited Telemedicine Consultations',
        'Emergency Ambulance Service',
    ];
    const benefits = (card.planFeatures && card.planFeatures.length > 0) ? card.planFeatures : defaultBenefits;

    ctx.font = '11px Inter, system-ui, sans-serif';
    let curY = by + 20;
    const maxBenefitY = CARD_H - 60;
    for (const benefit of benefits) {
        if (curY >= maxBenefitY) break;
        // Check mark
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillText('✓', bx, curY);
        // Text
        ctx.fillStyle = '#334155';
        ctx.font = '11px Inter, system-ui, sans-serif';
        const nextY = wrapText(ctx, benefit, bx + 18, curY, 340, 16);
        curY = nextY + 22;
    }

    // DIVIDER
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(420, 70);
    ctx.lineTo(420, CARD_H - 36);
    ctx.stroke();

    // RIGHT PANEL — Plan details
    const rx = 440, ry = 78;

    // Plan card box
    roundRect(ctx, rx, ry, CARD_W - rx - 30, 90, 12);
    const planGrad = ctx.createLinearGradient(rx, ry, rx, ry + 90);
    planGrad.addColorStop(0, '#0d9488');
    planGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = planGrad;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('ACTIVE PLAN', rx + 14, ry + 18);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(card.planName, rx + 14, ry + 36);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('Coverage: ', rx + 14, ry + 56);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText('No Limit', rx + 66, ry + 56);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText(`Valid: ${card.validFrom}  →  ${card.validTill}`, rx + 14, ry + 74);

    // SUPPORT section
    const sy = ry + 110;
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.fillText('SUPPORT', rx, sy);

    const contacts = [
        { icon: '📞', label: '9818823106' },
        { icon: '✉', label: 'service@healthmitraus.com' },
        { icon: '🌐', label: 'www.healthmitraus.com' },
    ];

    let cy2 = sy + 20;
    for (const c of contacts) {
        // Icon circle
        roundRect(ctx, rx, cy2 - 14, 24, 24, 6);
        ctx.fillStyle = '#f0fdfa';
        ctx.fill();
        ctx.strokeStyle = '#99f6e4';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#134e4a';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.icon, rx + 12, cy2 + 2);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#334155';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillText(c.label, rx + 32, cy2 + 2);
        cy2 += 34;
    }

    // Bottom footer line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, CARD_H - 36);
    ctx.lineTo(CARD_W - 36, CARD_H - 36);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('This is a system-generated e-card issued by HealthMitra. Valid only with admin verification.', CARD_W / 2, CARD_H - 16);
    ctx.textAlign = 'left';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC DRAW FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function drawFrontToCanvas(card: CardData): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W * 2;
    canvas.height = CARD_H * 2;
    canvas.style.width = `${CARD_W}px`;
    canvas.style.height = `${CARD_H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    drawFrontBackground(ctx);
    ctx.restore();

    drawFrontBackground(ctx);
    drawFrontHeader(ctx, card.adminVerified);
    await drawMemberPhoto(ctx, card.photoUrl);
    drawMemberInfo(ctx, card);
    drawInfoGrid(ctx, card);
    drawRightPanel(ctx, card);
    drawFrontFooter(ctx);

    return canvas;
}

export async function drawBackToCanvas(card: CardData): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W * 2;
    canvas.height = CARD_H * 2;
    canvas.style.width = `${CARD_W}px`;
    canvas.style.height = `${CARD_H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    drawBackCard(ctx, card);
    return canvas;
}

/** @deprecated Use drawFrontToCanvas instead */
export async function drawCardToCanvas(card: CardData): Promise<HTMLCanvasElement> {
    return drawFrontToCanvas(card);
}

// ─── Download: Image (front + back stacked) ───────────────────────────────────
export async function downloadCardAsImage(card: CardData, filename: string): Promise<void> {
    const [frontCanvas, backCanvas] = await Promise.all([
        drawFrontToCanvas(card),
        drawBackToCanvas(card),
    ]);

    // Combine both into one tall image
    const combined = document.createElement('canvas');
    const gap = 40; // px gap between cards
    combined.width = CARD_W * 2;
    combined.height = CARD_H * 4 + gap * 2;

    const ctx = combined.getContext('2d')!;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, combined.width, combined.height);

    // Front
    ctx.drawImage(frontCanvas, 0, gap);
    // Back
    ctx.drawImage(backCanvas, 0, CARD_H * 2 + gap * 2);

    const link = document.createElement('a');
    link.download = `${filename}_front_back.png`;
    link.href = combined.toDataURL('image/png', 1.0);
    link.click();
}

// ─── Download: PDF (front + back on 2 pages) ─────────────────────────────────
export async function downloadCardAsPDF(card: CardData, filename: string): Promise<void> {
    const { jsPDF } = await import('jspdf');

    const [frontCanvas, backCanvas] = await Promise.all([
        drawFrontToCanvas(card),
        drawBackToCanvas(card),
    ]);

    const frontImg = frontCanvas.toDataURL('image/png', 1.0);
    const backImg = backCanvas.toDataURL('image/png', 1.0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const cardAspect = CARD_W / CARD_H;
    let drawW = pageW - 20;
    let drawH = drawW / cardAspect;
    if (drawH > pageH - 20) {
        drawH = pageH - 20;
        drawW = drawH * cardAspect;
    }
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    // Page 1: Front
    pdf.addImage(frontImg, 'PNG', x, y, drawW, drawH);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('Front Side', x, y - 3);

    // Page 2: Back
    pdf.addPage();
    pdf.addImage(backImg, 'PNG', x, y, drawW, drawH);
    pdf.text('Back Side', x, y - 3);

    pdf.save(`${filename}.pdf`);
}

// ─── Build email HTML (front only) ───────────────────────────────────────────
export function buildCardEmailHTML(card: CardData): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>HealthMitra E-Card – ${card.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 40px 20px; }
  .wrapper { max-width: 700px; margin: 0 auto; }
  .card { background: linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #0891b2 100%); border-radius: 20px; padding: 36px; color: #fff; box-shadow: 0 20px 60px rgba(13,148,136,0.35); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .logo { font-size: 24px; font-weight: 800; letter-spacing: 1px; }
  .logo sub { font-size: 11px; font-weight: 400; opacity: 0.7; display: block; }
  .badge { padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge.active { background: #4ade80; color: #14532d; }
  .badge.pending { background: #fbbf24; color: #78350f; }
  .member-row { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px; }
  .photo-box { width: 72px; height: 90px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.3); overflow: hidden; background: rgba(255,255,255,0.15); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .member-name { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .meta { font-size: 10px; opacity: 0.7; margin-bottom: 2px; }
  .meta span { font-weight: 600; opacity: 1; font-family: monospace; }
  .info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; background: rgba(255,255,255,0.11); border-radius: 12px; padding: 14px; margin: 16px 0; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.65; margin-bottom: 3px; }
  .value { font-size: 12px; font-weight: 700; }
  .blood-value { font-size: 18px; font-weight: 900; color: #fca5a5; }
  .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .plan-box { }
  .validity-box { background: rgba(255,255,255,0.11); border-radius: 12px; padding: 14px; }
  .footer-note { margin-top: 24px; font-size: 10px; opacity: 0.45; text-align: center; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="logo">HEALTHMITRA <sub>Your Health, Our Priority</sub></div>
      <div class="badge ${card.adminVerified ? 'active' : 'pending'}">${card.adminVerified ? '✓ Active' : '⚠ Pending Verification'}</div>
    </div>
    <div class="member-row">
      <div class="photo-box">
        ${card.photoUrl ? `<img src="${card.photoUrl}" alt="${card.name}" />` : '<span style="font-size:28px;color:rgba(255,255,255,0.4)">👤</span>'}
      </div>
      <div>
        <div class="member-name">${card.name}</div>
        <p class="meta">Card ID: <span>${card.cardUniqueId}</span></p>
        <p class="meta">Member ID: <span>${card.memberId}</span></p>
      </div>
    </div>
    <div class="info-grid">
      <div><div class="label">DOB</div><div class="value" style="font-size:11px">${card.dob || 'N/A'}</div></div>
      <div><div class="label">Age</div><div class="value">${card.age || 'N/A'} yrs</div></div>
      <div><div class="label">Gender</div><div class="value">${card.gender === 'M' ? 'Male' : card.gender === 'F' ? 'Female' : 'Other'}</div></div>
      <div><div class="label">Blood Group</div><div class="blood-value">${card.bloodGroup || '—'}</div></div>
      <div><div class="label">Relation</div><div class="value">${card.relation}</div></div>
    </div>
    <div class="grid-2col">
      <div class="plan-box">
        <div class="label">Plan</div>
        <div class="value" style="font-size:15px">${card.planName.toUpperCase()}</div>
        <div class="label" style="margin-top:12px">Coverage</div>
        <div class="value" style="font-size:15px">No Limit</div>
      </div>
      <div class="validity-box">
        <div class="label">VALIDITY PERIOD</div>
        <div style="font-size:12px; margin-top:8px">From: <strong>${card.validFrom || 'N/A'}</strong></div>
        <div style="font-size:12px; margin-top:4px">Till: <strong>${card.validTill || 'N/A'}</strong></div>
      </div>
    </div>
    <p class="footer-note">This is a system-generated e-card issued by HealthMitra. Valid only with admin verification.</p>
  </div>
</div>
</body>
</html>`;
}
