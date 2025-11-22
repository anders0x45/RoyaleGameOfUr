import type { GameState, PlayerId } from '../game/types';
import gsap from 'gsap';

export class DomRenderer {
    private boardContainer: HTMLElement;
    private turnIndicator: HTMLElement;
    private lightScore: HTMLElement;
    private darkScore: HTMLElement;
    private lightWins: HTMLElement;
    private darkWins: HTMLElement;
    private diceContainer: HTMLElement;
    private rollBtn: HTMLButtonElement;
    private winnerModal: HTMLElement;
    private winnerText: HTMLElement;

    private tiles: Map<string, HTMLElement> = new Map();
    private pieces: Map<string, HTMLElement> = new Map();

    // Storage boxes
    private lightStartBox!: HTMLElement;
    private lightFinishBox!: HTMLElement;
    private darkStartBox!: HTMLElement;
    private darkFinishBox!: HTMLElement;

    private lightPanel: HTMLElement;
    private darkPanel: HTMLElement;

    private lightStorage: HTMLElement;
    private darkStorage: HTMLElement;

    constructor() {
        this.boardContainer = document.getElementById('board-container')!;
        this.turnIndicator = document.getElementById('turn-indicator')!;
        this.lightScore = document.getElementById('light-score')!;
        this.darkScore = document.getElementById('dark-score')!;
        this.lightWins = document.getElementById('light-wins')!;
        this.darkWins = document.getElementById('dark-wins')!;
        this.diceContainer = document.getElementById('dice-container')!;
        this.rollBtn = document.getElementById('roll-btn') as HTMLButtonElement;
        this.winnerModal = document.getElementById('winner-modal')!;
        this.winnerText = document.getElementById('winner-text')!;

        this.lightPanel = document.getElementById('light-panel')!;
        this.darkPanel = document.getElementById('dark-panel')!;

        this.lightStorage = document.getElementById('light-storage')!;
        this.darkStorage = document.getElementById('dark-storage')!;

        this.createBoard();
        this.createStorageBoxes();
    }

    private createBoard() {
        this.boardContainer.innerHTML = '';

        // 3 columns x 8 rows
        // Col 0: Light path (L3-L0, empty, empty, L12-L13)
        // Col 1: Middle path (C0-C7)
        // Col 2: Dark path (D3-D0, empty, empty, D12-D13)

        // We need to map grid coordinates (row, col) to Tile IDs
        const gridLayout: (string | null)[][] = [
            // Row 0 (Bottom): L3, C0, D3
            // ...
            // Row 7 (Top): L13, C7, D13

            // Wait, CSS Grid rows go from top to bottom (1 to 8).
            // So Row 1 is Top (Index 7), Row 8 is Bottom (Index 0).

            ['L13', 'C7', 'D13'], // Row 1 (Top)
            ['L12', 'C6', 'D12'],
            [null, 'C5', null],
            [null, 'C4', null],
            ['L0', 'C3', 'D0'],
            ['L1', 'C2', 'D1'],
            ['L2', 'C1', 'D2'],
            ['L3', 'C0', 'D3'], // Row 8 (Bottom)
        ];

        gridLayout.forEach((row, _rowIndex) => {
            row.forEach((tileId, _colIndex) => {
                const tile = document.createElement('div');
                tile.className = 'tile';

                if (tileId) {
                    tile.dataset.id = tileId;
                    // Rosettes: L3, L13, C3, D3, D13
                    // Note: C3 is the central rosette.
                    // L3/D3 are start rosettes? No, standard Ur has rosettes at corners and center.
                    // Let's check Game logic rosettes.
                    // ROSETTE_INDICES = [3, 7, 13]
                    // L3/D3 (Index 3), C3 (Index 7), L13/D13 (Index 13).
                    // So yes.
                    const isRosette = ['L3', 'D3', 'C3', 'L13', 'D13'].includes(tileId);
                    if (isRosette) {
                        tile.classList.add('rosette');
                    }
                    this.tiles.set(tileId, tile);
                } else {
                    tile.classList.add('empty');
                }

                // Grid positioning handled by CSS Grid order
                // We just append them in order
                this.boardContainer.appendChild(tile);
            });
        });
    }

    private createStorageBoxes() {
        // Create visual indicators for storage
        // Light Start
        this.lightStartBox = document.createElement('div');
        this.lightStartBox.className = 'storage-box storage-start-light';
        this.lightStorage.appendChild(this.lightStartBox);

        // Light Finish
        this.lightFinishBox = document.createElement('div');
        this.lightFinishBox.className = 'storage-box storage-finish-light';
        this.lightStorage.appendChild(this.lightFinishBox);

        // Dark Start
        this.darkStartBox = document.createElement('div');
        this.darkStartBox.className = 'storage-box storage-start-dark';
        this.darkStorage.appendChild(this.darkStartBox);

        // Dark Finish
        this.darkFinishBox = document.createElement('div');
        this.darkFinishBox.className = 'storage-box storage-finish-dark';
        this.darkStorage.appendChild(this.darkFinishBox);
    }

    render(state: GameState) {
        this.updatePieces(state);
        this.updateUI(state);
    }

    private updatePieces(state: GameState) {
        state.pieces.forEach(piece => {
            let pieceEl = this.pieces.get(piece.id);

            if (!pieceEl) {
                pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.owner}`;
                pieceEl.dataset.id = piece.id;
                pieceEl.dataset.owner = piece.owner;
                this.boardContainer.appendChild(pieceEl);
                this.pieces.set(piece.id, pieceEl);
            }

            // If dragging, skip update
            if (pieceEl.dataset.dragging === 'true') return;

            // Determine target parent and properties
            let targetParent: HTMLElement;
            let isFinished = false;

            if (piece.isFinished) {
                targetParent = piece.owner === 'light' ? this.lightFinishBox : this.darkFinishBox;
                isFinished = true;
            } else if (piece.position === -1) {
                targetParent = piece.owner === 'light' ? this.lightStartBox : this.darkStartBox;
            } else {
                targetParent = this.boardContainer;
            }

            // Reparenting Logic with FLIP
            if (pieceEl.parentElement !== targetParent) {
                // 1. Record current position
                const rect = pieceEl.getBoundingClientRect();

                // 2. Change parent
                targetParent.appendChild(pieceEl);

                // 3. Apply classes
                if (isFinished) pieceEl.classList.add('finished');
                else pieceEl.classList.remove('finished');

                // 4. Set position to match previous visual location
                // We need to calculate what left/top makes it appear at 'rect'
                const parentRect = targetParent.getBoundingClientRect();

                // Reset styles that might interfere
                pieceEl.style.position = 'absolute';
                pieceEl.style.transform = 'none';
                pieceEl.style.margin = '0';
                pieceEl.style.zIndex = '10';
                pieceEl.style.width = ''; // Reset width/height from drag
                pieceEl.style.height = '';

                if (isFinished || piece.position === -1) {
                    // In storage, we want it to be relative eventually?
                    // CSS says: .storage-box .piece { position: relative; ... }
                    // But for animation, we might want absolute first?
                    // Actually, if we just append it to storage, it will flow.
                    // If we want to animate it TO the storage slot, it's tricky because we don't know the slot position easily.
                    // Let's just let it snap for storage for now, or use absolute.

                    // Simple approach: Just append and let it be.
                    // But we need to clean up the 'fixed' styles from drag.
                    pieceEl.style.position = ''; // Revert to CSS default (relative for storage, absolute for board)
                    pieceEl.style.left = '';
                    pieceEl.style.top = '';
                    pieceEl.style.zIndex = '';
                    return; // Skip animation for storage for now
                } else {
                    // Board movement
                    const newLeft = rect.left - parentRect.left;
                    const newTop = rect.top - parentRect.top;

                    pieceEl.style.left = `${newLeft}px`;
                    pieceEl.style.top = `${newTop}px`;
                }
            }

            // Animate on Board
            if (!isFinished && piece.position !== -1) {
                // Ensure it's absolute
                pieceEl.style.position = 'absolute';
                pieceEl.style.zIndex = '10';
                pieceEl.style.width = '';
                pieceEl.style.height = '';

                const locationId = this.getPathLocationId(piece.owner, piece.position);
                const tile = this.tiles.get(locationId);

                if (tile) {
                    // Center in tile
                    // Tile is 70x70 (from CSS), Piece is 70*0.7 = 49px
                    // Offset = (70 - 49) / 2 = 10.5
                    const top = tile.offsetTop + 10.5;
                    const left = tile.offsetLeft + 10.5;

                    // Animate
                    gsap.to(pieceEl, {
                        top: top,
                        left: left,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            }
        });
    }

    private updateUI(state: GameState) {
        const playerName = state.currentPlayer === 'light' ? 'Player 1' : 'Player 2';
        this.turnIndicator.textContent = `${playerName}'s Turn`;

        // Active Panel
        if (state.currentPlayer === 'light') {
            this.lightPanel.classList.add('active');
            this.darkPanel.classList.remove('active');
        } else {
            this.lightPanel.classList.remove('active');
            this.darkPanel.classList.add('active');
        }

        // Calculate scores (pieces finished)
        const lightScore = state.pieces.filter(p => p.owner === 'light' && p.isFinished).length;
        const darkScore = state.pieces.filter(p => p.owner === 'dark' && p.isFinished).length;

        this.lightScore.textContent = `${lightScore}`;
        this.darkScore.textContent = `${darkScore}`;

        // Dice
        const diceElements = this.diceContainer.children;
        state.dice.forEach((val, i) => {
            const die = diceElements[i] as HTMLElement;
            if (val === 1) {
                die.classList.add('rolled-1');
            } else {
                die.classList.remove('rolled-1');
            }
        });

        // Roll Result
        const rollResult = document.getElementById('roll-result');
        if (rollResult) {
            rollResult.textContent = state.lastRoll.toString();
        }

        // Roll Button
        this.rollBtn.disabled = !state.waitingForRoll;

        // Winner
        if (state.winner) {
            const winnerName = state.winner === 'light' ? 'Player 1' : 'Player 2';
            this.winnerText.textContent = `${winnerName} Wins!`;
            this.winnerModal.classList.remove('hidden');
        } else {
            this.winnerModal.classList.add('hidden');
        }
    }

    updateWinCounts(wins: { light: number; dark: number }) {
        this.lightWins.textContent = `${wins.light}`;
        this.darkWins.textContent = `${wins.dark}`;
    }

    animateDiceRoll(_result: number[]) {
        // Shake animation for dice container
        gsap.to(this.diceContainer, {
            x: 5,
            duration: 0.05,
            yoyo: true,
            repeat: 5,
            clearProps: "x"
        });
    }

    setTheme(theme: 'light' | 'dark') {
        // Handled by CSS variables on body
        console.log(`Theme set to ${theme}`);
    }

    // Helper to map path index to board location
    private getPathLocationId(player: PlayerId, pathIndex: number): string {
        if (pathIndex < 0 || pathIndex > 14) return 'UNKNOWN';

        if (pathIndex >= 4 && pathIndex <= 11) {
            return `C${pathIndex - 4}`;
        }

        if (pathIndex < 4) {
            return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        }

        if (pathIndex > 11) {
            return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        }

        return 'UNKNOWN';
    }

    // Public getters for InputHandler
    public getTiles() { return this.tiles; }
    public getBoardContainer() { return this.boardContainer; }
}
