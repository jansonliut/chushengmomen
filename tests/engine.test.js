import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameEngine, DEFAULT_META, SAVE_KEY } from '../src/engine/game-engine.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); }
  };
}

function createChapter1TestFixture() {
  const REALM_NAMES = {
    0: '凡人',
    1: '链气一层',
    4: '链气四层（中期）',
    7: '链气七层（后期）'
  };
  const TALENTS_DB = {
    shuangxiu: { id: 'shuangxiu', name: '双修奇才' }
  };
  const ITEMS_DB = {
    xiantian_qi: { id: 'xiantian_qi', name: '先天真炁' },
    xueyang_jianwan: { id: 'xueyang_jianwan', name: '血阳剑丸' },
    wanling_fan: { id: 'wanling_fan', name: '先天一炁万灵幡' },
    shenfu: { id: 'shenfu', name: '先天混元一炁神符' }
  };
  const TECHNIQUES_DB = {
    yinyang_fu: { name: '《阴阳大乐赋》' },
    longhu_fu: { name: '《龙虎交媾阴阳大乐赋》' },
    xiantian_daoshu: { name: '《先天道书》' },
    lianqi_jue: { name: '《敛气决》' },
    shasheng_zhou: { name: '《杀生咒》' },
    jianzhen_tu: { name: '《血洗天河剑阵图》' }
  };
  const CLUES_DB = {
    hualiu: { id: 'hualiu', title: '花柳恶疾', tag: '内视', text: '...' },
    chenliang_death: { id: 'chenliang_death', title: '人材', tag: '血案', text: '...' },
    liuxin_identity: { id: 'liuxin_identity', title: '刘信', tag: '人物', text: '...' },
    yusuzhen_death: { id: 'yusuzhen_death', title: '玉素真病死', tag: '余波', text: '...' },
    yusuzhen_qi: { id: 'yusuzhen_qi', title: '破境之炁', tag: '双修', text: '...' },
    guyu_sword: { id: 'guyu_sword', title: '骨玉剑', tag: '魔门', text: '...' },
    daoshu_heal: { id: 'daoshu_heal', title: '十日治百病', tag: '异状', text: '...' },
    liuxin_trap: { id: 'liuxin_trap', title: '人药杀局', tag: '证伪', text: '...' },
    liuxin_array: { id: 'liuxin_array', title: '隔音幻阵', tag: '暗账', text: '...' },
    chenxinan_soul: { id: 'chenxinan_soul', title: '陈信安', tag: '绝密', text: '...' },
    yusuzhen_secret: { id: 'yusuzhen_secret', title: '养蛊名册', tag: '秘闻', text: '...' }
  };
  const ENDINGS_DB = {
    BE0: { code: 'BE0', title: '匹夫怀璧' },
    BE1: { code: 'BE1', title: '天生灵童' },
    BE2: { code: 'BE2', title: '干枯药渣' },
    BE3: { code: 'BE3', title: '顺天易，逆天难', guaranteedTalent: 'shuangxiu', unlockClues: ['yusuzhen_death'] },
    BE4: { code: 'BE4', title: '人药嫁衣', specialItem: 'xiantian_qi' },
    BE5: { code: 'BE5', title: '待宰人材', specialItem: 'xiantian_qi' },
    BE6: { code: 'BE6', title: '真传压顶', unlockClues: ['chenxinan_soul'] },
    BE7: { code: 'BE7', title: '农夫与蛇' },
    BE7b: { code: 'BE7b', title: '引狼入室' },
    END_NIUMA: { code: 'BE_牛马', title: '魔门老实人' },
    END_REFINE: { code: '坐化炼宝', title: '疯魔阵痴 · 功成坐化', specialItem: 'xueyang_jianwan' },
    END_SELF_BOOM: { code: '体面重开', title: '杀生自爆 · 老赖跑路' }
  };

  let gameRef = null;
  const SCENES = {
    act1_plaza: {
      paragraphs: () => '削峰广场',
      choices: () => {
        const list = [];
        if (gameRef.run.realm > 0 && !gameRef.run.isStealth) {
          if (gameRef.hasTech('lianqi_jue')) {
            list.push({ label: '运转敛气决', action: () => gameRef.toggleStealth() });
          } else {
            list.push({ label: '自散修为', action: () => { gameRef.run.realm = 0; } });
          }
        }
        list.push({
          label: '展露聪慧',
          action: () => (gameRef.run.realm > 0 && !gameRef.run.isStealth)
            ? gameRef.triggerDeath('BE0')
            : gameRef.triggerDeath('BE1')
        });
        list.push({
          label: '低眉顺眼',
          action: () => {
            if (gameRef.run.realm > 0 && !gameRef.run.isStealth) return gameRef.triggerDeath('BE0');
            gameRef.meta.npcData.liuxin.met = true;
            gameRef.learnTech('yinyang_fu', true);
            gameRef.go('act2_hehuan_meet');
          }
        });
        return list;
      }
    },
    act2_hehuan_meet: {
      onEnter: () => { gameRef.meta.npcData.yusuzhen.met = true; gameRef.save(); },
      paragraphs: () => '合欢殿前',
      choices: () => gameRef.hasTalent('shuangxiu')
        ? [{ label: '反客为主', action: () => gameRef.go('act2_hehuan_reverse') }]
        : [{ label: '迎战妖男', action: () => gameRef.go('act2_hehuan_drained') }]
    },
    act2_hehuan_drained: {
      paragraphs: () => '榨干成渣',
      choices: () => {
        const list = [{ label: '求饶', action: () => gameRef.triggerDeath('BE2') }];
        if (gameRef.hasClue('hualiu')) {
          list.unshift({ label: '花柳绝杀', action: () => gameRef.triggerDeath('BE3') });
        }
        return list;
      }
    },
    act2_hehuan_reverse: {
      onEnter: () => { gameRef.markCleared('act2_hehuan_reverse'); },
      paragraphs: () => '攻守逆转',
      choices: () => {
        const list = [{
          label: '突破链气一层',
          action: () => { gameRef.setRealm(Math.max(1, gameRef.run.realm)); gameRef.go('act3_butian_guide'); }
        }];
        if (gameRef.hasMetaItem('xiantian_qi')) {
          list.unshift({ label: '苟道压境', action: () => gameRef.go('act2_lay_low') });
        }
        return list;
      }
    },
    act2_lay_low: {
      onEnter: () => { gameRef.markCleared('inner_hub'); gameRef.meta.endings['NE_INNER'] = true; gameRef.save(); },
      paragraphs: () => '潜龙蛰伏',
      choices: () => [{
        label: '进内门',
        action: () => { gameRef.setRealm(Math.max(1, gameRef.run.realm)); gameRef.go('inner_hub'); }
      }]
    },
    act3_butian_guide: {
      onEnter: () => { gameRef.markCleared('act3_butian_guide'); gameRef.learnTech('xiantian_daoshu', true); },
      paragraphs: () => '补天接引',
      choices: () => {
        const list = [];
        if (gameRef.hasMetaItem('xueyang_jianwan')) {
          list.push({ label: '埋剑阵', action: () => { gameRef.run.flags.arrayPlanted = true; gameRef.go('act4_ambush_start'); } });
        }
        list.push({ label: '修先天道书', action: () => gameRef.go('act3_cultivate') });
        return list;
      }
    },
    act3_cultivate: {
      onEnter: () => { gameRef.run.hasDisease = false; gameRef.unlockClue('daoshu_heal', true); },
      paragraphs: () => '因果证伪',
      choices: () => [{ label: '开门', action: () => gameRef.triggerDeath('BE4') }]
    },
    act3_truth_revealed: {
      paragraphs: () => '人药陷阱',
      choices: () => [{ label: '偷袭', action: () => gameRef.triggerDeath('BE5') }]
    },
    inner_hub: {
      paragraphs: () => '内门筹备',
      choices: () => !gameRef.run.flags.tookLoans
        ? [{
            label: '魔门老赖流',
            action: () => {
              gameRef.run.flags.tookLoans = true;
              gameRef.setRealm(Math.max(4, gameRef.run.realm));
              gameRef.learnTech('lianqi_jue', false);
              gameRef.learnTech('shasheng_zhou', false);
              gameRef.unlockClue('liuxin_array', false);
            }
          }]
        : [{ label: '自残炼宝流', action: () => gameRef.go('inner_refine') }]
    },
    inner_refine: {
      onEnter: () => { gameRef.learnTech('jianzhen_tu', true); gameRef.setRealm(Math.max(7, gameRef.run.realm)); },
      paragraphs: () => '铸剑丸',
      choices: () => [{ label: '坐化', action: () => gameRef.triggerDeath('END_REFINE') }]
    },
    act4_ambush_start: {
      onEnter: () => { gameRef.markCleared('act4_ambush_start'); },
      paragraphs: () => '瓮中捉鳖',
      choices: () => [{ label: '引爆剑阵', action: () => gameRef.go('act4_interrogate') }]
    },
    act4_interrogate: {
      paragraphs: () => '审讯刘信',
      choices: () => [{
        label: '炼入万灵幡',
        action: () => {
          gameRef.meta.items.push('wanling_fan', 'shenfu');
          gameRef.meta.npcData.liuxin.enslaved = true;
          gameRef.save();
          gameRef.go('act4_banner_test');
        }
      }]
    },
    act4_banner_test: {
      onEnter: () => { gameRef.meta.npcData.chenxinan.met = true; gameRef.unlockClue('chenxinan_soul', true); },
      paragraphs: () => '幡中恶鬼',
      choices: () => [{ label: '拍散陈信安', action: () => gameRef.go('act4_true_ending') }]
    },
    act4_true_ending: {
      onEnter: () => {
        gameRef.meta.endings['TE_CH1'] = true;
        gameRef.meta.trueEndingUnlocked = true;
        gameRef.meta.npcData.chenxinan.shattered = true;
        gameRef.save();
      },
      paragraphs: () => '欺天窃命',
      choices: () => [{ label: '重开', action: () => gameRef.startNewRun(true) }]
    }
  };

  return {
    data: {
      REALM_NAMES,
      TALENTS_DB,
      ITEMS_DB,
      TECHNIQUES_DB,
      CLUES_DB,
      ENDINGS_DB,
      SCENES,
      SAVE_KEY
    },
    bindEngine(g) { gameRef = g; }
  };
}

test('纯引擎无 DOM：跑通四世完整破局主链路直至 TE_CH1 真结局', () => {
  assert.equal(typeof globalThis.window, 'undefined', '纯 Node 引擎测试中不应存在 window');
  assert.equal(typeof globalThis.document, 'undefined', '纯 Node 引擎测试中不应存在 document');

  const storage = createMemoryStorage();
  const fixture = createChapter1TestFixture();
  const toasts = [];
  const sounds = [];
  const clueModals = [];

  const Game = createGameEngine({
    data: fixture.data,
    storage,
    hooks: {
      onToast: (t, d, s) => toasts.push({ t, d, s }),
      onSound: (type) => sounds.push(type),
      onOpenClueModal: (clue, isNew) => clueModals.push({ id: clue.id, isNew })
    }
  });
  fixture.bindEngine(Game);
  Game.init();

  // 第 1 世：收集花柳线索 -> 合欢殿触发 BE3 -> 觉醒【双修奇才】
  assert.equal(Game.run.node, 'act1_plaza');
  Game.unlockClue('hualiu', false);
  assert.equal(clueModals.at(-1).id, 'hualiu');
  assert.equal(clueModals.at(-1).isNew, true);

  Game.chooseOption(1); // 低眉顺眼 -> act2_hehuan_meet
  assert.equal(Game.run.node, 'act2_hehuan_meet');
  Game.chooseOption(0); // -> act2_hehuan_drained
  assert.equal(Game.run.node, 'act2_hehuan_drained');
  Game.chooseOption(0); // 花柳绝杀 -> BE3
  assert.equal(Game.pendingDeath, 'BE3');
  assert.ok(Game.hasClue('yusuzhen_death'));

  Game.selectInheritOption('talent');
  Game.confirmReincarnate();
  assert.equal(Game.meta.cycle, 2);
  assert.equal(Game.meta.pagesLeft, 99);
  assert.ok(Game.hasTalent('shuangxiu'));
  assert.equal(Game.run.node, 'act1_plaza');

  // 第 2 世：反客为主 -> 补天接引 -> 证伪识破陷阱 -> BE5 -> 继承【先天真炁】
  Game.chooseOption(1); // act2_hehuan_meet
  Game.chooseOption(0); // act2_hehuan_reverse
  assert.equal(Game.run.node, 'act2_hehuan_reverse');
  Game.chooseOption(0); // act3_butian_guide
  assert.equal(Game.run.node, 'act3_butian_guide');
  Game.chooseOption(0); // act3_cultivate
  assert.equal(Game.run.node, 'act3_cultivate');
  assert.ok(Game.hasClue('daoshu_heal'));

  Game.toggleDeductionClue('yusuzhen_death');
  Game.toggleDeductionClue('daoshu_heal');
  Game.submitDeduction();
  assert.equal(Game.run.node, 'act3_truth_revealed');
  assert.ok(Game.hasClue('liuxin_trap'));

  Game.chooseOption(0); // BE5
  assert.equal(Game.pendingDeath, 'BE5');
  Game.selectInheritOption('item');
  Game.confirmReincarnate();
  assert.equal(Game.meta.cycle, 3);
  assert.ok(Game.hasMetaItem('xiantian_qi'));

  // 第 3 世：喂炁压境进内门 (NE_INNER) -> 老赖流 -> 炼宝坐化 -> 继承【血阳剑丸】
  Game.chooseOption(1); // act2_hehuan_meet
  Game.chooseOption(0); // act2_hehuan_reverse
  Game.chooseOption(0); // 苟道压境 -> act2_lay_low
  assert.equal(Game.run.node, 'act2_lay_low');
  assert.equal(Game.meta.endings['NE_INNER'], true);

  Game.chooseOption(0); // inner_hub
  Game.chooseOption(0); // 魔门老赖流
  assert.equal(Game.run.realm, 4);
  assert.ok(Game.hasTech('lianqi_jue'));
  assert.ok(Game.hasTech('shasheng_zhou'));

  Game.chooseOption(0); // inner_refine
  assert.equal(Game.run.realm, 7);
  Game.chooseOption(0); // END_REFINE
  assert.equal(Game.pendingDeath, 'END_REFINE');

  Game.selectInheritOption('item');
  Game.confirmReincarnate();
  assert.equal(Game.meta.cycle, 4);
  assert.ok(Game.hasMetaItem('xueyang_jianwan'));

  // 第 4 世：三日破境钓刘信 -> 埋剑阵反杀 -> 夺万灵幡/神符 -> 欺天窃命 TE_CH1
  Game.chooseOption(1); // act2_hehuan_meet
  Game.chooseOption(0); // act2_hehuan_reverse
  Game.chooseOption(1); // 突破链气一层 -> act3_butian_guide
  Game.chooseOption(0); // 埋剑阵 -> act4_ambush_start
  assert.equal(Game.run.node, 'act4_ambush_start');
  Game.chooseOption(0); // act4_interrogate
  Game.chooseOption(0); // act4_banner_test
  Game.chooseOption(0); // act4_true_ending
  assert.equal(Game.run.node, 'act4_true_ending');
  assert.equal(Game.meta.endings['TE_CH1'], true);
  assert.equal(Game.meta.trueEndingUnlocked, true);
  assert.ok(Game.hasMetaItem('wanling_fan'));
  assert.ok(Game.hasMetaItem('shenfu'));
  assert.ok(sounds.includes('death'));
  assert.ok(toasts.length > 0);
});

test('纯引擎边界与持久化：焚页校验、敛气隐匿、杀生自爆、一键复刻与存档还原', () => {
  const storage = createMemoryStorage();
  const fixture = createChapter1TestFixture();
  let gameOverOpened = false;
  let lastInheritHint = '';

  const Game = createGameEngine({
    data: fixture.data,
    storage,
    hooks: {
      onOpenGameOverModal: () => { gameOverOpened = true; },
      onSelectInherit: (_type, hint) => { lastInheritHint = hint; }
    }
  });
  fixture.bindEngine(Game);
  Game.init();

  // 1. 焚页边界：剩余 2 页可焚 1 页，剩余 1 页时禁止焚页
  Game.meta.pagesLeft = 2;
  Game.triggerDeath('BE1');
  Game.burnPageForHint();
  assert.equal(Game.meta.pagesLeft, 1);
  assert.ok(Game.meta.burnedHints.includes('BE1'));
  Game.burnPageForHint(); // pagesLeft === 1 应拒绝扣减
  assert.equal(Game.meta.pagesLeft, 1);

  // 2. 继承提示与燃尽百世书 Game Over 触发
  Game.selectInheritOption('talent');
  assert.ok(lastInheritHint.includes('天赋'));
  Game.confirmReincarnate();
  assert.equal(Game.meta.pagesLeft, 0);
  assert.equal(gameOverOpened, true);

  // 3. hardReset 后验证默认初始态与存档还原
  Game.hardReset();
  assert.equal(Game.meta.pagesLeft, DEFAULT_META().pagesLeft);
  assert.equal(Game.meta.cycle, 1);

  Game.learnTech('lianqi_jue', true);
  Game.learnTech('shasheng_zhou', true);
  Game.setRealm(4);
  Game.toggleStealth();
  assert.equal(Game.run.isStealth, true);

  Game.save();
  const rawSaved = storage.getItem(SAVE_KEY);
  assert.ok(rawSaved, 'storage 中应已写入存档 JSON');

  // 创建新引擎实例模拟重启加载
  const fixture2 = createChapter1TestFixture();
  const Game2 = createGameEngine({ data: fixture2.data, storage });
  fixture2.bindEngine(Game2);
  Game2.init();
  assert.ok(Game2.hasTech('lianqi_jue'));
  assert.ok(Game2.hasTech('shasheng_zhou'));

  // 4. 一键托管复刻 4 个目标均可正确落地
  for (const target of ['act2_hehuan_reverse', 'act3_butian_guide', 'inner_hub', 'act4_ambush_start']) {
    Game2.quickJump(target);
    assert.equal(Game2.run.node, target);
  }

  // 5. 杀生自爆触发 END_SELF_BOOM
  Game2.triggerSelfBoom();
  assert.equal(Game2.pendingDeath, 'END_SELF_BOOM');
});
