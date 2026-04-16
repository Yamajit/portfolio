/* ============================================================
   GAME: Reaction Time — Lightning Reflex Tester
   Wait for RED → GREEN, then tap/click/space as fast as you can!
   10 rounds. Average time is your final score (lower = better).
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    const ROUNDS = 10;
    let state; // 'waiting' | 'ready' | 'go' | 'false-start' | 'result' | 'done'
    let round, times, waitStart, goTime, reactionMs;
    let waitDelay;
    let particles;
    let bestAvg;

    // For avoiding holding space
    let spacePressedSinceGo = false;

    function reset() {
        state = 'waiting';
        round = 0;
        times = [];
        reactionMs = null;
        particles = [];
        bestAvg = parseFloat(localStorage.getItem('gz-reaction-best') || 'Infinity');
        scheduleGo();
    }

    function scheduleGo() {
        state = 'ready';
        waitDelay = 1500 + Math.random() * 2500;
        waitStart = performance.now();
        spacePressedSinceGo = false;
    }

    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');

        canvas._rtClick = () => handleTap();
        canvas.addEventListener('click', canvas._rtClick);
        canvas.addEventListener('touchstart', canvas._rtClick, { passive: true });

        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    let spaceWas = false;
    function handleSpaceInput() {
        const spaceNow = input.isPressed('Space');
        if (spaceNow && !spaceWas) {
            spaceWas = true;
            handleTap();
        }
        if (!spaceNow) spaceWas = false;
    }

    function handleTap() {
        if (window.gamePaused) return;

        if (state === 'done' || state === 'result') {
            reset();
            return;
        }

        if (state === 'ready') {
            // False start!
            state = 'false-start';
            audio.playSound('thud');
            spawnBurst(canvas.width / 2, canvas.height / 2, '#ff4455', 20);
            setTimeout(() => {
                if (state === 'false-start') scheduleGo();
            }, 1200);
            return;
        }

        if (state === 'go') {
            const now = performance.now();
            reactionMs = Math.round(now - goTime);
            times.push(reactionMs);
            round++;
            audio.playSound('score');
            spawnBurst(canvas.width / 2, canvas.height / 2, '#00ff88', 18);

            if (round >= ROUNDS) {
                state = 'done';
                const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                if (avg < bestAvg) {
                    bestAvg = avg;
                    localStorage.setItem('gz-reaction-best', avg);
                }
                audio.playSound('click');
            } else {
                state = 'result';
                setTimeout(() => {
                    if (state === 'result') scheduleGo();
                }, 900);
            }
        }
    }

    function spawnBurst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 40, max: 40 });
        }
    }

    let flashT = 0;
    function update() {
        if (window.gamePaused) return;
        handleSpaceInput();
        flashT++;

        // Particles
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--; });
        particles = particles.filter(p => p.life > 0);

        // Check if it's time to go
        if (state === 'ready') {
            const now = performance.now();
            if (now - waitStart >= waitDelay) {
                state = 'go';
                goTime = performance.now();
                audio.playSound('click');
                spawnBurst(canvas.width / 2, canvas.height / 2, '#00ff88', 10);
            }
        }

        // HUD
        const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : '--';
        scoreEl.textContent = `Round: ${round}/${ROUNDS}  ·  Avg: ${avg}ms  ·  Best: ${bestAvg === Infinity ? '--' : bestAvg + 'ms'}`;
    }

    function draw() {
        // Background
        let bgCol = '#080808';
        if (state === 'ready') bgCol = '#100a00';
        else if (state === 'go') bgCol = '#001a00';
        else if (state === 'false-start') bgCol = '#1a0000';

        ctx.fillStyle = bgCol; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;

        // Giant circle indicator
        let circleCol = '#333';
        let label = '';
        let sublabel = '';
        let pulse = 1;

        if (state === 'ready') {
            circleCol = '#cc3300';
            label = '⏳ WAIT...';
            sublabel = 'Get ready!';
            pulse = 1 + 0.03 * Math.sin(flashT * 0.07);
        } else if (state === 'go') {
            const elapsed = performance.now() - goTime;
            circleCol = '#00cc44';
            label = '🟢 GO!';
            sublabel = Math.round(elapsed) + 'ms elapsed';
            pulse = 1 + 0.06 * Math.sin(flashT * 0.2);
        } else if (state === 'false-start') {
            circleCol = '#ff2200';
            label = '❌ TOO EARLY!';
            sublabel = 'Wait for GREEN';
            pulse = 1 + 0.04 * Math.sin(flashT * 0.3);
        } else if (state === 'result') {
            circleCol = '#00aa33';
            label = `⚡ ${reactionMs}ms`;
            sublabel = reactionMs < 200 ? 'SUPERHUMAN!' : reactionMs < 300 ? 'Excellent!' : reactionMs < 400 ? 'Good!' : 'Keep training!';
            pulse = 1;
        } else if (state === 'done') {
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            circleCol = '#ffaa00';
            label = `⭐ ${avg}ms avg`;
            sublabel = avg === bestAvg ? '🏆 New Best!' : `Best: ${bestAvg}ms`;
            pulse = 1 + 0.03 * Math.sin(flashT * 0.05);
        }

        // Outer ring
        const R = Math.min(cx, cy) * 0.62 * pulse;
        const grd = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R);
        grd.addColorStop(0, circleCol + 'cc');
        grd.addColorStop(1, circleCol + '22');
        ctx.fillStyle = grd;
        ctx.shadowBlur = 40; ctx.shadowColor = circleCol;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = circleCol;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20; ctx.shadowColor = circleCol;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        const fontSize = Math.max(18, Math.min(38, canvas.width / 11));
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${fontSize}px Orbitron`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy - 10);

        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = `${Math.max(12, fontSize * 0.5)}px Orbitron`;
        ctx.fillText(sublabel, cx, cy + fontSize * 0.8);

        // Round pips
        const pipR = 8, pipGap = 22;
        const totalW = (ROUNDS - 1) * pipGap;
        const pipY = cy + R + 24;
        for (let i = 0; i < ROUNDS; i++) {
            const px = cx - totalW / 2 + i * pipGap;
            if (i < times.length) {
                const ms = times[i];
                const pipCol = ms < 250 ? '#00ff88' : ms < 400 ? '#ffe066' : '#ff4d6d';
                ctx.fillStyle = pipCol;
                ctx.shadowBlur = 8; ctx.shadowColor = pipCol;
            } else if (i === round && state !== 'done') {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 8; ctx.shadowColor = '#fff';
            } else {
                ctx.fillStyle = '#333';
                ctx.shadowBlur = 0;
            }
            ctx.beginPath(); ctx.arc(px, pipY, pipR, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Bottom hint
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        if (state === 'done') {
            ctx.fillText(`${ROUNDS} rounds done! Click / [SPACE] to play again`, cx, canvas.height - 10);
        } else {
            ctx.fillText('Click / [SPACE] when the circle turns GREEN!', cx, canvas.height - 10);
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
        if (canvas._rtClick) {
            canvas.removeEventListener('click', canvas._rtClick);
            canvas.removeEventListener('touchstart', canvas._rtClick);
        }
    }

    return { init, destroy };
})();
