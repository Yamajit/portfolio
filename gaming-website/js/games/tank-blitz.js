/* ============================================================
   GAME: Tank Blitz — Top-Down Tank Shooter
   Drive your neon tank, blast approaching enemies!
   Controls: WASD = Move/Rotate | Space = Shoot
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let tank, bullets, enemies, explosions, particles;
    let score, hiScore, wave, lives;
    let frame, dead;
    let shootCooldown = 0;

    const TANK_W = 30, TANK_H = 38;
    const BULLET_SPD = 9;
    const ENEMY_COLORS = ['#ff4d6d', '#ffaa00', '#cc00ff', '#ff6644'];

    function reset() {
        tank = { x: canvas.width / 2, y: canvas.height - 80, angle: -Math.PI / 2, speed: 3 };
        bullets = [];
        enemies = [];
        explosions = [];
        particles = [];
        score = 0; wave = 1; lives = 3;
        frame = 0; dead = false;
        shootCooldown = 0;
        spawnWave();
    }

    function spawnWave() {
        const count = 3 + wave * 2;
        for (let i = 0; i < count; i++) {
            let ex, ey;
            do {
                ex = 40 + Math.random() * (canvas.width - 80);
                ey = 40 + Math.random() * (canvas.height * 0.45);
            } while (Math.hypot(ex - tank.x, ey - tank.y) < 120);
            enemies.push({
                x: ex, y: ey,
                angle: Math.random() * Math.PI * 2,
                hp: 1 + Math.floor(wave / 3),
                maxHp: 1 + Math.floor(wave / 3),
                speed: 0.6 + wave * 0.12,
                shootCd: Math.floor(Math.random() * 120),
                col: ENEMY_COLORS[i % ENEMY_COLORS.length],
                bullets: []
            });
        }
    }

    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        hiScore = parseInt(localStorage.getItem('gz-tank-hi') || '0');
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    let spaceWas = false;
    function handleInput() {
        if (window.gamePaused) return;
        if (dead) {
            const spaceNow = input.isPressed('Space');
            if (spaceNow && !spaceWas) { spaceWas = true; reset(); }
            if (!spaceNow) spaceWas = false;
            return;
        }

        // Rotate
        if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) tank.angle -= 0.045;
        if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) tank.angle += 0.045;

        // Move forward/backward
        if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) {
            tank.x += Math.cos(tank.angle) * tank.speed;
            tank.y += Math.sin(tank.angle) * tank.speed;
        }
        if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) {
            tank.x -= Math.cos(tank.angle) * tank.speed * 0.6;
            tank.y -= Math.sin(tank.angle) * tank.speed * 0.6;
        }

        // Clamp
        tank.x = Math.max(TANK_W, Math.min(canvas.width - TANK_W, tank.x));
        tank.y = Math.max(TANK_H, Math.min(canvas.height - TANK_H, tank.y));

        // Shoot
        shootCooldown = Math.max(0, shootCooldown - 1);
        const spaceNow = input.isPressed('Space');
        if (spaceNow && !spaceWas && shootCooldown === 0) {
            spaceWas = true;
            shoot();
        }
        if (!spaceNow) spaceWas = false;
    }

    function shoot() {
        shootCooldown = 14;
        const barrelX = tank.x + Math.cos(tank.angle) * (TANK_H * 0.65);
        const barrelY = tank.y + Math.sin(tank.angle) * (TANK_H * 0.65);
        bullets.push({
            x: barrelX, y: barrelY,
            vx: Math.cos(tank.angle) * BULLET_SPD,
            vy: Math.sin(tank.angle) * BULLET_SPD,
            life: 55
        });
        audio.playSound('click');
    }

    function addExplosion(x, y, col) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const sp = 1.5 + Math.random() * 4;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 35, max: 35 });
        }
    }

    function update() {
        if (window.gamePaused) return;
        handleInput();
        if (dead) return;
        frame++;

        // Move player bullets
        bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        bullets = bullets.filter(b => b.life > 0 && b.x > -10 && b.x < canvas.width + 10 && b.y > -10 && b.y < canvas.height + 10);

        // Update enemies
        enemies.forEach(e => {
            // Rotate toward tank
            const aTank = Math.atan2(tank.y - e.y, tank.x - e.x);
            let da = aTank - e.angle;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            e.angle += Math.sign(da) * Math.min(Math.abs(da), 0.03);

            // Move toward tank (slowly)
            e.x += Math.cos(e.angle) * e.speed * 0.55;
            e.y += Math.sin(e.angle) * e.speed * 0.55;

            // Enemy shoots
            e.shootCd--;
            if (e.shootCd <= 0) {
                e.shootCd = 90 - wave * 4 > 30 ? 90 - wave * 4 : 30;
                e.bullets.push({
                    x: e.x + Math.cos(e.angle) * 22,
                    y: e.y + Math.sin(e.angle) * 22,
                    vx: Math.cos(e.angle) * 4.5,
                    vy: Math.sin(e.angle) * 4.5,
                    life: 60
                });
            }

            // Update enemy bullets
            e.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
            e.bullets = e.bullets.filter(b => b.life > 0);

            // Enemy bullet hits tank
            e.bullets = e.bullets.filter(b => {
                const dx = b.x - tank.x, dy = b.y - tank.y;
                if (Math.hypot(dx, dy) < 20) {
                    lives--;
                    addExplosion(tank.x, tank.y, '#ff4455');
                    audio.playSound('thud');
                    if (lives <= 0) {
                        dead = true;
                        if (score > hiScore) { hiScore = score; localStorage.setItem('gz-tank-hi', hiScore); }
                        addExplosion(tank.x, tank.y, '#ff2200');
                        addExplosion(tank.x - 10, tank.y + 10, '#ffaa00');
                    }
                    return false;
                }
                return true;
            });
        });

        // Player bullet hits enemy
        bullets = bullets.filter(b => {
            let hit = false;
            enemies = enemies.filter(e => {
                if (hit) return true;
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.maxHp * 18 + 14) {
                    e.hp--;
                    addExplosion(e.x, e.y, e.col);
                    audio.playSound('score');
                    if (e.hp <= 0) {
                        score += 10 * wave;
                        addExplosion(e.x, e.y, '#ffe066');
                        hit = true;
                        return false;
                    }
                    hit = true;
                }
                return true;
            });
            return !hit;
        });

        // Wave clear
        if (enemies.length === 0 && !dead) {
            wave++;
            score += 50;
            audio.playSound('score');
            spawnWave();
        }

        // Particles
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Wave: ${wave}  Lives: ${'❤️'.repeat(Math.max(0, lives))}  Best: ${hiScore}`;
    }

    function drawTank(x, y, angle, col, barrelCol) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);

        // Body shadow
        ctx.shadowBlur = 14; ctx.shadowColor = col;

        // Tracks
        ctx.fillStyle = '#333';
        ctx.fillRect(-TANK_W / 2 - 4, -TANK_H / 2, 8, TANK_H);
        ctx.fillRect(TANK_W / 2 - 4, -TANK_H / 2, 8, TANK_H);

        // Hull
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.roundRect(-TANK_W / 2 + 2, -TANK_H / 2, TANK_W - 4, TANK_H, 4); ctx.fill();

        // Turret
        ctx.fillStyle = barrelCol || '#00ddee';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Barrel
        ctx.fillStyle = barrelCol || '#00ddee';
        ctx.fillRect(-3, -TANK_H / 2 - 10, 6, TANK_H / 2 + 4);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function draw() {
        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bg.addColorStop(0, '#0d1a0d'); bg.addColorStop(1, '#001a00');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(0,255,80,0.06)'; ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Enemies
        enemies.forEach(e => {
            drawTank(e.x, e.y, e.angle, e.col, '#aa0000');
            // HP bar
            if (e.maxHp > 1) {
                const bw = 36, bh = 5;
                ctx.fillStyle = '#300'; ctx.fillRect(e.x - bw / 2, e.y - 32, bw, bh);
                ctx.fillStyle = '#f00'; ctx.fillRect(e.x - bw / 2, e.y - 32, bw * (e.hp / e.maxHp), bh);
            }
            // Enemy bullets
            e.bullets.forEach(b => {
                ctx.fillStyle = e.col; ctx.shadowBlur = 8; ctx.shadowColor = e.col;
                ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
        });

        // Player bullets
        bullets.forEach(b => {
            ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffcc';
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Player tank
        if (!dead || Math.floor(frame / 6) % 2 === 0) {
            drawTank(tank.x, tank.y, tank.angle, '#00ffcc', '#aaffee');
        }

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(100,255,150,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('WASD = Move/Rotate  ·  SPACE = Shoot  ·  Destroy all tanks to advance!', canvas.width / 2, canvas.height - 10);

        // Game over
        if (dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 32px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💥 TANK DESTROYED!', canvas.width / 2, canvas.height / 2 - 45);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${score}  ·  Wave: ${wave}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[SPACE] to deploy again!', canvas.width / 2, canvas.height / 2 + 62);
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
