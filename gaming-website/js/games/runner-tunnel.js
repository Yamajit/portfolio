/* GAME: Void Tunnel (First Person) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let speed = 2; // Z-speed
    let rotation = 0; // Tunnel rotation
    const playerAngle = 0; // Player is fixed at bottom (0 or PI/2), tunnel rotates around

    // Tunnel segments
    let segments = [];
    const segmentDepth = 100;

    // Player
    const player = { angle: 0, radius: 10, color: '#06b6d4' };

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-runner-tunnel-high')) || 0;

        reset();

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        speed = 10;
        rotation = 0;
        player.angle = Math.PI / 2; // Bottom
        segments = [];
        // Fill initial segments
        for (let z = 0; z < 2000; z += 100) {
            addSegment(z);
        }
        playing = true;
    }

    function addSegment(z) {
        // Random obstacle
        let obstacle = null;
        if (Math.random() < 0.4 && z > 500) {
            // Gap in the ring
            const gapStart = Math.random() * Math.PI * 2;
            const gapSize = Math.PI / 2;
            obstacle = { start: gapStart, end: gapStart + gapSize, type: 'wall' };
        }
        segments.push({ z: z, obstacle: obstacle });
    }

    let turnSpeed = 0;

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space')) reset();
            return;
        }

        if (input.isPressed('ArrowLeft')) {
            turnSpeed = -0.15;
            // audio.playSound('slide'); // continuous? maybe too much
        } else if (input.isPressed('ArrowRight')) {
            turnSpeed = 0.15;
        } else {
            turnSpeed = 0;
        }
    }

    function update() {
        handleInput();
        if (!playing) return;

        score++;
        speed += 0.005;
        player.angle += turnSpeed;
        scoreEl.textContent = `Score: ${Math.floor(score / 10)} | HI: ${Math.floor(highScore / 10)}`;

        // Move segments
        for (let i = segments.length - 1; i >= 0; i--) {
            let seg = segments[i];
            seg.z -= speed;

            // Collision Check (when segment passes player Z-plane)
            // Player is effectively at Z=0 (screen plane), but let's say Z=100 for visual depth
            if (seg.z <= 100 && seg.z + speed > 100) {
                if (seg.obstacle) {
                    // Normalize angles
                    let pAngle = player.angle % (Math.PI * 2);
                    if (pAngle < 0) pAngle += Math.PI * 2;

                    // Check if player is INSIDE the obstacle (wall)
                    // The obstacle defines a WALL arc. Player must NOT be in it.
                    // Wait, let's make it an opening (safe zone) or a wall (danger zone)?
                    // "obstacle" = wall.

                    let obStart = seg.obstacle.start;
                    let obEnd = seg.obstacle.end;

                    // Simple angle interval check
                    // Logic: Is pAngle between start and end?
                    // Handle wrap-around
                    let hit = false;

                    // Check complex wrap around
                    // Easiest is to check multiple offsets
                    const inRange = (ang, start, end) => {
                        // normalize all
                        ang = (ang % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                        start = (start % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                        end = (end % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

                        if (start < end) return ang >= start && ang <= end;
                        return ang >= start || ang <= end;
                    };

                    if (inRange(pAngle, obStart, obEnd)) {
                        gameOver();
                    }
                }
            }

            if (seg.z < -100) {
                segments.splice(i, 1);
                // Add new segment at back
                const lastZ = segments[segments.length - 1].z;
                addSegment(lastZ + 100);
            }
        }
    }

    function draw() {
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const fov = 300;

        // Draw segments from back to front
        // Sort by Z (descending)
        const renderOrder = [...segments].sort((a, b) => b.z - a.z);

        renderOrder.forEach(seg => {
            if (seg.z <= 0) return; // behind camera

            const scale = fov / (fov + seg.z);
            const r = 200 * scale; // Tunnel radius

            // Draw Ring
            ctx.strokeStyle = '#2a2a5e';
            ctx.lineWidth = 2 * scale;

            if (seg.obstacle) {
                // Draw safe part
                ctx.beginPath();
                ctx.arc(cx, cy, r, seg.obstacle.end, seg.obstacle.start + Math.PI * 2);
                ctx.stroke();

                // Draw Wall (Obstacle)
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4 * scale;
                ctx.beginPath();
                ctx.arc(cx, cy, r, seg.obstacle.start, seg.obstacle.end);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        // Draw Player
        // Since the tunnel "moves", we can keep player fixed visually at bottom?
        // Or rotate player visually? Let's rotate player visually around center
        // Player is at specific Z (100).
        const pScale = fov / (fov + 100);
        const pRadius = 200 * pScale;

        const px = cx + Math.cos(player.angle) * pRadius;
        const py = cy + Math.sin(player.angle) * pRadius;

        ctx.fillStyle = player.color;
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // UI
        if (!playing) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("CRASHED", canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '16px Inter';
            ctx.fillText("Press Space or Tap Sides to Restart", canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-runner-tunnel-high', highScore);
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
