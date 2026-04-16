/* ============================================================
   BRICK BREAKER — Classic Breakout / Brick-Breaker game
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl, audioRef, inputSys;
    let animId = null;
    let running = false;

    // State
    let score = 0;
    let lives = 3;
    let level = 1;
    let dead = false;
    let won = false;
    let ballLaunched = false;
    let flashTimer = 0;

    // Paddle
    let px, py, pw, ph;
    const PADDLE_SPEED = 6;

    // Ball
    let bx, by, bdx, bdy;
    const BALL_R = 8;
    const BALL_SPEED_BASE = 4;
    let ballSpeed;

    // Bricks
    const COLS = 10;
    const ROWS = 6;
    let bricks = [];
    let brickW, brickH;
    const BRICK_PAD = 4;

    // Power-ups
    let powerUps = [];
    let wideActive = false;
    let wideTimer = 0;
    let multiBalls = [];    // extra balls

    const COLORS = [
        ['#ff4d6d', '#ff0040'],
        ['#ff9900', '#cc6600'],
        ['#ffe066', '#ccaa00'],
        ['#00ff88', '#00aa55'],
        ['#00d4ff', '#0088cc'],
        ['#cc00ff', '#8800aa']
    ];

    function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    function initLayout() {
        pw = 100 + (canvas.width - 400) * 0.1;
        ph = 12;
        px = canvas.width / 2 - pw / 2;
        py = canvas.height - 50;

        brickW = (canvas.width - 40) / COLS;
        brickH = 22;
        bricks = [];
        const levelRows = Math.min(ROWS, 3 + level);
        for (let r = 0; r < levelRows; r++) {
            for (let c = 0; c < COLS; c++) {
                let hits = 1;
                if (level > 2 && (r + c) % 4 === 0) hits = 2;
                bricks.push({
                    x: 20 + c * brickW,
                    y: 60 + r * (brickH + BRICK_PAD),
                    w: brickW - BRICK_PAD,
                    h: brickH,
                    hits,
                    maxHits: hits,
                    colIdx: r % COLORS.length,
                    alive: true
                });
            }
        }
    }

    function resetBall() {
        bx = canvas.width / 2;
        by = py - BALL_R - 5;
        const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.8;
        ballSpeed = BALL_SPEED_BASE + level * 0.3;
        bdx = Math.cos(angle) * ballSpeed;
        bdy = Math.sin(angle) * ballSpeed;
        ballLaunched = false;
        multiBalls = [];
    }

    function drawBg() {
        ctx.fillStyle = '#060614';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // subtle grid
        ctx.strokeStyle = 'rgba(0,100,200,0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }

    function drawPaddle() {
        const w = wideActive ? pw * 1.6 : pw;
        const pxc = px + pw / 2 - w / 2;
        const grd = ctx.createLinearGradient(pxc, py, pxc + w, py + ph);
        grd.addColorStop(0, '#00d4ff');
        grd.addColorStop(0.5, '#ffffff');
        grd.addColorStop(1, '#00d4ff');
        ctx.beginPath();
        ctx.roundRect(pxc, py, w, ph, 6);
        ctx.fillStyle = grd;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawBall(x, y) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, BALL_R);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.5, '#00d4ff');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawBricks() {
        for (const br of bricks) {
            if (!br.alive) continue;
            const [fill, dark] = COLORS[br.colIdx];
            const dimmed = br.hits < br.maxHits;
            const grd = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
            grd.addColorStop(0, dimmed ? 'rgba(80,80,80,0.7)' : fill);
            grd.addColorStop(1, dimmed ? 'rgba(50,50,50,0.7)' : dark);
            ctx.beginPath();
            ctx.roundRect(br.x, br.y, br.w, br.h, 4);
            ctx.fillStyle = grd;
            ctx.shadowColor = dimmed ? 'transparent' : fill;
            ctx.shadowBlur = dimmed ? 0 : 8;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Tough brick: draw a star icon
            if (br.maxHits > 1) {
                ctx.font = '11px monospace';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', br.x + br.w / 2, br.y + br.h / 2);
            }
        }
        ctx.textBaseline = 'alphabetic';
    }

    function drawPowerUps() {
        for (const pu of powerUps) {
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = pu.type === 'wide' ? '#00ff88' : '#ffaa00';
            ctx.shadowColor = pu.type === 'wide' ? '#00ff88' : '#ffaa00';
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pu.type === 'wide' ? 'W' : '×2', pu.x, pu.y);
            ctx.shadowBlur = 0;
            ctx.textBaseline = 'alphabetic';
        }
    }

    function drawHUD() {
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff4d6d';
        ctx.fillText('❤️'.repeat(lives), 12, 26);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(`LEVEL ${level}`, canvas.width / 2, 26);

        if (!ballLaunched) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '12px Orbitron, monospace';
            ctx.fillText('Press SPACE or click to launch ball!', canvas.width / 2, canvas.height / 2 + 80);
        }

        if (flashTimer > 0) {
            const a = Math.min(flashTimer / 20, 0.4);
            ctx.fillStyle = `rgba(255,50,50,${a})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function rectBallCollide(rx, ry, rw, rh, bxp, byp, ballR) {
        const nearX = Math.max(rx, Math.min(bxp, rx + rw));
        const nearY = Math.max(ry, Math.min(byp, ry + rh));
        const dist = Math.hypot(bxp - nearX, byp - nearY);
        return dist < ballR;
    }

    function reflectBall(rx, ry, rw, rh, bxp, byp, bxd, byd) {
        // Determine collision side
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;
        const dx = bxp - cx;
        const dy = byp - cy;
        // More horizontal overlap vs vertical overlap
        const overX = rw / 2 + BALL_R - Math.abs(dx);
        const overY = rh / 2 + BALL_R - Math.abs(dy);
        if (overX < overY) {
            return [-bxd, byd];
        } else {
            return [bxd, -byd];
        }
    }

    function updateBallPhysics(x, y, dx, dy) {
        let nx = x + dx;
        let ny = y + dy;

        // Walls
        if (nx - BALL_R < 0) { nx = BALL_R; dx = -dx; }
        if (nx + BALL_R > canvas.width) { nx = canvas.width - BALL_R; dx = -dx; }
        if (ny - BALL_R < 0) { ny = BALL_R; dy = -dy; }

        // Paddle
        const paddleW = wideActive ? pw * 1.6 : pw;
        const pxc = px + pw / 2 - paddleW / 2;
        if (rectBallCollide(pxc, py, paddleW, ph, nx, ny, BALL_R)) {
            const relX = (nx - (pxc + paddleW / 2)) / (paddleW / 2);
            const angle = relX * 1.2 - Math.PI / 2;
            const spd = Math.hypot(dx, dy);
            dx = Math.cos(angle) * spd;
            dy = Math.sin(angle) * Math.abs(Math.sin(angle)) < 0.1 ? -spd * 0.99 : -Math.abs(dy);
            ny = py - BALL_R - 1;
        }

        // Bricks
        for (const br of bricks) {
            if (!br.alive) continue;
            if (rectBallCollide(br.x, br.y, br.w, br.h, nx, ny, BALL_R)) {
                [dx, dy] = reflectBall(br.x, br.y, br.w, br.h, nx, ny, dx, dy);
                br.hits--;
                if (br.hits <= 0) {
                    br.alive = false;
                    score += 10 * level;
                    if (scoreEl) scoreEl.textContent = 'Score: ' + score;
                    // Chance to drop power-up
                    if (Math.random() < 0.15) {
                        powerUps.push({
                            x: br.x + br.w / 2, y: br.y,
                            type: Math.random() < 0.5 ? 'wide' : 'multi',
                            dy: 2
                        });
                    }
                }
                break;
            }
        }

        return { nx, ny, dx, dy };
    }

    function update() {
        if (dead || won) { if (flashTimer > 0) flashTimer--; return; }

        // Paddle movement
        const LEFT = inputSys.isPressed('ArrowLeft') || inputSys.isPressed('KeyA');
        const RIGHT = inputSys.isPressed('ArrowRight') || inputSys.isPressed('KeyD');
        if (LEFT) px = Math.max(0, px - PADDLE_SPEED);
        if (RIGHT) px = Math.min(canvas.width - pw, px + PADDLE_SPEED);
        if (flashTimer > 0) flashTimer--;

        // Wide power-up timer
        if (wideActive) { wideTimer--; if (wideTimer <= 0) wideActive = false; }

        // Wait for launch
        if (!ballLaunched) {
            bx = px + pw / 2;
            by = py - BALL_R - 5;
            return;
        }

        // Move main ball
        const res = updateBallPhysics(bx, by, bdx, bdy);
        bx = res.nx; by = res.ny; bdx = res.dx; bdy = res.dy;

        // Extra balls
        multiBalls = multiBalls.map(mb => {
            const mr = updateBallPhysics(mb.x, mb.y, mb.dx, mb.dy);
            return { x: mr.nx, y: mr.ny, dx: mr.dx, dy: mr.dy };
        });

        // Ball falls off
        if (by > canvas.height + 20) {
            lives--;
            flashTimer = 25;
            if (lives <= 0) {
                dead = true;
                window.gamePaused = true;
                setTimeout(() => {
                    const ov = document.getElementById('game-ui-overlay');
                    if (ov) {
                        document.getElementById('overlay-title').textContent = 'GAME OVER';
                        document.getElementById('overlay-message').textContent = `Score: ${score} | Level: ${level}`;
                        ov.classList.remove('hidden');
                    }
                }, 600);
                return;
            }
            resetBall();
        }

        // Check level clear
        if (bricks.every(b => !b.alive)) {
            level++;
            score += level * 100;
            initLayout();
            resetBall();
        }

        // Power-ups
        const puToRemove = [];
        for (let i = 0; i < powerUps.length; i++) {
            const pu = powerUps[i];
            pu.y += pu.dy;
            const paddleW = wideActive ? pw * 1.6 : pw;
            const pxc = px + pw / 2 - paddleW / 2;
            // Catch
            if (pu.y + 10 > py && pu.y < py + ph && pu.x > pxc && pu.x < pxc + paddleW) {
                if (pu.type === 'wide') { wideActive = true; wideTimer = 300; }
                else {
                    // Multi-ball
                    multiBalls.push({ x: bx, y: by, dx: -bdx, dy: bdy });
                }
                puToRemove.push(i);
            }
            if (pu.y > canvas.height + 20) puToRemove.push(i);
        }
        for (let i = puToRemove.length - 1; i >= 0; i--) powerUps.splice(puToRemove[i], 1);
    }

    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg();
        drawBricks();
        drawPowerUps();
        drawPaddle();
        drawBall(bx, by);
        for (const mb of multiBalls) drawBall(mb.x, mb.y);
        drawHUD();
        animId = requestAnimationFrame(loop);
    }

    function setupInput() {
        // Launch on space/click
        const launchHandler = () => { if (!ballLaunched) ballLaunched = true; };
        canvas.addEventListener('click', launchHandler);
        window.__bbLaunch = launchHandler;

        // Mouse move paddle
        const mouseHandler = e => {
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            px = mx - pw / 2;
            px = Math.max(0, Math.min(canvas.width - pw, px));
        };
        canvas.addEventListener('mousemove', mouseHandler);
        window.__bbMouse = mouseHandler;

        // Touch
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
            px = mx - pw / 2;
            px = Math.max(0, Math.min(canvas.width - pw, px));
        }, { passive: false });
        canvas.addEventListener('touchstart', launchHandler, { passive: true });

        // Space key
        const keyHandler = e => { if (e.code === 'Space') launchHandler(); };
        window.addEventListener('keydown', keyHandler);
        window.__bbKey = keyHandler;
    }

    return {
        init(c, s, audio, inp) {
            canvas = c; scoreEl = s; audioRef = audio; inputSys = inp;
            ctx = canvas.getContext('2d');
            score = 0; lives = 3; level = 1;
            dead = false; won = false; wideActive = false; wideTimer = 0;
            powerUps = []; multiBalls = [];
            running = true;
            initLayout();
            resetBall();
            setupInput();
            loop();
        },
        destroy() {
            running = false;
            if (animId) cancelAnimationFrame(animId);
            animId = null;
            if (window.__bbLaunch) canvas.removeEventListener('click', window.__bbLaunch);
            if (window.__bbMouse) canvas.removeEventListener('mousemove', window.__bbMouse);
            if (window.__bbKey) window.removeEventListener('keydown', window.__bbKey);
        }
    };
})();
