/* GAMEZONE — Intro Animation Controller */
(function () {
    const overlay = document.getElementById('intro-overlay');
    const skipBtn = document.getElementById('skip-intro');
    const mainSite = document.getElementById('main-site');
    const scenes = [
        document.getElementById('scene-1'),
        document.getElementById('scene-2'),
        document.getElementById('scene-3'),
        document.getElementById('scene-final')
    ];
    const SCENE_DURATION = [4500, 5000, 5000, 3000];
    let currentScene = -1;
    let timeouts = [];

    if (sessionStorage.getItem('gz-intro-seen')) {
        overlay.style.display = 'none';
        mainSite.classList.remove('hidden');
        return;
    }

    function showScene(index) {
        scenes.forEach(s => s.classList.remove('active'));
        if (index < scenes.length) {
            currentScene = index;
            scenes[index].classList.add('active');
            if (window.GameAudio) {
                if (index === 0) window.GameAudio.playSound('mask'); // silence?
                else if (index === 3) window.GameAudio.playSound('score');
                else window.GameAudio.playSound('click');
            }
        }
    }

    function runSequence() {
        let delay = 500;
        scenes.forEach((_, i) => {
            timeouts.push(setTimeout(() => showScene(i), delay));
            delay += SCENE_DURATION[i];
        });
        timeouts.push(setTimeout(() => transitionToSite(), delay));
    }

    function transitionToSite() {
        sessionStorage.setItem('gz-intro-seen', '1');
        overlay.classList.add('fade-out');
        mainSite.classList.remove('hidden');
        setTimeout(() => { overlay.style.display = 'none'; }, 1500);
    }

    function skipIntro(instant) {
        timeouts.forEach(t => clearTimeout(t));
        timeouts = [];
        sessionStorage.setItem('gz-intro-seen', '1');
        if (instant) {
            overlay.style.display = 'none';
            mainSite.classList.remove('hidden');
        } else {
            transitionToSite();
        }
    }

    skipBtn.addEventListener('click', () => skipIntro(false));
    runSequence();
})();
