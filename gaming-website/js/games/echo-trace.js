/* ============================================================
   GAME: Echo Trace v2 — Simon-says memory game, clean & playable
   3×3 grid of colored nodes. Watch the sequence, then repeat it.
   Controls: Click/Tap nodes   OR   Keys 1-9 (numpad layout)
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    // State
    const S = { IDLE: 0, SHOWING: 1, WAITING: 2, CORRECT: 3, WRONG: 4, OVER: 5 };
    let state = S.IDLE;
    let sequence = [], playerIdx = 0;
    let round = 0;
    let highScore = parseInt(localStorage.getItem('gz-echo-hi') || '0');
    let showStep = 0, showHoldLeft = 0;
    const SHOW_HOLD = 55, SHOW_GAP = 25;
    let postFlashTimer = 0;
    let overTimer = 0;

    // Grid
    const GRID = 3;
    const COLORS = ['#ff4d6d', '#ff9f1c', '#ffe66d', '#2dc653', '#00b4d8', '#7209b7', '#f72585', '#4cc9f0', '#a8dadc'];
    const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let nodes = [];
    let cellSz, ox, oy;

    function buildGrid() {
        const side = Math.floor(Math.min(canvas.width, canvas.height) * 0.68);
        cellSz = Math.floor(side / GRID);
        ox = Math.floor((canvas.width - cellSz * GRID) / 2);
        oy = Math.floor((canvas.height - cellSz * GRID) / 2);
        nodes = [];
        for (let r = 0; r < GRID; r++) {
            for (let c = 0; c < GRID; c++) {
                const idx = r * GRID + c;
                const pad = 10;
                nodes.push({
                    idx, col: COLORS[idx],
                    x: ox + c * cellSz + pad, y: oy + r * cellSz + pad,
                    w: cellSz - pad * 2, h: cellSz - pad * 2,
                    lit: 0,    // countdown for lit state
                    flash: 0,  // countdown for player-tap flash
                    correct: false, wrong: false
                });
            }
        }
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        buildGrid();
        attachEvents();
        startGame();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function attachEvents() {
        canvas._echoClick = (e) => {
            if (state !== S.WAITING) return;
            const rect = canvas.getBoundingClientRect();
            let mx, my;
            if (e.touches) {
                mx = e.touches[0].clientX - rect.left;
                my = e.touches[0].clientY - rect.top;
            } else {
                mx = e.clientX - rect.left;
                my = e.clientY - rect.top;
            }
            for (const n of nodes) {
                if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
                    tapNode(n.idx); break;
                }
            }
        };
        canvas.addEventListener('click', canvas._echoClick);
        canvas.addEventListener('touchstart', canvas._echoClick, { passive: true });
    }

    function startGame() {
        sequence = []; round = 0; playerIdx = 0;
        state = S.IDLE;
        nodes.forEach(n => { n.lit = 0; n.flash = 0; n.correct = false; n.wrong = false; });
        // Brief delay then show first round
        setTimeout(nextRound, 600);
    }

    function nextRound() {
        round++;
        sequence.push(Math.floor(Math.random() * 9));
        nodes.forEach(n => { n.lit = 0; n.correct = false; n.wrong = false; });
        playerIdx = 0;
        showStep = 0; showHoldLeft = 0;
        state = S.SHOWING;
        scoreEl.textContent = `Round: ${round}  Best: ${highScore}`;
    }

    function tapNode(idx) {
        if (state !== S.WAITING) return;
        nodes[idx].flash = 18;
        audio.playSound('click');

        if (idx === sequence[playerIdx]) {
            nodes[idx].correct = true;
            playerIdx++;
            if (playerIdx >= sequence.length) {
                // Completed round
                state = S.CORRECT; postFlashTimer = 50;
                audio.playSound('score');
                if (round > highScore) { highScore = round; localStorage.setItem('gz-echo-hi', highScore); }
            }
        } else {
            // Wrong!
            nodes[idx].wrong = true;
            state = S.WRONG; overTimer = 0;
            audio.playSound('thud');
            if (round - 1 > highScore) { highScore = round - 1; localStorage.setItem('gz-echo-hi', highScore); }
        }
    }

    // Keyboard input handled in update (not in attachEvents to avoid double-fire)
    const keyCodes = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
        'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9'];
    const keyLocks = {};

    function handleKeys() {
        for (let k = 0; k < 9; k++) {
            const code1 = `Digit${k + 1}`, code2 = `Numpad${k + 1}`;
            const pressed = input.isPressed(code1) || input.isPressed(code2);
            if (pressed && !keyLocks[k]) { keyLocks[k] = true; if (state === S.WAITING) tapNode(k); }
            if (!pressed) keyLocks[k] = false;
        }
        // R = restart after game over
        if (input.isPressed('KeyR') && !keyLocks['r'] && state === S.OVER) {
            keyLocks['r'] = true; startGame();
        }
        if (!input.isPressed('KeyR')) keyLocks['r'] = false;
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        handleKeys();

        // Sequence show logic
        if (state === S.SHOWING) {
            if (nodes[sequence[showStep]]?.lit > 0) {
                nodes[sequence[showStep]].lit--;
                if (nodes[sequence[showStep]].lit === 0 && showStep < sequence.length - 1) {
                    showStep++;
                    showHoldLeft = SHOW_GAP;
                }
                if (nodes[sequence[showStep]]?.lit === 0 && showStep === sequence.length - 1) {
                    // Done showing — small gap then player's turn
                    setTimeout(() => { state = S.WAITING; }, 300);
                }
            } else if (showHoldLeft > 0) {
                showHoldLeft--;
                if (showHoldLeft === 0) nodes[sequence[showStep]].lit = SHOW_HOLD;
            } else {
                // Start showing first node
                nodes[sequence[0]].lit = SHOW_HOLD;
            }
        }

        // Correct flash
        if (state === S.CORRECT) {
            postFlashTimer--;
            if (postFlashTimer <= 0) { nodes.forEach(n => { n.correct = false; }); nextRound(); }
        }

        // Wrong → game over
        if (state === S.WRONG) {
            overTimer++;
            if (overTimer > 70) state = S.OVER;
        }

        // Decay flash
        nodes.forEach(n => { if (n.flash > 0) n.flash--; });
    }

    // ── DRAW ─────────────────────────────────────────────────
    function draw() {
        // BG
        ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const amb = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60, canvas.width / 2, canvas.height / 2, 400);
        amb.addColorStop(0, 'rgba(50,0,80,0.2)'); amb.addColorStop(1, 'transparent');
        ctx.fillStyle = amb; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid border
        ctx.strokeStyle = 'rgba(150,150,255,0.12)'; ctx.lineWidth = 1;
        const g = cellSz * GRID;
        ctx.strokeRect(ox, oy, g, g);
        for (let k = 1; k < GRID; k++) {
            ctx.beginPath(); ctx.moveTo(ox + k * cellSz, oy); ctx.lineTo(ox + k * cellSz, oy + g); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ox, oy + k * cellSz); ctx.lineTo(ox + g, oy + k * cellSz); ctx.stroke();
        }

        // Nodes
        nodes.forEach(n => {
            const cx = n.x + n.w / 2, cy = n.y + n.h / 2, r = Math.min(n.w, n.h) / 2 - 2;
            const isLit = n.lit > 0;
            const isTap = n.flash > 0;
            const isOk = n.correct;
            const isBad = n.wrong;
            const frac = n.flash / 18;

            let ringCol = n.col, fillAlpha = 0.07, glowR = 0, lineW = 1.5;
            let fillCol = n.col;

            if (isLit) { fillAlpha = 0.9; glowR = 35; lineW = 3; }
            else if (isBad) { fillCol = '#ff2244'; fillAlpha = 0.7; glowR = 30; }
            else if (isOk) { fillCol = '#00ff88'; fillAlpha = 0.5; glowR = 20; ringCol = '#00ff88'; }
            else if (isTap) { fillAlpha = 0.15 + 0.55 * frac; glowR = 12 * frac; }

            // Shadow
            ctx.shadowBlur = glowR; ctx.shadowColor = fillCol;
            // Ring
            ctx.strokeStyle = ringCol; ctx.lineWidth = lineW;
            ctx.globalAlpha = isLit || isBad || isOk || isTap ? 1 : 0.3;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            // Fill
            ctx.globalAlpha = fillAlpha;
            ctx.fillStyle = fillCol;
            ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;

            // Label
            ctx.fillStyle = '#fff'; ctx.globalAlpha = isLit || isBad || isOk || isTap ? 1 : 0.28;
            ctx.font = `bold ${Math.floor(r * 0.72)}px Orbitron`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(LABELS[n.idx], cx, cy);
            ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
        });

        // Status text
        ctx.textAlign = 'center';
        const topY = oy - 28, botY = oy + GRID * cellSz + 24;
        if (state === S.SHOWING) {
            ctx.fillStyle = '#aaaaee'; ctx.font = '13px Orbitron';
            ctx.fillText('👁  WATCH THE SEQUENCE...', canvas.width / 2, topY);
        } else if (state === S.WAITING) {
            const left = sequence.length - playerIdx;
            ctx.fillStyle = '#00ff88'; ctx.font = '13px Orbitron';
            ctx.fillText(`YOUR TURN — tap ${left} more node${left !== 1 ? 's' : ''}`, canvas.width / 2, topY);
            ctx.fillStyle = 'rgba(180,180,255,0.3)'; ctx.font = '11px Orbitron';
            ctx.fillText('keys 1–9 or click a node', canvas.width / 2, botY);
        } else if (state === S.CORRECT) {
            ctx.fillStyle = '#00ff88'; ctx.font = 'bold 18px Orbitron';
            ctx.fillText('✔ PERFECT!', canvas.width / 2, topY);
        } else if (state === S.WRONG) {
            ctx.fillStyle = '#ff2244'; ctx.font = 'bold 17px Orbitron';
            ctx.fillText('✘ WRONG NODE', canvas.width / 2, topY);
        } else if (state === S.OVER) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff2244'; ctx.font = 'bold 30px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText('SEQUENCE BROKEN', canvas.width / 2, canvas.height / 2 - 45);
            ctx.fillStyle = '#fff'; ctx.font = '16px Orbitron';
            ctx.fillText(`Round ${round} reached`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: Round ${highScore}`, canvas.width / 2, canvas.height / 2 + 28);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('Press R or close to restart', canvas.width / 2, canvas.height / 2 + 58);
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._echoClick) {
            canvas.removeEventListener('click', canvas._echoClick);
            canvas.removeEventListener('touchstart', canvas._echoClick);
        }
    }
    return { init, destroy };
})();
