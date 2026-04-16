/* ============================================================
   GAME: Meteor Rain — Endless Dodge Runner
   Steer your ship left/right to dodge falling meteors.
   Controls: ←→ / A D = Move | Mobile: D-Pad
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let player, meteors, particles, stars;
    let score, hiScore, speed, frame, dead, deadTimer;
    let shield, shieldTimer;

    const PLAYER_W = 32, PLAYER_H = 38;
    const COLORS = ['#ff4d6d', '#ffaa00', '#ff6644', '#cc00ff', '#ff3300'];
    const STAR_COUNT = 80;

    function reset() {
        player = {
            x: canvas.width / 2 - PLAYER_W / 2,
            y: canvas.height - 80,
            speed: 6
        };
        meteors = [];
        particles = [];
        score = 0;
        speed = 2.5;
        frame = 0;
        dead = false;
        deadTimer = 0;
        shield = false;
        shieldTimer = 0;

        stars = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            speed: 0.5 + Math.random() * 1.5
        }));
    }

    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        hiScore = parseInt(localStorage.getItem('gz-meteor-hi') || '0');
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    let leftWas = false, rightWas = false;
    function handleInput() {
        if (window.gamePaused) return;
        if (dead) return;

        const leftNow = input.isPressed('ArrowLeft') || input.isPressed('KeyA');
        const rightNow = input.isPressed('ArrowRight') || input.isPressed('KeyD');

        if (leftNow) player.x -= player.speed;
        if (rightNow) player.x += player.speed;

        // Clamp
        player.x = Math.max(0, Math.min(canvas.width - PLAYER_W, player.x));
    }

    let spaceWas = false;
    function handleRestart() {
        if (!dead) return;
        const spaceNow = input.isPressed('Space');
        if (spaceNow && !spaceWas) { spaceWas = true; reset(); }
        if (!spaceNow) spaceWas = false;
    }

    function spawnBurst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, col, life: 30, max: 30 });
        }
    }

    function update() {
        if (window.gamePaused) return;
        handleInput();
        handleRestart();
        if (dead) { deadTimer++; return; }
        frame++;

        // Ramp difficulty
        speed = 2.5 + score * 0.002;
        player.speed = 5.5 + score * 0.001;

        // Star parallax
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        });

        // Spawn meteors
        const spawnInterval = Math.max(18, 55 - Math.floor(score / 60));
        if (frame % spawnInterval === 0) {
            const r = 10 + Math.random() * 22;
            const cols = COLORS[Math.floor(Math.random() * COLORS.length)];
            meteors.push({
                x: r + Math.random() * (canvas.width - r * 2),
                y: -r - 10,
                r,
                col: cols,
                speed: speed + Math.random() * 1.5,
                spin: 0,
                spinRate: (Math.random() - 0.5) * 0.1
            });
        }

        // Move meteors
        meteors.forEach(m => {
            m.y += m.speed;
            m.spin += m.spinRate;
        });
        meteors = meteors.filter(m => m.y < canvas.height + 60);

        // Collision
        const px = player.x + PLAYER_W / 2;
        const py = player.y + PLAYER_H / 2;
        for (const m of meteors) {
            const dx = px - m.x, dy = py - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < m.r + 12) {
                if (!shield) {
                    dead = true;
                    deadTimer = 0;
                    if (Math.floor(score) > hiScore) {
                        hiScore = Math.floor(score);
                        localStorage.setItem('gz-meteor-hi', hiScore);
                    }
                    spawnBurst(px, py, '#ff4455', 24);
                    audio.playSound('thud');
                } else {
                    // Shield absorbs hit
                    spawnBurst(m.x, m.y, '#00ffcc', 12);
                    meteors = meteors.filter(mm => mm !== m);
                    shield = false;
                    shieldTimer = 0;
                    audio.playSound('score');
                }
                break;
            }
        }

        // Particles
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; });
        particles = particles.filter(p => p.life > 0);

        score += 0.07;
        scoreEl.textContent = `Score: ${Math.floor(score)}  Best: ${hiScore}`;
    }

    function drawShip(x, y) {
        ctx.save();
        ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);

        // Engine glow
        const grd = ctx.createRadialGradient(0, PLAYER_H / 2 - 2, 2, 0, PLAYER_H / 2, 14);
        grd.addColorStop(0, '#00ffcc');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, PLAYER_H / 2 - 4, 14, 0, Math.PI * 2); ctx.fill();

        // Body (triangle ship)
        ctx.fillStyle = '#00ddee';
        ctx.shadowBlur = 16; ctx.shadowColor = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(0, -PLAYER_H / 2);
        ctx.lineTo(PLAYER_W / 2, PLAYER_H / 2);
        ctx.lineTo(-PLAYER_W / 2, PLAYER_H / 2);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#aaffe8';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(0, -2, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shield ring
        if (shield) {
            ctx.strokeStyle = `rgba(0,255,200,${0.5 + 0.4 * Math.sin(Date.now() * 0.01)})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 14; ctx.shadowColor = '#00ffcc';
            ctx.beginPath(); ctx.arc(0, 0, PLAYER_W * 0.75, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.restore();
        ctx.shadowBlur = 0;
    }

    function drawMeteor(m) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.spin);

        // Core
        const grd = ctx.createRadialGradient(0, 0, m.r * 0.2, 0, 0, m.r);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.3, m.col);
        grd.addColorStop(1, '#1a0000');
        ctx.fillStyle = grd;
        ctx.shadowBlur = 18; ctx.shadowColor = m.col;
        ctx.beginPath();
        // Irregular shape
        ctx.moveTo(m.r, 0);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = m.r * (0.7 + Math.sin(i * 1.4 + m.spin * 5) * 0.3);
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.fill();

        // Crater highlights
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(-m.r * 0.25, -m.r * 0.2, m.r * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(m.r * 0.3, m.r * 0.15, m.r * 0.15, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
        ctx.shadowBlur = 0;
    }

    function draw() {
        // Background
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#000010'); sky.addColorStop(1, '#050020');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        stars.forEach(s => {
            ctx.fillStyle = `rgba(255,255,255,${0.4 + s.r * 0.3})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });

        // Meteors
        meteors.forEach(m => drawMeteor(m));

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Player
        if (!dead || Math.floor(deadTimer / 6) % 2 === 0) {
            drawShip(player.x, player.y);
        }

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)';
        ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('← → or A D = Move  ·  Dodge the meteors!', canvas.width / 2, canvas.height - 10);

        // Game over screen
        if (dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 34px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💥 DESTROYED!', canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[SPACE] or [CLICK] to try again!', canvas.width / 2, canvas.height / 2 + 62);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }

    function destroy() {
        cancelAnimationFrame(animId);
    }

    return { init, destroy };
})();
