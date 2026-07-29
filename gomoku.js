(() => {
  const SIZE = 15;
  const EMPTY = null, HUMAN = 'black', AI = 'white';
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const letters = 'ABCDEFGHIJKLMNO';
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), message = $('message');
  let board, current, thinking, finished, lastMove, suggestion;

  function newBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)); }
  function onBoard(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
  function other(color) { return color === HUMAN ? AI : HUMAN; }
  function coord(x, y) { return `${letters[x]}${SIZE - y}`; }
  function setCoach(main, reason, next) {
    $('coach-main').textContent = main;
    $('coach-reason').textContent = reason;
    $('next-tip').textContent = next;
  }
  function setTurn(text) { $('turn-card').textContent = text; }
  function hideHint() {
    suggestion = null;
    $('next-tip-card').classList.add('hidden');
    $('hint-button').textContent = '💡 看提示';
  }
  function showHint() {
    if (thinking || finished || current !== HUMAN) return;
    const advice = humanAdvice();
    suggestion = advice.move ? { x: advice.move.x, y: advice.move.y } : null;
    $('next-tip').textContent = advice.text;
    $('next-tip-card').classList.remove('hidden');
    $('hint-button').textContent = '收起提示';
    render();
  }
  function renderLabels() {
    $('column-labels').innerHTML = letters.split('').map(letter => `<span>${letter}</span>`).join('');
    $('row-labels').innerHTML = Array.from({ length: SIZE }, (_, y) => `<span>${SIZE - y}</span>`).join('');
  }
  function render() {
    boardEl.innerHTML = '';
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const point = document.createElement('button');
      const stone = board[y][x];
      point.type = 'button';
      point.className = `point ${stone || 'empty'}${thinking ? ' thinking' : ''}`;
      if (lastMove && lastMove.x === x && lastMove.y === y) point.classList.add(`last-${lastMove.color}`);
      if (!stone && suggestion && suggestion.x === x && suggestion.y === y && !finished) point.classList.add('suggestion');
      point.setAttribute('aria-label', stone ? `${stone === HUMAN ? '语语黑棋' : '电脑白棋'}在 ${coord(x, y)}` : `在 ${coord(x, y)} 落子`);
      point.addEventListener('click', () => humanMove(x, y));
      boardEl.append(point);
    }
  }
  function countSide(x, y, dx, dy, color) {
    let count = 0;
    while (onBoard(x, y) && board[y][x] === color) { count++; x += dx; y += dy; }
    return { count, open: onBoard(x, y) && board[y][x] === EMPTY };
  }
  function lineInfo(x, y, dx, dy, color) {
    const a = countSide(x + dx, y + dy, dx, dy, color);
    const b = countSide(x - dx, y - dy, -dx, -dy, color);
    return { count: 1 + a.count + b.count, open: Number(a.open) + Number(b.open) };
  }
  function patternScore(count, open) {
    if (count >= 5) return 100000000;
    if (count === 4 && open === 2) return 1200000;
    if (count === 4 && open === 1) return 130000;
    if (count === 3 && open === 2) return 24000;
    if (count === 3 && open === 1) return 2800;
    if (count === 2 && open === 2) return 700;
    if (count === 2 && open === 1) return 110;
    if (count === 1 && open === 2) return 12;
    return 1;
  }
  function evaluateMove(x, y, color) {
    if (board[y][x] !== EMPTY) return -Infinity;
    board[y][x] = color;
    let total = 0, best = { count: 1, open: 0, score: 0 };
    for (const [dx, dy] of directions) {
      const info = lineInfo(x, y, dx, dy, color), score = patternScore(info.count, info.open);
      total += score;
      if (score > best.score) best = { ...info, score };
    }
    board[y][x] = EMPTY;
    return { total, best };
  }
  function hasNeighbor(x, y) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if ((dx || dy) && onBoard(x + dx, y + dy) && board[y + dy][x + dx] !== EMPTY) return true;
    }
    return false;
  }
  function candidateMoves(color, limit = 12) {
    const moves = [];
    let stones = 0;
    for (const row of board) for (const stone of row) if (stone) stones++;
    if (!stones) return [{ x: 7, y: 7, score: 0 }];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY || !hasNeighbor(x, y)) continue;
      const attack = evaluateMove(x, y, color), defend = evaluateMove(x, y, other(color));
      const center = 20 - (Math.abs(x - 7) + Math.abs(y - 7));
      moves.push({ x, y, score: attack.total + defend.total * 0.93 + center, attack, defend });
    }
    return moves.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  function findImmediate(color) {
    return candidateMoves(color, 40).find(move => move.attack.best.count >= 5) || null;
  }
  function winnerAt(x, y, color) {
    return directions.some(([dx, dy]) => lineInfo(x, y, dx, dy, color).count >= 5);
  }
  function positionScore(color) {
    let score = 0;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== color) continue;
      for (const [dx, dy] of directions) {
        const px = x - dx, py = y - dy;
        if (onBoard(px, py) && board[py][px] === color) continue;
        let count = 0, nx = x, ny = y;
        while (onBoard(nx, ny) && board[ny][nx] === color) { count++; nx += dx; ny += dy; }
        const frontOpen = onBoard(nx, ny) && board[ny][nx] === EMPTY;
        const backOpen = onBoard(px, py) && board[py][px] === EMPTY;
        score += patternScore(count, Number(frontOpen) + Number(backOpen));
      }
    }
    return score;
  }
  function boardValue() { return positionScore(AI) - positionScore(HUMAN) * 1.05; }
  function hardMove() {
    const win = findImmediate(AI); if (win) return { ...win, reason: '直接连成五子，马上获胜。' };
    const block = findImmediate(HUMAN); if (block) return { ...block, reason: `你在 ${coord(block.x, block.y)} 下一手就能连成五，我必须先挡住。` };
    const deadline = performance.now() + 850;
    function search(depth, alpha, beta, color) {
      if (performance.now() > deadline || depth === 0) return boardValue();
      const choices = candidateMoves(color, depth >= 3 ? 10 : 8);
      if (color === AI) {
        let value = -Infinity;
        for (const move of choices) {
          board[move.y][move.x] = color;
          const score = winnerAt(move.x, move.y, color) ? 90000000 + depth : search(depth - 1, alpha, beta, HUMAN);
          board[move.y][move.x] = EMPTY; value = Math.max(value, score); alpha = Math.max(alpha, value);
          if (alpha >= beta) break;
        }
        return value;
      }
      let value = Infinity;
      for (const move of choices) {
        board[move.y][move.x] = color;
        const score = winnerAt(move.x, move.y, color) ? -90000000 - depth : search(depth - 1, alpha, beta, AI);
        board[move.y][move.x] = EMPTY; value = Math.min(value, score); beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let best = null, bestValue = -Infinity;
    for (const move of candidateMoves(AI, 11)) {
      board[move.y][move.x] = AI;
      const value = search(2, -Infinity, Infinity, HUMAN);
      board[move.y][move.x] = EMPTY;
      if (value > bestValue) { bestValue = value; best = move; }
      if (performance.now() > deadline) break;
    }
    return { ...best, reason: reasonForMove(best, AI) };
  }
  function reasonForMove(move, color) {
    const info = evaluateMove(move.x, move.y, color).best;
    const enemy = evaluateMove(move.x, move.y, other(color)).best;
    if (enemy.count >= 4) return `先堵住你可能形成的 ${enemy.count} 连，不能让威胁变成五连。`;
    if (info.count >= 4) return info.open === 2 ? '做出活四：两头都能下，对方通常只能挡一边。' : '做出冲四，下一步要特别小心五连机会。';
    if (info.count >= 3 && info.open === 2) return '做出活三：两边都还有空间，下一步可能升级成活四。';
    if (enemy.count >= 3 && enemy.open >= 1) return '先压住你正在发展的三连，防守也要抢在威胁变大之前。';
    return '兼顾靠近已有棋子和向多个方向延伸，让后面的选择更多。';
  }
  function easyMove() {
    const win = findImmediate(AI); if (win) return { ...win, reason: '这一步可以直接连成五子。' };
    const block = findImmediate(HUMAN); if (block) return { ...block, reason: `你在 ${coord(block.x, block.y)} 有直接获胜的机会，我先挡住。` };
    const choices = candidateMoves(AI, 8);
    const safeChoices = choices.filter(move => move.defend.best.count < 4);
    const pool = safeChoices.length ? safeChoices.slice(0, Math.min(3, safeChoices.length)) : choices.slice(0, 2);
    const pick = pool[Math.floor(Math.random() * pool.length)] || { x: 7, y: 7 };
    return { ...pick, reason: reasonForMove(pick, AI) };
  }
  function humanAdvice() {
    const win = findImmediate(HUMAN); if (win) return { move: win, text: `你有一手获胜点：${coord(win.x, win.y)}，连成五子就赢。` };
    const block = findImmediate(AI); if (block) return { move: block, text: `先看防守：电脑下一手可能在 ${coord(block.x, block.y)} 连成五，优先堵住。` };
    const move = candidateMoves(HUMAN, 1)[0];
    if (!move) return { move: null, text: '开局先占中心附近，给四个方向都留下发展空间。' };
    const info = move.attack.best;
    if (info.count >= 3 && info.open >= 2) return { move, text: `可以考虑 ${coord(move.x, move.y)}：它会做出活三，两端都还有发展空间。` };
    if (info.count >= 3) return { move, text: `可以考虑 ${coord(move.x, move.y)}：先把三连做出来，再找机会冲四。` };
    return { move, text: `试试 ${coord(move.x, move.y)}：靠近已有黑棋，并保留横竖斜多个方向。` };
  }
  function humanMove(x, y) {
    if (thinking || finished || current !== HUMAN || board[y][x] !== EMPTY) return;
    board[y][x] = HUMAN; lastMove = { x, y, color: HUMAN }; hideHint();
    const humanInfo = evaluateMove(x, y, HUMAN); // occupied now, only used for friendly explanation below
    render();
    if (winnerAt(x, y, HUMAN)) { finish(HUMAN, '太棒了，语语连成五子获胜！这说明你找到了能够延伸的一条线。'); return; }
    current = AI; thinking = true; setTurn('电脑正在思考：先看有没有必须防守的点…');
    message.textContent = `语语下在 ${coord(x, y)}。电脑正在判断进攻和防守。`;
    setCoach(`你下在 ${coord(x, y)}。`, '好习惯：每落一子都要同时数一数自己和对方能连成几子。', '等电脑落子后，我会给你下一步建议。');
    render(); setTimeout(computerMove, 70);
  }
  function computerMove() {
    const hard = $('difficulty').value === 'hard';
    const move = hard ? hardMove() : easyMove();
    board[move.y][move.x] = AI; lastMove = { x: move.x, y: move.y, color: AI }; thinking = false;
    if (winnerAt(move.x, move.y, AI)) { render(); finish(AI, `电脑在 ${coord(move.x, move.y)} 连成五子。本局结束，但你可以从它的最后一步学会先看四连。`); return; }
    current = HUMAN; const advice = humanAdvice(); hideHint();
    setTurn('轮到语语下棋 · 先看右边的下一步建议');
    message.className = 'message'; message.textContent = `电脑下在 ${coord(move.x, move.y)}。轮到语语。`;
    setCoach(`电脑下在 ${coord(move.x, move.y)}。`, move.reason, advice.text);
    render();
  }
  function finish(color, lesson) {
    finished = true; thinking = false; suggestion = null;
    setTurn(color === HUMAN ? '语语获胜！🎉' : '电脑获胜，本局结束');
    message.className = `message ${color === HUMAN ? 'success' : 'error'}`;
    message.textContent = color === HUMAN ? '语语赢了！点击“开新一局”继续练习。' : '这一局电脑赢了。点击“开新一局”再来一次。';
    setCoach(color === HUMAN ? '恭喜语语连成五子！' : '这局先到这里。', lesson, '复盘时先找：哪一步开始出现了活三、冲四或必须堵住的四连？');
    render();
  }
  function resetGame() {
    board = newBoard(); current = HUMAN; thinking = false; finished = false; lastMove = null; hideHint();
    message.className = 'message'; message.textContent = '点击一个交叉点开始下棋。';
    setTurn('轮到语语下棋');
    setCoach('开局先占住中心附近。', '中心的棋子最灵活：横、竖、两条斜线都能继续发展。', '第一手试试棋盘中央的 H8。');
    render();
  }
  $('new-game').addEventListener('click', resetGame);
  $('hint-button').addEventListener('click', () => {
    if ($('next-tip-card').classList.contains('hidden')) showHint();
    else { hideHint(); render(); }
  });
  $('difficulty').addEventListener('change', resetGame);
  renderLabels(); resetGame();
})();
