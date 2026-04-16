// ==========================================
// NAVIGATION SCROLL EFFECT
// ==========================================
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// ==========================================
// HAMBURGER MENU
// ==========================================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Close menu when a link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ==========================================
// ACTIVE NAVIGATION LINK HIGHLIGHTING
// ==========================================
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ==========================================
// SMOOTH SCROLL FOR NAVIGATION LINKS
// ==========================================
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = targetSection.offsetTop - navbarHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    });
});

// ==========================================
// SECTION REVEAL ANIMATIONS
// ==========================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal-section').forEach(el => {
    revealObserver.observe(el);
});

// ==========================================
// PROJECT CARD HOVER EFFECTS
// ==========================================
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.querySelectorAll('.shape, .mini-cube, .mini-sphere, .mini-capsule, .balloon, .hex').forEach(shape => {
            shape.style.animationPlayState = 'paused';
        });
    });
    card.addEventListener('mouseleave', () => {
        card.querySelectorAll('.shape, .mini-cube, .mini-sphere, .mini-capsule, .balloon, .hex').forEach(shape => {
            shape.style.animationPlayState = 'running';
        });
    });
});

// ==========================================
// CONTACT FORM HANDLING
// ==========================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #6366f1, #ec4899); color: white;
            padding: 2rem 3rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 10000; text-align: center; animation: fadeIn 0.3s ease;
        `;
        successMessage.innerHTML = `
            <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Message Received! 🎮</h3>
            <p style="margin-bottom: 0.5rem;">Thanks for reaching out, <strong>${name}</strong>!</p>
            <p style="opacity: 0.9;">I'll get back to you soon.</p>
        `;
        document.body.appendChild(successMessage);
        contactForm.reset();
        setTimeout(() => {
            successMessage.style.opacity = '0';
            successMessage.style.transition = 'all 0.3s ease';
            setTimeout(() => document.body.removeChild(successMessage), 300);
        }, 4000);
    });
}

// ==========================================
// SCROLL INDICATOR HIDE
// ==========================================
const scrollIndicator = document.querySelector('.scroll-indicator');
window.addEventListener('scroll', () => {
    if (scrollIndicator) {
        scrollIndicator.style.opacity = window.scrollY > 100 ? '0' : '1';
        scrollIndicator.style.pointerEvents = window.scrollY > 100 ? 'none' : 'auto';
    }
});

// ==========================================
// PARALLAX HERO
// ==========================================
const heroBg = document.querySelector('.hero-bg');
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    if (heroBg && scrolled < window.innerHeight) {
        heroBg.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// ==========================================
// HERO PARTICLE CANVAS
// ==========================================
const particleCanvas = document.getElementById('particleCanvas');
if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.hue = Math.random() > 0.5 ? 239 : 330;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > particleCanvas.width || this.y < 0 || this.y > particleCanvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 50; i++) particles.push(new Particle());

    function animateParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles.forEach(p => { p.update(); p.draw(); });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

// ==========================================
// DYNAMIC STYLES
// ==========================================
const dynamicStyle = document.createElement('style');
dynamicStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
`;
document.head.appendChild(dynamicStyle);

// ==========================================
// CONSOLE EASTER EGG
// ==========================================
console.log('%c🎮 Welcome to Nishant\'s Portfolio! 🎮', 'color: #6366f1; font-size: 20px; font-weight: bold;');
console.log('%cGame Developer | 2D/3D Artist | Unity Developer', 'color: #ec4899; font-size: 14px;');

function loadGameIframe(url, titleKey) {
    const titles = {
        'pixel_cut': '⚔️ Pixel Cut',
        'shadow_pulse': '🌑 Shadow Pulse',
        'space_shooter': '🚀 Space Shooter',
        'subway_surfer': '🏄 Subway Surfer Clone',
        'endless_runner': '🏃 Endless Runner'
    };

    const gameModalTitle = document.getElementById('gameModalTitle');
    const gameModalBody = document.getElementById('gameModalBody');

    gameModalTitle.textContent = titles[titleKey] || 'Game';

    // Clear previous content
    gameModalBody.innerHTML = '';

    // Create container for iframe to ensure proper sizing
    const container = document.createElement('div');
    container.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;';

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 8px; background: #000;';
    iframe.allowFullscreen = true;

    container.appendChild(iframe);
    gameModalBody.appendChild(container);

    // Focus iframe for keyboard controls
    iframe.onload = function () {
        if (iframe.contentWindow) {
            iframe.contentWindow.focus();
        }
    };
}

// ==============================================================
// ==============================================================
//                     PLAY NOW — GAME ENGINES
// ==============================================================
// ==============================================================

const gameModal = document.getElementById('gameModal');
const gameModalTitle = document.getElementById('gameModalTitle');
const gameModalBody = document.getElementById('gameModalBody');

let currentGame = null;
let gameInterval = null;

function openGame(gameType) {
    gameModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    currentGame = gameType;

    // Check for iframe games
    const iframeGames = {
        'pixel_cut': '../pixel_cut/index.html',
        'shadow_pulse': '../shadow-pulse/index.html',
        'space_shooter': '../space-shooter-runner/index.html',
        'subway_surfer': '../subway-surfer-clone/index.html',
        'endless_runner': '../endless-runner/index.html'
    };

    if (iframeGames[gameType]) {
        loadGameIframe(iframeGames[gameType], gameType);
        return;
    }

    if (gameType === 'snake') initSnake();
    else if (gameType === 'memory') initMemory();
    else if (gameType === 'tictactoe') initTicTacToe();
    else if (gameType === 'pong') initPong();
    else if (gameType === 'whack') initWhack();
    else if (gameType === 'breakout') initBreakout();
    else if (gameType === 'reaction') initReaction();
    else if (gameType === 'dino') initDino();
    else if (gameType === 'colormatch') initColorMatch();
    else if (gameType === 'shooter') initShooter();
    else if (gameType === 'escape') initEscape();
    else if (gameType === 'runner') initRunner();
    else if (gameType === 'flappy') initFlappy();
    else if (gameType === 'typing') initTyping();
    else if (gameType === 'simon') initSimon();
}

function toggleAllGames() {
    const hiddenGames = document.querySelectorAll('.hidden-game');
    const btn = document.getElementById('showAllGamesBtn');
    const isHidden = btn.textContent.includes('Show All');

    hiddenGames.forEach(game => {
        game.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            game.style.opacity = '0';
            setTimeout(() => game.style.opacity = '1', 50);
            game.style.transition = 'opacity 0.5s ease';
        }
    });

    btn.textContent = isHidden ? 'Show Less ▲' : 'Show All (15) ▼';
}

function closeGame() {
    gameModal.classList.remove('active');
    document.body.style.overflow = '';
    // Stop any running game loops
    if (window.gameInterval) clearInterval(window.gameInterval);
    if (window.animationId) cancelAnimationFrame(window.animationId); // for some games if used
    if (window.simonTimeout) clearTimeout(window.simonTimeout);
    gameModalBody.innerHTML = '';
    currentGame = null;
}

// Close on backdrop click
gameModal.addEventListener('click', (e) => {
    if (e.target === gameModal) closeGame();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameModal.classList.contains('active')) closeGame();
});

// ==========================================
// 🐍 SNAKE GAME
// ==========================================
function initSnake() {
    gameModalTitle.textContent = '🐍 Snake';
    const canvasSize = Math.min(400, window.innerWidth - 80);
    const gridSize = 20;
    const tileCount = canvasSize / gridSize;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="snakeScore">0</b></span>
            <span>Best: <b id="snakeBest">0</b></span>
        </div>
        <canvas id="snakeCanvas" width="${canvasSize}" height="${canvasSize}"></canvas>
        <p class="game-instructions">Swipe, D-Pad, or Arrow Keys / WASD</p>
        <div class="touch-dpad">
            <button class="touch-btn up" ontouchstart="snakeDir(0,-1)" onclick="snakeDir(0,-1)">▲</button>
            <button class="touch-btn left" ontouchstart="snakeDir(-1,0)" onclick="snakeDir(-1,0)">◀</button>
            <button class="touch-btn right" ontouchstart="snakeDir(1,0)" onclick="snakeDir(1,0)">▶</button>
            <button class="touch-btn down" ontouchstart="snakeDir(0,1)" onclick="snakeDir(0,1)">▼</button>
        </div>
        <button class="game-restart" onclick="initSnake()">Restart</button>
    `;

    const canvas = document.getElementById('snakeCanvas');
    const sctx = canvas.getContext('2d');

    let snake = [{ x: 10, y: 10 }];
    let food = spawnFood();
    let dx = 0, dy = 0;
    let score = 0;
    let best = parseInt(localStorage.getItem('snakeBest') || '0');
    let gameOver = false;

    document.getElementById('snakeBest').textContent = best;

    // Global direction setter for touch buttons
    window.snakeDir = function (ndx, ndy) {
        if (ndx === 1 && dx !== -1) { dx = 1; dy = 0; }
        else if (ndx === -1 && dx !== 1) { dx = -1; dy = 0; }
        else if (ndy === -1 && dy !== 1) { dx = 0; dy = -1; }
        else if (ndy === 1 && dy !== -1) { dx = 0; dy = 1; }
    };

    // Swipe support
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 20 && dx !== -1) { dx = 1; dy = 0; }
            else if (diffX < -20 && dx !== 1) { dx = -1; dy = 0; }
        } else {
            if (diffY > 20 && dy !== -1) { dx = 0; dy = 1; }
            else if (diffY < -20 && dy !== 1) { dx = 0; dy = -1; }
        }
        e.preventDefault();
    }, { passive: false });

    function spawnFood() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
        } while (snake.some(s => s.x === pos.x && s.y === pos.y));
        return pos;
    }

    function snakeKeyHandler(e) {
        if (currentGame !== 'snake') return;
        const key = e.key.toLowerCase();
        if ((key === 'arrowup' || key === 'w') && dy !== 1) { dx = 0; dy = -1; }
        else if ((key === 'arrowdown' || key === 's') && dy !== -1) { dx = 0; dy = 1; }
        else if ((key === 'arrowleft' || key === 'a') && dx !== 1) { dx = -1; dy = 0; }
        else if ((key === 'arrowright' || key === 'd') && dx !== -1) { dx = 1; dy = 0; }
        e.preventDefault();
    }
    document.addEventListener('keydown', snakeKeyHandler);

    function update() {
        if (gameOver) return;
        if (dx === 0 && dy === 0) return;

        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Wall collision
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            endSnake(); return;
        }
        // Self collision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            endSnake(); return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score++;
            document.getElementById('snakeScore').textContent = score;
            if (score > best) {
                best = score;
                localStorage.setItem('snakeBest', best);
                document.getElementById('snakeBest').textContent = best;
            }
            food = spawnFood();
        } else {
            snake.pop();
        }
    }

    function draw() {
        // Background
        sctx.fillStyle = '#0a0e1a';
        sctx.fillRect(0, 0, canvasSize, canvasSize);

        // Grid lines
        sctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
        for (let i = 0; i < tileCount; i++) {
            sctx.beginPath();
            sctx.moveTo(i * gridSize, 0);
            sctx.lineTo(i * gridSize, canvasSize);
            sctx.stroke();
            sctx.beginPath();
            sctx.moveTo(0, i * gridSize);
            sctx.lineTo(canvasSize, i * gridSize);
            sctx.stroke();
        }

        // Snake
        snake.forEach((seg, i) => {
            const progress = i / snake.length;
            const r = Math.round(99 - progress * 60);
            const g = Math.round(102 + progress * 100);
            const b = Math.round(241 - progress * 100);
            sctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            sctx.shadowColor = i === 0 ? 'rgba(99, 102, 241, 0.6)' : 'transparent';
            sctx.shadowBlur = i === 0 ? 12 : 0;
            sctx.beginPath();
            sctx.roundRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
            sctx.fill();
            sctx.shadowBlur = 0;
        });

        // Food
        sctx.fillStyle = '#ff2d87';
        sctx.shadowColor = 'rgba(255, 45, 135, 0.6)';
        sctx.shadowBlur = 12;
        sctx.beginPath();
        sctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
        sctx.fill();
        sctx.shadowBlur = 0;

        if (gameOver) {
            sctx.fillStyle = 'rgba(5, 8, 20, 0.75)';
            sctx.fillRect(0, 0, canvasSize, canvasSize);
            sctx.fillStyle = '#ff2d87';
            sctx.font = 'bold 28px Orbitron, sans-serif';
            sctx.textAlign = 'center';
            sctx.fillText('GAME OVER', canvasSize / 2, canvasSize / 2 - 10);
            sctx.fillStyle = '#cbd5e1';
            sctx.font = '16px Inter, sans-serif';
            sctx.fillText(`Score: ${score}`, canvasSize / 2, canvasSize / 2 + 25);
        }
    }

    function endSnake() {
        gameOver = true;
        document.removeEventListener('keydown', snakeKeyHandler);
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 120);
    draw();
}

// ==========================================
// 🧠 MEMORY MATCH GAME
// ==========================================
function initMemory() {
    gameModalTitle.textContent = '🧠 Memory Match';

    const emojis = ['🎮', '🚀', '⚡', '🔥', '💎', '🎯', '🌟', '🎪'];
    let cards = [...emojis, ...emojis];
    cards = cards.sort(() => Math.random() - 0.5);

    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let locked = false;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Moves: <b id="memMoves">0</b></span>
            <span>Pairs: <b id="memPairs">0</b>/8</span>
        </div>
        <div class="game-status" id="memStatus">Find all matching pairs!</div>
        <div class="memory-board" id="memBoard"></div>
        <button class="game-restart" onclick="initMemory()">Restart</button>
    `;

    const board = document.getElementById('memBoard');

    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.index = index;
        card.dataset.emoji = emoji;
        card.innerHTML = '<span class="card-back">?</span>';
        card.addEventListener('click', () => flipCard(card));
        board.appendChild(card);
    });

    function flipCard(card) {
        if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;

        card.classList.add('flipped');
        card.innerHTML = card.dataset.emoji;
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            moves++;
            document.getElementById('memMoves').textContent = moves;
            locked = true;

            if (flippedCards[0].dataset.emoji === flippedCards[1].dataset.emoji) {
                // Match!
                flippedCards.forEach(c => c.classList.add('matched'));
                matchedPairs++;
                document.getElementById('memPairs').textContent = matchedPairs;
                flippedCards = [];
                locked = false;

                if (matchedPairs === 8) {
                    document.getElementById('memStatus').textContent = `🎉 You won in ${moves} moves!`;
                    document.getElementById('memStatus').style.color = '#2dd4bf';
                }
            } else {
                // No match
                setTimeout(() => {
                    flippedCards.forEach(c => {
                        c.classList.remove('flipped');
                        c.innerHTML = '<span class="card-back">?</span>';
                    });
                    flippedCards = [];
                    locked = false;
                }, 800);
            }
        }
    }
}

// ==========================================
// ❌⭕ TIC-TAC-TOE GAME (vs AI)
// ==========================================
function initTicTacToe() {
    gameModalTitle.textContent = '❌⭕ Tic-Tac-Toe';

    let board = Array(9).fill('');
    let playerTurn = true; // X is player
    let gameActive = true;

    const winCombos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]          // diags
    ];

    gameModalBody.innerHTML = `
        <div class="game-status" id="tttStatus">Your turn (X)</div>
        <div class="ttt-board" id="tttBoard"></div>
        <button class="game-restart" onclick="initTicTacToe()">Restart</button>
    `;

    const boardEl = document.getElementById('tttBoard');

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'ttt-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        boardEl.appendChild(cell);
    }

    function handleCellClick(index) {
        if (!gameActive || !playerTurn || board[index] !== '') return;

        board[index] = 'X';
        renderBoard();

        const winner = checkWinner();
        if (winner) { endGame(winner); return; }
        if (board.every(c => c !== '')) { endGame('draw'); return; }

        playerTurn = false;
        document.getElementById('tttStatus').textContent = 'AI thinking...';

        setTimeout(() => {
            aiMove();
            renderBoard();
            const aiWinner = checkWinner();
            if (aiWinner) { endGame(aiWinner); return; }
            if (board.every(c => c !== '')) { endGame('draw'); return; }
            playerTurn = true;
            document.getElementById('tttStatus').textContent = 'Your turn (X)';
        }, 400);
    }

    function aiMove() {
        // Try to win
        for (let combo of winCombos) {
            const vals = combo.map(i => board[i]);
            if (vals.filter(v => v === 'O').length === 2 && vals.includes('')) {
                board[combo[vals.indexOf('')]] = 'O'; return;
            }
        }
        // Block player
        for (let combo of winCombos) {
            const vals = combo.map(i => board[i]);
            if (vals.filter(v => v === 'X').length === 2 && vals.includes('')) {
                board[combo[vals.indexOf('')]] = 'O'; return;
            }
        }
        // Take center
        if (board[4] === '') { board[4] = 'O'; return; }
        // Take corner
        const corners = [0, 2, 6, 8].filter(i => board[i] === '');
        if (corners.length > 0) {
            board[corners[Math.floor(Math.random() * corners.length)]] = 'O'; return;
        }
        // Take any
        const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
        if (empty.length > 0) {
            board[empty[Math.floor(Math.random() * empty.length)]] = 'O';
        }
    }

    function checkWinner() {
        for (let combo of winCombos) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], combo };
            }
        }
        return null;
    }

    function endGame(result) {
        gameActive = false;
        const statusEl = document.getElementById('tttStatus');
        if (result === 'draw') {
            statusEl.textContent = "It's a draw! 🤝";
            statusEl.style.color = '#ffd600';
        } else {
            if (result.winner === 'X') {
                statusEl.textContent = 'You win! 🎉';
                statusEl.style.color = '#2dd4bf';
            } else {
                statusEl.textContent = 'AI wins! 🤖';
                statusEl.style.color = '#ff2d87';
            }
            // Highlight winning cells
            result.combo.forEach(i => {
                boardEl.children[i].classList.add('win-cell');
            });
        }
    }

    function renderBoard() {
        const cells = boardEl.querySelectorAll('.ttt-cell');
        cells.forEach((cell, i) => {
            cell.textContent = board[i];
            cell.className = 'ttt-cell';
            if (board[i] === 'X') cell.classList.add('x-mark', 'taken');
            else if (board[i] === 'O') cell.classList.add('o-mark', 'taken');
        });
    }
}

// ==========================================
// 🏓 PONG GAME
// ==========================================
function initPong() {
    gameModalTitle.textContent = '🏓 Pong';
    const canvasW = Math.min(500, window.innerWidth - 80);
    const canvasH = Math.round(canvasW * 0.6);

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>You: <b id="pongPlayer">0</b></span>
            <span>CPU: <b id="pongCpu">0</b></span>
        </div>
        <canvas id="pongCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">W / S or ↑ / ↓ to move your paddle</p>
        <div class="touch-dpad" style="grid-template-areas: '. up .' '. down .';">
            <button class="touch-btn up" ontouchstart="pongInput(-1)" ontouchend="pongInput(0)" onmousedown="pongInput(-1)" onmouseup="pongInput(0)">▲</button>
            <button class="touch-btn down" ontouchstart="pongInput(1)" ontouchend="pongInput(0)" onmousedown="pongInput(1)" onmouseup="pongInput(0)">▼</button>
        </div>
        <button class="game-restart" onclick="initPong()">Restart</button>
    `;

    const canvas = document.getElementById('pongCanvas');
    const pctx = canvas.getContext('2d');

    const paddleW = 10, paddleH = 70;
    let playerY = canvasH / 2 - paddleH / 2;
    let cpuY = canvasH / 2 - paddleH / 2;
    let ballX = canvasW / 2, ballY = canvasH / 2;
    let ballSpeedX = 3.5, ballSpeedY = 2;
    let ballRadius = 6;
    let playerScore = 0, cpuScore = 0;
    let keysDown = {};
    let touchDir = 0;

    // Mobile input handler
    window.pongInput = function (dir) {
        touchDir = dir;
    };

    // Touchpad style control on canvas
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        playerY = touchY - paddleH / 2;
        playerY = Math.max(0, Math.min(canvasH - paddleH, playerY));
    }, { passive: false });

    function pongKeyDown(e) {
        if (currentGame !== 'pong') return;
        keysDown[e.key.toLowerCase()] = true;
        if (['arrowup', 'arrowdown', 'w', 's'].includes(e.key.toLowerCase())) e.preventDefault();
    }
    function pongKeyUp(e) {
        keysDown[e.key.toLowerCase()] = false;
    }
    document.addEventListener('keydown', pongKeyDown);
    document.addEventListener('keyup', pongKeyUp);

    function resetBall(dir) {
        ballX = canvasW / 2;
        ballY = canvasH / 2;
        ballSpeedX = 3.5 * dir;
        ballSpeedY = (Math.random() - 0.5) * 4;
    }

    function update() {
        // Player movement
        if (keysDown['w'] || keysDown['arrowup'] || touchDir === -1) playerY -= 5;
        if (keysDown['s'] || keysDown['arrowdown'] || touchDir === 1) playerY += 5;
        playerY = Math.max(0, Math.min(canvasH - paddleH, playerY));

        // CPU AI
        const cpuCenter = cpuY + paddleH / 2;
        if (cpuCenter < ballY - 15) cpuY += 3.2;
        else if (cpuCenter > ballY + 15) cpuY -= 3.2;
        cpuY = Math.max(0, Math.min(canvasH - paddleH, cpuY));

        // Ball
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        // Top/bottom
        if (ballY - ballRadius < 0 || ballY + ballRadius > canvasH) {
            ballSpeedY = -ballSpeedY;
            ballY = ballY - ballRadius < 0 ? ballRadius : canvasH - ballRadius;
        }

        // Player paddle
        if (ballX - ballRadius < paddleW + 15 &&
            ballY > playerY && ballY < playerY + paddleH &&
            ballSpeedX < 0) {
            ballSpeedX = -ballSpeedX * 1.05;
            ballSpeedY += (ballY - (playerY + paddleH / 2)) * 0.1;
        }

        // CPU paddle
        if (ballX + ballRadius > canvasW - paddleW - 15 &&
            ballY > cpuY && ballY < cpuY + paddleH &&
            ballSpeedX > 0) {
            ballSpeedX = -ballSpeedX * 1.05;
            ballSpeedY += (ballY - (cpuY + paddleH / 2)) * 0.1;
        }

        // Score
        if (ballX < 0) {
            cpuScore++;
            document.getElementById('pongCpu').textContent = cpuScore;
            resetBall(1);
        }
        if (ballX > canvasW) {
            playerScore++;
            document.getElementById('pongPlayer').textContent = playerScore;
            resetBall(-1);
        }

        // Cap speed
        const maxSpeed = 8;
        ballSpeedX = Math.max(-maxSpeed, Math.min(maxSpeed, ballSpeedX));
        ballSpeedY = Math.max(-maxSpeed, Math.min(maxSpeed, ballSpeedY));
    }

    function draw() {
        pctx.fillStyle = '#0a0e1a';
        pctx.fillRect(0, 0, canvasW, canvasH);

        // Center line
        pctx.setLineDash([8, 8]);
        pctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
        pctx.beginPath();
        pctx.moveTo(canvasW / 2, 0);
        pctx.lineTo(canvasW / 2, canvasH);
        pctx.stroke();
        pctx.setLineDash([]);

        // Paddles
        pctx.fillStyle = '#00d4ff';
        pctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        pctx.shadowBlur = 10;
        pctx.fillRect(15, playerY, paddleW, paddleH);

        pctx.fillStyle = '#ff2d87';
        pctx.shadowColor = 'rgba(255, 45, 135, 0.5)';
        pctx.fillRect(canvasW - 15 - paddleW, cpuY, paddleW, paddleH);

        // Ball
        pctx.fillStyle = '#fff';
        pctx.shadowColor = 'rgba(255,255,255,0.6)';
        pctx.shadowBlur = 12;
        pctx.beginPath();
        pctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        pctx.fill();
        pctx.shadowBlur = 0;
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);

    // Clean up on close
    const origClose = closeGame;
}

// ==========================================
// 🔨 WHACK-A-MOLE GAME
// ==========================================
function initWhack() {
    gameModalTitle.textContent = '🔨 Whack-a-Mole';

    let score = 0;
    let timeLeft = 30;
    let moleTimers = [];
    let gameActive = true;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="whackScore">0</b></span>
            <span>Time: <b id="whackTime">30</b>s</span>
        </div>
        <div class="game-status" id="whackStatus">Whack the moles! 🔨</div>
        <div class="whack-board" id="whackBoard"></div>
        <button class="game-restart" onclick="initWhack()">Restart</button>
    `;

    const board = document.getElementById('whackBoard');

    for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'mole-hole';
        hole.dataset.index = i;
        hole.innerHTML = '🕳️';
        hole.addEventListener('click', () => whackMole(hole, i));
        board.appendChild(hole);
    }

    function whackMole(hole, index) {
        if (!gameActive || !hole.classList.contains('active')) return;
        hole.classList.remove('active');
        hole.classList.add('whacked');
        hole.innerHTML = '💥';
        score++;
        document.getElementById('whackScore').textContent = score;

        setTimeout(() => {
            hole.classList.remove('whacked');
            hole.innerHTML = '🕳️';
        }, 300);
    }

    function showMole() {
        if (!gameActive) return;
        const holes = board.querySelectorAll('.mole-hole:not(.active)');
        if (holes.length === 0) return;

        const randomHole = holes[Math.floor(Math.random() * holes.length)];
        randomHole.classList.add('active');
        randomHole.innerHTML = '🐹';

        const hideTime = 800 + Math.random() * 800;
        const timer = setTimeout(() => {
            if (randomHole.classList.contains('active')) {
                randomHole.classList.remove('active');
                randomHole.innerHTML = '🕳️';
            }
        }, hideTime);
        moleTimers.push(timer);
    }

    // Spawn moles
    const spawnInterval = setInterval(() => {
        if (!gameActive) { clearInterval(spawnInterval); return; }
        showMole();
        if (Math.random() > 0.5) showMole(); // sometimes 2 moles
    }, 700);

    // Timer
    const countdownInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('whackTime').textContent = timeLeft;
        if (timeLeft <= 0) {
            gameActive = false;
            clearInterval(countdownInterval);
            clearInterval(spawnInterval);
            moleTimers.forEach(t => clearTimeout(t));
            document.getElementById('whackStatus').textContent = `⏰ Time's up! Score: ${score}`;
            document.getElementById('whackStatus').style.color = '#2dd4bf';
            // Show all holes as empty
            board.querySelectorAll('.mole-hole').forEach(h => {
                h.classList.remove('active');
                h.innerHTML = '🕳️';
            });
        }
    }, 1000);

    // Store intervals for cleanup
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = spawnInterval;
}

// ==========================================
// 🧱 BRICK BREAKER GAME
// ==========================================
function initBreakout() {
    gameModalTitle.textContent = '🧱 Brick Breaker';
    const canvasW = Math.min(480, window.innerWidth - 80);
    const canvasH = Math.round(canvasW * 0.75);

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="breakScore">0</b></span>
            <span>Lives: <b id="breakLives">3</b></span>
        </div>
        <canvas id="breakoutCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Move mouse or touch to control paddle</p>
        <button class="game-restart" onclick="initBreakout()">Restart</button>
    `;

    const canvas = document.getElementById('breakoutCanvas');
    const bctx = canvas.getContext('2d');

    // Paddle
    const paddleW = 80, paddleH = 12;
    let paddleX = canvasW / 2 - paddleW / 2;

    // Ball
    let ballX = canvasW / 2, ballY = canvasH - 40;
    let ballDX = 3, ballDY = -3;
    const ballR = 5;

    // Bricks
    const brickRows = 5, brickCols = 8;
    const brickW = (canvasW - 40) / brickCols;
    const brickH = 18;
    const brickPad = 4;
    const brickOffsetTop = 40;
    const brickOffsetLeft = 20;

    const brickColors = ['#ff2d87', '#d500f9', '#6366f1', '#00d4ff', '#2dd4bf'];

    let bricks = [];
    for (let r = 0; r < brickRows; r++) {
        bricks[r] = [];
        for (let c = 0; c < brickCols; c++) {
            bricks[r][c] = { x: 0, y: 0, alive: true };
        }
    }

    let score = 0, lives = 3;
    let gameOver = false;
    let won = false;

    // Mouse
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        paddleX = Math.max(0, Math.min(canvasW - paddleW, mx - paddleW / 2));
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.touches[0].clientX - rect.left;
        paddleX = Math.max(0, Math.min(canvasW - paddleW, mx - paddleW / 2));
    }, { passive: false });

    function update() {
        if (gameOver || won) return;

        ballX += ballDX;
        ballY += ballDY;

        // Side walls
        if (ballX - ballR < 0 || ballX + ballR > canvasW) ballDX = -ballDX;
        // Top wall
        if (ballY - ballR < 0) ballDY = -ballDY;

        // Paddle collision
        if (ballY + ballR > canvasH - paddleH - 10 &&
            ballX > paddleX && ballX < paddleX + paddleW &&
            ballDY > 0) {
            ballDY = -ballDY;
            // Angle based on hit position
            const hitPos = (ballX - paddleX) / paddleW;
            ballDX = 5 * (hitPos - 0.5);
        }

        // Bottom — lose life
        if (ballY + ballR > canvasH) {
            lives--;
            document.getElementById('breakLives').textContent = lives;
            if (lives <= 0) {
                gameOver = true;
            } else {
                ballX = canvasW / 2;
                ballY = canvasH - 40;
                ballDX = 3;
                ballDY = -3;
            }
        }

        // Brick collision
        let allBroken = true;
        for (let r = 0; r < brickRows; r++) {
            for (let c = 0; c < brickCols; c++) {
                const b = bricks[r][c];
                if (!b.alive) continue;
                allBroken = false;
                b.x = brickOffsetLeft + c * (brickW + brickPad);
                b.y = brickOffsetTop + r * (brickH + brickPad);

                if (ballX > b.x && ballX < b.x + brickW &&
                    ballY - ballR < b.y + brickH && ballY + ballR > b.y) {
                    ballDY = -ballDY;
                    b.alive = false;
                    score++;
                    document.getElementById('breakScore').textContent = score;
                }
            }
        }

        if (allBroken) won = true;
    }

    function draw() {
        bctx.fillStyle = '#0a0e1a';
        bctx.fillRect(0, 0, canvasW, canvasH);

        // Bricks
        for (let r = 0; r < brickRows; r++) {
            for (let c = 0; c < brickCols; c++) {
                const b = bricks[r][c];
                if (!b.alive) continue;
                b.x = brickOffsetLeft + c * (brickW + brickPad);
                b.y = brickOffsetTop + r * (brickH + brickPad);
                bctx.fillStyle = brickColors[r];
                bctx.shadowColor = brickColors[r];
                bctx.shadowBlur = 6;
                bctx.beginPath();
                bctx.roundRect(b.x, b.y, brickW, brickH, 3);
                bctx.fill();
            }
        }
        bctx.shadowBlur = 0;

        // Paddle
        bctx.fillStyle = '#6366f1';
        bctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        bctx.shadowBlur = 10;
        bctx.beginPath();
        bctx.roundRect(paddleX, canvasH - paddleH - 10, paddleW, paddleH, 6);
        bctx.fill();
        bctx.shadowBlur = 0;

        // Ball
        bctx.fillStyle = '#fff';
        bctx.shadowColor = 'rgba(255,255,255,0.5)';
        bctx.shadowBlur = 10;
        bctx.beginPath();
        bctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
        bctx.fill();
        bctx.shadowBlur = 0;

        // Overlays
        if (gameOver) {
            bctx.fillStyle = 'rgba(5,8,20,0.75)';
            bctx.fillRect(0, 0, canvasW, canvasH);
            bctx.fillStyle = '#ff2d87';
            bctx.font = 'bold 26px Orbitron, sans-serif';
            bctx.textAlign = 'center';
            bctx.fillText('GAME OVER', canvasW / 2, canvasH / 2 - 10);
            bctx.fillStyle = '#cbd5e1';
            bctx.font = '14px Inter, sans-serif';
            bctx.fillText(`Score: ${score}`, canvasW / 2, canvasH / 2 + 20);
        }
        if (won) {
            bctx.fillStyle = 'rgba(5,8,20,0.75)';
            bctx.fillRect(0, 0, canvasW, canvasH);
            bctx.fillStyle = '#2dd4bf';
            bctx.font = 'bold 26px Orbitron, sans-serif';
            bctx.textAlign = 'center';
            bctx.fillText('YOU WIN!', canvasW / 2, canvasH / 2 - 10);
            bctx.fillStyle = '#cbd5e1';
            bctx.font = '14px Inter, sans-serif';
            bctx.fillText(`Score: ${score}`, canvasW / 2, canvasH / 2 + 20);
        }
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);
    draw();
}

// ==========================================
// ⚡ REACTION TIME GAME
// ==========================================
function initReaction() {
    gameModalTitle.textContent = '⚡ Reaction Time';

    let state = 'waiting'; // waiting, ready, click, result
    let startTime = 0;
    let timer = null;

    gameModalBody.innerHTML = `
        <div class="game-status" id="reactStatus">Click the box when it turns GREEN!</div>
        <div id="reactZone" class="reaction-zone" style="background: #ef4444;">Wait for Green...</div>
        <p class="game-instructions">Tap anywhere in the box as fast as you can!</p>
    `;

    const zone = document.getElementById('reactZone');
    const status = document.getElementById('reactStatus');

    zone.addEventListener('click', handleClick);
    zone.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(); });

    function startRound() {
        state = 'waiting';
        zone.style.background = '#ef4444'; // Red
        zone.textContent = 'Wait for Green...';
        status.textContent = 'Wait for it...';

        const randomDelay = 1000 + Math.random() * 3000;

        timer = setTimeout(() => {
            state = 'click';
            zone.style.background = '#22c55e'; // Green
            zone.textContent = 'CLICK NOW!';
            startTime = Date.now();
        }, randomDelay);
    }

    function handleClick() {
        if (state === 'waiting') {
            clearTimeout(timer);
            zone.style.background = '#3b82f6'; // Blue
            zone.textContent = 'Too Early!';
            status.textContent = 'Click to try again';
            state = 'result';
        } else if (state === 'click') {
            const time = Date.now() - startTime;
            zone.style.background = '#3b82f6'; // Blue
            zone.textContent = `${time} ms`;
            status.textContent = 'Nice! Click to try again';
            state = 'result';
        } else if (state === 'result') {
            startRound();
        } else if (state === 'ready') {
            startRound();
        }
    }

    // Start immediately
    state = 'ready';
    startRound();
}

// ==========================================
// 🦖 DINO RUNNER GAME
// ==========================================
function initDino() {
    gameModalTitle.textContent = '🦖 Dino Runner';
    const canvasW = Math.min(600, window.innerWidth - 80);
    const canvasH = 200;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="dinoScore">0</b></span>
            <span>Hi: <b id="dinoHi">0</b></span>
        </div>
        <canvas id="dinoCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Tap or Space to Jump</p>
        <div class="touch-controls">
            <button class="touch-btn" onmousedown="dinoJump()" ontouchstart="dinoJump()">⬆️</button>
        </div>
        <button class="game-restart" onclick="initDino()">Restart</button>
    `;

    const canvas = document.getElementById('dinoCanvas');
    const ctx = canvas.getContext('2d');

    let dino = { x: 50, y: 150, w: 30, h: 30, dy: 0, jumpPower: -12, grounded: true };
    let obstacles = [];
    let frame = 0;
    let score = 0;
    let hi = parseInt(localStorage.getItem('dinoHi') || '0');
    let gravity = 0.6;
    let speed = 4;
    let gameActive = true;

    document.getElementById('dinoHi').textContent = hi;

    window.dinoJump = function () {
        if (dino.grounded && gameActive) {
            dino.dy = dino.jumpPower;
            dino.grounded = false;
        } else if (!gameActive) {
            initDino();
        }
    };

    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.key === 'ArrowUp') && currentGame === 'dino') {
            e.preventDefault();
            dinoJump();
        }
    });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); dinoJump(); });
    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); dinoJump(); });

    function update() {
        if (!gameActive) return;

        // Dino physics
        dino.y += dino.dy;
        if (dino.y < 150) {
            dino.dy += gravity;
            dino.grounded = false;
        } else {
            dino.y = 150;
            dino.dy = 0;
            dino.grounded = true;
        }

        // Obstacles
        if (frame % 100 === 0) {
            obstacles.push({ x: canvasW, w: 20 + Math.random() * 20, h: 30 + Math.random() * 20 });
            speed += 0.1;
        }

        obstacles.forEach(obs => {
            obs.x -= speed;
        });

        obstacles = obstacles.filter(obs => obs.x + obs.w > 0);

        // Collision
        obstacles.forEach(obs => {
            if (dino.x < obs.x + obs.w &&
                dino.x + dino.w > obs.x &&
                dino.y < 150 + obs.h && // Ground is at 150+30=180
                dino.y + dino.h > 150 + 30 - obs.h) { // simple box collision
                // Refined collision check
                if (dino.x + dino.w > obs.x + 5 && dino.x < obs.x + obs.w - 5 && dino.y + dino.h > 180 - obs.h + 5) {
                    gameOver();
                }
            }
        });

        score++;
        document.getElementById('dinoScore').textContent = Math.floor(score / 5);
        frame++;
    }

    function draw() {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Ground setup
        ctx.strokeStyle = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(0, 180);
        ctx.lineTo(canvasW, 180);
        ctx.stroke();

        // Dino
        ctx.fillStyle = '#2dd4bf';
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 10;
        ctx.fillRect(dino.x, dino.y, dino.w, dino.h);

        // Obstacles
        ctx.fillStyle = '#ff2d87';
        ctx.shadowColor = '#ff2d87';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x, 180 - obs.h, obs.w, obs.h);
        });
        ctx.shadowBlur = 0;

        if (!gameActive) {
            ctx.fillStyle = 'rgba(5,8,20,0.75)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#ff2d87';
            ctx.font = '24px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2);
            ctx.font = '14px Inter';
            ctx.fillStyle = '#fff';
            ctx.fillText('Tap/Space to Restart', canvasW / 2, canvasH / 2 + 25);
        }
    }

    function gameOver() {
        gameActive = false;
        const finalScore = Math.floor(score / 5);
        if (finalScore > hi) {
            localStorage.setItem('dinoHi', finalScore);
        }
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 20);
}

// ==========================================
// 🎨 COLOR MATCH GAME
// ==========================================
function initColorMatch() {
    gameModalTitle.textContent = '🎨 Color Match';

    let score = 0;
    let timeLeft = 30;
    let gameActive = true;
    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
    const cssColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

    let targetWord = '';
    let targetColorIndex = 0;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="colorScore">0</b></span>
            <span>Time: <b id="colorTime">30</b>s</span>
        </div>
        <div class="color-word" id="colorWord">WORD</div>
        <p class="game-instructions">Tap the color of the TEXT, not the word!</p>
        <div class="color-options" id="colorOptions"></div>
        <button class="game-restart" onclick="initColorMatch()">Restart</button>
    `;

    function nextRound() {
        if (!gameActive) return;

        // Random word text
        const wordIndex = Math.floor(Math.random() * colors.length);
        targetWord = colors[wordIndex];

        // Random color for the text (this is the answer)
        targetColorIndex = Math.floor(Math.random() * colors.length);

        const wordEl = document.getElementById('colorWord');
        wordEl.textContent = targetWord;
        wordEl.style.color = cssColors[targetColorIndex];

        // Buttons
        const optionsEl = document.getElementById('colorOptions');
        optionsEl.innerHTML = '';

        // Generate options (include correct one)
        let optionIndices = [targetColorIndex];
        while (optionIndices.length < 4) {
            const r = Math.floor(Math.random() * colors.length);
            if (!optionIndices.includes(r)) optionIndices.push(r);
        }
        optionIndices.sort(() => Math.random() - 0.5);

        optionIndices.forEach(idx => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.textContent = colors[idx];
            btn.style.borderColor = cssColors[idx];
            btn.style.color = cssColors[idx];
            btn.onclick = () => checkAnswer(idx);
            optionsEl.appendChild(btn);
        });
    }

    function checkAnswer(idx) {
        if (!gameActive) return;

        if (idx === targetColorIndex) {
            score++;
            document.getElementById('colorScore').textContent = score;
            // Flash green border
            document.getElementById('colorWord').style.borderColor = '#22c55e';
            nextRound();
        } else {
            // Wrong! -1 second penalty
            timeLeft = Math.max(0, timeLeft - 2);
            document.getElementById('colorTime').textContent = timeLeft;
            document.getElementById('colorWord').animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
            nextRound(); // Still go next
        }
    }

    // Timer
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById('colorTime').textContent = timeLeft;
        if (timeLeft <= 0) {
            gameActive = false;
            clearInterval(timer);
            document.getElementById('colorWord').textContent = `GAME OVER`;
            document.getElementById('colorWord').style.color = '#fff';
            document.getElementById('colorOptions').innerHTML = `<div style="font-size:1.2rem; margin-top:1rem;">Final Score: <b style="color:#2dd4bf">${score}</b></div>`;
        }
    }, 1000);

    // Cleanup
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = timer;

    nextRound();
}

// ==========================================
// 🚀 SPACE SHOOTER
// ==========================================
function initShooter() {
    gameModalTitle.textContent = '🚀 Space Shooter';
    const canvasW = Math.min(600, window.innerWidth - 80);
    const canvasH = 300;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="shooterScore">0</b></span>
            <span>Health: <b id="shooterHealth">100</b>%</span>
        </div>
        <canvas id="shooterCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Touch/Mouse to Move • Auto-Fire</p>
        <button class="game-restart" onclick="initShooter()">Restart</button>
    `;

    const canvas = document.getElementById('shooterCanvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 50, y: canvasH / 2, w: 40, h: 20 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let frame = 0;
    let score = 0;
    let health = 100;
    let gameActive = true;

    // Input
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        player.y = e.touches[0].clientY - rect.top;
    }, { passive: false });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.y = e.clientY - rect.top;
    });

    function update() {
        if (!gameActive) return;
        frame++;

        // Spawn enemies
        if (frame % 40 === 0) {
            enemies.push({ x: canvasW, y: Math.random() * (canvasH - 30), w: 30, h: 30, hp: 1, speed: 3 + Math.random() * 2 });
        }

        // Auto fire
        if (frame % 15 === 0) {
            bullets.push({ x: player.x + 20, y: player.y, w: 10, h: 4, speed: 10 });
        }

        // Update Bullets
        bullets.forEach((b, i) => {
            b.x += b.speed;
            if (b.x > canvasW) bullets.splice(i, 1);
        });

        // Update Enemies
        enemies.forEach((e, i) => {
            e.x -= e.speed;
            if (e.x < -50) enemies.splice(i, 1);

            // Player collision
            if (Math.abs(e.x - player.x) < 30 && Math.abs(e.y - player.y) < 30) {
                enemies.splice(i, 1);
                health -= 20;
                document.getElementById('shooterHealth').textContent = health;
                createExplosion(player.x, player.y, '#ff4444');
                if (health <= 0) gameOver();
            }
        });

        // Bullet-Enemy Collision
        bullets.forEach((b, bi) => {
            enemies.forEach((e, ei) => {
                if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
                    bullets.splice(bi, 1);
                    enemies.splice(ei, 1);
                    score += 10;
                    document.getElementById('shooterScore').textContent = score;
                    createExplosion(e.x, e.y, '#eba');
                }
            });
        });

        // Particles
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        });
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 20,
                color: color
            });
        }
    }

    function draw() {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Stars
        ctx.fillStyle = '#fff';
        if (Math.random() > 0.8) ctx.fillRect(Math.random() * canvasW, Math.random() * canvasH, 2, 2);

        // Player
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(player.x + 20, player.y);
        ctx.lineTo(player.x - 10, player.y - 10);
        ctx.lineTo(player.x - 10, player.y + 10);
        ctx.fill();
        // Engine flame
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(player.x - 10, player.y);
        ctx.lineTo(player.x - 20 - Math.random() * 10, player.y);
        ctx.stroke();

        // Enemies
        ctx.fillStyle = '#ef4444';
        enemies.forEach(e => {
            ctx.fillText('👾', e.x, e.y + 10);
        });

        // Bullets
        ctx.fillStyle = '#facc15';
        bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

        // Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        });

        if (!gameActive) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2);
        }
    }

    function gameOver() {
        gameActive = false;
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 20);
}

// ==========================================
// 🏃 DUNGEON ESCAPE
// ==========================================
function initEscape() {
    gameModalTitle.textContent = '🏃 Dungeon Escape';
    const canvasW = Math.min(600, window.innerWidth - 80);
    const canvasH = 250;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Distance: <b id="escapeDist">0</b>m</span>
        </div>
        <canvas id="escapeCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Tap right to JUMP • Tap left to DUCK (Hold)</p>
        <button class="game-restart" onclick="initEscape()">Restart</button>
    `;

    const canvas = document.getElementById('escapeCanvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 50, y: 180, w: 30, h: 50, state: 'run', dy: 0 };
    let obstacles = [];
    let speed = 5;
    let score = 0;
    let gameActive = true;
    let frame = 0;

    // Input
    window.escapeAction = function (action) {
        if (!gameActive) return;
        if (action === 'jump' && player.y === 180) {
            player.dy = -12;
            player.state = 'jump';
        } else if (action === 'duck') {
            player.state = 'duck';
            player.h = 25;
            player.y = 205; // Duck position
        } else if (action === 'run') {
            player.state = 'run';
            player.h = 50;
            player.y = 180;
        }
    };

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        if (touchX > canvasW / 2) escapeAction('jump');
        else escapeAction('duck');
    });

    canvas.addEventListener('touchend', (e) => {
        escapeAction('run');
    });

    document.addEventListener('keydown', (e) => {
        if (currentGame !== 'escape') return;
        if (e.key === 'ArrowUp' || e.key === ' ') escapeAction('jump');
        if (e.key === 'ArrowDown') escapeAction('duck');
    });

    document.addEventListener('keyup', (e) => {
        if (currentGame !== 'escape') return;
        if (e.key === 'ArrowDown') escapeAction('run');
    });

    function update() {
        if (!gameActive) return;
        frame++;
        score++;
        document.getElementById('escapeDist').textContent = Math.floor(score / 10);
        speed += 0.001;

        // Physics
        if (player.state !== 'duck') {
            player.y += player.dy;
            if (player.y < 180) {
                player.dy += 0.6; // Gravity
            } else {
                player.y = 180;
                player.dy = 0;
                player.state = 'run';
            }
        }

        // Spawn Obstacles
        if (frame % 80 === 0) {
            let type = Math.random() > 0.5 ? 'bat' : 'spike';
            obstacles.push({
                type: type,
                x: canvasW,
                y: type === 'bat' ? 140 : 200, // bat high, spike low
                w: 30,
                h: 30
            });
        }

        // Move Obstacles
        obstacles.forEach((o, i) => {
            o.x -= speed;
            if (o.x < -30) obstacles.splice(i, 1);

            // Collision
            // Player hitbox
            let px = player.x + 5;
            let py = player.y + 5;
            let pw = player.w - 10;
            let ph = player.h - 10;

            if (px < o.x + o.w && px + pw > o.x && py < o.y + o.h && py + ph > o.y) {
                gameActive = false;
            }
        });
    }

    function draw() {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Floor
        ctx.fillStyle = '#4aec8c';
        ctx.fillRect(0, 230, canvasW, 20);

        // Player
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        // Sprite
        let em = '🏃';
        if (player.state === 'jump') em = '🕴️';
        if (player.state === 'duck') em = '🙇';
        ctx.fillText(em, player.x + 15, player.y + 30);

        // Obstacles
        obstacles.forEach(o => {
            ctx.font = '30px Arial';
            if (o.type === 'bat') ctx.fillText('🦇', o.x + 15, o.y + 30);
            else ctx.fillText('🌵', o.x + 15, o.y + 30);
        });

        // Monster
        ctx.font = '60px Arial';
        ctx.globalAlpha = 0.3;
        ctx.fillText('👹', 30, 180); // Chase monster
        ctx.globalAlpha = 1;

        if (!gameActive) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#4aec8c';
            ctx.font = '30px Orbitron';
            ctx.fillText('CAUGHT!', canvasW / 2, canvasH / 2);
        }
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);
}

// ==========================================
// 👟 CITY RUNNER
// ==========================================
function initRunner() {
    gameModalTitle.textContent = '👟 City Runner';
    const canvasW = Math.min(600, window.innerWidth - 80);
    const canvasH = 250;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="runnerScore">0</b></span>
        </div>
        <canvas id="runnerCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Tap or Space to Jump • Collect Coins</p>
        <button class="game-restart" onclick="initRunner()">Restart</button>
    `;

    const canvas = document.getElementById('runnerCanvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 50, y: 100, w: 20, h: 40, dy: 0, grounded: false };
    let buildings = [];
    let coins = [];
    let speed = 4;
    let score = 0;
    let gameActive = true;
    let frame = 0;

    // Init buildings
    for (let i = 0; i < 5; i++) {
        buildings.push({ x: i * 200, w: 150, h: 100 + Math.random() * 50 });
    }

    window.runnerJump = function () {
        if (player.grounded) {
            player.dy = -10;
            player.grounded = false;
        } else if (!gameActive) {
            initRunner();
        }
    };

    canvas.addEventListener('mousedown', runnerJump);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); runnerJump(); });
    document.addEventListener('keydown', (e) => {
        if (currentGame === 'runner' && (e.code === 'Space' || e.key === 'ArrowUp')) {
            e.preventDefault(); runnerJump();
        }
    });

    function update() {
        if (!gameActive) return;
        frame++;

        // Spawn buildings
        let lastB = buildings[buildings.length - 1];
        if (lastB.x < canvasW) {
            buildings.push({
                x: lastB.x + lastB.w + 50 + Math.random() * 50, // Gap
                w: 100 + Math.random() * 100,
                h: 50 + Math.random() * 100
            });
            // Spawn coin
            if (Math.random() > 0.5) {
                coins.push({
                    x: lastB.x + lastB.w + 25,
                    y: canvasH - (50 + Math.random() * 100) - 40
                });
            }
        }

        // Move
        buildings.forEach(b => b.x -= speed);
        coins.forEach(c => c.x -= speed);
        buildings = buildings.filter(b => b.x + b.w > 0);
        coins = coins.filter(c => c.x > -20);

        // Physics
        player.dy += 0.5; // Gravity
        player.y += player.dy;

        // Collision with buildings
        player.grounded = false;
        buildings.forEach(b => {
            if (player.x + player.w > b.x && player.x < b.x + b.w) {
                // Above building?
                let buildingTop = canvasH - b.h;
                if (player.y + player.h >= buildingTop && player.y + player.h <= buildingTop + 15 && player.dy >= 0) {
                    player.grounded = true;
                    player.dy = 0;
                    player.y = buildingTop - player.h;
                }
                // Hit forward wall?
                else if (player.y + player.h > buildingTop + 10) {
                    gameActive = false;
                }
            }
        });

        // Coins
        coins.forEach((c, i) => {
            if (Math.abs(c.x - player.x) < 30 && Math.abs(c.y - player.y) < 30) {
                coins.splice(i, 1);
                score += 50;
                document.getElementById('runnerScore').textContent = score;
            }
        });

        // Fall death
        if (player.y > canvasH) gameActive = false;
    }

    function draw() {
        ctx.fillStyle = '#0f172a'; // Night sky
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Moon
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath(); ctx.arc(canvasW - 50, 50, 30, 0, Math.PI * 2); ctx.fill();

        // Buildings
        buildings.forEach(b => {
            ctx.fillStyle = '#334155';
            ctx.fillRect(b.x, canvasH - b.h, b.w, b.h);
            // Windows
            ctx.fillStyle = '#facc15';
            for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                for (let wy = canvasH - b.h + 10; wy < canvasH - 10; wy += 30) {
                    if (Math.random() > 0.3) ctx.fillRect(wx, wy, 10, 20);
                }
            }
        });

        // Player
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(player.x, player.y, player.w, player.h);

        // Coins
        ctx.fillStyle = '#fbbf24';
        coins.forEach(c => {
            ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
        });

        if (!gameActive) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#ec4899';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2);
        }
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);
}

// ==========================================
// 🐦 FLAPPY CLONE
// ==========================================
function initFlappy() {
    gameModalTitle.textContent = '🐦 Flappy Clone';
    const canvasW = Math.min(400, window.innerWidth - 80);
    const canvasH = 500;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="flappyScore">0</b></span>
            <span>Best: <b id="flappyBest">0</b></span>
        </div>
        <canvas id="flappyCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Tap or Space to Flap</p>
        <button class="game-restart" onclick="initFlappy()">Restart</button>
    `;

    const canvas = document.getElementById('flappyCanvas');
    const ctx = canvas.getContext('2d');

    let bird = { x: 50, y: canvasH / 2, dy: 0, r: 15 };
    let pipes = [];
    let score = 0;
    let best = parseInt(localStorage.getItem('flappyBest') || '0');
    let frame = 0;
    let gravity = 0.25;
    let jump = -5;
    let speed = 2;
    let gameActive = true;

    document.getElementById('flappyBest').textContent = best;

    function flap() {
        if (!gameActive) {
            initFlappy();
            return;
        }
        bird.dy = jump;
    }

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); });
    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); flap(); });
    document.addEventListener('keydown', (e) => {
        if (currentGame === 'flappy' && (e.code === 'Space' || e.key === 'ArrowUp')) {
            e.preventDefault(); flap();
        }
    });

    function update() {
        if (!gameActive) return;
        frame++;

        // Bird Physics
        bird.dy += gravity;
        bird.y += bird.dy;

        // Spawn Pipes
        if (frame % 150 === 0) {
            let gap = 120;
            let topH = Math.random() * (canvasH - gap - 100) + 50;
            pipes.push({ x: canvasW, topH: topH, gap: gap, w: 50, passed: false });
        }

        // Move Pipes
        pipes.forEach((p, i) => {
            p.x -= speed;
            if (p.x < -p.w) pipes.splice(i, 1);

            // Collision
            if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + p.w) {
                if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + p.gap) {
                    gameOver();
                }
            }

            // Score
            if (p.x + p.w < bird.x && !p.passed) {
                score++;
                document.getElementById('flappyScore').textContent = score;
                p.passed = true;
                if (score > best) {
                    best = score;
                    localStorage.setItem('flappyBest', best);
                    document.getElementById('flappyBest').textContent = best;
                }
            }
        });

        // Bounds
        if (bird.y + bird.r > canvasH || bird.y - bird.r < 0) gameOver();
    }

    function draw() {
        ctx.fillStyle = '#70c5ce'; // Sky
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Pipes
        ctx.fillStyle = '#22c55e';
        pipes.forEach(p => {
            ctx.fillRect(p.x, 0, p.w, p.topH); // Top
            ctx.fillRect(p.x, p.topH + p.gap, p.w, canvasH - (p.topH + p.gap)); // Bottom
            // Cap
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(p.x - 2, p.topH - 20, p.w + 4, 20);
            ctx.fillRect(p.x - 2, p.topH + p.gap, p.w + 4, 20);
            ctx.fillStyle = '#22c55e';
        });

        // Bird
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; // Eye
        ctx.beginPath(); ctx.arc(bird.x + 8, bird.y - 5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f97316'; // Beak
        ctx.beginPath(); ctx.moveTo(bird.x + 10, bird.y); ctx.lineTo(bird.x + 20, bird.y + 5); ctx.lineTo(bird.x + 10, bird.y + 10); ctx.fill();

        // Floor
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, canvasH - 20, canvasW, 20);
        ctx.fillStyle = '#8ce'; // Grass
        ctx.fillRect(0, canvasH - 25, canvasW, 5);

        if (!gameActive) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2);
            ctx.font = '20px Orbitron';
            ctx.fillText('Tap to Restart', canvasW / 2, canvasH / 2 + 40);
        }
    }

    function gameOver() {
        gameActive = false;
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);
}

// ==========================================
// ⌨️ TYPING SPEED
// ==========================================
function initTyping() {
    gameModalTitle.textContent = '⌨️ Typing Speed';
    const canvasW = Math.min(600, window.innerWidth - 80);
    const canvasH = 300;

    // Words list
    const words = ['code', 'game', 'play', 'java', 'html', 'css', 'node', 'react', 'unity', 'pixel', 'logic', 'loop', 'array', 'bug', 'fix', 'debug', 'stack', 'heap', 'null', 'void', 'class', 'super', 'this', 'final', 'const', 'let', 'var', 'async', 'await', 'promise', 'fetch', 'json', 'server', 'client', 'scrum', 'agile', 'sprint', 'git', 'push', 'pull', 'merge', 'clone', 'branch', 'fork', 'commit', 'repo', 'issue'];

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Score: <b id="typeScore">0</b></span>
            <span>Time: <b id="typeTime">60</b>s</span>
        </div>
        <canvas id="typeCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Type the falling words! (Keyboard Only)</p>
        <input type="text" id="hiddenInput" style="opacity:0; position:absolute; top:-1000px;">
        <button class="game-restart" onclick="initTyping()">Restart</button>
    `;

    const canvas = document.getElementById('typeCanvas');
    const ctx = canvas.getContext('2d');
    const input = document.getElementById('hiddenInput');

    // Force focus for mobile keyboard (trick)
    canvas.addEventListener('click', () => { input.focus(); });
    input.focus();

    let activeWords = [];
    let score = 0;
    let timeLeft = 60;
    let gameActive = true;
    let frame = 0;
    let spawnRate = 120;
    let difficulty = 1;

    // Timer
    let timer = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        document.getElementById('typeTime').textContent = timeLeft;
        if (timeLeft <= 0) gameOver();
    }, 1000);

    // Input Handler
    window.handleType = (e) => {
        if (!gameActive) return;
        const char = e.key.toLowerCase();
        if (char.length !== 1) return;

        // Check active words
        let hit = false;
        activeWords.forEach((w, i) => {
            if (hit) return; // Only hit one word per char? No, logic should be robust.
            // Simplified: match first char of any word
            if (w.text.startsWith(char)) {
                w.text = w.text.substring(1); // Remove logic
                w.typed += char;
                hit = true;
                if (w.text.length === 0) {
                    activeWords.splice(i, 1);
                    score += w.original.length * 10;
                    document.getElementById('typeScore').textContent = score;
                    // Heal
                    timeLeft += 1;
                }
            }
        });
    };

    document.addEventListener('keydown', (e) => {
        if (currentGame === 'typing') handleType(e);
    });
    // Mobile input fallback
    input.addEventListener('input', (e) => {
        if (e.data) window.handleType({ key: e.data });
        input.value = '';
    });

    function update() {
        if (!gameActive) return;
        frame++;

        // Difficulty ramp
        if (frame % 600 === 0) { spawnRate = Math.max(30, spawnRate - 10); difficulty += 0.5; }

        if (frame % spawnRate === 0) {
            let txt = words[Math.floor(Math.random() * words.length)];
            activeWords.push({
                text: txt,
                original: txt,
                typed: '',
                x: Math.random() * (canvasW - 100) + 10,
                y: -20,
                speed: 1 + Math.random() * difficulty
            });
        }

        activeWords.forEach((w, i) => {
            w.y += w.speed;
            if (w.y > canvasH) {
                activeWords.splice(i, 1);
                score -= 50; // Penalty
                document.getElementById('typeScore').textContent = score;
                // Flash red
                canvas.style.border = '2px solid red';
                setTimeout(() => canvas.style.border = 'none', 100);
            }
        });
    }

    function draw() {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvasW, canvasH);

        ctx.font = '24px monospace';
        activeWords.forEach(w => {
            // Typed part green
            ctx.fillStyle = '#4ade80';
            ctx.fillText(w.typed, w.x, w.y);
            // Remaining part white
            ctx.fillStyle = '#fff';
            let offset = ctx.measureText(w.typed).width;
            ctx.fillText(w.text, w.x + offset, w.y);
        });

        if (!gameActive) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#fff';
            ctx.font = '30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('TIME UP', canvasW / 2, canvasH / 2 - 20);
            ctx.fillText(`Score: ${score}`, canvasW / 2, canvasH / 2 + 30);
        }
    }

    function gameOver() {
        gameActive = false;
        clearInterval(timer);
    }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => { update(); draw(); }, 16);
}

// ==========================================
// 🔴 SIMON SAYS
// ==========================================
function initSimon() {
    gameModalTitle.textContent = '🔴 Simon Says';
    const canvasW = Math.min(400, window.innerWidth - 80);
    const canvasH = 400;

    gameModalBody.innerHTML = `
        <div class="game-stats">
            <span>Level: <b id="simonLevel">1</b></span>
        </div>
        <canvas id="simonCanvas" width="${canvasW}" height="${canvasH}"></canvas>
        <p class="game-instructions">Memorize the pattern!</p>
        <button class="game-restart" onclick="initSimon()">Restart</button>
    `;

    const canvas = document.getElementById('simonCanvas');
    const ctx = canvas.getContext('2d');

    // Centers of quadrants
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const r = Math.min(cx, cy) - 20;

    const colors = [
        { id: 0, color: '#ef4444', light: '#fca5a5', name: 'Red', x: cx - r / 2, y: cy - r / 2 },   // Top-Left
        { id: 1, color: '#3b82f6', light: '#93c5fd', name: 'Blue', x: cx + r / 2, y: cy - r / 2 },  // Top-Right
        { id: 2, color: '#eab308', light: '#fde047', name: 'Yellow', x: cx - r / 2, y: cy + r / 2 }, // Bottom-Left
        { id: 3, color: '#22c55e', light: '#86efac', name: 'Green', x: cx + r / 2, y: cy + r / 2 }   // Bottom-Right
    ];

    let sequence = [];
    let playerSeq = [];
    let state = 'start'; // start, play, input, gameover
    let activeColor = null;

    canvas.addEventListener('mousedown', handleClick);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e.touches[0]); });

    function handleClick(e) {
        if (state !== 'input') return;

        const rect = canvas.getBoundingClientRect();
        const ex = (e.clientX || e.pageX) - rect.left;
        const ey = (e.clientY || e.pageY) - rect.top;

        // Determine quadrant
        let clicked = -1;
        if (ex < cx && ey < cy) clicked = 0;
        else if (ex > cx && ey < cy) clicked = 1;
        else if (ex < cx && ey > cy) clicked = 2;
        else if (ex > cx && ey > cy) clicked = 3;

        if (clicked !== -1) {
            flash(clicked);
            playerSeq.push(clicked);
            checkInput();
        }
    }

    function addStep() {
        state = 'play';
        playerSeq = [];
        sequence.push(Math.floor(Math.random() * 4));
        document.getElementById('simonLevel').textContent = sequence.length;
        playSequence();
    }

    function playSequence() {
        let i = 0;
        const interval = setInterval(() => {
            flash(sequence[i]);
            i++;
            if (i >= sequence.length) {
                clearInterval(interval);
                state = 'input';
            }
        }, 800);
    }

    function flash(id) {
        activeColor = id;
        draw();
        // Play sound someday?
        setTimeout(() => {
            activeColor = null;
            draw();
        }, 400);
    }

    function checkInput() {
        const idx = playerSeq.length - 1;
        if (playerSeq[idx] !== sequence[idx]) {
            state = 'gameover';
            draw();
            return;
        }
        if (playerSeq.length === sequence.length) {
            state = 'wait';
            setTimeout(addStep, 1000);
        }
    }

    function draw() {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Draw 4 sectors
        colors.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            // Arc logic for sectors
            let start = 0, end = 0;
            if (c.id === 0) { start = Math.PI; end = 1.5 * Math.PI; ctx.fillStyle = (activeColor === 0) ? c.light : c.color; }
            if (c.id === 1) { start = 1.5 * Math.PI; end = 0; ctx.fillStyle = (activeColor === 1) ? c.light : c.color; }
            if (c.id === 2) { start = 0.5 * Math.PI; end = Math.PI; ctx.fillStyle = (activeColor === 2) ? c.light : c.color; } // BL
            if (c.id === 3) { start = 0; end = 0.5 * Math.PI; ctx.fillStyle = (activeColor === 3) ? c.light : c.color; } // BR

            ctx.arc(cx, cy, r, start, end);
            ctx.lineTo(cx, cy);
            ctx.fill();
            ctx.stroke();
        });

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.lineWidth = 1;

        if (state === 'start') {
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Tap to Start', cx, cy + 8);
        } else if (state === 'gameover') {
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', cx, cy - 10);
            ctx.font = '16px Arial';
            ctx.fillText('Tap to Restart', cx, cy + 20);
        }
    }

    // Start
    draw();
    canvas.addEventListener('click', () => {
        if (state === 'start' || state === 'gameover') {
            sequence = [];
            addStep();
        }
    });
}


// Toggle Portfolio Content
function toggleContent(button, sectionId) {
    const section = document.querySelector(`section[id="${sectionId}"]`) || document.querySelector(`.category-section.${sectionId}`);
    if (!section) return;

    // Correct selector to find elements within this section which have the class hidden-content
    // The HTML has data-section on these elements for extra safety but class hidden-content is key
    const hiddenItems = section.querySelectorAll(".hidden-content");

    const isExpanded = button.innerText.includes("Show Less");

    if (isExpanded) {
        // Hide
        hiddenItems.forEach(item => {
            item.classList.remove("visible-content");
            setTimeout(() => {
                // remove style override to let CSS take over (display: none via class)
                item.style.display = "";
            }, 300);
        });
        button.innerText = "Show All Content ?";
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        // Show
        hiddenItems.forEach((item, index) => {
            item.style.display = "flex"; // Force display
            // Trigger reflow
            void item.offsetWidth;
            item.classList.add("visible-content");
        });
        button.innerText = "Show Less ▲";
    }
}

