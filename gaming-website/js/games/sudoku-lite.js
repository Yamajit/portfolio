/* ============================================================
   SUDOKU LITE — 6×6 Sudoku puzzle game
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl;
    let animId = null;
    let running = false;

    let grid = [];         // 6×6, 0 = empty
    let solution = [];     // 6×6 full solution
    let locked = [];       // 6×6 booleans (pre-filled cells)
    let selected = null;   // {r, c}
    let score = 0;
    let errors = 0;
    let frameCount = 0;
    let gameWon = false;
    let shakeCells = [];   // cells flashing red on wrong
    let shakeTimer = 0;

    const N = 6;

    // Generate a valid 6×6 Sudoku
    function validPlace(board, r, c, num) {
        for (let i = 0; i < N; i++) {
            if (board[r][i] === num) return false;
            if (board[i][c] === num) return false;
        }
        // 2x3 box
        const br = Math.floor(r / 2) * 2;
        const bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 2; dr++)
            for (let dc = 0; dc < 3; dc++)
                if (board[br + dr][bc + dc] === num) return false;
        return true;
    }

    function solve(board) {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (board[r][c] === 0) {
                    const nums = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
                    for (const n of nums) {
                        if (validPlace(board, r, c, n)) {
                            board[r][c] = n;
                            if (solve(board)) return true;
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function newPuzzle() {
        solution = Array.from({ length: N }, () => Array(N).fill(0));
        solve(solution);
        // Make puzzle by removing cells
        grid = solution.map(row => [...row]);
        locked = Array.from({ length: N }, () => Array(N).fill(false));
        const removes = 18; // leave 18 clues
        let removed = 0;
        const cells = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
        cells.sort(() => Math.random() - 0.5);
        for (const [r, c] of cells) {
            if (removed >= removes) break;
            grid[r][c] = 0;
            removed++;
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
            locked[r][c] = grid[r][c] !== 0;
        selected = null; errors = 0; score = 0; gameWon = false;
    }

    function getCellSize() {
        const margin = 30;
        const available = Math.min(canvas.width, canvas.height) - margin * 2;
        return Math.floor(available / N);
    }

    function getGridOrigin() {
        const cs = getCellSize();
        const gw = cs * N;
        const gh = cs * N;
        return { ox: (canvas.width - gw) / 2, oy: (canvas.height - gh) / 2 + 10 };
    }

    function drawBg() {
        ctx.fillStyle = '#060614';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawGrid() {
        const cs = getCellSize();
        const { ox, oy } = getGridOrigin();

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const x = ox + c * cs, y = oy + r * cs;
                const isSel = selected && selected.r === r && selected.c === c;
                const isLocked = locked[r][c];
                const sameNum = selected && grid[selected.r][selected.c] !== 0 && grid[r][c] === grid[selected.r][selected.c];
                const sameBox = selected && Math.floor(r / 2) === Math.floor(selected.r / 2) && Math.floor(c / 3) === Math.floor(selected.c / 3);
                const sameRow = selected && r === selected.r;
                const sameCol = selected && c === selected.c;
                const isShaking = shakeCells.some(sc => sc.r === r && sc.c === c);

                // Cell background
                let bg = '#0d0d2b';
                if (isSel) bg = 'rgba(0,212,255,0.22)';
                else if (isShaking) bg = 'rgba(255,50,50,0.3)';
                else if (sameNum && grid[r][c] !== 0) bg = 'rgba(0,255,136,0.13)';
                else if (sameRow || sameCol || sameBox) bg = 'rgba(0, 120, 200, 0.1)';

                ctx.fillStyle = bg;
                ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

                // Number
                if (grid[r][c] !== 0) {
                    ctx.font = `bold ${Math.floor(cs * 0.48)}px Orbitron, monospace`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    if (isLocked) {
                        ctx.fillStyle = '#a0c8ff';
                        ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 6;
                    } else {
                        ctx.fillStyle = '#00ff88';
                        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8;
                    }
                    ctx.fillText(grid[r][c], x + cs / 2, y + cs / 2);
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(0,180,255,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= N; i++) {
            ctx.beginPath(); ctx.moveTo(ox + i * cs, oy); ctx.lineTo(ox + i * cs, oy + N * cs); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ox, oy + i * cs); ctx.lineTo(ox + N * cs, oy + i * cs); ctx.stroke();
        }
        // Bold box borders (2x3)
        ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2.5;
        for (let r = 0; r <= N; r += 2) {
            ctx.beginPath(); ctx.moveTo(ox, oy + r * cs); ctx.lineTo(ox + N * cs, oy + r * cs); ctx.stroke();
        }
        for (let c = 0; c <= N; c += 3) {
            ctx.beginPath(); ctx.moveTo(ox + c * cs, oy); ctx.lineTo(ox + c * cs, oy + N * cs); ctx.stroke();
        }
        ctx.textBaseline = 'alphabetic';
    }

    function drawNumpad() {
        const { ox, oy } = getGridOrigin();
        const cs = getCellSize();
        const gridBottom = oy + N * cs + 12;
        const totalW = N * 40 + 10;
        const startX = canvas.width / 2 - totalW / 2;

        for (let n = 1; n <= N; n++) {
            const bx = startX + (n - 1) * 42, by = gridBottom;
            ctx.beginPath(); ctx.roundRect(bx, by, 38, 38, 6);
            ctx.fillStyle = 'rgba(0,212,255,0.1)'; ctx.strokeStyle = 'rgba(0,212,255,0.35)'; ctx.lineWidth = 1.5;
            ctx.fill(); ctx.stroke();
            ctx.font = 'bold 18px Orbitron, monospace';
            ctx.fillStyle = '#00d4ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(n, bx + 19, by + 19);
        }
        ctx.textBaseline = 'alphabetic';
        // Erase button
        const ex = startX + N * 42, ey = gridBottom;
        ctx.beginPath(); ctx.roundRect(ex, ey, 38, 38, 6);
        ctx.fillStyle = 'rgba(255,77,109,0.1)'; ctx.strokeStyle = 'rgba(255,77,109,0.35)';
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillStyle = '#ff4d6d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⌫', ex + 19, ey + 19);
        ctx.textBaseline = 'alphabetic';
    }

    function drawHUD() {
        const cx = canvas.width / 2;
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.textAlign = 'center'; ctx.fillStyle = '#00d4ff';
        ctx.fillText('SUDOKU LITE (6×6)', cx, 24);
        ctx.font = '12px Orbitron, monospace';
        ctx.fillStyle = '#ffe066';
        ctx.textAlign = 'left'; ctx.fillText('Errors: ' + errors, 12, 24);
        ctx.textAlign = 'right'; ctx.fillStyle = '#00ff88';
        ctx.fillText('Score: ' + score, canvas.width - 12, 24);
    }

    function drawWin() {
        if (!gameWon) return;
        const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.08);
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.fillStyle = `rgba(0,0,0,0.5)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${32 + 6 * pulse}px Orbitron, monospace`;
        ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 30;
        ctx.textAlign = 'center';
        ctx.fillText('🎉 SOLVED!', cx, cy - 20);
        ctx.shadowBlur = 0;
        ctx.font = '16px Orbitron, monospace';
        ctx.fillStyle = '#ffe066';
        ctx.fillText('Score: ' + score, cx, cy + 25);
        ctx.font = '12px Orbitron, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Close and reopen to play a new puzzle', cx, cy + 60);
    }

    function place(num) {
        if (!selected || locked[selected.r][selected.c] || gameWon) return;
        const { r, c } = selected;
        if (num === 0) { grid[r][c] = 0; return; }
        if (!validPlace(grid.map(row => [...row]).map((row, ri) => ri === r ? row.map((v, ci) => ci === c ? 0 : v) : row), r, c, num)) {
            errors++;
            shakeCells = [{ r, c }]; shakeTimer = 30;
            return;
        }
        grid[r][c] = num; score += 10;
        if (scoreEl) scoreEl.textContent = 'Score: ' + score;
        // Check win
        let filled = true;
        for (let rr = 0; rr < N && filled; rr++) for (let cc = 0; cc < N && filled; cc++) if (grid[rr][cc] === 0) filled = false;
        if (filled) { gameWon = true; score += (50 - errors * 5); if (scoreEl) scoreEl.textContent = 'Score: ' + score; }
    }

    function handleClick(ex, ey) {
        if (gameWon) return;
        const cs = getCellSize(); const { ox, oy } = getGridOrigin();
        // Grid click
        if (ex >= ox && ex < ox + N * cs && ey >= oy && ey < oy + N * cs) {
            const c = Math.floor((ex - ox) / cs), r = Math.floor((ey - oy) / cs);
            selected = { r, c };
            return;
        }
        // Numpad
        const gridBottom = oy + N * cs + 12;
        const totalW = N * 40 + 10;
        const startX = canvas.width / 2 - totalW / 2;
        if (ey >= gridBottom && ey <= gridBottom + 38) {
            for (let n = 1; n <= N; n++) {
                const bx = startX + (n - 1) * 42;
                if (ex >= bx && ex <= bx + 38) { place(n); return; }
            }
            const ex2 = startX + N * 42;
            if (ex >= ex2 && ex <= ex2 + 38) place(0);
        }
    }

    function update() {
        frameCount++;
        if (shakeTimer > 0) { shakeTimer--; if (shakeTimer <= 0) shakeCells = []; }
    }

    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg(); drawGrid(); drawNumpad(); drawHUD(); drawWin();
        animId = requestAnimationFrame(loop);
    }

    return {
        init(c, s) {
            canvas = c; scoreEl = s;
            ctx = canvas.getContext('2d');
            running = true; newPuzzle();
            window.__sdClick = e => {
                const r = canvas.getBoundingClientRect();
                handleClick((e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height);
            };
            canvas.addEventListener('click', window.__sdClick);
            canvas.addEventListener('touchend', e => {
                e.preventDefault();
                const r = canvas.getBoundingClientRect(), t = e.changedTouches[0];
                handleClick((t.clientX - r.left) * canvas.width / r.width, (t.clientY - r.top) * canvas.height / r.height);
            }, { passive: false });
            window.__sdKey = e => {
                if (e.key >= '1' && e.key <= '6') place(parseInt(e.key));
                else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0);
                else if (selected) {
                    const { r, c } = selected;
                    if (e.key === 'ArrowUp' && r > 0) selected = { r: r - 1, c };
                    else if (e.key === 'ArrowDown' && r < N - 1) selected = { r: r + 1, c };
                    else if (e.key === 'ArrowLeft' && c > 0) selected = { r, c: c - 1 };
                    else if (e.key === 'ArrowRight' && c < N - 1) selected = { r, c: c + 1 };
                }
            };
            window.addEventListener('keydown', window.__sdKey);
            loop();
        },
        destroy() {
            running = false;
            if (animId) cancelAnimationFrame(animId);
            if (window.__sdClick) canvas.removeEventListener('click', window.__sdClick);
            if (window.__sdKey) window.removeEventListener('keydown', window.__sdKey);
        }
    };
})();
