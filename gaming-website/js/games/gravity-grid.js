/* ============================================================
   GAME: Gravity Grid — Kid-Friendly Edition
   Flip gravity to guide your ball! Easy levels with stars to collect.
   Controls: ← → to move, SPACE to flip gravity
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    // ── LEVELS — each cell is 40px, 'S'=start, 'E'=exit, '='=spike from below,
    //            '^'=spike from above, '#'=block, '*'=star bonus
    const CELL = 40;
    const LEVELS = [
        // Level 1 — wide open, just get to exit
        ['####################',
            '#                  #',
            '#   *       *      #',
            '#                  #',
            '#                  #',
            '#                  #',
            '#    *         *   #',
            '#                  #',
            '#S              E  #',
            '####################'],
        // Level 2 — a couple of floor spikes
        ['####################',
            '#                  #',
            '#   *     *    *   #',
            '#                  #',
            '#                  #',
            '#    ===           #',
            '#                  #',
            '#         ===      #',
            '#S              E  #',
            '####################'],
        // Level 3 — ceiling spikes too
        ['####################',
            '#  ^^^      ^^^    #',
            '#                  #',
            '#   *   *      *   #',
            '#                  #',
            '#    ===    ===    #',
            '#                  #',
            '#   *              #',
            '#S              E  #',
            '####################'],
        // Level 4 — narrow gap passage
        ['####################',
            '#  ^^^  ^^^  ^^^   #',
            '#       *          #',
            '#  *               #',
            '#######     #######',
            '#       *          #',
            '#                  #',
            '#    ===  ===  === #',
            '#S              E  #',
            '####################'],
        // Level 5 — zigzag with platforms
        ['####################',
            '#  ^^^  ^^^  ^^^   #',
            '#                  #',
            '#######  ##########',
            '#         *        #',
            '##########  #######',
            '#       *          #',
            '#    ===           #',
            '#S              E  #',
            '####################'],
    ];

    // State
    let level, ball, gravDir, score, stars, died, diedTimer;
    let levelClear, clearTimer, levelNum;
    let particles = [], flashFrames = 0;
    let vx_hint_timer = 0;

    const BALL_R = 12;
    const SPEED = 3.2;   // horizontal speed (kid-friendly pace)
    const GRAVITY = 0.45;
    const MAX_VY = 9;

    function tileAt(lv, col, row) {
        if (row < 0 || row >= lv.length) return '#';
        const r = lv[row];
        if (col < 0 || col >= r.length) return '#';
        return r[col];
    }

    function loadLevel(n) {
        level = LEVELS[n];
        gravDir = 1; // down
        died = false; diedTimer = 0;
        levelClear = false; clearTimer = 0;
        particles = []; flashFrames = 0;
        vx_hint_timer = 0;

        // Find start position
        let sx = 2, sy = 8;
        for (let r = 0; r < level.length; r++) {
            for (let c = 0; c < level[r].length; c++) {
                if (level[r][c] === 'S') { sx = c; sy = r; }
            }
        }
        ball = { x: sx * CELL + CELL / 2, y: sy * CELL + CELL / 2, vx: SPEED, vy: 0 };

        // Count stars
        stars = {};
        for (let r = 0; r < level.length; r++) {
            for (let c = 0; c < level[r].length; c++) {
                if (level[r][c] === '*') stars[`${c},${r}`] = true;
            }
        }
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        levelNum = 0;
        score = 0;
        loadLevel(levelNum);
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    // ── INPUT ─────────────────────────────────────────────────
    let spaceWas = false;
    function handleInput() {
        if (window.gamePaused) return;
        if (died) {
            if (input.isPressed('Space') && !spaceWas) { spaceWas = true; loadLevel(levelNum); }
            else if (!input.isPressed('Space')) spaceWas = false;
            return;
        }
        if (levelClear) {
            if (input.isPressed('Space') && !spaceWas) {
                spaceWas = true;
                levelNum = (levelNum + 1) % LEVELS.length;
                loadLevel(levelNum);
            } else if (!input.isPressed('Space')) spaceWas = false;
            return;
        }

        // Horizontal
        const left = input.isPressed('ArrowLeft') || input.isPressed('KeyA');
        const right = input.isPressed('ArrowRight') || input.isPressed('KeyD');
        if (left) ball.vx = Math.max(ball.vx - 0.5, -SPEED);
        else if (right) ball.vx = Math.min(ball.vx + 0.5, SPEED);
        else ball.vx = ball.vx * 0.92; // friction

        // Gravity flip
        const spaceNow = input.isPressed('Space');
        if (spaceNow && !spaceWas) {
            gravDir *= -1;
            spawnParticles(ball.x, ball.y, gravDir > 0 ? '#00ffcc' : '#cc00ff', 12);
            audio.playSound('click');
        }
        spaceWas = spaceNow;
    }

    // ── PHYSICS UPDATE ─────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        handleInput();
        if (died || levelClear) {
            if (died) { diedTimer++; if (diedTimer > 120) diedTimer = 0; }
            if (levelClear) { clearTimer++; }
        } else {
            physicsTick();
        }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.grav || 0; p.life--; p.a = p.life / p.max; });
        particles = particles.filter(p => p.life > 0);
        if (flashFrames > 0) flashFrames--;
    }

    function physicsTick() {
        ball.vy += GRAVITY * gravDir;
        ball.vy = Math.max(-MAX_VY, Math.min(MAX_VY, ball.vy));

        // Move X then Y separately
        ball.x += ball.vx;
        resolveX();
        ball.y += ball.vy;
        resolveY();

        // Collect stars
        const bc = Math.floor(ball.x / CELL), br = Math.floor(ball.y / CELL);
        for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
                const key = `${bc + dc},${br + dr}`;
                if (stars[key]) {
                    delete stars[key];
                    score += 50;
                    spawnParticles(ball.x, ball.y, '#ffe066', 16);
                    audio.playSound('score');
                }
            }
        }

        // Check exit
        const exitC = findTile('E');
        if (exitC && Math.hypot(ball.x - (exitC.c * CELL + CELL / 2), ball.y - (exitC.r * CELL + CELL / 2)) < CELL * 0.7) {
            score += 200;
            levelClear = true;
            clearTimer = 0;
            flashFrames = 8;
            spawnParticles(ball.x, ball.y, '#00ff88', 30);
            audio.playSound('score');
        }

        scoreEl.textContent = `Score: ${score}  Level: ${levelNum + 1} / ${LEVELS.length}`;
    }

    function findTile(ch) {
        for (let r = 0; r < level.length; r++)
            for (let c = 0; c < level[r].length; c++)
                if (level[r][c] === ch) return { c, r };
        return null;
    }

    function resolveX() {
        const r1 = Math.floor((ball.y - BALL_R + 4) / CELL);
        const r2 = Math.floor((ball.y + BALL_R - 4) / CELL);
        if (ball.vx > 0) {
            const c = Math.floor((ball.x + BALL_R) / CELL);
            for (let r = r1; r <= r2; r++) {
                if (tileAt(level, c, r) === '#') { ball.x = c * CELL - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.5; return; }
            }
        } else {
            const c = Math.floor((ball.x - BALL_R) / CELL);
            for (let r = r1; r <= r2; r++) {
                if (tileAt(level, c, r) === '#') { ball.x = (c + 1) * CELL + BALL_R; ball.vx = Math.abs(ball.vx) * 0.5; return; }
            }
        }
    }

    function resolveY() {
        const c1 = Math.floor((ball.x - BALL_R + 4) / CELL);
        const c2 = Math.floor((ball.x + BALL_R - 4) / CELL);
        if (ball.vy > 0) { // moving down
            const r = Math.floor((ball.y + BALL_R) / CELL);
            for (let c = c1; c <= c2; c++) {
                const t = tileAt(level, c, r);
                if (t === '#') { ball.y = r * CELL - BALL_R; ball.vy = 0; return; }
                if (t === '=') { killBall(); return; } // floor spike
            }
        } else { // moving up
            const r = Math.floor((ball.y - BALL_R) / CELL);
            for (let c = c1; c <= c2; c++) {
                const t = tileAt(level, c, r);
                if (t === '#') { ball.y = (r + 1) * CELL + BALL_R; ball.vy = 0; return; }
                if (t === '^') { killBall(); return; } // ceiling spike
            }
        }
    }

    function killBall() {
        died = true; diedTimer = 0;
        spawnParticles(ball.x, ball.y, '#ff4455', 20);
        audio.playSound('thud');
        flashFrames = 10;
    }

    function spawnParticles(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 0.08, col, life: 40, max: 40, a: 1 });
        }
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        ctx.fillStyle = flashFrames > 0 ? (died ? '#330000' : '#003322') : '#07070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center the level view
        const lvW = (level[0]?.length || 20) * CELL;
        const lvH = level.length * CELL;
        const ox = Math.max(0, (canvas.width - lvW) / 2);
        const oy = Math.max(0, (canvas.height - lvH) / 2);

        ctx.save();
        ctx.translate(ox, oy);

        // Tiles
        for (let r = 0; r < level.length; r++) {
            for (let c = 0; c < level[r].length; c++) {
                const ch = level[r][c];
                const px = c * CELL, py = r * CELL;

                if (ch === '#') {
                    const g = ctx.createLinearGradient(px, py, px, py + CELL);
                    g.addColorStop(0, '#2a2a4a'); g.addColorStop(1, '#111128');
                    ctx.fillStyle = g;
                    ctx.fillRect(px, py, CELL, CELL);
                    ctx.strokeStyle = 'rgba(80,80,160,0.5)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, CELL, CELL);
                }
                if (ch === '=') {  // floor spike
                    ctx.fillStyle = '#ff3344';
                    ctx.shadowBlur = 8; ctx.shadowColor = '#ff3344';
                    for (let i = 0; i < 3; i++) {
                        const bx = px + 6 + i * 10;
                        ctx.beginPath();
                        ctx.moveTo(bx, py + CELL);
                        ctx.lineTo(bx + 5, py + CELL - 20);
                        ctx.lineTo(bx + 10, py + CELL);
                        ctx.fill();
                    }
                    ctx.shadowBlur = 0;
                }
                if (ch === '^') {  // ceiling spike
                    ctx.fillStyle = '#ff3344';
                    ctx.shadowBlur = 8; ctx.shadowColor = '#ff3344';
                    for (let i = 0; i < 3; i++) {
                        const bx = px + 6 + i * 10;
                        ctx.beginPath();
                        ctx.moveTo(bx, py);
                        ctx.lineTo(bx + 5, py + 20);
                        ctx.lineTo(bx + 10, py);
                        ctx.fill();
                    }
                    ctx.shadowBlur = 0;
                }
                if (ch === 'E') {  // exit portal
                    const pulse = 0.7 + 0.3 * Math.sin(t * 0.005);
                    ctx.fillStyle = `rgba(0,255,136,${0.25 * pulse})`;
                    ctx.fillRect(px, py, CELL, CELL);
                    ctx.strokeStyle = `rgba(0,255,136,${0.9 * pulse})`;
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 20 * pulse; ctx.shadowColor = '#00ff88';
                    ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('EXIT', px + CELL / 2, py + CELL / 2);
                }
            }
        }

        // Stars
        Object.keys(stars).forEach(key => {
            const [c, r] = key.split(',').map(Number);
            const px = c * CELL + CELL / 2, py = r * CELL + CELL / 2;
            const wig = Math.sin(t * 0.007 + c + r) * 3;
            ctx.fillStyle = '#ffe066';
            ctx.shadowBlur = 12; ctx.shadowColor = '#ffe066';
            ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⭐', px, py + wig);
            ctx.shadowBlur = 0;
        });

        // Ball
        if (!died) {
            const bobY = ball.y + (gravDir < 0 ? -2 : 2) * Math.sin(t * 0.01);
            ctx.shadowBlur = 20; ctx.shadowColor = gravDir > 0 ? '#00ffcc' : '#cc00ff';
            ctx.fillStyle = gravDir > 0 ? '#00ffcc' : '#cc00ff';
            ctx.beginPath(); ctx.arc(ball.x, bobY, BALL_R, 0, Math.PI * 2); ctx.fill();
            // direction arrow
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(gravDir > 0 ? '▼' : '▲', ball.x, bobY);
            ctx.shadowBlur = 0;
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('← → Move  ·  SPACE = Flip Gravity  ·  Touch ⭐ stars & reach EXIT', canvas.width / 2, canvas.height - 10);

        // Gravity direction indicator
        ctx.fillStyle = gravDir > 0 ? '#00ffcc' : '#cc00ff';
        ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle;
        ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(gravDir > 0 ? '▼ GRAVITY DOWN' : '▲ GRAVITY UP', 12, 24);
        ctx.shadowBlur = 0;

        // DIED overlay
        if (died) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 36px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('💥 OOPS!', canvas.width / 2, canvas.height / 2 - 30);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText('Hit a spike! Try again!', canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillStyle = '#888'; ctx.font = '14px Orbitron';
            ctx.fillText('[SPACE] to retry  ·  Level ' + (levelNum + 1), canvas.width / 2, canvas.height / 2 + 44);
        }

        // LEVEL CLEAR overlay
        if (levelClear) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const bounce = Math.sin(clearTimer * 0.12) * 8;
            ctx.fillStyle = '#ffe066'; ctx.font = 'bold 36px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('🌟 LEVEL CLEAR! 🌟', canvas.width / 2, canvas.height / 2 - 30 + bounce);
            ctx.fillStyle = '#00ff88'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 14);
            ctx.fillStyle = '#aaa'; ctx.font = '14px Orbitron';
            const isLast = levelNum >= LEVELS.length - 1;
            ctx.fillText(isLast ? '[SPACE] → Level 1 (loop!)' : '[SPACE] → Next Level', canvas.width / 2, canvas.height / 2 + 48);
        }

        // Paused indicator
        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
