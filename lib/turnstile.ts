export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    
    // If credentials are not configured, log a warning and allow the request in development
    if (!secretKey) {
        console.warn('⚠️ Cloudflare Turnstile Secret Key is missing in .env. Skipping verification (Dev Mode).');
        return true;
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: secretKey,
                response: token,
                remoteip: ip,
            }),
        });

        const data = await response.json();
        
        if (!data.success) {
            console.error('Turnstile verification failed:', data['error-codes']);
        }
        
        return !!data.success;
    } catch (error) {
        console.error('Error during Turnstile token verification:', error);
        return false;
    }
}
