/* ============================================================
   GAME: Neon Pong — Classic pong with a neon twist & smart AI
   Controls: W/S or ↑/↓ = move your paddle  |  First to 7 wins
   Features: power zones, ball trail, increasing speed, AI ramp
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let state = 'playing'; // 'playing' | 'scored' | 'gameover'
    let playerScore = 0, aiScore = 0;
    const WIN_SCORE = 7;
    let lastScorer = '';
    let scoredTimer = 0;
    let restartLock = false;
    let hiScore = parseInt(localStorage.getItem('gz-pong-hi') || '0');

    // Paddles
    const PAD_H = 72, PAD_W = 12, PAD_SPEED = 6;
    const player = { x: 0, y: 0, w: PAD_W, h: PAD_H, vy: 0 };
    const ai = { x: 0, y: 0, w: PAD_W, h: PAD_H, vy: 0, reaction: 4 }; // reaction = ai error px

    // Ball
    const ball = { x: 0, y: 0, r: 8, vx: 0, vy: 0 };
    let trail = [];
    let sparks = [];
    let bgLines = [];
    let wallFlash = 0; // frames of white flash on wall hit

    // Power zones (glow strips on center sides)
    // When ball passes through them, speed boost
    const PZ_W = 6, PZ_H = 80;
    let powerZones = []; // built in reset

    function serveBall(dir) {
        ball.x = canvas.width / 2; ball.y = canvas.height / 2;
        const angle = (Math.random() * 0.6 - 0.3); // slight random angle
        const spd = 5;
        ball.vx = dir * spd * Math.cos(angle);
        ball.vy = spd * Math.sin(angle);
        trail = [];
    }

    function resetPositions() {
        player.x = 20;
        player.y = canvas.height / 2 - PAD_H / 2;
        ai.x = canvas.width - 20 - PAD_W;
        ai.y = canvas.height / 2 - PAD_H / 2;
        powerZones = [
            { x: canvas.width / 2 - PZ_W / 2, y: canvas.height / 2 - PZ_H / 2, w: PZ_W, h: PZ_H, flash: 0 }
        ];
        bgLines = [];
        for (let i = 0; i < 8; i++) bgLines.push({ x: Math.random() * canvas.width, speed: 0.5 + Math.random() * 1.5, len: 30 + Math.random() * 60 });
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        playerScore = 0; aiScore = 0; state = 'playing';
        resetPositions();
        serveBall(1);
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    // ── INPUT ────────────────────────────────────────────────
    function handleInput() {
        // Restart after game over
        if (state === 'gameover') {
            if (input.isPressed('Space') && !restartLock) {
                restartLock = true;
                playerScore = 0; aiScore = 0; state = 'playing';
                resetPositions(); serveBall(1);
            }
            if (!input.isPressed('Space')) restartLock = false;
            return;
        }
        if (state === 'scored') return; // wait for timer

        const up = input.isPressed('ArrowUp') || input.isPressed('KeyW');
        const down = input.isPressed('ArrowDown') || input.isPressed('KeyS');
        if (up) player.vy = -PAD_SPEED;
        else if (down) player.vy = PAD_SPEED;
        else player.vy *= 0.7;
    }

    // ── AI ───────────────────────────────────────────────────
    function updateAI() {
        // AI tracks ball Y with imperfection
        const targetY = ball.y - ai.h / 2 + (Math.random() - 0.5) * ai.reaction;
        const diff = targetY - ai.y;
        const maxSpd = PAD_SPEED * 0.82; // slightly slower than player
        ai.vy = Math.max(-maxSpd, Math.min(maxSpd, diff * 0.12));
        // Ramp AI with score
        ai.reaction = Math.max(1, 6 - (playerScore + aiScore) * 0.4);
    }

    // ── BALL PHYSICS ─────────────────────────────────────────
    function updateBall() {
        if (state !== 'playing') return;

        // Speed cap
        const maxSpd = 14;
        const spd = Math.hypot(ball.vx, ball.vy);
        if (spd > maxSpd) { ball.vx *= maxSpd / spd; ball.vy *= maxSpd / spd; }

        trail.push({ x: ball.x, y: ball.y, a: 1 });
        if (trail.length > 12) trail.shift();

        ball.x += ball.vx; ball.y += ball.vy;

        // Top/bottom wall
        if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy *= -1; wallFlash = 4; audio.playSound('click'); }
        if (ball.y + ball.r >= canvas.height) { ball.y = canvas.height - ball.r; ball.vy *= -1; wallFlash = 4; audio.playSound('click'); }

        // Paddle collision helper
        function hitPaddle(pad, isPlayer) {
            if (ball.x - ball.r < pad.x + pad.w && ball.x + ball.r > pad.x &&
                ball.y - ball.r < pad.y + pad.h && ball.y + ball.r > pad.y) {
                // Reflect
                ball.vx *= -1.08; // slight speed boost each hit
                // Add spin based on paddle velocity
                ball.vy += pad.vy * 0.4;
                // Push ball out of paddle
                if (isPlayer) ball.x = pad.x + pad.w + ball.r;
                else ball.x = pad.x - ball.r;
                spawnSparks(ball.x, ball.y, isPlayer ? '#00ccff' : '#ff4488');
                audio.playSound('score');
            }
        }
        hitPaddle(player, true);
        hitPaddle(ai, false);

        // Power zone
        const pz = powerZones[0];
        if (pz && ball.x > pz.x && ball.x < pz.x + pz.w && ball.y > pz.y && ball.y < pz.y + pz.h) {
            ball.vy *= 1.12; pz.flash = 10;
        }

        // Scoring
        if (ball.x + ball.r < 0) { aiScore++; lastScorer = 'AI'; doScore(); }
        if (ball.x - ball.r > canvas.width) { playerScore++; lastScorer = 'YOU'; doScore(); }
    }

    function doScore() {
        state = 'scored'; scoredTimer = 70;
        audio.playSound('thud');
        if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) { state = 'gameover'; if (playerScore > hiScore) { hiScore = playerScore; localStorage.setItem('gz-pong-hi', hiScore); } }
    }

    function spawnSparks(x, y, col) {
        for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
            sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 22, max: 22 });
        }
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        handleInput();
        updateAI();

        // Move paddles (clamp)
        player.y = Math.max(0, Math.min(canvas.height - PAD_H, player.y + player.vy));
        ai.y = Math.max(0, Math.min(canvas.height - PAD_H, ai.y + ai.vy));

        updateBall();

        // Scored state countdown
        if (state === 'scored') {
            scoredTimer--;
            if (scoredTimer <= 0) {
                state = 'playing';
                serveBall(lastScorer === 'YOU' ? -1 : 1); // serve toward the scorer
            }
        }

        // Power zone flash decay
        if (powerZones[0]?.flash > 0) powerZones[0].flash--;
        // Wall flash decay
        if (wallFlash > 0) wallFlash--;

        // Sparks
        sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; p.a = p.life / p.max; });
        sparks = sparks.filter(p => p.life > 0);

        // BG lines drift
        bgLines.forEach(l => { l.x -= l.speed; if (l.x < -l.len) l.x = canvas.width + l.len; });

        // Trail fade
        trail.forEach((t, i) => t.a = i / trail.length);

        scoreEl.textContent = `You: ${playerScore}  AI: ${aiScore}  (First to ${WIN_SCORE})`;
    }

    // ── DRAW ─────────────────────────────────────────────────
    function draw() {
        // BG
        if (wallFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${wallFlash * 0.06})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = 'rgba(5,5,18,0.92)'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // BG speed lines
        ctx.strokeStyle = 'rgba(0,150,200,0.08)'; ctx.lineWidth = 1;
        bgLines.forEach(l => {
            ctx.beginPath(); ctx.moveTo(l.x, 0); ctx.lineTo(l.x + l.len, canvas.height * 0.1); ctx.stroke();
        });

        // Center dashed line
        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
        ctx.setLineDash([]);

        // Power zone
        const pz = powerZones[0];
        if (pz) {
            const glow = pz.flash > 0 ? 0.9 : 0.25 + 0.1 * Math.sin(Date.now() * 0.004);
            ctx.fillStyle = `rgba(255,200,0,${glow * 0.3})`; ctx.fillRect(pz.x, pz.y, pz.w, pz.h);
            ctx.strokeStyle = `rgba(255,220,0,${glow})`; ctx.lineWidth = 2;
            ctx.shadowBlur = pz.flash > 0 ? 20 : 8; ctx.shadowColor = '#ffdd00';
            ctx.strokeRect(pz.x, pz.y, pz.w, pz.h); ctx.shadowBlur = 0;
        }

        // Ball trail
        trail.forEach((t, i) => {
            ctx.globalAlpha = t.a * 0.5;
            ctx.fillStyle = '#00ccff';
            const r = ball.r * (i / trail.length) * 0.7;
            ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ball
        if (state !== 'gameover') {
            const bc = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r);
            bc.addColorStop(0, '#ffffff'); bc.addColorStop(0.6, '#00ccff'); bc.addColorStop(1, '#0044aa');
            ctx.fillStyle = bc; ctx.shadowBlur = 20; ctx.shadowColor = '#00ccff';
            ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }

        // Sparks
        sparks.forEach(p => {
            ctx.globalAlpha = p.a; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Paddles
        function drawPaddle(pad, col) {
            const g = ctx.createLinearGradient(pad.x, pad.y, pad.x + pad.w, pad.y);
            g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.shadowBlur = 16; ctx.shadowColor = col;
            ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
            ctx.shadowBlur = 0;
            // glow cap strips
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(pad.x, pad.y, pad.w, 3);
            ctx.fillRect(pad.x, pad.y + pad.h - 3, pad.w, 3);
        }
        drawPaddle(player, '#00d4ff');
        drawPaddle(ai, '#ff4488');

        // Score numbers
        ctx.font = 'bold 42px Orbitron'; ctx.textAlign = 'center'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff';
        ctx.fillText(playerScore, canvas.width / 2 - 80, 70);
        ctx.fillStyle = '#ff4488'; ctx.shadowColor = '#ff4488';
        ctx.fillText(aiScore, canvas.width / 2 + 80, 70);
        ctx.shadowBlur = 0;

        // Player / AI labels
        ctx.font = '10px Orbitron'; ctx.fillStyle = 'rgba(0,212,255,0.5)';
        ctx.fillText('YOU', canvas.width / 2 - 80, 90);
        ctx.fillStyle = 'rgba(255,68,136,0.5)';
        ctx.fillText('AI', canvas.width / 2 + 80, 90);

        // HUD strip
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
        ctx.fillStyle = 'rgba(180,200,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('[W/S or ↑↓] Move  ·  ★ Center power zone = speed boost', canvas.width / 2, canvas.height - 10);

        // Scored flash
        if (state === 'scored' && scoredTimer > 40) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = lastScorer === 'YOU' ? '#00d4ff' : '#ff4488';
            ctx.font = 'bold 32px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(`${lastScorer} SCORED!`, canvas.width / 2, canvas.height / 2);
        }

        // Game over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const win = playerScore >= WIN_SCORE;
            ctx.fillStyle = win ? '#00d4ff' : '#ff4488';
            ctx.font = 'bold 34px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(win ? '🏆 YOU WIN!' : 'AI WINS', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '16px Orbitron';
            ctx.fillText(`${playerScore} — ${aiScore}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Your Best: ${hiScore} pts`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[SPACE] to rematch', canvas.width / 2, canvas.height / 2 + 60);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() { cancelAnimationFrame(animId); }
    return { init, destroy };
})();
