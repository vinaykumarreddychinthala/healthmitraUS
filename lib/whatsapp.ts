/**
 * WhatsApp messaging utility via authkey.io
 *
 * API: POST https://console.authkey.io/restapi/requestjson.php
 * Auth: Basic <authkey> header
 *
 * IMPORTANT: `wid` must be the numeric Template ID from the authkey.io dashboard,
 * NOT the template name string.
 */

interface WhatsAppMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

interface PlanPurchaseParams {
    /** Customer's name — maps to {{1}} in template */
    name: string;
    /** Customer's WhatsApp number (digits only, no country code) — maps to {{2}} */
    phone: string;
    /** Customer's email address — maps to {{3}} */
    email: string;
    /** Plan details URL — maps to {{4}} */
    planUrl: string;
}

/**
 * Low-level: Send a WhatsApp template message via authkey.io
 */
async function sendWhatsAppTemplate(params: {
    phone: string;
    countryCode?: string;
    wid: string;
    bodyValues: Record<string, string>;
}): Promise<WhatsAppMessageResult> {
    const authKey = process.env.AUTHKEY_IO_AUTH_KEY;
    const senderRaw = process.env.AUTHKEY_IO_SENDER_NUMBER || '9818823106';

    if (!authKey) {
        console.warn('[WhatsApp] Missing AUTHKEY_IO_AUTH_KEY in env. Skipping WhatsApp send.');
        return { success: false, error: 'WhatsApp credentials not configured' };
    }

    const rawDigits = params.phone.replace(/\D/g, '');
    // Strip leading country code (91 for India) if number is longer than 10 digits
    const mobileDigits = rawDigits.length > 10 && rawDigits.startsWith('91')
        ? rawDigits.slice(2)
        : rawDigits;
    if (!mobileDigits || mobileDigits.length < 10) {
        console.warn('[WhatsApp] Invalid phone number:', params.phone);
        return { success: false, error: 'Invalid phone number' };
    }

    // Sender must be full international number (with country code, no +)
    const senderDigits = senderRaw.replace(/\D/g, '');
    const sender = senderDigits.startsWith('91') ? senderDigits : `91${senderDigits}`;

    const payload = {
        country_code: params.countryCode || '91',
        mobile: mobileDigits,
        sender,
        wid: params.wid,
        language: 'en',
        type: 'text',
        bodyValues: params.bodyValues,
    };

    console.log('[WhatsApp] Sending payload:', JSON.stringify(payload, null, 2));

    try {
        const res = await fetch('https://console.authkey.io/restapi/requestjson.php', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let data: any = {};
        try { data = await res.json(); } catch { /* non-json response */ }

        if (res.ok && (data?.type?.toLowerCase() === 'success' || data?.status?.toLowerCase() === 'success' || data?.id || data?.LogID)) {
            console.log('[WhatsApp] Message sent successfully to', mobileDigits, '| Response:', data);
            return { success: true, messageId: data?.id || data?.LogID || data?.message_id };
        } else {
            console.error('[WhatsApp] Failed to send message | Status:', res.status, '| Response:', data);
            return { success: false, error: data?.message || data?.error || `HTTP ${res.status}` };
        }
    } catch (err: any) {
        console.error('[WhatsApp] Network error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send plan purchase confirmation WhatsApp message.
 *
 * Template name: planpurchase
 * Template variables:
 *   {{1}} = Customer name
 *   {{2}} = WhatsApp phone number
 *   {{3}} = Email address
 *   {{4}} = Plan URL
 *
 * Required env:
 *   AUTHKEY_IO_AUTH_KEY       — Your authkey.io API key
 *   AUTHKEY_IO_PLAN_PURCHASE_WID — Numeric template ID from authkey.io dashboard
 */
export async function sendPlanPurchaseWhatsApp(params: PlanPurchaseParams): Promise<WhatsAppMessageResult> {
    const wid = process.env.AUTHKEY_IO_PLAN_PURCHASE_WID;

    if (!wid) {
        console.warn('[WhatsApp] Missing AUTHKEY_IO_PLAN_PURCHASE_WID in env. Skipping.');
        return { success: false, error: 'Plan purchase WhatsApp template ID (wid) not configured' };
    }

    return sendWhatsAppTemplate({
        phone: params.phone,
        countryCode: '91',
        wid,
        bodyValues: {
            // Keys must match the variable names defined in the authkey.io template
            // For {{1}}, {{2}} etc. placeholders, authkey.io uses var1, var2...
            var1: params.name,
            // Show full number with country code in the message body for readability
            var2: params.phone.replace(/\D/g, '').length > 10
                ? `+${params.phone.replace(/\D/g, '')}`
                : `+91${params.phone.replace(/\D/g, '')}`,
            var3: params.email,
            var4: params.planUrl,
        },
    });
}
