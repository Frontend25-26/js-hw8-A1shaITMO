const board = document.getElementById("board");

let selectedPiece = null;
let currentPlayer = "white";
let pieces = { white: 12, black: 12 };
let forcedPiece = null;

let inputLock = false;
let lock = () => { inputLock = true; };
let unlock = () => { inputLock = false; };

const cellSize = () => { return document.querySelector('.cell').offsetWidth; }
const switchTurn = () => { currentPlayer = currentPlayer === "white" ? "black" : "white"; }
const getPieceOnCell = (cell) => { return cell.querySelector(":scope > .piece:not(.ghost)"); }
const isCellEmpty = (cell) => { return getPieceOnCell(cell) === null; }

function createBoard() {
    for (let i = 0; i < 8; i++) {
        const row = document.createElement("div");
        row.classList.add("row");

        for (let j = 0; j < 8; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell", (i + j) % 2 === 0 ? "white" : "black");
            cell.dataset.i = i;
            cell.dataset.j = j;

            if (i < 3 && (i + j) % 2 !== 0) addPiece(cell, "black", i, j);
            if (i > 4 && (i + j) % 2 !== 0) addPiece(cell, "white", i, j);

            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function addPiece(cell, color, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    piece.dataset.color = color;
    piece.dataset.row = row;
    piece.dataset.col = col;
    cell.appendChild(piece);
}

createBoard();

board.addEventListener("click", (evt) => {
    if (inputLock) return;

    const clickedPiece = evt.target.closest(".piece:not(.ghost)");
    if (clickedPiece && board.contains(clickedPiece)) {
        selectPiece(clickedPiece);
        return;
    }
    const cell = evt.target.closest(".cell");
    if (cell && selectedPiece) tryMove(selectedPiece, cell);
});

function selectPiece(piece) {
    if (forcedPiece && piece !== forcedPiece) return;
    if (piece.dataset.color !== currentPlayer) return;

    clearGhosts();

    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = piece;
    selectedPiece.classList.add("selected");

    const jumps = getAvailableJumps(piece);
    const moves = getAvailableMoves(piece);

    if (jumps.length > 0) highlightMoves(jumps);
    else highlightMoves(moves);
}

function getAvailableMoves(piece) {
    const row = Number(piece.dataset.row);
    const col = Number(piece.dataset.col);

    const dirs = piece.dataset.color === "white" ? [-1] : [1];
    const moves = [];

    dirs.forEach((dRow) => {
        [-1, 1].forEach((dCol) => {
            const cell = document.querySelector(`.cell[data-i="${row + dRow}"][data-j="${col + dCol}"]`);
            if (cell && isCellEmpty(cell)) moves.push(cell);
        });
    });
    return moves;
}

function getAvailableJumps(piece) {
    const row = Number(piece.dataset.row);
    const col = Number(piece.dataset.col);

    const dirs = [
        [-1, -1],
        [-1,  1],
        [ 1, -1],
        [ 1,  1]
    ];
    const jumps = [];

    dirs.forEach(([dRow, dCol]) => {
        const midRow = row + dRow;
        const midCol = col + dCol;
        const landRow = row + 2 * dRow;
        const landCol = col + 2 * dCol;

        const midCell = document.querySelector(`.cell[data-i="${midRow}"][data-j="${midCol}"]`);
        const landCell = document.querySelector(`.cell[data-i="${landRow}"][data-j="${landCol}"]`);

        if (!midCell || !landCell) return;

        const enemy = getPieceOnCell(midCell);
        if (!enemy) return;

        if (enemy.dataset.color !== piece.dataset.color && isCellEmpty(landCell)) jumps.push(landCell);
    });

    return jumps;
}

function highlightMoves(cells) {
    clearGhosts();
    cells.forEach(cell => {
        const ghost = document.createElement("div");
        ghost.classList.add("piece", "ghost");
        ghost.classList.add(currentPlayer);
        ghost.dataset.ghost = "1";
        cell.appendChild(ghost);
    });
}

function clearGhosts() {
    document.querySelectorAll(".piece.ghost").forEach(g => g.remove());
}

function tryMove(piece, cell) {
    const possibleMoves = getAvailableMoves(piece);
    const possibleJumps = getAvailableJumps(piece);

    const isJumpCell = possibleJumps.includes(cell);
    const isMoveCell = possibleMoves.includes(cell);

    if (possibleJumps.length > 0 && !isJumpCell) return;

    if (!isJumpCell && !isMoveCell) return;

    if (isJumpCell) doJump(piece, cell);
    else {
        movePiece(piece, cell);
        switchTurn();
    }
    clearGhosts();
}

function doJump(piece, cell) {
    const midRow = (Number(cell.dataset.i) + Number(piece.dataset.row)) / 2;
    const midCol = (Number(cell.dataset.j) + Number(piece.dataset.col)) / 2;
    const midCell = document.querySelector(`.cell[data-i="${midRow}"][data-j="${midCol}"]`);

    const enemy = getPieceOnCell(midCell);
    if (enemy) killPiece(enemy);

    setTimeout(() => {
        lock();
        const jumps = getAvailableJumps(piece);

        if (jumps.length > 0) {
            forcedPiece = piece;
            selectedPiece = piece;
            highlightMoves(jumps);
        } else {
            forcedPiece = null;
            switchTurn();
        }
        unlock();
    }, 270);

    movePiece(piece, cell);
}

function movePiece(piece, newCell) {
    piece.classList.remove("selected");

    let dx = (newCell.dataset.j - piece.dataset.col) * cellSize()
    let dy = (newCell.dataset.i - piece.dataset.row) * cellSize()

    piece.style.transform = `translate(${dx}px, ${dy}px)`;
    piece.dataset.row = newCell.dataset.i;
    piece.dataset.col = newCell.dataset.j;
    selectedPiece = null;

    setTimeout(() => {
        lock()
        piece.style.transform = "none";
        newCell.appendChild(piece);
        unlock()
    }, 250)

}

function killPiece(enemy) {
    pieces[enemy.dataset.color]--;
    enemy.classList.add("dead");
    enemy.addEventListener("animationend", () => {
        enemy.remove();
        checkWin();
    });
}

function checkWin() {
    if (pieces.white === 0) showWin("Чёрные");
    if (pieces.black === 0) showWin("Белые");
}

function showWin(winner) {
    const msg = document.createElement("div");
    msg.style.position = "absolute";
    msg.style.top = "40%";
    msg.style.left = "50%";
    msg.style.fontSize = "24px";
    msg.style.background = "#333";
    msg.style.color = "#fff";
    msg.style.padding = "25px 40px";
    msg.style.borderRadius = "12px";
    msg.style.zIndex = "77";
    msg.style.transform = "translate(-50%, -50%)";

    msg.textContent = `Победили: ${winner}!`;
    board.appendChild(msg);
}
