/* GAMEZONE — Audio System */
const GameAudio = {
    muted: false,
    sounds: {},
    bgMusic: null,

    init() {
        this.muted = localStorage.getItem('gz-muted') === 'true';
        this.updateIcon();

        // Create audio context on first user interaction to bypass autoplay policy
        document.addEventListener('click', () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('gz-muted', this.muted);
        this.updateIcon();
        if (this.muted) {
            // Stop all sounds
        }
    },

    updateIcon() {
        const btn = document.getElementById('mute-toggle');
        if (btn) {
            btn.textContent = this.muted ? '🔇' : '🔊';
        }
    },

    playSound(type) {
        if (this.muted) return;
        this.synthesizeSound(type);
    },

    // Simple synthesizer so we don't need external assets
    synthesizeSound(type) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!this.ctx) this.ctx = new AudioContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'jump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'score') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'thud') {
            // Low frequency impact
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'bounce') {
            // Higher pitch short ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'slide') {
            // White noise burst specific
            // Oscillator isn't great for white noise, use many random frequencies
            // Or just a quick 'shhh' sound with saw/tri
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now); // Low grit
            osc.frequency.linearRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    }
};
