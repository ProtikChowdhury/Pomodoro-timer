/**
 * Zen Mode - Rain on Window Effect
 * Creates a procedural rain animation on a canvas overlay.
 */

const ZenMode = (() => {
    let canvas, ctx;
    let isActive = false;
    let drops = [];
    let animationFrameId;
    let width, height;

    // Configuration
    const CONFIG = {
        dropCount: 500, // Significantly more drops for heavy rain feeling
        gravity: 0.5,
        wind: 0,
        color: '255, 255, 255'
    };

    class Drop {
        constructor() {
            this.init();
        }

        init(startTop = false) {
            // Random depth (z-index approx) determines speed, size, opacity
            this.z = Math.random();

            this.x = Math.random() * width;
            this.y = startTop ? Math.random() * -height : Math.random() * height;

            // Speed depends on "depth" (closer = faster)
            this.speed = (this.z * 10) + 5;

            // Length simulates motion blur based on speed
            this.length = this.speed * 1.5;

            // Opacity: closer = more opaque, further = fainter
            this.opacity = (this.z * 0.3) + 0.05;
        }

        update() {
            this.y += this.speed;
            this.x += CONFIG.wind;

            // Reset if goes off screen
            if (this.y > height) {
                this.init(true); // Re-init at top
                this.y = -this.length; // Start fully off-screen
            }
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.length);
            ctx.strokeStyle = `rgba(${CONFIG.color}, ${this.opacity})`;
            ctx.lineWidth = 1.5; // Slightly thicker than hairline for visibility
            ctx.stroke();
        }
    }

    function init() {
        console.log("ZenMode: Realistic Init called");
        canvas = document.getElementById('zen-canvas');
        if (!canvas) {
            console.error("ZenMode: Canvas not found!");
            return;
        }

        ctx = canvas.getContext('2d');
        window.addEventListener('resize', resize);
        // Initial resize
        resize();
    }

    function resize() {
        if (!canvas) return;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        if (isActive) {
            createDrops();
        }
    }

    function createDrops() {
        drops = [];
        for (let i = 0; i < CONFIG.dropCount; i++) {
            drops.push(new Drop());
        }
    }

    function animate() {
        if (!isActive) return;

        ctx.clearRect(0, 0, width, height);

        drops.forEach(drop => {
            drop.update();
            drop.draw(ctx);
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function start() {
        if (!canvas) init();
        if (!canvas) return;

        console.log("ZenMode: Starting Realistic Rain");
        isActive = true;

        // Remove hidden class (Fix from previous task)
        canvas.classList.remove('hidden');

        resize();
        createDrops();
        animate();

        document.body.classList.add('zen-mode-active');
    }

    function stop() {
        console.log("ZenMode: Stopping");
        isActive = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        if (canvas) {
            canvas.classList.add('hidden');
            ctx.clearRect(0, 0, width, height);
        }

        document.body.classList.remove('zen-mode-active');
    }

    return {
        init,
        start,
        stop
    };
})();
