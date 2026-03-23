import React, { useEffect, useRef } from "react";
import classes from "./ParticleImageCanvas.module.css";

const MAX_DPR = 2;
const ALPHA_THRESHOLD = 28;
const REPEL_RADIUS = 82;
const REPEL_FORCE = 2.6;
const MAX_REPEL_IMPULSE = 6;
const RETURN_FORCE = 0.0012;
const FRICTION = 0.974;
const LUNAR_GRAVITY = 0.005;
const MAX_SPEED = 10;

const LOGO_VIEWBOX = {
    width: 3599.16,
    height: 3120.19,
};

const WHITE_POLYGON = [
    [0, 3120.19],
    [1377.32, 0],
    [2246.58, 0],
    [2925.61, 1577.39],
    [2096.28, 1577.39],
    [1631.51, 432.43],
    [1979.17, 432.43],
    [1404.87, 1863.19],
    [2209.74, 1863.19],
    [2467.58, 2513.97],
    [1143.67, 2513.97],
    [900.45, 3120.19],
];

const PINK_POLYGON = [
    [3459.28, 2799.92],
    [3599.16, 3120.19],
    [2708.68, 3120.19],
    [2581.6, 2799.92],
];

function drawPolygon(context, points, color, scaleX, scaleY, offsetX, offsetY) {
    context.beginPath();
    context.moveTo(offsetX + points[0][0] * scaleX, offsetY + points[0][1] * scaleY);

    for (let index = 1; index < points.length; index += 1) {
        context.lineTo(offsetX + points[index][0] * scaleX, offsetY + points[index][1] * scaleY);
    }

    context.closePath();
    context.fillStyle = color;
    context.fill();
}

function drawLogo(context, width, height) {
    context.clearRect(0, 0, width, height);

    const horizontalPadding = Math.max(6, width * 0.018);
    const verticalPadding = Math.max(4, height * 0.008);
    const scaleX = (width - horizontalPadding * 2) / LOGO_VIEWBOX.width;
    const scaleY = (height - verticalPadding * 2) / LOGO_VIEWBOX.height;

    const drawWidth = LOGO_VIEWBOX.width * scaleX;
    const drawHeight = LOGO_VIEWBOX.height * scaleY;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    drawPolygon(context, WHITE_POLYGON, "#ffffff", scaleX, scaleY, offsetX, offsetY);
    drawPolygon(context, PINK_POLYGON, "#e5097f", scaleX, scaleY, offsetX, offsetY);
}

function ParticleImageCanvas({ alt = "", className = "", style }) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!wrapper || !canvas || !context) {
            return undefined;
        }

        const mouse = { x: 0, y: 0, active: false };
        const particles = [];
        const sizeState = { width: 0, height: 0 };
        let animationFrameId = 0;
        let resizeObserver = null;
        let destroyed = false;

        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

        const drawParticles = () => {
            if (destroyed) {
                return;
            }

            const { width, height } = sizeState;
            context.clearRect(0, 0, width, height);

            particles.forEach((particle) => {
                if (!prefersReducedMotion && mouse.active) {
                    const dx = particle.x - mouse.x;
                    const dy = particle.y - mouse.y;
                    const distanceSquared = dx * dx + dy * dy;

                    if (distanceSquared > 0 && distanceSquared < REPEL_RADIUS * REPEL_RADIUS) {
                        const distance = Math.sqrt(distanceSquared);
                        const force = Math.min(
                            (1 - distance / REPEL_RADIUS) * REPEL_FORCE * particle.density,
                            MAX_REPEL_IMPULSE
                        );

                        particle.vx += (dx / distance) * force;
                        particle.vy += (dy / distance) * force * 0.88;
                    }
                }

                const toBaseX = particle.baseX - particle.x;
                const toBaseY = particle.baseY - particle.y;
                const displacement = Math.hypot(toBaseX, toBaseY);

                if (!prefersReducedMotion && mouse.active && displacement > 1) {
                    particle.vy += LUNAR_GRAVITY * particle.gravityScale;
                }

                particle.vx += toBaseX * RETURN_FORCE;
                particle.vy += toBaseY * RETURN_FORCE;
                particle.vx *= FRICTION;
                particle.vy *= FRICTION;

                const speed = Math.hypot(particle.vx, particle.vy);
                if (speed > MAX_SPEED) {
                    const speedScale = MAX_SPEED / speed;
                    particle.vx *= speedScale;
                    particle.vy *= speedScale;
                }

                particle.x += particle.vx;
                particle.y += particle.vy;

                const remainingX = particle.baseX - particle.x;
                const remainingY = particle.baseY - particle.y;
                const remainingDistance = Math.hypot(remainingX, remainingY);

                if (remainingDistance < 0.35 && speed < 0.08) {
                    particle.x = particle.baseX;
                    particle.y = particle.baseY;
                    particle.vx = 0;
                    particle.vy = 0;
                }

                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            });

            animationFrameId = window.requestAnimationFrame(drawParticles);
        };

        const rebuildParticles = () => {
            if (destroyed) {
                return;
            }

            const width = Math.max(1, Math.floor(wrapper.clientWidth));
            const height = Math.max(1, Math.floor(wrapper.clientHeight));
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

            sizeState.width = width;
            sizeState.height = height;

            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            const offscreen = document.createElement("canvas");
            offscreen.width = width;
            offscreen.height = height;
            const offscreenContext = offscreen.getContext("2d");

            if (!offscreenContext) {
                return;
            }

            drawLogo(offscreenContext, width, height);

            const imageData = offscreenContext.getImageData(0, 0, width, height);
            const data = imageData.data;
            const gap = width < 520 ? 7 : 8;
            const dotSize = width < 520 ? 1.7 : 2;

            particles.length = 0;

            for (let y = 0; y < height; y += gap) {
                for (let x = 0; x < width; x += gap) {
                    const index = (y * width + x) * 4;
                    const alpha = data[index + 3];

                    if (alpha <= ALPHA_THRESHOLD) {
                        continue;
                    }

                    const red = data[index];
                    const green = data[index + 1];
                    const blue = data[index + 2];

                    particles.push({
                        x,
                        y,
                        baseX: x,
                        baseY: y,
                        vx: 0,
                        vy: 0,
                        density: 0.9 + Math.random() * 0.45,
                        gravityScale: 0.8 + Math.random() * 0.35,
                        size: dotSize,
                        color: `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`,
                    });
                }
            }
        };

        const handleMouseMove = (event) => {
            const rect = wrapper.getBoundingClientRect();
            mouse.x = event.clientX - rect.left;
            mouse.y = event.clientY - rect.top;
            mouse.active = true;
        };

        const handleMouseLeave = () => {
            mouse.active = false;
        };

        wrapper.addEventListener("mousemove", handleMouseMove);
        wrapper.addEventListener("mouseleave", handleMouseLeave);

        resizeObserver = new ResizeObserver(() => {
            rebuildParticles();
        });
        resizeObserver.observe(wrapper);

        rebuildParticles();
        animationFrameId = window.requestAnimationFrame(drawParticles);

        return () => {
            destroyed = true;
            window.cancelAnimationFrame(animationFrameId);
            resizeObserver?.disconnect();
            wrapper.removeEventListener("mousemove", handleMouseMove);
            wrapper.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            className={`${classes.root} ${className}`.trim()}
            style={style}
            role="img"
            aria-label={alt}
        >
            <canvas ref={canvasRef} className={classes.canvas} />
        </div>
    );
}

export default ParticleImageCanvas;
