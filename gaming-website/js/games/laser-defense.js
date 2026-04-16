/* ============================================================
   GAME: Laser Defense — Shield your base from enemy lasers!
   Move with ←→ / WASD. Reflect lasers back to destroy enemies.
   Controls: ←→ keys / WASD / D-pad
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId, keys = {};

    let shield, enemies, lasers, particles, explosions;
    let score, hiScore, lives, frame, state, wave, waveDelay;
    let spawnTimer;

    const ENEMY_COLS = ['#ff4d6d', '#ffaa00', '#00d4ff', '#cc00ff', '#00ff88'];

    function reset() {
        shield = { x: canvas.width / 2, y: canvas.height - 50, w: 88, h: 14, speed: 6 };
        enemies = []; lasers = []; particles = []; explosions = [];
        score = 0; lives = 3; frame = 0; wave = 1; waveDelay = 0; spawnTimer = 0;
        state = 'playing';
        hiScore = parseInt(localStorage.getItem('gz-laserdefense-hi') || '0');
        spawnWave();
    }

    function spawnWave() {
        const cols = Math.min(5 + wave, 8);
        const rows = Math.min(1 + Math.floor(wave / 2), 3);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                enemies.push({
                    x: 60 + c * (canvas.width - 100) / (cols - 1 || 1),
                    y: 50 + r * 54,
                    w: 34, h: 26,
                    col: ENEMY_COLS[Math.floor(Math.random() * ENEMY_COLS.length)],
                    hp: 1,
                    fireTimer: Math.floor(Math.random() * 120),
                    fireRate: Math.max(60, 160 - wave * 10),
                    dir: (Math.random() > 0.5 ? 1 : -1) * (0.6 + wave * 0.1),
                    alive: true
                });
            }
        }
    }

    function fireLaser(en) {
        lasers.push({ x: en.x, y: en.y + en.h / 2, vy: 3.5 + wave * 0.4, w: 3, h: 18, col: en.col, isPlayer: false });
    }

    function burst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 35, max: 35 });
        }
    }

    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        keys = {};

        document.addEventListener('keydown', canvas._ldKD = e => { keys[e.code] = true; });
        document.addEventListener('keyup', canvas._ldKU = e => { keys[e.code] = false; });
        canvas.addEventListener('click', canvas._ldClick = () => { if (state === 'gameover') reset(); });

        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') return;
        frame++;

        // Shield movement
        const left = keys['ArrowLeft'] || keys['KeyA'] || input?.left;
        const right = keys['ArrowRight'] || keys['KeyD'] || input?.right;
        if (left) shield.x = Math.max(shield.w / 2 + 4, shield.x - shield.speed);
        if (right) shield.x = Math.min(canvas.width - shield.w / 2 - 4, shield.x + shield.speed);

        // Enemy movement
        const liveEnemies = enemies.filter(e => e.alive);
        let hitWall = false;
        liveEnemies.forEach(e => {
            e.x += e.dir;
            if (e.x < 28 || e.x > canvas.width - 28) { hitWall = true; }
            e.fireTimer++;
            if (e.fireTimer >= e.fireRate) { fireLaser(e); e.fireTimer = 0; }
        });
        if (hitWall) liveEnemies.forEach(e => { e.dir *= -1; e.y += 20; });

        // Laser movement
        lasers.forEach(l => { l.y += l.vy; });

        // Shield deflects enemy lasers → destroy them & +score
        lasers.forEach(l => {
            if (!l.isPlayer && !l.stopped) {
                if (l.y + l.h > shield.y && l.y < shield.y + shield.h &&
                    l.x > shield.x - shield.w / 2 - 4 && l.x < shield.x + shield.w / 2 + 4) {
                    l.stopped = true;
                    score += 5;
                    burst(l.x, l.y, l.col, 8);
                    audio.playSound('score');
                }
            }
        });

        // Enemy lasers hit base
        lasers.forEach(l => {
            if (!l.isPlayer && !l.stopped && l.y > canvas.height - 18) {
                l.stopped = true;
                lives--;
                burst(l.x, canvas.height - 18, '#ff4d6d', 12);
                audio.playSound('thud');
                if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-laserdefense-hi', hiScore); } }
            }
        });

        lasers = lasers.filter(l => !l.stopped && l.y < canvas.height + 20 && l.y > -20);

        // Check wave clear
        if (enemies.filter(e => e.alive).length === 0) {
            wave++;
            score += wave * 50;
            audio.playSound('score');
            spawnWave();
        }

        // Enemies reach base
        enemies.filter(e => e.alive).forEach(e => {
            if (e.y + e.h > canvas.height - 60) {
                state = 'gameover';
                if (score > hiScore) { hiScore = score; localStorage.setItem('gz-laserdefense-hi', hiScore); }
            }
        });

        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  Wave: ${wave}  ❤️ ${lives}`;
    }

    function draw() {
        ctx.fillStyle = '#020210'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 60; i++) {
            const sx = (i * 79 + frame * 0.1) % canvas.width;
            const sy = (i * 137) % (canvas.height - 60);
            const ss = (i % 3 === 0 ? 2 : 1);
            ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
        }

        // Base bar
        const baseGr = ctx.createLinearGradient(0, canvas.height - 20, 0, canvas.height);
        baseGr.addColorStop(0, 'rgba(0,60,120,0.6)');
        baseGr.addColorStop(1, 'rgba(0,20,60,0.9)');
        ctx.fillStyle = baseGr; ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.strokeStyle = 'rgba(0,180,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, canvas.height - 20); ctx.lineTo(canvas.width, canvas.height - 20); ctx.stroke();

        // Shield
        const sg = ctx.createLinearGradient(shield.x - shield.w / 2, 0, shield.x + shield.w / 2, 0);
        sg.addColorStop(0, 'rgba(0,212,255,0.2)');
        sg.addColorStop(0.5, 'rgba(0,212,255,0.9)');
        sg.addColorStop(1, 'rgba(0,212,255,0.2)');
        ctx.fillStyle = sg; ctx.shadowBlur = 18; ctx.shadowColor = '#00d4ff';
        ctx.beginPath(); ctx.roundRect(shield.x - shield.w / 2, shield.y, shield.w, shield.h, 6); ctx.fill();
        ctx.shadowBlur = 0;

        // Enemies
        enemies.filter(e => e.alive).forEach(e => {
            ctx.fillStyle = e.col + 'aa'; ctx.shadowBlur = 10; ctx.shadowColor = e.col;
            ctx.beginPath(); ctx.roundRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 6); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('👾', e.x, e.y);
        });

        // Lasers
        lasers.forEach(l => {
            ctx.fillStyle = l.col; ctx.shadowBlur = 8; ctx.shadowColor = l.col;
            ctx.fillRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h);
            ctx.shadowBlur = 0;
        });

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Lives
        ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (let i = 0; i < 3; i++) ctx.fillText(i < lives ? '❤️' : '🖤', 10 + i * 26, 8);

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('← → Move shield  ·  Block lasers before they hit your base!', canvas.width / 2, canvas.height - 10);

        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('BASE DESTROYED!', canvas.width / 2, canvas.height / 2 - 36);
            ctx.fillStyle = '#fff'; ctx.font = '17px Orbitron';
            ctx.fillText(`Score: ${score}  ·  Wave: ${wave}`, canvas.width / 2, canvas.height / 2 + 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[CLICK] to replay', canvas.width / 2, canvas.height / 2 + 58);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2); ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', canvas._ldKD);
        document.removeEventListener('keyup', canvas._ldKU);
        if (canvas._ldClick) canvas.removeEventListener('click', canvas._ldClick);
    }
    return { init, destroy };
})();
