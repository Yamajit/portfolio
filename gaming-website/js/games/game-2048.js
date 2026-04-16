/* GAME: 2048 */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score, highScore;
    let playing = false;

    // Grid
    const size = 4;
    let grid = [];
    let tileSize = 0;
    let padding = 10;

    // Animation
    let animations = [];

    // Colors
    const colors = {
        0: '#cdc1b4',
        2: '#eee4da',
        4: '#ede0c8',
        8: '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128: '#edcf72',
        256: '#edcc61',
        512: '#edc850',
        1024: '#edc53f',
        2048: '#edc22e'
    };

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;
        highScore = parseInt(localStorage.getItem('gz-2048-high')) || 0;

        reset();
        loop();
    }

    function reset() {
        score = 0;
        grid = Array(size).fill().map(() => Array(size).fill(0));
        addRandomTile();
        addRandomTile();
        playing = true;
        resize();
    }

    function resize() {
        const boardSize = Math.min(canvas.width, canvas.height) - 40;
        tileSize = (boardSize - (padding * (size + 1))) / size;
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0) empty.push({ r, c });
            }
        }
        if (empty.length > 0) {
            const spot = empty[Math.floor(Math.random() * empty.length)];
            grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
            // Pop animation
            animations.push({ type: 'pop', r: spot.r, c: spot.c, scale: 0 });
        }
    }

    function handleInput() {
        if (!playing) {
            if (input.isPressed('Space') || input.isPressed('A-Button')) reset();
            return;
        }

        if (input.isPressed('ArrowUp')) {
            if (!upPressed) { move('up'); upPressed = true; }
        } else upPressed = false;

        if (input.isPressed('ArrowDown')) {
            if (!downPressed) { move('down'); downPressed = true; }
        } else downPressed = false;

        if (input.isPressed('ArrowLeft')) {
            if (!leftPressed) { move('left'); leftPressed = true; }
        } else leftPressed = false;

        if (input.isPressed('ArrowRight')) {
            if (!rightPressed) { move('right'); rightPressed = true; }
        } else rightPressed = false;
    }

    let upPressed = false, downPressed = false, leftPressed = false, rightPressed = false;

    function move(dir) {
        let moved = false;

        // Logic for sliding/merging...
        // Transpose/Reverse to standard "slide left" logic
        let tempGrid = JSON.parse(JSON.stringify(grid));

        // Simplified for brevity:
        // We will just implement "Right" slide, and rotate grid for others
        const rotate = (g) => g[0].map((_, i) => g.map(row => row[i]).reverse());

        let rots = 0;
        if (dir === 'left') rots = 2; // ? wait.
        // Let's implement slideRight.
        // Up = Rotate 1 (Right), Slide Right, Rotate 3
        // Right = Slide Right
        // Down = Rotate 3 (Left), Slide Right, Rotate 1
        // Left = Rotate 2, Slide Right, Rotate 2

        // Actually:
        // Up: Transpose?
        // Let's do manual per direction to be safe or use rotation helper.
        // Let's use the rotation approach.
        // Standardize to "Left" slide.

        let g = copyGrid(grid);

        if (dir === 'up') g = rotateLeft(g);
        else if (dir === 'right') g = rotateLeft(rotateLeft(g));
        else if (dir === 'down') g = rotateRight(g);

        // Slide Left
        let res = slideLeft(g);
        if (res.moved) moved = true;
        g = res.grid;
        score += res.score;

        // Rotate back
        if (dir === 'up') g = rotateRight(g);
        else if (dir === 'right') g = rotateRight(rotateRight(g));
        else if (dir === 'down') g = rotateLeft(g);

        if (moved) {
            grid = g;
            addRandomTile();
            audio.playSound('slide'); // slide sound
            if (isGameOver()) {
                playing = false;
                audio.playSound('gameover');
            }
        }
    }

    function slideLeft(g) {
        let moved = false;
        let scoreAdd = 0;

        for (let r = 0; r < size; r++) {
            let row = g[r].filter(val => val !== 0); // remove zeros

            // Merge
            for (let i = 0; i < row.length - 1; i++) {
                if (row[i] === row[i + 1]) {
                    row[i] *= 2;
                    row[i + 1] = 0;
                    scoreAdd += row[i];
                    moved = true; // merge counts as move
                }
            }

            row = row.filter(val => val !== 0); // remove zeros again
            while (row.length < size) row.push(0); // fill with 0

            if (row.join(',') !== g[r].join(',')) moved = true;
            g[r] = row;
        }
        return { grid: g, moved, score: scoreAdd };
    }

    function copyGrid(g) { return JSON.parse(JSON.stringify(g)); }
    function rotateLeft(g) { return g[0].map((_, i) => g.map(row => row[i])).reverse(); }
    function rotateRight(g) { return g[0].map((_, i) => g.map(row => row[i]).reverse()); }

    function isGameOver() {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0) return false;
                if (r < size - 1 && grid[r][c] === grid[r + 1][c]) return false;
                if (c < size - 1 && grid[r][c] === grid[r][c + 1]) return false;
            }
        }
        return true;
    }

    function update() {
        scoreEl.textContent = `Score: ${score} | HI: ${highScore}`;
        resize();
        handleInput();
    }

    function draw() {
        ctx.fillStyle = '#bbada0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center Board
        const boardSize = tileSize * size + padding * (size + 1);
        const startX = (canvas.width - boardSize) / 2;
        const startY = (canvas.height - boardSize) / 2;

        // Background
        ctx.fillStyle = '#bbada0';
        ctx.fillRect(startX, startY, boardSize, boardSize);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const x = startX + padding + c * (tileSize + padding);
                const y = startY + padding + r * (tileSize + padding);
                const val = grid[r][c];

                ctx.fillStyle = 'rgba(238, 228, 218, 0.35)'; // empty tile
                if (val > 0) ctx.fillStyle = colors[val] || '#3c3a32';

                // Rounded rect
                roundRect(ctx, x, y, tileSize, tileSize, 5);
                ctx.fill();

                if (val > 0) {
                    ctx.fillStyle = val > 4 ? '#f9f6f2' : '#776e65';
                    ctx.font = `bold ${val > 1000 ? 30 : 40}px Inter`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(val, x + tileSize / 2, y + tileSize / 2);
                }
            }
        }

        if (!playing) {
            ctx.fillStyle = 'rgba(238, 228, 218, 0.73)';
            ctx.fillRect(startX, startY, boardSize, boardSize);
            ctx.fillStyle = '#776e65';
            ctx.font = '40px Inter';
            ctx.fillText("Game Over", startX + boardSize / 2, startY + boardSize / 2);
            ctx.font = '20px Inter';
            ctx.fillText("Press Space to Restart", startX + boardSize / 2, startY + boardSize / 2 + 50);
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    return {
        init: (c, s, a, i) => {
            init(c, s, a, i);
        },
        destroy: () => {
            cancelAnimationFrame(gameLoop);
        }
    };
})();
