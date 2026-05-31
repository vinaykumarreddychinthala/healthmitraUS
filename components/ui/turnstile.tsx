'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileProps {
    siteKey?: string;
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
}

declare global {
    interface Window {
        onloadTurnstileCallback?: () => void;
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'expired-callback'?: () => void;
                    'error-callback'?: () => void;
                    theme?: 'light' | 'dark' | 'auto';
                }
            ) => string;
            remove: (widgetId: string) => void;
            reset: (widgetId: string) => void;
        };
    }
}

export function Turnstile({
    siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    onVerify,
    onExpire,
    onError,
}: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if the script is already present in document
        const scriptId = 'cloudflare-turnstile-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
            
            script.onload = () => {
                setScriptLoaded(true);
            };
        } else {
            if (window.turnstile) {
                setScriptLoaded(true);
            } else {
                const handleLoad = () => setScriptLoaded(true);
                script.addEventListener('load', handleLoad);
                return () => {
                    script?.removeEventListener('load', handleLoad);
                };
            }
        }
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !siteKey || !containerRef.current || widgetIdRef.current) return;

        if (window.turnstile) {
            try {
                const widgetId = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: onVerify,
                    'expired-callback': () => {
                        if (onExpire) onExpire();
                    },
                    'error-callback': () => {
                        if (onError) onError();
                    },
                    theme: 'light',
                });
                widgetIdRef.current = widgetId;
            } catch (err) {
                console.error('Cloudflare Turnstile render error:', err);
            }
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    console.error('Error removing Turnstile widget:', e);
                }
                widgetIdRef.current = null;
            }
        };
    }, [scriptLoaded, siteKey, onVerify, onExpire, onError]);

    return (
        <div 
            ref={containerRef} 
            className="flex justify-center items-center my-4 min-h-[65px] transition-all duration-300" 
        />
    );
}
