(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const COLORS = {
    I: "#38c9ea", O: "#fbd15c", T: "#bd93f9", S: "#57d99b",
    Z: "#ff6b82", J: "#7199ff", L: "#ffac64"
  };
  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
  };
  const TYPES = Object.keys(SHAPES);
  const storageKey = "block-arena-best-v1";

  const boardCanvas = document.getElementById("board");
  const context = boardCanvas.getContext("2d");
  const nextCanvas = document.getElementById("next");
  const holdCanvas = document.getElementById("hold");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayButton = document.getElementById("overlay-button");
  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const helpStatus = document.getElementById("game-status");
  const scoreEl = document.getElementById("score");
  const linesEl = document.getElementById("lines");
  const levelEl = document.getElementById("level");
  const bestEl = document.getElementById("best");
  const attackEl = document.getElementById("attack");
  const progressEl = document.getElementById("progress");

  let board = emptyBoard();
  let bag = [];
  let upcoming = [];
  let active = null;
  let held = null;
  let holdUsed = false;
  let score = 0;
  let lines = 0;
  let level = 1;
  let attackSent = 0;
  let running = false;
  let paused = false;
  let started = false;
  let lastTime = 0;
  let elapsed = 0;
  let best = readBest();
  let lockCount = 0;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function readBest() {
    try {
      const value = Number(localStorage.getItem(storageKey));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function writeBest() {
    if (score <= best) return;
    best = score;
    try { localStorage.setItem(storageKey, String(best)); } catch {}
  }

  function refillBag() {
    const copy = TYPES.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    bag.push(...copy);
  }

  function dequeueType() {
    if (!bag.length) refillBag();
    return bag.shift();
  }

  function freshPiece(type) {
    const matrix = SHAPES[type].map(row => row.slice());
    return {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0
    };
  }

  function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (!matrix[y][x]) continue;
        const px = piece.x + x + offsetX;
        const py = piece.y + y + offsetY;
        if (px < 0 || px >= COLS || py >= ROWS) return true;
        if (py >= 0 && board[py][px]) return true;
      }
    }
    return false;
  }

  function spawn(type = null) {
    while (upcoming.length < 5) upcoming.push(dequeueType());
    const nextType = type || upcoming.shift();
    while (upcoming.length < 5) upcoming.push(dequeueType());
    active = freshPiece(nextType);
    drawPreview(nextCanvas, upcoming[0]);
    if (collides(active)) gameOver();
  }

  function move(dx, dy = 0) {
    if (!running || paused || !active) return false;
    if (collides(active, dx, dy)) return false;
    active.x += dx;
    active.y += dy;
    return true;
  }

  function rotate(direction = 1) {
    if (!running || paused || !active) return;
    const old = active.matrix;
    const height = old.length;
    const width = old[0].length;
    const matrix = Array.from({ length: width }, () => Array(height).fill(0));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (direction > 0) matrix[x][height - 1 - y] = old[y][x];
        else matrix[width - 1 - x][y] = old[y][x];
      }
    }
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collides(active, dx, 0, matrix)) {
        active.x += dx;
        active.matrix = matrix;
        return;
      }
    }
  }

  function hold() {
    if (!running || paused || !active || holdUsed) return;
    const current = active.type;
    if (held) spawn(held);
    else spawn();
    held = current;
    holdUsed = true;
    drawPreview(holdCanvas, held);
  }

  function lockPiece() {
    if (!active) return;
    for (let y = 0; y < active.matrix.length; y++) {
      for (let x = 0; x < active.matrix[y].length; x++) {
        if (!active.matrix[y][x]) continue;
        const by = active.y + y;
        if (by < 0) {
          gameOver();
          return;
        }
        board[by][active.x + x] = active.type;
      }
    }
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every(Boolean)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }

    // 대전용 공격 이벤트: 향후 WebSocket 백엔드에서 이 이벤트를 수신합니다.
    // 상대에게 보낼 방해 줄 수는 서버에서도 재검증해야 합니다.
    if (cleared) {
      score += [0, 100, 300, 500, 800][cleared] * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      const garbage = [0, 0, 1, 2, 4][cleared];
      attackSent += garbage;
      if (garbage > 0) {
        window.dispatchEvent(new CustomEvent("blockarena:attack", {
          detail: { lines: garbage, cleared, sequence: ++lockCount }
        }));
      }
    }

    holdUsed = false;
    writeBest();
    spawn();
    updateHUD();
  }

  function softDrop() {
    if (!running || paused) return;
    if (move(0, 1)) score += 1;
    else lockPiece();
    updateHUD();
  }

  function hardDrop() {
    if (!running || paused) return;
    let distance = 0;
    while (move(0, 1)) distance++;
    score += distance * 2;
    lockPiece();
  }

  function stepDrop() {
    if (!running || paused) return;
    if (!move(0, 1)) lockPiece();
  }

  function updateHUD() {
    scoreEl.textContent = score.toLocaleString("ko-KR");
    linesEl.textContent = String(lines);
    levelEl.textContent = String(level);
    bestEl.textContent = best.toLocaleString("ko-KR");
    attackEl.textContent = String(attackSent);
    progressEl.style.width = ((lines % 10) / 10 * 100) + "%";
    pauseButton.disabled = !running;
    pauseButton.textContent = paused ? "계속하기" : "일시정지";
    helpStatus.textContent = !started ? "시작할 준비가 됐어요" :
      !running ? "게임 종료" : paused ? "일시정지됨" : "플레이 중";
  }

  function setOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayText.textContent = message;
    overlayButton.textContent = buttonText;
    overlay.hidden = false;
  }

  function newGame() {
    board = emptyBoard();
    bag = [];
    upcoming = [];
    active = null;
    held = null;
    holdUsed = false;
    score = 0;
    lines = 0;
    level = 1;
    attackSent = 0;
    lockCount = 0;
    running = true;
    started = true;
    paused = false;
    elapsed = 0;
    lastTime = performance.now();
    overlay.hidden = true;
    drawPreview(holdCanvas, null);
    spawn();
    startButton.textContent = "다시 시작";
    updateHUD();
    draw();
  }

  function gameOver() {
    running = false;
    paused = false;
    writeBest();
    updateHUD();
    setOverlay("게임 종료", "점수 " + score.toLocaleString("ko-KR") + "점 · " + lines + "줄 제거", "다시 도전");
  }

  function togglePause() {
    if (!started || !running) return;
    paused = !paused;
    lastTime = performance.now();
    if (paused) setOverlay("일시정지", "준비가 되면 다시 시작하세요.", "계속하기");
    else overlay.hidden = true;
    updateHUD();
  }

  function action(name) {
    if (!running || paused) return;
    switch (name) {
      case "left": move(-1); break;
      case "right": move(1); break;
      case "down": softDrop(); break;
      case "rotate": rotate(1); break;
      case "rotate-ccw": rotate(-1); break;
      case "drop": hardDrop(); break;
      case "hold": hold(); break;
    }
    draw();
  }

  function drawCell(ctx, x, y, type, size, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.fillRect(x * size + 3, y * size + 3, size - 6, 3);
    ctx.globalAlpha = 1;
  }

  function drawPreview(canvas, type) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const matrix = SHAPES[type];
    const size = 24;
    const offsetX = (canvas.width - matrix[0].length * size) / 2;
    const offsetY = (canvas.height - matrix.length * size) / 2;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          ctx.save();
          ctx.translate(offsetX, offsetY);
          drawCell(ctx, x, y, type, size);
          ctx.restore();
        }
      }
    }
  }

  function draw() {
    context.fillStyle = "#0e1526";
    context.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    context.strokeStyle = "rgba(255,255,255,0.045)";
    context.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      context.beginPath();
      context.moveTo(x * CELL + .5, 0);
      context.lineTo(x * CELL + .5, ROWS * CELL);
      context.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      context.beginPath();
      context.moveTo(0, y * CELL + .5);
      context.lineTo(COLS * CELL, y * CELL + .5);
      context.stroke();
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) drawCell(context, x, y, board[y][x], CELL);
      }
    }
    if (!active) return;
    const ghost = { ...active };
    while (!collides(ghost, 0, 1)) ghost.y++;
    for (let y = 0; y < ghost.matrix.length; y++) {
      for (let x = 0; x < ghost.matrix[y].length; x++) {
        if (ghost.matrix[y][x] && ghost.y + y >= 0) {
          drawCell(context, ghost.x + x, ghost.y + y, ghost.type, CELL, .16);
        }
      }
    }
    for (let y = 0; y < active.matrix.length; y++) {
      for (let x = 0; x < active.matrix[y].length; x++) {
        if (active.matrix[y][x] && active.y + y >= 0) {
          drawCell(context, active.x + x, active.y + y, active.type, CELL);
        }
      }
    }
  }

  function loop(timestamp) {
    const delta = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;
    if (running && !paused) {
      elapsed += Math.max(0, delta);
      const interval = Math.max(95, 850 * Math.pow(.86, level - 1));
      if (elapsed >= interval) {
        elapsed = 0;
        stepDrop();
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  // 키보드 조작
  window.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const keyMap = {
      ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down",
      ArrowUp: "rotate", KeyX: "rotate", KeyZ: "rotate-ccw",
      Space: "drop", KeyC: "hold"
    };
    if (keyMap[event.code]) {
      event.preventDefault();
      action(keyMap[event.code]);
    } else if (event.code === "KeyP" || event.code === "Escape") {
      event.preventDefault();
      togglePause();
    }
  });

  // 모바일: 길게 누르면 좌우/아래 이동을 반복합니다.
  document.querySelectorAll("[data-action]").forEach(button => {
    let delayTimer = null;
    let repeatTimer = null;
    const repeatable = ["left", "right", "down"].includes(button.dataset.action);
    const clear = () => {
      clearTimeout(delayTimer);
      clearInterval(repeatTimer);
      delayTimer = null;
      repeatTimer = null;
    };
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      clear();
      action(button.dataset.action);
      if (repeatable) {
        delayTimer = setTimeout(() => {
          repeatTimer = setInterval(() => action(button.dataset.action), 75);
        }, 210);
      }
    });
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(type => {
      button.addEventListener(type, clear);
    });
    button.addEventListener("click", event => {
      // 키보드로 버튼을 활성화한 경우에도 동작합니다.
      if (event.detail === 0) action(button.dataset.action);
    });
  });

  overlayButton.addEventListener("click", () => {
    if (running && paused) togglePause();
    else newGame();
  });
  startButton.addEventListener("click", newGame);
  pauseButton.addEventListener("click", togglePause);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) togglePause();
  });

  drawPreview(nextCanvas, null);
  drawPreview(holdCanvas, null);
  updateHUD();
  setOverlay("BLOCK ARENA", "블록을 쌓고 줄을 완성하세요. 대전 모드는 다음 단계에서 연결됩니다.", "혼자 시작하기");
  requestAnimationFrame(timestamp => { lastTime = timestamp; loop(timestamp); });
})();
