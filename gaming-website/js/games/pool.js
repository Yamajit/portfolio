/* GAME: 8-Ball Pool */
window.GameModule = (function () {
    let canvas, ctx, scoreEl, audio, input;
    let gameLoop, score;
    let playing = false;

    // Physics
    const friction = 0.985;
    const tableRect = { x: 100, y: 100, w: 600, h: 300 };

    let cueBall = { x: 200, y: 250, r: 10, vx: 0, vy: 0, color: '#fff' };
    let balls = []; // 1-15
    let dragStart = null;
    let dragEnd = null;

    function init(c, s, a, i) {
        canvas = c;
        scoreEl = s;
        ctx = canvas.getContext('2d');
        audio = a;
        input = i;

        const pad = 50;
        tableRect.x = pad;
        tableRect.y = pad;
        tableRect.w = canvas.width - pad * 2;
        tableRect.h = canvas.height - pad * 2;

        reset();
        canvas.addEventListener('mousedown', handleDown);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('mouseup', handleUp);
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleDown(e.touches[0]);
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleMove(e.touches[0]);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            handleUp(e);
        });

        if (gameLoop) cancelAnimationFrame(gameLoop);
        loop();
    }

    function reset() {
        score = 0;
        // Rack balls
        balls = [];
        const startX = tableRect.x + tableRect.w * 0.75;
        const startY = tableRect.y + tableRect.h / 2;
        const r = 10;

        let id = 1;
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row <= col; row++) {
                const x = startX + col * (r * 2 + 1);
                const y = startY - (col * r) + (row * r * 2);
                balls.push({ x, y, r, vx: 0, vy: 0, color: getColor(id), id: id });
                id++;
            }
        }

        cueBall.x = tableRect.x + tableRect.w * 0.25;
        cueBall.y = tableRect.y + tableRect.h / 2;
        cueBall.vx = 0;
        cueBall.vy = 0;
        cueBall.active = true;

        playing = true;
    }

    function getColor(id) {
        if (id === 8) return '#000';
        const cols = ['#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#22c55e', '#881337'];
        return cols[(id - 1) % cols.length];
    }

    function handleDown(e) {
        if (!playing) return;
        // Check if all balls stopped
        if (isMoving()) return;

        const rect = canvas.getBoundingClientRect();
        dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        dragEnd = dragStart;
    }

    function handleMove(e) {
        if (!dragStart) return;
        const rect = canvas.getBoundingClientRect();
        dragEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handleUp(e) {
        if (!dragStart) return;
        const dx = dragStart.x - dragEnd.x;
        const dy = dragStart.y - dragEnd.y;
        const power = Math.min(30, Math.sqrt(dx * dx + dy * dy) * 0.1);
        const angle = Math.atan2(dy, dx);

        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
        audio.playSound('shoot');

        dragStart = null;
    }

    function isMoving() {
        if (Math.abs(cueBall.vx) > 0.1 || Math.abs(cueBall.vy) > 0.1) return true;
        return balls.some(b => Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1);
    }

    function update() {
        if (!playing) return;

        const allBalls = [cueBall, ...balls];

        allBalls.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;
            b.vx *= friction;
            b.vy *= friction;
            if (Math.abs(b.vx) < 0.05) b.vx = 0;
            if (Math.abs(b.vy) < 0.05) b.vy = 0;

            // Wall bounce
            if (b.x < tableRect.x + b.r) { b.x = tableRect.x + b.r; b.vx *= -0.8; }
            if (b.x > tableRect.x + tableRect.w - b.r) { b.x = tableRect.x + tableRect.w - b.r; b.vx *= -0.8; }
            if (b.y < tableRect.y + b.r) { b.y = tableRect.y + b.r; b.vy *= -0.8; }
            if (b.y > tableRect.y + tableRect.h - b.r) { b.y = tableRect.y + tableRect.h - b.r; b.vy *= -0.8; }
        });

        // Ball-Ball Collision (Simplified)
        for (let i = 0; i < allBalls.length; i++) {
            for (let j = i + 1; j < allBalls.length; j++) {
                const b1 = allBalls[i];
                const b2 = allBalls[j];
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < b1.r + b2.r) {
                    // Collision!
                    audio.playSound('click');
                    // Simple elastic collision response
                    const angle = Math.atan2(dy, dx);
                    const tx = b1.x + Math.cos(angle) * (b1.r + b2.r);
                    const ty = b1.y + Math.sin(angle) * (b1.r + b2.r);

                    const ax = (tx - b2.x) * 0.1; // push apart
                    const ay = (ty - b2.y) * 0.1;

                    b1.vx -= ax;
                    b1.vy -= ay;
                    b2.vx += ax;
                    b2.vy += ay;
                }
            }
        }

        // Check Pockets (Corners)
        balls.forEach((b, i) => {
            // simplified pockets
            const pockets = [
                { x: tableRect.x, y: tableRect.y },
                { x: tableRect.x + tableRect.w, y: tableRect.y },
                { x: tableRect.x, y: tableRect.y + tableRect.h },
                { x: tableRect.x + tableRect.w, y: tableRect.y + tableRect.h }
            ];
            pockets.forEach(p => {
                const d = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
                if (d < 30) {
                    // Sunk
                    balls.splice(i, 1);
                    score++;
                    audio.playSound('score');
                }
            });
        });

        scoreEl.textContent = `Balls Sunk: ${score}`;
    }

    function draw() {
        // Table
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height); // floor

        ctx.fillStyle = '#065f46'; // Felt green
        ctx.fillRect(tableRect.x, tableRect.y, tableRect.w, tableRect.h);

        // Pockets
        ctx.fillStyle = '#000';
        const pockets = [
            { x: tableRect.x, y: tableRect.y },
            { x: tableRect.x + tableRect.w, y: tableRect.y },
            { x: tableRect.x, y: tableRect.y + tableRect.h },
            { x: tableRect.x + tableRect.w, y: tableRect.y + tableRect.h },
            { x: tableRect.x + tableRect.w / 2, y: tableRect.y },
            { x: tableRect.x + tableRect.w / 2, y: tableRect.y + tableRect.h }
        ];
        pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
            ctx.fill();
        });

        // Balls
        [...balls, cueBall].forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Cue Stick
        if (dragStart && !isMoving()) {
            ctx.beginPath();
            ctx.moveTo(cueBall.x, cueBall.y);
            // Draw stick opposite to drag
            const dx = dragStart.x - dragEnd.x;
            const dy = dragStart.y - dragEnd.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            const stickLen = 200;
            // Draw aiming line
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([5, 5]);
            ctx.lineTo(cueBall.x + Math.cos(angle) * 100, cueBall.y + Math.sin(angle) * 100);
            ctx.stroke();

            // Stick
            ctx.setLineDash([]);
            ctx.strokeStyle = '#d4d4d8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            const sx = cueBall.x - Math.cos(angle) * (20 + len / 2);
            const sy = cueBall.y - Math.sin(angle) * (20 + len / 2);
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - Math.cos(angle) * stickLen, sy - Math.sin(angle) * stickLen);
            ctx.stroke();
        }
    }

    function loop() {
        update();
        draw();
        gameLoop = requestAnimationFrame(loop);
    }

    function destroy() {
        cancelAnimationFrame(gameLoop);
        // Cleanup global listeners if any
    }

    return { init, destroy };
})();
