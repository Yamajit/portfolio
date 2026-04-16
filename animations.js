// ==========================================
// ✍️ TYPEWRITER EFFECT — HERO SUBTITLE
// ==========================================
(function initTypewriter() {
    const subtitle = document.querySelector('.hero-subtitle');
    if (!subtitle) return;
    const fullText = subtitle.textContent;
    subtitle.textContent = '';
    subtitle.style.display = 'inline-block';

    let i = 0;
    function type() {
        if (i < fullText.length) {
            subtitle.textContent += fullText.charAt(i);
            i++;
            setTimeout(type, 55);
        } else {
            setTimeout(() => {
                subtitle.classList.add('typed');
            }, 1200);
        }
    }
    setTimeout(type, 800);
})();

// ==========================================
// 🌌 PARALLAX SCROLL DEPTH EFFECT
// ==========================================
(function initParallaxScroll() {
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.scrollY;
                const heroVisual = document.querySelector('.hero-visual');
                if (heroVisual) {
                    heroVisual.style.transform = `translateY(${scrolled * 0.12}px)`;
                }
                const picFrame = document.querySelector('.pic-frame');
                if (picFrame) {
                    const rect = picFrame.getBoundingClientRect();
                    if (rect.top < window.innerHeight && rect.bottom > 0) {
                        const offset = (window.innerHeight / 2 - rect.top) * 0.04;
                        picFrame.style.transform = `translateY(${offset}px)`;
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });
})();

// ==========================================
// 🎯 SKILL CARD TILT ON HOVER
// ==========================================
(function initTiltCards() {
    const cards = document.querySelectorAll('.skill-category');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;
            card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
})();

// ==========================================
// 🔢 ANIMATED COUNTER FOR ABOUT STATS
// ==========================================
(function initCounterAnimation() {
    const statsSection = document.querySelector('.about-stats');
    if (!statsSection) return;

    let animated = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                const statNumbers = statsSection.querySelectorAll('.stat-number');
                statNumbers.forEach(el => {
                    const text = el.textContent;
                    const num = parseInt(text);
                    if (!isNaN(num) && text.includes('+')) {
                        el.textContent = '0+';
                        let current = 0;
                        const step = Math.max(1, Math.floor(num / 30));
                        const interval = setInterval(() => {
                            current += step;
                            if (current >= num) {
                                current = num;
                                clearInterval(interval);
                            }
                            el.textContent = current + '+';
                        }, 40);
                    }
                });
            }
        });
    }, { threshold: 0.5 });

    observer.observe(statsSection);
})();

// ==========================================
// 🖱️ SMOOTH MAGNETIC BUTTON EFFECT
// ==========================================
(function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-play, .btn-project');
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
})();

// ==========================================
// ✨ SMOOTH SECTION TITLE GLOW ON SCROLL  
// ==========================================
(function initTitleGlow() {
    const titles = document.querySelectorAll('.section-title');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.textShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
                entry.target.style.transition = 'text-shadow 1s ease';
            } else {
                entry.target.style.textShadow = 'none';
            }
        });
    }, { threshold: 0.5 });

    titles.forEach(title => observer.observe(title));
})();

// ==========================================
// 🌗 THEME TOGGLE (DARK / LIGHT MODE)
// ==========================================
(function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('.theme-icon');
    const label = toggleBtn.querySelector('.theme-label');
    const STORAGE_KEY = 'nishant-portfolio-theme';

    // Load saved theme (default = dark)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') {
        document.body.classList.add('light-mode');
        icon.textContent = '☀️';
        if (label) label.textContent = 'Light';
    }

    toggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');

        // Spin animation
        toggleBtn.classList.add('spin');
        setTimeout(() => toggleBtn.classList.remove('spin'), 500);

        // Swap icon & label
        icon.textContent = isLight ? '☀️' : '🌙';
        if (label) label.textContent = isLight ? 'Light' : 'Dark';

        // Save preference
        localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
    });
})();
