/* ============================================================
   GAME: Bubble Burst — Click/tap rising bubbles before they escape!
   Controls: Mouse click / Touch tap on bubbles
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId;

    let bubbles, particles, score, hiScore, lives, frame;
    let comboCount, comboTimer, state, deadTimer;
    let missFlash = 0;

    const COLORS = [
        { fill: '#ff4d6d', glow: '#ff0044' },
        { fill: '#ffaa00', glow: '#ff7700' },
        { fill: '#00d4ff', glow: '#0088ff' },
        { fill: '#00ff88', glow: '#00cc44' },
        { fill: '#cc00ff', glow: '#8800cc' },
        { fill: '#ffe066', glow: '#ffcc00' },
    ];

    function mkBubble() {
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        const r = 22 + Math.random() * 24;
        const x = r + Math.random() * (canvas.width - r * 2);
        return {
            x, y: canvas.height + r + 10,
            r, col,
            vy: -(0.5 + Math.random() * 0.9 + frame * 0.0008),
            vx: (Math.random() - 0.5) * 0.6,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpd: 0.04 + Math.random() * 0.03,
            popping: false, popTimer: 0,
            value: Math.ceil(r / 8)
        };
    }

    function reset() {
        bubbles = []; particles = []; score = 0; lives = 5; frame = 0;
        comboCount = 0; comboTimer = 0; state = 'playing'; deadTimer = 0; missFlash = 0;
        hiScore = parseInt(localStorage.getItem('gz-bubble-hi') || '0');
    }

    // ── INIT ─────────────────────────────────────────────────
    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d');
        canvas._bbClick = handleClick;
        canvas.addEventListener('click', canvas._bbClick);
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            handleClick({ clientX: t.clientX, clientY: t.clientY, rect });
        }, { passive: false });
        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function handleClick(e) {
        if (window.gamePaused) return;
        if (state === 'gameover') { reset(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        let popped = false;
        // Find clicked bubble (top-most first)
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            if (b.popping) continue;
            if (Math.hypot(mx - b.x, my - b.y) < b.r + 4) {
                b.popping = true; b.popTimer = 0;
                comboCount++; comboTimer = 80;
                const pts = b.value * (comboCount >= 3 ? comboCount : 1);
                score += pts;
                spawnBurst(b.x, b.y, b.col.fill, 16, pts);
                audio.playSound('score');
                popped = true; break;
            }
        }
        if (!popped) {
            // Miss
            missFlash = 8;
        }
    }

    function spawnBurst(x, y, col, n, pts) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, col, life: 32, max: 32 });
        }
        if (pts !== undefined) particles.push({ x, y, vx: 0, vy: -1.2, col: '#fff', text: `+${pts}`, life: 45, max: 45, isText: true });
    }

    // ── UPDATE ────────────────────────────────────────────────
    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') { deadTimer++; return; }
        frame++;

        // Spawn
        const spawnRate = Math.max(28, 80 - Math.floor(frame / 120));
        if (frame % spawnRate === 0) bubbles.push(mkBubble());

        // Combo timer
        if (comboTimer > 0) comboTimer--; else comboCount = 0;
        if (missFlash > 0) missFlash--;

        // Move bubbles
        bubbles.forEach(b => {
            if (b.popping) { b.popTimer++; return; }
            b.wobble += b.wobbleSpd;
            b.x += Math.sin(b.wobble) * 0.8 + b.vx;
            b.y += b.vy;
        });

        // Remove popped bubbles after pop animation
        bubbles = bubbles.filter(b => {
            if (b.popping && b.popTimer > 12) return false;
            return true;
        });

        // Bubbles that escaped top
        bubbles = bubbles.filter(b => {
            if (!b.popping && b.y + b.r < 0) {
                lives--;
                missFlash = 12;
                audio.playSound('thud');
                if (lives <= 0) {
                    state = 'gameover';
                    if (score > hiScore) { hiScore = score; localStorage.setItem('gz-bubble-hi', hiScore); }
                }
                return false;
            }
            return true;
        });

        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (!p.isText) p.vy += 0.05;
            p.life--;
        });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  ❤️ ${lives}`;
    }

    // ── DRAW ──────────────────────────────────────────────────
    function draw() {
        const t = Date.now();
        // BG
        if (missFlash > 0) {
            ctx.fillStyle = `rgba(255,30,30,${missFlash * 0.04})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, '#050520'); sky.addColorStop(1, '#0a0520');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Top danger zone
        ctx.fillStyle = 'rgba(255,50,50,0.08)';
        ctx.fillRect(0, 0, canvas.width, 48);
        ctx.strokeStyle = 'rgba(255,50,50,0.4)'; ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(canvas.width, 48); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,80,80,0.5)'; ctx.font = '10px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('⚠ DANGER ZONE — don\'t let bubbles escape!', canvas.width / 2, 4);

        // Bubbles
        bubbles.forEach(b => {
            const pop = b.popTimer / 12;
            const r = b.popping ? b.r * (1 + pop * 0.5) : b.r;
            ctx.globalAlpha = b.popping ? (1 - pop) : 1;

            // Shadow / glow
            ctx.shadowBlur = 18; ctx.shadowColor = b.col.glow;

            // Gradient bubble
            const bg = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
            bg.addColorStop(0, 'rgba(255,255,255,0.55)');
            bg.addColorStop(0.4, b.col.fill + 'cc');
            bg.addColorStop(1, b.col.glow + '88');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath(); ctx.ellipse(b.x - r * 0.28, b.y - r * 0.3, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Particles
        particles.forEach(p => {
            if (p.isText) {
                ctx.globalAlpha = p.life / p.max;
                ctx.fillStyle = p.col; ctx.font = 'bold 18px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Lives
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i < lives ? '#ff4d6d' : 'rgba(255,255,255,0.1)';
            ctx.font = '18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText('❤️', 12 + i * 26, 54);
        }

        // Combo
        if (comboCount >= 2) {
            const comboCol = ['', '', '#ffe066', '#ffaa00', '#ff4488', '#cc00ff'][Math.min(comboCount, 5)] || '#cc00ff';
            ctx.fillStyle = comboCol; ctx.shadowBlur = 14; ctx.shadowColor = comboCol;
            ctx.font = 'bold 20px Orbitron'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`${comboCount}× COMBO!`, canvas.width - 12, 54);
            ctx.shadowBlur = 0;
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('🖱 CLICK bubbles before they float away!  ·  Pop fast for combo multiplier 🔥', canvas.width / 2, canvas.height - 10);

        // Game Over
        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 32px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💨 ALL ESCAPED!', canvas.width / 2, canvas.height / 2 - 44);
            ctx.fillStyle = '#fff'; ctx.font = '18px Orbitron';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '14px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 32);
            ctx.fillStyle = '#888'; ctx.font = '13px Orbitron';
            ctx.fillText('[CLICK] to pop again!', canvas.width / 2, canvas.height / 2 + 62);
        }

        if (window.gamePaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.textBaseline = 'alphabetic';
        }
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    function destroy() {
        cancelAnimationFrame(animId);
        if (canvas._bbClick) {
            canvas.removeEventListener('click', canvas._bbClick);
        }
    }
    return { init, destroy };
})();
