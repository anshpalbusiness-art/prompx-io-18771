import { useEffect, useRef } from 'react';

interface StarfieldProps {
    className?: string;
    speed?: number;
    density?: number;
}

const Starfield = ({ className, speed = 1, density = 1 }: StarfieldProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        // Store stars with varying depths (z-index equivalent) for parallax effect
        let stars: Array<{
            x: number;
            y: number;
            z: number; // depth: smaller is further away
            size: number;
            brightness: number;
        }> = [];

        const resizeCanvas = () => {
            // Use parent container dimensions if possible, or window fallback
            const parent = canvas.parentElement;
            canvas.width = parent ? parent.clientWidth : window.innerWidth;
            canvas.height = parent ? parent.clientHeight : window.innerHeight;
            initStars();
        };

        const initStars = () => {
            // Density calculation: roughly 1 star per X pixels squared, adjusted by density prop
            const pixelArea = canvas.width * canvas.height;
            const baseCount = Math.floor(pixelArea / 4000) * density;

            stars = Array.from({ length: baseCount }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
                size: Math.random() * 1.2,
                brightness: Math.random(),
            }));
        };

        const draw = () => {
            // Clear with slight transparency for potential trails? No, keep it clean for this style.
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw stars
            ctx.fillStyle = '#FFFFFF';

            stars.forEach((star) => {
                // Move star based on its depth (parallax)
                // Adjust speed calculation: closer stars (higher z) move faster
                star.y -= (0.2 * speed * star.z);

                // Wrap around vertically
                if (star.y < 0) {
                    star.y = canvas.height;
                    star.x = Math.random() * canvas.width;
                }

                // Draw star
                // Opacity depends on brightness and darker theme preference
                const alpha = 0.3 + (star.brightness * 0.7); // 0.3 to 1.0 opacity

                ctx.beginPath();
                ctx.globalAlpha = alpha;
                // Size also affected by depth
                const radius = star.size * star.z;
                ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0; // Reset

            animationFrameId = requestAnimationFrame(draw);
        };

        resizeCanvas();
        // Add resize listener
        window.addEventListener('resize', resizeCanvas);
        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [speed, density]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-0 pointer-events-none ${className}`}
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default Starfield;
