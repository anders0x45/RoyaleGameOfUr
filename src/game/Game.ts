import { ROSETTE_INDICES, TOTAL_PIECES } from './types';
import type { GameState, PlayerId } from './types';

export class Game {
    state: GameState;
    wins: { light: number; dark: number } = { light: 0, dark: 0 };

    constructor() {
        this.loadWins();
        this.state = this.getInitialState();
    }

    private loadWins() {
        const saved = localStorage.getItem('rgu-wins');
        if (saved) {
            this.wins = JSON.parse(saved);
        } else {
            this.wins = { light: 0, dark: 0 };
        }
    }

    private saveWins() {
        localStorage.setItem('rgu-wins', JSON.stringify(this.wins));
    }

    resetGame() {
        this.state = this.getInitialState();
    }

    private getInitialState(): GameState {
        return {
            board: [], // We might not need an explicit board array if we use path logic
            pieces: [
                ...Array.from({ length: TOTAL_PIECES }, (_, i) => ({ id: `light-${i}`, owner: 'light' as PlayerId, position: -1, isFinished: false })),
                ...Array.from({ length: TOTAL_PIECES }, (_, i) => ({ id: `dark-${i}`, owner: 'dark' as PlayerId, position: -1, isFinished: false })),
            ],
            currentPlayer: 'light',
            dice: [0, 0, 0, 0],
            waitingForRoll: true,
            possibleMoves: [],
            winner: null,
            lastRoll: 0,
        };
    }

    rollDice(): number {
        if (!this.state.waitingForRoll) return this.state.lastRoll;

        const rolls = Array.from({ length: 4 }, () => Math.random() < 0.5 ? 1 : 0);
        const total = rolls.reduce((a: number, b) => a + b, 0);

        this.state.dice = rolls;
        this.state.lastRoll = total;
        this.state.waitingForRoll = false;

        if (total === 0) {
            // No moves possible, switch turn immediately (after a small delay usually, but logic wise here)
            // Actually, let's let the UI handle the delay. We just set possible moves to empty.
            this.state.possibleMoves = [];
            // In Ur, if you roll 0, you miss your turn.
            // We will return 0 and let the UI call switchTurn or we can handle it?
            // Better to let UI show the 0 roll, then user clicks "End Turn" or auto-switch.
            // For now, let's calculate moves. If 0, moves is empty.
        } else {
            this.calculatePossibleMoves(total);
        }

        // If no moves possible even with non-zero roll (blocked), turn ends.
        // But we usually wait for user acknowledgement.

        return total;
    }

    calculatePossibleMoves(roll: number) {
        const { pieces, currentPlayer } = this.state;
        const myPieces = pieces.filter(p => p.owner === currentPlayer && !p.isFinished);
        const validPieceIndices: number[] = [];

        myPieces.forEach(p => {
            const targetPos = p.position + roll;

            // 1. Check if target is off board (exact match required to finish)
            if (targetPos === 14) {
                validPieceIndices.push(pieces.indexOf(p));
                return;
            }
            if (targetPos > 14) return; // Overshot

            // 2. Check collision
            // Get the board location ID for the target path index
            const targetLocation = this.getPathLocation(currentPlayer, targetPos);

            // Check if any piece is already there
            const occupier = pieces.find(other =>
                !other.isFinished &&
                other.position !== -1 &&
                this.getPathLocation(other.owner, other.position) === targetLocation
            );

            if (occupier) {
                if (occupier.owner === currentPlayer) {
                    // Cannot land on own piece
                    return;
                } else {
                    // Opponent piece.
                    // Check if it's a safe rosette (Center rosette is safe? No, usually only corner rosettes are safe, but center rosette grants extra turn.
                    // Actually, the central rosette (C3 / path index 7) is a COMBAT zone rosette.
                    // Rules vary. Standard rule: Rosettes are safe?
                    // British Museum rule: The rosette on the central track (C3) is a safe square. A piece on it cannot be taken.
                    if (targetPos === 7) { // Central Rosette
                        return; // Cannot capture on rosette
                    }
                    // Otherwise, capture is valid.
                    validPieceIndices.push(pieces.indexOf(p));
                }
            } else {
                // Empty tile
                validPieceIndices.push(pieces.indexOf(p));
            }
        });

        this.state.possibleMoves = validPieceIndices;
    }

    movePiece(pieceIndex: number) {
        if (!this.state.possibleMoves.includes(pieceIndex)) return;

        const piece = this.state.pieces[pieceIndex];
        const roll = this.state.lastRoll;
        const targetPos = piece.position + roll;

        // Handle Finish
        if (targetPos === 14) {
            piece.position = 14;
            piece.isFinished = true;
            this.checkWin();
            if (!this.state.winner) {
                this.switchTurn(); // Finishing doesn't grant extra turn usually? 
                // Wait, landing on Rosette grants extra turn.
                // Is the finish square a rosette? No.
                // But does exact bear-off grant extra turn? No.
            }
            return;
        }

        // Handle Capture
        const targetLocation = this.getPathLocation(piece.owner, targetPos);
        const occupier = this.state.pieces.find(p =>
            p !== piece &&
            !p.isFinished &&
            p.position !== -1 &&
            this.getPathLocation(p.owner, p.position) === targetLocation
        );

        if (occupier && occupier.owner !== piece.owner) {
            // Capture! Send back to start.
            occupier.position = -1;
        }

        // Move
        piece.position = targetPos;

        // Check for Rosette (Extra Turn)
        if (ROSETTE_INDICES.includes(targetPos)) {
            // Extra turn!
            this.state.waitingForRoll = true;
            this.state.possibleMoves = [];
            // Don't switch player
        } else {
            this.switchTurn();
        }
    }

    switchTurn() {
        this.state.currentPlayer = this.state.currentPlayer === 'light' ? 'dark' : 'light';
        this.state.waitingForRoll = true;
        this.state.possibleMoves = [];
        this.state.lastRoll = 0;
        this.state.dice = [0, 0, 0, 0];
    }

    checkWin() {
        const lightFinished = this.state.pieces.filter(p => p.owner === 'light' && p.isFinished).length;
        const darkFinished = this.state.pieces.filter(p => p.owner === 'dark' && p.isFinished).length;

        if (lightFinished === TOTAL_PIECES) {
            this.state.winner = 'light';
            this.wins.light++;
            this.saveWins();
        } else if (darkFinished === TOTAL_PIECES) {
            this.state.winner = 'dark';
            this.wins.dark++;
            this.saveWins();
        }
    }

    // Helper to map (Player, PathIndex) -> BoardLocationID
    // This is crucial for collision detection
    getPathLocation(player: PlayerId, pathIndex: number): string {
        if (pathIndex < 0 || pathIndex > 14) return `OFF-${player}`;

        // Shared Combat Zone: indices 4-11
        if (pathIndex >= 4 && pathIndex <= 11) {
            return `C${pathIndex - 4}`;
        }

        // Private Zones
        if (pathIndex < 4) {
            return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        }

        if (pathIndex > 11) {
            return `${player === 'light' ? 'L' : 'D'}${pathIndex}`;
        }

        return 'UNKNOWN';
    }
}
