/**
 * cardDrawer.ts
 * Renders a HealthMitra e-card directly onto a canvas using the Canvas 2D API.
 * This avoids html2canvas entirely, which fails with modern CSS color functions
 * like oklch() / lab() used by Tailwind v4.
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
}

const CARD_W = 860;
const CARD_H = 420;
const RADIUS = 20;
const TEAL_DARK = '#0f766e';
const TEAL_MID = '#0d9488';
const TEAL_LIGHT = '#14b8a6';
const TEAL_PALE = 'rgba(255,255,255,0.12)';
const WHITE = '#ffffff';
const WHITE_DIM = 'rgba(255,255,255,0.75)';
const WHITE_FAINT = 'rgba(255,255,255,0.4)';

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

function drawBackground(ctx: CanvasRenderingContext2D) {
    // Main gradient background
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, '#0f766e');
    grad.addColorStop(0.5, '#0d9488');
    grad.addColorStop(1, '#0891b2');
    roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
    ctx.fillStyle = grad;
    ctx.fill();

    // Decorative circles
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(CARD_W - 30, -60, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-30, CARD_H + 40, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.arc(CARD_W / 2, CARD_H / 2, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawHeader(ctx: CanvasRenderingContext2D, adminVerified: boolean) {
    // Logo text
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText('HEALTHMITRA', 36, 54);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('Your Health, Our Priority', 36, 74);

    // Status badge
    const badgeX = CARD_W - 200;
    const badgeY = 30;
    const badgeW = 160;
    const badgeH = 32;

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fillStyle = adminVerified ? '#4ade80' : '#fb923c';
    ctx.fill();

    ctx.fillStyle = adminVerified ? '#14532d' : '#431407';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(adminVerified ? '✓ Active' : '⚠ Pending Verification', badgeX + badgeW / 2, badgeY + 21);
    ctx.textAlign = 'left';
}

async function drawMemberPhoto(ctx: CanvasRenderingContext2D, photoUrl: string | undefined) {
    const photoX = 36;
    const photoY = 100;
    const photoW = 70;
    const photoH = 90;

    // Photo placeholder box
    roundRect(ctx, photoX, photoY, photoW, photoH, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
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
            roundRect(ctx, photoX, photoY, photoW, photoH, 10);
            ctx.clip();
            ctx.drawImage(img, photoX, photoY, photoW, photoH);
            ctx.restore();
        } catch {
            drawPersonIcon(ctx, photoX + photoW / 2, photoY + photoH / 2);
        }
    } else {
        drawPersonIcon(ctx, photoX + photoW / 2, photoY + photoH / 2);
    }
}

function drawPersonIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 32, 26, 0, Math.PI);
    ctx.fill();
}

function drawMemberInfo(ctx: CanvasRenderingContext2D, card: CardData) {
    const startX = 128;
    const startY = 108;

    // Name
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillText(card.name.toUpperCase(), startX, startY);

    // IDs
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Card ID:', startX, startY + 22);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(card.cardUniqueId, startX + 48, startY + 22);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Member ID:', startX, startY + 38);
    ctx.fillStyle = WHITE;
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText(card.memberId, startX + 66, startY + 38);
}

function drawInfoGrid(ctx: CanvasRenderingContext2D, card: CardData) {
    const gridX = 36;
    const gridY = 210;
    const gridW = 360;
    const gridH = 80;

    // Info panel
    roundRect(ctx, gridX, gridY, gridW, gridH, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cells = [
        { label: 'DOB', value: card.dob || 'N/A' },
        { label: 'Age', value: `${card.age || 'N/A'} yrs` },
        { label: 'Gender', value: card.gender === 'M' ? 'Male' : card.gender === 'F' ? 'Female' : 'Other' },
        { label: 'Blood Group', value: card.bloodGroup || 'N/A' },
        { label: 'Relation', value: card.relation || 'N/A' },
    ];

    const colW = gridW / 3;
    cells.forEach((cell, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = gridX + col * colW + 12;
        const cy = gridY + row * 42 + 20;

        ctx.fillStyle = 'rgba(153,246,228,0.9)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.fillText(cell.label.toUpperCase(), cx, cy);

        ctx.fillStyle = WHITE;
        ctx.font = `bold ${cell.label === 'Blood Group' ? '15' : '12'}px Inter, system-ui, sans-serif`;
        ctx.fillText(cell.value, cx, cy + 16);
    });
}

function drawRightColumn(ctx: CanvasRenderingContext2D, card: CardData, formattedCoverage: string) {
    const rightX = 430;
    const rightY = 100;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rightX - 20, 90);
    ctx.lineTo(rightX - 20, CARD_H - 30);
    ctx.stroke();

    // Plan
    ctx.fillStyle = 'rgba(153,246,228,0.9)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('PLAN', rightX, rightY);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(card.planName.toUpperCase(), rightX, rightY + 18);

    // Coverage
    ctx.fillStyle = 'rgba(153,246,228,0.9)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('COVERAGE', rightX, rightY + 42);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(formattedCoverage, rightX, rightY + 60);

    // Validity box
    const vX = rightX;
    const vY = rightY + 80;
    const vW = CARD_W - rightX - 120;
    const vH = 68;
    roundRect(ctx, vX, vY, vW, vH, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(153,246,228,0.9)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('VALIDITY', vX + 12, vY + 18);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('From:', vX + 12, vY + 38);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(card.validFrom || 'N/A', vX + 48, vY + 38);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Till:', vX + 12, vY + 56);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(card.validTill || 'N/A', vX + 40, vY + 56);

    // 24/7 support badge
    const s24X = rightX;
    const s24Y = vY + vH + 16;

    roundRect(ctx, s24X, s24Y, 40, 24, 6);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.fillStyle = '#713f12';
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('24/7', s24X + 20, s24Y + 16);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('Helpline', s24X + 48, s24Y + 11);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillText(card.emergencyContact || '1800-XXX-XXXX', s24X + 48, s24Y + 24);

    // QR placeholder
    const qrX = CARD_W - 100;
    const qrY = s24Y - 4;
    roundRect(ctx, qrX, qrY, 56, 56, 8);
    ctx.fillStyle = WHITE;
    ctx.fill();
    roundRect(ctx, qrX + 4, qrY + 4, 48, 48, 6);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR', qrX + 28, qrY + 31);
    ctx.textAlign = 'left';
}

function drawFooter(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, CARD_H - 42);
    ctx.lineTo(CARD_W - 36, CARD_H - 42);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HealthMitra Healthcare — This is a computer-generated card and is valid only when verified by admin.', CARD_W / 2, CARD_H - 18);
    ctx.textAlign = 'left';
}

export async function drawCardToCanvas(card: CardData): Promise<HTMLCanvasElement> {
    const coverageAmount = card.coverageAmount ?? 0;
    const formattedCoverage = coverageAmount > 0
        ? `$${coverageAmount.toLocaleString('en-US')}`
        : '$0';

    const canvas = document.createElement('canvas');
    // 2x scale for retina/print quality
    canvas.width = CARD_W * 2;
    canvas.height = CARD_H * 2;
    canvas.style.width = `${CARD_W}px`;
    canvas.style.height = `${CARD_H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    drawBackground(ctx);
    ctx.restore();

    drawBackground(ctx);
    drawHeader(ctx, card.adminVerified);
    await drawMemberPhoto(ctx, card.photoUrl);
    drawMemberInfo(ctx, card);
    drawInfoGrid(ctx, card);
    drawRightColumn(ctx, card, formattedCoverage);
    drawFooter(ctx);

    return canvas;
}

export async function downloadCardAsImage(card: CardData, filename: string): Promise<void> {
    const canvas = await drawCardToCanvas(card);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}

export async function downloadCardAsPDF(card: CardData, filename: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const canvas = await drawCardToCanvas(card);
    const imgData = canvas.toDataURL('image/png', 1.0);

    // A4 landscape
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Maintain aspect ratio, centered on page
    const cardAspect = CARD_W / CARD_H;
    let drawW = pageW - 20;
    let drawH = drawW / cardAspect;
    if (drawH > pageH - 20) {
        drawH = pageH - 20;
        drawW = drawH * cardAspect;
    }
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
    pdf.save(`${filename}.pdf`);
}

export function buildCardEmailHTML(card: CardData): string {
    const coverageAmount = card.coverageAmount ?? 0;
    const formattedCoverage = coverageAmount > 0
        ? `$${coverageAmount.toLocaleString('en-US')}`
        : '$0';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>HealthMitra E-Card – ${card.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 40px 20px; }
  .wrapper { max-width: 700px; margin: 0 auto; }
  .card {
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #0891b2 100%);
    border-radius: 20px; padding: 40px; color: #fff;
    box-shadow: 0 20px 60px rgba(13,148,136,0.35);
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
  .logo sub { font-size: 11px; font-weight: 400; opacity: 0.75; display: block; }
  .badge { padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .badge.active { background: #4ade80; color: #14532d; }
  .badge.pending { background: #fb923c; color: #431407; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.65; margin-bottom: 4px; }
  .section-value { font-size: 15px; font-weight: 700; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; margin: 24px 0; }
  .validity-box { background: rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
  .member-name { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .meta { font-size: 11px; opacity: 0.7; margin-bottom: 2px; }
  .meta span { font-weight: 600; opacity: 1; font-family: monospace; }
  .footer-note { margin-top: 32px; font-size: 11px; opacity: 0.5; text-align: center; }
  .support { margin-top: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; font-size: 13px; }
  .badge-24 { display: inline-block; background: #facc15; color: #713f12; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 5px; margin-right: 8px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="logo">HEALTHMITRA <sub>Your Health, Our Priority</sub></div>
      <div class="badge ${card.adminVerified ? 'active' : 'pending'}">${card.adminVerified ? '✓ Active' : '⚠ Pending Verification'}</div>
    </div>

    <div class="member-name">${card.name}</div>
    <p class="meta">Card ID: <span>${card.cardUniqueId}</span></p>
    <p class="meta">Member ID: <span>${card.memberId}</span></p>

    <div class="info-grid">
      <div><div class="section-title">DOB</div><div class="section-value" style="font-size:13px">${card.dob || 'N/A'}</div></div>
      <div><div class="section-title">Age</div><div class="section-value" style="font-size:13px">${card.age || 'N/A'} yrs</div></div>
      <div><div class="section-title">Gender</div><div class="section-value" style="font-size:13px">${card.gender === 'M' ? 'Male' : card.gender === 'F' ? 'Female' : 'Other'}</div></div>
      <div><div class="section-title">Blood Group</div><div class="section-value" style="font-size:20px">${card.bloodGroup || 'N/A'}</div></div>
      <div style="grid-column:span 2"><div class="section-title">Relation</div><div class="section-value" style="font-size:13px">${card.relation}</div></div>
    </div>

    <div class="grid">
      <div>
        <div class="section-title">Plan</div>
        <div class="section-value">${card.planName.toUpperCase()}</div>
        <div class="section-title" style="margin-top:12px">Coverage</div>
        <div class="section-value">${formattedCoverage}</div>
      </div>
      <div class="validity-box">
        <div class="section-title">VALIDITY</div>
        <div style="font-size:13px; margin-top:8px">From: <strong>${card.validFrom || 'N/A'}</strong></div>
        <div style="font-size:13px; margin-top:4px">Till: <strong>${card.validTill || 'N/A'}</strong></div>
      </div>
    </div>

    <div class="support">
      <span class="badge-24">24/7</span>
      Emergency Helpline: <strong>${card.emergencyContact || '1800-XXX-XXXX'}</strong>
      &nbsp;|&nbsp; support@healthmitra.com &nbsp;|&nbsp; www.healthmitra.com
    </div>

    <p class="footer-note">This is a system-generated e-card issued by HealthMitra. Valid only with admin verification.</p>
  </div>
</div>
</body>
</html>`;
}
