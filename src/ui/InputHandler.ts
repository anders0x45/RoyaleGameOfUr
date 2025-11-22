import { Game } from '../game/Game';
import { Renderer } from './Renderer';

export class InputHandler {
    private game: Game;
    private renderer: Renderer;

    constructor(game: Game, renderer: Renderer) {
        this.game = game;
        this.renderer = renderer;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Roll Button
        const rollBtn = document.getElementById('roll-btn');
        rollBtn?.addEventListener('click', () => {
            this.game.rollDice();
            this.renderer.render(this.game.state);

            // If rolled 0, auto-switch turn after delay
            if (this.game.state.lastRoll === 0 && !this.game.state.waitingForRoll) {
                setTimeout(() => {
                    this.game.switchTurn();
                    this.renderer.render(this.game.state);
                }, 1500);
            }
        });

        // Board/Piece Clicks
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Check if clicked on a piece
            if (target.classList.contains('piece')) {
                const index = parseInt(target.dataset.index || '-1');
                if (index !== -1) {
                    this.handlePieceClick(index);
                }
            }
        });

        // Restart Button
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
    }

    private handlePieceClick(index: number) {
        if (this.game.state.possibleMoves.includes(index)) {
            this.game.movePiece(index);
            this.renderer.render(this.game.state);
        }
    }
}
