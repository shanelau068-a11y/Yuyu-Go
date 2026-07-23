/*
 * Local Go rules and MCTS engine adapted from NakliTechie/KoLocal (MIT).
 * Copyright (c) 2026 NakliTechie. See THIRD_PARTY_NOTICES.md.
 */

class GoGame {
  constructor(size=9,komi=7.5){this.size=size;this.komi=komi;this.reset();}
  reset(){
    this.board=Array.from({length:this.size},()=>Array(this.size).fill(null));
    this.currentPlayer='black';this.moveNumber=0;this.captures={black:0,white:0};this.moveHistory=[];
    this.lastMove=null;this.passes=0;this.gameOver=false;this.boardHistory=new Set([this.getBoardHash()]);
  }
  onBoard(x,y){return x>=0&&x<this.size&&y>=0&&y<this.size;}
  getBoardHash(){return this.board.flat().map(c=>c?c[0]:'.').join('');}
  getGroup(sx,sy){
    const color=this.board[sy]?.[sx];if(!color)return{group:[],liberties:0};
    const group=[],liberties=new Set(),seen=new Set([`${sx},${sy}`]),stack=[[sx,sy]];
    while(stack.length){
      const[x,y]=stack.pop();group.push([x,y]);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!this.onBoard(nx,ny))continue;
        if(this.board[ny][nx]===null)liberties.add(k);
        else if(this.board[ny][nx]===color&&!seen.has(k)){seen.add(k);stack.push([nx,ny]);}
      }
    }
    return{group,liberties:liberties.size};
  }
  capturedAround(x,y,opponent){
    const captured=[],seen=new Set();
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
      if(!this.onBoard(nx,ny)||this.board[ny][nx]!==opponent||seen.has(k))continue;
      const info=this.getGroup(nx,ny);info.group.forEach(([gx,gy])=>seen.add(`${gx},${gy}`));
      if(info.liberties===0)captured.push(...info.group);
    }
    return captured;
  }
  simulateMove(x,y,color){
    if(!this.onBoard(x,y)||this.board[y][x]!==null)return null;
    const opponent=color==='black'?'white':'black';this.board[y][x]=color;
    const captured=this.capturedAround(x,y,opponent);captured.forEach(([cx,cy])=>{this.board[cy][cx]=null;});
    const suicide=this.getGroup(x,y).liberties===0,hash=this.getBoardHash();
    captured.forEach(([cx,cy])=>{this.board[cy][cx]=opponent;});this.board[y][x]=null;
    return{captured,suicide,hash};
  }
  canPlay(x,y,color=this.currentPlayer){
    const result=this.simulateMove(x,y,color);return!!result&&!result.suicide&&!this.boardHistory.has(result.hash);
  }
  play(x,y){
    if(this.gameOver)return{success:false,reason:'棋局已经结束'};
    const result=this.simulateMove(x,y,this.currentPlayer);
    if(!result)return{success:false,reason:'这里已经有棋子了'};
    if(result.suicide)return{success:false,reason:'这里是禁入点，不能落子'};
    if(this.boardHistory.has(result.hash))return{success:false,reason:'打劫不能马上提回'};
    const color=this.currentPlayer,opponent=color==='black'?'white':'black';this.board[y][x]=color;
    result.captured.forEach(([cx,cy])=>{this.board[cy][cx]=null;});this.captures[color]+=result.captured.length;
    this.moveHistory.push({x,y,color,captured:result.captured});this.lastMove={x,y,color};this.moveNumber++;this.passes=0;
    this.boardHistory.add(this.getBoardHash());this.currentPlayer=opponent;
    return{success:true,captured:result.captured.length};
  }
  pass(){
    if(this.gameOver)return{success:false,reason:'棋局已经结束'};
    const color=this.currentPlayer;this.moveHistory.push({pass:true,color});this.currentPlayer=color==='black'?'white':'black';
    this.lastMove=null;this.moveNumber++;this.passes++;
    if(this.passes>=2){this.gameOver=true;return{success:true,gameOver:true,score:this.calculateScore()};}
    return{success:true};
  }
  getLegalMoves(){
    const moves=[];for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++)if(this.canPlay(x,y))moves.push({x,y});return moves;
  }
  getTerritoryRegion(sx,sy,visited){
    const points=[],borders=new Set(),stack=[[sx,sy]];visited.add(`${sx},${sy}`);
    while(stack.length){
      const[x,y]=stack.pop();points.push([x,y]);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!this.onBoard(nx,ny))continue;
        const stone=this.board[ny][nx];if(stone)borders.add(stone);else if(!visited.has(k)){visited.add(k);stack.push([nx,ny]);}
      }
    }
    return{points,owner:borders.size===1?[...borders][0]:null};
  }
  calculateScore(){
    let black=0,white=this.komi;const visited=new Set();
    for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){
      const stone=this.board[y][x];if(stone==='black'){black++;continue;}if(stone==='white'){white++;continue;}
      const k=`${x},${y}`;if(visited.has(k))continue;const region=this.getTerritoryRegion(x,y,visited);
      if(region.owner==='black')black+=region.points.length;else if(region.owner==='white')white+=region.points.length;
    }
    return{black,white,winner:black>white?'black':'white',margin:Math.abs(black-white)};
  }
  moveHeuristic(move){
    let score=0;const color=this.currentPlayer,opp=color==='black'?'white':'black';
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=move.x+dx,ny=move.y+dy;if(!this.onBoard(nx,ny))continue;
      const stone=this.board[ny][nx];if(stone===opp){const g=this.getGroup(nx,ny);if(g.liberties===1)score+=80+g.group.length*20;else if(g.liberties===2)score+=12;}
      else if(stone===color){const g=this.getGroup(nx,ny);if(g.liberties===1)score+=45;else score+=5;}
    }
    const center=(this.size-1)/2;score+=Math.max(0,5-(Math.abs(move.x-center)+Math.abs(move.y-center))*.5);
    if(this.moveNumber<10&&(move.x===0||move.y===0||move.x===this.size-1||move.y===this.size-1))score-=18;
    // 排序必须可重复：随机扰动会让同一局面出现“乱下”的观感。
    return score;
  }
  clone(){
    const game=new GoGame(this.size,this.komi);game.board=this.board.map(r=>r.slice());game.currentPlayer=this.currentPlayer;
    game.captures={...this.captures};game.passes=this.passes;game.gameOver=this.gameOver;game.moveNumber=this.moveNumber;
    game.lastMove=this.lastMove?{...this.lastMove}:null;game.boardHistory=new Set([game.getBoardHash()]);return game;
  }
  toState(){return{size:this.size,komi:this.komi,board:this.board,currentPlayer:this.currentPlayer,moveNumber:this.moveNumber,captures:this.captures,lastMove:this.lastMove,passes:this.passes,gameOver:this.gameOver,moveHistory:this.moveHistory,boardHistory:[...this.boardHistory]};}
  static fromState(state){
    const game=new GoGame(state.size,state.komi);game.board=state.board;game.currentPlayer=state.currentPlayer;game.moveNumber=state.moveNumber||0;
    game.captures=state.captures||{black:0,white:0};game.lastMove=state.lastMove||null;game.passes=state.passes||0;game.gameOver=!!state.gameOver;game.moveHistory=state.moveHistory||[];
    game.boardHistory=new Set(state.boardHistory||[game.getBoardHash()]);return game;
  }
}

const FB_EMPTY=0,FB_BLACK=1,FB_WHITE=-1;
class FastBoard{
  constructor(size){this.S=size;this.N=size*size;this.b=new Int8Array(this.N);this.turn=FB_BLACK;this.koPoint=-1;this.passes=0;this.over=false;this.visited=new Uint8Array(this.N);this.stack=new Int32Array(this.N);this.group=new Int32Array(this.N);}
  static fromGame(game){const f=new FastBoard(game.size);for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++)f.b[y*game.size+x]=game.board[y][x]==='black'?1:game.board[y][x]==='white'?-1:0;f.turn=game.currentPlayer==='black'?1:-1;f.passes=game.passes;f.over=game.gameOver;return f;}
  clone(){const f=new FastBoard(this.S);f.b.set(this.b);f.turn=this.turn;f.koPoint=this.koPoint;f.passes=this.passes;f.over=this.over;return f;}
  adj(i,out){let n=0,x=i%this.S,y=(i-x)/this.S;if(x>0)out[n++]=i-1;if(x<this.S-1)out[n++]=i+1;if(y>0)out[n++]=i-this.S;if(y<this.S-1)out[n++]=i+this.S;return n;}
  groupLibs(i){
    const color=this.b[i];if(!color)return 4;this.visited.fill(0);let sp=0,gLen=0,libs=0;this.stack[sp++]=i;this.visited[i]=1;
    const neighbors=new Int32Array(4);
    while(sp){const cur=this.stack[--sp];this.group[gLen++]=cur;const count=this.adj(cur,neighbors);for(let j=0;j<count;j++){const nb=neighbors[j];if(this.visited[nb])continue;this.visited[nb]=1;if(this.b[nb]===0)libs++;else if(this.b[nb]===color)this.stack[sp++]=nb;}}
    this.groupLen=gLen;return libs;
  }
  capturePotential(i){
    if(this.b[i]!==0||i===this.koPoint)return-1;const neighbors=new Int32Array(4),count=this.adj(i,neighbors);let value=0;
    for(let j=0;j<count;j++){const nb=neighbors[j];if(this.b[nb]===-this.turn&&this.groupLibs(nb)===1)value+=this.groupLen;else if(this.b[nb]===this.turn&&this.groupLibs(nb)===1)value+=.3;}
    return value;
  }
  tryPlay(i){
    if(this.b[i]!==0||i===this.koPoint)return false;const me=this.turn,opp=-me,neighbors=new Int32Array(4),count=this.adj(i,neighbors);this.b[i]=me;
    let captured=0,single=-1;for(let j=0;j<count;j++){const nb=neighbors[j];if(this.b[nb]!==opp)continue;if(this.groupLibs(nb)===0){const len=this.groupLen;if(len===1)single=this.group[0];for(let k=0;k<len;k++)this.b[this.group[k]]=0;captured+=len;}}
    if(captured===0&&this.groupLibs(i)===0){this.b[i]=0;return false;}this.koPoint=captured===1?single:-1;this.passes=0;this.turn=opp;return true;
  }
  pass(){this.passes++;if(this.passes>=2)this.over=true;this.turn=-this.turn;this.koPoint=-1;}
  emptyIndices(out){let n=0;for(let i=0;i<this.N;i++)if(this.b[i]===0)out[n++]=i;return n;}
  score(komi=7.5){
    let black=0,white=komi;this.visited.fill(0);const neighbors=new Int32Array(4);
    for(let i=0;i<this.N;i++){
      if(this.b[i]===1){black++;continue;}if(this.b[i]===-1){white++;continue;}if(this.visited[i])continue;
      let sp=0,size=0,touchB=false,touchW=false;this.stack[sp++]=i;this.visited[i]=1;
      while(sp){const cur=this.stack[--sp];size++;const count=this.adj(cur,neighbors);for(let j=0;j<count;j++){const nb=neighbors[j],stone=this.b[nb];if(stone===0&&!this.visited[nb]){this.visited[nb]=1;this.stack[sp++]=nb;}else if(stone===1)touchB=true;else if(stone===-1)touchW=true;}}
      if(touchB&&!touchW)black+=size;else if(touchW&&!touchB)white+=size;
    }
    return black>white?FB_BLACK:FB_WHITE;
  }
}

class MCTSNode{
  constructor(game,move=null,parent=null){this.game=game;this.move=move;this.parent=parent;this.children=[];this.wins=0;this.visits=0;this.untried=null;this.playerJustMoved=game.currentPlayer==='black'?'white':'black';}
  moves(){
    if(this.untried)return this.untried;
    this.untried=this.game.getLegalMoves().sort((a,b)=>this.game.moveHeuristic(a)-this.game.moveHeuristic(b));
    if(this.game.moveNumber>this.game.size*this.game.size*.55)this.untried.unshift({pass:true});return this.untried;
  }
  fullyExpanded(){return this.moves().length===0;}
  bestChild(c=1.32){let best=null,value=-Infinity;for(const child of this.children){const score=child.visits?child.wins/child.visits+c*Math.sqrt(Math.log(this.visits+1)/child.visits):Infinity;if(score>value){value=score;best=child;}}return best;}
  expand(){const move=this.moves().pop(),game=this.game.clone();if(move.pass)game.pass();else game.play(move.x,move.y);const child=new MCTSNode(game,move,this);this.children.push(child);return child;}
  mostVisited(){return this.children.reduce((best,c)=>!best||c.visits>best.visits?c:best,null);}
}

class GoMCTS{
  constructor(playouts=3500,cancelled=()=>false){this.playouts=playouts;this.cancelled=cancelled;}
  rankedMoves(game,limit){
    return game.getLegalMoves().map(move=>({move,score:game.moveHeuristic(move)}))
      .sort((a,b)=>b.score-a.score||a.move.y-b.move.y||a.move.x-b.move.x).slice(0,limit);
  }
  evaluate(game,color){
    const opponent=color==='black'?'white':'black',seen=new Set();let value=(game.captures[color]-game.captures[opponent])*24;
    for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
      const stone=game.board[y][x],id=`${x},${y}`;if(!stone||seen.has(id))continue;
      const group=game.getGroup(x,y);group.group.forEach(([gx,gy])=>seen.add(`${gx},${gy}`));
      const sign=stone===color?1:-1;
      value+=sign*group.group.length*2;
      if(group.liberties===1)value+=sign*90*group.group.length;
      else if(group.liberties===2)value+=sign*16*group.group.length;
    }
    return value;
  }
  tacticalSearch(game){
    const color=game.currentPlayer,span=this.playouts>=5000?18:12,replies=this.playouts>=5000?14:9;
    let best=null,bestScore=-Infinity;
    for(const {move} of this.rankedMoves(game,span)){
      const after=game.clone();after.play(move.x,move.y);let score=this.evaluate(after,color);
      // 假定对手会选择最有力的反击，而不是随机应手。
      for(const {move:reply} of this.rankedMoves(after,replies)){
        const response=after.clone();response.play(reply.x,reply.y);
        score=Math.min(score,this.evaluate(response,color));
      }
      if(score>bestScore){bestScore=score;best=move;}
    }
    return best;
  }
  async search(game){
    // 先处理无需蒙特卡洛也能确定的强制手：提子、补被打吃的棋。
    // 这既更像正常对弈，也不会让随机模拟掩盖眼前的一口气。
    const forcing=game.getLegalMoves().map(move=>({move,score:game.moveHeuristic(move)})).sort((a,b)=>b.score-a.score||a.move.y-b.move.y||a.move.x-b.move.x)[0];
    if(forcing&&forcing.score>=45)return forcing.move;
    const tactical=this.tacticalSearch(game);
    if(tactical)return tactical;
    const root=new MCTSNode(game.clone()),empty=new Int32Array(game.size*game.size),batch=80;
    for(let done=0;done<this.playouts;done+=batch){
      if(this.cancelled())return null;const end=Math.min(done+batch,this.playouts);
      for(let i=done;i<end;i++){
        let node=root;while(node.fullyExpanded()&&node.children.length&&!node.game.gameOver)node=node.bestChild();
        if(!node.game.gameOver&&!node.fullyExpanded())node=node.expand();
        const winner=this.rollout(FastBoard.fromGame(node.game),empty);
        while(node){node.visits++;if((winner===FB_BLACK?'black':'white')===node.playerJustMoved)node.wins++;node=node.parent;}
      }
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    return root.mostVisited()?.move||{pass:true};
  }
  rollout(board,empty){
    const max=board.N*2;let moves=0;
    while(!board.over&&moves<max){
      const count=board.emptyIndices(empty);if(!count){board.pass();moves++;continue;}
      let best=-1,bestValue=0;
      for(let sample=0;sample<Math.min(count,18);sample++){const idx=empty[Math.floor(Math.random()*count)],value=board.capturePotential(idx);if(value>bestValue){bestValue=value;best=idx;}}
      let played=best>=0&&board.tryPlay(best);
      for(let a=0;!played&&a<count;a++){const pick=a+Math.floor(Math.random()*(count-a)),idx=empty[pick];empty[pick]=empty[a];empty[a]=idx;const x=idx%board.S,y=(idx-x)/board.S;
        let friendly=0,neighbors=0;if(x>0){neighbors++;if(board.b[idx-1]===board.turn)friendly++;}if(x<board.S-1){neighbors++;if(board.b[idx+1]===board.turn)friendly++;}if(y>0){neighbors++;if(board.b[idx-board.S]===board.turn)friendly++;}if(y<board.S-1){neighbors++;if(board.b[idx+board.S]===board.turn)friendly++;}
        if(friendly===neighbors&&neighbors>=3)continue;played=board.tryPlay(idx);
      }
      if(!played)board.pass();moves++;
    }
    return board.score();
  }
}

if(typeof window!=='undefined')window.QiqiGoEngine={GoGame,FastBoard,GoMCTS};

if(typeof document!=='undefined')(()=>{
  const $=id=>document.getElementById(id),boardEl=$('board'),message=$('message');
  let mode='puzzle',game=null,thinking=false,searchToken=0;
  let gnuGoWorker=null,gnuGoRequestId=0;
  let soundOn=localStorage.getItem('yuyu-go-sound')!=='off',audio=null;
  const savedKey='yuyu-go-ai-game-v2';
  function audioContext(){if(!soundOn)return null;const AudioClass=window.AudioContext||window.webkitAudioContext;if(!AudioClass)return null;if(!audio)audio=new AudioClass();if(audio.state==='suspended')audio.resume();return audio;}
  function beep(freq,start,duration,type='sine',volume=.045){const a=audioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,a.currentTime+start);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+start+duration);o.connect(g).connect(a.destination);o.start(a.currentTime+start);o.stop(a.currentTime+start+duration);}
  function sound(kind){if(kind==='capture'){beep(190,0,.1,'square',.06);beep(125,.06,.14,'triangle',.04);}else if(kind==='finish'){[440,554,659,880].forEach((f,i)=>beep(f,i*.09,.18));}else{beep(500,0,.055,'triangle');beep(360,.045,.07,'triangle',.035);}}
  function updateSound(){$('go-sound-toggle').textContent=soundOn?'🔊 声音开':'🔇 声音关';$('go-sound-toggle').setAttribute('aria-pressed',String(soundOn));}
  function save(){if(game)localStorage.setItem(savedKey,JSON.stringify(game.toState()));}
  function load(size){try{const state=JSON.parse(localStorage.getItem(savedKey)||'null');return state&&state.size===size?GoGame.fromState(state):null;}catch{return null;}}
  function coord(x,y){const letters='ABCDEFGHJKLMNOPQRST';return`${letters[x]}${game.size-y}`;}
  function gnuGoMove(){
    if(game.moveHistory.some(move=>move.pass))return Promise.resolve(null);
    if(!gnuGoWorker)gnuGoWorker=new Worker('gnugo-worker.js');
    return new Promise((resolve,reject)=>{
      const id=++gnuGoRequestId;
      const receive=event=>{
        if(event.data.id!==id)return;
        gnuGoWorker.removeEventListener('message',receive);
        if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.move);
      };
      gnuGoWorker.addEventListener('message',receive);
      gnuGoWorker.postMessage({id,size:game.size,komi:game.komi,moves:game.moveHistory});
    });
  }
  function showScore(){const score=game.calculateScore(),winner=score.winner==='black'?'语语（黑棋）':'电脑（白棋）';message.className=`message ${score.winner==='black'?'success':'error'}`;message.textContent=`终局：${winner}胜 ${score.margin.toFixed(1)} 目。黑 ${score.black.toFixed(1)}，白 ${score.white.toFixed(1)}。`;sound('finish');}
  function renderGame(){
    boardEl.innerHTML='';boardEl.classList.add('ai-board');boardEl.classList.toggle('large-board',game.size>9);boardEl.style.gridTemplateColumns=`repeat(${game.size},1fr)`;boardEl.style.gridTemplateRows=`repeat(${game.size},1fr)`;
    window.renderCoordinates?.(game.size);
    for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
      const cell=document.createElement('button');cell.type='button';cell.className='point';const stone=game.board[y][x];
      if(stone)cell.classList.add(stone);else cell.classList.add('ai-empty');if(thinking)cell.classList.add('ai-thinking');
      const stars=game.size===9?[[2,2],[6,2],[4,4],[2,6],[6,6]]:[[3,3],[9,3],[6,6],[3,9],[9,9]];
      if(!stone&&stars.some(([sx,sy])=>sx===x&&sy===y)){const hoshi=document.createElement('span');hoshi.className='hoshi';cell.append(hoshi);}
      if(game.lastMove?.x===x&&game.lastMove?.y===y)cell.classList.add(game.lastMove.color==='white'?'last-ai':'last-human');
      cell.setAttribute('aria-label',stone?`${stone==='black'?'黑':'白'}棋 ${coord(x,y)}`:`在 ${coord(x,y)} 落子`);cell.addEventListener('click',()=>humanMove(x,y));boardEl.append(cell);
    }
    const last=game.lastMove?`${game.lastMove.color==='white'?'电脑':'语语'}刚下在 ${coord(game.lastMove.x,game.lastMove.y)}`:'尚未落子';
    $('ai-game-info').textContent=`黑提子 ${game.captures.black} · 白提子 ${game.captures.white} · ${last}`;
    $('level-tag').textContent=`人机对弈 · ${game.size} 路棋盘`;$('problem-title').textContent=game.gameOver?'本局结束':thinking?'电脑正在思考…':'语语执黑棋';
    $('problem-text').textContent='红色圆点标出刚才的一手；双方连续停一手后数目。';$('tip-text').textContent='电脑使用 GNU Go 增强引擎，会综合判断布局、攻防、死活、连接、断点和地盘。';$('source-note').textContent='GNU Go 浏览器增强引擎；首次进入人机模式时按需加载。';
  }
  async function computerMove(){
    if(mode!=='ai'||game.gameOver||game.currentPlayer!=='white')return;thinking=true;const token=++searchToken;message.className='message';message.textContent=gnuGoWorker?'增强引擎正在计算…':'首次加载增强引擎，请稍等…';renderGame();
    let move=null;
    try{move=await gnuGoMove();}
    catch(error){console.warn(error);}
    if(!move){const ai=new GoMCTS(game.size===13?3250:5000,()=>token!==searchToken||mode!=='ai');move=await ai.search(game);}
    if(token!==searchToken||mode!=='ai'||!move)return;thinking=false;
    if(move.pass){const result=game.pass();message.textContent='电脑选择停一手。';if(result.gameOver){save();renderGame();showScore();return;}}
    else{const result=game.play(move.x,move.y);sound(result.captured?'capture':'move');message.className='message';message.textContent=`电脑下在 ${coord(move.x,move.y)}${result.captured?`，提掉 ${result.captured} 子`:''}。轮到语语。`;}
    save();renderGame();
  }
  function humanMove(x,y){
    if(mode!=='ai'||thinking||game.gameOver||game.currentPlayer!=='black')return;const result=game.play(x,y);
    if(!result.success){message.className='message error';message.textContent=result.reason;return;}
    sound(result.captured?'capture':'move');message.className='message';message.textContent=`语语下在 ${coord(x,y)}${result.captured?`，提掉 ${result.captured} 子`:''}。`;save();renderGame();setTimeout(computerMove,160);
  }
  function newGame(restore=false){searchToken++;thinking=false;const size=Number($('go-board-size').value);game=restore?load(size):null;if(!game)game=new GoGame(size,7.5);save();message.className='message';message.textContent=game.moveNumber?'已恢复上次的人机对局。':'语语执黑棋先走。';renderGame();if(game.currentPlayer==='white'&&!game.gameOver)setTimeout(computerMove,160);}
  function setMode(next){
    mode=next;searchToken++;thinking=false;$('puzzle-mode').classList.toggle('active',next==='puzzle');$('ai-mode').classList.toggle('active',next==='ai');
    for(const id of['progress-card','puzzle-actions','reset-progress'])$(id).classList.toggle('hidden',next==='ai');
    for(const id of['ai-actions','ai-game-info'])$(id).classList.toggle('hidden',next==='puzzle');
    if(next==='ai')newGame(true);else{boardEl.classList.remove('ai-board');$('source-note').classList.remove('hidden');window.renderPuzzleMode();}
  }
  $('puzzle-mode').addEventListener('click',()=>setMode('puzzle'));
  $('ai-mode').addEventListener('click',()=>setMode('ai'));
  $('go-new-game').addEventListener('click',()=>{localStorage.removeItem(savedKey);newGame(false);});
  $('go-board-size').addEventListener('change',()=>{localStorage.removeItem(savedKey);newGame(false);});
  $('go-pass').addEventListener('click',()=>{if(mode!=='ai'||thinking||game.gameOver||game.currentPlayer!=='black')return;const result=game.pass();message.className='message';message.textContent='语语停一手。';save();renderGame();if(result.gameOver)showScore();else setTimeout(computerMove,160);});
  $('go-sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;localStorage.setItem('yuyu-go-sound',soundOn?'on':'off');updateSound();if(soundOn)sound('move');});
  updateSound();
})();
