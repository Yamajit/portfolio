/* GAME: Retro Bowling */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    // State
    // Phases: 0=Position Ball, 1=Aim Angle, 2=Power, 3=Rolling
    let phase = 0;

    let ball = { x: 0, y: 0, r: 12, vx: 0, vy: 0, rolling: false };
    let pins = [];
    let angle = 0;
    let angleSpeed = 0.05;
    let power = 0;
    let powerSpeed = 2;

    // Lane
    const laneX = 200;
    const laneW = 400;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-bowling-high')) || 0;

        reset();
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        phase = 0;
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 100;
        ball.vx = 0;
        ball.vy = 0;
        ball.rolling = false;

        // Setup Pins (Triangle)
        pins = [];
        const startX = canvas.width / 2;
        const startY = 100;
        const spacing = 30;

        let rows = 4;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= r; c++) {
                // Centering logic
                const x = startX - (r * spacing / 2) + (c * spacing);
                const y = startY + (r * spacing * 0.8);
                pins.push({ x, y, r: 8, active: true });
            }
        }

        playing = true;
    }

    function handleMove(e) {
        if (!playing) return;
        if (phase === 0) {
            const rect = canvas.getBoundingClientRect();
            let mx = e.clientX - rect.left;
            // Clamp to lane
            ball.x = Math.max(laneX + 20, Math.min(laneX + laneW - 20, mx));
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!playing) return;
        if (phase === 0) {
            const rect = canvas.getBoundingClientRect();
            let mx = e.touches[0].clientX - rect.left;
            ball.x = Math.max(laneX + 20, Math.min(laneX + laneW - 20, mx));
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        handleClick(e);
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        if (input.isPressed('Space') || input.isPressed('A-Button')) {
            if (!actionPressed) {
                if (phase === 0) phase = 1;
                else if (phase === 1) phase = 2;
                else if (phase === 2) shoot();
                actionPressed = true;
            }
        } else {
            actionPressed = false;
        }
    }

    let actionPressed = false;

    function shoot() {
        phase = 3;
        ball.rolling = true;
        // Calculate velocity
        // Angle is oscillating between -45 and 45
        // Power is 0-100
        const speed = 10 + (power / 100) * 15;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        audio.playSound('shoot');
    }

    function update() {
        handleInput();
        if (!playing) return;

        if (phase === 1) {
            angle += angleSpeed;
            if (angle > 0.5 || angle < -0.5) angleSpeed *= -1;
        } else if (phase === 2) {
            power += powerSpeed;
            if (power > 100 || power < 0) powerSpeed *= -1;
        } else if (phase === 3 && ball.rolling) {
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall bounce
            if (ball.x < laneX || ball.x > laneX + laneW) {
                ball.vx *= -0.5;
                ball.x = Math.max(laneX, Math.min(laneX + laneW, ball.x));
                audio.playSound('bounce');
            }

            // Pin Collision
            pins.forEach(p => {
                if (!p.active) return;
                const dx = ball.x - p.x;
                const dy = ball.y - p.y;
                if (dx * dx + dy * dy < (ball.r + p.r) * (ball.r + p.r)) {
                    p.active = false;
                    score += 10;
                    audio.playSound('bounce');
                    // Minor deflection
                    ball.vx *= 0.95;
                    ball.vx += (Math.random() - 0.5) * 2;
                }
            });

            // End of lane
            if (ball.y < 50 || Math.abs(ball.vy) < 0.5) {
                // Round over
                setTimeout(() => {
                    if (playing) {
                        // Next throw?
                        reset(); // For simplicity, endless mode = reset pins
                    }
                }, 2000);
                ball.rolling = false;
            }
        }

        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function draw() {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Lane
        ctx.fillStyle = '#fcd34d'; // Wood color-ish
        ctx.fillRect(laneX, 0, laneW, canvas.height);
        // Gutters
        ctx.fillStyle = '#000';
        ctx.fillRect(laneX - 20, 0, 20, canvas.height);
        ctx.fillRect(laneX + laneW, 0, 20, canvas.height);

        // Pins
        pins.forEach(p => {
            if (p.active) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // Ball
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ball.x - 3, ball.y - 3, 2, 0, Math.PI * 2); // Shine
        ctx.fill();

        // Aiming UI
        if (phase === 1) {
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(ball.x + Math.sin(angle) * 100, ball.y - Math.cos(angle) * 100);
            ctx.stroke();
        }
        if (phase === 2) {
            // Power bar
            ctx.fillStyle = '#333';
            ctx.fillRect(ball.x + 20, ball.y - 50, 10, 50);
            ctx.fillStyle = '#ef4444';
            const h = (power / 100) * 50;
            ctx.fillRect(ball.x + 20, ball.y - h, 10, h);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
    }

    return { init, destroy };
})();
