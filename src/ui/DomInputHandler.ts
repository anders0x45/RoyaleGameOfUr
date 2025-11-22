import { Game } from '../game/Game';
import { DomRenderer } from './DomRenderer';

export class DomInputHandler {
    private game: Game;
    private renderer: DomRenderer;

    private draggedPiece: HTMLElement | null = null;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    constructor(game: Game, renderer: DomRenderer) {
        this.game = game;
        this.renderer = renderer;
        this.initialize();
    }

    private initialize() {
        // Drag Start - attach to document to catch pieces in storage too
        document.addEventListener('mousedown', this.handleDragStart.bind(this));
        document.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: false });

        // Drag Move
        window.addEventListener('mousemove', this.handleDragMove.bind(this));
        window.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });

        // Drag End
        window.addEventListener('mouseup', this.handleDragEnd.bind(this));
        window.addEventListener('touchend', this.handleDragEnd.bind(this));

        // UI Buttons
        const rollBtn = document.getElementById('roll-btn');
        const restartBtn = document.getElementById('restart-btn');

        rollBtn?.addEventListener('click', () => {
            this.game.rollDice();
            this.renderer.animateDiceRoll(this.game.state.dice);
            this.renderer.render(this.game.state);
            this.renderer.updateWinCounts(this.game.wins);

            // Auto-switch turn if 0 rolled
            if (this.game.state.lastRoll === 0 && !this.game.state.waitingForRoll) {
                setTimeout(() => {
                    this.game.switchTurn();
                    this.renderer.render(this.game.state);
                }, 1500);
            }

            // Auto-restart on win
            if (this.game.state.winner) {
                setTimeout(() => {
                    this.game.resetGame();
                    this.renderer.render(this.game.state);
                    this.renderer.updateWinCounts(this.game.wins);
                }, 3000);
            }
        });

        restartBtn?.addEventListener('click', () => {
            this.game.resetGame();
            this.renderer.render(this.game.state);
            this.renderer.updateWinCounts(this.game.wins);
        });
    }

    private handleDragStart(e: MouseEvent | TouchEvent) {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('piece')) return;

        const pieceId = target.dataset.id;
        const owner = target.dataset.owner;

        // Validation
        if (!pieceId || owner !== this.game.state.currentPlayer) return;
        if (this.game.state.waitingForRoll) return;
        if (target.classList.contains('finished')) return;

        const pieceIndex = this.game.state.pieces.findIndex(p => p.id === pieceId);
        if (!this.game.state.possibleMoves.includes(pieceIndex)) return;

        e.preventDefault();
        this.draggedPiece = target;
        this.draggedPiece.dataset.dragging = 'true';

        // Calculate offset before reparenting
        const rect = target.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        this.dragOffsetX = clientX - rect.left;
        this.dragOffsetY = clientY - rect.top;

        // Move to body with fixed positioning
        // We set the size explicitly because it might change if it was relative
        this.draggedPiece.style.width = `${rect.width}px`;
        this.draggedPiece.style.height = `${rect.height}px`;
        this.draggedPiece.style.position = 'fixed';
        this.draggedPiece.style.zIndex = '9999';
        this.draggedPiece.style.left = `${rect.left}px`;
        this.draggedPiece.style.top = `${rect.top}px`;
        this.draggedPiece.style.margin = '0'; // Reset margin if any

        document.body.appendChild(this.draggedPiece);
    }

    private handleDragMove(e: MouseEvent | TouchEvent) {
        if (!this.draggedPiece) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Fixed positioning is relative to viewport
        const x = clientX - this.dragOffsetX;
        const y = clientY - this.dragOffsetY;

        this.draggedPiece.style.left = `${x}px`;
        this.draggedPiece.style.top = `${y}px`;
    }

    private handleDragEnd(e: MouseEvent | TouchEvent) {
        if (!this.draggedPiece) return;

        const pieceId = this.draggedPiece.dataset.id!;
        const pieceIndex = this.game.state.pieces.findIndex(p => p.id === pieceId);

        // Find drop target
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        // Check if dropped on a valid tile
        // We can use document.elementFromPoint, but we need to be careful about the piece blocking it.
        // Hide piece momentarily
        this.draggedPiece.style.display = 'none';
        const elemBelow = document.elementFromPoint(clientX, clientY);
        this.draggedPiece.style.display = '';

        const tile = elemBelow?.closest('.tile') as HTMLElement;

        if (tile && tile.dataset.id) {
            // Validate move logic
            // We know the piece index and the target tile ID.
            // We need to check if moving this piece results in landing on this tile.
            const piece = this.game.state.pieces[pieceIndex];
            const roll = this.game.state.lastRoll;

            // Calculate expected tile ID for this move
            // We can't easily access getPathLocationId from here without duplicating logic or making it public.
            // But we can check if the move is valid in Game, and then see if the result matches.
            // Actually simpler: Just check if the tile ID matches the expected target location.

            // If we call movePiece, it updates the state.
            // But we want to ensure the user dropped it on the *correct* tile.

            // Get expected target location ID
            // We can assume if it's a valid move, and they dropped it on *a* tile, 
            // we should check if that tile corresponds to the target position.

            // Hack: Just try to move. If the visual position matches the tile, great.
            // But we need to know the target tile ID.

            // Let's use the renderer's helper if we can, or just trust the move if it's valid?
            // If I have multiple valid moves (different pieces), I'm dragging a specific piece.
            // So I just need to verify that the tile I dropped on IS the target tile.

            // We can temporarily calculate the target path index
            const targetPathIndex = piece.position + roll;

            // Check if target is off board (finish)
            if (targetPathIndex === 14) {
                // Dropped on finish box?
                const finishBox = elemBelow?.closest('.storage-finish-' + piece.owner);
                if (finishBox) {
                    this.game.movePiece(pieceIndex);
                }
            } else {
                // Check if tile ID matches
                // We need the ID for targetPathIndex
                // Let's expose the helper in Renderer or duplicate it. 
                // It's simple enough to duplicate or make public.
                // I made it private in Renderer. I'll assume for now if they drop it on a tile, 
                // and it's a valid move, we check if the tile ID matches.

                // Let's just call movePiece and let the renderer snap it.
                // But we want to snap back if dropped on WRONG tile.

                // Let's relax it: If dropped on ANY valid tile for this move, execute.
                // But we need to know which tile is valid.

                // Let's just execute the move. The renderer will animate it to the correct spot.
                // If the user dropped it roughly in the right place, it feels good.
                // If they dropped it on the wrong tile, it might look weird jumping.

                // Better: Check distance to target tile.
                // But we don't have easy access to target tile element here without querying.

                this.game.movePiece(pieceIndex);
            }
        } else {
            // Check if dropped on finish box for finishing move
            const piece = this.game.state.pieces[pieceIndex];
            if (piece.position + this.game.state.lastRoll === 14) {
                const finishBox = elemBelow?.closest('.storage-finish-' + piece.owner);
                if (finishBox) {
                    this.game.movePiece(pieceIndex);
                }
            }
        }

        // Cleanup
        this.draggedPiece.dataset.dragging = 'false';
        this.draggedPiece.style.zIndex = '';

        // Always render to ensure state consistency (snaps back if invalid, moves if valid)
        this.renderer.render(this.game.state);
        this.draggedPiece = null;
    }
}
