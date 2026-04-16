/* GAME: Neon Hoops (Basketball) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    // Physics
    const gravity = 0.5;
    let ball = { x: 100, y: 300, r: 15, vx: 0, vy: 0, active: false };
    let hoop = { x: 600, y: 200, r: 25, scored: false };

    // Input
    let dragStart = null;
    let dragEnd = null;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-hoops-high')) || 0;

        reset();
        canvas.addEventListener('mousedown', handleDown);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('mouseup', handleUp);
        // Touch
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        resetBall();
        moveHoop();
        playing = true;
    }

    function resetBall() {
        ball.x = 100;
        ball.y = canvas.height - 100;
        ball.vx = 0;
        ball.vy = 0;
        ball.active = false;
        dragStart = null;
        hoop.scored = false;
    }

    function moveHoop() {
        hoop.x = 400 + Math.random() * (canvas.width - 500);
        hoop.y = 100 + Math.random() * 200;
    }

    function handleDown(e) {
        if (!playing) {
            reset();
            return;
        }
        if (ball.active) return;
        const rect = canvas.getBoundingClientRect();
        dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        dragEnd = dragStart;
    }

    function handleMove(e) {
        if (!dragStart) return;
        const rect = canvas.getBoundingClientRect();
        dragEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        dragStart = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        dragEnd = dragStart;
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!dragStart) return;
        const rect = canvas.getBoundingClientRect();
        dragEnd = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }

    function handleTouchEnd(e) {
        handleUp(e);
    }

    function handleUp(e) {
        if (!dragStart) return;
        // Launch!
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;

        ball.vx = dx * 0.15;
        ball.vy = dy * 0.15;
        ball.active = true;
        dragStart = null;
        audio.playSound('shoot');
    }

    function update() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        if (ball.active) {
            ball.vy += gravity;
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Bounds bounce
            if (ball.x < ball.r || ball.x > canvas.width - ball.r) {
                ball.vx *= -0.7;
                ball.x = ball.x < ball.r ? ball.r : canvas.width - ball.r;
                audio.playSound('bounce'); // bounce sound
            }
            if (ball.y > canvas.height - ball.r) {
                ball.vy *= -0.6;
                ball.y = canvas.height - ball.r;
                ball.vx *= 0.95; // friction
                if (Math.abs(ball.vy) < 1) {
                    // Stopped
                    if (!hoop.scored) {
                        gameOver();
                    } else {
                        resetBall();
                        moveHoop();
                    }
                }
            }

            // Goal Logic
            // Simple: distance to hoop center < hoop radius + heavy overlap
            const dx = ball.x - hoop.x;
            const dy = ball.y - hoop.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < hoop.r && ball.vy > 0 && !hoop.scored) {
                // Swish!
                score++;
                hoop.scored = true;
                audio.playSound('score');
                createParticles(hoop.x, hoop.y);
            }
        }
        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    let particles = [];
    function createParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color: '#fff'
            });
        }
    }

    function draw() {
        // Court
        ctx.fillStyle = '#1e1b4b'; // Deep blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Floor
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

        // Hoop (Backboard + Rim)
        ctx.fillStyle = '#fff';
        ctx.fillRect(hoop.x - 5, hoop.y - 40, 10, 40); // stand
        ctx.fillRect(hoop.x - 20, hoop.y - 40, 40, 5); // backboard

        ctx.beginPath();
        ctx.arc(hoop.x, hoop.y, hoop.r, 0, Math.PI, false); // Rim front
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Ball
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        // Lines on ball
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Trajectory Line
        if (dragStart) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(ball.x + (dragStart.x - dragEnd.x), ball.y + (dragStart.y - dragEnd.y));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Particles
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            ctx.fillStyle = `rgba(255,255,255,${p.life})`;
            ctx.fillRect(p.x, p.y, 3, 3);
            if (p.life <= 0) particles.splice(i, 1);
        });

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Click to Restart", canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-hoops-high', highScore);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        canvas.removeEventListener('mousedown', handleDown);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseup', handleUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
    }

    return { init, destroy };
})();
