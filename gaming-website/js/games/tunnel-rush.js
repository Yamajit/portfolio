/* ============================================================
   TUNNEL RUSH — Kid-Friendly Edition 🌈
   Bright colors, slower speed, 5 lives, encouraging messages
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl;
    let animId = null;
    let running = false;

    // ── Game State ──────────────────────────────────────────────
    let angle = 0;           // player rotation angle around tunnel
    let speed = 0;           // current tunnel speed
    let distance = 0;        // total distance survived
    let lives = 5;           // kid-friendly: 5 lives
    let score = 0;
    let frameCount = 0;
    let gameOver = false;
    let invincible = 0;      // invincibility frames after hit
    let hitShake = 0;
    let stars = [];          // celebration stars
    let lastMilestone = 0;

    // Controls
    let leftDown = false, rightDown = false;
    let touchStartX = null;

    // Obstacle rings
    let rings = [];

    // Rainbow palette for tunnel & player
    const RAINBOW = ['#ff4466', '#ff8c00', '#ffe600', '#44ff88', '#00d4ff', '#cc00ff', '#ff0088'];
    let hueShift = 0;

    // Cheery messages on milestones
    const CHEERS = ['🎉 Great!', '⭐ Amazing!', '🚀 Woah!', '🏆 Super!', '🌟 Brilliant!', '🔥 On Fire!'];

    function getRainbow(offset = 0) {
        return RAINBOW[Math.floor((hueShift + offset) / 10) % RAINBOW.length];
    }

    function spawnRing() {
        const numGaps = 2 + Math.floor(distance / 1500); // more gaps for kids initially
        const totalSlots = 10;
        const sectors = [];
        for (let i = 0; i < totalSlots; i++) sectors.push(i);

        // pick random gap positions
        const gapSlots = new Set();
        while (gapSlots.size < Math.min(numGaps, totalSlots - 1)) {
            gapSlots.add(Math.floor(Math.random() * totalSlots));
        }
        const obstacles = sectors.filter(s => !gapSlots.has(s));
        rings.push({
            z: -1,              // behind the screen
            segments: obstacles,
            totalSlots,
            color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
            rotation: Math.random() * Math.PI * 2
        });
    }

    function spawnStar(x, y) {
        stars.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: Math.random() * -4 - 1, life: 45, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)] });
    }

    function reset() {
        angle = 0; speed = 0; distance = 0; lives = 5; score = 0;
        frameCount = 0; gameOver = false; invincible = 0; rings = []; stars = [];
        lastMilestone = 0; hueShift = 0;
    }

    function update() {
        if (gameOver) return;
        frameCount++; hueShift++;

        // Gradually increase speed — much gentler for kids
        speed = Math.min(2.8 + distance / 4000, 5.5);
        distance += speed;
        score = Math.floor(distance / 10);
        if (scoreEl) scoreEl.textContent = 'Score: ' + score;

        // Spawn rings
        if (frameCount % Math.max(30, 80 - Math.floor(distance / 800)) === 0) spawnRing();

        // Move rings forward
        for (const r of rings) r.z += speed * 0.014;

        // Player rotation input — nice & responsive
        const rotSpeed = 0.06;
        if (leftDown) angle -= rotSpeed;
        if (rightDown) angle += rotSpeed;

        // Collision detection
        if (invincible > 0) { invincible--; }
        else {
            for (const ring of rings) {
                if (ring.z > 0.65 && ring.z < 0.9) {
                    const playerSlot = Math.floor(((angle % (Math.PI * 2) + Math.PI * 2) / (Math.PI * 2)) * ring.totalSlots) % ring.totalSlots;
                    if (ring.segments.includes(playerSlot)) {
                        lives--;
                        invincible = 80;
                        hitShake = 18;
                        // pop celebration stars on hit (to cheer kid up)
                        const cx = canvas.width / 2, cy = canvas.height / 2;
                        for (let i = 0; i < 8; i++) spawnStar(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80);
                        if (lives <= 0) { gameOver = true; }
                        break;
                    }
                }
            }
        }

        // Milestone cheers
        const milestone = Math.floor(score / 50) * 50;
        if (milestone > lastMilestone && milestone > 0) {
            lastMilestone = milestone;
            const cx = canvas.width / 2, cy = canvas.height / 2;
            for (let i = 0; i < 14; i++) spawnStar(cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 80);
        }

        // Remove old rings
        rings = rings.filter(r => r.z < 1.05);

        // Update stars
        for (const s of stars) { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life--; }
        stars = stars.filter(s => s.life > 0);

        if (hitShake > 0) hitShake--;
    }

    // ── Drawing ──────────────────────────────────────────────────
    function drawBg() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        // Dark but fun purple-to-blue gradient bg
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(canvas.width, canvas.height) * 0.75);
        bg.addColorStop(0, '#1a0040');
        bg.addColorStop(0.5, '#0a0020');
        bg.addColorStop(1, '#060010');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawTunnel() {
        const cx = canvas.width / 2 + (hitShake > 0 ? (Math.random() - 0.5) * 10 : 0);
        const cy = canvas.height / 2 + (hitShake > 0 ? (Math.random() - 0.5) * 10 : 0);
        const maxR = Math.min(canvas.width, canvas.height) * 0.475;

        // Draw concentric tunnel rings (depth illusion)
        for (let i = 8; i >= 0; i--) {
            const t = i / 8;
            const r = maxR * t;
            const col = RAINBOW[(Math.floor(hueShift / 10) + i) % RAINBOW.length];
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = col + '40'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Draw obstacle rings
        const playerR = maxR * 0.1;

        for (const ring of rings) {
            if (ring.z <= 0 || ring.z > 1) continue;
            const r = maxR * ring.z;
            const sliceAngle = (Math.PI * 2) / ring.totalSlots;
            ctx.lineWidth = Math.max(3, 24 * ring.z);
            ctx.strokeStyle = ring.color;
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = 12;

            for (const seg of ring.segments) {
                const startA = ring.rotation + seg * sliceAngle - 0.05;
                const endA = ring.rotation + (seg + 1) * sliceAngle + 0.05;
                ctx.beginPath(); ctx.arc(cx, cy, r, startA, endA);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // Draw player — cute rainbow star shape
        const px = cx + Math.cos(angle - Math.PI / 2) * maxR * 0.72;
        const py = cy + Math.sin(angle - Math.PI / 2) * maxR * 0.72;

        const flash = invincible > 0 && Math.floor(invincible / 6) % 2 === 0;
        if (!flash) {
            const pColor = getRainbow(30);
            ctx.shadowColor = pColor; ctx.shadowBlur = 20;
            ctx.fillStyle = pColor;
            // Draw a chunky rounded triangle (spaceship shape)
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -14); ctx.lineTo(10, 10); ctx.lineTo(0, 6); ctx.lineTo(-10, 10);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            ctx.shadowBlur = 0;
        }
    }

    function drawStars() {
        for (const s of stars) {
            ctx.globalAlpha = s.life / 45;
            ctx.fillStyle = s.color;
            ctx.shadowColor = s.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    function drawHUD() {
        const cx = canvas.width / 2;
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
        ctx.fillText('TUNNEL RUSH 🌀', cx, 28);
        ctx.shadowBlur = 0;

        // Lives as hearts
        let heartsRow = '';
        for (let i = 0; i < 5; i++) heartsRow += i < lives ? '💛' : '🖤';
        ctx.font = '18px serif';
        ctx.fillText(heartsRow, cx, 52);

        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.fillStyle = '#ffe600'; ctx.textAlign = 'left';
        ctx.fillText('⭐ ' + score, 14, 28);

        // Show milestone cheer
        if (lastMilestone > 0 && score - lastMilestone < 80) {
            const cheer = CHEERS[Math.floor(lastMilestone / 50) % CHEERS.length];
            const alpha = Math.max(0, 1 - (score - lastMilestone) / 80);
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 24px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 15;
            ctx.fillText(cheer, cx, canvas.height / 2 - 60);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
    }

    function drawGameOver() {
        if (!gameOver) return;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const pulse = 1 + 0.06 * Math.sin(frameCount * 0.08);
        ctx.font = `bold ${Math.floor(34 * pulse)}px Orbitron, monospace`;
        ctx.fillStyle = '#ff0088'; ctx.shadowColor = '#ff0088'; ctx.shadowBlur = 25;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER 😢', cx, cy - 30);
        ctx.shadowBlur = 0;
        ctx.font = '18px Orbitron, monospace'; ctx.fillStyle = '#ffe600';
        ctx.fillText('Score: ' + score, cx, cy + 15);
        ctx.font = '13px Orbitron, monospace'; ctx.fillStyle = 'rgba(200,200,255,0.75)';
        ctx.fillText('Press SPACE or tap to play again!', cx, cy + 50);
    }

    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg(); drawTunnel(); drawStars(); drawHUD(); drawGameOver();
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
        angle += dx * 0.01;
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
