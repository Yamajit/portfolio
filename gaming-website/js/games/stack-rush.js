/* ============================================================
   GAME: Stack Rush — Drop and stack falling blocks precisely!
   Narrowing block + tap to lock. Survive as many layers as possible.
   Controls: SPACE or click/tap = Drop current block
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    // Config
    const BLOCK_H = 28;  // fixed height per block
    const BASE_SPD = 2.8; // horizontal move speed of sliding block
    let MAX_LAYERS = 999;

    // Game state
    let stack = [];     // placed blocks [{x, w, y, col}]
    let mover = null;   // {x, w, dir, y, col}
    let score = 0;
    let hiScore = parseInt(localStorage.getItem('gz-stack-hi') || '0');
    let speed = BASE_SPD;
    let state = 'playing'; // playing | over
    let dropped = false;     // to prevent double-drop on one key press
    let dropLock = false;
    let shake = 0;          // camera shake frames
    let sparkles = [];
    let fallingSlice = null;  // the cut-off piece that falls into the void
    const COLORS = ['#ff4d6d', '#ff9f1c', '#ffe66d', '#2dc653', '#00b4d8', '#7209b7', '#f72585', '#4cc9f0'];

    function colorAt(i) { return COLORS[i % COLORS.length]; }

    function reset() {
        // Foundation block = full canvas width
        const fw = Math.min(canvas.width * 0.8, 340);
        const fx = (canvas.width - fw) / 2;
        const by = canvas.height - BLOCK_H;
        stack = [{ x: fx, w: fw, y: by, col: '#2a2a4a', isBase: true }];
        score = 0; speed = BASE_SPD; state = 'playing';
        dropped = false; dropLock = false; shake = 0; sparkles = []; fallingSlice = null;
        spawnMover();
    }

    function spawnMover() {
        const top = stack[stack.length - 1];
        const w = top.w;
        const y = top.y - BLOCK_H;
        if (y < 0) { win(); return; }  // stack reached the top!
        const col = colorAt(stack.length);
        mover = { x: 0, w, dir: 1, y, col };
    }

    function win() { state = 'gameover'; }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        attachEvents();
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function attachEvents() {
        canvas._stackClick = () => { if (state === 'playing') tryDrop(); };
        canvas.addEventListener('click', canvas._stackClick);
        canvas.addEventListener('touchstart', canvas._stackClick, { passive: true });
    }

    function tryDrop() {
        if (state !== 'playing' || !mover || dropLock) return;
        dropLock = true;
        drop();
    }

    // ── DROP LOGIC ────────────────────────────────────────────
    function drop() {
        const top = stack[stack.length - 1];

        // Overlap calculation
        const overlapLeft = Math.max(mover.x, top.x);
        const overlapRight = Math.min(mover.x + mover.w, top.x + top.w);
        const overlapW = overlapRight - overlapLeft;

        if (overlapW <= 0) {
            // Missed entirely
            fallingSlice = { x: mover.x, w: mover.w, y: mover.y, col: mover.col, vy: 0 };
            audio.playSound('thud');
            state = 'gameover';
            if (score > hiScore) { hiScore = score; localStorage.setItem('gz-stack-hi', hiScore); }
            return;
        }

        // Perfect hit bonus (within 4px)
        const isPerfect = Math.abs(overlapW - top.w) < 4;
        const newW = isPerfect ? top.w : overlapW;
        const newX = isPerfect ? top.x : overlapLeft;
        const pts = isPerfect ? 20 : 10;
        score += pts;
        audio.playSound(isPerfect ? 'score' : 'click');

        // The cut-off piece falls
        if (!isPerfect) {
            const leftoverW = mover.w - newW;
            const leftoverX = mover.x < newX ? mover.x : newX + newW;
            fallingSlice = { x: leftoverX, w: leftoverW, y: mover.y, col: mover.col, vy: 0 };
        }

        // Sparkle on perfect
        if (isPerfect) {
            for (let k = 0; k < 20; k++) {
                const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
                sparkles.push({
                    x: newX + newW / 2, y: mover.y + BLOCK_H / 2,
                    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col: mover.col, life: 40, max: 40
                });
            }
        }

        // Place block on stack
        stack.push({ x: newX, w: newW, y: mover.y, col: mover.col });

        // Ramp speed
        speed = Math.min(BASE_SPD + stack.length * 0.18, 9);
        shake = isPerfect ? 0 : 3;

        // Next block
        mover = null;
        setTimeout(() => { dropLock = false; spawnMover(); }, 120);
    }

    // ── INPUT ────────────────────────────────────────────────
    const spaceState = {};
    function handleInput() {
        if (state === 'gameover') {
            if (input.isPressed('Space') && !spaceState.held) { spaceState.held = true; reset(); }
            if (!input.isPressed('Space')) spaceState.held = false;
            return;
        }
        if (input.isPressed('Space') && !spaceState.held) {
            spaceState.held = true;
            tryDrop();
        }
        if (!input.isPressed('Space')) spaceState.held = false;
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        handleInput();
        if (state !== 'playing') {
            if (fallingSlice) { fallingSlice.vy += 0.5; fallingSlice.y += fallingSlice.vy; if (fallingSlice.y > canvas.height + 50) fallingSlice = null; }
            sparkles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; p.a = p.life / p.max; });
            sparkles = sparkles.filter(p => p.life > 0);
            return;
        }
        if (shake > 0) shake--;

        // Move slider
        if (mover) {
            mover.x += mover.dir * speed;
            if (mover.x + mover.w > canvas.width) { mover.x = canvas.width - mover.w; mover.dir = -1; }
            if (mover.x < 0) { mover.x = 0; mover.dir = 1; }
        }

        // Falling slice gravity
        if (fallingSlice) { fallingSlice.vy += 0.5; fallingSlice.y += fallingSlice.vy; if (fallingSlice.y > canvas.height + 50) fallingSlice = null; }

        // Sparkles
        sparkles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; p.a = p.life / p.max; });
        sparkles = sparkles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  Layers: ${stack.length - 1}`;
    }

    // Viewport offset — stack scrolls up as it grows
    function viewOffset() {
        const topY = stack[stack.length - 1]?.y ?? 0;
        const target = canvas.height * 0.55;
        return topY > target ? 0 : target - topY;
    }

    // ── DRAW ─────────────────────────────────────────────────
    function draw() {
        ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // BG gradient
        const bgg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgg.addColorStop(0, '#0c0820'); bgg.addColorStop(1, '#050510');
        ctx.fillStyle = bgg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const sx = shake > 0 ? (Math.random() - 0.5) * shake * 3 : 0;
        const sy = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
        const vo = viewOffset();

        ctx.save();
        ctx.translate(sx, sy + vo - Math.max(0, (stack.length - 12) * BLOCK_H));

        // Placed blocks
        stack.forEach((b, i) => {
            const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BLOCK_H);
            g.addColorStop(0, b.isBase ? '#1a1a3a' : b.col);
            g.addColorStop(1, b.isBase ? '#0a0a1e' : 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = b.isBase ? 0 : 10; ctx.shadowColor = b.col;
            ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, BLOCK_H, 4); ctx.fill();
            ctx.shadowBlur = 0;
            // highlight
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, 4, 2); ctx.fill();
        });

        // Moving block (slider)
        if (mover && state === 'playing') {
            ctx.fillStyle = mover.col; ctx.shadowBlur = 18; ctx.shadowColor = mover.col;
            ctx.globalAlpha = 0.92;
            ctx.beginPath(); ctx.roundRect(mover.x, mover.y, mover.w, BLOCK_H, 4); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // top glow strip
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.roundRect(mover.x, mover.y, mover.w, 4, 2); ctx.fill();
        }

        // Falling slice
        if (fallingSlice) {
            ctx.globalAlpha = 0.7; ctx.fillStyle = fallingSlice.col;
            ctx.beginPath(); ctx.roundRect(fallingSlice.x, fallingSlice.y, fallingSlice.w, BLOCK_H, 4); ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Sparkles
        sparkles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Height progress bar (right edge)
        const maxH = 25; // target layers
        const frac = Math.min(1, (stack.length - 1) / maxH);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(canvas.width - 12, 0, 12, canvas.height);
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(canvas.width - 12, canvas.height - (canvas.height * frac), 12, canvas.height * frac);
        ctx.fillStyle = 'rgba(0,255,136,0.3)';
        ctx.font = '9px Orbitron'; ctx.textAlign = 'center';
        ctx.save(); ctx.translate(canvas.width - 6, canvas.height - canvas.height * frac - 10); ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${stack.length - 1}`, 0, 0); ctx.restore();

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
        ctx.fillStyle = 'rgba(180,200,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('[SPACE] or [CLICK] to drop  ·  Perfect = bonus points!', canvas.width / 2, canvas.height - 10);

        // Game Over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const won = mover === null && stack[stack.length - 1]?.y <= 0;
            ctx.fillStyle = won ? '#ffe066' : '#ff4455';
            ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(won ? '🏆 TOWER COMPLETE!' : 'COLLAPSED!', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '16px Orbitron';
            ctx.fillText(`${stack.length - 1} layers · ${score} pts`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Best: ${hiScore} pts`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[SPACE] to rebuild', canvas.width / 2, canvas.height / 2 + 58);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._stackClick) {
            canvas.removeEventListener('click', canvas._stackClick);
            canvas.removeEventListener('touchstart', canvas._stackClick);
        }
    }
    return { init, destroy };
})();
