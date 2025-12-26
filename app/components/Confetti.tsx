"use client";

import { useEffect, useRef } from "react";
import { useSound } from "@/lib/sound";

export default function Confetti({ duration = 3000 }: { duration?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { play } = useSound();

    useEffect(() => {
        // Play success sound on mount!
        play("success");

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const colors = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#3b82f6"];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            alpha: number;
            size: number;

            constructor() {
                this.x = canvas!.width / 2;
                this.y = canvas!.height / 2;
                this.vx = (Math.random() - 0.5) * 20;
                this.vy = (Math.random() - 0.5) * 20;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = 1;
                this.size = Math.random() * 5 + 5;
            }

            draw() {
                if (!ctx) return;
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.5; // gravity
                this.alpha -= 0.01;
            }
        }

        // Burst
        for (let i = 0; i < 100; i++) {
            particles.push(new Particle());
        }

        let animationId: number;

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.update();
                p.draw();
                if (p.alpha <= 0) particles.splice(index, 1);
            });

            if (particles.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animate();

        const timeout = setTimeout(() => {
            cancelAnimationFrame(animationId);
        }, duration);

        return () => {
            cancelAnimationFrame(animationId);
            clearTimeout(timeout);
        };
    }, [duration, play]); // Added play to dependencies

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
        />
    );
}
