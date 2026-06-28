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

function generatePlanReceiptAndInvoiceHTML(invoice: any, purchase: any, isInvoice: boolean) {
    const invoiceDate = new Date(invoice.created_at || new Date()).toLocaleDateString('en-GB'); // DD/MM/YYYY
    const title = isInvoice ? 'Invoice' : 'Payment Receipt';
    const amount = Number(invoice.amount || 0);
    const amountInWords = numberToWords(amount);

    // Helper to format date as DD MMM YYYY safely using UTC
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

    let validity = '';
    let term = '1';
    if (purchase && purchase.valid_from && purchase.valid_till) {
        validity = `${fmtDateStr(purchase.valid_from)} to ${fmtDateStr(purchase.valid_till, true)}`;
        const diffTime = Math.abs(new Date(purchase.valid_till).getTime() - new Date(purchase.valid_from).getTime());
        term = Math.round(diffTime / (1000 * 60 * 60 * 24 * 365)).toString();
    } else {
        const start = new Date(invoice.created_at || new Date());
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        validity = `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }

    const patientName = purchase.holder_full_name || purchase.full_name || purchase.profileName || invoice.email || 'Customer';
    const patientAddress = invoice.address || 'N/A';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title} - ${invoice.invoice_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            background: #fff;
            color: #000;
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .text-center {
            text-align: center;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 40px;
        }
        .flex-between {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .patient-info {
            margin-bottom: 40px;
        }
        .patient-info p {
            margin-bottom: 5px;
        }
        .certification {
            margin-bottom: 40px;
            text-align: justify;
        }
        .plan-details {
            display: grid;
            grid-template-columns: 200px 10px auto;
            gap: 10px 0;
            margin-bottom: 50px;
        }
        .tax-paragraph {
            text-align: justify;
            margin-bottom: 50px;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <table style="width: 100%; margin-bottom: 40px;">
        <tr>
            <td style="width: 33%; text-align: left; vertical-align: top;">
                <img src="https://healthmitraus.com/logo.jpg" alt="HealthMitra Logo" style="max-height: 80px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\'font-size: 28px; font-weight: bold; color: #0d9488;\'>HealthMitra</div><div style=\'font-size: 14px; opacity: 0.8;\'>Healthcare Pvt. Ltd.</div>'" />
            </td>
            <td style="width: 33%; text-align: center; vertical-align: middle;">
                <div class="title" style="margin-bottom: 0;">${title}</div>
            </td>
            <td style="width: 33%;"></td>
        </tr>
    </table>
    
    <div class="flex-between">
        <div>Date: ${invoiceDate}</div>
        <div>Receipt No: <strong>${invoice.invoice_number}</strong></div>
    </div>
    
    <div class="patient-info">
        <p>To,</p>
        <p><strong>${patientName}</strong></p>
        <p>${patientAddress}</p>
    </div>
    
    <div class="certification">
        This is to certify that we have received the sum of $${amount.toFixed(2)} (Dollars ${amountInWords} only) For Preventive Health Membership plan and your HEALTHMITRA HEALTH ID IS. Receipt No: <strong>${invoice.invoice_number}</strong>.
    </div>
    
    <div class="plan-details">
        <div>PLAN NAME</div><div>:</div><div>${invoice.plan_name || 'HEALTH PLAN'}</div>
        <div>PLAN AMOUNT</div><div>:</div><div>$${amount}</div>
        <div>VALIDITY</div><div>:</div><div>${validity}</div>
        <div>TERM</div><div>:</div><div>${term.padStart(2, '0')} YEARS.</div>
    </div>
    
    ${!isInvoice ? `
    <div class="tax-paragraph">
        HealthMitra Preventive Health Care Membership Plan Member can claim deduction to the extent of $5000 or the plan amount paid (whichever is lower) for their preventive health checkup service under the section 80D of the income tax Act,1961 by the finance Act,2012. Tax Benefits are subject to changes in the tax laws Please consult your tax advisor for more details. The benefit of section 80D is over and above the limit of $150,000 prescribed under section 80C/80CCC.
    </div>
    ` : ''}
    
    <div class="footer">
        <p style="margin-bottom: 20px;">The above receipt is computer generated and does not require any stamp or signatures.</p>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ccc;" />
        <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 14px; line-height: 1.6; text-align: left; margin-bottom: 20px;">
            <div style="flex: 1; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin-bottom: 5px; color: #0d9488;"><strong>🇺🇸 US Office</strong></p>
                <p>1550 Sheridan Drive,<br>Buffalo, NY 14217, United States</p>
                <p style="margin-top: 8px;"><strong>Contact:</strong> +1 716-579-0346</p>
            </div>
            <div style="flex: 1; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin-bottom: 5px; color: #0d9488;"><strong>🇮🇳 India Office</strong></p>
                <p>HealthMitra Systems Pvt Ltd,<br>C-20/1, Sector 62, Noida, UP 201309, India</p>
                <p style="margin-top: 8px;"><strong>Contact:</strong> +91 9818823106</p>
            </div>
        </div>
        <div style="text-align: center; font-size: 14px;">
            <p><strong>Email:</strong> service@healthmitraus.com | <strong>Website:</strong> www.healthmitraus.com</p>
        </div>
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
        const htmlContent = generatePlanReceiptAndInvoiceHTML(invoice, { full_name: customerName, coverage_amount: 0, card_unique_id: 'N/A' }, true);
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
    const invoice = {
        id: purchaseData.id,
        invoice_number: `INV-${purchaseData.id.slice(0, 8).toUpperCase()}`,
        plan_name: purchaseData.plan?.name || 'Health Plan',
        amount: purchaseData.plan?.price || 0,
        status: purchaseData.status === 'active' ? 'PAID' : 'PENDING',
        transaction_id: purchaseData.card_unique_id,
        created_at: purchaseData.created_at,
    };

    const htmlContent = generatePlanReceiptAndInvoiceHTML(invoice, { ...purchaseData, profileName: userProfile?.full_name }, true);
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
        const htmlContent = generatePlanReceiptAndInvoiceHTML(invoice, { full_name: customerName, coverage_amount: 0, card_unique_id: 'N/A' }, false);
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
    const invoice = {
        id: purchaseData.id,
        invoice_number: `INV-${purchaseData.id.slice(0, 8).toUpperCase()}`,
        plan_name: purchaseData.plan?.name || 'Health Plan',
        amount: purchaseData.plan?.price || 0,
        status: purchaseData.status === 'active' ? 'PAID' : 'PENDING',
        transaction_id: purchaseData.card_unique_id,
        created_at: purchaseData.created_at,
    };

    const htmlContent = generatePlanReceiptAndInvoiceHTML(invoice, { ...purchaseData, profileName: userProfile2?.full_name }, false);
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
Valid Till: ${fmtDateStr(member.valid_till, true)}

------------------------------------------
Plan: ${member.plan?.name || 'N/A'}
Coverage: $${member.coverage_amount || 0}

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
