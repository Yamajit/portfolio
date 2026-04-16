/* GAME: Sky Climber (Vertical) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    const player = { x: 0, y: 0, w: 30, h: 30, dx: 0, dy: 0, color: '#f0f' };
    let platforms = [];
    let cameraY = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-runner-climb-high')) || 0;

        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        cameraY = 0;
        player.x = canvas.width / 2;
        player.y = canvas.height - 150;
        player.dx = 0;
        player.dy = 0;

        // Generate initial platforms
        platforms = [];
        // Ground platform
        platforms.push({ x: 0, y: canvas.height - 50, w: canvas.width, h: 50, type: 'ground' });

        let y = canvas.height - 150;
        while (y > -1000) {
            addPlatform(y);
            y -= 100;
        }

        playing = true;
    }

    function addPlatform(y) {
        const w = 80 + Math.random() * 60;
        const x = Math.random() * (canvas.width - w);
        platforms.push({ x, y, w, h: 15, type: 'normal' }); // Thinner, neon platforms
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        if (input.isPressed('ArrowLeft') || input.isPressed('D-Pad Left')) player.dx = -6;
        else if (input.isPressed('ArrowRight') || input.isPressed('D-Pad Right')) player.dx = 6;
        else player.dx = 0;
    }

    function update() {
        handleInput();
        if (!playing) return;

        // Gravity
        player.dy += 0.5;
        player.x += player.dx;
        player.y += player.dy;

        // Wrap Horizontal
        if (player.x + player.w < 0) player.x = canvas.width;
        if (player.x > canvas.width) player.x = -player.w;

        // Camera Follow (Moving Up)
        const targetCamY = player.y - canvas.height / 2;
        if (targetCamY < cameraY) {
            cameraY = targetCamY;
            score = Math.floor(-cameraY / 10); // Score based on height
        }

        // Collision with platforms
        if (player.dy > 0) { // falling
            platforms.forEach(p => {
                if (player.x + player.w > p.x &&
                    player.x < p.x + p.w &&
                    player.y + player.h >= p.y &&
                    player.y + player.h <= p.y + p.h + 10 // small tolerance
                ) {
                    player.y = p.y - player.h;
                    player.dy = -13; // Auto-bounce
                    audio.playSound('jump');
                    // Add a bounce effect?
                    // audio.playSound('bounce'); // Optional layer, or just jump
                }
            });
        }

        // Remove old platforms and add new ones
        platforms = platforms.filter(p => p.y > cameraY - 100);

        // Generate new platforms above
        const highestPlat = platforms.reduce((min, p) => p.y < min ? p.y : min, Infinity);
        if (highestPlat > cameraY - canvas.height) {
            addPlatform(highestPlat - 100);
        }

        // Fall death
        if (player.y > cameraY + canvas.height) {
            gameOver();
        }

        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function draw() {
        // Neon Background
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#0f0f1a'); // Deep dark
        grad.addColorStop(1, '#2e003e'); // Purple haze
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(0, -cameraY);

        // Platforms
        platforms.forEach(p => {
            // Neon Cyan Platforms
            ctx.fillStyle = '#00f7ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f7ff';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.shadowBlur = 0;

            // Highlight
            ctx.fillStyle = '#aaffff';
            ctx.fillRect(p.x, p.y, p.w, 4);
        });

        // Player
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff00ff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.shadowBlur = 0;

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x + 5, player.y + 5, 8, 8);
        ctx.fillRect(player.x + 17, player.y + 5, 8, 8);

        ctx.restore();

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("FALLEN", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Press Space or Tap to Restart", canvas.width / 2, canvas.height / 2 + 30);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-runner-climb-high', highScore);
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
