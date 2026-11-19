/**
 * 百世书文字互动手游 · 纯 JS 核心引擎（零浏览器 DOM/BOM 依赖）
 */
export const SAVE_KEY = 'baishishu_ch1_bl_save_v1';

export const DEFAULT_META = () => ({
  pagesLeft: 100,
  cycle: 1,
  talents: [],
  items: [],
  techniques: [],
  maxRealm: 0,
  clues: [],
  endings: {},
  endingCounts: {},
  burnedHints: [],
  clearedNodes: [],
  npcData: {
    yusuzhen: { caibu: 0, alert: 15, met: false, sealed: false },
    liuxin: { caibu: 0, alert: 20, met: false, enslaved: false },
    chenxinan: { caibu: 0, alert: 0, met: false, shattered: false }
  },
  trueEndingUnlocked: false,
  routes: {}
});

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); }
  };
}

/**
 * 创建独立可测的百世书游戏状态机实例。
 * @param {object} config
 * @param {object} config.data 静态词表与场景集合
 * @param {object} [config.storage] 持久化存储适配（缺省为内存存储）
 * @param {object} [config.hooks] 界面、音效与动画回调钩子
 */
export function createGameEngine({ data, storage = null, hooks = {} }) {
  const {
    REALM_NAMES = {},
    TALENTS_DB = {},
    ITEMS_DB = {},
    TECHNIQUES_DB = {},
    CLUES_DB = {},
    ENDINGS_DB = {},
    SCENES = {},
    SAVE_KEY: customSaveKey = SAVE_KEY
  } = data || {};

  const store = storage || createMemoryStorage();
  const saveKey = customSaveKey || SAVE_KEY;

  const INHERIT_HINT_MAP = {
    item: '将选中的宝物永久刻入百世书，下世开局直接持有。',
    realm: '将本世巅峰修为带回下世（注意在第一幕运转《敛气决》藏拙）。',
    life: '保留寿元余泽，增强体魄（本测试章无额外寿元关卡）。',
    talent: '放弃本世物质收获，依据前世逆天经历觉醒专属天赋。'
  };

  const Game = {
    meta: DEFAULT_META(),
    run: null,
    consoleTab: 'cards',
    mobilePane: 'story',
    pendingDeath: null,
    selectedInherit: null,
    deductionPicks: [],
    dualSurface: 0,
    dualInner: 0,

    init() {
      this.load();
      hooks.onInit?.();
      this.startNewRun(false);
    },

    load() {
      try {
        const raw = store.getItem(saveKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const defaults = DEFAULT_META();
          this.meta = Object.assign(defaults, parsed);
          this.meta.npcData = Object.assign(defaults.npcData, parsed.npcData || {});
          this.meta.routes = Object.assign({}, defaults.routes, parsed.routes || {});
        }
      } catch (e) {
        this.meta = DEFAULT_META();
      }
    },

    save() {
      try {
        store.setItem(saveKey, JSON.stringify(this.meta));
      } catch (e) {}
    },

    startNewRun(playAnim = true) {
      this.run = {
        node: 'act1_plaza',
        realm: this.meta.maxRealm,
        hasDisease: true,
        isStealth: false,
        runPeakRealm: this.meta.maxRealm,
        runItems: [],
        flags: {}
      };
      this.deductionPicks = [];
      this.dualSurface = 0;
      this.dualInner = 0;

      if (playAnim) {
        this.triggerPageFlip(() => {
          this.go('act1_plaza');
        });
      } else {
        this.go('act1_plaza');
      }
    },

    triggerPageFlip(cb, mainText = '百世书翻页，沙沙作响', subText = null) {
      hooks.onSound?.('pageFlip');
      const finalSub = subText || `第 ${this.meta.cycle} 世开启 · 残页 ${this.meta.pagesLeft}`;
      if (typeof hooks.onPageFlip === 'function') {
        hooks.onPageFlip(cb, mainText, finalSub);
      } else if (typeof cb === 'function') {
        cb();
      }
    },

    hasTalent(id) { return this.meta.talents.includes(id); },
    hasItem(id) { return this.meta.items.includes(id) || (this.run ? this.run.runItems.includes(id) : false); },
    hasMetaItem(id) { return this.meta.items.includes(id); },
    hasTech(id) { return this.meta.techniques.includes(id); },
    hasClue(id) { return this.meta.clues.includes(id); },

    unlockClue(id, silent = false) {
      if (!CLUES_DB[id]) return;
      const already = this.meta.clues.includes(id);
      if (!already) {
        this.meta.clues.push(id);
        this.save();
        if (!silent) {
          hooks.onSound?.('clue');
          hooks.onShowClueDot?.();
          hooks.onOpenClueModal?.(CLUES_DB[id], true);
        }
      } else if (!silent) {
        hooks.onSound?.('click');
        hooks.onOpenClueModal?.(CLUES_DB[id], false);
      }
      hooks.onRenderConsole?.();
      hooks.onClueCollected?.(id);
    },

    learnTech(id, silent = false) {
      if (!TECHNIQUES_DB[id]) return;
      if (!this.meta.techniques.includes(id)) {
        this.meta.techniques.push(id);
        this.save();
        if (!silent) {
          hooks.onToast?.(`📖 记忆功法【${TECHNIQUES_DB[id].name}】`, '知识不随身死消散，可永世留存！', 'gold');
        }
      }
      hooks.onRenderConsole?.();
    },

    markCleared(nodeKey) {
      if (!this.meta.clearedNodes.includes(nodeKey)) {
        this.meta.clearedNodes.push(nodeKey);
        this.save();
      }
    },

    setRealm(val) {
      this.run.realm = val;
      if (val > this.run.runPeakRealm) this.run.runPeakRealm = val;
      hooks.onRenderConsole?.();
    },

    toggleStealth() {
      if (!this.hasTech('lianqi_jue')) return;
      this.run.isStealth = !this.run.isStealth;
      hooks.onSound?.('click');
      hooks.onToast?.(
        this.run.isStealth ? '🌑 已运转《敛气决》' : '🌕 已撤去《敛气决》',
        this.run.isStealth ? '周身真气收束皮肉之下，外人视若凡胎。' : '真气不再遮掩，高阶修士一眼可察。',
        'gold'
      );
      hooks.onRenderConsole?.();
      if (this.run.node === 'act1_plaza') hooks.onRenderScene?.();
    },

    triggerSelfBoom() {
      if (!this.hasTech('shasheng_zhou')) return;
      hooks.onSound?.('death');
      hooks.onShake?.();
      hooks.onVignette?.('blood', 1200);
      hooks.onCloseMenuModal?.();
      hooks.onCloseChoiceModal?.();
      this.triggerDeath('END_SELF_BOOM');
    },

    quickJump(target) {
      hooks.onSound?.('pageFlip');
      hooks.onCloseMenuModal?.();
      hooks.onCloseChoiceModal?.();
      this.run = {
        node: 'act1_plaza',
        realm: this.meta.maxRealm,
        hasDisease: true,
        isStealth: this.hasTech('lianqi_jue') && this.meta.maxRealm > 0,
        runPeakRealm: this.meta.maxRealm,
        runItems: [],
        flags: { quickJumped: true }
      };
      if (target === 'act2_hehuan_reverse') {
        this.meta.npcData.yusuzhen.met = true;
        this.triggerPageFlip(() => this.go('act2_hehuan_reverse'), '一键托管复刻', '已自动藏拙过削峰，直抵合欢殿静室……');
      } else if (target === 'act3_butian_guide') {
        this.meta.npcData.yusuzhen.met = true;
        this.meta.npcData.liuxin.met = true;
        this.setRealm(Math.max(1, this.run.realm));
        this.triggerPageFlip(() => this.go('act3_butian_guide'), '一键托管复刻', '已自动三日反杀玉素真，直面门外等候的刘信……');
      } else if (target === 'inner_hub') {
        this.meta.npcData.yusuzhen.met = true;
        this.meta.npcData.liuxin.met = true;
        this.setRealm(Math.max(1, this.run.realm));
        this.triggerPageFlip(() => this.go('inner_hub'), '一键托管复刻', '已自动喂炁压境、让秦宇替死，低调晋升内门……');
      } else if (target === 'act4_ambush_start') {
        this.meta.npcData.yusuzhen.met = true;
        this.meta.npcData.liuxin.met = true;
        this.setRealm(Math.max(1, this.run.realm));
        this.run.flags.arrayPlanted = true;
        this.triggerPageFlip(() => this.go('act4_ambush_start'), '一键托管复刻', '已钓鱼引出刘信，于补天峰洞府门口预埋血洗天河剑阵……');
      }
    },

    go(sceneId) {
      this.run.node = sceneId;
      hooks.onCloseChoiceModal?.();
      hooks.onResetChoiceAutoPop?.();
      const scene = SCENES[sceneId];
      if (scene && typeof scene.onEnter === 'function') {
        scene.onEnter();
      }
      hooks.onRenderScene?.();
      hooks.onRenderConsole?.();
      hooks.onResetScroll?.();
    },

    chooseOption(choiceIdx) {
      const scene = SCENES[this.run?.node];
      if (!scene || typeof scene.choices !== 'function') return false;
      const choices = scene.choices();
      const ch = choices[choiceIdx];
      if (!ch || ch.disabled || typeof ch.action !== 'function') return false;
      hooks.onSound?.('click');
      ch.action();
      return true;
    },

    triggerDeath(beId) {
      const dataEnding = ENDINGS_DB[beId];
      if (!dataEnding) return;
      hooks.onSound?.('death');
      hooks.onShake?.();
      hooks.onVignette?.('blood', 1400);
      hooks.onCloseChoiceModal?.();
      hooks.onCloseMenuModal?.();

      this.meta.endings[beId] = true;
      this.meta.endingCounts[beId] = (this.meta.endingCounts[beId] || 0) + 1;
      if (dataEnding.unlockClues) {
        dataEnding.unlockClues.forEach(c => this.unlockClue(c, true));
      }
      this.save();

      this.pendingDeath = beId;
      this.selectedInherit = null;
      hooks.onOpenDeathModal?.(beId);
      hooks.onRenderConsole?.();
    },

    burnPageForHint() {
      if (!this.pendingDeath) return;
      if (this.meta.burnedHints.includes(this.pendingDeath)) return;
      if (this.meta.pagesLeft <= 1) {
        hooks.onToast?.('⚠️ 百世书残页不足', '只剩最后一页，无法再焚页问卜！', 'red');
        return;
      }
      this.meta.pagesLeft -= 1;
      this.meta.burnedHints.push(this.pendingDeath);
      this.save();
      hooks.onSound?.('clue');
      hooks.onOpenDeathModal?.(this.pendingDeath);
      hooks.onRenderConsole?.();
      hooks.onToast?.('🔥 焚页叩天机', '消耗 1 页百世书，天机直白显现！', 'gold');
    },

    selectInheritOption(type) {
      this.selectedInherit = type;
      hooks.onSound?.('click');
      const hint = INHERIT_HINT_MAP[type] || '';
      hooks.onSelectInherit?.(type, hint);
    },

    confirmReincarnate() {
      const beId = this.pendingDeath;
      const dataEnding = ENDINGS_DB[beId];
      if (!this.selectedInherit) {
        hooks.onToast?.('请先择定传承', '请点击上方四选一卡片后再翻动百世书。', 'red');
        return;
      }

      let inheritMsg = '一无所获，唯留前世记忆。';
      if (this.selectedInherit === 'item') {
        const itemKey = dataEnding.specialItem || (this.run.runItems.length ? this.run.runItems[this.run.runItems.length - 1] : null);
        if (itemKey && !this.meta.items.includes(itemKey)) {
          this.meta.items.push(itemKey);
          inheritMsg = `永久带回宝物【${ITEMS_DB[itemKey].name}】！`;
        }
      } else if (this.selectedInherit === 'realm') {
        if (this.run.runPeakRealm > this.meta.maxRealm) {
          this.meta.maxRealm = this.run.runPeakRealm;
          inheritMsg = `永久继承修为【${REALM_NAMES[this.meta.maxRealm]}】！`;
        }
      } else if (this.selectedInherit === 'talent') {
        if (dataEnding.guaranteedTalent && !this.meta.talents.includes(dataEnding.guaranteedTalent)) {
          this.meta.talents.push(dataEnding.guaranteedTalent);
          inheritMsg = `觉醒白色神技【${TALENTS_DB[dataEnding.guaranteedTalent].name}】！`;
        } else {
          inheritMsg = '前世未触发新的逆天壮举，未觉醒新天赋。';
        }
      }

      this.meta.pagesLeft -= 1;
      this.meta.cycle += 1;
      this.save();

      hooks.onCloseDeathModal?.();
      this.pendingDeath = null;

      if (this.meta.pagesLeft <= 0) {
        hooks.onOpenGameOverModal?.();
        return;
      }

      this.startNewRun(true);
      if (typeof hooks.onReincarnateToast === 'function') {
        hooks.onReincarnateToast(this.meta.cycle, inheritMsg);
      } else {
        hooks.onToast?.(`📜 第 ${this.meta.cycle} 世开启`, inheritMsg, 'gold');
      }
    },

    toggleDeductionClue(clueId) {
      hooks.onSound?.('click');
      const idx = this.deductionPicks.indexOf(clueId);
      if (idx >= 0) {
        this.deductionPicks.splice(idx, 1);
      } else {
        if (this.deductionPicks.length >= 2) this.deductionPicks.shift();
        this.deductionPicks.push(clueId);
      }
      hooks.onRenderScene?.();
    },

    submitDeduction() {
      if (this.deductionPicks.length < 2) {
        hooks.onToast?.('线索不足', '请点选【两条】互相矛盾的线索进行因果证伪。', 'red');
        return;
      }
      const ok = this.deductionPicks.includes('yusuzhen_death') && this.deductionPicks.includes('daoshu_heal');
      if (ok) {
        this.unlockClue('liuxin_trap', false);
        this.run.flags.deductionSolved = true;
        this.meta.npcData.liuxin.alert = Math.min(100, this.meta.npcData.liuxin.alert + 40);
        this.save();
        hooks.onShake?.();
        hooks.onVignette?.('blood', 900);
        this.go('act3_truth_revealed');
      } else {
        hooks.onSound?.('death');
        hooks.onToast?.('推演未果', '此两条线索并无直接矛盾。提示：对比玉素真第一世的死因与你修《先天道书》后的身体变化！', 'red');
      }
    },

    hardReset() {
      store.removeItem(saveKey);
      this.meta = DEFAULT_META();
      hooks.onCloseAllModals?.();
      this.startNewRun(true);
      hooks.onToast?.('🕯️ 百世书已重铸', '一切归零，回到第 1 世削峰广场。', 'normal');
    }
  };

  return Game;
}
