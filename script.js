/**
 * ＭＯＲＩＴＡのブロック崩しゲーム
 * - ← → でラケット（パドル）移動
 * - ボールを落とすとNG +1（10回でゲーム終了）
 * - ブロックはカラフル
 * - 速度3段階（高速/並み/遅い）※START前に選択
 * - オフラインOK（外部ライブラリなし）
 */

"use strict";

/** ===== DOM ===== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const leftEl = document.getElementById("left");
const ngEl = document.getElementById("ng");
const statusEl = document.getElementById("status");
const speedLabelEl = document.getElementById("speedLabel");

const speedSelect = document.getElementById("speed");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

/** ===== 速度（1フレームあたりの移動量に反映） ===== */
const SPEED = {
  fast: 1.25,
  normal: 1.0,
  slow: 0.78,
};

/** ===== 背景 ===== */
const GRID_LINE = "rgba(124,255,225,.06)";

/** ===== 状態 ===== */
let score = 0;
let ngCount = 0;
let isPlaying = false;

let speedMul = SPEED.normal;

/** パドル */
const paddle = {
  w: 120,
  h: 16,
  x: 0,
  y: 0,
  vx: 0,
  maxV: 8,
};

/** ボール */
const ball = {
  r: 10,
  x: 0,
  y: 0,
  vx: 4,
  vy: -4,
};

/** ブロック */
let blocks = [];
const BLOCK = {
  rows: 6,
  cols: 10,
  w: 64,
  h: 22,
  gap: 10,
  top: 40,
  left: 30,
};

/** ループ */
let rafId = null;
let lastTime = 0;

/** バッジ画像（任意） */
const badgeImg = new Image();
badgeImg.src = "images/morita_badge.svg";
let badgeReady = false;
badgeImg.onload = () => { badgeReady = true; };

/** 入力 */
const keys = { left: false, right: false };

/** ===== 初期化 ===== */
function init() {
  score = 0;
  ngCount = 0;
  isPlaying = false;

  setSpeed(speedSelect.value);

  setupPaddle();
  setupBall(true);
  setupBlocks();

  stopLoop();
  showOverlay("READY", "STARTで開始（←→で操作）", true);
  statusEl.textContent = "待機中";
  startBtn.disabled = false;
  speedSelect.disabled = false;

  updateUI();
  draw(); // 1枚描いておく
}

function setSpeed(mode) {
  speedMul = SPEED[mode] ?? SPEED.normal;
  speedLabelEl.textContent = (mode === "fast") ? "高速" : (mode === "slow") ? "遅い" : "並み";
}

function setupPaddle() {
  paddle.x = (canvas.width - paddle.w) / 2;
  paddle.y = canvas.height - 36;
  paddle.vx = 0;
}

function setupBall(centerOnPaddle) {
  if (centerOnPaddle) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
  } else {
    // そのまま
  }

  // 速度は倍率で調整（fast/normal/slow）
  const base = 4 * speedMul;
  ball.vx = base * (Math.random() < 0.5 ? -1 : 1);
  ball.vy = -base;
}

function setupBlocks() {
  blocks = [];
  const palette = makeColorPalette(BLOCK.rows, BLOCK.cols);

  for (let r = 0; r < BLOCK.rows; r++) {
    for (let c = 0; c < BLOCK.cols; c++) {
      const x = BLOCK.left + c * (BLOCK.w + BLOCK.gap);
      const y = BLOCK.top + r * (BLOCK.h + BLOCK.gap);

      blocks.push({
        x, y,
        w: BLOCK.w, h: BLOCK.h,
        alive: true,
        color: palette[r][c],
        hp: 1,
      });
    }
  }
}

function makeColorPalette(rows, cols) {
  // HSLでカラフルに（行×列で少しずつ色相をズラす）
  const pal = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const hue = (r * 34 + c * 12) % 360;
      row.push(`hsl(${hue} 95% 60%)`);
    }
    pal.push(row);
  }
  return pal;
}

/** ===== スタート / リセット ===== */
function startGame() {
  score = 0;
  ngCount = 0;
  isPlaying = true;

  setupPaddle();
  setupBall(true);
  setupBlocks();

  overlay.hidden = true;
  statusEl.textContent = "プレイ中";
  startBtn.disabled = true;
  speedSelect.disabled = true;

  startLoop();
  updateUI();
}

function resetAll() {
  init();
}

/** ===== ループ ===== */
function startLoop() {
  stopLoop();
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function loop(now) {
  const dt = Math.min(0.03, (now - lastTime) / 1000); // 秒（暴走防止）
  lastTime = now;

  update(dt);
  draw();

  if (isPlaying) {
    rafId = requestAnimationFrame(loop);
  }
}

/** ===== 更新 ===== */
function update(dt) {
  if (!isPlaying) return;

  // 入力でパドル速度
  paddle.vx = 0;
  if (keys.left) paddle.vx = -paddle.maxV;
  if (keys.right) paddle.vx = paddle.maxV;

  // パドル移動
  paddle.x += paddle.vx;
  paddle.x = clamp(paddle.x, 0, canvas.width - paddle.w);

  // ボール移動（dtはFPS差を吸収）
  ball.x += ball.vx * (dt * 60);
  ball.y += ball.vy * (dt * 60);

  // 壁反射（左右）
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  } else if (ball.x + ball.r > canvas.width) {
    ball.x = canvas.width - ball.r;
    ball.vx *= -1;
  }

  // 天井反射
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  // 落下（下に出たらNG）
  if (ball.y - ball.r > canvas.height) {
    onNG();
    return;
  }

  // パドル衝突
  if (circleRectHit(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h) && ball.vy > 0) {
    // 当たった位置で反射角を変える（端なら斜めが強くなる）
    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1～+1
    const base = 4 * speedMul;

    ball.vx = base * hitPos * 1.4; // 横方向
    ball.vy = -Math.max(2.8, Math.abs(base)); // 上方向へ

    // 少しだけ加速して気持ちよく（上限あり）
    const max = 7.2 * speedMul;
    ball.vx = clamp(ball.vx, -max, max);
    ball.vy = -clamp(Math.abs(ball.vy), 2.8, max);
  }

  // ブロック衝突
  for (const b of blocks) {
    if (!b.alive) continue;

    if (circleRectHit(ball.x, ball.y, ball.r, b.x, b.y, b.w, b.h)) {
      b.alive = false;
      score += 10;

      // どっち向きに反射させるか：簡易に「上下優先」で判定
      const prevX = ball.x - ball.vx * (dt * 60);
      const prevY = ball.y - ball.vy * (dt * 60);

      const hitFromLeft = prevX <= b.x - ball.r;
      const hitFromRight = prevX >= b.x + b.w + ball.r;
      const hitFromTop = prevY <= b.y - ball.r;
      const hitFromBottom = prevY >= b.y + b.h + ball.r;

      // 横から当たったっぽい
      if (hitFromLeft || hitFromRight) {
        ball.vx *= -1;
      } else if (hitFromTop || hitFromBottom) {
        ball.vy *= -1;
      } else {
        // 不明ならY反転
        ball.vy *= -1;
      }

      // 1回で1ブロックだけ処理（連続破壊を防ぐ）
      break;
    }
  }

  // クリア判定
  if (blocks.every(b => !b.alive)) {
    gameClear();
  }

  updateUI();
}

function onNG() {
  ngCount += 1;
  updateUI();

  if (ngCount >= 10) {
    gameOver();
    return;
  }

  // 次の球：パドル上に戻して再開（プレイ継続）
  setupPaddle();
  setupBall(true);

  flashOverlay(`NG！ (${ngCount}/10)`, "ボールをリセットして続行…", 650);
}

/** ===== 描画 ===== */
function draw() {
  // 背景
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#070b16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBackgroundGrid();

  // ブロック
  drawBlocks();

  // パドル
  drawPaddle();

  // ボール
  drawBall();

  // フレーム
  drawFrame();

  // 上部に小さくバッジ（任意演出）
  if (badgeReady) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.drawImage(badgeImg, canvas.width - 86, 10, 72, 72);
    ctx.restore();
  }
}

function drawBackgroundGrid() {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  const step = 24;

  for (let x = 0; x <= canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawBlocks() {
  for (const b of blocks) {
    if (!b.alive) continue;

    // グロー
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = b.color;
    roundRectFill(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 10);
    ctx.restore();

    // 本体
    ctx.fillStyle = b.color;
    roundRectFill(b.x, b.y, b.w, b.h, 10);

    // ハイライト
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    roundRectFill(b.x + 6, b.y + 5, b.w - 12, 6, 6);
    ctx.restore();

    // 枠
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    roundRectStroke(b.x, b.y, b.w, b.h, 10);
  }
}

function drawPaddle() {
  // 「MORITAラケット」：丸角＋ストライプでユニークに
  const x = paddle.x, y = paddle.y, w = paddle.w, h = paddle.h;

  // 影
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  roundRectFill(x + 2, y + 3, w, h, 12);
  ctx.restore();

  // 本体グラデ風
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, "#2ef2c1");
  grad.addColorStop(1, "#2b63ff");
  ctx.fillStyle = grad;
  roundRectFill(x, y, w, h, 12);

  // ストライプ
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 8; i < w; i += 16) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + 3);
    ctx.lineTo(x + i - 10, y + h - 3);
    ctx.stroke();
  }
  ctx.restore();

  // 枠
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  roundRectStroke(x, y, w, h, 12);
}

function drawBall() {
  const x = ball.x, y = ball.y;

  // 光
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffe56a";
  ctx.beginPath();
  ctx.arc(x, y, ball.r * 2.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 本体
  const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, ball.r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#a7b0d9");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // 反射
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 3, y - 3, ball.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFrame() {
  ctx.save();
  ctx.strokeStyle = "rgba(124,255,225,.18)";
  ctx.lineWidth = 3;
  roundRectStroke(2, 2, canvas.width - 4, canvas.height - 4, 18);
  ctx.restore();
}

/** ===== 終了系 ===== */
function gameOver() {
  isPlaying = false;
  stopLoop();

  startBtn.disabled = false;
  speedSelect.disabled = false;

  statusEl.textContent = "ゲームオーバー";
  showOverlay("GAME OVER", `スコア：${score} / STARTで最初から`, false);
}

function gameClear() {
  isPlaying = false;
  stopLoop();

  startBtn.disabled = false;
  speedSelect.disabled = false;

  statusEl.textContent = "クリア";
  showOverlay("CLEAR!", `おめでとう！ スコア：${score} / STARTで再挑戦`, true);
}

/** ===== UI ===== */
function updateUI() {
  scoreEl.textContent = String(score);
  ngEl.textContent = String(ngCount);
  leftEl.textContent = String(blocks.filter(b => b.alive).length);
}

/** ===== Overlay ===== */
function showOverlay(title, text, good) {
  overlay.hidden = false;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayTitle.style.color = good ? "#e8ecff" : "#ffb3b3";
}

function flashOverlay(title, text, ms) {
  overlay.hidden = false;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayTitle.style.color = "#ffe56a";

  window.setTimeout(() => {
    if (isPlaying) overlay.hidden = true;
  }, ms);
}

/** ===== 衝突判定：円 vs 矩形 ===== */
function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  // 円の中心から矩形の最近点を求める
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);

  const dx = cx - nx;
  const dy = cy - ny;
  return (dx * dx + dy * dy) <= (r * r);
}

/** ===== 図形 ===== */
function roundRectFill(x, y, w, h, r) {
  ctx.beginPath();
  roundedRectPath(x, y, w, h, r);
  ctx.fill();
}
function roundRectStroke(x, y, w, h, r) {
  ctx.beginPath();
  roundedRectPath(x, y, w, h, r);
  ctx.stroke();
}
function roundedRectPath(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** ===== utils ===== */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** ===== 入力イベント ===== */
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

speedSelect.addEventListener("change", () => {
  setSpeed(speedSelect.value);
  draw();
});

startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => resetAll());

/** 起動 */
init();
