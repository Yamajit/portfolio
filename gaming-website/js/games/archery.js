/* GAME: Archery World (Sports) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    // Game state
    let bowY = 0;
    let arrow = { active: false, x: 100, y: 0, vx: 0, vy: 0 };
    let targets = [];
    let wind = 0;
    let arrowsLeft = 10;

    // Mouse
    let mouseY = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-archery-high')) || 0;

        reset();
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        arrowsLeft = 10;
        targets = [];
        spawnTarget();
        wind = (Math.random() - 0.5) * 2; // Wind factor
        playing = true;
    }

    function spawnTarget() {
        targets.push({
            x: canvas.width - 100,
            y: 100 + Math.random() * (canvas.height - 200),
            r: 40,
            speedY: (Math.random() - 0.5) * 2
        });
    }

    function handleMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseY = e.clientY - rect.top;
        bowY = mouseY;
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        mouseY = e.touches[0].clientY - rect.top;
        bowY = mouseY;
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

        // Space or A-Button to shoot
        if (input.isPressed('Space') || input.isPressed('A-Button')) {
            if (!shootPressed && !arrow.active && arrowsLeft > 0) {
                arrow.active = true;
                arrow.x = 100;
                arrow.y = bowY;
                arrow.vx = 25;
                arrow.vy = 0;
                arrowsLeft--;
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

        // Update arrow
        if (arrow.active) {
            arrow.x += arrow.vx;
            arrow.y += arrow.vy;
            arrow.vy += 0.1; // gravity
            arrow.y += wind; // wind effect

            // Check collision with targets
            targets.forEach((t, i) => {
                const dx = arrow.x - t.x;
                const dy = arrow.y - t.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < t.r) {
                    // Hit!
                    // Calculate score based on accuracy (closer to 0 dist)
                    const points = Math.ceil((1 - dist / t.r) * 10) * 10;
                    score += points;
                    audio.playSound('thud');
                    setTimeout(() => audio.playSound('score'), 100);

                    // Reset arrow
                    arrow.active = false;
                    targets.splice(i, 1);
                    spawnTarget();

                    // Change wind
                    wind = (Math.random() - 0.5) * 4;
                }
            });

            // Missed
            if (arrow.x > canvas.width || arrow.y > canvas.height) {
                arrow.active = false;
            }
        }

        // Update targets
        targets.forEach(t => {
            t.y += t.speedY;
            if (t.y < 50 || t.y > canvas.height - 50) t.speedY *= -1;
        });

        scoreEl.textContent = `Score: ${score} | Arrows: ${arrowsLeft}`;

        if (arrowsLeft === 0 && !arrow.active) {
            gameOver();
        }
    }

    function draw() {
        ctx.fillStyle = '#1e293b'; // Dark slate
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Ground/Range
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

        // Draw targets
        targets.forEach(t => {
            // Stand
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y + t.r);
            ctx.lineTo(t.x, canvas.height - 50);
            ctx.stroke();

            // Bulls-eye
            drawCircle(t.x, t.y, t.r, '#fff');
            drawCircle(t.x, t.y, t.r * 0.8, '#000');
            drawCircle(t.x, t.y, t.r * 0.6, '#06b6d4');
            drawCircle(t.x, t.y, t.r * 0.4, '#ef4444');
            drawCircle(t.x, t.y, t.r * 0.2, '#f59e0b');
        });

        // Draw Bow (at mouse Y)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Simple arc bow
        ctx.arc(80, bowY, 40, Math.PI * 1.5, Math.PI * 0.5);
        ctx.stroke();
        // String
        ctx.beginPath();
        ctx.moveTo(80, bowY - 40);
        ctx.lineTo(80, bowY + 40);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw Arrow
        if (arrow.active) {
            drawArrow(arrow.x, arrow.y);
        } else if (arrowsLeft > 0) {
            // Draw nocked arrow
            drawArrow(80, bowY);
        }

        // Wind Indicator
        ctx.fillStyle = '#fff';
        ctx.font = '16px Inter';
        ctx.fillText(`Wind: ${wind.toFixed(1)}`, canvas.width / 2, 30);

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("FINISHED", canvas.width / 2, canvas.height / 2);
            ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
            ctx.font = '16px Inter';
            ctx.fillText("Click to Play Again", canvas.width / 2, canvas.height / 2 + 80);
        }
    }

    function drawCircle(x, y, r, c) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawArrow(x, y) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 40, y);
        ctx.stroke();
        // Tip
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(x + 40, y - 3);
        ctx.lineTo(x + 45, y);
        ctx.lineTo(x + 40, y + 3);
        ctx.fill();
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-archery-high', highScore);
        }
    }

    function loop() {
        draw(); // draw regardless of update to show game over screen
        update();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
    }

    return { init, destroy };
})();
