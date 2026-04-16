/* ============================================================
   GAME: Neon Snake — Classic snake with neon visuals & power-ups
   Controls: ← → ↑ ↓  or  W A S D
   Eat food to grow. Power-ups: speed boost, ghost mode, length cut
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId, tickTimer = 0;

    // Config
    let CELL = 22;
    let COLS, ROWS;
    const BASE_TICK = 9;  // frames per move (lower = faster)
    let tickRate = BASE_TICK;

    // Snake state
    let snake, dir, nextDir, alive, score, hiScore;
    let food, powerUp, powerTimer, activePower;
    let particles = [], ghostMode = false, ghostTimer = 0;
    let bgFlash = 0;
    let dead = false, deadTimer = 0;
    let restartLock = false;
    const dirLock = {};

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function reset() {
        COLS = Math.floor(canvas.width / CELL);
        ROWS = Math.floor(canvas.height / CELL);
        // Center start, 4-cell snake going right
        const sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
        snake = [{ x: sx, y: sy }, { x: sx - 1, y: sy }, { x: sx - 2, y: sy }, { x: sx - 3, y: sy }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        alive = true; dead = false; deadTimer = 0; restartLock = false;
        score = 0; tickRate = BASE_TICK; tickTimer = 0;
        particles = []; ghostMode = false; ghostTimer = 0; bgFlash = 0;
        powerUp = null; powerTimer = 0; activePower = null;
        placeFood();
    }

    function placeFood() {
        const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        let pos;
        do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
        while (occupied.has(`${pos.x},${pos.y}`));
        const types = ['normal', 'normal', 'normal', 'bonus', 'bonus', 'triple'];
        const t = types[Math.floor(Math.random() * types.length)];
        food = { ...pos, type: t };
        // Occasionally also place a power-up
        if (!powerUp && Math.random() < 0.3) placePowerUp(occupied);
    }

    function placePowerUp(occupied) {
        let pos;
        do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
        while (occupied.has(`${pos.x},${pos.y}`) || (food && pos.x === food.x && pos.y === food.y));
        const types = ['speed', 'ghost', 'shrink'];
        powerUp = { ...pos, type: types[Math.floor(Math.random() * types.length)], life: 300 };
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        hiScore = parseInt(localStorage.getItem('gz-snake-hi') || '0');
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    // ── INPUT ────────────────────────────────────────────────
    function handleInput() {
        if (dead) {
            if (input.isPressed('Space') && !restartLock) { restartLock = true; reset(); }
            if (!input.isPressed('Space')) restartLock = false;
            return;
        }
        const up = input.isPressed('ArrowUp') || input.isPressed('KeyW');
        const down = input.isPressed('ArrowDown') || input.isPressed('KeyS');
        const left = input.isPressed('ArrowLeft') || input.isPressed('KeyA');
        const right = input.isPressed('ArrowRight') || input.isPressed('KeyD');

        if (up && !dirLock.up && dir.y !== 1) { nextDir = { x: 0, y: -1 }; resetDirLock(); dirLock.up = true; }
        if (down && !dirLock.down && dir.y !== -1) { nextDir = { x: 0, y: 1 }; resetDirLock(); dirLock.down = true; }
        if (left && !dirLock.left && dir.x !== 1) { nextDir = { x: -1, y: 0 }; resetDirLock(); dirLock.left = true; }
        if (right && !dirLock.right && dir.x !== -1) { nextDir = { x: 1, y: 0 }; resetDirLock(); dirLock.right = true; }
        if (!up) dirLock.up = false;
        if (!down) dirLock.down = false;
        if (!left) dirLock.left = false;
        if (!right) dirLock.right = false;
    }
    function resetDirLock() { dirLock.up = dirLock.down = dirLock.left = dirLock.right = false; }

    // ── TICK (game logic) ─────────────────────────────────────
    function tick() {
        if (!alive) return;
        dir = { ...nextDir };
        const head = { x: (snake[0].x + dir.x + COLS) % COLS, y: (snake[0].y + dir.y + ROWS) % ROWS };

        // Self collision (ghost bypasses)
        if (!ghostMode) {
            for (const seg of snake) {
                if (seg.x === head.x && seg.y === head.y) { die(); return; }
            }
        }

        snake.unshift(head);

        // Eat food
        let grew = false;
        if (food && head.x === food.x && head.y === food.y) {
            const pts = food.type === 'triple' ? 30 : food.type === 'bonus' ? 15 : 10;
            score += pts;
            spawnParticles(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2,
                food.type === 'triple' ? '#ffe066' : '#00ff88', 14);
            if (food.type !== 'triple') snake.push({ ...snake[snake.length - 1] });
            if (food.type === 'triple') for (let i = 0; i < 2; i++) snake.push({ ...snake[snake.length - 1] });
            audio.playSound('score');
            // Speed up gradually
            tickRate = Math.max(4, BASE_TICK - Math.floor(snake.length / 8));
            grew = true; placeFood();
        }

        // Eat powerup
        if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
            activePower = powerUp.type;
            if (activePower === 'speed') { tickRate = Math.max(3, tickRate - 3); powerTimer = 300; }
            if (activePower === 'ghost') { ghostMode = true; ghostTimer = 200; bgFlash = 6; }
            if (activePower === 'shrink') { snake.splice(Math.floor(snake.length / 2)); score += 20; }
            audio.playSound('click');
            spawnParticles(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, '#aa55ff', 16);
            powerUp = null;
        }

        if (!grew) snake.pop();

        // Power timers
        if (ghostMode) { ghostTimer--; if (ghostTimer <= 0) { ghostMode = false; activePower = null; } }
        if (powerUp) { powerUp.life--; if (powerUp.life <= 0) powerUp = null; }

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  Length: ${snake.length}`;
    }

    function die() {
        alive = false; dead = false; // 'dead' triggers overlay after brief delay
        spawnParticles(snake[0].x * CELL + CELL / 2, snake[0].y * CELL + CELL / 2, '#ff3344', 30);
        audio.playSound('thud');
        if (score > hiScore) { hiScore = score; localStorage.setItem('gz-snake-hi', hiScore); }
        // We show game over after 60 frames to let particles show
        setTimeout(() => { dead = true; }, 600);
    }

    function spawnParticles(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 35, max: 35 });
        }
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        handleInput();
        if (alive) {
            tickTimer++;
            if (tickTimer >= tickRate) { tickTimer = 0; tick(); }
        } else { if (dead) deadTimer++; }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--; p.a = p.life / p.max; });
        particles = particles.filter(p => p.life > 0);
        if (bgFlash > 0) bgFlash--;
    }

    // ── DRAW ─────────────────────────────────────────────────
    const foodColors = { normal: '#00ff88', bonus: '#ffaa00', triple: '#ffe066' };
    const powerColors = { speed: '#ff4444', ghost: '#aa55ff', shrink: '#00d4ff' };
    const powerEmoji = { speed: '⚡', ghost: '👻', shrink: '✂' };

    function draw() {
        const t = Date.now();
        // BG
        if (bgFlash > 0) { ctx.fillStyle = `rgba(120,0,200,${bgFlash * 0.05})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid (faint)
        ctx.strokeStyle = 'rgba(30,50,100,0.35)'; ctx.lineWidth = 0.5;
        for (let c = 0; c < COLS; c++) { for (let r = 0; r < ROWS; r++) { ctx.strokeRect(c * CELL, r * CELL, CELL, CELL); } }

        // Snake
        const ghost = ghostMode;
        snake.forEach((seg, i) => {
            const isHead = i === 0;
            const frac = 1 - i / snake.length;
            const cx = seg.x * CELL, cy = seg.y * CELL;
            const pad = isHead ? 1 : 2;
            ctx.globalAlpha = ghost ? 0.38 : 1;
            ctx.fillStyle = ghost ? '#aa55ff'
                : isHead ? '#00ffcc'
                    : `hsl(${150 - frac * 90},100%,${40 + frac * 25}%)`;
            ctx.shadowBlur = isHead ? 18 : 8;
            ctx.shadowColor = ghost ? '#aa55ff' : isHead ? '#00ffcc' : '#00ff88';
            ctx.beginPath();
            ctx.roundRect(cx + pad, cy + pad, CELL - pad * 2, CELL - pad * 2, isHead ? 6 : 4);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (isHead && !dead && alive) {
                // Eyes
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#fff';
                const ex1 = cx + CELL / 2 - (dir.y !== 0 ? 4 : dir.x > 0 ? 10 : 2);
                const ey1 = cy + CELL / 2 - (dir.x !== 0 ? 4 : dir.y > 0 ? 10 : 2);
                ctx.beginPath(); ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;

        // Food
        if (food) {
            const pulse = 0.7 + 0.3 * Math.sin(t * 0.006);
            ctx.fillStyle = foodColors[food.type] || '#00ff88';
            ctx.shadowBlur = 16 * pulse; ctx.shadowColor = foodColors[food.type] || '#00ff88';
            ctx.beginPath(); ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            if (food.type !== 'normal') {
                ctx.fillStyle = '#111'; ctx.font = `bold 9px Orbitron`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(food.type === 'triple' ? '×3' : '×1.5', food.x * CELL + CELL / 2, food.y * CELL + CELL / 2);
                ctx.textBaseline = 'alphabetic';
            }
        }

        // Power-up
        if (powerUp) {
            const blink = Math.sin(t * 0.01) > 0;
            if (powerUp.life > 60 || blink) {
                const col = powerColors[powerUp.type] || '#fff';
                ctx.fillStyle = col; ctx.shadowBlur = 20; ctx.shadowColor = col;
                ctx.beginPath();
                for (let k = 0; k < 4; k++) {
                    const a = k / 4 * Math.PI * 2 + t * 0.002, r2 = CELL / 2 - 3;
                    k === 0 ? ctx.moveTo(powerUp.x * CELL + CELL / 2 + Math.cos(a) * r2, powerUp.y * CELL + CELL / 2 + Math.sin(a) * r2)
                        : ctx.lineTo(powerUp.x * CELL + CELL / 2 + Math.cos(a) * r2, powerUp.y * CELL + CELL / 2 + Math.sin(a) * r2);
                }
                ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff'; ctx.font = `10px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(powerEmoji[powerUp.type] || '★', powerUp.x * CELL + CELL / 2, powerUp.y * CELL + CELL / 2);
                ctx.textBaseline = 'alphabetic';
            }
        }

        // Active power label
        if (activePower && alive) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(6, 6, 260, 26);
            ctx.fillStyle = powerColors[activePower]; ctx.font = '11px Orbitron'; ctx.textAlign = 'left';
            ctx.fillText(`${powerEmoji[activePower]} ${activePower.toUpperCase()} ACTIVE`, 12, 23);
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
        ctx.fillStyle = 'rgba(180,200,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('[↑↓←→ or WASD] Move  ·  ⚡Speed  👻Ghost  ✂Shrink = power-ups', canvas.width / 2, canvas.height - 10);

        // Game over
        if (dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 30px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '17px Orbitron';
            ctx.fillText(`Score: ${score}  ·  Length: ${snake.length}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`High Score: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[SPACE] to play again', canvas.width / 2, canvas.height / 2 + 58);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
