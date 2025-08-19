// --- DOM Element Selection ---
const boxes = document.querySelectorAll(".box");
const msgContainer = document.querySelector(".msg-container");
const msg = document.querySelector("#msg");
const newGameBtn = document.querySelector("#new-btn");
const resetBtn = document.querySelector("#reset-btn");

// Screen containers
const loaderContainer = document.querySelector(".loader-container");
const selectionScreen = document.querySelector(".selection-screen");
const difficultyScreen = document.querySelector(".difficulty-screen");
const nameScreen = document.querySelector(".name-screen");
const mainGame = document.querySelector("main");

// Buttons
const pvpBtn = document.querySelector("#pvp-btn");
const pvcBtn = document.querySelector("#pvc-btn");
const difficultyBtns = document.querySelectorAll(".difficulty-btn");
const themeSwitcher = document.querySelector("#theme-switcher");
const muteBtn = document.querySelector("#mute-btn");

// UI Elements
const scoreOElem = document.querySelector("#score-o");
const scoreXElem = document.querySelector("#score-x");
const playerOLabel = document.querySelector("#player-o-label");
const playerXLabel = document.querySelector("#player-x-label");
const turnIndicator = document.querySelector("#turn-indicator p");
const sunIcon = document.querySelector(".icon-sun");
const moonIcon = document.querySelector(".icon-moon");
const volumeOnIcon = document.querySelector(".icon-volume-on");
const volumeOffIcon = document.querySelector(".icon-volume-off");

// Name Form Elements
const nameForm = document.querySelector("#name-form");
const playerOInput = document.querySelector("#playerO");
const playerXInput = document.querySelector("#playerX");

// --- Game State Variables ---
let turnO = true;
let moveCount = 0;
let scoreO = 0;
let scoreX = 0;
let gameMode = "pvp";
let difficulty = "easy";
let playerOName = "Player O";
let playerXName = "Player X";
const humanPlayer = "O";
const aiPlayer = "X";
let isMuted = false;

// Sound Effects from HTML audio elements
const clickSound = document.querySelector("#click-sound");
const winSound = document.querySelector("#win-sound");
const drawSound = document.querySelector("#draw-sound");
const allSounds = [clickSound, winSound, drawSound];


const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// --- Core Functions ---

/**
 * Hides all screens and shows the specified one.
 * @param {HTMLElement} screenToShow The screen element to make visible.
 */
const showScreen = (screenToShow) => {
    selectionScreen.classList.add("hide");
    difficultyScreen.classList.add("hide");
    nameScreen.classList.add("hide");
    mainGame.classList.add("hide");
    screenToShow.classList.remove("hide");
};

/**
 * Resets the entire game state and returns to the main menu.
 */
const returnToMenu = () => {
    scoreO = 0;
    scoreX = 0;
    scoreOElem.innerText = scoreO;
    scoreXElem.innerText = scoreX;
    playerOName = "Player O";
    playerXName = "Player X";
    playerOLabel.innerText = playerOName;
    playerXLabel.innerText = playerXName;
    msgContainer.classList.add("hide");
    showScreen(selectionScreen);
};

/**
 * Sets up the game board and labels for the selected mode and starts a new round.
 */
const setupAndStartGame = () => {
    if (gameMode === 'pvc') {
        playerOLabel.innerText = "You (O)";
        playerXLabel.innerText = `Computer (${difficulty})`;
    } else {
        playerOLabel.innerText = playerOName;
        playerXLabel.innerText = playerXName;
    }
    startNewRound();
    showScreen(mainGame);
    mainGame.scrollIntoView({ behavior: 'auto' });
};

/**
 * Clears the board for a new round without resetting scores.
 */
const startNewRound = () => {
    turnO = true;
    moveCount = 0;
    boxes.forEach(box => {
        box.disabled = false;
        box.innerText = "";
        box.classList.remove('player-x', 'player-o', 'win-box');
    });
    msgContainer.classList.add("hide");
    turnIndicator.innerText = turnO ? `${playerOName}'s Turn` : `${playerXName}'s Turn`;

    // NEW: Stop any currently playing sounds
    winSound.pause();
    winSound.currentTime = 0;
    drawSound.pause();
    drawSound.currentTime = 0;
};

/**
 * Handles the logic for a player or AI clicking a box.
 * @param {HTMLElement} box The box element that was clicked.
 */
const handleBoxClick = (box) => {
    if (box.innerText !== "") return; // Box is already filled

    clickSound.currentTime = 0;
    clickSound.play();

    const currentPlayer = turnO ? humanPlayer : aiPlayer;
    box.innerText = currentPlayer;
    box.classList.add(turnO ? 'player-o' : 'player-x');
    box.disabled = true;
    turnO = !turnO;
    turnIndicator.innerText = turnO ? `${playerOName}'s Turn` : `${playerXName}'s Turn`;
    moveCount++;

    const winner = checkWinner();
    if (winner || moveCount === 9) {
        if (!winner) showDraw();
        return;
    }

    // If it's the AI's turn in a PVC game
    if (gameMode === 'pvc' && !turnO) {
        boxes.forEach(b => b.disabled = true); // Disable board while AI "thinks"
        setTimeout(computerMove, 600);
    }
};

/**
 * Determines and executes the AI's move based on difficulty.
 */
const computerMove = () => {
    let boxToClick;
    const emptyBoxes = Array.from(boxes).filter(b => b.innerText === "");

    if (difficulty === 'easy') {
        boxToClick = emptyBoxes[Math.floor(Math.random() * emptyBoxes.length)];
    } else if (difficulty === 'medium') {
        boxToClick = findStrategicMove() || emptyBoxes[Math.floor(Math.random() * emptyBoxes.length)];
    } else if (difficulty === 'hard') {
        const boardState = Array.from(boxes, box => box.innerText);
        const bestMoveIndex = findUnbeatableMove(boardState);
        boxToClick = boxes[bestMoveIndex];
    }
    
    if (boxToClick) {
        handleBoxClick(boxToClick);
        // Re-enable empty boxes for the human player after the AI moves
        if (!checkWinner()) {
            boxes.forEach(box => { if (box.innerText === "") box.disabled = false; });
        }
    }
};

/**
 * Checks if there is a winner.
 * @returns {string|null} The winning player ('O' or 'X') or null if no winner.
 */
const checkWinner = () => {
    for (let pattern of winPatterns) {
        const [val1, val2, val3] = [boxes[pattern[0]].innerText, boxes[pattern[1]].innerText, boxes[pattern[2]].innerText];
        if (val1 && val1 === val2 && val1 === val3) {
            showWinner(val1, pattern);
            return val1;
        }
    }
    return null;
};


// --- AI Logic (Medium & Hard) ---
const findStrategicMove = () => {
    const findMove = (player) => {
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern.map(i => boxes[i]);
            const vals = [a.innerText, b.innerText, c.innerText];
            if (vals.filter(v => v === player).length === 2 && vals.includes("")) {
                if (a.innerText === "") return a; if (b.innerText === "") return b; if (c.innerText === "") return c;
            }
        }
        return null;
    };
    return findMove(aiPlayer) || findMove(humanPlayer); // Win first, then block
};

function findUnbeatableMove(board) {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = aiPlayer;
            let score = minimax(board, 0, false);
            board[i] = "";
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(board, depth, isMaximizing) {
    let result = checkVirtualWinner(board);
    if (result !== null) {
        if (result === aiPlayer) return 10 - depth;
        if (result === humanPlayer) return depth - 10;
        return 0; // Draw
    }
    let bestScore = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = isMaximizing ? aiPlayer : humanPlayer;
            let score = minimax(board, depth + 1, !isMaximizing);
            board[i] = "";
            bestScore = isMaximizing ? Math.max(score, bestScore) : Math.min(score, bestScore);
        }
    }
    return bestScore;
}

function checkVirtualWinner(board) {
    for (const pattern of winPatterns) {
        const [a, b, c] = [board[pattern[0]], board[pattern[1]], board[pattern[2]]];
        if (a && a === b && a === c) return a;
    }
    return board.includes("") ? null : 'draw';
}

// --- UI Display Functions ---
const showWinner = (winner, pattern) => {
    const winnerName = winner === 'O' ? playerOName : playerXName;
    msg.innerText = `Winner is ${winnerName}!`;
    if (winner === 'O') scoreOElem.innerText = ++scoreO; else scoreXElem.innerText = ++scoreX;
    pattern.forEach(index => boxes[index].classList.add("win-box"));
    boxes.forEach(box => box.disabled = true);
    msgContainer.classList.remove("hide");
    winSound.play();
};

const showDraw = () => {
    msg.innerText = "It's a Draw!";
    msgContainer.classList.remove("hide");
    drawSound.play();
};

// --- Theme & Mute Logic ---
const applyTheme = (theme) => {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        sunIcon.classList.add('hide');
        moonIcon.classList.remove('hide');
    } else {
        document.body.classList.remove('light-theme');
        sunIcon.classList.remove('hide');
        moonIcon.classList.add('hide');
    }
};

const toggleTheme = () => {
    const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
};

const applyMuteState = (muted) => {
    isMuted = muted;
    allSounds.forEach(sound => sound.muted = isMuted);
    if (isMuted) {
        volumeOnIcon.classList.add('hide');
        volumeOffIcon.classList.remove('hide');
    } else {
        volumeOnIcon.classList.remove('hide');
        volumeOffIcon.classList.add('hide');
    }
};

const toggleMute = () => {
    const newMuteState = !isMuted;
    localStorage.setItem('muted', newMuteState);
    applyMuteState(newMuteState);
};


// --- Event Listeners ---
pvpBtn.addEventListener("click", () => {
    gameMode = 'pvp';
    showScreen(nameScreen);
});

pvcBtn.addEventListener("click", () => {
    gameMode = 'pvc';
    showScreen(difficultyScreen);
});

nameForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent page reload
    playerOName = playerOInput.value || "Player O";
    playerXName = playerXInput.value || "Player X";
    setupAndStartGame();
});

difficultyBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        difficulty = btn.dataset.difficulty;
        setupAndStartGame();
    });
});

newGameBtn.addEventListener("click", startNewRound);
resetBtn.addEventListener("click", returnToMenu);
boxes.forEach(box => box.addEventListener("click", () => handleBoxClick(box)));
themeSwitcher.addEventListener('click', toggleTheme);
muteBtn.addEventListener('click', toggleMute);

// --- Initial Setup ---
const initGame = () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    // Load saved mute state
    const savedMuteState = localStorage.getItem('muted') === 'true';
    applyMuteState(savedMuteState);

    setTimeout(() => {
        loaderContainer.style.opacity = '0';
        setTimeout(() => {
            loaderContainer.classList.add('hide');
            returnToMenu(); // Show the main menu after loader fades
        }, 500); // Wait for fade out transition
    }, 1500); // Show loader for 1.5 seconds
};

initGame(); // Start the game.
