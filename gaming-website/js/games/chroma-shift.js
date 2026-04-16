/* GAME: Chroma Shift (Color Match Runner) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let speed = 5;

    // Colors
    const COLOR_A = '#00f7ff'; // Cyan
    const COLOR_B = '#ff00ff'; // Pink
    const COLOR_A_GLOW = 'rgba(0, 247, 255, 0.6)';
    const COLOR_B_GLOW = 'rgba(255, 0, 255, 0.6)';

    // Player
    const player = {
        x: 100,
        y: 0, // Set in reset
        w: 40,
        h: 40,
        colorType: 'A', // 'A' or 'B'
        color: COLOR_A,
        vy: 0,
        gravity: 0, // No gravity, just runs? Or maybe gravity + jump? Let's do simple run + color switch.
        // Actually plan said "Player auto-runs. Gates appear."
        // Let's keep y constant (center lane) to focus on color switching.
    };

    // Gates
    let gates = [];
    let tick = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-chroma-shift-high')) || 0;

        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        speed = 6;
        tick = 0;
        player.y = canvas.height / 2 - player.h / 2;
        player.colorType = 'A';
        player.color = COLOR_A;
        gates = [];
        playing = true;
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        // Detect Switch
        if (input.isPressed('Space') || input.isPressed('A-Button') || input.isPressed('Tap')) {
            if (!input.switchLocked) {
                switchColor();
                input.switchLocked = true;
            }
        } else {
            input.switchLocked = false;
        }
    }

    function switchColor() {
        if (player.colorType === 'A') {
            player.colorType = 'B';
            player.color = COLOR_B;
        } else {
            player.colorType = 'A';
            player.color = COLOR_A;
        }
        audio.playSound('click'); // Or a 'shift' sound
    }

    function update() {
        handleInput();
        if (!playing) return;

        tick++;
        speed += 0.003;

        // Spawn Gates
        if (tick % 90 === 0) {
            spawnGate();
        }

        // Move Gates
        gates.forEach((gate, i) => {
            gate.x -= speed;
        });

        // Clean off-screen
        if (gates.length > 0 && gates[0].x < -50) {
            gates.shift();
            score++;
            if (score % 10 === 0) audio.playSound('score');
        }

        checkCollision();
        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function spawnGate() {
        const type = Math.random() < 0.5 ? 'A' : 'B';
        gates.push({
            x: canvas.width,
            y: 0,
            w: 20, // Thin gate
            h: canvas.height,
            type: type,
            color: type === 'A' ? COLOR_A : COLOR_B,
            passed: false
        });
    }

    function checkCollision() {
        // Player Rect: player.x, player.y, player.w, player.h
        // Gate Rect: gate.x, gate.y, gate.w, gate.h

        gates.forEach(gate => {
            if (gate.passed) return;

            // Check overlap
            if (
                player.x < gate.x + gate.w &&
                player.x + player.w > gate.x
            ) {
                // Must match color
                if (player.colorType !== gate.type) {
                    gameOver();
                } else {
                    // Safe pass visualization?
                    if (!gate.passed) {
                        // audio.playSound('slide'); // maybe too noisy
                        gate.passed = true;
                    }
                }
            }
        });
    }

    function draw() {
        // BG
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Track Lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2 - 60); ctx.lineTo(canvas.width, canvas.height / 2 - 60);
        ctx.moveTo(0, canvas.height / 2 + 60); ctx.lineTo(canvas.width, canvas.height / 2 + 60);
        ctx.stroke();

        // Gates
        gates.forEach(gate => {
            ctx.fillStyle = gate.color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = gate.color;

            // Draw Gate Pillars
            ctx.fillRect(gate.x, 0, gate.w, canvas.height / 2 - 60);
            ctx.fillRect(gate.x, canvas.height / 2 + 60, gate.w, canvas.height / 2 - 60);

            // Energy Field (Semi-transparent)
            ctx.globalAlpha = 0.3;
            ctx.fillRect(gate.x, 0, gate.w, canvas.height);
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        });

        // Player
        ctx.fillStyle = player.color;

        // Glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = player.colorType === 'A' ? COLOR_A : COLOR_B;

        // Draw Player Shape (Rhombus/Diamond)
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        const size = player.w / 2;

        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.fill();

        // Inner White Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

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
        audio.playSound('break'); // Need a break sound? 'thud' works.
        // Actually main.js doesn't have 'break', let's use 'thud'
        if (audio.playSound('thud')) { }

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-chroma-shift-high', highScore);
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
