/**
 * PromptX Starfield Animation
 * Vanilla JS port of Starfield.tsx
 */
class Starfield {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.speed = options.speed || 0.5;
        this.density = options.density || 1;
        this.stars = [];
        this.animationId = null;

        this.init();
        this.animate = this.animate.bind(this);
        this.resize = this.resize.bind(this);

        window.addEventListener('resize', this.resize);
        // Start animation
        this.animate();
    }

    init() {
        this.resize();
    }

    resize() {
        // Use parent dimensions
        const parent = this.canvas.parentElement || document.body;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.createStars();
    }

    createStars() {
        const area = this.canvas.width * this.canvas.height;
        const count = Math.floor(area / 4000) * this.density;

        this.stars = Array.from({ length: count }, () => ({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            z: Math.random() * 0.5 + 0.5, // Depth 0.5 - 1.0
            size: Math.random() * 1.2,
            brightness: Math.random()
        }));
    }

    animate() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        this.ctx.fillStyle = '#FFFFFF';

        this.stars.forEach(star => {
            // Update position (move up)
            star.y -= (0.2 * this.speed * star.z);

            // Wrap around
            if (star.y < 0) {
                star.y = this.canvas.height;
                star.x = Math.random() * this.canvas.width;
            }

            // Draw
            const alpha = 0.3 + (star.brightness * 0.7);
            this.ctx.globalAlpha = alpha;

            this.ctx.beginPath();
            const radius = star.size * star.z;
            this.ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalAlpha = 1.0;
        this.animationId = requestAnimationFrame(this.animate);
    }

    destroy() {
        window.removeEventListener('resize', this.resize);
        cancelAnimationFrame(this.animationId);
    }
}

// Auto-initialize if canvas with class 'promptx-starfield' exists
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.promptx-starfield');
    if (canvas) {
        new Starfield(canvas, { speed: 0.5, density: 1.5 });
    }
});
