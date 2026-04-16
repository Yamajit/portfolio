/* ============================================================
   GAME: Fruit Catcher — Catch falling fruits, dodge bombs!
   Move basket with ←→ / WASD or drag on mobile.
   Controls: ←→ / WASD / Touch drag
   ============================================================ */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let animId, keys = {};

    const FRUITS = [
        { icon: '🍎', pts: 10, col: '#ff4d6d' },
        { icon: '🍋', pts: 15, col: '#ffe066' },
        { icon: '🍇', pts: 20, col: '#cc00ff' },
        { icon: '🍊', pts: 10, col: '#ffaa00' },
        { icon: '🍓', pts: 25, col: '#ff6688' },
        { icon: '🫐', pts: 30, col: '#6677ff' },
    ];
    const BOMB = { icon: '💣', col: '#555' };

    let basket, items, particles, score, hiScore, lives, frame, state, combo;
    let spawnTimer, speed;

    function reset() {
        basket = { x: canvas.width / 2, y: canvas.height - 46, w: 80, h: 28, speed: 7 };
        items = []; particles = []; score = 0; lives = 3; frame = 0; combo = 0;
        spawnTimer = 0; speed = 2.8; state = 'playing';
        hiScore = parseInt(localStorage.getItem('gz-fruitcatcher-hi') || '0');
    }

    function spawnItem() {
        const isBomb = Math.random() < 0.2;
        const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        const obj = isBomb ? { ...BOMB, isBomb: true } : { ...fruit, isBomb: false };
        obj.x = 30 + Math.random() * (canvas.width - 60);
        obj.y = -30;
        obj.r = 20;
        obj.vy = speed + Math.random() * 1.5;
        items.push(obj);
    }

    function burst(x, y, col, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
            particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 32, max: 32 });
        }
        // score popup
        particles.push({ x, y, vx: 0, vy: -1.8, col: col, text: `+${combo > 2 ? combo * 10 : ''}`, life: 45, max: 45, isText: true });
    }

    function init(c, s, a, i) {
        canvas = c; scoreEl = s; audio = a; input = i;
        ctx = canvas.getContext('2d'); keys = {};

        document.addEventListener('keydown', canvas._fcKD = e => { keys[e.code] = true; });
        document.addEventListener('keyup', canvas._fcKU = e => { keys[e.code] = false; });

        // Drag for mobile
        let dragX = null;
        canvas.addEventListener('touchmove', canvas._fcTM = e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            basket.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        }, { passive: false });

        canvas.addEventListener('click', canvas._fcClick = () => { if (state === 'gameover') reset(); });

        reset();
        if (animId) cancelAnimationFrame(animId);
        loop();
    }

    function update() {
        if (window.gamePaused) return;
        if (state === 'gameover') return;
        frame++;
        speed = Math.min(8, 2.8 + score * 0.003);

        const left = keys['ArrowLeft'] || keys['KeyA'] || input?.left;
        const right = keys['ArrowRight'] || keys['KeyD'] || input?.right;
        if (left) basket.x = Math.max(basket.w / 2 + 4, basket.x - basket.speed);
        if (right) basket.x = Math.min(canvas.width - basket.w / 2 - 4, basket.x + basket.speed);

        spawnTimer++;
        const spawnInt = Math.max(28, 70 - Math.floor(score / 80) * 5);
        if (spawnTimer >= spawnInt) { spawnItem(); spawnTimer = 0; }

        items.forEach(it => { it.y += it.vy; });

        // Catch
        items.forEach(it => {
            if (it.caught || it.missed) return;
            if (it.y + it.r > basket.y && it.y < basket.y + basket.h &&
                it.x > basket.x - basket.w / 2 - it.r && it.x < basket.x + basket.w / 2 + it.r) {
                it.caught = true;
                if (it.isBomb) {
                    lives--; combo = 0;
                    burst(it.x, it.y, '#ff4d6d', 12);
                    audio.playSound('thud');
                    if (lives <= 0) { state = 'gameover'; if (score > hiScore) { hiScore = score; localStorage.setItem('gz-fruitcatcher-hi', hiScore); } }
                } else {
                    combo++;
                    const pts = (it.pts || 10) * (combo > 3 ? 2 : 1);
                    score += pts;
                    burst(it.x, it.y, it.col, 10);
                    audio.playSound('score');
                }
            }
            if (it.y > canvas.height + 30 && !it.caught) {
                if (!it.isBomb) { combo = 0; } // reset combo on miss
                it.missed = true;
            }
        });

        items = items.filter(it => !it.caught && !it.missed);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (!p.isText) p.vy += 0.07; p.life--; });
        particles = particles.filter(p => p.life > 0);

        scoreEl.textContent = `Score: ${score}  Best: ${hiScore}  ❤️ ${lives}${combo > 2 ? '  🔥' + combo + 'x!' : ''}`;
    }

    function draw() {
        ctx.fillStyle = '#050518'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bg gradient
        const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bg.addColorStop(0, '#050518'); bg.addColorStop(1, '#080830');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = 'rgba(0,100,200,0.08)'; ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        // Items
        items.forEach(it => {
            ctx.font = `${it.r * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(it.icon, it.x, it.y);
            // Shadow glow
            ctx.shadowBlur = 10; ctx.shadowColor = it.col || '#ff4d6d';
            ctx.font = `${it.r * 2}px sans-serif`;
            ctx.globalAlpha = 0.4; ctx.fillText(it.icon, it.x, it.y);
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        });

        // Basket
        const bx = basket.x, by = basket.y, bw = basket.w, bh = basket.h;
        const bg2 = ctx.createLinearGradient(bx - bw / 2, by, bx + bw / 2, by);
        bg2.addColorStop(0, 'rgba(0,180,255,0.4)');
        bg2.addColorStop(0.5, 'rgba(0,220,255,0.85)');
        bg2.addColorStop(1, 'rgba(0,180,255,0.4)');
        ctx.fillStyle = bg2; ctx.shadowBlur = 16; ctx.shadowColor = '#00d4ff';
        ctx.beginPath(); ctx.roundRect(bx - bw / 2, by, bw, bh, [0, 0, 10, 10]); ctx.fill();
        ctx.shadowBlur = 0;
        // Basket pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
        for (let i = 1; i < 4; i++) {
            const lx = bx - bw / 2 + (bw / 4) * i;
            ctx.beginPath(); ctx.moveTo(lx, by); ctx.lineTo(lx, by + bh); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(bx - bw / 2, by + bh / 2); ctx.lineTo(bx + bw / 2, by + bh / 2); ctx.stroke();

        // Particles
        particles.forEach(p => {
            if (p.isText && p.text) {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = '#ffe066';
                ctx.font = 'bold 15px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Combo
        if (combo >= 3) {
            ctx.fillStyle = '#ffe066'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffe066';
            ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`🔥 ${combo}× COMBO!`, canvas.width - 12, 8); ctx.shadowBlur = 0;
        }

        // Lives
        ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (let i = 0; i < 3; i++) ctx.fillText(i < lives ? '❤️' : '🖤', 10 + i * 26, 8);

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('← → to move basket  ·  Catch fruits, dodge 💣 bombs!  ·  3+ combo = 2× points', canvas.width / 2, canvas.height - 10);

        if (state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 28px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('💣 BOOM!', canvas.width / 2, canvas.height / 2 - 36);
            ctx.fillStyle = '#fff'; ctx.font = '17px Orbitron';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 2);
            ctx.fillStyle = '#ffe066'; ctx.font = '13px Orbitron';
            ctx.fillText(`Best: ${hiScore}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = '#888'; ctx.font = '12px Orbitron';
            ctx.fillText('[CLICK] to try again', canvas.width / 2, canvas.height / 2 + 58);
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
        document.removeEventListener('keydown', canvas._fcKD);
        document.removeEventListener('keyup', canvas._fcKU);
        if (canvas._fcTM) canvas.removeEventListener('touchmove', canvas._fcTM);
        if (canvas._fcClick) canvas.removeEventListener('click', canvas._fcClick);
    }
    return { init, destroy };
})();
