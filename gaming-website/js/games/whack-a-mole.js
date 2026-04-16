/* GAME: Whack-a-Mole (Action) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let timeLeft = 60;

    // Grid
    const cols = 3;
    const rows = 3;
    let holes = [];
    let moleTimer = 0;
    let spawnRate = 60; // frames

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-whack-high')) || 0;

        reset();
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        timeLeft = 60;
        spawnRate = 60;
        holes = [];

        // Create 3x3 grid
        const padding = 20;
        const holeSize = 80;
        const startX = (canvas.width - (cols * holeSize + (cols - 1) * padding)) / 2;
        const startY = (canvas.height - (rows * holeSize + (rows - 1) * padding)) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                holes.push({
                    x: startX + c * (holeSize + padding) + holeSize / 2,
                    y: startY + r * (holeSize + padding) + holeSize / 2,
                    r: holeSize / 2,
                    state: 0, // 0=empty, 1=mole, 2=hit
                    timer: 0
                });
            }
        }
        playing = true;
    }

    function handleInput(e) {
        if (!playing) {
            reset();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        checkHit(x, y);
    }

    function handleTouch(e) {
        e.preventDefault();
        if (!playing) {
            reset();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        checkHit(x, y);
    }

    function checkHit(x, y) {
        holes.forEach(h => {
            const dist = Math.sqrt((x - h.x) ** 2 + (y - h.y) ** 2);
            if (dist < h.r && h.state === 1) {
                h.state = 2; // hit
                h.timer = 20; // show hit frame for 20 frames
                score++;
                audio.playSound('thud'); // whack sound
                scoreEl.textContent = `Score: ${score} | Time: ${Math.ceil(timeLeft)}`;
            }
        });
    }

    function update() {
        // No keyboard input in Whack-a-Mole usually, but maybe cleanup or restart logic?
        // Actually Whack-a-Mole uses mouse/touch events which ARE blocked by 'if (!playing)' in the event handlers.
        // CHECK lines 57-61:
        // if (!playing) { reset(); return; }
        // This logic is ALREADY correct in the event handlers for Whack-a-Mole!
        // But let's check update() just in case.

        if (!playing) return;

        timeLeft -= 1 / 60;
        if (timeLeft <= 0) {
            gameOver();
            return;
        }

        // Spawn Logic
        moleTimer++;
        if (moleTimer > spawnRate) {
            moleTimer = 0;
            // Pick random hole that is empty
            const empty = holes.filter(h => h.state === 0);
            if (empty.length > 0) {
                const h = empty[Math.floor(Math.random() * empty.length)];
                h.state = 1;
                h.timer = 60; // stay for 1s
            }
            // Speed up
            if (spawnRate > 20) spawnRate -= 0.1;
        }

        // Update holes
        holes.forEach(h => {
            if (h.state !== 0) {
                h.timer--;
                if (h.timer <= 0) {
                    h.state = 0;
                }
            }
        });

        scoreEl.textContent = `Score: ${score} | Time: ${Math.ceil(timeLeft)}`;
    }

    function draw() {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        holes.forEach(h => {
            // Hole
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.fill();

            // Mole
            if (h.state === 1) {
                ctx.fillStyle = '#a16207'; // Brown
                ctx.beginPath();
                ctx.arc(h.x, h.y, h.r * 0.8, 0, Math.PI * 2);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(h.x - 15, h.y - 10, 5, 0, Math.PI * 2);
                ctx.arc(h.x + 15, h.y - 10, 5, 0, Math.PI * 2);
                ctx.fill();
                // Nose
                ctx.fillStyle = '#fca5a5';
                ctx.beginPath();
                ctx.arc(h.x, h.y + 5, 8, 0, Math.PI * 2);
                ctx.fill();
            } else if (h.state === 2) {
                // Hit!
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(h.x, h.y, h.r * 0.8, 0, Math.PI * 2);
                ctx.fill();
                // X eyes
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(h.x - 20, h.y - 15); ctx.lineTo(h.x - 10, h.y - 5);
                ctx.moveTo(h.x - 10, h.y - 15); ctx.lineTo(h.x - 20, h.y - 5);
                ctx.moveTo(h.x + 10, h.y - 15); ctx.lineTo(h.x + 20, h.y - 5);
                ctx.moveTo(h.x + 20, h.y - 15); ctx.lineTo(h.x + 10, h.y - 5);
                ctx.stroke();
            }
        });

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("TIME'S UP", canvas.width / 2, canvas.height / 2);
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
            ctx.font = '16px Inter';
            ctx.fillText("Click or Tap to Play Again", canvas.width / 2, canvas.height / 2 + 80);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-whack-high', highScore);
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
