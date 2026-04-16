/* GAME: Neon Flip (Gravity Runner) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let speed = 5;

    // Player
    const player = {
        x: 100,
        y: 200,
        w: 30,
        h: 30,
        vy: 0,
        gravity: 0.8,
        jumpForce: 12,
        grounded: false,
        flipped: false, // false = floor, true = ceiling
        color: '#00f7ff'
    };

    // Obstacles
    let obstacles = [];
    let tick = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-neon-flip-high')) || 0;

        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        speed = 5;
        tick = 0;
        player.y = canvas.height - 100;
        player.vy = 0;
        player.flipped = false;
        player.gravity = 0.8;
        obstacles = [];
        playing = true;
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        // Detect Jump / Flip
        // On press, we flip gravity
        if (input.isPressed('Space') || input.isPressed('A-Button') || input.isPressed('ArrowUp') || input.isPressed('Tap')) {
            if (!input.flipLocked) {
                flipGravity();
                input.flipLocked = true;
            }
        } else {
            input.flipLocked = false;
        }
    }

    function flipGravity() {
        if (!player.grounded) return; // Can only flip if touching a surface? Or double jump?
        // Let's allow mid-air flip for "Flappy" style or strict "VVVVVV" style (surface only)
        // VVVVVV style is better for "Flip Runner"

        player.flipped = !player.flipped;
        player.gravity *= -1;
        player.vy = 0; // Reset velocity
        // Push slightly off surface to avoid sticking
        player.y += player.flipped ? -5 : 5;
        player.grounded = false;

        audio.playSound('jump'); // or a new 'flip' sound if we had one, jump is fine
    }

    function update() {
        handleInput();
        if (!playing) return;

        tick++;
        speed += 0.002;

        // Player Physics
        player.vy += player.gravity;
        player.y += player.vy;

        // Floor / Ceiling Collision
        const floorY = canvas.height - 50;
        const ceilY = 50;

        if (player.y + player.h > floorY) {
            player.y = floorY - player.h;
            player.vy = 0;
            player.grounded = true;
            if (player.flipped) gameOver(); // Hit floor while flipped (shouldn't happen with VVVVVV logic unless intended)
            // Actually in VVVVVV you walk on ceiling. 
            // Logic:
            // If flipped (gravity < 0), "Floor" is Ceiling. 
        } else if (player.y < ceilY) {
            player.y = ceilY;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
        }

        // Correct VVVVVV logic:
        // If gravity is POSITIVE (Down), Floor is safe, Ceiling is death? Or both safe?
        // Let's make both safe (running on ceiling).

        // Spawn Obstacles
        if (tick % 100 === 0) {
            spawnObstacle();
        }

        // Move Obstacles
        obstacles.forEach((ob, i) => {
            ob.x -= speed;
        });

        // Clean off-screen
        if (obstacles.length > 0 && obstacles[0].x < -50) {
            obstacles.shift();
            score++;
            if (score % 10 === 0) audio.playSound('score');
        }

        checkCollision();
        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function spawnObstacle() {
        // Randomly spawn on floor OR ceiling
        const onCeiling = Math.random() < 0.5;
        const h = 40 + Math.random() * 40;
        const w = 30;

        const y = onCeiling ? 50 : canvas.height - 50 - h;

        obstacles.push({
            x: canvas.width,
            y: y,
            w: w,
            h: h,
            type: 'spike'
        });
    }

    function checkCollision() {
        // Player Rect: player.x, player.y, player.w, player.h
        obstacles.forEach(ob => {
            if (
                player.x < ob.x + ob.w &&
                player.x + player.w > ob.x &&
                player.y < ob.y + ob.h &&
                player.y + player.h > ob.y
            ) {
                gameOver();
            }
        });
    }

    function draw() {
        // BG
        ctx.fillStyle = '#1a0b2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Floor / Ceiling
        ctx.fillStyle = '#701a75';
        ctx.fillRect(0, 0, canvas.width, 50); // Ceiling
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50); // Floor

        // Decorative Lines
        ctx.strokeStyle = '#d946ef';
        ctx.beginPath();
        ctx.moveTo(0, 50); ctx.lineTo(canvas.width, 50);
        ctx.moveTo(0, canvas.height - 50); ctx.lineTo(canvas.width, canvas.height - 50);
        ctx.stroke();

        // Obstacles (Spikes)
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';

        obstacles.forEach(ob => {
            // Draw as triangle
            ctx.beginPath();
            if (ob.y < canvas.height / 2) { // Ceiling spike
                ctx.moveTo(ob.x, ob.y);
                ctx.lineTo(ob.x + ob.w, ob.y);
                ctx.lineTo(ob.x + ob.w / 2, ob.y + ob.h);
            } else { // Floor spike
                ctx.moveTo(ob.x, ob.y + ob.h);
                ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
                ctx.lineTo(ob.x + ob.w / 2, ob.y);
            }
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Player
        ctx.fillStyle = player.flipped ? '#ff9900' : '#00f7ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(player.x, player.y, player.w, player.h);

        // Eyes
        ctx.fillStyle = '#fff';
        const eyeY = player.flipped ? player.y + 20 : player.y + 5;
        ctx.fillRect(player.x + 20, eyeY, 6, 6);
        ctx.shadowBlur = 0;

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("CRASHED", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Press Space/Tap to Restart", canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('thud');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-neon-flip-high', highScore);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
    }

    return { init, destroy };
})();
