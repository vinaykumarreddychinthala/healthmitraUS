'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
    onEnd: (base64: string | null) => void;
}

export default function SignaturePad({ onEnd }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'black';
            }
        }
    }, []);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        // Handle touch events
        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        }
        
        // Handle mouse events
        return {
            x: (e as React.MouseEvent).clientX - rect.left,
            y: (e as React.MouseEvent).clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        setIsDrawing(true);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        // e.preventDefault(); // Disabled because React synthetic events in passive mode can't preventDefault easily
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            if (canvasRef.current) {
                // Check if canvas is actually drawn on by checking if it's not empty
                const blank = document.createElement('canvas');
                blank.width = canvasRef.current.width;
                blank.height = canvasRef.current.height;
                if (canvasRef.current.toDataURL() === blank.toDataURL()) {
                    onEnd(null);
                } else {
                    onEnd(canvasRef.current.toDataURL('image/png'));
                }
            }
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath(); // reset path
                onEnd(null);
            }
        }
    };

    return (
        <div className="space-y-2">
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white touch-none" style={{ touchAction: 'none' }}>
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="w-full h-[150px] cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-400">Please sign in the box above</span>
                <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                    <RotateCcw className="w-3 h-3 mr-1" /> Clear Signature
                </Button>
            </div>
        </div>
    );
}
