/* ============================================================
   GAME: Asteroid Storm — Top-down space shooter
   Move your ship and blast asteroids before they hit you!
   Controls: WASD / Arrows = Move, SPACE = Shoot
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let ship, bullets, asteroids, particles, explosions;
    let score, hiScore, lives, frame, wave, state, announceTimer;
    let shootCooldown = 0;

    const SHIP_R = 14;
    const BULLET_SPD = 13;
    const SHOOT_RATE = 14;
    const ASTEROID_COLORS = ['#ff6644', '#ffaa44', '#ff4488', '#cc44ff', '#4488ff'];

    function mkAsteroid(w) {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        if (edge === 0) { x = Math.random() * canvas.width; y = -60; }
        else if (edge === 1) { x = canvas.width + 60; y = Math.random() * canvas.height; }
        else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 60; }
        else { x = -60; y = Math.random() * canvas.height; }

        const cx = canvas.width / 2, cy = canvas.height / 2;
        const spd = 0.8 + w * 0.18 + Math.random() * 0.8;
        const ang = Math.atan2(cy - y, cx - x) + (Math.random() - 0.5) * 0.9;
        const size = 18 + Math.random() * 28;
        const pts = Math.floor(Math.random() * 7) + 5;
        const verts = Array.from({ length: pts }, (_, i) => {
            const a = (i / pts) * Math.PI * 2;
            const r = size * (0.7 + Math.random() * 0.5);
            return { x: Math.cos(a) * r, y: Math.sin(a) * r };
        });
        return {
            x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            size, rot: 0, rotSpd: (Math.random() - 0.5) * 0.04,
            col: ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)],
            hp: Math.ceil(size / 20), verts
        };
    }

    function reset() {
        ship = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, trail: [] };
        bullets = []; asteroids = []; particles = []; explosions = [];
        score = 0; lives = 3; wave = 1; frame = 0; shootCooldown = 0;
        state = 'wave-announce'; announceTimer = 100;
        ship.x = canvas.width / 2; ship.y = canvas.height / 2;
        hiScore = parseInt(localStorage.getItem('gz-asteroid-hi') || '0');
    }

    function startWave(w) {
        asteroids = [];
        const count = 3 + w * 2;
        for (let i = 0; i < count; i++) asteroids.push(mkAsteroid(w));
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        reset(); startWave(wave);
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    // ── INPUT ─────────────────────────────────────────────────
    const SPEED = 3.5, FRIC = 0.92;
    let restartWas = false;
    function handleInput() {
        if (window.gamePaused) return;
        if (state === 'gameover') {
            if (input.isPressed('Space') && !restartWas) { restartWas = true; reset(); startWave(1); }
            if (!input.isPressed('Space')) restartWas = false;
            return;
        }
        if (state !== 'playing') return;
        if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) ship.vx -= 0.4;
        if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) ship.vx += 0.4;
        if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) ship.vy -= 0.4;
        if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) ship.vy += 0.4;
        ship.vx = Math.max(-SPEED, Math.min(SPEED, ship.vx));
        ship.vy = Math.max(-SPEED, Math.min(SPEED, ship.vy));
        // Auto-aim shoot: fire toward nearest asteroid
        if (input.isPressed('Space') && shootCooldown <= 0) shoot();
        if (shootCooldown > 0) shootCooldown--;
    }

    function shoot() {
        // Aim at nearest asteroid
        let nearest = null, bestD = Infinity;
        asteroids.forEach(a => {
            const d = Math.hypot(a.x - ship.x, a.y - ship.y);
            if (d < bestD) { bestD = d; nearest = a; }
        });
        const ang = nearest ? Math.atan2(nearest.y - ship.y, nearest.x - ship.x) : ship.rot;
        bullets.push({ x: ship.x, y: ship.y, vx: Math.cos(ang) * BULLET_SPD, vy: Math.sin(ang) * BULLET_SPD, life: 70 });
        shootCooldown = SHOOT_RATE;
        audio.playSound('click');
    }

    function spawnParticles(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 35, max: 35 });
        }
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        handleInput();

        if (state === 'wave-announce') {
            announceTimer--;
            if (announceTimer <= 0) { state = 'playing'; startWave(wave); }
            return;
        }
        if (state !== 'playing') return;
        frame++;

        // Move ship
        ship.vx *= FRIC; ship.vy *= FRIC;
        ship.x += ship.vx; ship.y += ship.vy;
        // Wrap screen
        if (ship.x < 0) ship.x = canvas.width; if (ship.x > canvas.width) ship.x = 0;
        if (ship.y < 0) ship.y = canvas.height; if (ship.y > canvas.height) ship.y = 0;
        // Rotation toward velocity
        if (Math.abs(ship.vx) > 0.5 || Math.abs(ship.vy) > 0.5) ship.rot = Math.atan2(ship.vy, ship.vx) + Math.PI / 2;
        // Trail
        ship.trail.unshift({ x: ship.x, y: ship.y });
        if (ship.trail.length > 12) ship.trail.pop();

        // Move bullets
        bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        bullets = bullets.filter(b => b.life > 0 && b.x > -40 && b.x < canvas.width + 40 && b.y > -40 && b.y < canvas.height + 40);

        // Move asteroids
        asteroids.forEach(a => {
            a.x += a.vx; a.y += a.vy; a.rot += a.rotSpd;
            // Wrap
            if (a.x < -100) a.x = canvas.width + 90; if (a.x > canvas.width + 100) a.x = -90;
            if (a.y < -100) a.y = canvas.height + 90; if (a.y > canvas.height + 100) a.y = -90;
        });

        // Bullet vs asteroid
        bullets = bullets.filter(b => {
            let hit = false;
            asteroids = asteroids.filter(a => {
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.size + 4) {
                    hit = true; a.hp--;
                    spawnParticles(a.x, a.y, a.col, 8);
                    if (a.hp <= 0) {
                        score += Math.ceil(a.size);
                        spawnParticles(a.x, a.y, '#fff', 18);
                        explosions.push({ x: a.x, y: a.y, r: a.size, life: 20, max: 20 });
                        audio.playSound('score');
                        return false;
                    }
                    return true;
                }
                return true;
            });
            return !hit;
        });

        // Ship vs asteroid
        asteroids.forEach(a => {
            if (Math.hypot(ship.x - a.x, ship.y - a.y) < SHIP_R + a.size * 0.6) {
                lives--;
                spawnParticles(ship.x, ship.y, '#ff4455', 24);
                audio.playSound('thud');
                // Push asteroid away
                const ang = Math.atan2(a.y - ship.y, a.x - ship.x);
                a.x += Math.cos(ang) * 60; a.y += Math.sin(ang) * 60;
                // Respawn ship at center
                ship.x = canvas.width / 2; ship.y = canvas.height / 2; ship.vx = 0; ship.vy = 0;
                if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-asteroid-hi', hiScore); } }
            }
        });

        // Wave clear
        if (asteroids.length === 0 && state === 'playing') {
            wave++; score += 100;
            state = 'wave-announce'; announceTimer = 110;
        }

        explosions.forEach(e => { e.r *= 1.18; e.life--; });
        explosions = explosions.filter(e => e.life > 0);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.a = p.life / p.max; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${Math.floor(score)}  Wave: ${wave}  ❤️ ${lives}`;
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        ctx.fillStyle = '#03030c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Tiny star field
        for (let i = 0; i < 80; i++) {
            const sx = (i * 137.5 + frame * 0.1) % canvas.width, sy = (i * 97.3) % canvas.height;
            ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(i + frame * 0.02) * 0.1})`;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Explosions
        explosions.forEach(e => {
            ctx.globalAlpha = e.life / e.max * 0.6;
            ctx.fillStyle = '#ff8800';
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Asteroids
        asteroids.forEach(a => {
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = a.col; ctx.shadowBlur = 10; ctx.shadowColor = a.col;
            ctx.beginPath();
            a.verts.forEach((v, vi) => vi === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
            ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
            // HP bar
            if (a.hp > 1) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-a.size, -a.size - 12, a.size * 2, 6);
                ctx.fillStyle = '#00ff88'; ctx.fillRect(-a.size, -a.size - 12, a.size * 2 * (a.hp / Math.ceil(a.size / 20)), 6);
            }
            ctx.restore();
        });

        // Ship trail
        ship.trail.forEach((t, i) => {
            ctx.globalAlpha = (1 - i / ship.trail.length) * 0.4;
            ctx.fillStyle = '#00ffcc';
            ctx.beginPath(); ctx.arc(t.x, t.y, SHIP_R * (1 - i / ship.trail.length), 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ship
        if (state === 'playing' || state === 'wave-announce') {
            ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.rot);
            ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 18; ctx.shadowColor = '#00ffcc';
            ctx.beginPath();
            ctx.moveTo(0, -SHIP_R - 4); ctx.lineTo(-SHIP_R, SHIP_R); ctx.lineTo(0, SHIP_R - 6); ctx.lineTo(SHIP_R, SHIP_R);
            ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
            // Thruster flame
            if (Math.abs(ship.vx) > 0.5 || Math.abs(ship.vy) > 0.5) {
                ctx.fillStyle = '#ff8800'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff8800';
                ctx.beginPath(); ctx.moveTo(-5, SHIP_R - 4); ctx.lineTo(0, SHIP_R + 8 + Math.random() * 6); ctx.lineTo(5, SHIP_R - 4); ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }

        // Bullets
        bullets.forEach(b => {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffe066';
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        });

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Lives
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < lives ? '#ff4455' : 'rgba(255,255,255,0.1)';
            ctx.font = '18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText('❤️', 12 + i * 28, 8);
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('WASD / ↑↓←→ Move  ·  SPACE = Shoot (auto-aims at nearest asteroid!)', canvas.width / 2, canvas.height - 10);

        // Wave announce
        if (state === 'wave-announce') {
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffe066'; ctx.font = 'bold 36px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`🚀 WAVE ${wave}`, canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#aaf'; ctx.font = '18px Orbitron';
            ctx.fillText(`${Math.min(3 + wave * 2, 20)} asteroids incoming!`, canvas.width / 2, canvas.height / 2 + 24);
            ctx.textBaseline = 'alphabetic';
        }

        // Game over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 32px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💀 SHIP DESTROYED', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${Math.floor(score)}  Wave: ${wave}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[SPACE] to fly again', canvas.width / 2, canvas.height / 2 + 62);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
