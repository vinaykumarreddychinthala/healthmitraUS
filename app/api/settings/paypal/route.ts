import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const adminClient = await createAdminClient();
        const { data: settings } = await adminClient.from('system_settings')
            .select('key, value')
            .in('key', ['paypal_enabled', 'paypal_client_id', 'paypal_sandbox']);

        if (!settings) {
            return NextResponse.json({ success: true, data: { enabled: false, clientId: '', sandbox: false } });
        }

        const enabled = settings.find(s => s.key === 'paypal_enabled')?.value === 'true';
        const clientId = settings.find(s => s.key === 'paypal_client_id')?.value || '';
        const sandbox = settings.find(s => s.key === 'paypal_sandbox')?.value !== 'false';

        return NextResponse.json({ success: true, data: { enabled, clientId, sandbox } });
    } catch (error) {
        console.error('PayPal settings error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}
