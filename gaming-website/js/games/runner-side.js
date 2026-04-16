/* GAME: Shadow Sprint (Side-Scroller) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let speed = 5;

    // Game Objects
    const player = { x: 50, y: 0, w: 40, h: 60, dy: 0, onGround: false, ducking: false, color: '#7c3aed' };
    let obstacles = [];
    let particles = [];
    let bgLayers = [];

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;

        highScore = parseInt(localStorage.getItem('gz-runner-side-high')) || 0;
        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        speed = 6;
        player.y = canvas.height - 100;
        player.dy = 0;
        player.onGround = false;
        obstacles = [];
        particles = [];
        playing = true;
        bgLayers = [{ x: 0, speed: 1, color: '#1a1a3e' }, { x: 0, speed: 2, color: '#2a2a5e' }];
    }

    function jump() {
        if (!playing) { reset(); return; }
        if (player.onGround) {
            player.dy = -15;
            player.onGround = false;
            audio.playSound('jump');
            createParticles(player.x + 10, player.y + 60, 5, '#fff');
        }
    }

    function handleInput() {
        if (input.isPressed('Space')) jump();

        if (input.isPressed('ArrowDown')) {
            if (!player.ducking) {
                player.ducking = true;
                player.h = 30;
                player.y += 30;
            }
        } else {
            if (player.ducking) {
                player.ducking = false;
                player.h = 60;
                player.y -= 30;
            }
        }
    }

    function spawnObstacle() {
        const type = Math.random() > 0.5 ? 'bird' : 'spike';
        if (type === 'bird') {
            obstacles.push({ x: canvas.width, y: canvas.height - 90, w: 40, h: 30, type: 'bird' });
        } else {
            obstacles.push({ x: canvas.width, y: canvas.height - 40, w: 30, h: 40, type: 'spike' });
        }
    }

    function createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color
            });
        }
    }

    function update() {
        handleInput();
        if (!playing) return;

        // Speed Progression
        speed += 0.005;
        score++;
        scoreEl.textContent = `Score: ${Math.floor(score / 10)} | HI: ${Math.floor(highScore / 10)}`;

        // Player Physics
        player.dy += 0.8; // Gravity
        player.y += player.dy;

        // Ground Collision
        if (player.y + player.h > canvas.height - 20) {
            player.y = canvas.height - 20 - player.h;
            player.dy = 0;
            player.onGround = true;
        }

        // Obstacles
        if (Math.random() < 0.02) spawnObstacle();

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let ob = obstacles[i];
            ob.x -= speed;

            // Collision
            if (player.x < ob.x + ob.w &&
                player.x + player.w > ob.x &&
                player.y < ob.y + ob.h &&
                player.y + player.h > ob.y) {
                gameOver();
            }

            if (ob.x + ob.w < 0) obstacles.splice(i, 1);
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Background Parallax
        bgLayers.forEach(l => {
            l.x -= l.speed;
            if (l.x <= -canvas.width) l.x = 0;
        });
    }

    function draw() {
        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Background (City Skyline Silhouette)
        bgLayers.forEach(l => {
            ctx.fillStyle = l.color;
            // Simple skyline generator
            ctx.beginPath();
            ctx.moveTo(l.x, canvas.height);
            for (let i = 0; i <= canvas.width * 2; i += 50) {
                // Determine height based on position
                let h = 100 + Math.sin(i * 0.01) * 50;
                ctx.lineTo(l.x + i, canvas.height - h);
            }
            ctx.lineTo(l.x + canvas.width * 2, canvas.height);
            ctx.fill();
        });

        // Ground
        ctx.fillStyle = '#14142b';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 20);
        ctx.lineTo(canvas.width, canvas.height - 20);
        ctx.stroke();

        // Player (Neon Runner)
        ctx.shadowBlur = 20;
        ctx.shadowColor = player.color;
        ctx.fillStyle = player.color;

        // Draw body
        ctx.fillRect(player.x, player.y, player.w, player.h);

        // Draw eye (visor)
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(player.x + 25, player.y + 10, 15, 10);
        ctx.shadowBlur = 0;

        // Obstacles
        obstacles.forEach(ob => {
            ctx.shadowBlur = 15;
            if (ob.type === 'bird') {
                ctx.shadowColor = '#f59e0b';
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(ob.x, ob.y);
                ctx.lineTo(ob.x + 20, ob.y + 15);
                ctx.lineTo(ob.x, ob.y + 30);
                ctx.fill();
            } else {
                ctx.shadowColor = '#ef4444';
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(ob.x + 15, ob.y);
                ctx.lineTo(ob.x + 30, ob.y + 40);
                ctx.lineTo(ob.x, ob.y + 40);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        });

        // Particles
        particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            ctx.fillRect(p.x, p.y, 4, 4);
        });

        if (!playing) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '16px Inter';
            ctx.font = '16px Inter';
            ctx.fillText("Press Space or Tap to Restart", canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-runner-side-high', highScore);
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
