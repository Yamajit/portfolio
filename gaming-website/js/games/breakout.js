/* GAME: Breakout (Arcade) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let lives = 3;

    // Paddle
    const paddle = { x: 0, y: 0, w: 100, h: 15, dx: 0, speed: 8, color: '#06b6d4' };

    // Ball
    const ball = { x: 0, y: 0, r: 8, dx: 0, dy: 0, speed: 5, active: false };

    // Bricks
    let bricks = [];
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickPadding = 10;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 35;
    let brickWidth = 75;
    let brickHeight = 20;

    // Input
    let rightPressed = false;
    let leftPressed = false;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-breakout-high')) || 0;

        reset();
        document.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
        canvas.addEventListener('touchstart', touchStartHandler, { passive: false });

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        lives = 3;
        // Responsive brick sizing
        brickWidth = (canvas.width - (brickOffsetLeft * 2) - (brickPadding * (brickColumnCount - 1))) / brickColumnCount;

        createBricks();
        resetBall();
        paddle.x = (canvas.width - paddle.w) / 2;
        paddle.y = canvas.height - 30;
        playing = true;
    }

    function createBricks() {
        bricks = [];
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                // Colors based on row
                const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
                bricks[c][r] = { x: 0, y: 0, status: 1, color: colors[r] };
            }
        }
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 50;
        ball.dx = 4 * (Math.random() < 0.5 ? 1 : -1);
        ball.dy = -4;
        ball.active = false; // waiting for launch
    }

    function keyDownHandler(e) {
        if (e.code === 'ArrowRight') rightPressed = true;
        else if (e.code === 'ArrowLeft') leftPressed = true;
        else if (e.code === 'Space') {
            if (!playing) reset();
            else if (!ball.active) ball.active = true;
        }
    }

    function keyUpHandler(e) {
        if (e.code === 'ArrowRight') rightPressed = false;
        else if (e.code === 'ArrowLeft') leftPressed = false;
    }

    function mouseMoveHandler(e) {
        const relativeX = e.clientX - canvas.offsetLeft; // Simplistic
        // Better:
        const rect = canvas.getBoundingClientRect();
        const rx = e.clientX - rect.left;
        if (rx > 0 && rx < canvas.width) {
            paddle.x = rx - paddle.w / 2;
        }
    }

    function touchMoveHandler(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const rx = e.touches[0].clientX - rect.left;
        if (rx > 0 && rx < canvas.width) {
            paddle.x = rx - paddle.w / 2;
        }
    }

    function touchStartHandler(e) {
        e.preventDefault();
        if (!playing) { reset(); return; }
        if (!ball.active) ball.active = true;
    }

    function update() {
        // Input check for restart
        if (input.isPressed('Space') && !playing) {
            reset();
            return;
        }

        if (!playing) return;

        // Input
        if (input.isPressed('ArrowRight') && paddle.x < canvas.width - paddle.w) {
            paddle.x += 7;
        } else if (input.isPressed('ArrowLeft') && paddle.x > 0) {
            paddle.x -= 7;
        }

        if (input.isPressed('Space')) {
            if (!playing) reset();
            else if (!ball.active) ball.active = true;
        }

        if (ball.active) {
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Wall collision
            if (ball.x + ball.dx > canvas.width - ball.r || ball.x + ball.dx < ball.r) {
                ball.dx = -ball.dx;
                audio.playSound('bounce');
            }
            if (ball.y + ball.dy < ball.r) {
                ball.dy = -ball.dy;
                audio.playSound('bounce');
            } else if (ball.y + ball.dy > canvas.height - ball.r) {
                // Paddle collision?
                if (ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
                    // Hit paddle
                    ball.dy = -ball.dy;
                    // Angle control
                    const hitPoint = ball.x - (paddle.x + paddle.w / 2);
                    ball.dx = hitPoint * 0.2;
                    audio.playSound('bounce');
                } else {
                    // Miss
                    lives--;
                    audio.playSound('gameover'); // temporary sound
                    if (!lives) {
                        gameOver();
                    } else {
                        resetBall();
                    }
                }
            }

            // Brick collision
            for (let c = 0; c < brickColumnCount; c++) {
                for (let r = 0; r < brickRowCount; r++) {
                    const b = bricks[c][r];
                    if (b.status === 1) {
                        if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                            ball.dy = -ball.dy;
                            b.status = 0;
                            score++;
                            audio.playSound('score');
                            if (score === brickRowCount * brickColumnCount) {
                                // Win? infinite?
                                createBricks(); // Reset Bricks
                                ball.speed += 1;
                            }
                        }
                    }
                }
            }
        } else {
            // Ball follows paddle
            ball.x = paddle.x + paddle.w / 2;
        }

        scoreEl.textContent = `Score: ${score} | Lives: ${lives} | HI: ${highScore}`;
    }

    function draw() {
        // Background
        ctx.fillStyle = '#1e1b4b'; // Deep blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bricks
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;

                    ctx.fillStyle = bricks[c][r].color;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = bricks[c][r].color;
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brickWidth, brickHeight);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Paddle
        ctx.fillStyle = paddle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = paddle.color;
        ctx.beginPath();
        ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.closePath();

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Press Space or Click to Restart", canvas.width / 2, canvas.height / 2 + 40);
        } else if (!ball.active) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText("Press Space or Click to Launch", canvas.width / 2, canvas.height / 2);
        }
    }

    function gameOver() {
        playing = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-breakout-high', highScore);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        document.removeEventListener('mousemove', mouseMoveHandler);
        canvas.removeEventListener('touchmove', touchMoveHandler);
        canvas.removeEventListener('touchstart', touchStartHandler);
    }

    return { init, destroy };
})();
