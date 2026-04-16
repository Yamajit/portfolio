/* ============================================================
   GAME: Tile Slide — Classic 15-puzzle sliding tiles!
   Click a tile next to the empty space to slide it in.
   Controls: Click tile / Arrow keys
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio;
    let animId;

    const SIZE = 4;
    let board, empty, moves, startTime, state, best;
    let cellW, cellH, OX, OY;
    let particles = [];

    const COLORS = [
        null,
        '#ff4d6d', '#ff7755', '#ffaa00', '#ffe066',
        '#00ff88', '#00d4ff', '#0099ff', '#cc00ff',
        '#ff44cc', '#44ffcc', '#ffcc44', '#44ccff',
        '#ff2266', '#22ff66', '#6622ff'
    ];

    function isSolvable(arr) {
        let inv = 0;
        const flat = arr.flat().filter(x => x !== 0);
        for (let i = 0; i < flat.length; i++)
            for (let j = i + 1; j < flat.length; j++)
                if (flat[i] > flat[j]) inv++;
        let blankRow = 0;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (arr[r][c] === 0) blankRow = SIZE - r;
        return (inv + blankRow) % 2 === 0;
    }

    function chunk(arr) {
        const out = [];
        for (let r = 0; r < SIZE; r++) out.push(arr.slice(r * SIZE, r * SIZE + SIZE));
        return out;
    }

    function shuffle() {
        const nums = Array.from({ length: SIZE * SIZE }, (_, i) => i);
        let tries = 0;
        do {
            for (let i = nums.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nums[i], nums[j]] = [nums[j], nums[i]];
            }
            tries++;
        } while (!isSolvable(chunk(nums)) && tries < 1000);
        return chunk(nums);
    }

    function findEmpty(b) {
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) return { r, c };
        return null;
    }

    function isSolved(b) {
        let n = 1;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            const expected = (r === SIZE - 1 && c === SIZE - 1) ? 0 : n++;
            if (b[r][c] !== expected) return false;
        }
        return true;
    }

    function calcLayout() {
        const sz = Math.min(canvas.width - 40, canvas.height - 80);
        cellW = sz / SIZE; cellH = sz / SIZE;
        OX = (canvas.width - sz) / 2;
        OY = (canvas.height - sz) / 2 + 10;
    }

    function reset() {
        calcLayout();
        board = shuffle();
        empty = findEmpty(board);
        moves = 0; state = 'playing';
        startTime = Date.now();
        particles = [];
        best = parseInt(localStorage.getItem('gz-tileslide-hi') || '9999');
    }

    function tryMove(tr, tc) {
        const er = empty.r, ec = empty.c;
        if ((Math.abs(tr - er) === 1 && tc === ec) || (Math.abs(tc - ec) === 1 && tr === er)) {
            board[er][ec] = board[tr][tc];
            board[tr][tc] = 0;
            empty = { r: tr, c: tc };
            moves++;
            audio.playSound('click');
            if (isSolved(board)) {
                state = 'won';
                if (moves < best) { best = moves; localStorage.setItem('gz-tileslide-hi', best); }
                for (let i = 0; i < 60; i++) {
                    const px = OX + Math.random() * cellW * SIZE;
                    const py = OY + Math.random() * cellH * SIZE;
                    const col = COLORS[1 + Math.floor(Math.random() * (SIZE * SIZE - 1))];
                    burst(px, py, col);
                }
                audio.playSound('score');
            }
        }
    }

    function burst(x, y, col) {
        for (let i = 0; i < 2; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 40, max: 40 });
        }
    }

    function handleClick(e) {
        if (window.gamePaused) return;
        if (state === 'won') { reset(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        const c = Math.floor((mx - OX) / cellW), r = Math.floor((my - OY) / cellH);
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) tryMove(r, c);
    }

    function handleKey(e) {
        if (window.gamePaused || state === 'won') return;
        const er = empty.r, ec = empty.c;
        if (e.key === 'ArrowRight') tryMove(er, ec - 1);
        else if (e.key === 'ArrowLeft') tryMove(er, ec + 1);
        else if (e.key === 'ArrowDown') tryMove(er - 1, ec);
        else if (e.key === 'ArrowUp') tryMove(er + 1, ec);
    }

    function init(c, s, a) {
        canvas = c; scoreEl = s; audio = a;
        ctx = canvas.getContext('2d');
        reset();
        canvas._tsClick = handleClick;
        canvas._tsKey = handleKey;
        canvas.addEventListener('click', canvas._tsClick);
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            handleClick({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }, { passive: false });
        document.addEventListener('keydown', canvas._tsKey);
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function update() {
        if (window.gamePaused) return;
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.life--; });
        particles = particles.filter(p => p.life > 0);
        const elapsed = state === 'playing' ? Math.floor((Date.now() - startTime) / 1000) : '—';
        scoreEl.textContent = `Moves: ${moves}  Time: ${elapsed}s  Best: ${best === 9999 ? '—' : best + ' moves'}`;
    }

    function draw() {
        ctx.fillStyle = '#050514'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            const val = board[r][c];
            const px = OX + c * cellW, py = OY + r * cellH;
            const pad = 4;

            if (val === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.roundRect(px + pad, py + pad, cellW - pad * 2, cellH - pad * 2, 10);
                ctx.fill(); ctx.stroke();
                continue;
            }

            const col = COLORS[val];
            const isNeighbour = (Math.abs(r - empty.r) + Math.abs(c - empty.c)) === 1;
            const gr = ctx.createLinearGradient(px, py, px + cellW, py + cellH);
            gr.addColorStop(0, col + 'cc'); gr.addColorStop(1, col + '66');
            ctx.fillStyle = gr;
            ctx.shadowBlur = isNeighbour ? 14 : 5; ctx.shadowColor = col;
            ctx.beginPath(); ctx.roundRect(px + pad, py + pad, cellW - pad * 2, cellH - pad * 2, 10); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(px + pad, py + pad, cellW - pad * 2, cellH - pad * 2, 10); ctx.stroke();

            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(cellW * 0.38)}px Orbitron`;
            ctx.fillText(val, px + cellW / 2, py + cellH / 2);

            if (isNeighbour) {
                const ac = c - empty.c, ar = r - empty.r;
                ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `${Math.floor(cellW * 0.26)}px sans-serif`;
                ctx.fillText(ac < 0 ? '→' : ac > 0 ? '←' : ar < 0 ? '↓' : '↑',
                    px + cellW / 2 + ac * -cellW * 0.25, py + cellH / 2 + ar * -cellH * 0.25);
            }
        }

        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Click highlighted tile to slide it  ·  Arrange 1–15 in order!  ·  Arrow keys work too', canvas.width / 2, canvas.height - 10);

        if (state === 'won') {
            ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff88'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.shadowBlur = 20; ctx.shadowColor = '#00ff88';
            ctx.fillText('✅ SOLVED!', canvas.width / 2, canvas.height / 2 - 36);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.font = '16px Orbitron';
            ctx.fillText(`${moves} moves`, canvas.width / 2, canvas.height / 2 + 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Best: ${best} moves`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[CLICK] to play again', canvas.width / 2, canvas.height / 2 + 60);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2); ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._tsClick) canvas.removeEventListener('click', canvas._tsClick);
        if (canvas._tsKey) document.removeEventListener('keydown', canvas._tsKey);
    }
    return { init, destroy };
})();
