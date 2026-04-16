/* ============================================================
   NEON MEMORY — Card Matching Game 🃏  (Fixed)
   4×4 grid, 8 pairs of neon icon cards
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl;
    let animId = null, running = false;

    const COLS = 4, ROWS = 4;
    const ICONS = ['🌟', '🔥', '💎', '🚀', '⚡', '🌈', '🎯', '🏆'];
    const NEON = ['#cc00ff', '#00d4ff', '#ff0088', '#ffe600', '#ff6600', '#00ff88', '#4488ff', '#dd44ff'];

    let cards = [], flippedIdx = [], moves = 0, matches = 0;
    let lockBoard = false, frameCount = 0;
    let gameWon = false, wonFrame = 0;
    let particles = [];

    /* ── Layout ────────────────────────────────────────────── */
    function layout() {
        const pad = 14, gap = 8, hudH = 48;
        const cw = (canvas.width - pad * 2 - gap * (COLS - 1)) / COLS;
        const ch = (canvas.height - pad * 2 - gap * (ROWS - 1) - hudH) / ROWS;
        cards.forEach((c, i) => {
            c.col = i % COLS; c.row = Math.floor(i / COLS);
            c.x = pad + c.col * (cw + gap);
            c.y = hudH + pad + c.row * (ch + gap);
            c.w = cw; c.h = ch;
        });
    }

    /* ── Init / reset ──────────────────────────────────────── */
    function newGame() {
        const deck = [...ICONS, ...ICONS];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        cards = deck.map((icon, i) => ({
            id: i, icon,
            flipped: false, matched: false,
            flipProg: 0,        // 0 = back face, 1 = front face
            x: 0, y: 0, w: 0, h: 0, col: 0, row: 0
        }));
        flippedIdx = []; moves = 0; matches = 0;
        lockBoard = false; frameCount = 0;
        gameWon = false; wonFrame = 0; particles = [];
        layout();
    }

    /* ── Particles ──────────────────────────────────────────── */
    function burst(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = Math.random() * 5 + 1;
            particles.push({
                x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                life: 45, maxLife: 45, color
            });
        }
    }

    /* ── Round-rect path helper (cross-browser safe) ────────── */
    function rrPath(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    /* ── Update ─────────────────────────────────────────────── */
    function update() {
        frameCount++;
        if (gameWon) { wonFrame++; return; }

        // Animate card flips (lerp toward target)
        for (const c of cards) {
            const target = (c.flipped || c.matched) ? 1 : 0;
            c.flipProg += (target - c.flipProg) * 0.18;
            if (Math.abs(c.flipProg - target) < 0.005) c.flipProg = target;
        }

        // Particles physics
        for (const p of particles) {
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.15; p.vx *= 0.93;
            p.life--;
        }
        particles = particles.filter(p => p.life > 0);

        // === MATCH CHECK ===
        // Only evaluate once when exactly 2 cards are freshly flipped and board not locked
        if (!lockBoard && flippedIdx.length === 2) {
            lockBoard = true;   // lock immediately so this block runs only once
            moves++;
            const [a, b] = flippedIdx;

            if (cards[a].icon === cards[b].icon) {
                // ✅ MATCH — mark matched after brief pause, then UNLOCK
                setTimeout(() => {
                    if (!running) return;
                    cards[a].matched = cards[b].matched = true;
                    burst(cards[a].x + cards[a].w / 2, cards[a].y + cards[a].h / 2, NEON[a % NEON.length]);
                    burst(cards[b].x + cards[b].w / 2, cards[b].y + cards[b].h / 2, NEON[b % NEON.length]);
                    flippedIdx = [];
                    matches++;
                    if (matches === ICONS.length) gameWon = true;
                    lockBoard = false;   // ✅ FIX: unlock after match
                }, 450);
            } else {
                // ❌ NO MATCH — flip back after pause, then unlock
                setTimeout(() => {
                    if (!running) return;
                    cards[a].flipped = false;
                    cards[b].flipped = false;
                    flippedIdx = [];
                    lockBoard = false;
                }, 950);
            }
        }
    }

    /* ── Draw ───────────────────────────────────────────────── */
    function drawBg() {
        ctx.fillStyle = '#06060f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Subtle grid lines
        ctx.strokeStyle = 'rgba(204,0,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }

    function drawCard(c, idx) {
        const { x, y, w, h, flipProg, matched } = c;
        const cardCX = x + w / 2;

        // Pinch-scale to simulate 3D flip: scaleX goes 1→0→1 as flipProg goes 0→0.5→1
        const scaleX = Math.abs(flipProg * 2 - 1);
        const showFront = flipProg >= 0.5;

        // Effective drawn width — clamp to avoid degenerate scale
        const drawnW = Math.max(scaleX * w, 0.5);
        const xOff = (w - drawnW) / 2;
        const rx = x + xOff; // left edge after scaling
        const rw = drawnW;
        const radius = 8;

        ctx.save();

        if (showFront) {
            // — Front face —
            const col = NEON[idx % NEON.length];
            if (matched) {
                ctx.shadowColor = col;
                ctx.shadowBlur = 16;
            }
            ctx.fillStyle = matched ? '#0a1f14' : '#0a0820';
            rrPath(rx, y, rw, h, radius); ctx.fill();
            ctx.strokeStyle = col; ctx.lineWidth = 2.5;
            rrPath(rx, y, rw, h, radius); ctx.stroke();
            ctx.shadowBlur = 0;

            // Emoji — only when card is wide enough to show cleanly
            if (scaleX > 0.25) {
                const fs = Math.min(w, h) * 0.40;
                ctx.font = `${fs}px serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha = Math.min(1, (scaleX - 0.25) / 0.35);
                ctx.fillText(c.icon, cardCX, y + h / 2);
                ctx.globalAlpha = 1;
            }
        } else {
            // — Back face —
            const hue = (frameCount * 0.5 + idx * 22) % 360;
            ctx.fillStyle = '#0d0828';
            rrPath(rx, y, rw, h, radius); ctx.fill();
            ctx.strokeStyle = `hsl(${hue},100%,60%)`; ctx.lineWidth = 2.5;
            rrPath(rx, y, rw, h, radius); ctx.stroke();

            // Dot pattern on back (only when wide enough)
            if (scaleX > 0.3) {
                ctx.globalAlpha = scaleX * 0.5;
                ctx.fillStyle = `hsl(${hue},80%,55%)`;
                const dotStep = Math.min(rw, h) * 0.28;
                for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
                    ctx.beginPath();
                    ctx.arc(
                        rx + rw * 0.2 + dc * dotStep * 0.7,
                        y + h * 0.25 + dr * dotStep * 0.6,
                        2.5, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
    }

    function drawHUD() {
        const cw = canvas.width;
        ctx.save();
        ctx.textBaseline = 'middle';

        // Title
        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.textAlign = 'center'; ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
        ctx.fillText('🃏 NEON MEMORY', cw / 2, 16);
        ctx.shadowBlur = 0;

        // Moves
        ctx.font = 'bold 11px Orbitron, monospace';
        ctx.textAlign = 'left'; ctx.fillStyle = '#cc00ff';
        ctx.fillText(`Moves: ${moves}`, 12, 16);

        // Pairs
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffe600';
        ctx.fillText(`${matches}/${ICONS.length} pairs`, cw - 12, 16);

        // Progress bar — use rrPath helper (no ctx.roundRect)
        const bx = 12, by = 30, bw = cw - 24, bh = 5;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        rrPath(bx, by, bw, bh, 3); ctx.fill();
        if (matches > 0) {
            const bgr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
            bgr.addColorStop(0, '#cc00ff'); bgr.addColorStop(1, '#00d4ff');
            ctx.fillStyle = bgr;
            ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8;
            rrPath(bx, by, bw * matches / ICONS.length, bh, 3); ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    function drawParticles() {
        ctx.save();
        for (const p of particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.restore();
    }

    function drawWin() {
        if (!gameWon) return;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const pulse = 1 + 0.06 * Math.sin(wonFrame * 0.08);
        ctx.font = `bold ${Math.floor(32 * pulse)}px Orbitron, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 30;
        ctx.fillText('🏆 YOU WIN!', cx, cy - 28);
        ctx.shadowBlur = 0;
        ctx.font = '15px Orbitron, monospace'; ctx.fillStyle = '#00d4ff';
        ctx.fillText(`${moves} moves — all ${matches} pairs!`, cx, cy + 16);
        ctx.font = '11px Orbitron, monospace'; ctx.fillStyle = 'rgba(200,200,255,0.65)';
        ctx.fillText('Click / Space to play again', cx, cy + 52);
        ctx.restore();
    }

    /* ── Loop ────────────────────────────────────────────────── */
    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg();
        cards.forEach((c, i) => drawCard(c, i));
        drawParticles();
        drawHUD();
        drawWin();
        animId = requestAnimationFrame(loop);
    }

    /* ── Input ──────────────────────────────────────────────── */
    function handlePointer(ex, ey) {
        if (gameWon) { newGame(); return; }
        if (lockBoard || flippedIdx.length >= 2) return;
        for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            if (c.matched || c.flipped) continue;
            if (ex >= c.x && ex <= c.x + c.w && ey >= c.y && ey <= c.y + c.h) {
                c.flipped = true;
                flippedIdx.push(i);
                break;
            }
        }
    }

    function onKey(e) { if (e.code === 'Space' && gameWon) newGame(); }

    function onClick(e) {
        const r = canvas.getBoundingClientRect();
        handlePointer(
            (e.clientX - r.left) * canvas.width / r.width,
            (e.clientY - r.top) * canvas.height / r.height
        );
    }
    function onTouch(e) {
        e.preventDefault();
        const r = canvas.getBoundingClientRect(), t = e.changedTouches[0];
        handlePointer(
            (t.clientX - r.left) * canvas.width / r.width,
            (t.clientY - r.top) * canvas.height / r.height
        );
    }

    /* ── API ─────────────────────────────────────────────────── */
    return {
        init(c, s) {
            canvas = c; scoreEl = s;
            ctx = canvas.getContext('2d');
            running = true; newGame();
            canvas.addEventListener('click', onClick);
            canvas.addEventListener('touchend', onTouch, { passive: false });
            window.addEventListener('keydown', onKey);
            loop();
        },
        destroy() {
            running = false;
            if (animId) cancelAnimationFrame(animId);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchend', onTouch);
            window.removeEventListener('keydown', onKey);
        }
    };
})();
