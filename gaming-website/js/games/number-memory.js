/* ============================================================
   NUMBER MEMORY — Flash a number, then reproduce it from memory
   ============================================================ */
window.GameModule = (() => {
    let canvas, ctx, scoreEl, audioRef;
    let animId = null;
    let running = false;

    const PHASES = { SHOW: 'show', INPUT: 'input', FEEDBACK: 'feedback', GAMEOVER: 'gameover' };
    let phase, level, score, lives;
    let currentNumber = '', userInput = '';
    let showTimer = 0, feedbackTimer = 0, feedbackOk = false, frameCount = 0;

    function generateNumber(digits) {
        let num = (Math.floor(Math.random() * 9) + 1).toString();
        for (let i = 1; i < digits; i++) num += Math.floor(Math.random() * 10);
        return num;
    }

    function startRound() {
        currentNumber = generateNumber(level + 2);
        userInput = '';
        showTimer = Math.max(40, 80 - level * 5);
        phase = PHASES.SHOW;
    }

    function drawBg() {
        ctx.fillStyle = '#060614';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawHeader() {
        const cx = canvas.width / 2;
        ctx.font = 'bold 15px Orbitron, monospace';
        ctx.textAlign = 'left'; ctx.fillStyle = '#ff4d6d';
        ctx.fillText('❤️'.repeat(lives), 12, 28);
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffe066';
        ctx.fillText('LEVEL ' + level, cx, 28);
        ctx.textAlign = 'right'; ctx.fillStyle = '#00d4ff';
        ctx.fillText('SCORE ' + score, canvas.width - 12, 28);
    }

    function drawShow() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const maxShow = Math.max(40, 80 - level * 5);
        ctx.font = '14px Orbitron, monospace';
        ctx.fillStyle = '#00d4ff'; ctx.textAlign = 'center';
        ctx.fillText('MEMORIZE THIS NUMBER!', cx, cy - 80);
        const fs = Math.max(28, Math.min(72, 280 / currentNumber.length));
        ctx.font = `bold ${fs}px Orbitron, monospace`;
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 25;
        ctx.fillText(currentNumber, cx, cy + fs / 3);
        ctx.shadowBlur = 0;
        const barW = canvas.width * 0.6, barX = cx - barW / 2, barY = cy + 80;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, 10, 5); ctx.fill();
        const prog = showTimer / maxShow;
        ctx.fillStyle = prog > 0.4 ? '#00d4ff' : '#ff9900';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW * prog, 10, 5); ctx.fill();
    }

    function drawInput() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.font = '14px Orbitron, monospace';
        ctx.fillStyle = '#00ff88'; ctx.textAlign = 'center';
        ctx.fillText('WHAT WAS THE NUMBER?', cx, cy - 90);
        const disp = userInput || '▋';
        const fs = Math.max(28, Math.min(70, 280 / Math.max(currentNumber.length, 1)));
        ctx.font = `bold ${fs}px Orbitron, monospace`;
        ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18;
        ctx.fillText(disp, cx, cy + fs / 3);
        ctx.shadowBlur = 0;
        // Numpad
        const btnSz = Math.min(46, (canvas.width - 80) / 4);
        const npX = cx - (btnSz * 3 + 20) / 2, npY = cy + 100;
        const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'];
        nums.forEach((n, i) => {
            const c = i % 3, r = Math.floor(i / 3);
            const bx = npX + c * (btnSz + 10), by = npY + r * (btnSz + 10);
            ctx.beginPath(); ctx.roundRect(bx, by, btnSz, btnSz, 8);
            ctx.fillStyle = n === '✔' ? 'rgba(0,255,136,0.2)' : n === '⌫' ? 'rgba(255,77,109,0.2)' : 'rgba(0,212,255,0.1)';
            ctx.strokeStyle = n === '✔' ? '#00ff88' : n === '⌫' ? '#ff4d6d' : 'rgba(0,212,255,0.3)';
            ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
            ctx.font = `bold ${btnSz * 0.4}px Orbitron, monospace`;
            ctx.fillStyle = n === '✔' ? '#00ff88' : n === '⌫' ? '#ff4d6d' : '#fff';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(n, bx + btnSz / 2, by + btnSz / 2);
        });
        ctx.textBaseline = 'alphabetic';
    }

    function drawFeedback() {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        if (feedbackOk) {
            ctx.font = 'bold 34px Orbitron, monospace';
            ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 25;
            ctx.textAlign = 'center'; ctx.fillText('✅ CORRECT!', cx, cy);
            ctx.shadowBlur = 0;
            ctx.font = '16px Orbitron, monospace'; ctx.fillStyle = '#00d4ff';
            ctx.fillText('+' + (level * 50) + ' pts', cx, cy + 40);
        } else {
            ctx.font = 'bold 34px Orbitron, monospace';
            ctx.fillStyle = '#ff4d6d'; ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 25;
            ctx.textAlign = 'center'; ctx.fillText('❌ WRONG!', cx, cy - 40);
            ctx.shadowBlur = 0;
            ctx.font = '14px Orbitron, monospace'; ctx.fillStyle = '#fff';
            ctx.fillText('Number was: ' + currentNumber, cx, cy + 10);
            ctx.fillStyle = '#ff9900'; ctx.fillText('You typed: ' + userInput, cx, cy + 40);
        }
    }

    function submit() {
        feedbackOk = userInput === currentNumber;
        feedbackTimer = 80; phase = PHASES.FEEDBACK;
        if (feedbackOk) { score += level * 50; level++; if (scoreEl) scoreEl.textContent = 'Score: ' + score; }
        else {
            lives--;
            if (lives <= 0) {
                window.gamePaused = true;
                setTimeout(() => {
                    const ov = document.getElementById('game-ui-overlay');
                    if (ov) {
                        document.getElementById('overlay-title').textContent = 'GAME OVER';
                        document.getElementById('overlay-message').textContent = 'Score: ' + score;
                        ov.classList.remove('hidden');
                    }
                }, 500);
            }
        }
    }

    function handleKey(key) {
        if (phase !== PHASES.INPUT) return;
        if (key >= '0' && key <= '9') { if (userInput.length < 12) userInput += key; }
        else if (key === 'Backspace') userInput = userInput.slice(0, -1);
        else if (key === 'Enter' && userInput.length > 0) submit();
    }

    function handleClick(ex, ey) {
        if (phase !== PHASES.INPUT) return;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const btnSz = Math.min(46, (canvas.width - 80) / 4);
        const npX = cx - (btnSz * 3 + 20) / 2, npY = cy + 100;
        const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'];
        nums.forEach((n, i) => {
            const c = i % 3, r = Math.floor(i / 3);
            const bx = npX + c * (btnSz + 10), by = npY + r * (btnSz + 10);
            if (ex >= bx && ex <= bx + btnSz && ey >= by && ey <= by + btnSz) {
                if (n === '⌫') userInput = userInput.slice(0, -1);
                else if (n === '✔') { if (userInput.length > 0) submit(); }
                else { if (userInput.length < 12) userInput += n; }
            }
        });
    }

    function update() {
        frameCount++;
        if (phase === PHASES.SHOW) { showTimer--; if (showTimer <= 0) { phase = PHASES.INPUT; userInput = ''; } }
        else if (phase === PHASES.FEEDBACK) { feedbackTimer--; if (feedbackTimer <= 0 && lives > 0) startRound(); }
    }

    function loop() {
        if (!running) return;
        if (!window.gamePaused) update();
        drawBg(); drawHeader();
        if (phase === PHASES.SHOW) drawShow();
        else if (phase === PHASES.INPUT) drawInput();
        else if (phase === PHASES.FEEDBACK) drawFeedback();
        animId = requestAnimationFrame(loop);
    }

    return {
        init(c, s, audio) {
            canvas = c; scoreEl = s; audioRef = audio;
            ctx = canvas.getContext('2d');
            score = 0; lives = 3; level = 1; frameCount = 0;
            running = true; startRound();
            window.__nmKey = e => handleKey(e.key);
            window.addEventListener('keydown', window.__nmKey);
            window.__nmClick = e => {
                const r = canvas.getBoundingClientRect();
                handleClick((e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height);
            };
            canvas.addEventListener('click', window.__nmClick);
            canvas.addEventListener('touchend', e => {
                e.preventDefault();
                const r = canvas.getBoundingClientRect(), t = e.changedTouches[0];
                handleClick((t.clientX - r.left) * canvas.width / r.width, (t.clientY - r.top) * canvas.height / r.height);
            }, { passive: false });
            loop();
        },
        destroy() {
            running = false;
            if (animId) cancelAnimationFrame(animId);
            if (window.__nmKey) window.removeEventListener('keydown', window.__nmKey);
            if (window.__nmClick) canvas.removeEventListener('click', window.__nmClick);
        }
    };
})();
