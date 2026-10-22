(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const CLEAR_FLASH_MS = 65;
  const CLEAR_SHATTER_MS = 160;
  const SETTLE_MS = 110;
  const PARTICLES_PER_CELL = 4;
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
  let clearAnimation = null;
  let settleAnimation = null;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  function makeShatterParticles(clearedRows) {
    const particles = [];
    for (const row of clearedRows) {
      for (let x = 0; x < COLS; x++) {
        const color = COLORS[board[row][x]];
        for (let i = 0; i < PARTICLES_PER_CELL; i++) {
          particles.push({
            x: (x + .2 + Math.random() * .6) * CELL,
            y: (row + .2 + Math.random() * .6) * CELL,
            vx: (Math.random() - .5) * 210,
            vy: -45 - Math.random() * 130,
            size: 3 + Math.random() * 6,
            color
          });
        }
      }
    }
    return particles;
  }

  function finishLock(clearedRows) {
    const cleared = clearedRows.length;
    settleAnimation = null;

    if (cleared) {
      const clearedSet = new Set(clearedRows);
      const survivors = [];
      const offsets = Array(ROWS).fill(0);
      let rowsBelow = 0;

      // 실제 보드와 애니메이션의 출발 위치를 동일한 행 매핑으로 계산합니다.
      for (let y = ROWS - 1; y >= 0; y--) {
        if (clearedSet.has(y)) {
          rowsBelow++;
        } else {
          survivors.unshift(board[y]);
          offsets[y + rowsBelow] = rowsBelow;
        }
      }
      board = Array.from({ length: cleared }, () => Array(COLS).fill(null)).concat(survivors);
      if (!reducedMotionQuery.matches) {
        settleAnimation = { elapsed: 0, offsets };
      }

      // 대전용 공격 이벤트의 계산/발행 타이밍은 줄 제거가 확정된 시점으로 유지합니다.
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

  function lockPiece() {
    if (!active || clearAnimation) return;
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

    const clearedRows = [];
    for (let y = 0; y < ROWS; y++) {
      if (board[y].every(Boolean)) clearedRows.push(y);
    }

    if (clearedRows.length && !reducedMotionQuery.matches) {
      // 줄을 즉시 삭제하지 않고 짧은 플래시 → 파편 연출이 끝난 뒤 확정합니다.
      clearAnimation = {
        rows: clearedRows,
        elapsed: 0,
        particles: makeShatterParticles(clearedRows)
      };
      active = null;
      elapsed = 0;
      return;
    }
    finishLock(clearedRows);
  }

  function softDrop() {
    if (!running || paused || clearAnimation || !active) return;
    if (move(0, 1)) score += 1;
    else lockPiece();
    updateHUD();
  }

  function hardDrop() {
    if (!running || paused || clearAnimation || !active) return;
    let distance = 0;
    while (move(0, 1)) distance++;
    score += distance * 2;
    lockPiece();
  }

  function stepDrop() {
    if (!running || paused || clearAnimation || !active) return;
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
    clearAnimation = null;
    settleAnimation = null;
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
    clearAnimation = null;
    settleAnimation = null;
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
    if (!running || paused || clearAnimation) return;
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

  function drawClearEffect() {
    if (!clearAnimation) return;
    const time = clearAnimation.elapsed;
    if (time < CLEAR_FLASH_MS) {
      const opacity = .65 - .4 * (time / CLEAR_FLASH_MS);
      context.fillStyle = "rgba(255,255,255," + opacity + ")";
      for (const row of clearAnimation.rows) {
        context.fillRect(0, row * CELL, COLS * CELL, CELL);
      }
      return;
    }

    const progress = Math.min(1, (time - CLEAR_FLASH_MS) / CLEAR_SHATTER_MS);
    const seconds = (time - CLEAR_FLASH_MS) / 1000;
    context.save();
    context.globalAlpha = Math.max(0, 1 - progress);
    for (const particle of clearAnimation.particles) {
      const x = particle.x + particle.vx * seconds;
      const y = particle.y + particle.vy * seconds + 260 * seconds * seconds;
      const size = particle.size * (1 - .3 * progress);
      context.fillStyle = particle.color;
      context.fillRect(x - size / 2, y - size / 2, size, size);
    }
    context.restore();
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
    const flashing = clearAnimation && clearAnimation.elapsed < CLEAR_FLASH_MS;
    const clearSet = clearAnimation ? new Set(clearAnimation.rows) : null;
    const settleProgress = settleAnimation
      ? Math.min(1, settleAnimation.elapsed / SETTLE_MS) : 1;
    const easeOut = 1 - Math.pow(1 - settleProgress, 3);

    for (let y = 0; y < ROWS; y++) {
      if (clearSet && clearSet.has(y) && !flashing) continue;
      const rowY = settleAnimation ? y - settleAnimation.offsets[y] * (1 - easeOut) : y;
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) drawCell(context, x, rowY, board[y][x], CELL);
      }
    }
    drawClearEffect();
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
      const tick = Math.max(0, delta);
      if (clearAnimation) {
        clearAnimation.elapsed += tick;
        if (clearAnimation.elapsed >= CLEAR_FLASH_MS + CLEAR_SHATTER_MS) {
          const rows = clearAnimation.rows;
          clearAnimation = null;
          elapsed = 0;
          finishLock(rows);
        }
      } else {
        if (settleAnimation) {
          settleAnimation.elapsed += tick;
          if (settleAnimation.elapsed >= SETTLE_MS) settleAnimation = null;
        }
        elapsed += tick;
        const interval = Math.max(95, 850 * Math.pow(.86, level - 1));
        if (elapsed >= interval) {
          elapsed = 0;
          stepDrop();
        }
      }
    }
    draw();
    requestAnimationFrame(loop);
  }


  // 세로형 모바일 화면의 실제 가용 높이에 맞춰 보드 크기를 계산합니다.
  // 10x20 캔버스의 비율은 유지하면서 터치 버튼까지 한 화면에 표시합니다.
  const mobileGameColumn = document.querySelector(".game-column");
  const mobileBoardFrame = document.querySelector(".board-frame");
  const mobileControls = document.querySelector(".controls");
  const mobileLayoutQuery = window.matchMedia("(max-width: 610px) and (orientation: portrait)");

  function fitMobileBoard() {
    if (!mobileLayoutQuery.matches) {
      mobileBoardFrame.style.removeProperty("width");
      return;
    }
    const remainingHeight = mobileGameColumn.clientHeight - mobileControls.offsetHeight - 5;
    if (remainingHeight <= 0) return;
    const width = Math.max(1, Math.min(
      312,
      mobileGameColumn.clientWidth,
      Math.floor(remainingHeight / 2)
    ));
    mobileBoardFrame.style.width = width + "px";
  }
  window.addEventListener("resize", fitMobileBoard);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fitMobileBoard);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fitMobileBoard).observe(mobileGameColumn);
  }
  requestAnimationFrame(fitMobileBoard);


  // 메뉴는 실제 게임과 분리하고, 미구현 온라인 기능은 준비 중임을 명확하게 표시합니다.
  const appPage = document.querySelector(".page");
  const menuView = document.getElementById("menu-view");
  const gameView = document.getElementById("game-view");
  const homeButton = document.getElementById("home-button");
  const recordBest = document.getElementById("record-best");
  const plannedTitle = document.getElementById("planned-title");
  const plannedDescription = document.getElementById("planned-description");
  const menuScreens = Array.from(menuView.querySelectorAll("[data-page]"));
  let menuPage = "home";
  const menuHistory = [];

  function showMenu(page) {
    if (!menuScreens.some(screen => screen.dataset.page === page)) return;
    gameView.hidden = true;
    menuView.hidden = false;
    appPage.classList.add("in-menu");
    for (const screen of menuScreens) {
      screen.hidden = screen.dataset.page !== page;
    }
    menuPage = page;
    if (page === "records") recordBest.textContent = best.toLocaleString("ko-KR");
  }

  function navigateMenu(page) {
    menuHistory.push(menuPage);
    showMenu(page);
  }

  function backMenu() {
    showMenu(menuHistory.pop() || "home");
  }

  function showGame() {
    menuView.hidden = true;
    gameView.hidden = false;
    appPage.classList.remove("in-menu");
    menuHistory.length = 0;
    newGame();
    requestAnimationFrame(fitMobileBoard);
  }

  function leaveGame() {
    if (running && !window.confirm("진행 중인 게임을 종료하고 메인 화면으로 돌아갈까요?")) return;
    writeBest();
    running = false;
    paused = false;
    active = null;
    clearAnimation = null;
    settleAnimation = null;
    updateHUD();
    menuHistory.length = 0;
    showMenu("home");
  }

  menuView.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-back")) {
      backMenu();
    } else if (button.dataset.nav) {
      navigateMenu(button.dataset.nav);
    } else if (button.dataset.play === "classic") {
      showGame();
    } else if (button.dataset.plan) {
      plannedTitle.textContent = button.dataset.plan;
      plannedDescription.textContent = button.dataset.plan.includes("랜덤")
        ? "상대를 자동으로 찾고 3초 카운트다운 후 즉시 시작하는 기능을 준비 중입니다."
        : "초대 코드로 친구를 모아 준비 완료 후 시작하는 기능을 준비 중입니다.";
      navigateMenu("planned");
    }
  });
  homeButton.addEventListener("click", leaveGame);

  // 키보드 조작
  window.addEventListener("keydown", event => {
    if (gameView.hidden) return;
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
  showMenu("home");
  setOverlay("BLOCK ARENA", "블록을 쌓고 줄을 완성하세요.", "혼자 시작하기");
  requestAnimationFrame(timestamp => { lastTime = timestamp; loop(timestamp); });
})();
