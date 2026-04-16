/* GAME: Crystal Dash (Isometric) */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;
    let tick = 0;

    // Grid coordinate system
    // We simulate an endless path moving towards bottom-left
    const player = { x: 0, y: 0, z: 0, h: 20, color: '#ff00ff' };
    let path = []; // List of tile coordinates {x, y, type}

    // 0 = +x (Right in ISO), 1 = +y (Left in ISO)
    let currentDir = 0;

    // Isometric math constants
    const tileW = 40;
    const tileH = 20;
    const originX = 0; // Will be set in draw
    const originY = 0;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-runner-iso-high')) || 0;

        reset();

        // Input is handled via InputSystem in main loop, 
        // but for exact "tap" timing we might want to track state changes

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        tick = 0;
        player.x = 0;
        player.y = 0;
        currentDir = 0;
        path = [{ x: 0, y: 0 }];
        // Generate initial path
        for (let i = 0; i < 30; i++) generateTile();
        playing = true;
    }

    function generateTile() {
        const last = path[path.length - 1];

        // Randomly decide direction, but keep it playable
        // 50/50 chance to switch, but maybe biased to keep runs?
        // Actually, in ZigZag, the path IS random50/50 usually.

        let nx = last.x;
        let ny = last.y;

        if (Math.random() < 0.5) nx++; else ny++;

        // Visuals
        const isAlt = (nx + ny) % 2 === 0;
        const color = isAlt ? 'rgba(0, 247, 255, 0.8)' : 'rgba(0, 247, 255, 0.6)';
        const topColor = isAlt ? '#00f7ff' : '#00bdd6';

        path.push({ x: nx, y: ny, color: color, topColor: topColor });
    }

    // Input State
    let lastSpace = false;
    let lastTap = false;

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        // Detect "Press" (Rising Edge)
        const space = input.isPressed('Space') || input.isPressed('A-Button') || input.isPressed('ArrowUp') || input.isPressed('ArrowRight') || input.isPressed('ArrowLeft');
        // Any key switches direction? Or specific?
        // Classic ZigZag is "Tap" to switch.

        if (space && !lastSpace) {
            switchDirection();
        }
        lastSpace = space;
    }

    function switchDirection() {
        currentDir = currentDir === 0 ? 1 : 0;
        audio.playSound('click');
    }

    function update() {
        handleInput();
        if (!playing) return;

        tick++;
        // Speed increases with score
        const speed = Math.max(2, 6 - Math.floor(score / 50));

        // Move every N frames? Or smooth move?
        // Smooth move is harder to check tile data.
        // Let's do: Player moves 0.1 units per frame?
        // Let's stick to discrete steps for logic, smooth for render?
        // Or just discrete steps at intervals.

        if (tick % 6 === 0) { // Move every 6 frames (adjust for speed)
            if (currentDir === 0) player.x++;
            else player.y++;

            checkCollision();
        }

        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
    }

    function checkCollision() {
        // Is there a tile at player x,y?
        // We only keep latest tiles, so search path
        const onTile = path.find(t => t.x === player.x && t.y === player.y);

        if (!onTile) {
            // Fall animation or just end?
            gameOver();
        } else {
            // Scored a step
            score++;
            generateTile();

            // Cleanup old tiles
            if (path[0].x < player.x - 10 || path[0].y < player.y - 10) {
                if (path.length > 50) path.shift();
            }

            // Occasional pickup sound?
            if (score % 10 === 0 && score > 0) audio.playSound('score');
        }
    }

    function draw() {
        // Clear
        ctx.fillStyle = '#0f0f1a'; // Dark background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center the view on the player
        // Iso projection:
        // ScreenX = (cartX - cartY) * tileW/2
        // ScreenY = (cartX + cartY) * tileH/2

        // We want Player to be at center screen
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + 100; // slightly lower

        const pIsoX = (player.x - player.y) * tileW;
        const pIsoY = (player.x + player.y) * tileH;

        const offsetX = centerX - pIsoX;
        const offsetY = centerY - pIsoY;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        // Draw Path (only visible ones approx)
        // Optimization: Draw only if roughly on screen?
        // For now draw all in path array

        path.forEach(t => {
            drawTile(t.x, t.y, t.topColor);
        });

        // Draw Player
        // Hover effect
        const bounce = Math.sin(tick * 0.5) * 5;
        drawCube(player.x, player.y, 20, '#ff00ff', -10 - bounce);

        ctx.restore();

        if (!playing) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("FALLEN", canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Inter';
            ctx.fillText("Press Action to Restart", canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function drawTile(Bx, By, color) {
        const x = (Bx - By) * tileW;
        const y = (Bx + By) * tileH;

        // Top Face
        ctx.beginPath();
        ctx.moveTo(x, y - 2 * tileH);
        ctx.lineTo(x + tileW, y - tileH);
        ctx.lineTo(x, y);
        ctx.lineTo(x - tileW, y - tileH);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Right Face
        ctx.beginPath();
        ctx.moveTo(x + tileW, y - tileH);
        ctx.lineTo(x + tileW, y);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fillStyle = adjustColor(color, -40);
        ctx.fill();

        // Left Face
        ctx.beginPath();
        ctx.moveTo(x - tileW, y - tileH);
        ctx.lineTo(x - tileW, y);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fillStyle = adjustColor(color, -60);
        ctx.fill();
    }

    function drawCube(Bx, By, size, color, zOffset = 0) {
        // Player is a small cube floating
        const x = (Bx - By) * tileW;
        const y = (Bx + By) * tileH + zOffset; // zOffset moves it UP (negative Y)

        // Draw similar to tile but smaller? 
        // Just a circle implies sphere?
        // Let's draw a glowing diamond/cube
        const r = 10;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(x, y - tileH, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function adjustColor(color, amount) {
        return color; // Simplification, ideally HSL darken
    }

    function gameOver() {
        playing = false;
        audio.playSound('gameover'); // Uses the new thud/sawtooth
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('gz-runner-iso-high', highScore);
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
