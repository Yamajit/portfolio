/* ============================================================
   PLASMA SHIELD — Kid-Friendly Edition 🛸✨
   Bigger shield, slower bullets, 5 lives, rainbow colors,
   encouraging messages, fun animations
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl;
    let animId = null;
    let running = false;

    // ── Game State ──────────────────────────────────────────────
    let shieldAngle = 0;
    let score = 0;
    let lives = 5;
    let frameCount = 0;
    let gameOver = false;
    let bullets = [];
    let sparks = [];
    let stars = [];
    let waveNum = 1;
    let bulletCount = 0;
    let invincible = 0;
    let coreFlash = 0;
    let lastCheer = 0;

    // Controls
    let leftDown = false, rightDown = false;
    let touchStartX = null;

    const RAINBOW = ['#ff4466', '#ff8c00', '#ffe600', '#44ff88', '#00d4ff', '#cc00ff', '#ff00aa'];
    const CHEERS = ['⭐ Great!', '🎉 Amazing!', '🚀 Nice Block!', '🏆 Superstar!', '🌟 Woah!', '🔥 Incredible!'];
    let cheerMsg = '';
    let cheerTimer = 0;

    function showCheer() {
        cheerMsg = CHEERS[Math.floor(Math.random() * CHEERS.length)];
        cheerTimer = 70;
    }

    function spawnSpark(x, y, color) {
        for (let i = 0; i < 7; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = Math.random() * 4 + 1;
            sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 28, color });
        }
    }

    function spawnBullet() {
        const a = Math.random() * Math.PI * 2;
        // Kid-friendly: bullet spawns further away, moves slower
        const baseSpeed = 0.008 + waveNum * 0.0014;
        bullets.push({ angle: a, dist: 1.0, speed: baseSpeed, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)], r: 7 });
    }

    function reset() {
        shieldAngle = 0; score = 0; lives = 5; frameCount = 0;
        gameOver = false; bullets = []; sparks = []; stars = [];
        waveNum = 1; bulletCount = 0; invincible = 0; coreFlash = 0;
        cheerMsg = ''; cheerTimer = 0; lastCheer = 0;
    }

    function update() {
        if (gameOver) return;
        frameCount++;

        // Rotate shield
        const rotSpeed = 0.055;
        if (leftDown) shieldAngle -= rotSpeed;
        if (rightDown) shieldAngle += rotSpeed;

        // Spawn bullets — gently increasing
        const interval = Math.max(35, 90 - waveNum * 5);
        if (frameCount % interval === 0) {
            spawnBullet();
            bulletCount++;
            if (bulletCount % 8 === 0) waveNum++;
        }

        // Move bullets inward
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.dist -= b.speed;

            // Reached shield zone?
            const shieldWidth = Math.PI * 0.55; // 55% coverage — very generous for kids
            let angleDiff = b.angle - shieldAngle;
            angleDiff = ((angleDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

            if (b.dist <= 0.62 && b.dist > 0.52) {
                if (Math.abs(angleDiff) < shieldWidth) {
                    // DEFLECTED! 🎉
                    score += 15;
                    if (scoreEl) scoreEl.textContent = 'Score: ' + score;
                    const cx = canvas.width / 2, cy = canvas.height / 2;
                    const rad = Math.min(canvas.width, canvas.height) * 0.3 * b.dist;
                    spawnSpark(cx + Math.cos(b.angle) * rad, cy + Math.sin(b.angle) * rad, b.color);
                    if (score - lastCheer >= 60) { showCheer(); lastCheer = score; }
                    bullets.splice(i, 1);
                    continue;
                }
            }

            // Hit core?
            if (b.dist <= 0.12) {
                if (invincible <= 0) {
                    lives--;
                    invincible = 90;
                    coreFlash = 30;
                    if (lives <= 0) { gameOver = true; }
                }
                const cx = canvas.width / 2, cy = canvas.height / 2;
                spawnSpark(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, '#ff4466');
                bullets.splice(i, 1);
                continue;
            }

            if (b.dist < 0) bullets.splice(i, 1);
        }

        if (invincible > 0) invincible--;
        if (coreFlash > 0) coreFlash--;
        if (cheerTimer > 0) cheerTimer--;

        // Update sparks
        for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vx *= 0.92; s.vy *= 0.92; s.life--; }
        sparks = sparks.filter(s => s.life > 0);
    }

    // ── Drawing ──────────────────────────────────────────────────
    function drawBg() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(canvas.width, canvas.height) * 0.7);
        bg.addColorStop(0, '#0a0030');
        bg.addColorStop(0.6, '#050018');
        bg.addColorStop(1, '#020008');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Spinning background rings (decorative)
        const maxR = Math.min(canvas.width, canvas.height) * 0.45;
        for (let i = 3; i >= 1; i--) {
            ctx.beginPath(); ctx.arc(cx, cy, maxR * (i / 3), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(204,0,255,${0.06 * i})`; ctx.lineWidth = 1; ctx.stroke();
        }
    }

    function drawCore() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const coreR = Math.min(canvas.width, canvas.height) * 0.085;
        const pulse = 1 + 0.08 * Math.sin(frameCount * 0.1);
        const coreColor = coreFlash > 0 ? '#ff4466' : '#00d4ff';
        ctx.beginPath(); ctx.arc(cx, cy, coreR * pulse, 0, Math.PI * 2);
        ctx.fillStyle = coreColor + '25';
        ctx.shadowColor = coreColor; ctx.shadowBlur = 30;
        ctx.fill();
        ctx.strokeStyle = coreColor; ctx.lineWidth = 3; ctx.stroke();
        ctx.shadowBlur = 0;
        // Star emoji in core
        ctx.font = `${Math.floor(coreR * 1.1)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(coreFlash > 0 ? '💥' : '⭐', cx, cy + 2);
        ctx.textBaseline = 'alphabetic';
    }

    function drawShield() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const shieldR = Math.min(canvas.width, canvas.height) * 0.30;
        const shieldWidth = Math.PI * 0.55;
        const col = RAINBOW[Math.floor(frameCount / 8) % RAINBOW.length];

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, shieldR + 4, shieldAngle - shieldWidth, shieldAngle + shieldWidth);
        ctx.strokeStyle = col + '30'; ctx.lineWidth = 18; ctx.stroke();

        // Main shield arc
        ctx.beginPath();
        ctx.arc(cx, cy, shieldR, shieldAngle - shieldWidth, shieldAngle + shieldWidth);
        ctx.strokeStyle = col; ctx.lineWidth = 9;
        ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.stroke();
        ctx.shadowBlur = 0;

        // Shield end caps (sparkle dots)
        for (const ea of [shieldAngle - shieldWidth, shieldAngle + shieldWidth]) {
            const ex = cx + Math.cos(ea) * shieldR, ey = cy + Math.sin(ea) * shieldR;
            ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function drawBullets() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const maxR = Math.min(canvas.width, canvas.height) * 0.45;
        for (const b of bullets) {
            const bx = cx + Math.cos(b.angle) * maxR * b.dist;
            const by = cy + Math.sin(b.angle) * maxR * b.dist;
            ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color; ctx.shadowBlur = 14; ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function drawSparks() {
        for (const s of sparks) {
            ctx.globalAlpha = s.life / 28;
            ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    function drawHUD() {
        const cx = canvas.width / 2;
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8;
        ctx.fillText('PLASMA SHIELD 🛸', cx, 28);
        ctx.shadowBlur = 0;

        // Lives as hearts
        let hearts = '';
        for (let i = 0; i < 5; i++) hearts += i < lives ? '💜' : '🖤';
        ctx.font = '18px serif'; ctx.fillText(hearts, cx, 50);

        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.fillStyle = '#ffe600'; ctx.textAlign = 'left'; ctx.shadowBlur = 0;
        ctx.fillText('⭐ ' + score, 14, 28);

        ctx.fillStyle = '#ff4488'; ctx.textAlign = 'right';
        ctx.fillText('Wave ' + waveNum, canvas.width - 14, 28);

        // Cheer message
        if (cheerTimer > 0) {
            ctx.globalAlpha = Math.min(1, cheerTimer / 25);
            ctx.font = 'bold 22px Orbitron, monospace';
            ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 15;
            ctx.textAlign = 'center';
            ctx.fillText(cheerMsg, cx, canvas.height * 0.3);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
    }

    function drawGameOver() {
        if (!gameOver) return;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const pulse = 1 + 0.06 * Math.sin(frameCount * 0.1);
        ctx.font = `bold ${Math.floor(32 * pulse)}px Orbitron, monospace`;
        ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 25;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER 😢', cx, cy - 30);
        ctx.shadowBlur = 0;
        ctx.font = '18px Orbitron, monospace'; ctx.fillStyle = '#ffe600';
        ctx.fillText('Score: ' + score, cx, cy + 15);
        ctx.font = '13px Orbitron, monospace'; ctx.fillStyle = 'rgba(200,200,255,0.8)';
        ctx.fillText('Press SPACE or tap to play again!', cx, cy + 50);
    }

    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg(); drawBullets(); drawShield(); drawCore(); drawSparks(); drawHUD(); drawGameOver();
        animId = requestAnimationFrame(loop);
    }

    // ── Input ────────────────────────────────────────────────────
    function onKey(e) {
        if (e.type === 'keydown') {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') leftDown = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') rightDown = true;
            if ((e.code === 'Space' || e.code === 'Enter') && gameOver) reset();
        } else {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') leftDown = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') rightDown = false;
        }
    }

    function onTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        if (gameOver) reset();
    }
    function onTouchMove(e) {
        if (touchStartX === null) return;
        const dx = e.touches[0].clientX - touchStartX;
        shieldAngle += dx * 0.012;
        touchStartX = e.touches[0].clientX;
    }
    function onTouchEnd() { touchStartX = null; }

    return {
        init(c, s) {
            canvas = c; scoreEl = s; ctx = canvas.getContext('2d');
            running = true; reset();
            window.addEventListener('keydown', onKey);
            window.addEventListener('keyup', onKey);
            canvas.addEventListener('touchstart', onTouchStart, { passive: true });
            canvas.addEventListener('touchmove', onTouchMove, { passive: true });
            canvas.addEventListener('touchend', onTouchEnd, { passive: true });
            loop();
        },
        destroy() {
            running = false;
            if (animId) cancelAnimationFrame(animId);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
        }
    };
})();
