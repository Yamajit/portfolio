/* ============================================================
   GAME: Color Road — Switch lanes to match your ball's color!
   Tap/Space to switch lane. Match the lane color to survive.
   Controls: Space / Click / Tap
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio;
    let animId;

    const COLORS = ['#ff4d6d', '#00d4ff', '#00ff88', '#ffe066', '#cc00ff'];
    const LABELS = ['RED', 'CYAN', 'GREEN', 'GOLD', 'PURPLE'];
    const LANE_COUNT = 4;
    let laneW, lanes;
    let ball, obstacles, particles, score, hiScore, lives, frame, state;
    let speed, spawnTimer, spawnInterval;

    function randColor() { return Math.floor(Math.random() * COLORS.length); }

    function reset() {
        laneW = canvas.width / LANE_COUNT;
        ball = { lane: 1, colorIdx: randColor(), y: canvas.height * 0.75, r: 18, switching: 0 };
        obstacles = []; particles = []; score = 0; lives = 3;
        frame = 0; speed = 3.2; spawnTimer = 0; spawnInterval = 80;
        state = 'playing';
        hiScore = parseInt(localStorage.getItem('gz-colorroad-hi') || '0');
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const colorIdx = randColor();
        obstacles.push({ lane, colorIdx, y: -40, h: 34, w: laneW * 0.72 });
    }

    function burst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 30, max: 30 });
        }
    }

    function init(c, s, a) {
        canvas = c; scoreEl = s; audio = a;
        ctx = canvas.getContext('2d');
        reset();

        canvas._crClick = () => switchLane();
        canvas.addEventListener('click', canvas._crClick);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); switchLane(); }, { passive: false });

        document.addEventListener('keydown', canvas._crKey = e => {
            if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); switchLane(); }
        });

        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function switchLane() {
        if (window.gamePaused) return;
        if (state === 'gameover') { reset(); return; }
        ball.lane = (ball.lane + 1) % LANE_COUNT;
        audio.playSound('click');
    }

    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') return;
        frame++;
        speed = Math.min(9, 3.2 + score * 0.008);
        spawnInterval = Math.max(36, 80 - Math.floor(score / 50) * 4);

        spawnTimer++;
        if (spawnTimer >= spawnInterval) { spawnObstacle(); spawnTimer = 0; }

        const bx = (ball.lane + 0.5) * laneW;

        obstacles.forEach(ob => { ob.y += speed; });

        // Collision
        obstacles.forEach(ob => {
            if (ob.hit) return;
            const ox = (ob.lane + 0.5) * laneW;
            if (ob.y + ob.h / 2 > ball.y - ball.r && ob.y - ob.h / 2 < ball.y + ball.r && ob.lane === ball.lane) {
                ob.hit = true;
                if (ob.colorIdx !== ball.colorIdx) {
                    lives--;
                    burst(bx, ball.y, '#ff4d6d', 14);
                    audio.playSound('thud');
                    if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-colorroad-hi', hiScore); } }
                } else {
                    score += 10;
                    burst(ox, ob.y, COLORS[ob.colorIdx], 10);
                    audio.playSound('score');
                }
            }
        });

        obstacles = obstacles.filter(ob => ob.y < canvas.height + 60);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  ❤️ ${lives}`;
    }

    function draw() {
        const t = Date.now();
        ctx.fillStyle = '#050514'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Lane dividers
        for (let i = 0; i <= LANE_COUNT; i++) {
            ctx.strokeStyle = 'rgba(80,80,140,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([8, 12]);
            ctx.beginPath(); ctx.moveTo(i * laneW, 0); ctx.lineTo(i * laneW, canvas.height); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Obstacles
        obstacles.forEach(ob => {
            const ox = (ob.lane + 0.5) * laneW;
            const col = COLORS[ob.colorIdx];
            ctx.fillStyle = col + 'cc';
            ctx.shadowBlur = 12; ctx.shadowColor = col;
            ctx.beginPath();
            ctx.roundRect(ox - ob.w / 2, ob.y - ob.h / 2, ob.w, ob.h, 8);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Label
            ctx.fillStyle = '#000'; ctx.font = 'bold 11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(LABELS[ob.colorIdx], ox, ob.y);
        });

        // Ball
        const bx = (ball.lane + 0.5) * laneW;
        const col = COLORS[ball.colorIdx];
        const gr = ctx.createRadialGradient(bx - ball.r * 0.3, ball.y - ball.r * 0.3, 0, bx, ball.y, ball.r);
        gr.addColorStop(0, 'rgba(255,255,255,0.5)');
        gr.addColorStop(0.5, col + 'dd');
        gr.addColorStop(1, col + '88');
        ctx.fillStyle = gr; ctx.shadowBlur = 20; ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(bx, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Ball color label
        ctx.fillStyle = '#000'; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(LABELS[ball.colorIdx].slice(0, 3), bx, ball.y);

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Lives
        ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (let i = 0; i < 3; i++) ctx.fillText(i < lives ? '❤️' : '🖤', 10 + i * 26, 8);

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Space / Tap to switch lane  ·  Match ball color to block color!', canvas.width / 2, canvas.height - 10);

        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 30px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('WRONG COLOR!', canvas.width / 2, canvas.height / 2 - 36);
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
        if (canvas._crClick) canvas.removeEventListener('click', canvas._crClick);
        if (canvas._crKey) document.removeEventListener('keydown', canvas._crKey);
    }
    return { init, destroy };
})();
