import React, { useEffect, useRef } from "react";
import classes from "./ParticleImageCanvas.module.css";

const MAX_DPR = 2;
const ALPHA_THRESHOLD = 28;
const REPEL_RADIUS = 82;
const REPEL_FORCE = 2.6;
const MAX_REPEL_IMPULSE = 6;
const RETURN_FORCE = 0.0012;
const FRICTION = 0.974;
const LUNAR_GRAVITY = 0;
const MAX_SPEED = 20;

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

    const horizontalPadding = Math.max(12, width * 0.045);
    const verticalPadding = Math.max(10, height * 0.045);
    const safeWidth = Math.max(1, width - horizontalPadding * 2);
    const safeHeight = Math.max(1, height - verticalPadding * 2);
    const scale = Math.min(safeWidth / LOGO_VIEWBOX.width, safeHeight / LOGO_VIEWBOX.height);
    const scaleX = scale;
    const scaleY = scale;

    const drawWidth = LOGO_VIEWBOX.width * scaleX;
    const drawHeight = LOGO_VIEWBOX.height * scaleY;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    drawPolygon(context, WHITE_POLYGON, "#ffffff", scaleX, scaleY, offsetX, offsetY);
    drawPolygon(context, PINK_POLYGON, "#e5097f", scaleX, scaleY, offsetX, offsetY);
}

function ParticleImageCanvas({
    alt = "",
    className = "",
    style,
    bleedMultiplier = 1,
    bleedViewportRatio = 0.28,
    constrainBleedByView = true,
    assembleOnFirstVisible = false,
    initialScatterStrength = 0.22,
    initialScatterShape = "random",
}) {
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
        /** Текущий bleed: координаты частиц сдвинуты на +bleed относительно обёртки */
        const bleedState = { px: 0 };
        const particles = [];
        const assembleState = { active: !assembleOnFirstVisible, activated: !assembleOnFirstVisible };
        const sizeState = { width: 0, height: 0 };
        let animationFrameId = 0;
        let resizeObserver = null;
        let visibilityObserver = null;
        let destroyed = false;

        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

        const drawParticles = () => {
            if (destroyed) {
                return;
            }

            const { width, height } = sizeState;
            context.clearRect(0, 0, width, height);

            particles.forEach((particle) => {
                if (!assembleState.active) {
                    context.fillStyle = particle.color;
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    context.fill();
                    return;
                }

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

            const viewW = Math.max(1, Math.floor(wrapper.clientWidth));
            const viewH = Math.max(1, Math.floor(wrapper.clientHeight));
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

            // «Bleed»: canvas больше видимого блока, буква строится на полном viewW×viewH — не мельчает.
            // Смещение визуально компенсируется position + отрицательные left/top.
            const safeBleedMultiplier = Number.isFinite(bleedMultiplier) && bleedMultiplier > 0
                ? bleedMultiplier
                : 1;
            const rawBleed = Math.ceil((REPEL_RADIUS + MAX_REPEL_IMPULSE + MAX_SPEED * 6 + 28) * safeBleedMultiplier);
            const maxBleedW = Math.max(0, Math.floor((viewW - 48) / 2));
            const maxBleedH = Math.max(0, Math.floor((viewH - 48) / 2));
            const safeBleedViewportRatio = Number.isFinite(bleedViewportRatio) && bleedViewportRatio > 0
                ? bleedViewportRatio
                : 0.28;
            const viewportBleedCap = Math.floor(Math.min(viewW, viewH) * safeBleedViewportRatio);
            const bleed = constrainBleedByView
                ? Math.min(rawBleed, maxBleedW, maxBleedH, viewportBleedCap)
                : Math.min(rawBleed, viewportBleedCap);
            bleedState.px = bleed;

            const bufW = viewW + bleed * 2;
            const bufH = viewH + bleed * 2;

            sizeState.width = bufW;
            sizeState.height = bufH;

            canvas.width = Math.round(bufW * dpr);
            canvas.height = Math.round(bufH * dpr);
            canvas.style.position = "absolute";
            canvas.style.left = `${-bleed}px`;
            canvas.style.top = `${-bleed}px`;
            canvas.style.width = `${bufW}px`;
            canvas.style.height = `${bufH}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            const offscreen = document.createElement("canvas");
            offscreen.width = viewW;
            offscreen.height = viewH;
            const offscreenContext = offscreen.getContext("2d");

            if (!offscreenContext) {
                return;
            }

            drawLogo(offscreenContext, viewW, viewH);

            const imageData = offscreenContext.getImageData(0, 0, viewW, viewH);
            const data = imageData.data;
            const gap = viewW < 520 ? 7 : 8;
            const dotSize = viewW < 520 ? 1.7 : 2;

            particles.length = 0;
            const seedParticles = [];

            for (let y = 0; y < viewH; y += gap) {
                for (let x = 0; x < viewW; x += gap) {
                    const index = (y * viewW + x) * 4;
                    const alpha = data[index + 3];

                    if (alpha <= ALPHA_THRESHOLD) {
                        continue;
                    }

                    const red = data[index];
                    const green = data[index + 1];
                    const blue = data[index + 2];
                    const baseX = x + bleed;
                    const baseY = y + bleed;
                    seedParticles.push({
                        x: baseX,
                        y: baseY,
                        baseX,
                        baseY,
                        vx: 0,
                        vy: 0,
                        density: 0.9 + Math.random() * 0.45,
                        gravityScale: 0.8 + Math.random() * 0.35,
                        size: dotSize,
                        color: `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`,
                    });
                }
            }

            if (!assembleState.activated) {
                const scatterRadius = Math.min(viewW, viewH) * Math.max(0, initialScatterStrength);
                const centerX = bleed + viewW / 2;
                const centerY = bleed + viewH / 2;
                const total = seedParticles.length || 1;
                const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                const shape = String(initialScatterShape || "random").toLowerCase();

                seedParticles.forEach((particle, index) => {
                    const t = (index + 0.5) / total;
                    let x = particle.baseX;
                    let y = particle.baseY;

                    if (shape === "sphere") {
                        const radius = Math.sqrt(t) * scatterRadius;
                        const angle = index * goldenAngle;
                        x = centerX + Math.cos(angle) * radius;
                        y = centerY + Math.sin(angle) * radius;
                    } else if (shape === "ring") {
                        const angle = index * goldenAngle;
                        const radius = scatterRadius;
                        x = centerX + Math.cos(angle) * radius;
                        y = centerY + Math.sin(angle) * radius;
                    } else if (shape === "spiral") {
                        const angle = index * 0.32;
                        const radius = t * scatterRadius;
                        x = centerX + Math.cos(angle) * radius;
                        y = centerY + Math.sin(angle) * radius;
                    } else if (shape === "grid") {
                        const cols = Math.max(1, Math.round(Math.sqrt(total)));
                        const rows = Math.max(1, Math.ceil(total / cols));
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        const cellW = (scatterRadius * 2) / Math.max(1, cols - 1 || 1);
                        const cellH = (scatterRadius * 2) / Math.max(1, rows - 1 || 1);
                        x = centerX - scatterRadius + col * cellW;
                        y = centerY - scatterRadius + row * cellH;
                    } else if (shape === "line") {
                        x = centerX - scatterRadius + t * (scatterRadius * 2);
                        y = centerY;
                    } else if (shape === "from-left") {
                        const baseX = centerX - scatterRadius * 2.2;
                        const baseY = centerY - scatterRadius + t * (scatterRadius * 2);
                        const jitterX = (Math.random() - 0.2) * scatterRadius * 0.35;
                        const jitterY = (Math.random() - 0.2) * scatterRadius * 0.45;
                        const waveY = Math.sin(index * 0.22) * scatterRadius * 0.08;
                        x = baseX + jitterX;
                        y = baseY + jitterY + waveY;
                    } else if (shape === "from-right") {
                        x = centerX + scatterRadius * 2.2;
                        y = centerY - scatterRadius + t * (scatterRadius * 2);
                    } else {
                        const scatterAngle = Math.random() * Math.PI;
                        const scatterDistance = Math.random() * scatterRadius;
                        x = particle.baseX + Math.cos(scatterAngle * 20) * scatterDistance;
                        y = particle.baseY + Math.sin(scatterAngle * 50) * scatterDistance;
                    }

                    particle.x = x;
                    particle.y = y;
                });
            }

            particles.push(...seedParticles);
        };

        const handleMouseMove = (event) => {
            const rect = wrapper.getBoundingClientRect();
            const b = bleedState.px;
            mouse.x = event.clientX - rect.left + b;
            mouse.y = event.clientY - rect.top + b;
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

        if (assembleOnFirstVisible && typeof IntersectionObserver !== "undefined") {
            visibilityObserver = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    if (!entry?.isIntersecting) return;
                    assembleState.active = true;
                    assembleState.activated = true;
                    visibilityObserver?.disconnect();
                    visibilityObserver = null;
                },
                { threshold: 0.2 }
            );
            visibilityObserver.observe(wrapper);
        }

        rebuildParticles();
        animationFrameId = window.requestAnimationFrame(drawParticles);

        return () => {
            destroyed = true;
            window.cancelAnimationFrame(animationFrameId);
            resizeObserver?.disconnect();
            visibilityObserver?.disconnect();
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
