/* ============================================================
   GAME: Sky Dash — Endless Runner
   Jump over obstacles, collect coins, survive as long as you can!
   Controls: SPACE / Up arrow / Click = Jump (double jump allowed)
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    // World / player state
    let player, obstacles, coins, particles, bgLayers;
    let score, hiScore, speed, frame, dead, deadTimer;
    let jumpLock = false;
    let jumpsLeft; // double jump
    let groundY;

    const PLAYER_W = 28, PLAYER_H = 36;
    const GRAVITY = 0.55;
    const JUMP_VEL = -13;
    const BASE_SPD = 4.5;
    const COLORS = ['#ff4d6d', '#ffaa00', '#00d4ff', '#00ff88', '#cc00ff', '#ffe066'];

    function reset() {
        groundY = canvas.height - 60;
        player = { x: 90, y: groundY - PLAYER_H, vy: 0, onGround: true, color: '#00ffcc', squash: 0 };
        obstacles = []; coins = []; particles = [];
        score = 0; speed = BASE_SPD; frame = 0;
        dead = false; deadTimer = 0; jumpsLeft = 2;
        jumpLock = false;

        // Parallax bg layers
        bgLayers = [
            { stars: Array.from({ length: 60 }, () => ({ x: Math.random() * 2000, y: Math.random() * canvas.height * 0.7, r: Math.random() * 1.5 + 0.5, spd: 0.3 })) },
            { stars: Array.from({ length: 30 }, () => ({ x: Math.random() * 2000, y: Math.random() * canvas.height * 0.7, r: Math.random() * 2 + 1, spd: 0.7 })) },
        ];
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        hiScore = parseInt(localStorage.getItem('gz-skydash-hi') || '0');
        canvas._sdClick = () => tryJump();
        canvas.addEventListener('click', canvas._sdClick);
        canvas.addEventListener('touchstart', canvas._sdClick, { passive: true });
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    let spaceWas = false;
    function handleInput() {
        if (window.gamePaused) return;
        if (dead) {
            if (input.isPressed('Space') && !spaceWas) { spaceWas = true; reset(); }
            if (!input.isPressed('Space')) spaceWas = false;
            return;
        }
        const spaceNow = input.isPressed('Space') || input.isPressed('ArrowUp');
        if (spaceNow && !spaceWas) { spaceWas = true; tryJump(); }
        if (!spaceNow) spaceWas = false;
    }

    function tryJump() {
        if (dead) { reset(); return; }
        if (jumpsLeft > 0) {
            player.vy = player.onGround ? JUMP_VEL : JUMP_VEL * 0.85;
            player.onGround = false;
            jumpsLeft--;
            player.squash = -8;
            spawnBurst(player.x + PLAYER_W / 2, player.y + PLAYER_H, '#00ffcc', 8);
            audio.playSound('click');
        }
    }

    function spawnBurst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, col, life: 28, max: 28 });
        }
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        handleInput();
        if (dead) { deadTimer++; return; }
        frame++;

        // Ramp speed
        speed = BASE_SPD + score * 0.003;

        // Player physics
        player.vy += GRAVITY;
        player.y += player.vy;
        player.squash *= 0.85;
        if (player.y >= groundY - PLAYER_H) {
            player.y = groundY - PLAYER_H;
            player.vy = 0;
            player.onGround = true;
            jumpsLeft = 2;
        } else {
            player.onGround = false;
        }

        // Spawn obstacles
        if (frame % Math.max(55, 90 - Math.floor(score / 80)) === 0) {
            const h = 30 + Math.floor(Math.random() * 55);
            const type = Math.random() < 0.35 ? 'tall' : 'wide';
            obstacles.push({
                x: canvas.width + 20,
                y: groundY - h,
                w: type === 'wide' ? 60 : 22,
                h,
                col: COLORS[Math.floor(Math.random() * COLORS.length)],
                type
            });
        }

        // Spawn coins
        if (frame % 38 === 0 && Math.random() < 0.65) {
            const gy = groundY - 50 - Math.random() * 120;
            coins.push({ x: canvas.width + 10, y: gy, r: 10, col: '#ffe066', life: 1 });
        }

        // Move obstacles
        obstacles.forEach(o => o.x -= speed);
        obstacles = obstacles.filter(o => o.x > -120);

        // Move coins
        coins.forEach(c => c.x -= speed);
        coins = coins.filter(c => c.x > -40);

        // Move parallax stars
        bgLayers.forEach(layer => layer.stars.forEach(s => {
            s.x -= s.spd * speed * 0.3;
            if (s.x < 0) s.x += canvas.width + 20;
        }));

        // Score — time-based
        score += 0.08;

        // Collect coins
        coins = coins.filter(c => {
            const inX = Math.abs(player.x + PLAYER_W / 2 - c.x) < PLAYER_W / 2 + c.r;
            const inY = Math.abs(player.y + PLAYER_H / 2 - c.y) < PLAYER_H / 2 + c.r;
            if (inX && inY) {
                score += 25;
                spawnBurst(c.x, c.y, '#ffe066', 10);
                audio.playSound('score');
                return false;
            }
            return true;
        });

        // Collision with obstacle (lenient hitbox)
        for (const o of obstacles) {
            const margin = 6;
            if (player.x + PLAYER_W - margin > o.x + margin &&
                player.x + margin < o.x + o.w - margin &&
                player.y + PLAYER_H - margin > o.y + margin) {
                dead = true;
                deadTimer = 0;
                if (Math.floor(score) > hiScore) { hiScore = Math.floor(score); localStorage.setItem('gz-skydash-hi', hiScore); }
                spawnBurst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#ff4455', 22);
                audio.playSound('thud');
                break;
            }
        }

        // Particles
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${Math.floor(score)}  Best: ${hiScore}`;
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#05050f'); sky.addColorStop(1, '#0a1030');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars (parallax)
        bgLayers.forEach((layer, li) => {
            layer.stars.forEach(s => {
                ctx.fillStyle = `rgba(255,255,255,${0.3 + li * 0.3})`;
                ctx.beginPath(); ctx.arc(s.x % canvas.width, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            });
        });

        // Ground
        const gg = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        gg.addColorStop(0, '#1a1a3a'); gg.addColorStop(1, '#0a0a1e');
        ctx.fillStyle = gg; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = '#00ffcc';
        ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
        ctx.shadowBlur = 0;

        // Obstacles
        obstacles.forEach(o => {
            const g = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
            g.addColorStop(0, o.col); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.shadowBlur = 12; ctx.shadowColor = o.col;
            ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, [6, 6, 0, 0]); ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Coins
        coins.forEach(c => {
            const pulse = 0.7 + 0.3 * Math.sin(t * 0.008 + c.x);
            ctx.fillStyle = c.col; ctx.shadowBlur = 12 * pulse; ctx.shadowColor = c.col;
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#a06000'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('$', c.x, c.y);
        });

        // Player (little square robot)
        if (!dead || Math.floor(deadTimer / 6) % 2 === 0) {
            const px = player.x, py = player.y + player.squash;
            const pw = PLAYER_W, ph = PLAYER_H - player.squash;
            // Body
            ctx.fillStyle = player.color; ctx.shadowBlur = 16; ctx.shadowColor = player.color;
            ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.fill();
            ctx.shadowBlur = 0;
            // Eyes
            ctx.fillStyle = '#07070f';
            ctx.fillRect(px + 6, py + 8, 7, 7);
            ctx.fillRect(px + pw - 13, py + 8, 7, 7);
            // Pupils
            ctx.fillStyle = '#fff';
            ctx.fillRect(px + 8, py + 10, 3, 3);
            ctx.fillRect(px + pw - 11, py + 10, 3, 3);
            // Legs (animated)
            const legAnim = Math.sin(frame * 0.4) * 5;
            ctx.fillStyle = '#009966';
            ctx.fillRect(px + 4, py + ph, 8, 8 + legAnim);
            ctx.fillRect(px + pw - 12, py + ph, 8, 8 - legAnim);
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Jump indicator
        if (!dead && !player.onGround && jumpsLeft > 0) {
            ctx.fillStyle = 'rgba(0,255,200,0.5)';
            ctx.font = '12px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('↑ JUMP!', player.x + PLAYER_W / 2, player.y - 8);
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('SPACE / ↑ = Jump (Double Jump allowed!)  ·  Collect 🟡 coins for bonus points', canvas.width / 2, canvas.height - 10);

        // Game over
        if (dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4455'; ctx.font = 'bold 34px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💥 CRASHED!', canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[SPACE] or [CLICK] to run again!', canvas.width / 2, canvas.height / 2 + 62);
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
        if (canvas._sdClick) {
            canvas.removeEventListener('click', canvas._sdClick);
            canvas.removeEventListener('touchstart', canvas._sdClick);
        }
    }
    return { init, destroy };
})();
