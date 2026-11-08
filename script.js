const colors = [
    { id: "red", name: "الأحمر", value: "#ef4444" },
    { id: "blue", name: "الأزرق", value: "#3b82f6" },
    { id: "green", name: "الأخضر", value: "#22c55e" },
    { id: "yellow", name: "الأصفر", value: "#eab308" }
];

let players = [];
let currentPlayer = 0;
let diceValue = 0;
let canRoll = true;
let selectedPiece = null;
let canMovePiece = false;
let isAnimating = false;
let humanCount = 0;
let teamMode = false;
let gameSession = 0;
let winnersRanking = JSON.parse(
    localStorage.getItem("ludoWinnersRanking")
) || [];
const mainPath = [
    // الطريق من الأحمر إلى الأعلى
    [6,1], [6,2], [6,3], [6,4], [6,5],
    [5,6], [4,6], [3,6], [2,6], [1,6], [0,6],
    [0,7], [0,8],
    [1,8], [2,8], [3,8], [4,8], [5,8],

    // الطريق ناحية الأصفر
    [6,9], [6,10], [6,11], [6,12], [6,13], [6,14],
    [7,14], [8,14],
    [8,13], [8,12], [8,11], [8,10], [8,9],

    // الطريق ناحية الأزرق
    [9,8], [10,8], [11,8], [12,8], [13,8], [14,8],
    [14,7], [14,6],
    [13,6], [12,6], [11,6], [10,6], [9,6],

    // الطريق ناحية الأحمر
    [8,5], [8,4], [8,3], [8,2], [8,1], [8,0],
    [7,0]
];

const startPositions = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};
const homePaths = {
    red: [
        [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]
    ],

    green: [
        [1, 7], [2, 7], [3, 7], [4, 7], [5, 7]
    ],

    yellow: [
        [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]
    ],

    blue: [
        [13, 7], [12, 7], [11, 7], [10, 7], [9, 7]
    ]
};
function startGame(count, teams = false) {
        gameSession++;
    humanCount = count;
    teamMode = teams;

    document.getElementById("home-screen").hidden = true;
    document.getElementById("setup-screen").hidden = false;

    const container = document.getElementById("players-container");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="player-card">
                <h3 style="color: ${colors[i].value}">
                    اللاعب ${i + 1} - ${colors[i].name}
                </h3>
                <input
                    type="text"
                    id="player-${i}"
                    placeholder="اكتب اسم اللاعب ${i + 1}"
                    maxlength="20"
                >
            </div>
        `;
    }

    if (count < 4) {
        container.innerHTML += `
            <p class="computer-info">
                🤖 الكمبيوتر هيلعب بالألوان المتبقية تلقائيًا
            </p>
        `;
    }

    if (teamMode) {
        container.innerHTML += `
            <p class="computer-info">
                👥 الفريق الأول: الأحمر والأصفر
                <br>
                👥 الفريق الثاني: الأزرق والأخضر
            </p>
        `;
    }
}

function backToHome() {
    document.getElementById("setup-screen").hidden = true;
    document.getElementById("home-screen").hidden = false;
}

function beginGame() {
    players = [];

    for (let i = 0; i < 4; i++) {
        const isHuman = i < humanCount;

        const name = isHuman
            ? document.getElementById(`player-${i}`).value.trim()
            : "الكمبيوتر";

        players.push({
            name: name || `اللاعب ${i + 1}`,
            color: colors[i].value,
            colorId: colors[i].id,
            isHuman,
            teamId: teamMode
                ? (i === 0 || i === 3 ? 0 : 1)
                : null,
            pieces: Array.from({ length: 4 }, () => ({
                position: -1
            }))
        });
    }

    currentPlayer = 0;
    diceValue = 0;
    canRoll = true;
    canMovePiece = false;
    selectedPiece = null;
    isAnimating = false;

    document.getElementById("setup-screen").hidden = true;
    document.getElementById("game-screen").hidden = false;

    updateTurn();
renderLudoBoard();

if (!players[currentPlayer].isHuman) {
    const startingPlayer = players[currentPlayer];
    const startingSession = gameSession;

    setTimeout(() => {
        if (
            gameSession === startingSession &&
            players[currentPlayer] === startingPlayer
        ) {
            startComputerTurn();
        }
    }, 800);
}
}

function drawPlayerPieces() {
    const homePositions = {
        red: [[80, 80], [160, 80], [80, 160], [160, 160]],
        green: [[440, 80], [520, 80], [440, 160], [520, 160]],
        blue: [[80, 440], [160, 440], [80, 520], [160, 520]],
        yellow: [[440, 440], [520, 440], [440, 520], [520, 520]]
    };

    const allPieces = [];

    players.forEach(player => {
        player.pieces.forEach((piece, index) => {
            let x, y;

            if (piece.position === -1) {
                [x, y] = homePositions[player.colorId][index];
            } else {
                const visualPosition =
                    piece.visualPosition ?? piece.position;

                function getPositionCoordinates(position) {
                    if (position <= 51) {
                        const absolutePosition =
                            startPositions[player.colorId] + position;

                        const pathIndex =
                            Math.floor(absolutePosition) % mainPath.length;

                        const [row, col] = mainPath[pathIndex];
                        return [col * 40 + 20, row * 40 + 20];
                    }

                    if (position <= 56) {
                        const laneIndex = position - 52;
                        const [row, col] =
                            homePaths[player.colorId][laneIndex];

                        return [col * 40 + 20, row * 40 + 20];
                    }

                    return [300, 300];
                }

                const fromPosition = Math.floor(visualPosition);
                const toPosition = Math.min(fromPosition + 1, 57);
                const progress = visualPosition - fromPosition;

                const [x1, y1] =
                    getPositionCoordinates(fromPosition);

                const [x2, y2] =
                    getPositionCoordinates(toPosition);

                x = x1 + (x2 - x1) * progress;
                y = y1 + (y2 - y1) * progress;
            }

            allPieces.push({
                player,
                piece,
                index,
                x,
                y
            });
        });
    });

    // تجميع القطع الموجودة في نفس المكان
    const groups = {};

    allPieces.forEach(item => {
        const key = `${Math.round(item.x)},${Math.round(item.y)}`;

        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    let piecesSVG = "";

    Object.values(groups).forEach(group => {
        group.forEach((item, index) => {
            let offsetX = 0;
            let offsetY = 0;

            if (group.length > 1) {
                const angle =
                    (2 * Math.PI * index) / group.length;

                offsetX = Math.cos(angle) * 10;
                offsetY = Math.sin(angle) * 10;
            }

            const x = item.x + offsetX;
            const y = item.y + offsetY;
const pieceScale = group.length > 1 ? 0.65 : 1;
            piecesSVG += `
    <g transform="translate(${x} ${y}) scale(${pieceScale}) translate(${-x} ${-y})">
        <defs>
            <radialGradient id="body-${item.player.colorId}-${item.index}"
                cx="30%" cy="20%" r="80%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="25%" stop-color="${item.player.color}"/>
                <stop offset="100%" stop-color="#333333"/>
            </radialGradient>

            <radialGradient id="head-${item.player.colorId}-${item.index}"
                cx="30%" cy="25%" r="75%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="35%" stop-color="${item.player.color}"/>
                <stop offset="100%" stop-color="#444444"/>
            </radialGradient>
        </defs>

        <ellipse cx="${x}" cy="${y + 12}"
            rx="13" ry="5" fill="#0006"/>

        <path
            d="
                M ${x-4} ${y-9}
                L ${x-5} ${y-2}
                Q ${x-7} ${y+2} ${x-10} ${y+7}
                Q ${x-12} ${y+12} ${x} ${y+12}
                Q ${x+12} ${y+12} ${x+10} ${y+7}
                Q ${x+7} ${y+2} ${x+5} ${y-2}
                L ${x+4} ${y-9}
                Z
            "
            fill="url(#body-${item.player.colorId}-${item.index})"
            stroke="#292522"
            stroke-width="1.5"
        />

        <ellipse cx="${x}" cy="${y+10}"
            rx="10" ry="3"
            fill="${item.player.color}"
            stroke="#292522"
            stroke-width="1"/>

        <circle cx="${x}" cy="${y-12}" r="8"
            fill="url(#head-${item.player.colorId}-${item.index})"
            stroke="#292522"
            stroke-width="1.5"/>

        <ellipse cx="${x-3}" cy="${y-15}"
            rx="2.5" ry="3"
            fill="#ffffff99"/>

        <circle cx="${x}" cy="${y-5}" r="17"
            fill="transparent"
            data-player="${item.player.colorId}"
            data-piece="${item.index}"
            style="cursor:pointer"
        />
    </g>
`;
        });
    });

    return piecesSVG;
}

function setDiceFace(colorId, value) {
    const patterns = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8]
    };

    const face = document.getElementById(`face-${colorId}`);
    const cells = face.querySelectorAll("i");

    cells.forEach((cell, index) => {
        cell.classList.toggle(
            "pip",
            patterns[value].includes(index)
        );
    });
}

function updateTurn() {
    const player = players[currentPlayer];

    document.getElementById("turn-info").innerHTML = `
        <span style="
            display:inline-block;
            width:13px;
            height:13px;
            border-radius:50%;
            background:${player.color};
            margin-left:8px;
        "></span>
        دور ${player.name}
    `;

    ["red", "green", "blue", "yellow"].forEach(color => {
        const dice = document.getElementById(`dice-${color}`);
        dice.hidden = true;
        setDiceFace(color, 1);
    });

    const currentDice = document.getElementById(
        `dice-${player.colorId}`
    );

    currentDice.hidden = false;
}
function getFairDiceRoll() {
    const max = 4294967296;
    const limit = max - (max % 6);
    const random = new Uint32Array(1);

    do {
        crypto.getRandomValues(random);
    } while (random[0] >= limit);

    return (random[0] % 6) + 1;
}
function saveWinner(player) {
    const winnerName = teamMode
        ? (player.teamId === 0 ? "الفريق الأول" : "الفريق الثاني")
        : player.name;

    const winnerColors = teamMode
        ? players
            .filter(p => p.teamId === player.teamId)
            .map(p => p.colorId)
        : [player.colorId];

    const winnerKey = teamMode
        ? `team-${player.teamId}`
        : `player-${player.colorId}`;

    const alreadyWon = winnersRanking.some(
        winner => winner.key === winnerKey
    );

    if (alreadyWon) return;

    const rank = winnersRanking.length + 1;

    winnersRanking.push({
        key: winnerKey,
        name: winnerName,
        rank,
        colors: winnerColors
    });

    localStorage.setItem(
        "ludoWinnersRanking",
        JSON.stringify(winnersRanking)
    );
}
function getActivePieceOwner(player) {
    if (
        !teamMode ||
        !player.pieces.every(piece => piece.position === 57)
    ) {
        return player;
    }

    return players.find(
        p => p.teamId === player.teamId && p !== player
    );
}
function rollDice(colorId) {
    const player = players[currentPlayer];
    const pieceOwner = getActivePieceOwner(player);
const rollingPlayerIndex = currentPlayer;
const rollingSession = gameSession;
    if (!canRoll || player.colorId !== colorId) return;

    canRoll = false;
    diceValue = getFairDiceRoll();
const rollingDiceValue = diceValue;
    const currentDice = document.getElementById(`dice-${colorId}`);
    currentDice.classList.add("rolling");

    setTimeout(() => {
    if (
    gameSession !== rollingSession ||
    currentPlayer !== rollingPlayerIndex ||
    players[currentPlayer] !== player
) return;
    currentDice.classList.remove("rolling");
        setDiceFace(colorId, diceValue);

        console.log("نتيجة النرد:", diceValue);

       const legalPieces = pieceOwner.pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => {
        if (piece.position === -1) {
            return diceValue === 6;
        }

        if (piece.position === 57) return false;

        return piece.position + diceValue <= 57;
    });
        if (legalPieces.length === 0) {
            nextTurn();
            return;
        }

        canMovePiece = true;

        document.getElementById("turn-info").textContent =
            `دور ${player.name} - اختار قطعة لتحريكها`;

        if (!player.isHuman) {
            setTimeout(() => {
    if (
            gameSession !== rollingSession ||
        currentPlayer !== rollingPlayerIndex ||
        players[currentPlayer] !== player ||
        !canMovePiece ||
player.isHuman ||
        diceValue !== rollingDiceValue
    ) return;

    const choice = legalPieces[
        Math.floor(Math.random() * legalPieces.length)
    ];

    movePiece(pieceOwner.colorId, choice.index);
}, 700);
        }

    }, 900);
}
function nextTurn() {
    currentPlayer = (currentPlayer + 1) % players.length;

    diceValue = 0;
    canRoll = true;
    canMovePiece = false;
    selectedPiece = null;

    updateTurn();

    const expectedPlayer = players[currentPlayer];
    const turnSession = gameSession;

    if (!expectedPlayer.isHuman) {
        setTimeout(() => {
            if (
                    gameSession === turnSession &&
                players[currentPlayer] === expectedPlayer &&
                canRoll &&
                !canMovePiece &&
                !isAnimating
            ) {
                startComputerTurn();
            }
        }, 800);
    }
}
function startComputerTurn() {
    const player = players[currentPlayer];

    if (!player) return;
    if (player.isHuman) return;
    if (!canRoll || canMovePiece || isAnimating) return;

    rollDice(player.colorId);
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function animatePieceTo(piece, targetPosition, player) {
    const animationSession = gameSession;

    if (!players.includes(player)) {
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const startPosition = piece.position;
        const duration = 140;
        const startTime = performance.now();

        function animate(currentTime) {
            if (gameSession !== animationSession) {
    resolve();
    return;
}
    if (!players.includes(player)) {
        resolve();
        return;
    }

    const progress = Math.min(
                (currentTime - startTime) / duration,
                1
            );

            // حركة ناعمة تدريجية
            const eased = progress * progress * (3 - 2 * progress);

            piece.visualPosition =
                startPosition + (targetPosition - startPosition) * eased;

            renderLudoBoard();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                piece.position = targetPosition;
                delete piece.visualPosition;

                renderLudoBoard();
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}
async function movePiece(colorId, pieceIndex) {
    const player = players[currentPlayer];
    const pieceOwner = getActivePieceOwner(player);
const movingSession = gameSession;
    if (!canMovePiece || isAnimating) return;
    if (pieceOwner.colorId !== colorId) return;

    const piece = pieceOwner.pieces[pieceIndex];

    // القطعة الموجودة في البيت
    if (piece.position === -1) {
    if (diceValue !== 6) return;

    piece.position = 0;
    renderLudoBoard();

    canMovePiece = false;
    canRoll = true;

    document.getElementById("turn-info").textContent =
        `دور ${player.name} - ارمي النرد مرة أخرى`;

    if (!player.isHuman) {
    const expectedPlayer = player;
const expectedSession = gameSession;
    setTimeout(() => {
        if (
    gameSession === expectedSession &&
    players[currentPlayer] === expectedPlayer &&
    canRoll &&
    !canMovePiece &&
    !isAnimating
) {
    startComputerTurn();
}
    }, 800);
}

    return;
}

    // القطعة وصلت للنهاية بالفعل
    if (piece.position === 57) return;

    // منع تخطي خانة النهاية
if (piece.position + diceValue > 57) return;



isAnimating = true;
    canMovePiece = false;

    // تحريك القطعة خانة بخانة
    for (let step = 0; step < diceValue; step++) {
    await animatePieceTo(
        piece,
        piece.position + 1,
        pieceOwner
    );

    if (gameSession !== movingSession) return;
}
if (gameSession !== movingSession) return;
    // فحص أكل القطع في الطريق الخارجي فقط
    let captured = false;

    if (piece.position <= 51) {
        captured = await capturePieces(pieceOwner, piece);
        if (gameSession !== movingSession) return;
    }

    renderLudoBoard();

    isAnimating = false;

    // هل اللاعب أنهى كل قطعه؟
    let playerWon;

if (teamMode) {
    const teammates = players.filter(
        p => p.teamId === player.teamId
    );

    playerWon = teammates.every(teammate =>
        teammate.pieces.every(piece => piece.position === 57)
    );
} else {
    playerWon = player.pieces.every(
        p => p.position === 57
    );
}

   if (playerWon) {
    saveWinner(player);

    canRoll = false;
    canMovePiece = false;

    document.getElementById("game-screen").hidden = true;
    document.getElementById("winner-screen").hidden = false;

    document.getElementById("winner-name").textContent =
    teamMode
        ? (player.teamId === 0 ? "الفريق الأول 🏆" : "الفريق الثاني 🏆")
        : player.name;

    return;
}

    // هل أنهى قطعة ولسه عنده قطع أخرى؟
    const finishedPiece = piece.position === 57;

    const hasPiecesNotFinished = pieceOwner.pieces.some(
    p => p.position !== 57
);

    // الدور الإضافي
    if (
    diceValue === 6 ||
    captured ||
    (finishedPiece && hasPiecesNotFinished)
) {
    canRoll = true;

    document.getElementById("turn-info").textContent =
        `دور ${player.name} - ارمي النرد مرة أخرى`;

    if (!player.isHuman) {
    const expectedPlayer = player;
    const expectedSession = gameSession;

    setTimeout(() => {
        if (
            gameSession === expectedSession &&
            players[currentPlayer] === expectedPlayer &&
            canRoll &&
            !canMovePiece &&
            !isAnimating
        ) {
            startComputerTurn();
        }
    }, 800);
}
} else {
    nextTurn();
}
}
async function capturePieces(player, movedPiece) {
    let captured = false;
    const captureSession = gameSession;
    const currentPosition =
        (startPositions[player.colorId] + movedPiece.position) % 52;

    const safePositions = [
    // خانات النجوم الأربعة
    [2, 6],
    [6, 12],
    [12, 8],
    [8, 2],

    // خانات البداية الأربعة
    [6, 1],
    [1, 8],
    [8, 13],
    [13, 6]
];

    const isSafe = safePositions.some(([row, col]) => {
        const index = mainPath.findIndex(
            ([r, c]) => r === row && c === col
        );

        return index === currentPosition;
    });

    if (isSafe) return;

    for (const opponent of players) {
    if (
        opponent === player ||
        (teamMode && opponent.teamId === player.teamId)
    ) continue;
        // لو فيه قطعتين أو أكثر من نفس اللون في الخانة، يبقى حاجز
const piecesOnPosition = opponent.pieces.filter(piece => {
    if (piece.position < 0 || piece.position > 51) {
        return false;
    }

    const opponentPosition =
        (startPositions[opponent.colorId] + piece.position) % 52;

    return opponentPosition === currentPosition;
});

if (piecesOnPosition.length >= 2) {
    continue;
}

        for (const piece of opponent.pieces) {
            // القطع الموجودة في البيت أو ممر النهاية لا تُؤكل
if (piece.position < 0 || piece.position > 51) continue;

            const opponentPosition =
                (startPositions[opponent.colorId] + piece.position) % 52;

            if (opponentPosition !== currentPosition) continue;

            // رجوع القطعة للخلف خانة بخانة
            while (piece.position > 0) {
    await animatePieceTo(piece, piece.position - 1, opponent);

    if (gameSession !== captureSession) return captured;
}

            // دخول القطعة إلى بيتها
            piece.position = -1;

            renderLudoBoard();
            await wait(150);
            if (gameSession !== captureSession) return captured;
captured = true;
            console.log(
                `${player.name} أكل قطعة ${opponent.name}!`
            );
        }
    }
    return captured;
}
function renderLudoBoard() {
    const board = document.getElementById("ludo-board");

    const size = 40;
    let svg = `
    <svg viewBox="0 0 600 600"
         xmlns="http://www.w3.org/2000/svg">

    <rect width="600" height="600" fill="white"/>

    `;

    const boardColors = {
    red: "#f02028",
    green: "#08a34e",
    blue: "#294a9b",
    yellow: "#ffdf00"
};

    // البيوت الأربعة
    const homes = [
        { color: "red", x: 0, y: 0 },
        { color: "green", x: 360, y: 0 },
        { color: "blue", x: 0, y: 360 },
        { color: "yellow", x: 360, y: 360 }
    ];

    homes.forEach(home => {
        svg += `
        <rect x="${home.x}" y="${home.y}"
              width="240" height="240"
              fill="${boardColors[home.color]}"/>

        <rect x="${home.x + 40}" y="${home.y + 40}"
              width="160" height="160"
              fill="white"
              stroke="#292522"
              stroke-width="3"/>
                    <circle cx="${home.x + 80}" cy="${home.y + 80}"
                r="20" fill="${boardColors[home.color]}"
                stroke="#292522" stroke-width="3"/>

        <circle cx="${home.x + 160}" cy="${home.y + 80}"
                r="20" fill="${boardColors[home.color]}"
                stroke="#292522" stroke-width="3"/>

        <circle cx="${home.x + 80}" cy="${home.y + 160}"
                r="20" fill="${boardColors[home.color]}"
                stroke="#292522" stroke-width="3"/>

        <circle cx="${home.x + 160}" cy="${home.y + 160}"
                r="20" fill="${boardColors[home.color]}"
                stroke="#292522" stroke-width="3"/>  
        `;
        
// تيجان الفائزين
winnersRanking.forEach(winner => {
    winner.colors.forEach(colorId => {
        const home = homes.find(h => h.color === colorId);
        if (!home) return;

        const x = home.x + 120;
        const y = home.y + 120;

        svg += `
            <g>
                <path
                    d="
                        M ${x-35} ${y-5}
                        L ${x-45} ${y-35}
                        L ${x-20} ${y-20}
                        L ${x} ${y-45}
                        L ${x+20} ${y-20}
                        L ${x+45} ${y-35}
                        L ${x+35} ${y-5}
                        Z
                    "
                    fill="#facc15"
                    stroke="#92400e"
                    stroke-width="3"
                />

                <rect x="${x-35}" y="${y-5}"
                    width="70" height="12"
                    rx="4"
                    fill="#eab308"
                    stroke="#92400e"
                    stroke-width="2"/>

                <text x="${x}" y="${y+2}"
                    font-size="22"
                    font-weight="bold"
                    text-anchor="middle"
                    fill="#78350f">
                    ${winner.rank}
                </text>
            </g>
        `;
    });
});
        
    });

    // إنشاء خلايا مسار اللعب
    function drawCell(row, col, color = "white") {
        const x = col * size;
        const y = row * size;

        svg += `
        <rect x="${x}" y="${y}"
              width="${size}" height="${size}"
              fill="${color}"
              stroke="#292522"
              stroke-width="2.5"/>
        `;
    }

    // المسار العلوي والسفلي
    for (let row = 0; row < 6; row++) {
        for (let col = 6; col <= 8; col++) {
            let color = "white";

            if (col === 7 && row >= 1)
                color = boardColors.green

            drawCell(row, col, color);
        }
    }

    for (let row = 9; row < 15; row++) {
        for (let col = 6; col <= 8; col++) {
            let color = "white";

            if (col === 7 && row <= 13)
                color = boardColors.blue;

            drawCell(row, col, color);
        }
    }

    // المسار الأيسر والأيمن
    for (let row = 6; row <= 8; row++) {
        for (let col = 0; col < 6; col++) {
            let color = "white";

            if (row === 7 && col >= 1)
                color = boardColors.red;

            drawCell(row, col, color);
        }

        for (let col = 9; col < 15; col++) {
            let color = "white";

            if (row === 7 && col <= 13)
                color = boardColors.yellow;

            drawCell(row, col, color);
        }
    }

    // مربعات البداية
    // مربعات البداية
drawCell(6, 1, boardColors.red);
drawCell(1, 8, boardColors.green);
drawCell(8, 13, boardColors.yellow);
drawCell(13, 6, boardColors.blue);

// نجوم الأمان الأربعة
// نجوم الأمان الأربعة على الطريق الخارجي
const safeStars = [
    [2, 6],   // أعلى
    [6, 12],  // اليمين
    [12, 8],  // أسفل
    [8, 2]    // الشمال
];

safeStars.forEach(([row, col]) => {
    const x = col * size + size / 2;
    const y = row * size + size / 2;

    svg += `
        <text
            x="${x}"
            y="${y + 11}"
            font-size="30"
            text-anchor="middle"
            fill="#f5c400"
            stroke="#292522"
            stroke-width="1"
        >★</text>
    `;
});

    // مركز اللوحة
    svg += `
        <polygon points="240,240 360,240 300,300"
                 fill="${boardColors.green}"
                 stroke="#292522" stroke-width="2"/>

        <polygon points="360,240 360,360 300,300"
                 fill="${boardColors.yellow}"
                 stroke="#292522" stroke-width="2"/>

        <polygon points="240,360 360,360 300,300"
                 fill="${boardColors.blue}"
                 stroke="#292522" stroke-width="2"/>

        <polygon points="240,240 240,360 300,300"
                 fill="${boardColors.red}"
                 stroke="#292522" stroke-width="2"/>

        <rect x="0" y="0" width="600" height="600"
              fill="none" stroke="#292522" stroke-width="3"/>

    
    `;
      
svg += drawPlayerPieces();
svg += `</svg>`;

    board.innerHTML = svg;

board.querySelectorAll("[data-player][data-piece]").forEach(piece => {
    piece.addEventListener("click", () => {
        movePiece(
            piece.dataset.player,
            Number(piece.dataset.piece)
        );
    });
});
}
function restartGame() {
    document.getElementById("winner-screen").hidden = true;

    startGame(humanCount, teamMode);

    document.querySelector("#setup-screen button").focus();
}

function returnHome() {
        gameSession++;
    document.getElementById("exit-modal").hidden = true;
    document.getElementById("winner-screen").hidden = true;
    document.getElementById("game-screen").hidden = true;
    document.getElementById("setup-screen").hidden = true;
    document.getElementById("home-screen").hidden = false;

    players = [];
    
    currentPlayer = 0;
    diceValue = 0;
    canRoll = true;
    canMovePiece = false;
    selectedPiece = null;
    isAnimating = false;
}

function confirmExit() {
    document.getElementById("exit-modal").hidden = false;
}

function cancelExit() {
    document.getElementById("exit-modal").hidden = true;
}
