import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { PenTool, Eraser, Undo, Trash2, Download, X } from 'lucide-react';

interface SketchDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (imageBlob: Blob, imageName: string) => void;
}

type Tool = 'pen' | 'eraser';

export const SketchDialog: React.FC<SketchDialogProps> = ({ open, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [history, setHistory] = useState<ImageData[]>([]);

    const colors = [
        '#000000', '#FF0000', '#00FF00', '#0000FF',
        '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
        '#808080', '#FFA500', '#800080', '#008000'
    ];

    useEffect(() => {
        if (open && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Set canvas size
                canvas.width = 800;
                canvas.height = 600;

                // Fill with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Save initial state
                saveState();
            }
        }
    }, [open]);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                setHistory(prev => [...prev, imageData]);
            }
        }
    };

    const undo = () => {
        if (history.length > 1) {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const newHistory = [...history];
                    newHistory.pop(); // Remove current state
                    const previousState = newHistory[newHistory.length - 1];
                    ctx.putImageData(previousState, 0, 0);
                    setHistory(newHistory);
                }
            }
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                setHistory([]);
                saveState();
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                ctx.beginPath();
                ctx.moveTo(x, y);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                ctx.lineTo(x, y);
                ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
                ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveState();
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.toBlob((blob) => {
                if (blob) {
                    const timestamp = new Date().getTime();
                    const fileName = `sketch-${timestamp}.png`;
                    onSave(blob, fileName);
                    onClose();
                }
            }, 'image/png');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[900px] bg-white dark:bg-[#0a0a0a] border-zinc-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">Draw a Sketch</DialogTitle>
                    <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                        Create a sketch to attach to your message
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Tools Toolbar */}
                    <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10">
                        {/* Tool Selection */}
                        <div className="flex gap-2">
                            <Button
                                variant={tool === 'pen' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('pen')}
                                className={tool === 'pen' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : ''}
                                title="Pen"
                            >
                                <PenTool className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={tool === 'eraser' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('eraser')}
                                className={tool === 'eraser' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : ''}
                                title="Eraser"
                            >
                                <Eraser className="w-4 h-4" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-8" />

                        {/* Color Palette */}
                        {tool === 'pen' && (
                            <div className="flex gap-2 flex-wrap">
                                {colors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${color === c
                                                ? 'border-zinc-900 dark:border-white scale-110'
                                                : 'border-zinc-300 dark:border-zinc-700 hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                ))}
                            </div>
                        )}

                        <Separator orientation="vertical" className="h-8" />

                        {/* Line Width */}
                        <div className="flex items-center gap-3 min-w-[150px]">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Size:</span>
                            <Slider
                                value={[lineWidth]}
                                onValueChange={(value) => setLineWidth(value[0])}
                                min={1}
                                max={20}
                                step={1}
                                className="flex-1"
                            />
                            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 w-8">{lineWidth}</span>
                        </div>

                        <Separator orientation="vertical" className="h-8" />

                        {/* Actions */}
                        <div className="flex gap-2 ml-auto">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={undo}
                                disabled={history.length <= 1}
                                title="Undo"
                            >
                                <Undo className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearCanvas}
                                title="Clear Canvas"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="relative bg-white rounded-xl border-2 border-zinc-200 dark:border-white/10 overflow-hidden shadow-lg">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="w-full h-auto cursor-crosshair"
                            style={{ display: 'block' }}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="text-zinc-700 dark:text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Save Sketch
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
