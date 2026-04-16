/* ============================================================
   GAME: Aim Trainer — Hit moving targets with precision!
   Targets move around — click the bullseye for max score.
   Controls: Mouse click / Tap
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio;
    let animId;

    let targets, particles, score, hiScore, lives, streak, frame, state;
    let spawnRate, maxTargets;
    let flashBad = 0;

    function mkTarget() {
        const margin = 60;
        const x = margin + Math.random() * (canvas.width - margin * 2);
        const y = margin + Math.random() * (canvas.height - margin * 2 - 50);
        const r = 14 + Math.random() * 20;
        const speed = 0.8 + Math.random() * 1.4;
        const angle = Math.random() * Math.PI * 2;
        const col = ['#ff4d6d', '#00d4ff', '#00ff88', '#ffe066', '#cc00ff'][Math.floor(Math.random() * 5)];
        return { x, y, r, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, col, life: 220, born: frame };
    }

    function reset() {
        targets = []; particles = []; score = 0; lives = 5; streak = 0; frame = 0;
        spawnRate = 90; maxTargets = 4; state = 'playing'; flashBad = 0;
        hiScore = parseInt(localStorage.getItem('gz-aimtrainer-hi') || '0');
    }

    function spawnBurst(x, y, col, pts) {
        for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 30, max: 30 });
        }
        particles.push({ x, y, vx: 0, vy: -2, col: '#fff', text: `+${pts}`, life: 45, max: 45, isText: true });
    }

    function handleClick(e) {
        if (window.gamePaused) return;
        if (state === 'gameover') { reset(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);

        let hit = false;
        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            const dist = Math.hypot(mx - t.x, my - t.y);
            if (dist < t.r + 6) {
                // Inner bullseye bonus
                const inner = dist < t.r * 0.4;
                streak++;
                const pts = (inner ? 30 : 15) * (streak >= 5 ? 2 : 1);
                score += pts;
                targets.splice(i, 1);
                spawnBurst(t.x, t.y, t.col, pts + (inner ? '🎯' : ''));
                audio.playSound('score');
                hit = true;
                break;
            }
        }
        if (!hit) {
            lives--;
            streak = 0;
            flashBad = 12;
            audio.playSound('thud');
            if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-aimtrainer-hi', hiScore); } }
        }
    }

    function init(c, s, a) {
        canvas = c; scoreEl = s; audio = a;
        ctx = canvas.getContext('2d');
        reset();
        canvas._atClick = handleClick;
        canvas.addEventListener('click', canvas._atClick);
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            handleClick({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }, { passive: false });
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') return;
        frame++;

        spawnRate = Math.max(40, 90 - Math.floor(score / 150) * 5);
        maxTargets = Math.min(7, 4 + Math.floor(score / 300));

        if (frame % spawnRate === 0 && targets.length < maxTargets) {
            targets.push(mkTarget());
        }

        targets.forEach(t => {
            t.x += t.vx; t.y += t.vy;
            if (t.x < t.r || t.x > canvas.width - t.r) t.vx *= -1;
            if (t.y < t.r || t.y > canvas.height - t.r - 30) t.vy *= -1;
            t.life--;
            if (t.life <= 0) {
                streak = 0; lives--;
                flashBad = 10;
                audio.playSound('thud');
                if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-aimtrainer-hi', hiScore); } }
            }
        });
        targets = targets.filter(t => t.life > 0);

        if (flashBad > 0) flashBad--;
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (!p.isText) p.vy += 0.06; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  ❤️ ${lives}${streak >= 3 ? '  🔥' + streak + '×' : ''}`;
    }

    function draw() {
        const t = Date.now();
        ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (flashBad > 0) {
            ctx.fillStyle = `rgba(220,0,0,${flashBad * 0.04})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Crosshair cursor hint
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
        for (let gx = 0; gx < canvas.width; gx += 50) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
        }
        for (let gy = 0; gy < canvas.height; gy += 50) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
        }

        // Targets
        targets.forEach(tg => {
            const frac = tg.life / 220;
            const urgency = frac < 0.3;
            const col = tg.col;

            // Outer fade ring
            ctx.strokeStyle = col + Math.floor(frac * 120).toString(16).padStart(2, '0');
            ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = col;
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 8, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;

            // Main circle
            const gr = ctx.createRadialGradient(tg.x - tg.r * 0.3, tg.y - tg.r * 0.3, 0, tg.x, tg.y, tg.r);
            gr.addColorStop(0, 'rgba(255,255,255,0.4)');
            gr.addColorStop(0.5, col + 'cc');
            gr.addColorStop(1, col + '55');
            ctx.fillStyle = gr; ctx.shadowBlur = 12; ctx.shadowColor = col;
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Bullseye rings
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * 0.25, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * 0.1, 0, Math.PI * 2); ctx.fill();

            // Crosshairs
            ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tg.x - tg.r, tg.y); ctx.lineTo(tg.x + tg.r, tg.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(tg.x, tg.y - tg.r); ctx.lineTo(tg.x, tg.y + tg.r); ctx.stroke();

            // Urgency warning
            if (urgency) {
                const p = 0.5 + 0.5 * Math.sin(t * 0.025);
                ctx.fillStyle = `rgba(255,50,50,${0.25 * p})`;
                ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 14, 0, Math.PI * 2); ctx.fill();
            }
        });

        // Particles
        particles.forEach(p => {
            if (p.isText) {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
                ctx.font = 'bold 15px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Lives
        ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (let i = 0; i < 5; i++) ctx.fillText(i < lives ? '❤️' : '🖤', 10 + i * 24, 8);

        if (streak >= 3) {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffe066';
            ctx.font = 'bold 15px Orbitron'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`🔥 ${streak}×`, canvas.width - 12, 8); ctx.shadowBlur = 0;
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Click moving targets!  ·  Hit the center bullseye for 30pts  ·  5× streak = 2× bonus', canvas.width / 2, canvas.height - 10);

        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('🎯 MISSED!', canvas.width / 2, canvas.height / 2 - 36);
            ctx.fillStyle = '#fff'; ctx.font = '17px Orbitron';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[CLICK] to try again', canvas.width / 2, canvas.height / 2 + 58);
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
        if (canvas._atClick) canvas.removeEventListener('click', canvas._atClick);
    }
    return { init, destroy };
})();
