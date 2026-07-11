import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { type, data } = await request.json();

        switch (type) {
            case 'invoice':
                return generateInvoice(supabase, adminClient, user.id, data);
            case 'receipt':
                return generateReceipt(supabase, adminClient, user.id, data);
            case 'reimbursement_receipt':
                return generateReimbursementReceipt(supabase, user.id, data);
            case 'membership_card':
                return generateMembershipCard(supabase, user.id, data);
            case 'report':
                return generateReport(supabase, user.id, data);
            default:
                return NextResponse.json({ success: false, error: 'Invalid download type' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Download error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function numberToWords(num: number): string {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        const digit = n % 10;
        if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : 'and ' + inWords(n % 100));
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 === 0 ? '' : inWords(n % 1000));
        return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 === 0 ? '' : inWords(n % 100000));
    };
    if (num === 0) return 'Zero';
    return inWords(num).trim();
}

// ── Payment Receipt HTML (matches the tabular receipt format in image) ──────────
function generatePaymentReceiptHTML(invoice: any, purchase: any) {
    const fmtShortDate = (raw: string) => {
        if (!raw) return 'N/A';
        const d = new Date(raw);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const paymentDate = fmtShortDate(invoice.created_at || new Date().toISOString());
    const amount = Number(invoice.amount || 0);
    const currencyStr = invoice.currency || 'USD';
    const currSymbol = currencyStr === 'INR' ? '₹' : '$';

    const patientName = purchase.holder_full_name || purchase.full_name || purchase.profileName || invoice.email || 'Customer';
    const patientPhone = invoice.phone || purchase.phone || '';
    const patientEmail = invoice.email || '';

    // Price breakdown - USE DB VALUES DIRECTLY
    let basePrice = Number(invoice.base_price || invoice.amount || 0);
    let discount = Number(invoice.discount || 0);
    let tax = Number(invoice.tax || invoice.gst || 0);
    let total = Number(invoice.total || (basePrice - discount + tax));

    const transactionId = invoice.transaction_id || purchase.card_unique_id || purchase.transaction_id || 'N/A';
    const gstNo = invoice.gst_number || '07AAGCH7172M1Z3';
    const planName = invoice.plan_name || purchase.plan?.name || 'Health Plan';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt - ${invoice.invoice_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
            color: #222;
            font-size: 13px;
            padding: 30px;
            max-width: 760px;
            margin: 0 auto;
        }
        .outer-box {
            border: 1px solid #bbb;
            padding: 0;
        }
        .title-row {
            text-align: center;
            border-bottom: 1px solid #bbb;
            padding: 14px 0;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.3px;
        }
        .section {
            padding: 14px 20px;
        }
        .border-bottom { border-bottom: 1px solid #bbb; }
        .row-2col {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .col { flex: 1; }
        .col-right { flex: 1; text-align: left; padding-left: 40px; }
        .label { font-weight: bold; margin-bottom: 2px; }
        .val-blue { color: #1a5ca8; }
        .small { font-size: 12px; color: #333; margin-top: 2px; }
        .desc-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 20px;
        }
        .summary-wrap {
            padding: 12px 20px 16px;
            display: flex;
            justify-content: flex-end;
        }
        .summary-table {
            width: 260px;
            font-size: 13px;
        }
        .summary-table tr td:first-child { color: #555; padding-right: 10px; }
        .summary-table tr td:last-child { text-align: right; }
        .bold-label { font-weight: bold; font-size: 13px; }
    </style>
</head>
<body>
<div class="outer-box">
    <!-- Title -->
    <div class="title-row">Payment Receipt</div>

    <!-- Details Section -->
    <div class="section border-bottom">
        <div class="row-2col">
            <div class="col">
                <div class="bold-label">Payment No</div>
                <div class="val-blue">${invoice.invoice_number || 'N/A'}</div>
            </div>
            <div class="col-right">
                <div class="bold-label">Payment Date</div>
                <div>${paymentDate}</div>
            </div>
        </div>
        
        <div class="row-2col" style="margin-top:20px;">
            <div class="col">
                <div class="bold-label">Client</div>
                <div>${patientName}</div>
                ${patientPhone ? `<div class="small">(+91) ${patientPhone}</div>` : ''}
                ${patientEmail ? `<div class="small">${patientEmail}</div>` : ''}
            </div>
            <div class="col-right">
                <div class="bold-label">Payment To</div>
                <div>HealthMitra</div>
                <div class="small">(+91) 9818823106</div>
                <div class="small">service@healthmitraus.com</div>
            </div>
        </div>

        <div class="row-2col" style="margin-top:20px;">
            <div class="col">
                <div class="bold-label">HealthMitra Transaction Id</div>
                <div>${transactionId}</div>
            </div>
            <div class="col-right">
                <div class="bold-label">HealthMitra GST No</div>
                <div>${gstNo}</div>
            </div>
        </div>
    </div>

    <!-- Description / Amount header -->
    <div class="section border-bottom" style="padding-bottom:8px; padding-top:8px;">
        <div class="row-2col" style="margin-bottom:0;">
            <div class="col bold-label">Description</div>
            <div class="col-right bold-label" style="text-align:right;">Amount</div>
        </div>
    </div>

    <!-- Line item -->
    <div class="desc-row border-bottom">
        <div>${planName}</div>
        <div class="val-blue">${currSymbol}${basePrice.toFixed(2)}</div>
    </div>

    <!-- Summary -->
    <div class="summary-wrap">
        <table class="summary-table">
            <tr><td>Basic Price :</td><td>${currSymbol}${basePrice.toFixed(2)}</td></tr>
            <tr><td>Discount :</td><td>${currSymbol}${discount.toFixed(2)}</td></tr>
            <tr><td>Tax :</td><td>${currSymbol}${tax.toFixed(2)}</td></tr>
            <tr><td><strong>Total :</strong></td><td><strong>${currSymbol}${total.toLocaleString('en-IN')}</strong></td></tr>
        </table>
    </div>
</div>
</body>
</html>`;
}

// ── Tax Receipt (Invoice) HTML (matches the formal letterhead format in image) ─
function generateTaxReceiptHTML(invoice: any, purchase: any) {
    const fmtShortDate = (raw: string) => {
        if (!raw) return 'N/A';
        const d = new Date(raw);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const fmtValidityDate = (raw: string) => {
        if (!raw) return 'N/A';
        const parts = raw.split('T')[0].split('-');
        if (parts.length !== 3) return raw;
        const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = String(d.getUTCFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const paymentDate = fmtShortDate(invoice.created_at || new Date().toISOString());
    const baseAmount = Number(invoice.base_price || invoice.amount || 0);
    const taxAmount = Number(invoice.tax || invoice.gst || 0);
    const totalAmount = Number(invoice.total || (baseAmount + taxAmount));
    
    const currencyStr = invoice.currency || 'USD';
    const currSymbol = currencyStr === 'INR' ? '₹' : '$';
    
    const amountInWords = numberToWords(Math.round(totalAmount));

    const patientName = purchase.holder_full_name || purchase.full_name || purchase.profileName || invoice.email || 'Customer';
    const planName = invoice.plan_name || purchase.plan?.name || 'Health Plan';
    const transactionId = invoice.transaction_id || purchase.card_unique_id || purchase.transaction_id || 'N/A';
    const gstNo = invoice.gst_number || '07AAGCH7172M1Z3';
    const paymentNo = invoice.invoice_number || 'N/A';

    // Validity dates
    let validFrom = '';
    let validTill = '';
    let term = '12 Months.';
    if (purchase.valid_from && purchase.valid_till) {
        validFrom = fmtValidityDate(purchase.valid_from);
        validTill = fmtValidityDate(purchase.valid_till);
        const diffTime = Math.abs(new Date(purchase.valid_till).getTime() - new Date(purchase.valid_from).getTime());
        const months = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30));
        term = `${months} Months.`;
    } else {
        const start = new Date(invoice.created_at || new Date());
        const end = new Date(start);
        const planDays = purchase?.plan?.duration_days || 365;
        end.setDate(end.getDate() + Math.max(0, planDays - 1));
        validFrom = fmtShortDate(start.toISOString());
        validTill = fmtShortDate(end.toISOString());
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - ${paymentNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
            color: #222;
            font-size: 13px;
            padding: 40px 50px;
            max-width: 800px;
            margin: 0 auto;
            min-height: 1100px;
            position: relative;
        }
        /* Header */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        .logo-block { display: flex; align-items: center; gap: 10px; }
        .logo-img { height: 60px; }
        .logo-text { line-height: 1.2; }
        .logo-name { font-size: 28px; font-weight: bold; color: #1a8bbf; }
        .logo-sub { font-size: 10px; font-weight: bold; color: #555; letter-spacing: 1px; }
        .title-block { text-align: center; flex: 1; }
        .receipt-title {
            font-size: 18px;
            font-weight: bold;
            text-decoration: underline;
            letter-spacing: 0.5px;
        }
        /* Date + PayNo row */
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin: 20px 0 24px;
            font-size: 13px;
        }
        .meta-right { text-align: right; line-height: 1.8; }
        /* To section */
        .to-section { margin-bottom: 18px; }
        .to-section .to-label { font-size: 13px; margin-bottom: 4px; }
        .to-section .customer-name { font-size: 13px; color: #1a5ca8; margin-bottom: 10px; }
        /* Certification text */
        .cert-text {
            font-size: 12px;
            color: #c0390a;
            margin: 16px 0 24px;
            line-height: 1.7;
        }
        /* Plan details table */
        .plan-table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
        .plan-table tr td {
            padding: 5px 0;
            font-size: 13px;
            vertical-align: top;
        }
        .plan-table tr td:first-child { font-weight: bold; width: 160px; }
        .plan-table tr td:nth-child(2) { width: 20px; }
        /* Notice */
        .notice-text {
            font-size: 11px;
            color: #333;
            line-height: 1.8;
            margin: 18px 0 30px;
        }
        /* Computer generated line */
        .generated-line {
            text-align: center;
            font-size: 12px;
            font-style: italic;
            text-decoration: underline;
            color: #444;
            margin: 30px 0 40px;
        }
        /* Footer */
        .footer {
            border-top: 1px solid #ccc;
            padding-top: 14px;
            text-align: center;
            font-size: 11px;
            color: #555;
            line-height: 1.9;
            margin-top: auto;
        }
        .footer a { color: #1a5ca8; }
        hr.divider { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="header">
        <div class="logo-block">
            <div class="logo-text">
                <div class="logo-name">HealthMitra</div>
                <div class="logo-sub">ON DEMAND HEALTHCARE</div>
            </div>
        </div>
        <div class="title-block">
            <span class="receipt-title">Invoice</span>
        </div>
    </div>

    <hr class="divider">

    <!-- Date + Payment No -->
    <div class="meta-row">
        <div><strong>Date : ${paymentDate}</strong></div>
        <div class="meta-right">
            Payment No : <strong style="color:#1a5ca8;">${paymentNo}</strong><br>
            GST No &nbsp;: <strong>${gstNo}</strong>
        </div>
    </div>

    <!-- To section -->
    <div class="to-section">
        <div class="to-label">To,</div>
        <div class="customer-name">${patientName} ,</div>
    </div>

    <!-- Certification text -->
    <div class="cert-text">
        This is to certify that we have received the sum of Rupees ${totalAmount}/- ( ${amountInWords} Rupees only) For Preventive Health Membership plan and
        your HEALTH MITRA ID IS. Receipt No: <strong>${paymentNo}</strong> .
    </div>

    <!-- Plan details -->
    <table class="plan-table">
        <tr>
            <td>PLAN NAME</td>
            <td>:</td>
            <td>${planName}</td>
        </tr>
        <tr>
            <td>PLAN AMOUNT</td>
            <td>:</td>
            <td>${currSymbol}${totalAmount}/-</td>
        </tr>
        <tr>
            <td>VALIDITY</td>
            <td>:</td>
            <td>${validTill}</td>
        </tr>
        <tr>
            <td>TERM</td>
            <td>:</td>
            <td>${term}</td>
        </tr>
        <tr>
            <td>TRANSACTION ID</td>
            <td>:</td>
            <td>${transactionId}</td>
        </tr>
    </table>

    <!-- Tax benefit notice -->
    <div class="notice-text">
        Health Mitra Preventive Health Care Membership Plan Member can claim deduction to the extent of rupees 5000/- or
        the plan amount paid (whichever is lower) for their preventive health checkup service under the section 80D of the
        income tax Act,1961 by the finance Act,2012. Tax Benefits are subject to changes in the tax laws Please consult your
        tax advisor for more details. The benefit of section 80D is over and above the limit of Rupees 1,50,000/- prescribed
        under section 80C/80CCC.
    </div>

    <!-- Computer generated line -->
    <div class="generated-line">
        The above receipt is computer generated and does not require any stamp or signatures.
    </div>

    <!-- Footer -->
    <div class="footer">
        Address: No. 42, DDA Complex, H Block, Vikaspuri, PIN 110018, Delhi.<br>
        Email Id : service@healthmitraus.com &nbsp; Website: <a href="https://www.healthmitraus.com">www.healthmitraus.com</a> &nbsp; Contact : (+91) 9818823106 .
    </div>

</body>
</html>`;
}

async function generateInvoice(supabase: any, adminClient: any, userId: string, data: any) {
    const { purchaseId } = data;

    // IDOR Protection: Verify user owns this purchase
    const { data: purchaseData, error: purchaseError } = await supabase
        .from('ecard_members')
        .select('*, plan:plan_id(*)')
        .eq('id', purchaseId)
        .eq('user_id', userId)
        .single();

    if (purchaseError || !purchaseData) {
        // Use adminClient to bypass RLS — ensures India/EasePay payments are found
        const { data: invoiceData } = await adminClient
            .from('invoices')
            .select('*, profile:user_id(full_name)')
            .eq('id', purchaseId)
            .eq('user_id', userId)
            .single();

        if (!invoiceData) {
            return NextResponse.json({ success: false, error: 'Purchase not found or access denied' }, { status: 404 });
        }

        // Extract customer name from joined profile, fallback to separate query
        let customerName = (invoiceData as any).profile?.full_name;
        if (!customerName) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
            customerName = profile?.full_name || 'Customer';
        }

        // Build invoice from invoice table
        const invoice = invoiceData;
        const htmlContent = generateTaxReceiptHTML(invoice, { full_name: customerName, coverage_amount: 0, card_unique_id: 'N/A' });
        return NextResponse.json({
            success: true,
            data: {
                content: htmlContent,
                filename: `${invoice.invoice_number || 'Invoice'}.html`,
                type: 'html',
            }
        });
    }

    // Fetch user profile to get full_name for the patient name
    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();

    // Build invoice from purchase data
    const finalAmount = purchaseData.plan?.price || 0;
    const currencyStr = purchaseData.plan?.currency || 'USD';
    let baseAmount = finalAmount;
    let gstAmount = 0;
    
    if (currencyStr === 'INR') {
        baseAmount = Number((finalAmount / 1.18).toFixed(2));
        gstAmount = Number((finalAmount - baseAmount).toFixed(2));
    }

    const invoice = {
        id: purchaseData.id,
        invoice_number: `INV-${purchaseData.id.slice(0, 8).toUpperCase()}`,
        plan_name: purchaseData.plan?.name || 'Health Plan',
        amount: baseAmount,
        gst: gstAmount,
        total: finalAmount,
        currency: currencyStr,
        status: purchaseData.status === 'active' ? 'PAID' : 'PENDING',
        transaction_id: purchaseData.card_unique_id,
        created_at: purchaseData.created_at,
    };

    const htmlContent = generateTaxReceiptHTML(invoice, { ...purchaseData, profileName: userProfile?.full_name });
    const filename = `${invoice.invoice_number || 'Invoice'}.html`;

    return NextResponse.json({
        success: true,
        data: {
            content: htmlContent,
            filename: filename,
            type: 'html',
        }
    });
}

async function generateReceipt(supabase: any, adminClient: any, userId: string, data: any) {
    const { purchaseId } = data;

    // IDOR Protection: Verify user owns this purchase
    const { data: purchaseData, error: purchaseError } = await supabase
        .from('ecard_members')
        .select('*, plan:plan_id(*)')
        .eq('id', purchaseId)
        .eq('user_id', userId)
        .single();

    if (purchaseError || !purchaseData) {
        // Use adminClient to bypass RLS — ensures India/EasePay payments are found
        const { data: invoiceData } = await adminClient
            .from('invoices')
            .select('*, profile:user_id(full_name)')
            .eq('id', purchaseId)
            .eq('user_id', userId)
            .single();

        if (!invoiceData) {
            return NextResponse.json({ success: false, error: 'Purchase not found or access denied' }, { status: 404 });
        }

        // Extract customer name from joined profile, fallback to separate query
        let customerName = (invoiceData as any).profile?.full_name;
        if (!customerName) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
            customerName = profile?.full_name || 'Customer';
        }

        // Build receipt from invoice table
        const invoice = invoiceData;
        const htmlContent = generatePaymentReceiptHTML(invoice, { full_name: customerName, coverage_amount: 0, card_unique_id: 'N/A' });
        return NextResponse.json({
            success: true,
            data: {
                content: htmlContent,
                filename: `Receipt-${invoice.invoice_number || 'Payment'}.html`,
                type: 'html',
            }
        });
    }

    // Fetch user profile to get full_name for the patient name
    const { data: userProfile2 } = await supabase.from('profiles').select('full_name').eq('id', userId).single();

    // Build receipt from purchase data
    const finalAmount = purchaseData.plan?.price || 0;
    const currencyStr = purchaseData.plan?.currency || 'USD';
    let baseAmount = finalAmount;
    let gstAmount = 0;
    
    if (currencyStr === 'INR') {
        baseAmount = Number((finalAmount / 1.18).toFixed(2));
        gstAmount = Number((finalAmount - baseAmount).toFixed(2));
    }

    const invoice = {
        id: purchaseData.id,
        invoice_number: `INV-${purchaseData.id.slice(0, 8).toUpperCase()}`,
        plan_name: purchaseData.plan?.name || 'Health Plan',
        amount: baseAmount,
        gst: gstAmount,
        total: finalAmount,
        currency: currencyStr,
        status: purchaseData.status === 'active' ? 'PAID' : 'PENDING',
        transaction_id: purchaseData.card_unique_id,
        created_at: purchaseData.created_at,
    };

    const htmlContent = generatePaymentReceiptHTML(invoice, { ...purchaseData, profileName: userProfile2?.full_name });
    const filename = `Receipt-${invoice.invoice_number || 'Payment'}.html`;

    return NextResponse.json({
        success: true,
        data: {
            content: htmlContent,
            filename: filename,
            type: 'html',
        }
    });
}

async function generateReimbursementReceipt(supabase: any, userId: string, data: any) {
    const { claimId } = data;

    // IDOR Protection: Verify user owns this claim
    const { data: claim, error: claimError } = await supabase
        .from('reimbursement_claims')
        .select('*')
        .eq('id', claimId)
        .eq('user_id', userId)
        .single();

    if (claimError || !claim) {
        return NextResponse.json({ success: false, error: 'Claim not found or access denied' }, { status: 404 });
    }

    const receiptContent = `
REIMBURSEMENT RECEIPT
==========================================
HealthMitra Healthcare Pvt. Ltd.

Receipt Date: ${new Date().toLocaleDateString('en-US')}
Receipt No: RCP-${claim.id.slice(0, 8).toUpperCase()}

------------------------------------------
Patient: ${claim.title || 'N/A'}
Claim ID: ${claim.id}

------------------------------------------
Claim Details:
Type: ${claim.claim_type || 'Medical'}
Amount Claimed: $${claim.amount || 0}
Amount Approved: $${claim.amount_approved || 0}

Status: ${claim.status?.toUpperCase() || 'PENDING'}

==========================================
Thank you for choosing HealthMitra!
    `.trim();

    const buffer = Buffer.from(receiptContent, 'utf-8');

    return NextResponse.json({
        success: true,
        data: {
            content: receiptContent,
            filename: `Receipt-${claim.id.slice(0, 8)}.txt`,
        }
    });
}

async function generateMembershipCard(supabase: any, userId: string, data: any) {
    const { memberId } = data;

    // IDOR Protection: Verify user owns this member
    const { data: member, error: memberError } = await supabase
        .from('ecard_members')
        .select('*, plan:plan_id(*)')
        .eq('id', memberId)
        .eq('user_id', userId)
        .single();

    if (memberError || !member) {
        return NextResponse.json({ success: false, error: 'Member not found or access denied' }, { status: 404 });
    }

    const fmtDateStr = (raw: string, minusOneDay = false) => {
        if (!raw) return 'N/A';
        const parts = raw.split('T')[0].split('-');
        if (parts.length !== 3) return raw;
        const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        if (minusOneDay) {
            d.setUTCDate(d.getUTCDate() - 1);
        }
        return d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
    };

    const cardContent = `
HEALTHMITRA MEMBERSHIP CARD
==========================================
Member ID: ${member.id.slice(0, 8).toUpperCase()}
Card No: ${member.card_unique_id || 'N/A'}

------------------------------------------
Name: ${member.full_name}
Relation: ${member.relation || 'Self'}
Valid From: ${fmtDateStr(member.valid_from)}
Valid Till: ${fmtDateStr(member.valid_till)}

------------------------------------------
Plan: ${member.plan?.name || 'N/A'}
Coverage: No-limit as per plan

==========================================
HealthMitra - Your Health Partner
    `.trim();

    return NextResponse.json({
        success: true,
        data: {
            content: cardContent,
            filename: `MembershipCard-${member.id.slice(0, 8)}.txt`,
        }
    });
}

async function generateReport(supabase: any, userId: string, data: any) {
    const { reportType, startDate, endDate } = data;

    let reportContent = `HEALTHMITRA REPORT\n==========================================\nReport Type: ${reportType}\nGenerated: ${new Date().toLocaleString('en-US')}\n\n`;

    if (reportType === 'purchases') {
        const { data: purchases } = await supabase
            .from('ecard_members')
            .select('*, plan:plan_id(*)')
            .eq('user_id', userId);

        reportContent += `Total Plans: ${purchases?.length || 0}\n\n`;
        purchases?.forEach((p: any, i: number) => {
            reportContent += `${i + 1}. ${p.plan?.name || 'N/A'} - $${p.plan?.price || 0}\n`;
            const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-US') : 'N/A';
            reportContent += `   Valid: ${formatDate(p.valid_from)} to ${formatDate(p.valid_till)}\n`;
        });
    } else if (reportType === 'claims') {
        const { data: claims } = await supabase
            .from('reimbursement_claims')
            .select('*')
            .eq('user_id', userId);

        reportContent += `Total Claims: ${claims?.length || 0}\n\n`;
        claims?.forEach((c: any, i: number) => {
            reportContent += `${i + 1}. ${c.claim_type || 'Medical'} - $${c.amount || 0}\n`;
            reportContent += `   Status: ${c.status}\n`;
        });
    }

    reportContent += `\n==========================================\nGenerated by HealthMitra`;

    return NextResponse.json({
        success: true,
        data: {
            content: reportContent,
            filename: `Report-${reportType}-${new Date().toISOString().split('T')[0]}.txt`,
        }
    });
}
