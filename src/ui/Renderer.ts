import type { GameState, PlayerId } from '../game/types';

export class Renderer {
    private boardElement: HTMLElement;
    private lightStartElement: HTMLElement;
    private lightFinishElement: HTMLElement;
    private darkStartElement: HTMLElement;
    private darkFinishElement: HTMLElement;
    private turnIndicator: HTMLElement;
    private lightScore: HTMLElement;
    private darkScore: HTMLElement;
    private diceContainer: HTMLElement;
    private rollResult: HTMLElement;
    private rollBtn: HTMLButtonElement;
    private winnerModal: HTMLElement;
    private winnerText: HTMLElement;

    constructor() {
        this.boardElement = document.getElementById('board')!;
        this.lightStartElement = document.getElementById('light-start')!;
        this.lightFinishElement = document.getElementById('light-finish')!;
        this.darkStartElement = document.getElementById('dark-start')!;
        this.darkFinishElement = document.getElementById('dark-finish')!;
        this.turnIndicator = document.getElementById('turn-indicator')!;
        this.lightScore = document.getElementById('light-score')!;
        this.darkScore = document.getElementById('dark-score')!;
        this.diceContainer = document.getElementById('dice-container')!;
        this.rollResult = document.getElementById('roll-result')!;
        this.rollBtn = document.getElementById('roll-btn') as HTMLButtonElement;
        this.winnerModal = document.getElementById('winner-modal')!;
        this.winnerText = document.getElementById('winner-text')!;

        this.initializeBoard();
    }

    private initializeBoard() {
        // The board is 8x3. We need to render tiles or empty spaces.
        // Layout:
        // Row 0: [L3][L2][L1][L0] [Empty][Empty] [L4][L5]
        // Row 1: [C0][C1][C2][C3] [C4]   [C5]    [C6][C7]
        // Row 2: [D3][D2][D1][D0] [Empty][Empty] [D4][D5]

        // We can map grid coordinates (row, col) to our logical IDs or just render them.
        // Let's use a flat list of 24 cells (3 rows * 8 cols).

        const layout = [
            // Row 0 (Light Home)
            { type: 'tile', id: 'L3' }, { type: 'tile', id: 'L2' }, { type: 'tile', id: 'L1' }, { type: 'tile', id: 'L0' },
            { type: 'empty' }, { type: 'empty' },
            { type: 'tile', id: 'L4' }, { type: 'tile', id: 'L5', rosette: true },

            // Row 1 (Combat)
            { type: 'tile', id: 'C0' }, { type: 'tile', id: 'C1' }, { type: 'tile', id: 'C2' }, { type: 'tile', id: 'C3', rosette: true },
            { type: 'tile', id: 'C4' }, { type: 'tile', id: 'C5' }, { type: 'tile', id: 'C6' }, { type: 'tile', id: 'C7' },

            // Row 2 (Dark Home)
            { type: 'tile', id: 'D3' }, { type: 'tile', id: 'D2' }, { type: 'tile', id: 'D1' }, { type: 'tile', id: 'D0' },
            { type: 'empty' }, { type: 'empty' },
            { type: 'tile', id: 'D4' }, { type: 'tile', id: 'D5', rosette: true },
        ];

        this.boardElement.innerHTML = '';
        layout.forEach((cell) => {
            const div = document.createElement('div');
            div.className = 'tile';
            if (cell.type === 'empty') {
                div.classList.add('empty');
            } else {
                div.dataset.id = cell.id;
                if (cell.rosette) div.classList.add('rosette');
            }
            this.boardElement.appendChild(div);
        });
    }

    render(state: GameState) {
        this.updatePieces(state);
        this.updateUI(state);
    }

    private updatePieces(state: GameState) {
        // Clear all pieces from board and zones
        document.querySelectorAll('.piece').forEach(el => el.remove());

        state.pieces.forEach((piece, index) => {
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${piece.owner}`;
            pieceEl.dataset.index = index.toString();

            if (piece.isFinished) {
                // Don't render finished pieces on board, just count them in score
                // Or render them in finish zone? Let's render in finish zone for visual.
                const container = piece.owner === 'light' ? this.lightFinishElement : this.darkFinishElement;
                container.appendChild(pieceEl);
                // Stack them
                pieceEl.style.position = 'static';
                pieceEl.style.marginBottom = '-30px';
            } else if (piece.position === -1) {
                // Start zone
                const container = piece.owner === 'light' ? this.lightStartElement : this.darkStartElement;
                container.appendChild(pieceEl);
                pieceEl.style.position = 'static';
                pieceEl.style.marginBottom = '-30px';

                // Make clickable if valid move
                if (state.possibleMoves.includes(index)) {
                    pieceEl.classList.add('clickable');
                }
            } else {
                // On board
                const locationId = this.getPathLocationId(piece.owner, piece.position);
                const tile = this.boardElement.querySelector(`[data-id="${locationId}"]`);
                if (tile) {
                    tile.appendChild(pieceEl);
                    // Center it
                    pieceEl.style.position = 'absolute';

                    if (state.possibleMoves.includes(index)) {
                        pieceEl.classList.add('clickable');
                    }
                }
            }
        });

        // Highlight valid moves (destination tiles)
        document.querySelectorAll('.tile').forEach(t => t.classList.remove('valid-move'));
        if (state.possibleMoves.length > 0) {
            state.possibleMoves.forEach(pieceIndex => {
                const piece = state.pieces[pieceIndex];
                const targetPos = piece.position + state.lastRoll;
                if (targetPos <= 14) {
                    const targetLoc = this.getPathLocationId(piece.owner, targetPos);
                    const tile = this.boardElement.querySelector(`[data-id="${targetLoc}"]`);
                    if (tile) tile.classList.add('valid-move');
                }
            });
        }
    }

    private updateUI(state: GameState) {
        // Turn Indicator
        this.turnIndicator.textContent = `${state.currentPlayer.toUpperCase()}'s Turn`;
        this.turnIndicator.style.color = state.currentPlayer === 'light' ? 'var(--light-player)' : 'var(--dark-player)';

        // Scores
        const lightFinished = state.pieces.filter(p => p.owner === 'light' && p.isFinished).length;
        const darkFinished = state.pieces.filter(p => p.owner === 'dark' && p.isFinished).length;
        this.lightScore.textContent = `Pieces Home: ${lightFinished}/7`;
        this.darkScore.textContent = `Pieces Home: ${darkFinished}/7`;

        // Dice
        const diceEls = this.diceContainer.querySelectorAll('.die');
        state.dice.forEach((val, i) => {
            const die = diceEls[i];
            if (val === 1) die.classList.add('rolled-1');
            else die.classList.remove('rolled-1');
        });

        // Roll Button
        this.rollBtn.disabled = !state.waitingForRoll;
        this.rollResult.textContent = state.waitingForRoll ? '' : `Rolled: ${state.lastRoll}`;

        if (state.lastRoll === 0 && !state.waitingForRoll) {
            this.rollResult.textContent = "Rolled: 0 (Skip Turn)";
        }

        // Winner Modal
        if (state.winner) {
            this.winnerText.textContent = `${state.winner.toUpperCase()} WINS!`;
            this.winnerModal.classList.remove('hidden');
        } else {
            this.winnerModal.classList.add('hidden');
        }
    }

    // Helper to map logic to UI IDs (Duplicate of Game logic but necessary for rendering)
    // Ideally this should be shared or Game should expose location IDs.
    // For now, I'll duplicate the simple logic.
    private getPathLocationId(player: PlayerId, pathIndex: number): string {
        if (pathIndex < 0 || pathIndex > 14) return 'OFF';
        if (pathIndex >= 4 && pathIndex <= 11) return `C${pathIndex - 4}`;
        if (pathIndex < 4) return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        if (pathIndex > 11) return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        return 'UNKNOWN';
    }
}
