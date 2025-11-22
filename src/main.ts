import './style.css'
import { Game } from './game/Game'
import { DomRenderer } from './ui/DomRenderer'
import { DomInputHandler } from './ui/DomInputHandler'

const game = new Game();
const renderer = new DomRenderer();
new DomInputHandler(game, renderer);

// Initial render
renderer.render(game.state);
renderer.updateWinCounts(game.wins);

// Theme Toggle
const themeBtn = document.getElementById('theme-btn');
let currentTheme: 'light' | 'dark' = 'light';

// Initialize theme from body or default
if (document.body.dataset.theme) {
    currentTheme = document.body.dataset.theme as 'light' | 'dark';
}

themeBtn?.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = currentTheme;
    renderer.setTheme(currentTheme);
});

// Help Modal
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelp = document.getElementById('close-help');

helpBtn?.addEventListener('click', () => {
    helpModal?.classList.remove('hidden');
});

closeHelp?.addEventListener('click', () => {
    helpModal?.classList.add('hidden');
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal?.classList.add('hidden');
    }
});
