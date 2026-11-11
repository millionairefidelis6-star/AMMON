import { Member, NewsArticle } from '../types';

/**
 * Trigger browser file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Trigger printable window for formatted HTML documents
 */
export function printHtmlDocument(htmlContent: string, title: string) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    // Fallback: download as HTML file
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${title.replace(/\s+/g, '_')}.html`);
    return;
  }
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generate and download high-resolution PNG image of the Digital ID Card (300 DPI card format)
 */
export async function downloadDigitalCardPng(member: Member) {
  const canvas = document.createElement('canvas');
  canvas.width = 1012; // 3.375" at 300 DPI
  canvas.height = 638; // 2.125" at 300 DPI
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient: Primary Green #176B37 to Secondary Green #14532D
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.5, '#F4F9F6');
  bgGrad.addColorStop(1, '#EAF3ED');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Border in Primary Green #176B37
  ctx.strokeStyle = '#176B37';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

  // Top Institutional Header Band
  ctx.fillStyle = '#176B37';
  ctx.fillRect(14, 14, canvas.width - 28, 110);

  // Top header text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('AMMON NIGERIA', 140, 62);

  ctx.fillStyle = '#EAF3ED';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('ASSOCIATION OF MOBILE MONEY OPERATORS OF NIGERIA', 140, 94);

  // Status Badge in Top Right
  ctx.fillStyle = '#14532D';
  ctx.beginPath();
  ctx.roundRect(canvas.width - 210, 40, 175, 45, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('VERIFIED ACTIVE', canvas.width - 195, 68);

  // Logo emblem circle on top left
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(75, 69, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#176B37';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AM', 75, 78);
  ctx.textAlign = 'left';

  // Photo Box on Left
  const photoX = 50;
  const photoY = 160;
  const photoW = 220;
  const photoH = 280;

  // Photo border & background
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeStyle = '#176B37';
  ctx.lineWidth = 6;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Inner photo placeholder / silhouette
  ctx.fillStyle = '#14532D';
  ctx.beginPath();
  ctx.arc(photoX + photoW / 2, photoY + 100, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(photoX + photoW / 2, photoY + 270, 95, Math.PI, 0);
  ctx.fill();

  // Photo Badge
  ctx.fillStyle = '#176B37';
  ctx.fillRect(photoX, photoY + photoH - 40, photoW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFIED OPERATOR', photoX + photoW / 2, photoY + photoH - 14);
  ctx.textAlign = 'left';

  // Member Information Details
  const infoX = 310;
  let infoY = 175;

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('FULL LEGAL NAME', infoX, infoY);
  infoY += 32;

  ctx.fillStyle = '#252525';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(member.fullName.toUpperCase(), infoX, infoY);
  infoY += 45;

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('REGISTERED BUSINESS NAME', infoX, infoY);
  infoY += 28;

  ctx.fillStyle = '#14532D';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(member.businessName, infoX, infoY);
  infoY += 45;

  // Grid of fields: Membership ID, State Chapter, Category
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MEMBERSHIP NO.', infoX, infoY);
  ctx.fillText('STATE & LGA', infoX + 260, infoY);
  infoY += 26;

  ctx.fillStyle = '#176B37';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(member.membershipId, infoX, infoY);

  ctx.fillStyle = '#252525';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`${member.state} (${member.lga})`, infoX + 260, infoY);
  infoY += 40;

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('PRIMARY TERMINAL S/N', infoX, infoY);
  ctx.fillText('VALIDITY EXPIRY', infoX + 260, infoY);
  infoY += 26;

  ctx.fillStyle = '#252525';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(member.terminalSerialNumber, infoX, infoY);

  ctx.fillStyle = '#176B37';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(member.expiryDate, infoX + 260, infoY);

  // Bottom Footer Ribbon
  ctx.fillStyle = '#14532D';
  ctx.fillRect(14, canvas.height - 100, canvas.width - 28, 86);

  // QR Code Area on bottom right
  const qrX = canvas.width - 130;
  const qrY = canvas.height - 94;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX, qrY, 74, 74);

  // Mini simulated QR pattern in green #176B37
  ctx.fillStyle = '#176B37';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if ((r + c * 3) % 2 === 0 || (r < 2 && c < 2) || (r > 4 && c < 2) || (r < 2 && c > 4)) {
        ctx.fillRect(qrX + 6 + c * 9, qrY + 6 + r * 9, 8, 8);
      }
    }
  }

  // Footer text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CENTRAL BANK OF NIGERIA & AMMON REGULATORY CHARTER', 40, canvas.height - 58);
  ctx.fillStyle = '#EAF3ED';
  ctx.font = '500 13px sans-serif';
  ctx.fillText('Official Injunction FHC/L/CS/2023/1844: Exempt from unauthorized council taxes.', 40, canvas.height - 32);

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `AMMON_Digital_ID_${member.membershipId}.png`);
    }
  }, 'image/png');
}

/**
 * Print Digital Membership Card with full high-resolution Front & Back Layout
 */
export function printDigitalCardDocument(member: Member) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AMMON Official Digital Membership Card - ${member.fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #252525; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #176B37; padding-bottom: 12px; margin-bottom: 25px; }
    .header h1 { color: #176B37; margin: 0; font-size: 22px; }
    .header p { color: #555; margin: 4px 0 0; font-size: 13px; }
    .card-wrap { display: flex; flex-direction: column; align-items: center; gap: 30px; margin: 20px 0; }
    .card { width: 440px; height: 275px; border-radius: 16px; border: 2px solid #176B37; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: #fff; page-break-inside: avoid; }
    .card-top { background: #176B37; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .card-top h3 { margin: 0; font-size: 14px; letter-spacing: 0.5px; }
    .card-top p { margin: 2px 0 0; font-size: 10px; color: #EAF3ED; }
    .badge { background: #14532D; color: #fff; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: bold; }
    .card-body { padding: 12px 16px; display: flex; gap: 14px; }
    .photo-box { width: 85px; height: 110px; border: 2px solid #176B37; border-radius: 8px; background: #EAF3ED; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: #176B37; text-align: center; overflow: hidden; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .info-box { flex: 1; }
    .label { font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .val { font-size: 13px; font-weight: 800; color: #252525; margin-bottom: 8px; }
    .val-highlight { font-size: 12px; font-weight: 700; color: #176B37; font-family: monospace; }
    .card-foot { background: #EAF3ED; padding: 8px 16px; position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #c7e0cf; }
    .card-foot p { margin: 0; font-size: 9px; color: #14532D; font-weight: 600; }
    .card-back { background: linear-gradient(135deg, #14532D, #176B37); color: #fff; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; }
    .mag-stripe { height: 32px; background: #111; margin: -16px -16px 12px -16px; }
    .back-clause { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; font-size: 9px; line-height: 1.4; color: #EAF3ED; }
    .instructions { margin-top: 30px; padding: 15px; background: #EAF3ED; border-radius: 12px; border: 1px solid #176B37; font-size: 11px; line-height: 1.5; }
    .no-print { text-align: center; margin-bottom: 20px; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">Print Official Card</button>
  </div>

  <div class="header">
    <h1>ASSOCIATION OF MOBILE MONEY OPERATORS OF NIGERIA (AMMON)</h1>
    <p>National Secretariat: Plot 14, Commercial Avenue, Yaba, Lagos | CAC/IT/NO/129481 | Recognized by Central Bank of Nigeria</p>
  </div>

  <div class="card-wrap">
    <!-- FRONT -->
    <div class="card">
      <div class="card-top">
        <div>
          <h3>AMMON NIGERIA</h3>
          <p>Official Digital Operator Credential</p>
        </div>
        <div class="badge">ACTIVE MEMBER</div>
      </div>
      <div class="card-body">
        <div class="photo-box">
          <img src="${member.photoUrl || '/assets/images/ammon_hero_pos_agent_1794380620175.jpg'}" alt="${member.fullName}" />
        </div>
        <div class="info-box">
          <div class="label">Operator Name</div>
          <div class="val">${member.fullName}</div>
          <div class="label">Registered Outlet</div>
          <div class="val" style="color:#14532D; font-size:12px;">${member.businessName}</div>
          <div style="display:flex; justify-content:space-between;">
            <div>
              <div class="label">Membership No.</div>
              <div class="val-highlight">${member.membershipId}</div>
            </div>
            <div>
              <div class="label">State Chapter</div>
              <div class="val" style="font-size:11px;">${member.state} (${member.lga})</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-foot">
        <p>Terminal S/N: ${member.terminalSerialNumber} (${member.terminalProvider})</p>
        <p>EXP: ${member.expiryDate}</p>
      </div>
    </div>

    <!-- BACK -->
    <div class="card card-back">
      <div>
        <div class="mag-stripe"></div>
        <h4 style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Official Protection & Exemption Notice</h4>
        <div class="back-clause">
          This digital identity confirms that the bearer is a certified banking agent recognized under Central Bank of Nigeria agent banking regulatory guidelines. Under Federal High Court Order FHC/L/CS/2023/1844, this operator is legally exempt from daily municipal ticket levies and unauthorized kiosk harassment.
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:9px; border-top:1px solid rgba(255,255,255,0.2); padding-top:6px;">
        <div>
          <strong>Emergency Helpline:</strong><br>
          +234 (0) 800 266 6664 | info@ammon.ng
        </div>
        <div style="text-align:right;">
          <em>Babaginda O. S.</em><br>
          National Secretary General
        </div>
      </div>
    </div>
  </div>

  <div class="instructions">
    <strong>Display Instructions for Kiosk Operators:</strong><br>
    Cut out and laminate this card. Keep one copy in your wallet and display one visibly on your POS service counter. If approached by municipal revenue collectors or unauthorized taskforces, present this credential alongside the official Court Injunction Notice.
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Card_${member.membershipId}`);
}

/**
 * Generate and download official 2025 Kiosk Tariff Poster (Mandatory display)
 */
export function downloadKioskTariffPoster(member: Member) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AMMON Approved Kiosk Tariff Advisory Board 2025</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #252525; margin: 0; padding: 24px; text-align: center; }
    .banner { background: #176B37; color: #fff; padding: 18px 24px; border-radius: 12px; margin-bottom: 20px; }
    .banner h1 { margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 0.5px; }
    .banner p { margin: 6px 0 0; font-size: 13px; color: #EAF3ED; font-weight: 500; }
    .operator-strip { background: #EAF3ED; border: 2px dashed #176B37; padding: 12px 20px; border-radius: 10px; margin-bottom: 24px; display: flex; justify-content: space-around; font-size: 13px; }
    .operator-strip strong { color: #14532D; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { background: #14532D; color: #fff; padding: 12px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
    td { padding: 12px; border: 1px solid #E5E7EB; }
    tr:nth-child(even) { background: #F9FBFA; }
    .fee { font-weight: 800; color: #176B37; font-size: 16px; font-family: monospace; }
    .notice { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; padding: 14px; border-radius: 10px; font-size: 12px; text-align: left; line-height: 1.5; margin-bottom: 20px; }
    .footer { font-size: 11px; color: #666; border-top: 1px solid #E5E7EB; padding-top: 12px; display: flex; justify-content: space-between; }
    .no-print { margin-bottom: 16px; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">Print Kiosk Tariff Poster</button>
  </div>

  <div class="banner">
    <h1>CENTRAL BANK OF NIGERIA & AMMON</h1>
    <p>APPROVED UNIFIED AGENT BANKING TARIFF & CONSUMER PROTECTION SCHEDULE (2025/2026)</p>
  </div>

  <div class="operator-strip">
    <div>Outlet: <strong>${member.businessName}</strong></div>
    <div>Operator ID: <strong>${member.membershipId}</strong></div>
    <div>Location: <strong>${member.lga}, ${member.state} State</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Transaction Service</th>
        <th>Band / Amount Range</th>
        <th>Standard Maximum Fee</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Cash Withdrawal</strong></td>
        <td>₦1,000 — ₦5,000</td>
        <td class="fee">₦100.00</td>
      </tr>
      <tr>
        <td><strong>Cash Withdrawal</strong></td>
        <td>₦5,001 — ₦10,000</td>
        <td class="fee">₦200.00</td>
      </tr>
      <tr>
        <td><strong>Cash Withdrawal</strong></td>
        <td>₦10,001 — ₦20,000</td>
        <td class="fee">₦300.00</td>
      </tr>
      <tr>
        <td><strong>Direct Bank Transfer</strong></td>
        <td>Up to ₦10,000</td>
        <td class="fee">₦100.00</td>
      </tr>
      <tr>
        <td><strong>Direct Bank Transfer</strong></td>
        <td>₦10,001 — ₦50,000</td>
        <td class="fee">₦200.00</td>
      </tr>
      <tr>
        <td><strong>Utility & Bill Payments</strong></td>
        <td>Electricity (PHCN), DSTV, Water</td>
        <td class="fee">₦100.00</td>
      </tr>
    </tbody>
  </table>

  <div class="notice">
    <strong>Mandatory Consumer Protection Directive:</strong><br>
    This tariff board is certified by the Association of Mobile Money Operators of Nigeria (AMMON). Operators are strictly prohibited from charging in excess of these rates. Customers encountering unlawful surcharges should report to the AMMON National Complaints Desk at <strong>+234 (0) 800 266 6664</strong>.
  </div>

  <div class="footer">
    <span>Certified by AMMON National Directorate of Standards</span>
    <span>Valid across all 36 States & FCT</span>
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Tariff_Poster_${member.membershipId}`);
}

/**
 * Generate and download official Paystack Dues Payment Receipt
 */
export function downloadPaymentReceipt(member: Member) {
  const ref = `PSTK-AMMON-2025-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Payment Receipt - ${ref}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #252525; padding: 24px; max-width: 650px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #176B37; padding-bottom: 16px; margin-bottom: 20px; }
    .header h2 { color: #176B37; margin: 0; font-size: 20px; }
    .header p { color: #666; margin: 3px 0 0; font-size: 11px; }
    .receipt-title { background: #EAF3ED; border: 1px solid #176B37; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; font-weight: bold; color: #14532D; }
    .details { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .details td { padding: 9px 4px; border-bottom: 1px solid #E5E7EB; }
    .details td.label { color: #666; width: 40%; font-weight: 500; }
    .details td.val { font-weight: 700; color: #252525; }
    .total-box { background: #176B37; color: #fff; padding: 14px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: bold; margin-bottom: 24px; }
    .total-box span.amt { font-size: 22px; font-family: monospace; }
    .seal-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 15px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #555; }
    .stamp { border: 2px solid #176B37; color: #176B37; padding: 8px 14px; border-radius: 8px; font-weight: 800; text-align: center; font-size: 11px; text-transform: uppercase; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right; margin-bottom:15px;">
    <button class="btn" onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="header">
    <div>
      <h2>AMMON NIGERIA</h2>
      <p>Association of Mobile Money Operators of Nigeria</p>
      <p>National Secretariat, Commercial Ave, Yaba, Lagos</p>
    </div>
    <div style="text-align:right;">
      <div style="color:#097939; font-weight:800; font-size:12px;">PAYSTACK SECURED</div>
      <p style="font-family:monospace; font-size:11px;">REF: ${ref}</p>
    </div>
  </div>

  <div class="receipt-title">
    <span>ANNUAL MEMBERSHIP DUES RECEIPT</span>
    <span>PAID & VERIFIED ✓</span>
  </div>

  <table class="details">
    <tr>
      <td class="label">Received From:</td>
      <td class="val">${member.fullName}</td>
    </tr>
    <tr>
      <td class="label">Business Outlet:</td>
      <td class="val">${member.businessName}</td>
    </tr>
    <tr>
      <td class="label">Membership Number:</td>
      <td class="val" style="color:#176B37; font-family:monospace;">${member.membershipId}</td>
    </tr>
    <tr>
      <td class="label">State Chapter & LGA:</td>
      <td class="val">${member.state} (${member.lga})</td>
    </tr>
    <tr>
      <td class="label">Payment Date:</td>
      <td class="val">${dateStr}</td>
    </tr>
    <tr>
      <td class="label">Payment Gateway:</td>
      <td class="val">Paystack Checkout (Ref: ${ref})</td>
    </tr>
    <tr>
      <td class="label">Subscription Coverage:</td>
      <td class="val">2025/2026 Annual Operating Cycle</td>
    </tr>
  </table>

  <div class="total-box">
    <span>TOTAL DUES SETTLED:</span>
    <span class="amt">₦${member.duesAmount.toLocaleString()}.00</span>
  </div>

  <div class="seal-row">
    <div>
      <p>This electronic receipt is tax-deductible under Nigerian commercial tax regulations.</p>
      <p>Paystack Transaction ID: ${ref} · Verified against NIBSS switch.</p>
    </div>
    <div class="stamp">
      AMMON TREASURY<br>VERIFIED & STAMPED
    </div>
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Receipt_${ref}`);
}

/**
 * Generate and download official Court Injunction & Exemption Notice
 */
export function downloadCourtInjunction(member: Member) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Legal Exemption & Protection Notice - ${member.membershipId}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.6; padding: 25px; max-width: 700px; margin: 0 auto; }
    .court-hdr { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
    .court-hdr h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
    .court-hdr h3 { margin: 4px 0; font-size: 15px; font-style: italic; }
    .suit { font-weight: bold; font-family: monospace; font-size: 13px; text-align: right; margin-bottom: 15px; }
    .injunction-box { border: 2px solid #176B37; background: #f4faf6; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-family: sans-serif; font-size: 13px; }
    .injunction-box h4 { margin: 0 0 6px 0; color: #176B37; text-transform: uppercase; font-size: 14px; }
    p { text-align: justify; font-size: 14px; margin-bottom: 14px; }
    .operator-info { background: #eee; padding: 10px 14px; font-family: monospace; font-size: 13px; margin: 16px 0; border-left: 4px solid #176B37; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 40px; font-family: sans-serif; font-size: 12px; }
    .sig { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; font-family: sans-serif; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right; margin-bottom:15px;">
    <button class="btn" onclick="window.print()">Print Legal Injunction</button>
  </div>

  <div class="court-hdr">
    <h2>IN THE FEDERAL HIGH COURT OF NIGERIA</h2>
    <h3>HOLDEN AT LAGOS JUDICIAL DIVISION</h3>
  </div>

  <div class="suit">SUIT NO: FHC/L/CS/2023/1844</div>

  <p><strong>BETWEEN:</strong></p>
  <p>ASSOCIATION OF MOBILE MONEY OPERATORS OF NIGERIA (AMMON) .......................... PLAINTIFF</p>
  <p><strong>AND:</strong></p>
  <p>MINISTRY OF LOCAL GOVERNMENT & ALL 774 LGA REVENUE TASKFORCES .............. DEFENDANTS</p>

  <div class="injunction-box">
    <h4>PERPETUAL INJUNCTION RESTRAINING REVENUE COLLECTORS & TASKFORCES</h4>
    AN ORDER OF PERPETUAL INJUNCTION restraining all Municipal Councils, Local Government Revenue Agents, Taskforce Teams, and Law Enforcement Personnel from levying, taxing, or extorting daily ticket fees on verified mobile money operators, POS kiosks, and banking agent terminals.
  </div>

  <p>
    <strong>TAKE NOTICE:</strong> The operator named herein is an accredited member of the Association of Mobile Money Operators of Nigeria (AMMON), certified under the Central Bank of Nigeria Regulatory Framework for Agent Banking Operations.
  </p>

  <div class="operator-info">
    CERTIFIED OPERATOR: ${member.fullName}<br>
    BUSINESS OUTLET:    ${member.businessName}<br>
    MEMBERSHIP ID:      ${member.membershipId}<br>
    LOCATION:           ${member.lga}, ${member.state} State<br>
    TERMINAL S/N:       ${member.terminalSerialNumber}
  </div>

  <p>
    Any attempt to impound POS machines, padlock kiosks, or demand daily toll dues from this operator constitutes contempt of court and will result in immediate legal prosecution and damages under Nigerian law.
  </p>

  <div class="sig-row">
    <div class="sig">
      <strong>Barrister Femi Olanrewaju, SAN</strong><br>
      Lead Counsel to AMMON
    </div>
    <div class="sig">
      <strong>Registrar of the Federal High Court</strong><br>
      Seal of the Court
    </div>
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Injunction_${member.membershipId}`);
}

/**
 * Generate and download official AMMON Academy Certificate of Competency
 */
export function downloadAcademyCertificate(member: Member) {
  const certId = `AMMON-CERT-2025-${Math.floor(10000 + Math.random() * 90000)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate of Competency - ${member.fullName}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #252525; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
    .cert-frame { width: 900px; padding: 40px; border: 14px solid #176B37; border-radius: 16px; background: linear-gradient(135deg, #fff, #F8FCF9); text-align: center; position: relative; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
    .inner-border { border: 2px dashed #14532D; padding: 30px; border-radius: 8px; }
    .cert-hdr { font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #176B37; text-transform: uppercase; margin-bottom: 8px; }
    h1 { font-family: 'Georgia', serif; font-size: 38px; color: #14532D; margin: 8px 0; }
    .sub { font-size: 14px; color: #666; font-style: italic; margin-bottom: 24px; }
    .recipient { font-size: 32px; font-weight: 800; color: #252525; border-bottom: 2px solid #176B37; display: inline-block; padding: 0 40px 6px; margin: 10px 0 20px; }
    .reason { font-size: 14px; color: #444; max-width: 680px; margin: 0 auto 30px; line-height: 1.6; }
    .sigs { display: flex; justify-content: space-around; align-items: flex-end; margin-top: 40px; }
    .sig-block { width: 200px; border-top: 1px solid #176B37; padding-top: 8px; font-size: 11px; }
    .sig-block strong { color: #14532D; display: block; font-size: 13px; }
    .gold-seal { width: 80px; height: 80px; border-radius: 50%; background: #176B37; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; text-transform: uppercase; border: 4px solid #F59E0B; margin: 0 auto; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div style="display:flex; flex-direction:column; align-items:center;">
    <div class="no-print" style="margin-bottom:15px;">
      <button class="btn" onclick="window.print()">Print Certificate</button>
    </div>

    <div class="cert-frame">
      <div class="inner-border">
        <div class="cert-hdr">Association of Mobile Money Operators of Nigeria</div>
        <h1>CERTIFICATE OF PROFESSIONAL COMPETENCY</h1>
        <div class="sub">National Agent Banking Safety & Anti-Fraud Accreditation</div>

        <p style="font-size:13px; color:#666; margin:0;">This is to officially certify that</p>
        <div class="recipient">${member.fullName}</div>
        <p style="font-size:12px; color:#176B37; font-weight:700; margin-top:-10px; margin-bottom:20px;">
          ${member.businessName} · ID: ${member.membershipId}
        </p>

        <div class="reason">
          has successfully satisfied all rigorous training standards, fraud detection protocols, counter-skimming certifications, and Central Bank of Nigeria consumer protection directives administered by the AMMON National Academy.
        </div>

        <div class="gold-seal">
          AMMON<br>SEAL
        </div>

        <div class="sigs">
          <div class="sig-block">
            <em>Engr. Victor O.</em>
            <strong>National President</strong>
            AMMON Executive Council
          </div>
          <div class="sig-block">
            <span style="font-family:monospace; font-size:10px; color:#666;">CERT ID: ${certId}</span><br>
            <strong>Date of Issue: ${dateStr}</strong>
            Central Accreditation Registry
          </div>
          <div class="sig-block">
            <em>Dr. Amina S.</em>
            <strong>Dean of Faculty</strong>
            AMMON National Academy
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Certificate_${member.membershipId}`);
}

/**
 * Generate and download official Regulatory Circular
 */
export function downloadCircularDocument(article: NewsArticle) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${article.title}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #252525; padding: 25px; max-width: 680px; margin: 0 auto; line-height: 1.6; }
    .hdr { border-bottom: 2px solid #176B37; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .hdr h2 { color: #176B37; margin: 0; font-size: 18px; }
    .badge { background: #EAF3ED; color: #176B37; border: 1px solid #176B37; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: bold; }
    h1 { font-size: 20px; color: #14532D; margin: 16px 0 8px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
    .body { font-size: 13px; text-align: justify; white-space: pre-line; }
    .foot { margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 15px; font-size: 11px; color: #666; display: flex; justify-content: space-between; }
    .btn { background: #176B37; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right; margin-bottom:15px;">
    <button class="btn" onclick="window.print()">Print Circular (PDF)</button>
  </div>

  <div class="hdr">
    <div>
      <h2>AMMON NATIONAL SECRETARIAT</h2>
      <p style="margin:2px 0 0; font-size:11px; color:#666;">Plot 14 Commercial Ave, Yaba, Lagos</p>
    </div>
    <div class="badge">${article.category.toUpperCase()}</div>
  </div>

  <h1>${article.title}</h1>
  <div class="meta">
    Published: <strong>${article.date}</strong> | Issuing Authority: <strong>${article.author}</strong> | Ref: <strong>AMMON/REG/2025/CIRC-88</strong>
  </div>

  <div class="body">
${article.content}
  </div>

  <div class="foot">
    <span>Distribution: All 36 State Chapters & Licensed Operators</span>
    <span>Compliance is Mandatory</span>
  </div>
</body>
</html>
  `;
  printHtmlDocument(html, `AMMON_Circular_${article.id}`);
}
