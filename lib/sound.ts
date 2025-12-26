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

    private ambientSource: AudioBufferSourceNode | null = null;
    private ambientGain: GainNode | null = null;
    private ambientLfo: OscillatorNode | null = null;
    private ambientFilter: BiquadFilterNode | null = null;
    private currentAmbient: "white_noise" | "rain" | null = null;

    private buffers: Record<string, AudioBuffer> = {};

    private async loadBuffer(type: "rain" | "river"): Promise<AudioBuffer | null> {
        if (this.buffers[type]) return this.buffers[type];
        if (!this.ctx) return null;

        try {
            const url = type === "rain" ? "/sounds/rain.ogg" : "/sounds/river.ogg";
            const res = await fetch(url);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[type] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.error("Failed to load sound", e);
            return null;
        }
    }

    public async playAmbient(type: "white_noise" | "rain" | "river") {
        if (!this.enabled) return;

        // Map legacy "white_noise" to "river" if passed
        const actualType = type === "white_noise" ? "river" : type;

        if (this.currentAmbient === actualType) return;

        this.stopAmbient(true);

        const ctx = this.getContext();
        if (!ctx) return;

        this.currentAmbient = actualType as any;

        const buffer = await this.loadBuffer(actualType as "rain" | "river");
        if (!buffer) return;

        // Verify we haven't been stopped while loading
        if (this.currentAmbient !== actualType) return;

        this.ambientSource = ctx.createBufferSource();
        this.ambientSource.buffer = buffer;
        this.ambientSource.loop = true;

        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.value = 0;

        this.ambientSource.connect(this.ambientGain);
        this.ambientGain.connect(ctx.destination);

        this.ambientSource.start();

        // Gentle fade in
        this.ambientGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
    }

    public stopAmbient(immediate: boolean = false) {
        if (!this.ctx) {
            this.currentAmbient = null;
            return;
        }

        // Capture current nodes locally to "detach" them from the class
        // This prevents race conditions where a new play() overwrites them
        // or this stop() clears the new play()'s nodes.
        const src = this.ambientSource;
        const gain = this.ambientGain;
        const lfo = this.ambientLfo;
        const ctx = this.ctx;

        // Clear class references immediately so we are "stopped" logically
        this.ambientSource = null;
        this.ambientGain = null;
        this.ambientLfo = null;
        this.ambientFilter = null;
        this.currentAmbient = null;

        if (gain) {
            try {
                // Cancel scheduled changes
                gain.gain.cancelScheduledValues(ctx.currentTime);
                gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);

                if (immediate) {
                    gain.gain.value = 0;
                    src?.stop();
                    lfo?.stop();
                    src?.disconnect();
                    lfo?.disconnect();
                } else {
                    // Nice fade out for the detached nodes
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
                    setTimeout(() => {
                        try { src?.stop(); src?.disconnect(); } catch { }
                        try { lfo?.stop(); lfo?.disconnect(); } catch { }
                    }, 1000);
                }
            } catch (e) {
                // Ignore errors on detached nodes
            }
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
        playAmbient: (type: "white_noise" | "rain" | "river") => soundManager.playAmbient(type),
        stopAmbient: () => soundManager.stopAmbient(),
    };
}
