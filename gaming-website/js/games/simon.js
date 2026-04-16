/* GAME: Simon Says (Skill) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    // State
    const colors = ['#22c55e', '#ef4444', '#eab308', '#3b82f6']; // Green, Red, Yellow, Blue
    // Layout: TopLeft, TopRight, BottomLeft, BottomRight

    let sequence = [];
    let userStep = 0;
    let turn = 'computer'; // computer, user, gameover
    let flashIndex = -1;
    let flashTimer = 0;
    let message = "";

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-simon-high')) || 0;

        reset();
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        sequence = [];
        userStep = 0;
        turn = 'computer';
        message = "Watch...";
        playing = true;
        setTimeout(nextRound, 1000);
    }

    function nextRound() {
        if (!playing) return;
        userStep = 0;
        turn = 'computer';
        message = "Watch...";
        // Add step
        sequence.push(Math.floor(Math.random() * 4));
        playSequence();
    }

    function playSequence() {
        let i = 0;
        const interval = setInterval(() => {
            if (!playing) { clearInterval(interval); return; }
            flash(sequence[i]);
            i++;
            if (i >= sequence.length) {
                clearInterval(interval);
                setTimeout(() => {
                    turn = 'user';
                    message = "Your Turn!";
                }, 800);
            }
        }, 800); // speed
    }

    function flash(idx) {
        flashIndex = idx;
        flashTimer = 20; // 20 frames
        // Play distinct sound?
        // Reuse sounds: 0=click, 1=shoot, 2=score, 3=jump
        const sounds = ['click', 'shoot', 'score', 'jump'];
        audio.playSound(sounds[idx]);
    }

    function handleInput(e) {
        if (!playing) {
            reset();
            return;
        }
        if (turn !== 'user') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        checkClick(x, y);
    }

    function handleTouch(e) {
        e.preventDefault();
        if (!playing) { reset(); return; }
        if (turn !== 'user') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        checkClick(x, y);
    }

    function checkClick(x, y) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        let idx = -1;
        if (x < cx && y < cy) idx = 0; // Top Left
        else if (x >= cx && y < cy) idx = 1; // Top Right
        else if (x < cx && y >= cy) idx = 2; // Bottom Left
        else if (x >= cx && y >= cy) idx = 3; // Bottom Right

        if (idx !== -1) {
            flash(idx);

            // Validate
            if (idx === sequence[userStep]) {
                userStep++;
                if (userStep >= sequence.length) {
                    // Success
                    score++;
                    scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
                    turn = 'computer';
                    message = "Good!";
                    setTimeout(nextRound, 1000);
                }
            } else {
                // Fail
                gameOver();
            }
        }
    }

    function update() {
        if (flashTimer > 0) {
            flashTimer--;
            if (flashTimer <= 0) flashIndex = -1;
        }
    }

    function draw() {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const size = Math.min(canvas.width, canvas.height) * 0.4;

        // Draw 4 quadrants
        // 0: Green (TL)
        drawSector(cx, cy, size, Math.PI, Math.PI * 1.5, colors[0], flashIndex === 0);
        // 1: Red (TR)
        drawSector(cx, cy, size, Math.PI * 1.5, Math.PI * 2, colors[1], flashIndex === 1);
        // 2: Yellow (BL) (Wait -> Yellow is usually index 2 bottom left? Simon colors vary)
        // Standard: Green(TL), Red(TR), Yellow(BL), Blue(BR).
        drawSector(cx, cy, size, Math.PI * 0.5, Math.PI, colors[2], flashIndex === 2);
        // 3: Blue (BR)
        drawSector(cx, cy, size, 0, Math.PI * 0.5, colors[3], flashIndex === 3);

        // Center Circle (Black)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Message
        ctx.fillStyle = '#fff';
        ctx.font = '24px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (playing) {
            ctx.fillText(message, cx, cy);
        } else {
            ctx.fillText("FAIL", cx, cy - 20);
            ctx.font = '16px Inter';
            ctx.fillText("Tap to Restart", cx, cy + 20);
        }
    }

    function drawSector(cx, cy, r, startAngle, endAngle, color, active) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = active ? lighten(color) : color;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();
    }

    function lighten(hex) {
        // Simple hack: return lighter color?
        // Or just hardcode lighter versions.
        if (hex === '#22c55e') return '#86efac';
        if (hex === '#ef4444') return '#fca5a5';
        if (hex === '#eab308') return '#fde047';
        if (hex === '#3b82f6') return '#93c5fd';
        return '#fff';
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-simon-high', highScore);
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        canvas.removeEventListener('mousedown', handleInput);
        canvas.removeEventListener('touchstart', handleTouch);
    }

    return { init, destroy };
})();
