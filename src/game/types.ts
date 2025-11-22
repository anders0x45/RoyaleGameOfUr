export type PlayerId = 'light' | 'dark';

export interface Piece {
    id: string;
    owner: PlayerId;
    position: number; // 0-13 for main path, -1 for start, 14 for finished
    isFinished: boolean;
}

export interface Tile {
    index: number;
    isRosette: boolean;
    type: 'safe' | 'combat' | 'normal';
    owner?: PlayerId; // For safe zones exclusive to a player
}

export interface GameState {
    board: Tile[];
    pieces: Piece[];
    currentPlayer: PlayerId;
    dice: number[]; // Array of 4 numbers (0 or 1)
    waitingForRoll: boolean;
    possibleMoves: number[]; // Indices of pieces that can move
    winner: PlayerId | null;
    lastRoll: number;
}

export const PATH_LIGHT = [
    4, 3, 2, 1, // Start zone
    0, 1, 2, 3, 4, 5, 6, 7, // Middle row (combat) - Wait, standard path is different.
    // Let's define the standard Ur path.
    // 4x3 grid? No, standard is 20 squares.
    // Let's use a linear index for the board state, but map paths to it.
    // Layout:
    // [0] [1] [2] [3]
    // [4] [5] [6] [7]
    // [8] [9] [10] [11] ... wait, standard board is:
    // 4x2 block, bridge of 2, 2x2 block?
    // Actually, let's stick to the standard 20-square board layout.
    //
    // Light Path:  4->3->2->1 (Start) -> 5->6->7->8->9->10->11->12 (Middle) -> 13->14 (End)
    // Dark Path:   0->1->2->3 (Start) -> ... wait, let's visualize indices.
    //
    //      Light Start      Middle Row      Light End
    //      [0] [1] [2] [3]  [4] [5] [6] [7]  [8] [9]
    //
    // Let's use a coordinate system or simple index 0-19.
    //
    // Standard Board:
    // Row 0 (Light Start/Home): [0][1][2][3]
    // Row 1 (Middle/Combat):    [4][5][6][7][8][9][10][11]
    // Row 2 (Dark Start/Home):  [12][13][14][15]
    //
    // Wait, the board shape is:
    // [L3][L2][L1][L0]  <-- Light Start
    // [M0][M1][M2][M3][M4][M5][M6][M7] <-- Middle (Combat)
    // [D3][D2][D1][D0]  <-- Dark Start
    //
    // Actually, the standard path is usually 14 steps.
    // Let's define the path indices relative to the visual grid.
    // Visual Grid 8x3 (with gaps).
    //
    // Let's abstract the path.
    // Each player has a path of 14 tiles.
    // Tiles 0-3: Safe (Start)
    // Tiles 4-11: Combat (Middle)
    // Tiles 12-13: Safe (End)
    // Tile 14: Off board
    //
    // We need to map these path indices to shared board indices to check collisions.
    //
    // Shared Board Indices (0-19):
    // 0-3: Light Safe
    // 4-11: Combat (Shared)
    // 12-15: Dark Safe
    // 16-17: Light End Safe
    // 18-19: Dark End Safe
    //
    // Let's refine this.
    //
    // Light Path:
    // 0-3 (Light Safe) -> 4-11 (Combat) -> 12-13 (Light End)
    //
    // Dark Path:
    // 0-3 (Dark Safe) -> 4-11 (Combat) -> 12-13 (Dark End)
    //
    // Wait, if they share 4-11, that works.
    //
    // So:
    // Light Path Nodes:
    // 0: L0 (Safe)
    // 1: L1 (Safe)
    // 2: L2 (Safe)
    // 3: L3 (Safe)
    // 4: C0 (Combat)
    // 5: C1 (Combat)
    // 6: C2 (Combat)
    // 7: C3 (Rosette)
    // 8: C4 (Combat)
    // 9: C5 (Combat)
    // 10: C6 (Combat)
    // 11: C7 (Combat)
    // 12: L4 (Safe)
    // 13: L5 (Safe, Rosette)
    // 14: Finish
    //
    // Dark Path Nodes:
    // 0: D0 (Safe)
    // ...
    // 4: C0 (Combat) ... same as Light
    // ...
    // 12: D4 (Safe)
    // 13: D5 (Safe, Rosette)
    // 14: Finish
    //
    // We need a way to map (Player, PathIndex) -> BoardLocationId
    // BoardLocationId can be a string or number.
    //
    // Let's use string IDs for board tiles: 'L0'...'L3', 'C0'...'C7', 'D0'...'D3', 'L4'...'L5', 'D4'...'D5'.
]

export const ROSETTE_INDICES = [3, 7, 13]; // Indices on the path where rosettes are.
// Wait, Rosette positions:
// Light: 3 (L3), 7 (C3), 13 (L5)
// Dark: 3 (D3), 7 (C3), 13 (D5)
// So yes, 3, 7, 13 on the path are Rosettes.

export const TOTAL_PIECES = 7;
