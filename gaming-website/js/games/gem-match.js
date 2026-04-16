/* ============================================================
   GAME: Gem Match — Match 3 or more gems to clear the board!
   Drag/click to swap adjacent gems. Matches = points!
   Controls: Click gem, then click neighbour to swap
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    const COLS = 7, ROWS = 7;
    const GEM_COLORS = ['#ff4d6d', '#ffaa00', '#00d4ff', '#00ff88', '#cc00ff', '#ffe066'];
    const GEM_ICONS = ['❤', '★', '◆', '●', '♠', '✦'];
    let CELL_W, CELL_H, OX, OY;

    let board, score, hiScore, moves, frame, state;
    let selected = null, particles = [], scorePopups = [];
    let swapAnim = null, fallAnim = [];
    let hintTimer = 0, hintCell = null;

    function mkGem() { return Math.floor(Math.random() * GEM_COLORS.length); }

    function initBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) board[r][c] = mkGem();
        }
        // Clear any starting matches
        for (let tries = 0; tries < 30; tries++) if (!findMatches().length) break; else { board = []; for (let r = 0; r < ROWS; r++) { board[r] = []; for (let c = 0; c < COLS; c++) board[r][c] = mkGem(); } }
    }

    function calcLayout() {
        CELL_W = Math.min(64, Math.floor((canvas.width - 20) / COLS));
        CELL_H = CELL_W;
        OX = Math.floor((canvas.width - CELL_W * COLS) / 2);
        OY = Math.floor((canvas.height - CELL_H * ROWS) / 2) + 14;
    }

    function findMatches() {
        const matches = new Set();
        // Horizontal
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 2; c++) {
            const col = board[r][c];
            if (col !== -1 && col === board[r][c + 1] && col === board[r][c + 2]) {
                let e = c + 2; while (e + 1 < COLS && board[r][e + 1] === col) e++;
                for (let i = c; i <= e; i++) matches.add(r * COLS + i);
            }
        }
        // Vertical
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 2; r++) {
            const col = board[r][c];
            if (col !== -1 && col === board[r + 1][c] && col === board[r + 2][c]) {
                let e = r + 2; while (e + 1 < ROWS && board[e + 1][c] === col) e++;
                for (let i = r; i <= e; i++) matches.add(i * COLS + c);
            }
        }
        return [...matches];
    }

    function clearMatches(matches, mult) {
        matches.forEach(idx => {
            const r = Math.floor(idx / COLS), c = idx % COLS;
            const pts = (10 + (mult || 1) * 5);
            score += pts;
            const px = OX + c * CELL_W + CELL_W / 2, py = OY + r * CELL_H + CELL_H / 2;
            spawnBurst(px, py, GEM_COLORS[board[r][c]], 10);
            scorePopups.push({ x: px, y: py, text: `+${pts}`, life: 40, max: 40 });
            board[r][c] = -1;
        });
        audio.playSound('score');
    }

    function dropGems() {
        let fell = false;
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 2; r >= 0; r--) {
                if (board[r][c] !== -1 && board[r + 1][c] === -1) {
                    // Find furthest empty below
                    let bot = r + 1;
                    while (bot + 1 < ROWS && board[bot + 1][c] === -1) bot++;
                    board[bot][c] = board[r][c];
                    board[r][c] = -1;
                    fell = true;
                }
            }
        }
        // Fill empties from top
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (board[r][c] === -1) { board[r][c] = mkGem(); fell = true; }
        return fell;
    }

    // Simple check: is there any valid move?
    function hasMoves() {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const dirs = [[0, 1], [1, 0]];
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= ROWS || nc >= COLS) continue;
                // Swap and check
                const t = board[r][c]; board[r][c] = board[nr][nc]; board[nr][nc] = t;
                const m = findMatches();
                board[nr][nc] = board[r][c]; board[r][c] = t;
                if (m.length > 0) return { r, c, nr, nc };
            }
        }
        return null;
    }

    function spawnBurst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 28, max: 28 });
        }
    }

    // Cascade processing state
    let cascading = false, cascadeDelay = 0, cascadeMult = 0;

    function processCascade() {
        const m = findMatches();
        if (m.length) {
            cascadeMult++;
            clearMatches(m, cascadeMult);
            cascading = true; cascadeDelay = 28;
        } else {
            cascading = false;
            cascadeMult = 0;
            // Check for no moves
            const hint = hasMoves();
            if (!hint) {
                // Shuffle board
                for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c] = mkGem();
            }
            hintCell = hint;
        }
    }

    function reset() {
        selected = null; particles = []; scorePopups = []; swapAnim = null; fallAnim = [];
        score = 0; moves = 0; frame = 0; state = 'playing'; cascading = false; cascadeMult = 0; hintTimer = 0; hintCell = null;
        hiScore = parseInt(localStorage.getItem('gz-gemmatch-hi') || '0');
        calcLayout();
        initBoard();
        processCascade();
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        canvas._gmClick = handleClick;
        canvas.addEventListener('click', canvas._gmClick);
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            handleClick({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function handleClick(e) {
        if (window.gamePaused || cascading) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        const c = Math.floor((mx - OX) / CELL_W), r = Math.floor((my - OY) / CELL_H);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { selected = null; return; }
        if (selected === null) { selected = { r, c }; audio.playSound('click'); return; }
        // Attempt swap
        const dr = Math.abs(r - selected.r), dc = Math.abs(c - selected.c);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            // Swap
            const t = board[r][c]; board[r][c] = board[selected.r][selected.c]; board[selected.r][selected.c] = t;
            const m = findMatches();
            if (m.length) {
                moves++;
                cascadeMult = 0;
                processCascade();
            } else {
                // Invalid swap — revert
                board[selected.r][selected.c] = board[r][c]; board[r][c] = t;
                audio.playSound('thud');
            }
            selected = null;
            hintTimer = 0;
        } else {
            selected = { r, c };
        }
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        frame++;
        hintTimer++;

        if (cascading) {
            cascadeDelay--;
            if (cascadeDelay <= 0) {
                dropGems();
                processCascade();
            }
        }

        // Hint update
        if (hintTimer > 200) hintCell = hasMoves();

        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; });
        particles = particles.filter(p => p.life > 0);
        scorePopups.forEach(p => { p.y -= 1; p.life--; });
        scorePopups = scorePopups.filter(p => p.life > 0);

        if (score > hiScore) { hiScore = score; localStorage.setItem('gz-gemmatch-hi', hiScore); }
        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  Moves: ${moves}`;
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        ctx.fillStyle = '#050514'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Board bg
        ctx.fillStyle = 'rgba(10,10,40,0.8)';
        ctx.beginPath(); ctx.roundRect(OX - 6, OY - 6, CELL_W * COLS + 12, CELL_H * ROWS + 12, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(60,60,120,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(OX - 6, OY - 6, CELL_W * COLS + 12, CELL_H * ROWS + 12, 10); ctx.stroke();

        // Gems
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const gem = board[r][c];
            if (gem === -1) continue;
            const px = OX + c * CELL_W, py = OY + r * CELL_H;
            const cx2 = px + CELL_W / 2, cy2 = py + CELL_H / 2;
            const isSelected = selected && selected.r === r && selected.c === c;
            const isHint = hintCell && ((hintCell.r === r && hintCell.c === c) || (hintCell.nr === r && hintCell.nc === c));
            const sz = (CELL_W - 8) / 2;

            // Cell bg
            ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)';
            ctx.fillRect(px + 2, py + 2, CELL_W - 4, CELL_H - 4);

            // Gem
            const pulse = isSelected ? 1 + 0.12 * Math.sin(t * 0.01) : 1;
            const col = GEM_COLORS[gem];
            const gr = ctx.createRadialGradient(cx2 - sz * 0.3, cy2 - sz * 0.3, 0, cx2, cy2, sz * pulse);
            gr.addColorStop(0, 'rgba(255,255,255,0.6)');
            gr.addColorStop(0.4, col + 'ee');
            gr.addColorStop(1, col + '66');
            ctx.fillStyle = gr;
            ctx.shadowBlur = isSelected ? 22 : 10; ctx.shadowColor = col;
            ctx.beginPath(); ctx.roundRect(cx2 - sz * pulse, cy2 - sz * pulse, sz * 2 * pulse, sz * 2 * pulse, 8 * pulse); ctx.fill();
            ctx.shadowBlur = 0;

            // Icon
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `bold ${Math.floor(sz * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(GEM_ICONS[gem], cx2, cy2 + 1);

            // Selected ring
            if (isSelected) {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.roundRect(px + 3, py + 3, CELL_W - 6, CELL_H - 6, 8); ctx.stroke();
            }

            // Hint twinkle
            if (isHint && hintTimer > 200) {
                const hp = 0.5 + 0.5 * Math.sin(t * 0.012);
                ctx.strokeStyle = `rgba(255,255,100,${hp})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.roundRect(px + 3, py + 3, CELL_W - 6, CELL_H - 6, 8); ctx.stroke();
            }
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Score popups
        scorePopups.forEach(p => {
            ctx.globalAlpha = p.life / p.max;
            ctx.fillStyle = '#ffe066'; ctx.font = 'bold 15px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1;

        // Cascade banner
        if (cascadeMult > 1) {
            ctx.fillStyle = '#cc00ff'; ctx.shadowBlur = 14; ctx.shadowColor = '#cc00ff';
            ctx.font = 'bold 18px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(`✨ CASCADE ${cascadeMult}×!`, canvas.width / 2, OY - 32); ctx.shadowBlur = 0;
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Click a gem, then click a neighbour to swap  ·  Match 3+ in a row or column!  ·  Combos = bonus 💫', canvas.width / 2, canvas.height - 10);

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2); ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._gmClick) canvas.removeEventListener('click', canvas._gmClick);
    }
    return { init, destroy };
})();
