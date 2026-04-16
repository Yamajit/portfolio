/* GAMEZONE — Main Site Controller */
(function () {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const saved = localStorage.getItem('gz-theme') || 'dark';
    html.setAttribute('data-theme', saved);

    themeToggle.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('gz-theme', next);
        GameAudio.playSound('click');
    });

    // Mute Toggle (Dynamically added to nav)
    const navActions = document.querySelector('.nav-actions');
    const muteBtn = document.createElement('button');
    muteBtn.id = 'mute-toggle';
    muteBtn.className = 'theme-toggle'; // reuse style
    muteBtn.innerHTML = '🔊';
    muteBtn.style.marginLeft = '10px';
    muteBtn.onclick = () => GameAudio.toggleMute();
    navActions.appendChild(muteBtn);

    GameAudio.init();

    // Hero Particles
    const particleContainer = document.getElementById('hero-particles');
    if (particleContainer) {
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div');
            p.className = 'hero-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 6 + 's';
            p.style.animationDuration = (4 + Math.random() * 4) + 's';
            p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
            particleContainer.appendChild(p);
        }
    }

    // Stat Counter Animation
    const statNums = document.querySelectorAll('.stat-number');
    const observed = new Set();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !observed.has(entry.target)) {
                observed.add(entry.target);
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                let current = 0;
                const increment = Math.ceil(target / 30);
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) { current = target; clearInterval(timer); }
                    el.textContent = current + '+';
                }, 40);
            }
        });
    }, { threshold: 0.5 });
    statNums.forEach(el => observer.observe(el));

    // Category Filters — show/hide entire cat-sections (headers + grids)
    const filterBtns = document.querySelectorAll('.filter-btn');
    const catSections = document.querySelectorAll('.cat-section');
    const gameCards = document.querySelectorAll('.game-card');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            GameAudio.playSound('click');
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.category;
            catSections.forEach(sec => {
                sec.style.display = (cat === 'all' || sec.dataset.cat === cat) ? '' : 'none';
            });
            // Replay card entrance animations
            let i = 0;
            gameCards.forEach(card => {
                if (card.closest('.cat-section')?.style.display !== 'none') {
                    card.style.animation = 'none';
                    card.offsetHeight;
                    card.style.animation = `cardReveal 0.4s ease ${i * 0.04}s both`;
                    i++;
                }
            });
        });
    });


    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            gameCards.forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const desc = card.querySelector('.card-desc').textContent.toLowerCase();
                card.style.display = (title.includes(q) || desc.includes(q)) ? '' : 'none';
            });
        });
    }

    // Scroll-triggered nav links
    const sections = {
        games: 'all', runners: 'runner', arcade: 'arcade',
        puzzle: 'puzzle', action: 'action', sports: 'sports', skill: 'skill'
    };
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            GameAudio.playSound('click');
            const href = link.getAttribute('href');
            if (href === '#games') return;
            if (href.startsWith('#')) {
                e.preventDefault();
                const cat = sections[href.slice(1)];
                if (cat) {
                    const btn = document.querySelector(`.filter-btn[data-category="${cat}"]`);
                    if (btn) btn.click();
                    document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Secret Game Toggle System (Removed)
})();

// Input System for Cross-Platform Controls
const InputSystem = {
    keys: {},
    init() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // Virtual Controls
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            const key = btn.dataset.key;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[key] = true;
                if (window.GameAudio) GameAudio.playSound('click');
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[key] = false;
            });
            btn.addEventListener('mousedown', () => {
                this.keys[key] = true;
                if (window.GameAudio) GameAudio.playSound('click');
            });
            btn.addEventListener('mouseup', () => this.keys[key] = false);
            btn.addEventListener('mouseleave', () => this.keys[key] = false);
        });
    },
    isPressed(keyCode) {
        return !!this.keys[keyCode];
    },
    reset() {
        this.keys = {};
    }
};

InputSystem.init();

// Game Launcher
let currentGameInstance = null;

const GAME_DATA = {
    'neon-flip': {
        title: 'Neon Flip',
        brief: 'Invert gravity to survive.',
        objectives: ['Run far', 'Flip Gravity'],
        pc: { 'Space/Click': 'Flip Gravity' },
        mobile: { 'Tap': 'Flip Gravity' }
    },
    'chroma-shift': {
        title: 'Chroma Shift',
        brief: 'Match colors to pass gates.',
        objectives: ['Switch Color', 'Match Gate Color'],
        pc: { 'Space / Click': 'Switch Color' },
        mobile: { 'Tap': 'Switch Color' }
    },
    'gravity-grid': {
        title: 'Gravity Grid',
        brief: 'Flip gravity to navigate your neon ball through 5 hand-crafted spike levels. Touch the red wall = restart!',
        objectives: ['Avoid spike walls (#)', 'Reach the ⚡ exit tile', 'Complete all 5 levels'],
        pc: { '← / A': 'Move Left', '→ / D': 'Move Right', 'Space / ↑': 'Flip Gravity' },
        mobile: { '← →': 'Move', '▲ (A btn)': 'Flip Gravity' }
    },
    'echo-trace': {
        title: 'Echo Trace',
        brief: 'A growing sequence of nodes lights up — replicate it perfectly. One mistake ends the run.',
        objectives: ['Watch the glowing node sequence', 'Click nodes in the same order', 'Survive as many rounds as possible'],
        pc: { '1–9 Keys': 'Select Node', 'Mouse Click': 'Select Node', 'R': 'Restart after Game Over' },
        mobile: { 'Tap Node': 'Select Node' }
    },
    'neon-sniper': {
        title: 'Neon Sniper',
        brief: 'Hexagonal enemies rush your sector from all sides. Rotate your turret and blast them before they reach you.',
        objectives: ['Rotate turret to face enemies', 'Shoot before they reach center', 'Survive wave after wave'],
        pc: { '← / →': 'Rotate Turret', 'Space': 'Fire Bullet' },
        mobile: { '◀ ▶ D-Pad': 'Rotate Turret', 'A Button': 'Fire Bullet' }
    },
    'pixel-dodge': {
        title: 'Pixel Dodge',
        brief: 'Neon blocks rain from above in colorful waves. Dodge them all and rack up the highest score you can!',
        objectives: ['Move left/right to avoid falling blocks', 'Dash through tight gaps', 'Blocks get faster the longer you survive'],
        pc: { '← / →': 'Move', 'Space': 'Dash sideways' },
        mobile: { '◀ ▶ D-Pad': 'Move', 'A Button': 'Dash' }
    },
    'neon-pong': {
        title: 'Neon Pong',
        brief: 'Neon-lit classic pong vs adaptive AI. Ball speeds up on every hit and you can curve it with your paddle.',
        objectives: ['Hit ball past AI paddle to score', 'Use paddle movement to add spin', 'Hit center power zone for a speed boost'],
        pc: { 'W / ↑': 'Move Up', 'S / ↓': 'Move Down' },
        mobile: { '▲ ▼ D-Pad': 'Move Paddle Up/Down' }
    },
    'neon-snake': {
        title: 'Neon Snake',
        brief: 'Classic snake reimagined with neon visuals and power-ups. Grow your snake and collect bonuses without hitting yourself!',
        objectives: ['Eat food to grow your snake', 'Avoid hitting your own body', 'Grab power-ups: Speed, Ghost, Shrink'],
        pc: { 'WASD or ←↑→↓': 'Change Direction' },
        mobile: { '◄ ▲ ▼ ► D-Pad': 'Change Direction' }
    },
    'stack-rush': {
        title: 'Stack Rush',
        brief: 'A sliding block drops onto a growing tower. Time your tap to land it precisely — miss and the block shrinks. Collapse = game over.',
        objectives: ['Land blocks as precisely as possible', 'Perfect alignment = bonus points', 'Stack as many layers as possible'],
        pc: { 'Space': 'Drop Block', 'Click': 'Drop Block' },
        mobile: { 'Tap Screen': 'Drop Block' }
    },
    'sky-dash': {
        title: 'Sky Dash',
        brief: 'Endless runner with a cute robot! Jump over neon obstacles + collect gold coins for bonus points. How far can you dash?',
        objectives: ['Dodge all obstacles to survive', 'Collect gold coins for +25 pts each', 'Speed increases over time'],
        pc: { 'Space / ↑': 'Jump (double-jump allowed!)', 'Click': 'Jump' },
        mobile: { 'Tap Screen': 'Jump / Double Jump' }
    },
    'asteroid-storm': {
        title: 'Asteroid Storm',
        brief: 'Pilot your triangular ship through asteroid waves! Press SPACE and your ship auto-aims at the nearest asteroid — very handy!',
        objectives: ['Destroy all asteroids in each wave', 'Avoid collisions (3 lives)', 'Earn bonus points for clearing waves'],
        pc: { 'WASD / ↑↓←→': 'Move Ship', 'Space': 'Shoot (auto-aims nearest)' },
        mobile: { '◄ ▲ ▼ ► D-Pad': 'Move Ship', 'A Button': 'Shoot' }
    },
    'bubble-burst': {
        title: 'Bubble Burst',
        brief: 'Colorful bubbles rise up — pop them before they escape! Pop quickly in a row to build a combo multiplier for huge scores.',
        objectives: ['Click bubbles before they float off', 'Pop bubbles in quick succession for combos', '5 lives — don\'t let too many escape!'],
        pc: { 'Click': 'Pop a bubble' },
        mobile: { 'Tap': 'Pop a bubble' }
    },
    'speed-tap': {
        title: 'Speed Tap',
        brief: 'Glowing circles appear and shrink down — tap them before they disappear! The faster you tap, the more points you score.',
        objectives: ['Click targets before they shrink to zero', 'Miss = lose a life', '5× streak doubles your points!'],
        pc: { 'Click': 'Tap target' },
        mobile: { 'Tap': 'Tap target' }
    },
    'gem-match': {
        title: 'Gem Match',
        brief: 'Classic match-3 puzzle! Click a gem, then click an adjacent one to swap. Match 3+ gems in a row or column to clear them.',
        objectives: ['Swap adjacent gems to match 3 or more', 'Chain matches for cascades = bonus points', 'Hint arrow appears if you\'re stuck'],
        pc: { 'Click gem': 'Select', 'Click neighbour': 'Swap & match' },
        mobile: { 'Tap gem': 'Select', 'Tap neighbour': 'Swap & match' }
    },
    'color-road': {
        title: 'Color Road',
        brief: 'A neon ball rolls along 4 lanes. Colored blocks approach — tap SPACE or click to switch lanes and make sure your ball color matches the block!',
        objectives: ['Match your ball color to the lane block color', 'Survive as long as possible', 'Wrong color = crash and lose a life'],
        pc: { 'Space / Click': 'Switch to next lane' },
        mobile: { 'Tap': 'Switch to next lane' }
    },
    'laser-defense': {
        title: 'Laser Defense',
        brief: 'Enemy ships fire lasers at your base. Move your energy shield to intercept every laser before it hits. Enemies get faster every wave!',
        objectives: ['Block enemy lasers with your shield', 'Deflecting a laser earns +5 points', 'Don\'t let enemies reach your base'],
        pc: { '← →': 'Move shield left / right' },
        mobile: { '◄ ► D-Pad': 'Move shield' }
    },
    'fruit-catcher': {
        title: 'Fruit Catcher',
        brief: 'Fruits of all kinds fall from above — catch them in your basket! Dodge bombs or lose a life. String 3+ catches together for a combo multiplier.',
        objectives: ['Catch falling fruits in your basket', 'Dodge bombs — each hit costs a life', '3× combo = double points on every catch'],
        pc: { '← →': 'Move basket', 'Mouse drag': 'Move basket precisely' },
        mobile: { 'Touch drag': 'Slide basket left & right' }
    },
    'aim-trainer': {
        title: 'Aim Trainer',
        brief: 'Bullseye targets bounce around the arena. Click them before their life bar runs out. Hit the dead center for 30 pts; the outer ring gives 15. Build a streak for 2× bonus!',
        objectives: ['Click targets before they expire', 'Hit the bullseye center for maximum points', '5× streak doubles all scoring'],
        pc: { 'Click': 'Shoot target' },
        mobile: { 'Tap': 'Shoot target' }
    },
    'tile-slide': {
        title: 'Tile Slide',
        brief: 'Classic 15-puzzle on a 4×4 grid. One tile is missing — slide the others into the correct 1–15 order. Highlighted tiles can move into the gap.',
        objectives: ['Arrange tiles 1–15 in order', 'Tap / click a highlighted tile to slide it', 'Try to solve in the fewest moves possible'],
        pc: { 'Click tile': 'Slide tile into gap', '← → ↑ ↓': 'Slide tiles with arrow keys' },
        mobile: { 'Tap tile': 'Slide tile into gap' }
    },
    'meteor-rain': {
        title: 'Meteor Rain',
        brief: 'A relentless meteor shower rains down from above! Pilot your neon ship left and right to weave through the chaos. The meteors fall faster the longer you survive.',
        objectives: ['Dodge all incoming meteors', 'Survive as long as possible', 'Speed increases with your score'],
        pc: { '← / A': 'Move Left', '→ / D': 'Move Right', 'Click': 'Restart after death' },
        mobile: { '◄ ► D-Pad': 'Move ship left / right' }
    },
    'tank-blitz': {
        title: 'Tank Blitz',
        brief: 'Command your neon tank on a glowing battlefield! Rotate to aim, drive forward/back, and blast enemy tanks before they close in. Each wave grows larger — how many can you defeat?',
        objectives: ['Destroy all enemy tanks in each wave', 'Survive with your 3 lives', 'Each cleared wave = bonus points + harder enemies'],
        pc: { '← / A': 'Rotate Left', '→ / D': 'Rotate Right', '↑ / W': 'Drive Forward', '↓ / S': 'Reverse', 'Space': 'Fire Cannon' },
        mobile: { '◄ ► D-Pad': 'Rotate', '▲ D-Pad': 'Drive', 'A Button': 'Shoot' }
    },
    'whack-a-mole': {
        title: 'Whack-A-Mole',
        brief: 'Moles pop out of holes — smash them before they disappear! You have 60 seconds. Moles appear faster as time goes on. How many can you whack?',
        objectives: ['Click / tap moles as they appear', 'Score as many hits as possible in 60 seconds', 'Moles appear faster over time — stay sharp!'],
        pc: { 'Click mole': 'Whack it!' },
        mobile: { 'Tap mole': 'Whack it!' }
    },
    'reaction-time': {
        title: 'Reaction Time',
        brief: 'A massive circle sits on screen RED. When it flashes GREEN — tap immediately! Click too early = false start penalty. 10 rounds, lowest average time wins.',
        objectives: ['Wait for RED → GREEN signal', 'Click / tap as fast as possible', 'Complete 10 rounds and see your average reaction time'],
        pc: { 'Click / Space': 'React! (when circle turns green)' },
        mobile: { 'Tap screen': 'React! (when circle turns green)' }
    },
    'game-2048': {
        title: '2048',
        brief: 'Slide all tiles in one direction — identical tiles merge and double. Start with 2s and 4s, combine strategically to reach the legendary 2048 tile!',
        objectives: ['Slide tiles to merge matching numbers', 'Reach the 2048 tile to win', 'The board fills up quickly — plan your moves!'],
        pc: { '← → ↑ ↓ Arrow Keys': 'Slide all tiles in that direction', 'Space': 'Restart when game over' },
        mobile: { '◄ ▲ ▼ ► D-Pad': 'Slide tiles' }
    },
    'tunnel-rush': {
        title: 'Tunnel Rush',
        brief: 'Hurtle through an endless 3D neon tunnel at blistering speed. Rotating obstacle rings block your path — dodge left and right to weave through the gaps!',
        objectives: ['Dodge rotating obstacle rings', 'Survive as long as possible', 'Rings get faster and denser over time'],
        pc: { '← / A': 'Rotate Left', '→ / D': 'Rotate Right' },
        mobile: { 'Drag left / right': 'Rotate around tunnel' }
    },
    'plasma-shield': {
        title: 'Plasma Shield',
        brief: 'Enemy plasma bolts are converging on your energy core from all directions! Rotate your circular shield arc to intercept every shot before it hits.',
        objectives: ['Rotate shield to deflect incoming bolts', 'Each deflection earns +10 points', 'Don\'t let bullets reach your core — 3 lives!'],
        pc: { '← / A': 'Rotate Shield Left', '→ / D': 'Rotate Shield Right' },
        mobile: { 'Drag left / right': 'Rotate shield' }
    },
    'brick-breaker': {
        title: 'Brick Breaker',
        brief: 'Classic neon breakout — bounce the ball off your paddle to smash rows of glowing bricks. Grab power-ups to widen your paddle or unleash multi-ball chaos!',
        objectives: ['Bounce ball to clear all bricks', 'Don\'t let the ball fall off screen (3 lives)', 'Catch power-ups: Wide Paddle, Multi-Ball'],
        pc: { 'Move Mouse': 'Move paddle', '← / →': 'Move paddle', 'Space / Click': 'Launch ball' },
        mobile: { 'Touch drag': 'Move paddle', 'Tap': 'Launch ball' }
    },
    'number-memory': {
        title: 'Number Memory',
        brief: 'A number of increasing length flashes on screen — study it carefully, then tap it back digit by digit from memory. The display time shrinks each level!',
        objectives: ['Memorize the displayed number', 'Type it back perfectly using the numpad', 'Each correct answer levels you up — numbers get longer!'],
        pc: { '0–9 Keys': 'Type digit', 'Backspace': 'Delete last digit', 'Enter': 'Submit answer' },
        mobile: { 'Tap numpad': 'Enter digits' }
    },
    'sudoku-lite': {
        title: 'Sudoku Lite',
        brief: 'Classic Sudoku on a compact 6×6 grid. Fill every row, column, and 2×3 box with numbers 1–6. No repeats allowed — solve the puzzle for maximum points!',
        objectives: ['Fill the 6×6 grid with numbers 1–6', 'No repeats in any row, column, or 2×3 box', 'Solve with fewest errors for the best score'],
        pc: { 'Click cell': 'Select cell', '1–6 Keys': 'Place number', '← → ↑ ↓': 'Navigate cells', 'Backspace': 'Clear cell' },
        mobile: { 'Tap cell': 'Select', 'Tap numpad': 'Place number' }
    },
    'neon-memory': {
        title: 'Neon Memory',
        brief: 'Flip neon cards to find matching icon pairs on a 4×4 grid. Cards flash then hide — remember where each icon is and match all 8 pairs in the fewest moves!',
        objectives: ['Flip two cards to reveal their icons', 'Match all 8 pairs to win', 'Fewer moves = better score!'],
        pc: { 'Click card': 'Flip card', 'Space': 'Restart after winning' },
        mobile: { 'Tap card': 'Flip card' }
    }
};




function launchGame(gameId) {
    GameAudio.playSound('click');
    // ... (rest of function) ...
    // (We don't need to replace the whole file, just the GAME_DATA and the toggle logic at the top)

    const modal = document.getElementById('game-modal');
    const canvas = document.getElementById('game-canvas');
    const title = document.getElementById('modal-game-title');
    const scoreEl = document.getElementById('modal-score');
    const overlay = document.getElementById('game-ui-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayBtn = document.getElementById('overlay-btn');
    const overlayMsg = document.getElementById('overlay-message');
    const vController = document.getElementById('virtual-controller');

    const briefEl = document.getElementById('match-brief');
    const objListEl = document.getElementById('objective-list');
    const controlsEl = document.getElementById('controls-grid');

    const data = GAME_DATA[gameId] || {
        title: 'Unknown Game',
        brief: 'System error.',
        objectives: ['Survive'],
        pc: { '???': '???' },
        mobile: { '???': '???' }
    };

    const isMobile = window.innerWidth <= 992 || 'ontouchstart' in window;
    const controls = isMobile ? data.mobile : data.pc;

    title.textContent = data.title;
    overlayTitle.textContent = data.title;
    briefEl.textContent = data.brief;
    objListEl.innerHTML = data.objectives.map(obj => `<li>${obj}</li>`).join('');

    controlsEl.innerHTML = Object.entries(controls).map(([key, action]) => `
        <div class="control-item">
            <span>${action}</span>
            <div class="key-cap">${key}</div>
        </div>
    `).join('');

    overlayMsg.textContent = 'System Ready';
    scoreEl.textContent = 'Score: 0';
    modal.classList.add('active');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (isMobile) {
        vController.classList.remove('hidden');
    } else {
        vController.classList.add('hidden');
    }

    const toggleBtn = document.getElementById('modal-info-toggle');
    const howtoPanel = document.getElementById('howto-panel');
    const howtoClose = document.getElementById('howto-close');
    const howtoBrief = document.getElementById('howto-brief');
    const howtoObjs = document.getElementById('howto-objectives');
    const howtoCtrls = document.getElementById('howto-controls');

    // Populate howto content from GAME_DATA
    howtoBrief.textContent = data.brief;
    howtoObjs.innerHTML = data.objectives.map(o => `<li>${o}</li>`).join('');
    const ctrlData = isMobile ? data.mobile : data.pc;
    howtoCtrls.innerHTML = Object.entries(ctrlData).map(([key, act]) =>
        `<div class="howto-key"><span class="hk-key">${key}</span><span class="hk-sep">→</span><span class="hk-act">${act}</span></div>`
    ).join('');

    // HOW TO PLAY: pause game + show overlay
    function openHowTo() {
        GameAudio.playSound('click');
        window.gamePaused = true;
        howtoPanel.classList.remove('hidden');
        toggleBtn.classList.add('active');
    }
    function closeHowTo() {
        window.gamePaused = false;
        howtoPanel.classList.add('hidden');
        toggleBtn.classList.remove('active');
    }
    toggleBtn.onclick = openHowTo;
    howtoClose.onclick = closeHowTo;
    // Also close on backdrop click
    howtoPanel.addEventListener('click', e => { if (e.target === howtoPanel) closeHowTo(); });

    // Reset panel on each launch
    howtoPanel.classList.add('hidden');
    window.gamePaused = false;


    setTimeout(() => {
        const container = document.querySelector('.game-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }, 100);

    const existingScript = document.getElementById('game-script');
    if (existingScript) existingScript.remove();
    if (currentGameInstance && currentGameInstance.destroy) currentGameInstance.destroy();
    currentGameInstance = null;
    InputSystem.reset();

    const script = document.createElement('script');
    script.id = 'game-script';
    script.src = `js/games/${gameId}.js`;

    script.onload = () => {
        overlayBtn.onclick = () => {
            GameAudio.playSound('click');
            overlay.classList.add('hidden');
            if (window.GameModule && window.GameModule.init) {
                currentGameInstance = window.GameModule;
                window.GameModule.init(canvas, scoreEl, GameAudio, InputSystem);
            }
        };
    };
    script.onerror = () => {
        overlayMsg.textContent = 'Module Missing';
    };
    document.body.appendChild(script);
}

function closeGame() {
    GameAudio.playSound('click');
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    window.gamePaused = false;
    // Hide howto panel
    const hp = document.getElementById('howto-panel');
    if (hp) hp.classList.add('hidden');
    if (currentGameInstance && currentGameInstance.destroy) {
        currentGameInstance.destroy();
    }
    currentGameInstance = null;
    const s = document.getElementById('game-script');
    if (s) s.remove();
    window.GameModule = null;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGame();
});
