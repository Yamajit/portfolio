/* GAME: Penalty Striker (Soccer) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    let ball = { x: 0, y: 0, r: 15, z: 0, vx: 0, vy: 0, vz: 0, state: 'idle' };
    let keeper = { x: 0, y: 0, w: 60, h: 90, dx: 2 };
    let goal = { x: 0, y: 150, w: 300, h: 120 };

    // 0 = Aim Horiz, 1 = Aim Vert, 2 = Shoot
    let phase = 0;
    let aimX = 0;
    let aimY = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-soccer-high')) || 0;

        reset();
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        phase = 0;
        canvas.width = window.innerWidth; // ensure size
        goal.x = canvas.width / 2 - 150;
        keeper.x = canvas.width / 2 - 30;
        keeper.y = goal.y + 30;
        resetBall();
        playing = true;
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 100;
        ball.r = 15;
        ball.z = 0;
        ball.state = 'idle';
        phase = 0;
    }

    function handleTouchStart(e) {
        e.preventDefault();
        handleClick({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
        });
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        if (input.isPressed('Space') || input.isPressed('A-Button')) {
            if (!shootPressed && ball.state === 'idle') {
                // Shoot straight ahead in this mode
                const tx = ball.x;
                const ty = goal.y + 40;
                const framesToHit = 40;
                ball.vx = (tx - ball.x) / framesToHit;
                ball.vy = (ty - ball.y) / framesToHit;
                ball.vz = 1;
                ball.state = 'shot';
                audio.playSound('shoot');
                shootPressed = true;
            }
        } else {
            shootPressed = false;
        }
    }

    let shootPressed = false;

    function update() {
        handleInput();
        if (!playing) return;

        // Keeper Move
        keeper.x += keeper.dx;
        if (keeper.x < goal.x || keeper.x + keeper.w > goal.x + goal.w) keeper.dx *= -1;

        if (ball.state === 'shot') {
            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.r *= 0.98; // shrink as it goes away
            ball.z += 1;

            if (ball.z > 40) { // Reached Goal Plane
                // Check Keeper Collision
                if (ball.x > keeper.x && ball.x < keeper.x + keeper.w &&
                    ball.y > keeper.y && ball.y < keeper.y + keeper.h) {
                    // SAVE!
                    audio.playSound('thud'); // thud
                    gameOver(); // Miss = Game Over
                } else if (ball.x > goal.x && ball.x < goal.x + goal.w &&
                    ball.y > goal.y && ball.y < goal.y + goal.h) {
                    // GOAL!
                    score++;
                    audio.playSound('score');
                    resetBall();
                    // Keeper gets faster
                    keeper.dx *= 1.1;
                } else {
                    // Missed goal
                    gameOver();
                }
            }
        }
        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function draw() {
        // Field
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Goal
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 10;
        ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
        // Net
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
        ctx.globalAlpha = 1.0;

        // Keeper
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(keeper.x, keeper.y, keeper.w, keeper.h);

        // Ball
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Click to Play Again", canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-soccer-high', highScore);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('touchstart', handleTouchStart);
    }

    return { init, destroy };
})();
