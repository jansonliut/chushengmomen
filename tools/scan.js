import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
export const DEFAULT_DEMO_PATH = path.join(ROOT_DIR, 'source', 'demo-mobile.html');
export const DEFAULT_BASELINE_PATH = path.join(ROOT_DIR, 'tests', 'samples', 'demo-baseline.json');

class StubClassList {
  constructor(owner, initial = '') {
    this._owner = owner;
    this._set = new Set(String(initial).split(/\s+/).filter(Boolean));
  }
  add(...tokens) {
    for (const t of tokens) if (t) this._set.add(t);
    this._sync();
  }
  remove(...tokens) {
    for (const t of tokens) this._set.delete(t);
    this._sync();
  }
  toggle(token, force) {
    if (force === undefined) {
      if (this._set.has(token)) {
        this._set.delete(token);
        this._sync();
        return false;
      }
      this._set.add(token);
      this._sync();
      return true;
    }
    if (force) {
      this._set.add(token);
      this._sync();
      return true;
    }
    this._set.delete(token);
    this._sync();
    return false;
  }
  contains(token) {
    return this._set.has(token);
  }
  _sync() {
    this._owner._className = [...this._set].join(' ');
  }
  _replaceAll(str) {
    this._set = new Set(String(str).split(/\s+/).filter(Boolean));
    this._owner._className = [...this._set].join(' ');
  }
}

class StubElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this._className = '';
    this.classList = new StubClassList(this);
    this.textContent = '';
    this._innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.scrollTop = 0;
    this.offsetWidth = 0;
    this.width = 1280;
    this.height = 800;
    this._children = [];
    this._listeners = new Map();
  }
  get className() {
    return this._className;
  }
  set className(val) {
    this.classList._replaceAll(val || '');
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(html) {
    this._innerHTML = String(html ?? '');
    if (this.id === 'storyViewport' || this.id === 'actionDeck' || this.id === 'inheritGrid') {
      this._children = parseStubChildren(this._innerHTML);
    } else {
      this._children = [];
    }
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  click() {
    const fns = this._listeners.get('click') || [];
    for (const fn of fns) fn({ currentTarget: this, target: this });
  }
  appendChild(child) {
    this._children.push(child);
    return child;
  }
  remove() {
    this._removed = true;
  }
  getContext(kind) {
    if (kind === '2d') {
      return {
        clearRect() {},
        beginPath() {},
        arc() {},
        fill() {}
      };
    }
    return null;
  }
  querySelectorAll(selector) {
    return queryInList(this._children, selector);
  }
}

function parseStubChildren(html) {
  const children = [];
  if (!html) return children;

  const clueRe = /<span\b([^>]*\bdata-clue=["']([^"']+)["'][^>]*)>/gi;
  let m;
  while ((m = clueRe.exec(html)) !== null) {
    const attrs = m[1];
    const el = new StubElement('span');
    const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    if (clsMatch) el.className = clsMatch[1];
    el.dataset.clue = m[2];
    children.push(el);
  }

  const btnRe = /<button\b([^>]*\bdata-cidx=["'](\d+)["'][^>]*)>/gi;
  while ((m = btnRe.exec(html)) !== null) {
    const attrs = m[1];
    const el = new StubElement('button');
    const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    if (clsMatch) el.className = clsMatch[1];
    el.dataset.cidx = m[2];
    el.disabled = /\bdisabled\b/i.test(attrs);
    children.push(el);
  }

  const inheritRe = /<div\b([^>]*\bdata-type=["']([^"']+)["'][^>]*)>/gi;
  while ((m = inheritRe.exec(html)) !== null) {
    const attrs = m[1];
    const el = new StubElement('div');
    const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    if (clsMatch) el.className = clsMatch[1];
    el.dataset.type = m[2];
    children.push(el);
  }

  return children;
}

function queryInList(list, selector) {
  if (selector === '.kw-clue') {
    return list.filter(el => el.classList.contains('kw-clue'));
  }
  const clueAttrMatch = selector.match(/^\.kw-clue\[data-clue="([^"]+)"\]$/);
  if (clueAttrMatch) {
    return list.filter(el => el.classList.contains('kw-clue') && el.dataset.clue === clueAttrMatch[1]);
  }
  if (selector === 'button[data-cidx]') {
    return list.filter(el => el.tagName === 'BUTTON' && el.dataset.cidx !== undefined);
  }
  if (selector === '.inherit-card') {
    return list.filter(el => el.classList.contains('inherit-card'));
  }
  return [];
}

function extractInlineScript(html) {
  const scripts = [...html.matchAll(/<script(?:\s+([^>]*))?>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (m[2].includes('const SCENES')) return m[2];
  }
  throw new Error('未在 HTML 中找到包含 SCENES 的内联脚本');
}

export function createDemoSandbox(htmlPath = DEFAULT_DEMO_PATH, mutator = null) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptCode = extractInlineScript(html);

  const storageMap = new Map();
  const elementsById = new Map();
  const pendingTimers = [];
  let nextTimerId = 1;
  let timerSeq = 0;

  const getOrCreateEl = (id) => {
    if (!elementsById.has(id)) {
      elementsById.set(id, new StubElement('div', id));
    }
    return elementsById.get(id);
  };

  const documentStub = {
    getElementById: getOrCreateEl,
    createElement: (tag) => new StubElement(tag),
    querySelectorAll(selector) {
      const results = [];
      for (const el of elementsById.values()) {
        results.push(...queryInList(el._children, selector));
      }
      return results;
    }
  };

  const localStorageStub = {
    getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
    setItem(k, v) { storageMap.set(String(k), String(v)); },
    removeItem(k) { storageMap.delete(String(k)); },
    clear() { storageMap.clear(); }
  };

  const sandbox = {
    console,
    Math,
    Object,
    Array,
    Number,
    String,
    Boolean,
    JSON,
    Set,
    Map,
    Error,
    document: documentStub,
    localStorage: localStorageStub,
    requestAnimationFrame: () => 0,
    setTimeout(fn, delay = 0) {
      const id = nextTimerId++;
      pendingTimers.push({ id, fn, delay: Number(delay) || 0, seq: timerSeq++ });
      return id;
    },
    clearTimeout(id) {
      const idx = pendingTimers.findIndex(t => t.id === id);
      if (idx >= 0) pendingTimers.splice(idx, 1);
    }
  };

  sandbox.window = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener() {},
    onload: null,
    localStorage: localStorageStub,
    document: documentStub
  };
  sandbox.self = sandbox.window;
  sandbox.globalThis = sandbox;

  const flushTimers = (maxSteps = 500) => {
    let steps = 0;
    while (pendingTimers.length > 0) {
      if (steps++ >= maxSteps) {
        throw new Error(`定时器执行超过上限 (${maxSteps})`);
      }
      pendingTimers.sort((a, b) => (a.delay - b.delay) || (a.seq - b.seq));
      const item = pendingTimers.shift();
      if (typeof item.fn === 'function') item.fn();
    }
  };

  vm.createContext(sandbox);
  const wrapped = `${scriptCode}\nglobalThis.__DEMO_EXPORTS__ = { REALM_NAMES, TALENTS_DB, ITEMS_DB, TECHNIQUES_DB, CLUES_DB, NPCS_DB, ENDINGS_DB, SAVE_KEY, DEFAULT_META, Game, SCENES, UI, SoundFX, InkCanvas };`;
  vm.runInContext(wrapped, sandbox, { filename: path.basename(htmlPath) });

  const exports = sandbox.__DEMO_EXPORTS__;
  if (typeof sandbox.window.onload === 'function') {
    sandbox.window.onload();
    flushTimers();
  }

  if (typeof mutator === 'function') {
    mutator(exports, { sandbox, document: documentStub, localStorage: localStorageStub, flushTimers });
  }

  return {
    exports,
    document: documentStub,
    localStorage: localStorageStub,
    flushTimers
  };
}

function fastCloneMeta(meta) {
  return {
    pagesLeft: meta.pagesLeft,
    cycle: meta.cycle,
    talents: [...meta.talents],
    items: [...meta.items],
    techniques: [...meta.techniques],
    maxRealm: meta.maxRealm,
    clues: [...meta.clues],
    endings: { ...meta.endings },
    endingCounts: { ...meta.endingCounts },
    burnedHints: [...meta.burnedHints],
    clearedNodes: [...meta.clearedNodes],
    npcData: {
      yusuzhen: { ...meta.npcData.yusuzhen },
      liuxin: { ...meta.npcData.liuxin },
      chenxinan: { ...meta.npcData.chenxinan }
    },
    trueEndingUnlocked: !!meta.trueEndingUnlocked
  };
}

function fastCloneRun(run) {
  return {
    node: run.node,
    realm: run.realm,
    hasDisease: !!run.hasDisease,
    isStealth: !!run.isStealth,
    runPeakRealm: run.runPeakRealm,
    runItems: [...run.runItems],
    flags: { ...run.flags }
  };
}

function applyState(exports, state) {
  const { Game } = exports;
  Game.meta = {
    pagesLeft: state.pagesLeft ?? 100,
    cycle: state.cycle ?? 1,
    talents: [...(state.talents || [])],
    items: [...(state.items || [])],
    techniques: [...(state.techniques || [])],
    maxRealm: state.maxRealm ?? 0,
    clues: [...(state.clues || [])],
    endings: state.endings ? { ...state.endings } : {},
    endingCounts: state.endingCounts ? { ...state.endingCounts } : {},
    burnedHints: [...(state.burnedHints || [])],
    clearedNodes: [...(state.clearedNodes || [])],
    npcData: {
      yusuzhen: { caibu: 0, alert: 15, met: false, sealed: false, ...(state.npcData?.yusuzhen || {}) },
      liuxin: { caibu: 0, alert: 20, met: false, enslaved: false, ...(state.npcData?.liuxin || {}) },
      chenxinan: { caibu: 0, alert: 0, met: false, shattered: false, ...(state.npcData?.chenxinan || {}) }
    },
    trueEndingUnlocked: !!state.trueEndingUnlocked
  };
  Game.run = {
    node: state.node || 'act1_plaza',
    realm: state.realm ?? 0,
    hasDisease: state.hasDisease !== undefined ? !!state.hasDisease : true,
    isStealth: !!state.isStealth,
    runPeakRealm: state.runPeakRealm ?? (state.realm ?? 0),
    runItems: [...(state.runItems || [])],
    flags: state.flags ? { ...state.flags } : {}
  };
  Game.pendingDeath = null;
  Game.selectedInherit = null;
  Game.deductionPicks = [...(state.deductionPicks || [])];
  Game.dualSurface = state.dualSurface ?? 0;
  Game.dualInner = state.dualInner ?? 0;
}

/**
 * 第一部分：全状态组合矩阵扫描（覆盖 15 个场景 × 8,192 种状态排列）
 */
export function runMatrixScan(htmlPath = DEFAULT_DEMO_PATH, mutator = null) {
  const { exports, flushTimers } = createDemoSandbox(htmlPath, mutator);
  const { Game, SCENES, ENDINGS_DB } = exports;
  const sceneIds = Object.keys(SCENES);

  const talentChoices = [[], ['shuangxiu']];
  const itemChoices = [
    [],
    ['xiantian_qi'],
    ['xueyang_jianwan'],
    ['xiantian_qi', 'xueyang_jianwan']
  ];
  const techChoices = [
    [],
    ['lianqi_jue'],
    ['shasheng_zhou'],
    ['lianqi_jue', 'shasheng_zhou']
  ];
  const keyClues = ['hualiu', 'yusuzhen_death', 'daoshu_heal', 'liuxin_trap'];
  const clueChoices = [];
  for (let mask = 0; mask < (1 << keyClues.length); mask++) {
    const arr = [];
    for (let i = 0; i < keyClues.length; i++) {
      if (mask & (1 << i)) arr.push(keyClues[i]);
    }
    clueChoices.push(arr);
  }
  const realmChoices = [0, 1, 4, 7];
  const stealthChoices = [false, true];
  const loanChoices = [false, true];

  const states = [];
  for (const talents of talentChoices) {
    for (const items of itemChoices) {
      for (const techniques of techChoices) {
        for (const clues of clueChoices) {
          for (const realm of realmChoices) {
            for (const isStealth of stealthChoices) {
              for (const tookLoans of loanChoices) {
                states.push({
                  talents,
                  items,
                  techniques,
                  clues,
                  realm,
                  isStealth,
                  flags: { tookLoans }
                });
              }
            }
          }
        }
      }
    }
  }

  const exceptions = [];
  const deadEnds = [];
  const invalidTargets = [];
  const matrixReachedEndings = new Set();
  const matrixReachedScenes = new Set();
  const actionSignatureCache = new Set();
  let evaluations = 0;
  let actionExecutions = 0;

  for (const sceneId of sceneIds) {
    const scene = SCENES[sceneId];
    for (let sIdx = 0; sIdx < states.length; sIdx++) {
      const st = states[sIdx];
      evaluations++;
      try {
        applyState(exports, { ...st, node: sceneId });
        const paraHtml = scene.paragraphs();
        if (typeof paraHtml !== 'string' || !paraHtml.trim()) {
          exceptions.push({ sceneId, stateIndex: sIdx, error: 'paragraphs() 返回空内容' });
        }
        if (typeof scene.customWidget === 'function') {
          const widgetHtml = scene.customWidget();
          if (typeof widgetHtml !== 'string') {
            exceptions.push({ sceneId, stateIndex: sIdx, error: 'customWidget() 未返回字符串' });
          }
        }

        const choices = scene.choices();
        if (!Array.isArray(choices)) {
          exceptions.push({ sceneId, stateIndex: sIdx, error: 'choices() 未返回数组' });
          continue;
        }
        const enabled = choices.filter(c => c && !c.disabled);
        if (enabled.length === 0) {
          deadEnds.push({ sceneId, state: st });
          continue;
        }

        // 按影响 action 跳转结果的语义签名去重执行全部可用选项（保持所有分支判定组合均实测）
        for (let cIdx = 0; cIdx < choices.length; cIdx++) {
          const ch = choices[cIdx];
          if (!ch || ch.disabled) continue;
          const sig = `${sceneId}#${cIdx}:${ch.label}:${st.realm > 0}:${st.isStealth}:${st.talents.join(',')}:${st.items.join(',')}:${st.techniques.join(',')}:${st.flags.tookLoans}`;
          if (actionSignatureCache.has(sig)) continue;
          actionSignatureCache.add(sig);

          applyState(exports, { ...st, node: sceneId });
          actionExecutions++;
          ch.action();
          flushTimers();

          if (Game.pendingDeath) {
            if (!ENDINGS_DB[Game.pendingDeath]) {
              invalidTargets.push({ sceneId, choice: ch.label, target: `death:${Game.pendingDeath}` });
            } else {
              matrixReachedEndings.add(Game.pendingDeath);
            }
          } else {
            if (!SCENES[Game.run.node]) {
              invalidTargets.push({ sceneId, choice: ch.label, target: `scene:${Game.run.node}` });
            } else {
              matrixReachedScenes.add(Game.run.node);
              if (Game.meta.endings['NE_INNER']) matrixReachedEndings.add('NE_INNER');
              if (Game.meta.endings['TE_CH1']) matrixReachedEndings.add('TE_CH1');
            }
          }
        }
      } catch (err) {
        exceptions.push({
          sceneId,
          stateIndex: sIdx,
          error: err && err.stack ? err.stack : String(err)
        });
      }
    }
  }

  return {
    sceneCount: sceneIds.length,
    stateCombinations: states.length,
    evaluations,
    actionExecutions,
    exceptions,
    deadEnds,
    invalidTargets,
    matrixReachedScenes: [...matrixReachedScenes].sort(),
    matrixReachedEndings: [...matrixReachedEndings].sort()
  };
}

/**
 * 第二部分：百世书跨周目全流程 BFS 可达性扫描
 * 真实从第 1 世出发，经由页面点击线索/选项/推演/快捷神通 + 死亡四选一继承重开，区分首周目与多周目可达集合
 */
export function runMultiCycleBfs(htmlPath = DEFAULT_DEMO_PATH, mutator = null) {
  const { exports, document, localStorage, flushTimers } = createDemoSandbox(htmlPath, mutator);
  const {
    Game,
    SCENES,
    UI,
    CLUES_DB,
    ITEMS_DB,
    TECHNIQUES_DB,
    TALENTS_DB,
    ENDINGS_DB
  } = exports;

  const allDefinedEndings = [...Object.keys(ENDINGS_DB), 'NE_INNER', 'TE_CH1'].sort();

  const snapshotOf = () => ({
    meta: fastCloneMeta(Game.meta),
    run: fastCloneRun(Game.run),
    pendingDeath: Game.pendingDeath,
    selectedInherit: Game.selectedInherit,
    deductionPicks: [...Game.deductionPicks],
    dualSurface: Game.dualSurface,
    dualInner: Game.dualInner
  });

  const restoreSnapshot = (snap) => {
    Game.meta = fastCloneMeta(snap.meta);
    Game.run = fastCloneRun(snap.run);
    Game.pendingDeath = snap.pendingDeath;
    Game.selectedInherit = snap.selectedInherit;
    Game.deductionPicks = [...snap.deductionPicks];
    Game.dualSurface = snap.dualSurface;
    Game.dualInner = snap.dualInner;
  };

  const stateKey = (snap) => JSON.stringify({
    node: snap.pendingDeath ? `DEATH:${snap.pendingDeath}` : snap.run.node,
    realm: snap.run.realm,
    runPeakRealm: snap.run.runPeakRealm,
    isStealth: !!snap.run.isStealth,
    hasDisease: !!snap.run.hasDisease,
    tookLoans: !!snap.run.flags.tookLoans,
    deductionSolved: !!snap.run.flags.deductionSolved,
    arrayPlanted: !!snap.run.flags.arrayPlanted,
    deductionPicks: [...snap.deductionPicks].sort(),
    talents: [...snap.meta.talents].sort(),
    items: [...snap.meta.items].sort(),
    techniques: [...snap.meta.techniques].sort(),
    maxRealm: snap.meta.maxRealm,
    clues: [...snap.meta.clues].sort(),
    isCycle1: snap.meta.cycle === 1
  });

  localStorage.clear();
  Game.hardReset();
  flushTimers();

  const initSnap = snapshotOf();
  const visited = new Set([stateKey(initSnap)]);
  const queue = [initSnap];

  const cycle1Scenes = new Set();
  const cycle1Endings = new Set();
  const multiCycleScenes = new Set();
  const endingMinCycle = {};
  const unlockedClues = new Set();
  const unlockedItems = new Set();
  const unlockedTechs = new Set();
  const unlockedTalents = new Set();
  const unlockedQuickJumps = new Set();
  const exceptions = [];
  const deadEnds = [];
  const invalidTargets = [];

  const recordSnapshotMetrics = (snap) => {
    const cycle = snap.meta.cycle;
    for (const c of snap.meta.clues) unlockedClues.add(c);
    for (const it of snap.meta.items) unlockedItems.add(it);
    for (const tc of snap.meta.techniques) unlockedTechs.add(tc);
    for (const tl of snap.meta.talents) unlockedTalents.add(tl);

    if (!snap.pendingDeath && snap.run && snap.run.node) {
      multiCycleScenes.add(snap.run.node);
      if (cycle === 1) cycle1Scenes.add(snap.run.node);
    }

    for (const eid of Object.keys(snap.meta.endings || {})) {
      if (snap.meta.endings[eid]) {
        if (cycle === 1) cycle1Endings.add(eid);
        if (endingMinCycle[eid] === undefined || cycle < endingMinCycle[eid]) {
          endingMinCycle[eid] = cycle;
        }
      }
    }

    restoreSnapshot(snap);
    if (Game.meta.clearedNodes.includes('act2_hehuan_reverse') && Game.hasTalent('shuangxiu')) {
      unlockedQuickJumps.add('act2_hehuan_reverse');
    }
    if (Game.meta.clearedNodes.includes('act3_butian_guide') && Game.hasTalent('shuangxiu')) {
      unlockedQuickJumps.add('act3_butian_guide');
    }
    if (Game.meta.clearedNodes.includes('inner_hub') && Game.hasMetaItem('xiantian_qi')) {
      unlockedQuickJumps.add('inner_hub');
    }
    if (Game.meta.clearedNodes.includes('act4_ambush_start') && Game.hasMetaItem('xueyang_jianwan')) {
      unlockedQuickJumps.add('act4_ambush_start');
    }
  };

  const enqueue = (snap) => {
    recordSnapshotMetrics(snap);
    const key = stateKey(snap);
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(snap);
    }
  };

  recordSnapshotMetrics(initSnap);

  let qIdx = 0;
  const MAX_VISITED = 20000;
  while (qIdx < queue.length) {
    if (visited.size > MAX_VISITED) {
      exceptions.push({ error: `BFS 状态数超出上限 (${MAX_VISITED})` });
      break;
    }

    const cur = queue[qIdx++];

    // 分支 A：若处于死亡结算弹窗状态，遍历四选一继承项并翻页重开进入下一周目
    if (cur.pendingDeath) {
      try {
        restoreSnapshot(cur);
        UI.openDeathModal(cur.pendingDeath);
        const inheritEls = document.getElementById('inheritGrid').querySelectorAll('.inherit-card');
        const enabledTypes = inheritEls
          .filter(el => !el.classList.contains('disabled'))
          .map(el => el.dataset.type);

        for (const t of enabledTypes) {
          restoreSnapshot(cur);
          UI.openDeathModal(cur.pendingDeath);
          Game.selectInheritOption(t);
          if (Game.meta.pagesLeft < 20) Game.meta.pagesLeft = 100;
          Game.confirmReincarnate();
          flushTimers();
          if (!SCENES[Game.run.node]) {
            invalidTargets.push({ from: `DEATH:${cur.pendingDeath}`, target: Game.run.node });
          } else {
            enqueue(snapshotOf());
          }
        }
      } catch (err) {
        exceptions.push({ state: `DEATH:${cur.pendingDeath}`, error: err.stack || String(err) });
      }
      continue;
    }

    // 分支 B：处于正常剧情场景中
    const sceneId = cur.run.node;
    const scene = SCENES[sceneId];
    if (!scene) {
      invalidTargets.push({ from: 'BFS', target: sceneId });
      continue;
    }

    try {
      restoreSnapshot(cur);
      UI.renderScene();
      UI.renderConsole();

      // 1. 收集当前场景正文所有未解锁高亮线索（模拟玩家逐一点亮本页所有线索词，保留“不点线索”与“收全本页线索”两条路线）
      const clueEls = document.getElementById('storyViewport').querySelectorAll('.kw-clue');
      const uncollectedClues = [...new Set(clueEls.map(el => el.dataset.clue).filter(cid => cid && !cur.meta.clues.includes(cid)))];
      if (uncollectedClues.length > 0) {
        restoreSnapshot(cur);
        UI.renderScene();
        for (const cid of uncollectedClues) {
          const targetEl = document.getElementById('storyViewport').querySelectorAll('.kw-clue').find(el => el.dataset.clue === cid);
          if (targetEl) targetEl.click();
        }
        flushTimers();
        enqueue(snapshotOf());
      }

      // 2. 灵台警兆 · 因果证伪推理（act3_cultivate）
      if (
        sceneId === 'act3_cultivate' &&
        cur.meta.clues.includes('yusuzhen_death') &&
        cur.meta.clues.includes('daoshu_heal') &&
        !cur.run.flags.deductionSolved
      ) {
        restoreSnapshot(cur);
        Game.deductionPicks = [];
        Game.toggleDeductionClue('yusuzhen_death');
        Game.toggleDeductionClue('daoshu_heal');
        Game.submitDeduction();
        flushTimers();
        enqueue(snapshotOf());
      }

      // 3. 快捷神通：敛气决
      if (cur.meta.techniques.includes('lianqi_jue') && cur.run.realm > 0) {
        restoreSnapshot(cur);
        Game.toggleStealth();
        flushTimers();
        enqueue(snapshotOf());
      }

      // 4. 快捷神通：杀生咒自爆
      if (cur.meta.techniques.includes('shasheng_zhou')) {
        restoreSnapshot(cur);
        Game.triggerSelfBoom();
        flushTimers();
        enqueue(snapshotOf());
      }

      // 5. 检查当前场景全部可用选项
      restoreSnapshot(cur);
      UI.renderScene();
      const btnEls = document.getElementById('actionDeck').querySelectorAll('button[data-cidx]');
      const enabledBtns = btnEls.filter(b => !b.disabled);
      if (enabledBtns.length === 0) {
        deadEnds.push({ sceneId, cycle: cur.meta.cycle, state: stateKey(cur) });
        continue;
      }

      for (const btn of enabledBtns) {
        const cidx = Number(btn.dataset.cidx);
        restoreSnapshot(cur);
        UI.renderScene();
        const freshBtn = document.getElementById('actionDeck').querySelectorAll('button[data-cidx]').find(b => Number(b.dataset.cidx) === cidx);
        if (!freshBtn) continue;
        freshBtn.click();
        flushTimers();

        if (Game.pendingDeath) {
          if (!ENDINGS_DB[Game.pendingDeath]) {
            invalidTargets.push({ from: sceneId, choiceIdx: cidx, target: `death:${Game.pendingDeath}` });
          } else {
            enqueue(snapshotOf());
          }
        } else {
          if (!SCENES[Game.run.node]) {
            invalidTargets.push({ from: sceneId, choiceIdx: cidx, target: `scene:${Game.run.node}` });
          } else {
            enqueue(snapshotOf());
          }
        }
      }
    } catch (err) {
      exceptions.push({ sceneId, error: err.stack || String(err) });
    }
  }

  // 验证 4 个一键托管复刻点在全解锁状态下均可直达预期场景
  const quickJumpTargets = ['act2_hehuan_reverse', 'act3_butian_guide', 'inner_hub', 'act4_ambush_start'];
  const quickJumpChecks = {};
  for (const target of quickJumpTargets) {
    applyState(exports, {
      talents: ['shuangxiu'],
      items: ['xiantian_qi', 'xueyang_jianwan'],
      techniques: ['lianqi_jue', 'shasheng_zhou'],
      maxRealm: 4,
      clues: Object.keys(CLUES_DB),
      clearedNodes: quickJumpTargets
    });
    Game.quickJump(target);
    flushTimers();
    quickJumpChecks[target] = Game.run.node;
  }

  const multiCycleEndings = Object.keys(endingMinCycle).sort();
  const unreachableEndings = allDefinedEndings.filter(id => !endingMinCycle[id]);
  const allSceneIds = Object.keys(SCENES).sort();
  const unreachableScenes = allSceneIds.filter(id => !multiCycleScenes.has(id));

  return {
    visitedStates: visited.size,
    definedScenes: allSceneIds,
    cycle1Scenes: [...cycle1Scenes].sort(),
    multiCycleScenes: [...multiCycleScenes].sort(),
    unreachableScenes,
    definedEndings: allDefinedEndings,
    cycle1Endings: [...cycle1Endings].sort(),
    multiCycleEndings,
    endingMinCycle,
    unreachableEndings,
    clues: {
      defined: Object.keys(CLUES_DB).sort(),
      unlocked: [...unlockedClues].sort()
    },
    items: {
      defined: Object.keys(ITEMS_DB).sort(),
      unlocked: [...unlockedItems].sort()
    },
    techniques: {
      defined: Object.keys(TECHNIQUES_DB).sort(),
      unlocked: [...unlockedTechs].sort()
    },
    talents: {
      defined: Object.keys(TALENTS_DB).sort(),
      unlocked: [...unlockedTalents].sort()
    },
    quickJumps: {
      unlocked: [...unlockedQuickJumps].sort(),
      landingScenes: quickJumpChecks
    },
    exceptions,
    deadEnds,
    invalidTargets
  };
}

export function runFullScan(htmlPath = DEFAULT_DEMO_PATH, mutator = null) {
  const matrix = runMatrixScan(htmlPath, mutator);
  const bfs = runMultiCycleBfs(htmlPath, mutator);

  return {
    sourceFile: path.relative(ROOT_DIR, htmlPath).replace(/\\/g, '/'),
    matrix,
    bfs,
    summary: {
      sceneCount: matrix.sceneCount,
      stateCombinations: matrix.stateCombinations,
      matrixEvaluations: matrix.evaluations,
      bfsVisitedStates: bfs.visitedStates,
      totalExceptions: matrix.exceptions.length + bfs.exceptions.length,
      totalDeadEnds: matrix.deadEnds.length + bfs.deadEnds.length,
      totalInvalidTargets: matrix.invalidTargets.length + bfs.invalidTargets.length,
      definedEndingCount: bfs.definedEndings.length,
      cycle1EndingCount: bfs.cycle1Endings.length,
      multiCycleEndingCount: bfs.multiCycleEndings.length,
      unreachableEndingCount: bfs.unreachableEndings.length
    }
  };
}

function buildBaselineSnapshot(report) {
  return {
    sourceFile: report.sourceFile,
    summary: report.summary,
    definedScenes: report.bfs.definedScenes,
    cycle1Scenes: report.bfs.cycle1Scenes,
    multiCycleScenes: report.bfs.multiCycleScenes,
    unreachableScenes: report.bfs.unreachableScenes,
    definedEndings: report.bfs.definedEndings,
    cycle1Endings: report.bfs.cycle1Endings,
    multiCycleEndings: report.bfs.multiCycleEndings,
    endingMinCycle: report.bfs.endingMinCycle,
    unreachableEndings: report.bfs.unreachableEndings,
    clues: report.bfs.clues,
    items: report.bfs.items,
    techniques: report.bfs.techniques,
    talents: report.bfs.talents,
    quickJumps: report.bfs.quickJumps
  };
}

function printChineseReport(report) {
  const { summary, bfs } = report;
  console.log('=== 《苟在初圣魔门当人材》第一章全状态通关扫描报告 ===');
  console.log(`扫描对象: ${report.sourceFile}`);
  console.log(`场景总数: ${summary.sceneCount} 个 | 矩阵状态组合: ${summary.stateCombinations} 种（共求值 ${summary.matrixEvaluations} 次）`);
  console.log(`跨周目 BFS 搜索状态数: ${summary.bfsVisitedStates} 个`);
  console.log(`异常数: ${summary.totalExceptions} | 死路数: ${summary.totalDeadEnds} | 无效出口数: ${summary.totalInvalidTargets}`);
  console.log('');
  console.log(`已定义结局总数: ${summary.definedEndingCount} 个`);
  console.log(`  - 首周目（第 1 世不重开）可达结局 (${summary.cycle1EndingCount} 个): ${bfs.cycle1Endings.join(', ')}`);
  console.log(`  - 跨周目（含百世书继承重开）可达结局 (${summary.multiCycleEndingCount} 个):`);
  for (const eid of bfs.definedEndings) {
    const minC = bfs.endingMinCycle[eid];
    console.log(`      * ${eid.padEnd(14, ' ')} -> ${minC ? `可达（最快第 ${minC} 世）` : '不可达'}`);
  }
  console.log(`  - 确实不可达结局 (${summary.unreachableEndingCount} 个): ${bfs.unreachableEndings.length ? bfs.unreachableEndings.join(', ') : '无'}`);
  console.log('');
  console.log(`全收集验证:`);
  console.log(`  - 场景可达: ${bfs.multiCycleScenes.length}/${bfs.definedScenes.length}`);
  console.log(`  - 天机线索: ${bfs.clues.unlocked.length}/${bfs.clues.defined.length}`);
  console.log(`  - 跨世宝物: ${bfs.items.unlocked.length}/${bfs.items.defined.length}`);
  console.log(`  - 记忆功法: ${bfs.techniques.unlocked.length}/${bfs.techniques.defined.length}`);
  console.log(`  - 专属天赋: ${bfs.talents.unlocked.length}/${bfs.talents.defined.length}`);
  console.log(`  - 一键复刻: ${bfs.quickJumps.unlocked.length}/4`);
}

if (path.resolve(process.argv[1] || '') === __filename) {
  const writeBaseline = process.argv.includes('--write-baseline');
  const report = runFullScan(DEFAULT_DEMO_PATH);
  printChineseReport(report);
  if (writeBaseline) {
    fs.mkdirSync(path.dirname(DEFAULT_BASELINE_PATH), { recursive: true });
    const snapshot = buildBaselineSnapshot(report);
    fs.writeFileSync(DEFAULT_BASELINE_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    console.log(`\n已写入锁定基线快照: ${path.relative(ROOT_DIR, DEFAULT_BASELINE_PATH)}`);
  }
  if (report.summary.totalExceptions > 0 || report.summary.totalDeadEnds > 0 || report.summary.totalInvalidTargets > 0) {
    process.exitCode = 1;
  }
}
