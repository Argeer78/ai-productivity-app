"use client";

// Simple Web Audio API wrapper for UI sounds
// No external assets required!

class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== "undefined") {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
            // Load pref
            try {
                const stored = localStorage.getItem("sound_enabled");
                this.enabled = stored !== "false"; // default true
            } catch { }
        }
    }

    private getContext() {
        if (!this.ctx) return null;
        if (this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }

    public isEnabled() {
        return this.enabled;
    }

    public toggle(on: boolean) {
        this.enabled = on;
        if (typeof window !== "undefined") {
            localStorage.setItem("sound_enabled", String(on));
        }
    }

    public play(type: "pop" | "success" | "click" | "toggle") {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case "pop":
                // High pitched short sine
                osc.type = "sine";
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case "click":
                // Short tick
                osc.type = "square";
                osc.frequency.setValueAtTime(150, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case "toggle":
                // Two tones
                osc.type = "sine";
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case "success":
                // Major Arpeggio (C E G C)
                this.playNote(ctx, 523.25, now, 0.1); // C5
                this.playNote(ctx, 659.25, now + 0.1, 0.1); // E5
                this.playNote(ctx, 783.99, now + 0.2, 0.4); // G5
                break;
        }
    }

    private playNote(ctx: AudioContext, freq: number, time: number, dur: number) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        osc.start(time);
        osc.stop(time + dur);
    }
}

export const soundManager = new SoundManager();

export function useSound() {
    return {
        play: (type: "pop" | "success" | "click" | "toggle") => soundManager.play(type),
        isEnabled: () => soundManager.isEnabled(),
        toggle: (on: boolean) => soundManager.toggle(on),
    };
}
