/* ============================================================
   GAME: Pixel Dodge — Survive falling blocks, get faster!
   Easy to learn, hard to master. Pure dodge arcade fun.
   Controls: ← / → or A / D to move   |   SPACE to dash sideways
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let playing = false;
    let score = 0, hiScore = parseInt(localStorage.getItem('gz-dodge-hi') || '0');
    let speed = 3;        // block fall speed
    let spawnRate = 55;   // tick interval between spawns
    let tick = 0;

    // Player
    const P = { w: 40, h: 16, y: 0, x: 0, vx: 0, dash: 0, dashCD: 0 };
    const DASH_POWER = 180; // px total dash distance
    const DASH_DUR = 10;  // frames
    const DASH_CD = 45;  // frames cooldown

    let blocks = [];
    let particles = [];
    let stars = [];
    let moveLock = false;

    // 8 named color palettes for blocks (cycle by score)
    const PALETTES = [
        ['#ff4d6d', '#ff6b6b'],
        ['#ff9f1c', '#ffbf69'],
        ['#ffe66d', '#fff3b0'],
        ['#2dc653', '#57cc99'],
        ['#00b4d8', '#90e0ef'],
        ['#7209b7', '#b5179e'],
        ['#f72585', '#ff77b7'],
        ['#06d6a0', '#80ffdb'],
    ];

    function palette() { return PALETTES[Math.floor(score / 50) % PALETTES.length]; }

    function buildStars() {
        stars = [];
        for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * 3000, y: Math.random() * 3000, r: 0.5 + Math.random() * 1.2, a: 0.2 + Math.random() * 0.5 });
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        buildStars(); reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function reset() {
        score = 0; speed = 3; spawnRate = 55; tick = 0;
        P.x = canvas.width / 2 - P.w / 2;
        P.y = canvas.height - 45;
        P.vx = 0; P.dash = 0; P.dashCD = 0;
        blocks = []; particles = [];
        moveLock = false; playing = true;
    }

    // ── INPUT ────────────────────────────────────────────────
    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') && !moveLock) { moveLock = true; reset(); }
            if (!input.isPressed('Space')) moveLock = false;
            return;
        }

        const goL = input.isPressed('ArrowLeft') || input.isPressed('KeyA');
        const goR = input.isPressed('ArrowRight') || input.isPressed('KeyD');

        // Dash
        if (input.isPressed('Space') && P.dashCD <= 0 && P.dash === 0) {
            P.dash = DASH_DUR;
            P.dashCD = DASH_CD;
            const dir = goL ? -1 : goR ? 1 : (Math.random() < 0.5 ? -1 : 1);
            P.vx = dir * (DASH_POWER / DASH_DUR);
            audio.playSound('click');
        }

        if (P.dash > 0) {
            P.dash--;
        } else {
            // Normal movement
            if (goL) P.vx = -5;
            else if (goR) P.vx = 5;
            else P.vx *= 0.75;
        }
        if (P.dashCD > 0) P.dashCD--;
    }

    // ── SPAWN BLOCK ───────────────────────────────────────────
    function spawnBlock() {
        const [c1, c2] = palette();
        const bw = 35 + Math.random() * 55;
        const bx = Math.random() * (canvas.width - bw);
        const danger = score > 120 && Math.random() < 0.25; // wide "wall" block
        blocks.push({
            x: danger ? 0 : bx,
            w: danger ? canvas.width : bw,
            h: danger ? 14 : 22,
            y: -30,
            vy: speed + Math.random() * 1.5,
            col: c1, col2: c2,
            wobble: Math.random() > 0.5
        });
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        handleInput();
        if (!playing) return;

        tick++;
        // Difficulty ramp
        if (tick % 600 === 0) { speed += 0.4; spawnRate = Math.max(22, spawnRate - 4); }
        if (tick % spawnRate === 0) spawnBlock();

        // Move player
        P.x += P.vx;
        P.x = Math.max(0, Math.min(canvas.width - P.w, P.x));

        // Move & check blocks
        for (let i = blocks.length - 1; i >= 0; i--) {
            const b = blocks[i];
            if (b.wobble) b.x += Math.sin(tick * 0.05) * 0.7;
            b.y += b.vy;

            // Hit check (AABB)
            if (P.x < b.x + b.w && P.x + P.w > b.x && P.y < b.y + b.h && P.y + P.h > b.y) {
                // Hit!
                spawnParticles(P.x + P.w / 2, P.y, '#ffffff', 18);
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.col, 14);
                die(); return;
            }
            // Off-screen: score
            if (b.y > canvas.height + 10) {
                blocks.splice(i, 1);
                score++;
                if (score % 10 === 0) audio.playSound('score');
            }
        }

        // Particles
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; p.a = p.life / p.max; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}`;
    }

    function die() {
        playing = false;
        if (score > hiScore) { hiScore = score; localStorage.setItem('gz-dodge-hi', hiScore); }
        audio.playSound('thud');
    }

    function spawnParticles(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, col, life: 35, max: 35, a: 1 });
        }
    }

    // ── DRAW ─────────────────────────────────────────────────
    function draw() {
        // BG
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            ctx.fillStyle = `rgba(255,255,255,${s.a})`;
            ctx.beginPath(); ctx.arc(s.x % canvas.width, s.y % canvas.height, s.r, 0, Math.PI * 2); ctx.fill();
        });

        // Neon ground line
        ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth = 2;
        ctx.shadowBlur = 10; ctx.shadowColor = '#00ccff';
        ctx.beginPath(); ctx.moveTo(0, canvas.height - 22); ctx.lineTo(canvas.width, canvas.height - 22); ctx.stroke();
        ctx.shadowBlur = 0;

        // Blocks
        blocks.forEach(b => {
            const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
            g.addColorStop(0, b.col); g.addColorStop(1, b.col2);
            ctx.fillStyle = g; ctx.shadowBlur = 12; ctx.shadowColor = b.col;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.shadowBlur = 0;
            // highlight strip
            ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(b.x, b.y, b.w, 4);
        });

        // Player
        const isDashing = P.dash > 0;
        const px = P.x, py = P.y, pw = P.w, ph = P.h;
        if (isDashing) {
            // afterimage trail
            for (let i = 3; i >= 1; i--) {
                ctx.globalAlpha = 0.15 * i;
                ctx.fillStyle = '#00ccff';
                ctx.fillRect(px - P.vx * i * 0.5, py, pw, ph);
            }
            ctx.globalAlpha = 1;
        }
        // body
        const pg = ctx.createLinearGradient(px, py, px, py + ph);
        pg.addColorStop(0, isDashing ? '#80ffff' : '#00d4ff');
        pg.addColorStop(1, isDashing ? '#00aaff' : '#0077cc');
        ctx.fillStyle = pg; ctx.shadowBlur = 16; ctx.shadowColor = '#00ccff';
        ctx.fillRect(px, py, pw, ph);
        ctx.shadowBlur = 0;
        // cockpit
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(px + pw / 2 - 6, py + 2, 12, 6);

        // Dash CD indicator
        if (P.dashCD > 0) {
            const frac = 1 - P.dashCD / DASH_CD;
            ctx.fillStyle = 'rgba(0,200,255,0.2)'; ctx.fillRect(px, py + ph + 4, pw, 5);
            ctx.fillStyle = '#00ccff'; ctx.fillRect(px, py + ph + 4, pw * frac, 5);
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // HUD strip
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
        ctx.fillStyle = 'rgba(180,200,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('[← →] Move  ·  [SPACE] Dash', canvas.width / 2, canvas.height - 10);

        // Game over
        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d4d'; ctx.font = 'bold 30px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('CRUSHED!', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '17px Orbitron';
            ctx.fillText(`Dodged ${score} blocks`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`High Score: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[SPACE] to play again', canvas.width / 2, canvas.height / 2 + 60);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
