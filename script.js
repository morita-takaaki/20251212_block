// --- Canvas設定 ---
const canvas = document.getElementById("breakout-canvas");
const ctx = canvas.getContext("2d");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// --- DOM要素 ---
const SCORE_SPAN = document.getElementById('score');
const NG_COUNT_SPAN = document.getElementById('ng-count');
const MESSAGE_P = document.getElementById('game-message');
const START_BUTTON = document.getElementById('start-button');

// --- ゲーム定数 ---
const MAX_NG = 10;

// --- 球の設定 ---
const ballRadius = 6;
let x = canvasWidth / 2;
let y = canvasHeight - 30;
let dx = 1.7; // **変更**: x方向の移動速度の初期値 (並み: 1.7)
let dy = -1.7; // **変更**: y方向の移動速度の初期値 (並み: -1.7)

// --- ラケットの設定 ---
const paddleHeight = 8;
const paddleWidth = 75;
let paddleX = (canvasWidth - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;

// --- ブロックの設定 ---
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 10;
const brickPadding = 5;
const brickOffsetTop = 30;
const brickOffsetLeft = 15;

let bricks = []; 

// --- ゲーム変数 ---
let score = 0;
let ngCount = 0;
let gameLoopInterval = null;
let isPlaying = false;
let initialSpeed = 1.7; // **変更**: 初期速度（並み）を1.7に設定

// --- イベントリスナー ---

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
START_BUTTON.addEventListener('click', startGame);

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

// --- 初期化処理 ---

function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        const randomColor = getRandomColor(); 
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, color: randomColor };
        }
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function initializeGame() {
    // 速度設定の取得
    const selectedSpeed = document.querySelector('input[name="speed"]:checked');
    initialSpeed = parseFloat(selectedSpeed.value); // **HTMLの新しい値を読み込む**
    
    score = 0;
    ngCount = 0;
    SCORE_SPAN.textContent = score;
    NG_COUNT_SPAN.textContent = ngCount;
    MESSAGE_P.textContent = "ゲーム中...";
    MESSAGE_P.classList.remove('game-over');
    
    initBricks();
    resetBallAndPaddle();
}

function resetBallAndPaddle() {
    x = canvasWidth / 2;
    y = canvasHeight - 30;
    
    // Y方向の速度は常に負（上向き）
    dy = -initialSpeed;
    // X方向はランダムに左右どちらかに振る
    dx = (Math.random() < 0.5 ? 1 : -1) * initialSpeed * 0.7; 
    
    paddleX = (canvasWidth - paddleWidth) / 2;
}

function startGame() {
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
    }
    initializeGame();
    isPlaying = true;
    gameLoopInterval = setInterval(draw, 10); // 10ms (100FPS相当)で描画・更新
}

// --- 描画関数 (省略) ---
// drawBall, drawPaddle, drawBricks は変更なし

// --- 衝突判定 ---

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (x + ballRadius > b.x && x - ballRadius < b.x + brickWidth && 
                    y + ballRadius > b.y && y - ballRadius < b.y + brickHeight) 
                {
                    dy = -dy; 
                    b.status = 0; 
                    score++;
                    SCORE_SPAN.textContent = score;

                    if (score === brickRowCount * brickColumnCount) {
                        gameOver(true);
                    }
                }
            }
        }
    }
}

// --- メイン描画ループ ---

function draw() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBricks();
    drawBall();
    drawPaddle();
    collisionDetection();

    // 1. 壁との衝突
    if (x + dx > canvasWidth - ballRadius || x + dx < ballRadius) {
        dx = -dx; 
    }
    if (y + dy < ballRadius) {
        dy = -dy; 
    } 
    
    // 2. ラケットとの衝突 (下側の衝突)
    else if (y + dy > canvasHeight - ballRadius - paddleHeight) {
        if (x > paddleX && x < paddleX + paddleWidth) {
            const relativeIntersectX = (x - (paddleX + paddleWidth / 2));
            dx = relativeIntersectX * 0.15; // 角度調整の係数は維持
            dy = -dy; 
        } 
        // 3. NG判定 (球が画面下部に落ちた)
        else {
            handleNG();
            return;
        }
    }

    // 4. ラケットの移動 (速度は変更なし)
    if (rightPressed && paddleX < canvasWidth - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }

    // 5. 球の移動
    x += dx;
    y += dy;
}

// --- NG/ゲームオーバー処理 (省略) ---
// handleNG, gameOver は変更なし
// ...

// drawBall, drawPaddle, drawBricks, handleNG, gameOver, keyDownHandler, keyUpHandler, getRandomColor, isSnake, collisionDetection の定義が続く

// 省略された関数の定義を補完します。
// （前回提供したコードと実質的な変更はありませんが、完全なコードを提供するために再度記述します。）

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; 
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvasHeight - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD"; 
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                
                b.x = brickX;
                b.y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = b.color; 
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function handleNG() {
    ngCount++;
    NG_COUNT_SPAN.textContent = ngCount;
    
    if (ngCount >= MAX_NG) {
        gameOver(false);
    } else {
        clearInterval(gameLoopInterval);
        MESSAGE_P.textContent = `**球を逸らしました！** NG ${ngCount}/${MAX_NG}`;
        MESSAGE_P.classList.add('game-over');
        isPlaying = false;
        
        setTimeout(() => {
            if (ngCount < MAX_NG) {
                resetBallAndPaddle(); 
                isPlaying = true;
                gameLoopInterval = setInterval(draw, 10);
                MESSAGE_P.textContent = "ゲーム中...";
                MESSAGE_P.classList.remove('game-over');
            }
        }, 1500);
    }
}

function gameOver(win) {
    clearInterval(gameLoopInterval);
    isPlaying = false;
    if (win) {
        MESSAGE_P.textContent = `**🏆 全ブロック破壊！ゲームクリア！** 最終スコア: ${score}`;
        MESSAGE_P.classList.remove('game-over');
        MESSAGE_P.style.color = 'green';
    } else {
        MESSAGE_P.textContent = `**ゲームオーバー！** 😭 NG回数が${MAX_NG}回に達しました。最終スコア: ${score}`;
        MESSAGE_P.classList.add('game-over');
    }
}

// 初期状態の描画
initBricks();
draw();
MESSAGE_P.textContent = "スタートボタンを押してください";