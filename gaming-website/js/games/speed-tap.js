/* ============================================================
   GAME: Speed Tap — Reaction time challenge!
   Tap glowing targets as fast as you can. Wrong taps cost lives.
   Controls: Mouse click / Touch tap
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let targets, particles, score, hiScore, lives, streak;
    let frame, state, deadTimer;
    let nextSpawn = 60, shrinkSpeed = 0.35;
    let flashBad = 0;

    const COLORS = ['#ff4d6d', '#ffaa00', '#00d4ff', '#00ff88', '#cc00ff', '#ffe066', '#ff6644'];

    function mkTarget() {
        const margin = 70;
        const x = margin + Math.random() * (canvas.width - margin * 2);
        const y = margin + Math.random() * (canvas.height - margin * 2 - 50);
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        const maxR = 34 + Math.random() * 22;
        return { x, y, r: maxR, maxR, col, alive: true, born: frame, age: 0 };
    }

    function reset() {
        targets = []; particles = []; score = 0; lives = 3; streak = 0; frame = 0;
        nextSpawn = 50; shrinkSpeed = 0.3; state = 'playing'; deadTimer = 0; flashBad = 0;
        hiScore = parseInt(localStorage.getItem('gz-speedtap-hi') || '0');
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        canvas._stClick = handleClick;
        canvas.addEventListener('click', canvas._stClick);
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            handleClick({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function handleClick(e) {
        if (window.gamePaused) return;
        if (state === 'gameover') { reset(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        let hit = false;
        // Largest target first
        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            if (!t.alive) continue;
            if (Math.hypot(mx - t.x, my - t.y) < t.r + 4) {
                t.alive = false;
                streak++;
                const reaction = Math.max(0, (1 - (t.age / 180)));
                const pts = Math.ceil(10 + reaction * 90) * (streak >= 5 ? 2 : 1);
                score += pts;
                spawnBurst(t.x, t.y, t.col, 16, pts);
                audio.playSound('score');
                hit = true; break;
            }
        }
        if (!hit) {
            lives--;
            streak = 0;
            flashBad = 10;
            audio.playSound('thud');
            if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-speedtap-hi', hiScore); } }
        }
    }

    function spawnBurst(x, y, col, n, pts) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 32, max: 32 });
        }
        particles.push({ x, y, vx: 0, vy: -1.5, col: '#fff', text: `+${pts}`, life: 50, max: 50, isText: true });
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') { deadTimer++; return; }
        frame++;

        // Difficulty ramp
        shrinkSpeed = Math.min(1.2, 0.3 + score * 0.0012);
        nextSpawn = Math.max(30, 55 - Math.floor(score / 200) * 3);

        if (frame % Math.ceil(nextSpawn) === 0 && targets.filter(t => t.alive).length < 5) {
            targets.push(mkTarget());
        }

        // Shrink targets
        targets.forEach(t => {
            if (!t.alive) return;
            t.age++;
            t.r -= shrinkSpeed;
            if (t.r <= 0) { // Missed!
                t.alive = false;
                streak = 0;
                lives--;
                flashBad = 10;
                audio.playSound('thud');
                if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-speedtap-hi', hiScore); } }
            }
        });
        targets = targets.filter(t => t.alive || t.age < 5);

        if (flashBad > 0) flashBad--;

        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (!p.isText) p.vy += 0.06; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  ❤️ ${lives}${streak >= 3 ? ' 🔥' + streak + '×' : ''}`;
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        // BG flash red on miss
        if (flashBad > 0) {
            ctx.fillStyle = `rgba(200,0,0,${flashBad * 0.05})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = '#070710'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid hint
        for (let gx = 0; gx < canvas.width; gx += 50) {
            ctx.strokeStyle = 'rgba(50,50,100,0.2)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
        }
        for (let gy = 0; gy < canvas.height; gy += 50) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
        }

        // Targets
        targets.forEach(tg => {
            if (!tg.alive) return;
            const frac = tg.r / tg.maxR;
            // Ring shrink effect
            ctx.strokeStyle = tg.col; ctx.lineWidth = 3; ctx.shadowBlur = 12; ctx.shadowColor = tg.col;
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.maxR + 4, 0, Math.PI * 2); ctx.stroke(); // outer ring
            ctx.shadowBlur = 0;

            // Fill circle
            const g = ctx.createRadialGradient(tg.x - tg.r * 0.3, tg.y - tg.r * 0.3, 0, tg.x, tg.y, tg.r);
            g.addColorStop(0, 'rgba(255,255,255,0.4)');
            g.addColorStop(0.5, tg.col + 'cc');
            g.addColorStop(1, tg.col + '66');
            ctx.fillStyle = g; ctx.shadowBlur = 16; ctx.shadowColor = tg.col;
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Urgency — pulse faster when small
            if (frac < 0.4) {
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.02);
                ctx.fillStyle = `rgba(255,60,60,${0.3 * pulse})`;
                ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 6, 0, Math.PI * 2); ctx.fill();
            }

            // Crosshair + tick icon
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(tg.x - tg.r * 0.4, tg.y); ctx.lineTo(tg.x + tg.r * 0.4, tg.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tg.x, tg.y - tg.r * 0.4); ctx.lineTo(tg.x, tg.y + tg.r * 0.4); ctx.stroke();
        });

        // Particles
        particles.forEach(p => {
            if (p.isText) {
                ctx.globalAlpha = p.life / p.max;
                ctx.fillStyle = p.col; ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Lives
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < lives ? '#ff4d6d' : 'rgba(255,255,255,0.1)';
            ctx.font = '18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText('❤️', 12 + i * 28, 8);
        }

        // Streak
        if (streak >= 3) {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffe066';
            ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`🔥 ${streak}× STREAK!`, canvas.width - 12, 8); ctx.shadowBlur = 0;
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('🖱 Click targets before they shrink away!  ·  5× streak = double points!', canvas.width / 2, canvas.height - 10);

        // Game Over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 32px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('⏱ TOO SLOW!', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[CLICK] to try again!', canvas.width / 2, canvas.height / 2 + 62);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2); ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._stClick) canvas.removeEventListener('click', canvas._stClick);
    }
    return { init, destroy };
})();
