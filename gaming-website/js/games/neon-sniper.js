/* ============================================================
   GAME: Neon Sniper — Kid-Friendly Edition
   Rotate turret and shoot hexagonal enemies! 3 lives, slow early waves.
   Controls: ← → rotate, SPACE to shoot
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    // State
    let turretAngle, enemies, bullets, score, wave, lives;
    let cooldown = 0;
    let state = 'wave-announce'; // wave-announce | playing | dead | gameover
    let announceTimer = 0;
    let particles = [], starBursts = [];

    // Enemy config per wave
    function waveConfig(w) {
        return {
            count: Math.min(3 + w * 2, 16),
            speed: 0.28 + w * 0.09,  // starts slow
            hp: Math.ceil(w / 3),   // every 3 waves enemies need another hit
            radius: 26 - Math.min(w, 8), // shrinks a bit
            spawnDelay: Math.max(60, 130 - w * 8)
        };
    }

    let waveEnemyQueue, spawnTimer;

    function startWave() {
        const cfg = waveConfig(wave);
        waveEnemyQueue = cfg.count;
        spawnTimer = 0;
        bullets = []; enemies = [];
        state = 'wave-announce';
        announceTimer = 140;
    }

    function reset() {
        turretAngle = -Math.PI / 2; // pointing up
        score = 0; wave = 1; lives = 3;
        particles = []; starBursts = [];
        state = 'playing';
        startWave();
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    // ── INPUT ─────────────────────────────────────────────────
    let spaceWas = false, restartWas = false;
    const ROTATE_SPD = 0.045;
    const COOLDOWN_MAX = 18; // frames between shots (kid-friendly: generous)

    function handleInput() {
        if (window.gamePaused) return;
        if (state === 'gameover') {
            if (input.isPressed('Space') && !restartWas) { restartWas = true; reset(); }
            if (!input.isPressed('Space')) restartWas = false;
            return;
        }
        if (state !== 'playing') return;

        if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) turretAngle -= ROTATE_SPD;
        if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) turretAngle += ROTATE_SPD;

        const spaceNow = input.isPressed('Space');
        if (spaceNow && !spaceWas && cooldown <= 0) {
            shoot();
        }
        if (!spaceNow) spaceWas = false;
        else spaceWas = spaceNow;
        if (cooldown > 0) cooldown--;
    }

    function shoot() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const speed = 12;
        bullets.push({
            x: cx + Math.cos(turretAngle) * 38,
            y: cy + Math.sin(turretAngle) * 38,
            vx: Math.cos(turretAngle) * speed,
            vy: Math.sin(turretAngle) * speed,
            life: 80
        });
        cooldown = COOLDOWN_MAX;
        audio.playSound('click');
    }

    function spawnEnemy() {
        const cfg = waveConfig(wave);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(canvas.width, canvas.height) * 0.52;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        enemies.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            angle,
            speed: cfg.speed,
            hp: cfg.hp,
            maxHp: cfg.hp,
            r: cfg.radius,
            rot: 0, rotSpd: (Math.random() - 0.5) * 0.04,
            col: `hsl(${Math.floor(Math.random() * 360)},100%,60%)`
        });
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        handleInput();
        if (state === 'wave-announce') {
            announceTimer--;
            if (announceTimer <= 0) state = 'playing';
            return;
        }
        if (state !== 'playing') return;

        const cfg = waveConfig(wave);
        spawnTimer++;
        if (spawnTimer >= cfg.spawnDelay && waveEnemyQueue > 0) {
            spawnEnemy();
            waveEnemyQueue--;
            spawnTimer = 0;
        }

        const cx = canvas.width / 2, cy = canvas.height / 2;

        // Move enemies
        enemies.forEach(e => {
            const a = Math.atan2(cy - e.y, cx - e.x);
            e.x += Math.cos(a) * e.speed;
            e.y += Math.sin(a) * e.speed;
            e.rot += e.rotSpd;
        });

        // Move bullets
        bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        bullets = bullets.filter(b => b.life > 0);

        // Bullet vs enemy
        bullets = bullets.filter(b => {
            let hit = false;
            enemies = enemies.filter(e => {
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6) {
                    e.hp--;
                    hit = true;
                    if (e.hp <= 0) {
                        score += 10 + wave * 5;
                        spawnParticles(e.x, e.y, e.col, 18);
                        starBursts.push({ x: e.x, y: e.y, life: 40, max: 40, pts: 10 + wave * 5 });
                        audio.playSound('score');
                        return false;
                    } else {
                        // Hit flash
                        spawnParticles(e.x, e.y, '#fff', 6);
                    }
                }
                return true;
            });
            return !hit;
        });

        // Enemy reaches center → lose a life
        enemies = enemies.filter(e => {
            if (Math.hypot(e.x - cx, e.y - cy) < 40) {
                lives--;
                spawnParticles(cx, cy, '#ff4455', 20);
                audio.playSound('thud');
                if (lives <= 0) { state = 'gameover'; }
                return false;
            }
            return true;
        });

        // Wave complete
        if (waveEnemyQueue === 0 && enemies.length === 0 && state === 'playing') {
            wave++;
            score += 50;
            startWave();
        }

        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.a = p.life / p.max; });
        particles = particles.filter(p => p.life > 0);
        starBursts.forEach(s => s.life--);
        starBursts = starBursts.filter(s => s.life > 0);

        scoreEl.textContent = `Score: ${score}  Wave: ${wave}  ❤️ ${lives}`;
    }

    function spawnParticles(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 40, max: 40 });
        }
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        ctx.fillStyle = '#07070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;

        // Rotating arena rings
        for (let ring = 1; ring <= 4; ring++) {
            const r = ring * (Math.min(cx, cy) * 0.22);
            ctx.strokeStyle = `rgba(40,60,120,${0.4 - ring * 0.06})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }

        // Danger zone (innermost ring in red glow)
        ctx.strokeStyle = 'rgba(255,50,50,0.3)'; ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        // Enemies — hex shape
        enemies.forEach(e => {
            ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
            // HP color: green→yellow→red
            const hpFrac = e.hp / e.maxHp;
            const col = e.maxHp > 1 ? `hsl(${hpFrac * 120},100%,55%)` : e.col;
            ctx.fillStyle = col;
            ctx.shadowBlur = 14; ctx.shadowColor = col;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
                k === 0 ? ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r)
                    : ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
            }
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            // HP dots
            if (e.maxHp > 1) {
                for (let h = 0; h < e.maxHp; h++) {
                    ctx.fillStyle = h < e.hp ? '#fff' : 'rgba(255,255,255,0.2)';
                    ctx.beginPath(); ctx.arc((h - (e.maxHp - 1) / 2) * 8, -e.r - 8, 4, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        });

        // Bullets
        bullets.forEach(b => {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 14; ctx.shadowColor = '#ffe066';
            ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Score popups
        starBursts.forEach(s => {
            ctx.globalAlpha = s.life / s.max;
            ctx.fillStyle = '#ffe066'; ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(`+${s.pts}`, s.x, s.y - (1 - s.life / s.max) * 40);
        });
        ctx.globalAlpha = 1;

        // Turret base
        ctx.fillStyle = '#1a1a3a';
        ctx.shadowBlur = 12; ctx.shadowColor = '#4466ff';
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4466ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();

        // Turret barrel
        const bLen = 44, bW = 10;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(turretAngle);
        const bg = ctx.createLinearGradient(0, -bW / 2, bLen, -bW / 2);
        bg.addColorStop(0, '#00ffcc'); bg.addColorStop(1, '#004433');
        ctx.fillStyle = bg;
        ctx.shadowBlur = 16; ctx.shadowColor = '#00ffcc';
        ctx.beginPath(); ctx.roundRect(8, -bW / 2, bLen, bW, 4); ctx.fill();
        ctx.shadowBlur = 0;
        // Muzzle flash if shot recently
        if (cooldown > COOLDOWN_MAX - 4) {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 20; ctx.shadowColor = '#ffe066';
            ctx.beginPath(); ctx.arc(bLen + 8, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();

        // Lives display
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < lives ? '#ff4455' : 'rgba(255,255,255,0.1)';
            ctx.font = '20px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText('❤️', 12 + i * 30, 8);
        }

        // Cooldown arc
        if (cooldown > 0) {
            const frac = cooldown / COOLDOWN_MAX;
            ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3;
            ctx.shadowBlur = 8; ctx.shadowColor = '#ffe066';
            ctx.beginPath(); ctx.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac), false);
            ctx.stroke(); ctx.shadowBlur = 0;
        }

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.55)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('← → Rotate Turret  ·  SPACE = Shoot  ·  3 ❤️ lives — don\'t let enemies reach center!', canvas.width / 2, canvas.height - 10);

        // Wave announce
        if (state === 'wave-announce') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const wv = Math.max(0, (announceTimer - 80) / 60);
            const sc = 1 + wv * 0.3;
            ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
            ctx.fillStyle = '#ffe066'; ctx.font = 'bold 38px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`⚡ WAVE ${wave}`, 0, -20);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`${waveConfig(wave).count} enemies incoming!`, 0, 24);
            ctx.restore();
        }

        // Game Over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 34px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💀 GAME OVER', cx, cy - 46);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${score}  ·  Reached Wave ${wave}`, cx, cy);
            ctx.fillStyle = '#888'; ctx.font = '14px Orbitron';
            ctx.fillText('[SPACE] to play again', cx, cy + 38);
        }

        // Paused indicator
        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', cx, cy);
            ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
