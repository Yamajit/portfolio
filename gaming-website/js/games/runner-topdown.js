/* GAME: Neon Highway (Top-Down) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let speed = 5;

    const player = { x: 0, y: 0, w: 40, h: 70, lane: 1, targetX: 0, color: '#06b6d4' };
    const lanes = [0, 0, 0]; // x-coordinates
    let cars = [];
    let roadStripeOffset = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-runner-top-high')) || 0;

        const laneWidth = 100;
        const centerX = canvas.width / 2;
        lanes[0] = centerX - laneWidth;
        lanes[1] = centerX;
        lanes[2] = centerX + laneWidth;

        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        speed = 8;
        player.lane = 1;
        player.x = lanes[1];
        player.targetX = lanes[1];
        player.y = canvas.height - 150;
        player.dx = 0; // Reset player movement direction
        cars = [];
        playing = true;
    }

    function handleInputPos(x) {
        if (!playing) { reset(); return; }
        const width = canvas.clientWidth;
        if (x < width / 2) {
            if (player.lane > 0) {
                player.lane--;
                player.targetX = lanes[player.lane];
                audio.playSound('slide');
            }
        } else {
            if (player.lane < 2) {
                player.lane++;
                player.targetX = lanes[player.lane];
                audio.playSound('slide');
            }
        }
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space')) reset();
            return;
        }

        if (input.isPressed('ArrowLeft')) {
            if (!leftPressed) {
                if (player.lane > 0) {
                    player.lane--;
                    player.targetX = lanes[player.lane];
                    audio.playSound('shoot');
                }
                leftPressed = true;
            }
        } else {
            leftPressed = false;
        }

        if (input.isPressed('ArrowRight')) {
            if (!rightPressed) {
                if (player.lane < 2) {
                    player.lane++;
                    player.targetX = lanes[player.lane];
                    audio.playSound('shoot');
                }
                rightPressed = true;
            }
        } else {
            rightPressed = false;
        }
    }

    let leftPressed = false;
    let rightPressed = false;

    function spawnCar() {
        const laneIdx = Math.floor(Math.random() * 3);
        const carX = lanes[laneIdx];
        // Ensure not too close to another car
        const tooClose = cars.some(c => Math.abs(c.y - (-100)) < 150);
        if (!tooClose) {
            cars.push({
                x: carX,
                y: -100,
                w: 40,
                h: 70,
                color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b',
                lane: laneIdx
            });
        }
    }

    function update() {
        handleInput();
        if (!playing) return;

        score++;
        speed += 0.005;
        scoreEl.textContent = `Score: ${Math.floor(score / 10)} | HI: ${Math.floor(highScore / 10)}`;

        // Smooth lane change
        player.x += (player.targetX - player.x) * 0.2;

        // Road movement
        roadStripeOffset = (roadStripeOffset + speed) % 80;

        // Spawn cars
        if (Math.random() < 0.03) spawnCar();

        for (let i = cars.length - 1; i >= 0; i--) {
            let car = cars[i];
            car.y += speed * 0.8; // Enemy cars move slightly slower than road (relative)

            // Normalize collision box
            let px = player.x;
            let py = player.y;

            // Simple AABB Collision
            if (px < car.x + car.w &&
                px + player.w > car.x &&
                py < car.y + car.h &&
                py + player.h > car.y) {
                gameOver();
            }

            if (car.y > canvas.height) cars.splice(i, 1);
        }
    }

    function draw() {
        // Clear background (Dark asphalt)
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Road
        const roadWidth = 350;
        const roadLeft = (canvas.width - roadWidth) / 2;

        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

        // Road Borders (Neon)
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#7c3aed';
        ctx.beginPath();
        ctx.moveTo(roadLeft, 0);
        ctx.lineTo(roadLeft, canvas.height);
        ctx.moveTo(roadLeft + roadWidth, 0);
        ctx.lineTo(roadLeft + roadWidth, canvas.height);
        ctx.stroke();

        // Lane Markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([40, 40]);
        ctx.lineDashOffset = -roadStripeOffset;
        ctx.beginPath();
        // Lane 1 divider
        ctx.moveTo(lanes[0] + 50 + 20, 0); // approx between lane 0 and 1
        ctx.lineTo(lanes[0] + 50 + 20, canvas.height);
        // Lane 2 divider
        ctx.moveTo(lanes[1] + 50 + 20, 0);
        ctx.lineTo(lanes[1] + 50 + 20, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Player Car
        drawCar(player.x, player.y, player.color, true);

        // Enemy Cars
        cars.forEach(car => {
            drawCar(car.x, car.y, car.color, false);
        });

        // UI Overlay
        if (!playing) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("CRASHED!", canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '16px Inter';
            ctx.font = '16px Inter';
            ctx.fillText("Press Space or Tap to Restart", canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    function drawCar(x, y, color, isPlayer) {
        ctx.save();
        ctx.translate(x + 20, y + 35);

        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(-20, -35, 40, 70);

        // Windshield
        ctx.fillStyle = '#000';
        ctx.fillRect(-15, -20, 30, 15); // front
        ctx.fillRect(-15, 15, 30, 10);  // rear

        // Headlights / Tail lights
        if (isPlayer) {
            ctx.fillStyle = '#fff'; // headlights
            ctx.shadowColor = '#fff';
            ctx.fillRect(-18, -38, 8, 5);
            ctx.fillRect(10, -38, 8, 5);
        } else {
            ctx.fillStyle = '#ef4444'; // tail lights (facing player)
            ctx.fillRect(-18, 33, 8, 5);
            ctx.fillRect(10, 33, 8, 5);
        }

        ctx.restore();
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-runner-top-high', highScore);
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
