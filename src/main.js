/*************************************************************************
 * 1. 轻量化 Web Audio 水墨仙侠音效引擎（无外部依赖，iPad Safari 首次点击解锁）
 *************************************************************************/
const SoundFX = {
  enabled: true,
  ctx: null,
  unlocked: false,
  bindUnlock() {
    if (this._unlockBound) return;
    this._unlockBound = true;
    const handler = () => {
      this.unlock();
      if (this.unlocked) {
        document.removeEventListener('pointerdown', handler);
        document.removeEventListener('touchstart', handler);
        document.removeEventListener('keydown', handler);
      }
    };
    try {
      document.addEventListener('pointerdown', handler, { passive: true });
      document.addEventListener('touchstart', handler, { passive: true });
      document.addEventListener('keydown', handler, { passive: true });
    } catch (e) {}
  },
  unlock() {
    try {
      this.init();
      if (this.ctx && typeof this.ctx.resume === 'function') {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
      this.unlocked = true;
    } catch (e) {}
  },
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
        const res = this.ctx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
    } catch (e) {}
  },
  toggle() {
    this.enabled = !this.enabled;
    const btn = document.getElementById('btnAudioToggle');
    if (btn) btn.textContent = this.enabled ? '🔊 音效：开' : '🔇 音效：关';
  },
  playTone(freq, duration, type = 'sine', vol = 0.08, slideTo = null) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  click() { this.playTone(520, 0.07, 'triangle', 0.05, 340); },
  clue() {
    this.playTone(660, 0.14, 'sine', 0.07, 880);
    setTimeout(() => this.playTone(990, 0.22, 'sine', 0.06), 90);
  },
  death() {
    this.playTone(135, 0.7, 'sawtooth', 0.09, 45);
    setTimeout(() => this.playTone(90, 0.8, 'triangle', 0.08, 38), 120);
  },
  pageFlip() {
    this.playTone(320, 0.16, 'sine', 0.05, 620);
    setTimeout(() => this.playTone(480, 0.28, 'triangle', 0.04, 240), 110);
  },
  pressure() {
    this.playTone(65, 1.4, 'sawtooth', 0.11, 36);
    this.playTone(98, 1.3, 'sine', 0.09, 50);
  },
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.35, 'triangle', 0.06), i * 110);
    });
  }
};

/*************************************************************************
 * 2. 背景水墨余烬粒子画布（响应式自适应）
 *************************************************************************/
const InkCanvas = {
  canvas: null,
  ctx: null,
  particles: [],
  init() {
    this.canvas = document.getElementById('inkCanvas');
    if (!this.canvas || !this.canvas.getContext) return;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    for (let i = 0; i < 42; i++) this.particles.push(this.createParticle());
    this.loop();
  },
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  createParticle() {
    const isGold = Math.random() > 0.62;
    return {
      x: Math.random() * (this.canvas ? this.canvas.width : 1200),
      y: Math.random() * (this.canvas ? this.canvas.height : 800),
      r: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(Math.random() * 0.45 + 0.15),
      alpha: Math.random() * 0.45 + 0.12,
      color: isGold ? '212, 175, 55' : '220, 38, 38'
    };
  },
  loop() {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      this.ctx.fill();
    }
    requestAnimationFrame(() => this.loop());
  }
};

/*************************************************************************
 * 3. 游戏静态数据配置（线索、宝物、天赋、人物暗账、死亡结局）
 *************************************************************************/
const REALM_NAMES = {
  0: '凡人',
  1: '链气一层',
  4: '链气四层（中期）',
  7: '链气七层（后期）'
};

const TALENTS_DB = {
  shuangxiu: {
    id: 'shuangxiu',
    name: '双修奇才',
    tier: '白色',
    color: 'pill-gold',
    desc: '双修功法领悟力极高；同境界无人能采补你，强行采补反遭你吞噬反噬。'
  }
};

const ITEMS_DB = {
  xiantian_qi: {
    id: 'xiantian_qi',
    name: '先天真炁',
    tier: '奇物（前世肉身）',
    desc: '前世被刘信哄骗自炼而成的白炁分身。与你本为一体，可如臂使指、吸纳元阳助你压境或破关。'
  },
  xueyang_jianwan: {
    id: 'xueyang_jianwan',
    name: '血阳剑丸',
    tier: '上乘阵宝',
    desc: '以天魔化血神光舍身剥皮、苦研二十年铭刻《血洗天河剑阵图》所成。念动即成阵，阵内化血神光必中！'
  },
  wanling_fan: {
    id: 'wanling_fan',
    name: '先天一炁万灵幡',
    tier: '上乘法宝',
    desc: '自刘信手中夺来的魔门至宝。可炼修士魂魄为绝对忠诚的幡灵，既能斗法自爆，亦能996流水线画符。'
  },
  shenfu: {
    id: 'shenfu',
    name: '先天混元一炁神符',
    tier: '天机奇宝',
    desc: '先天散人遗留之符。随身携带可蒙蔽天机，连筑基真人隔空推演杀子因果亦无法算到你头上！'
  }
};

const TECHNIQUES_DB = {
  yinyang_fu: { name: '《阴阳大乐赋》', desc: '合欢殿双修采补功法，可采补元阳与功法经验。' },
  longhu_fu: { name: '《龙虎交媾阴阳大乐赋》', desc: '补天峰五品双修真功，可逐步扭曲道侣心志。' },
  xiantian_daoshu: { name: '《先天道书》', desc: '上半部诱人自炼先天真炁，下半部乃炼人成药的魔功。' },
  lianqi_jue: { name: '《敛气决》', desc: '自黑衣惯犯处缴获的隐匿密册，可完美收敛真气瞒过刘信。' },
  shasheng_zhou: { name: '《杀生咒》', desc: '藏一口刀兵杀气于胸，口开道“杀”则与敌皆亡——魔门最体面的自杀重开按钮。' },
  jianzhen_tu: { name: '《血洗天河剑阵图》', desc: '苦研二十年自创的杀伐剑阵，已铭刻于血阳剑丸。' }
};

const CLUES_DB = {
  hualiu: {
    id: 'hualiu',
    title: '原身隐疾：花柳恶疾',
    tag: '内视发现',
    text: '原身入宗前流连南风馆，竟染上了一身药石难医的花柳恶疾，胸腔隐痛、命不久矣。'
  },
  chenliang_death: {
    id: 'chenliang_death',
    title: '初圣宗铁律：人材',
    tag: '削峰血案',
    text: '天才少年陈良因“死后比活着更有价值”被当场划杀分尸。在初圣宗，弱小时显露才华就是找死。'
  },
  liuxin_identity: {
    id: 'liuxin_identity',
    title: '黑衣道人：刘信',
    tag: '人物底细',
    text: '补天峰正式弟子，链气六层（中期巅峰），表面温柔体贴、尽心打点新人福利，实则城府极深。'
  },
  yusuzhen_death: {
    id: 'yusuzhen_death',
    title: '玉素真病死余波',
    tag: '前世余波',
    text: '玉素真在第一世吸干你并成功突破链气、晋升正式弟子后，仍因花柳深种、真气难除，卧床数月病重而亡。'
  },
  yusuzhen_qi: {
    id: 'yusuzhen_qi',
    title: '破境之“炁”',
    tag: '双修感悟',
    text: '玉素真体内积蓄了一道濒临链气的“炁”。神与气合谓之链气，若将此炁抽干便会立刻突破。'
  },
  guyu_sword: {
    id: 'guyu_sword',
    title: '炼宝殿：人炼骨剑',
    tag: '魔门作风',
    text: '炼宝殿执事陈皓一掐法诀，便让苦修三年的记名师兄炸成血肉凝作骨玉剑。魔门最擅“让你自己炼自己”。'
  },
  daoshu_heal: {
    id: 'daoshu_heal',
    title: '先天道书十日治百病',
    tag: '切身异状',
    text: '你修习刘信赠予的《先天道书》上半部，仅仅十日便化去形体炼成先天真炁，连缠身的花柳恶疾也不药而愈。'
  },
  liuxin_trap: {
    id: 'liuxin_trap',
    title: '《先天道书》炼人杀局',
    tag: '证伪真相',
    text: '若内门弟子人人皆传《先天道书》，玉素真绝不会因花柳病死！此书是刘信专挑天才新人下套的“人药养成法”。'
  },
  liuxin_array: {
    id: 'liuxin_array',
    title: '刘信的隔音幻阵习惯',
    tag: '内门暗账',
    text: '刘信历次深夜上门收割“先天真炁”前，都会先在目标洞府外亲手布下隔音与幻象阵法，确保无人听见惨叫。'
  },
  chenxinan_soul: {
    id: 'chenxinan_soul',
    title: '万灵幡主魂：陈信安',
    tag: '绝密因果',
    text: '刘信黑幡中藏着补天峰主失踪多年的亲传之子陈信安！刘信杀真传却未被峰主算出，身上必藏蒙蔽因果的奇宝。'
  },
  yusuzhen_secret: {
    id: 'yusuzhen_secret',
    title: '合欢殿暗账：养蛊名册',
    tag: '审讯秘闻',
    text: '玉素真在心志臣服后吐露：每批生得俊俏的新人皆是外门炉鼎，但凡一天链气的绝世苗子，都会被刘信亲自挑走“炼炁”。'
  }
};

const NPCS_DB = {
  yusuzhen: {
    name: '玉素真',
    role: '合欢殿妖冶师兄',
    surface: '暗红开叉广袖长袍，眼波流转、吐息勾魂，逢人便笑说合欢殿考验最是快活轻松。',
    truth: '心狠手辣的合欢毒蛇，专门物色俊俏病弱的新人强行采补冲关，榨干后弃如敝履。',
    truthClue: 'yusuzhen_death'
  },
  liuxin: {
    name: '刘信',
    role: '补天峰笑面虎师兄',
    surface: '初见阴戾，晋升后却春风和煦，手把手为你打点四殿最好福利，宛如知心引路人。',
    truth: '链气六层病娇控制狂。借《先天道书》诱新人自炼成药，身怀万灵幡与蒙蔽因果的先天神符。',
    truthClue: 'liuxin_trap'
  },
  chenxinan: {
    name: '陈信安',
    role: '黑袍失踪真传',
    surface: '补天峰主亲传之子，修三品真气《补天真经》，风流桀骜，笑谈间许你云海密藏。',
    truth: '被刘信反杀炼入万灵幡的危险残魂。纵沦为幡灵仍满腹算计，妄图引你入葫芦岛反客为主。',
    truthClue: 'chenxinan_soul'
  }
};

const CHAR_INTRO_DB = {
  heiyi_daoren: {
    id: 'heiyi_daoren',
    badge: '👤 人物介绍',
    tag: '初圣宗执册人',
    title: '高台黑衣道人',
    text: '主持外门削峰血奉点名的黑衣道人。身旁悬浮命灯，神色阴戾冷漠，手握朱笔名册，视满场血奉记名弟子如待估价的耗材。'
  },
  chenliang: {
    id: 'chenliang',
    badge: '👤 人物介绍',
    tag: '同批血奉少年',
    title: '陈良',
    text: '与你同批入宗的陈国血奉记名弟子。唇红齿白、灵气逼人，在满地病弱少年中最为出挑，却因“死后比活着更有价值”被当场朱笔划杀。'
  },
  yusuzhen: {
    id: 'yusuzhen',
    badge: '👤 人物介绍',
    tag: '合欢殿妖冶师兄',
    title: '玉素真',
    text: '外门合欢殿资深弟子。身着暗红高开叉广袖长袍，眼波流转、吐息勾魂，专门在殿前物色生得清秀俊逸的新晋师弟，笑称合欢殿的考验最是快活轻松。'
  },
  liuxin: {
    id: 'liuxin',
    badge: '👤 人物介绍',
    tag: '补天峰接引师兄',
    title: '刘信',
    text: '补天峰正式弟子，链气六层（中期巅峰）。正是削峰点名那位阴戾黑衣道人，在你三日破境后却春风和煦、宛如知心兄长，手把手为你打点四殿最好的新人福利。'
  }
};

const ENDINGS_DB = {
  BE0: {
    code: 'BE0',
    title: '匹夫怀璧',
    tag: '死因：藏拙失败',
    aftermath: '黑衣道人刘信拎起你尚有余温的尸体啧啧称奇，摸遍你浑身上下后冷笑一声：“凡人血奉堆里竟混进个自带修为的怪胎，正道奸细还是秘宝转世？”他转身将你切片上交峰主，换了一笔巨额功勋。',
    verdict: '你带着链气修为大摇大摆站在一群病秧子凡人中间，生怕魔门不把你绑上解剖台？记住，台上的刘信可是链气六层！',
    directHint: '【破局步骤】若已带回高阶修为，必须在第一幕点名前点击【亮底牌 · 运转《敛气决》】隐匿修为；若尚未习得《敛气决》，请点击【临时自散修为】避免死锁，先走普通通关进内门弄到《敛气决》。'
  },
  BE1: {
    code: 'BE1',
    title: '天生灵童',
    tag: '死因：过于优秀',
    aftermath: '你的名字被黑衣道人朱笔轻轻一划，魂飞魄散。次日，炼丹殿夸你的血肉滋补，炼宝殿赞你的骨魂澄净，御兽殿的妖兽吃着你的五脏六腑摇尾巴——三殿执事一致给了五星好评。',
    verdict: '记住初圣魔门第一铁律：当你的尸体比活人更值钱时，你就必须死！在魔门，装孙子才是活下去的第一课。',
    directHint: '【破局步骤】第一幕点名“吕阳”时，选择【低眉顺眼，露出一副虚弱平庸的模样】，靠这张俊俏脸蛋混进合欢殿保命。'
  },
  BE2: {
    code: 'BE2',
    title: '干枯药渣',
    tag: '死因：白给耗材',
    aftermath: '玉素真嫌弃地踢开你干枯如柴的尸体，靠着你最后一口元阳顺利突破链气一层，在众男弟子的谄媚恭维中风光踏入内门。荒冢野狗叼走了你的骨头，世间再无人记得你。',
    verdict: '横竖都是个死，你就这么老老实实被师兄吸干了？再仔细看看第一幕正文里你的原身状况——你这副破败身子，难道就没点能恶心死他的“特产”？',
    directHint: '【破局步骤】重开后，在第一幕正文里点击高亮词【病入膏肓】，解锁线索《花柳恶疾》。第二幕被玉素真榨干后，选择亮出花柳病气死他！'
  },
  BE3: {
    code: 'BE3',
    title: '顺天易，逆天难',
    tag: '死因：嘴贱反杀',
    aftermath: '玉素真气急败坏一掌拍死了你。但三个月后，初圣宗传出奇闻：刚晋升内门的玉素真虽已链气一层，却因花柳深种、真气难除，烂疮遍体卧床数月，最终在绝望与恶臭中病重而亡！',
    verdict: '妙啊！以凡人病躯巧用双修之法反杀链气修士，堪称胜天半子！别犹豫，本世你啥装备都没有，直接选【四：放弃所有收获，觉醒天赋】！',
    directHint: '【破局步骤】在下方继承卡片中选择【四、觉醒天赋】，必得神技《双修奇才》。下一世再进合欢殿，就能反过来把玉素真榨干！',
    guaranteedTalent: 'shuangxiu',
    unlockClues: ['yusuzhen_death']
  },
  BE4: {
    code: 'BE4',
    title: '人药嫁衣',
    tag: '死因：轻信美人',
    aftermath: '你笑着拉开门，下一秒意识便被刘信的法诀强行抹去。三日后，刘信吞服你化作的先天真炁，势如破竹突破链气后期，风光拜入补天峰主门下成为亲传，还顺手收走了你的骨玉剑与全套新人福利。',
    verdict: '魔门哪来这么贴心的接引师兄？动动脑子对比一下【玉素真病死余波】和你的《先天道书》！不过……你前世肉身都炼成真炁了，算不算一件宝物？',
    directHint: '【破局步骤】1. 在本次结算选【一、保留宝物】带走隐藏神物《先天真炁》！2. 下世在合欢殿反杀玉素真时，亮底牌把元阳喂给《先天真炁》压境苟住，等秦宇替你被刘信带走，即可普通通关进内门！',
    specialItem: 'xiantian_qi'
  },
  BE5: {
    code: 'BE5',
    title: '待宰人材',
    tag: '死因：落入彀中',
    aftermath: '你的骨玉剑在半空被刘信轻描淡写定住。他欣赏着你消散前的怒容，笑得春风和煦：“上半部是让你自己炼自己，下半部才是归我所用的法门。”他笑着夸炼宝殿陈皓果然挑了最好的法器。',
    verdict: '你能识破陷阱已经很聪明了，可惜肉身已成别人法诀里的玩物，硬拼必死。但别忘了——你如今这团先天真炁，可是能被百世书带走的！',
    directHint: '【破局步骤】1. 结算选【一、保留宝物】带走《先天真炁》！2. 下一世合欢殿反杀玉素真时，选择【把元阳喂给先天真炁，压住境界】，躲过刘信收割进入内门筹备底牌！',
    specialItem: 'xiantian_qi'
  },
  BE6: {
    code: 'BE6',
    title: '真传压顶',
    tag: '死因：犹豫败北',
    aftermath: '你刚亮出底细，刘信便果断退后摇动黑幡。黑袍青年陈信安踱步而出，轻叹一句“圣宗果然还是那个圣宗”，随手一掌三品《补天真经》便将你拍成血雾，随后冷笑着退回幡中。',
    verdict: '跟链气六层还藏着真传主魂的老阴比打正面？你脑子进魔气了？要么一秒控死不给他摇幡的机会，要么连他自己布的阵一起利用！',
    directHint: '【破局步骤】先通过普通通关进入内门筹备，自残炼成阵宝《血阳剑丸》并带回；再重开到第三幕诱杀刘信时，提前将剑阵埋在门口，等他进门瞬间秒杀制伏！',
    unlockClues: ['chenxinan_soul']
  },
  BE7: {
    code: 'BE7',
    title: '农夫与蛇',
    tag: '死因：道心不狠',
    aftermath: '你一时心软签下法契放走刘信。三日后，执法堂破开你的洞府，刘信站在执事身后笑得阴恻恻的——他早已反咬你是玉枢剑阁奸细，并献上了伪造的铁证。你被抽魂点成了长明魂灯。',
    verdict: '初圣宗没有好人，活着的全是坏人。连被你扒光了按在地上求饶的病娇师兄都敢放走，你当这是纯爱甜宠文呢？',
    directHint: '【破局步骤】制伏刘信后，毫不犹豫选择彻底榨杀并将他炼成万灵幡幡灵！'
  },
  BE7b: {
    code: 'BE7b',
    title: '引狼入室',
    tag: '死因：贪心夺舍',
    aftermath: '你贪图陈信安许诺的葫芦岛密藏与筑基机缘，留下了他的残魂。半月后你按他指引踏入秘境，却撞进了他生前留下的天蚕夺舍阵。陈信安大笑着披上你的皮囊走出洞府：“多谢师弟赠躯！”',
    verdict: '连刘信拿了万灵幡这么多年都不敢去动他的密藏，你一个新晋弟子倒敢去？真传的饼，吃一口要命！',
    directHint: '【破局步骤】唤出陈信安后，不要听他任何画饼，直接果断拍散他的真灵，并握紧《先天混元一炁神符》静坐半个时辰，即可达成地狱真通关！'
  },
  END_NIUMA: {
    code: 'BE_牛马',
    title: '魔门老实人',
    tag: '死因：被高利贷榨干',
    aftermath: '你兢兢业业起早贪黑用精血浇灌阴阳仙葩，一年后卖了 1500 贡献点。一算账：洞府房租扣 360，功法贷本息扣 460，三河会仙葩贷本息扣 680——手里刚好剩 0 点！你在无尽加班与还贷中油尽灯枯。',
    verdict: '都觉醒百世书了还老实还高利贷？死后的债关下一世的我屁事！拿了贷款直接买丹药冲修为、顺手去白嫖自残禁术不香吗？',
    directHint: '【破局步骤】在内门筹备时不要老实种花还贷！果断选择【魔门老赖流：全款贷款买丹药冲修为】，再选择【自残炼宝流】炼出《血阳剑丸》带回！'
  },
  END_REFINE: {
    code: '坐化炼宝',
    title: '疯魔阵痴 · 功成坐化',
    tag: '圆满死局：自残白嫖',
    aftermath: '四十岁大限将至，你空有人形的血影在破旧外门洞府里渐渐消散。在生死交界的刹那，最后一道阵纹完美嵌入剑丸——“哈哈哈！我成功了！”你在狂笑中坐化，留下一枚令筑基真人都动容的绝世阵宝。',
    verdict: '这才是百世书的正确用法！这一世的自残、折寿、断绝仙途全留在过去，下一世你只需带着无损的顶级阵宝重开，回去给刘信一个大大的惊喜！',
    directHint: '【破局步骤】本次结算务必选择【一、保留宝物 → 血阳剑丸】！下一世回到合欢殿故意三日突破钓出刘信，在洞府门口预埋剑阵即可开启第四幕反杀！',
    specialItem: 'xueyang_jianwan'
  },
  END_SELF_BOOM: {
    code: '体面重开',
    title: '杀生自爆 · 老赖跑路',
    tag: '主动重开：债务清零',
    aftermath: '催债的执法堂弟子刚一脚踹开你的洞府门，你便咧嘴一笑张口道了一声“杀！”。轰隆一声巨响，满屋高利贷欠条化作飞灰，执法堂弟子顶着一头黑灰站在风中破口大骂：“畜生啊，连人带债全炸没了！”',
    verdict: '漂亮！这世的债留给上辈子，修为和知识归下辈子。记得下一世如果带回修为，上台点名前千万先运《敛气决》！',
    directHint: '【破局步骤】若想带回修为选【二、保留修为】；若想反杀刘信，更推荐在内门筹备时继续走完【自残炼宝流】先把《血阳剑丸》炼出来带回！'
  }
};

/*************************************************************************
 * 4. 游戏核心引擎（状态持久化 + 场景状态机 + 结算逻辑）
 *************************************************************************/
const SAVE_KEY = 'baishishu_ch1_bl_save_v1';

const DEFAULT_META = () => ({
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
  trueEndingUnlocked: false
});

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
    InkCanvas.init();
    this.startNewRun(false);
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.meta = Object.assign(DEFAULT_META(), parsed);
        this.meta.npcData = Object.assign(DEFAULT_META().npcData, parsed.npcData || {});
      }
    } catch (e) {
      this.meta = DEFAULT_META();
    }
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.meta));
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
    SoundFX.pageFlip();
    const ov = document.getElementById('pageFlipOverlay');
    document.getElementById('flipMainText').textContent = mainText;
    document.getElementById('flipSubText').textContent = subText || `第 ${this.meta.cycle} 世开启 · 残页 ${this.meta.pagesLeft}`;
    ov.classList.add('active');
    setTimeout(() => {
      if (cb) cb();
      setTimeout(() => ov.classList.remove('active'), 420);
    }, 520);
  },

  hasTalent(id) { return this.meta.talents.includes(id); },
  hasItem(id) { return this.meta.items.includes(id) || this.run.runItems.includes(id); },
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
        SoundFX.clue();
        const dot = document.getElementById('mobileClueDot');
        if (dot) dot.classList.remove('hidden');
        UI.openClueModal(CLUES_DB[id], true);
      }
    } else if (!silent) {
      SoundFX.click();
      UI.openClueModal(CLUES_DB[id], false);
    }
    UI.renderConsole();
    document.querySelectorAll(`.kw-clue[data-clue="${id}"]`).forEach(el => el.classList.add('collected'));
  },

  learnTech(id, silent = false) {
    if (!TECHNIQUES_DB[id]) return;
    if (!this.meta.techniques.includes(id)) {
      this.meta.techniques.push(id);
      this.save();
      if (!silent) UI.toast(`📖 记忆功法【${TECHNIQUES_DB[id].name}】`, '知识不随身死消散，可永世留存！', 'gold');
    }
    UI.renderConsole();
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
    UI.renderConsole();
  },

  toggleStealth() {
    if (!this.hasTech('lianqi_jue')) return;
    this.run.isStealth = !this.run.isStealth;
    SoundFX.click();
    UI.toast(
      this.run.isStealth ? '🌑 已运转《敛气决》' : '🌕 已撤去《敛气决》',
      this.run.isStealth ? '周身真气收束皮肉之下，外人视若凡胎。' : '真气不再遮掩，高阶修士一眼可察。',
      'gold'
    );
    UI.renderConsole();
    if (this.run.node === 'act1_plaza') UI.renderScene();
  },

  triggerSelfBoom() {
    if (!this.hasTech('shasheng_zhou')) return;
    SoundFX.death();
    UI.fxShake();
    UI.fxVignette('blood', 1200);
    UI.closeMenuModal();
    UI.closeChoiceModal();
    this.triggerDeath('END_SELF_BOOM');
  },

  quickJump(target) {
    SoundFX.pageFlip();
    UI.closeMenuModal();
    UI.closeChoiceModal();
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
    UI.closeChoiceModal();
    UI.choiceAutoPopped = false;
    const scene = SCENES[sceneId];
    if (scene && typeof scene.onEnter === 'function') {
      scene.onEnter();
    }
    UI.renderScene();
    UI.renderConsole();
    const vp = document.getElementById('storyViewport');
    if (vp) vp.scrollTop = 0;
  },

  triggerDeath(beId) {
    const data = ENDINGS_DB[beId];
    if (!data) return;
    SoundFX.death();
    UI.fxShake();
    UI.fxVignette('blood', 1400);
    UI.closeChoiceModal();
    UI.closeMenuModal();

    this.meta.endings[beId] = true;
    this.meta.endingCounts[beId] = (this.meta.endingCounts[beId] || 0) + 1;
    if (data.unlockClues) {
      data.unlockClues.forEach(c => this.unlockClue(c, true));
    }
    this.save();

    this.pendingDeath = beId;
    this.selectedInherit = null;
    UI.openDeathModal(beId);
    UI.renderConsole();
  },

  burnPageForHint() {
    if (!this.pendingDeath) return;
    if (this.meta.burnedHints.includes(this.pendingDeath)) return;
    if (this.meta.pagesLeft <= 1) {
      UI.toast('⚠️ 百世书残页不足', '只剩最后一页，无法再焚页问卜！', 'red');
      return;
    }
    this.meta.pagesLeft -= 1;
    this.meta.burnedHints.push(this.pendingDeath);
    this.save();
    SoundFX.clue();
    UI.openDeathModal(this.pendingDeath);
    UI.renderConsole();
    UI.toast('🔥 焚页叩天机', '消耗 1 页百世书，天机直白显现！', 'gold');
  },

  selectInheritOption(type) {
    this.selectedInherit = type;
    SoundFX.click();
    document.querySelectorAll('.inherit-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.type === type);
    });
    const hintMap = {
      item: '将选中的宝物永久刻入百世书，下世开局直接持有。',
      realm: '将本世巅峰修为带回下世（注意在第一幕运转《敛气决》藏拙）。',
      life: '保留寿元余泽，增强体魄（本测试章无额外寿元关卡）。',
      talent: '放弃本世物质收获，依据前世逆天经历觉醒专属天赋。'
    };
    document.getElementById('inheritSelectedHint').textContent = hintMap[type] || '';
  },

  confirmReincarnate() {
    const beId = this.pendingDeath;
    const data = ENDINGS_DB[beId];
    if (!this.selectedInherit) {
      UI.toast('请先择定传承', '请点击上方四选一卡片后再翻动百世书。', 'red');
      return;
    }

    let inheritMsg = '一无所获，唯留前世记忆。';
    if (this.selectedInherit === 'item') {
      const itemKey = data.specialItem || (this.run.runItems.length ? this.run.runItems[this.run.runItems.length - 1] : null);
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
      if (data.guaranteedTalent && !this.meta.talents.includes(data.guaranteedTalent)) {
        this.meta.talents.push(data.guaranteedTalent);
        inheritMsg = `觉醒白色神技【${TALENTS_DB[data.guaranteedTalent].name}】！`;
      } else {
        inheritMsg = '前世未触发新的逆天壮举，未觉醒新天赋。';
      }
    }

    this.meta.pagesLeft -= 1;
    this.meta.cycle += 1;
    this.save();

    document.getElementById('deathModal').classList.add('hidden');
    this.pendingDeath = null;

    if (this.meta.pagesLeft <= 0) {
      document.getElementById('gameOverModal').classList.remove('hidden');
      return;
    }

    this.startNewRun(true);
    setTimeout(() => {
      UI.toast(`📜 第 ${this.meta.cycle} 世开启`, inheritMsg, 'gold');
    }, 700);
  },

  toggleDeductionClue(clueId) {
    SoundFX.click();
    const idx = this.deductionPicks.indexOf(clueId);
    if (idx >= 0) {
      this.deductionPicks.splice(idx, 1);
    } else {
      if (this.deductionPicks.length >= 2) this.deductionPicks.shift();
      this.deductionPicks.push(clueId);
    }
    UI.renderScene();
  },

  submitDeduction() {
    if (this.deductionPicks.length < 2) {
      UI.toast('线索不足', '请点选【两条】互相矛盾的线索进行因果证伪。', 'red');
      return;
    }
    const ok = this.deductionPicks.includes('yusuzhen_death') && this.deductionPicks.includes('daoshu_heal');
    if (ok) {
      this.unlockClue('liuxin_trap', false);
      this.run.flags.deductionSolved = true;
      this.meta.npcData.liuxin.alert = Math.min(100, this.meta.npcData.liuxin.alert + 40);
      this.save();
      UI.fxShake();
      UI.fxVignette('blood', 900);
      this.go('act3_truth_revealed');
    } else {
      SoundFX.death();
      UI.toast('推演未果', '此两条线索并无直接矛盾。提示：对比玉素真第一世的死因与你修《先天道书》后的身体变化！', 'red');
    }
  },

  hardReset() {
    localStorage.removeItem(SAVE_KEY);
    this.meta = DEFAULT_META();
    UI.closeResetModal();
    UI.closeMenuModal();
    UI.closeChoiceModal();
    UI.closeClueModal();
    UI.closeCodex();
    document.getElementById('gameOverModal').classList.add('hidden');
    this.startNewRun(true);
    UI.toast('🕯️ 百世书已重铸', '一切归零，回到第 1 世削峰广场。', 'normal');
  }
};

/*************************************************************************
 * 5. 完整第一章交互剧本树 (SCENES)
 *************************************************************************/
const SCENES = {
  /* ---------------- 第一幕：削峰血奉 ---------------- */
  act1_plaza: {
    act: '第一幕',
    title: '削峰血奉 · 活人不如死人值钱',
    location: '外门削峰广场',
    time: '入宗首日',
    paragraphs() {
      const cycleNote = Game.meta.cycle > 1
        ? `<p class="story-para story-notice story-notice-cycle">【第 ${Game.meta.cycle} 世回溯】书页翻动之声犹在耳畔，上一世的剧痛与寒意尽数化作虚无，你睁开双眼，竟又回到了初入初圣宗点名分配的广场上。</p>`
        : '';
      const realmWarn = (Game.run.realm > 0 && !Game.run.isStealth)
        ? `<p class="story-para story-notice story-notice-warn">⚠️ 【灵觉示警】你此刻身怀 <strong>${REALM_NAMES[Game.run.realm]}</strong> 修为，真气外露，在满地病弱凡人中犹如黑夜明灯！台上的黑衣道人正缓缓转过头来……</p>`
        : (Game.run.realm > 0 && Game.run.isStealth
          ? `<p class="story-para story-notice story-notice-safe">✦ 《敛气决》已悄然运转，磅礴真气尽数压回皮肉筋骨之下，外人看来你仍是个虚弱无力的凡人。</p>`
          : '');

      return `
        ${cycleNote}
        ${realmWarn}
        <p class="story-para">魔门，初圣宗。重重云海波涛如怒，唯独你脚下这座山峰被凭空削去了山尖，只留一片冰冷平地。你刚穿越到陈国“血奉”记名弟子吕阳身上，一捏手臂全是软肉，胸腔一阵撕裂般的剧痛——这具身子早已<span class="kw-clue danger" data-clue="hualiu">【病入膏肓】</span>，眼看没几天活头。</p>
        <p class="story-para">绝望之际，一卷光影展开在眼前：【百世书 · 残留页数 ${Game.meta.pagesLeft}】。没有加点按钮，只有死后重开的冷酷契约：从前世的宝物、修为、寿命中任选其一，或放弃一切觉醒天赋。</p>
        <p class="story-para">“被叫到名字的人走到我面前。”高台上，一位捧着名册、身旁悬浮命灯的<span class="kw-char" data-char="heiyi_daoren">【黑衣道人】</span>阴戾开口。他先叫了你身旁唇红齿白、灵气逼人的少年<span class="kw-clue kw-char danger" data-clue="chenliang_death" data-char="chenliang">【陈良】</span>。道人看着聪慧行礼的少年满面惊艳，赞叹一声“好一个天生灵童”，提笔在名册上轻轻一划——</p>
        <p class="story-para">噗通！毫无征兆，陈良翻着白眼直挺挺扑倒在地，气息全无。黑衣道人笑得格外畅快：“血液皮肉送炼丹殿，骨头魂魄送炼宝殿，五脏六腑送御兽殿！圣宗看重价值，他死后更有价值，所以才死了。”</p>
        <p class="story-para">下一秒，那双蛇信般的眼睛落在了你身上：“下一个，吕阳。”他修长冰冷的手指勾起你的下巴端详片刻，又顺着衣袖捏住你的腕骨试探筋骨。</p>
      `;
    },
    choices() {
      const list = [];
      if (Game.run.realm > 0 && !Game.run.isStealth) {
        if (Game.hasTech('lianqi_jue')) {
          list.push({
            label: '【亮底牌】第一时间运转《敛气决》，将一身真气压回皮肉之下',
            sub: '完美瞒过链气六层的刘信，装作病弱凡人',
            style: 'trump-card',
            action: () => { Game.toggleStealth(); }
          });
        } else {
          list.push({
            label: '【防死锁权宜之计】咬牙自散本世真气，暂时退回凡胎保命',
            sub: '尚未习得《敛气决》，贸然显露修为必死无疑',
            style: 'normal',
            action: () => {
              Game.run.realm = 0;
              UI.toast('散功藏拙', '你强行散去外露真气，暂保一命。', 'normal');
              UI.renderConsole();
              UI.renderScene();
            }
          });
        }
      }
      list.push({
        label: '强提一口精气，挺直脊背展露聪慧与不凡气度',
        sub: '试图让这位接引师兄高看一眼，免去底层苦役',
        action: () => {
          if (Game.run.realm > 0 && !Game.run.isStealth) {
            Game.triggerDeath('BE0');
          } else {
            Game.unlockClue('chenliang_death', true);
            Game.triggerDeath('BE1');
          }
        }
      });
      list.push({
        label: '低眉顺眼、微微咳嗽，露出一副平庸虚弱的病秧子模样',
        sub: '在魔门，唯有平庸且无害的人才配活着',
        action: () => {
          if (Game.run.realm > 0 && !Game.run.isStealth) {
            Game.triggerDeath('BE0');
          } else {
            Game.meta.npcData.liuxin.met = true;
            Game.learnTech('yinyang_fu', true);
            Game.go('act2_hehuan_meet');
          }
        }
      });
      return list;
    }
  },

  /* ---------------- 第二幕：合欢殿（BL 玉素真） ---------------- */
  act2_hehuan_meet: {
    act: '第二幕',
    title: '合欢殿 · 妖冶师兄的温柔杀机',
    location: '外门合欢殿前',
    time: '入宗首日 · 午后',
    onEnter() {
      Game.meta.npcData.yusuzhen.met = true;
      Game.save();
    },
    paragraphs() {
      return `
        <p class="story-para">黑衣道人捏完你的腕骨，果然露出几分失望——在他眼里，你除了这张清秀俊逸的脸庞外一无是处。“去合欢殿吧。”你领了透明命牌与一本《阴阳大乐赋》，随着老杂役行至一座朱檐魅影的殿宇前。</p>
        <p class="story-para">殿前负手立着一位身着暗红广袖长袍的男人。那长袍的侧腰开叉竟直逼胯骨，他见新弟子们偷偷打量过来，非但不避，反而纤长指尖一挑，慢悠悠拨开猩红衣摆。白皙劲瘦的腰胯间，一枚玉牌正随着他步履轻晃，刻着三个字：<span class="kw-char danger" data-char="yusuzhen">【玉素真】</span>。</p>
        <p class="story-para">“哟，这一批倒有个生得这么招人疼的小师弟。”玉素真眼眸骤亮，修长身姿如水蛇般贴近，根本不加掩饰眼底的垂涎，“随我来吧，师兄亲自给你讲讲合欢殿的规矩。”</p>
        <p class="story-para">踏入僻静回廊，他忽地倾身凑近，一口滚烫兰香的热气直直喷在你敏感的耳根上，骨节分明却微凉的手指顺着你的后颈滑入领口，像情人低语：“入了我合欢殿不用吃苦受罪，咱们的考验最是快活——那就是，双修。”</p>
        <p class="story-para story-muted">话音未落，他竟不顾光天化日，直接扣住你的腰将你拽入静室、反手扯开了你的衣襟！</p>
      `;
    },
    customWidget() {
      const surfOpts = ['挣扎斥责：“师兄等等，至少换个地方！”', '垂眸顺从，故作羞怯任其摆布'];
      const innerOpts = ['紧盯他经脉运转路线，暗记《阴阳大乐赋》玄机', '暗中盘算如何利用百世书从他身上薅干油水'];
      return `
        <div class="widget-box widget-box-pink">
          <div class="widget-head">
            <span class="widget-title-pink">✦ BL 心理博弈 · 表里双选</span>
            <span class="widget-hint">魔门相处，嘴上一套心里一套</span>
          </div>
          <div>
            <div class="widget-hint" style="margin-bottom:5px;">【表面回应】</div>
            <div class="dual-grid">
              ${surfOpts.map((t, i) => `
                <button type="button" onclick="Game.dualSurface=${i};SoundFX.click();UI.renderScene();" class="dual-btn ${Game.dualSurface === i ? 'active-pink' : ''}">${t}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="widget-hint" style="margin-bottom:5px;">【内心盘算】</div>
            <div class="dual-grid">
              ${innerOpts.map((t, i) => `
                <button type="button" onclick="Game.dualInner=${i};SoundFX.click();UI.renderScene();" class="dual-btn ${Game.dualInner === i ? 'active-amber' : ''}">${t}</button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },
    choices() {
      if (Game.hasTalent('shuangxiu')) {
        return [{
          label: '【天赋触发 · 双修奇才】运转《阴阳大乐赋》，反客为主！',
          sub: '同境无人能采补你——今夜，且看究竟谁是炉鼎！',
          style: 'trump-card',
          action: () => Game.go('act2_hehuan_reverse')
        }];
      }
      return [{
        label: '落入玉素真怀中，迎战魔宗妖男',
        sub: '你尚是凡胎病躯，根本无力抗拒',
        style: 'bl-route',
        action: () => Game.go('act2_hehuan_drained')
      }];
    }
  },

  act2_hehuan_drained: {
    act: '第二幕',
    title: '合欢殿 · 榨干成渣',
    location: '合欢殿静室',
    time: '一炷香后',
    onEnter() {
      UI.fxVignette('blood', 800);
      Game.meta.npcData.yusuzhen.caibu = Math.max(Game.meta.npcData.yusuzhen.caibu, 25);
      Game.save();
    },
    paragraphs() {
      const surfaceLine = Game.dualSurface === 0
        ? '“不用，就在这里！”面对你的挣扎，玉素真眼底兴致更浓，俯身便封住了你的唇齿。'
        : '见你如此温顺乖巧，玉素真挑眉轻笑，指尖缠绕你的青丝，肆意掠夺着你的气息。';
      return `
        <p class="story-para">${surfaceLine}</p>
        <p class="story-para">好一场悬殊的恶战。不到一炷香，玉素真便不满地抽身而起，拢着凌乱的暗红衣袍皱眉嫌弃道：“就这？真是废物！明明生了一副这么好看的皮囊，结果元阳都没多少，这么快就不行了……中看不中用的杂鱼！”</p>
        <p class="story-para">你脸色惨白如纸，只觉体内所剩无几的元气尽数流入玉素真体内，四肢干枯发颤。你顿时明悟：所谓合欢殿的考验，根本就是用《阴阳大乐赋》互相采补养蛊！</p>
        <p class="story-para">门外几个巴结玉素真的男弟子闻声凑了过来，一脸谄媚：“恭喜玉师兄！采补了这最后一人，师兄今日定能一举链气，再非凡人！”</p>
      `;
    },
    choices() {
      const list = [
        {
          label: '咬牙怒骂他卑鄙无耻，或是苦苦求饶保命',
          sub: '在弱肉强食的魔门，弱者的哀嚎毫无意义',
          action: () => Game.triggerDeath('BE2')
        }
      ];
      if (Game.hasClue('hualiu')) {
        list.unshift({
          label: '【亮底牌 · 嘴贱绝杀】咳血轻笑：“师兄，我有花柳病，你链气了应该没事吧？”',
          sub: '消耗原身隐藏特产【花柳恶疾】，以身入局拖他陪葬！',
          style: 'trump-card',
          action: () => Game.triggerDeath('BE3')
        });
      } else {
        list.push({
          label: '【线索未解锁】似乎还有能恶心死他的底牌……',
          sub: '提示：请在第一幕仔细点击正文高亮词【病入膏肓】内视原身状况',
          disabled: true,
          action: () => {}
        });
      }
      return list;
    }
  },

  act2_hehuan_reverse: {
    act: '第二幕',
    title: '合欢殿 · 攻守逆转三日三夜',
    location: '合欢殿静室',
    time: '三日三夜后',
    onEnter() {
      Game.markCleared('act2_hehuan_reverse');
      Game.meta.npcData.yusuzhen.caibu = 100;
      Game.meta.npcData.yusuzhen.alert = 90;
      Game.save();
    },
    paragraphs() {
      return `
        <p class="story-para">【双修奇才】发动的刹那，一股磅礴气血直冲丹田！玉素真原本志得意满地欲榨干你，却惊骇发现《阴阳大乐赋》的吸力竟骤然倒转——你不仅在反吸他的元阳，连他苦修多年的功法感悟与实战经验都在源源不断涌入你脑海！</p>
        <p class="story-para">一日，二日，三日……静室内的喘息渐渐变了调。昔日高高在上、风流妖冶的玉师兄此刻青丝散乱，暗红长袍早被扯落榻下，他修长的腰肢止不住地轻颤，眼尾泛着绝望的猩红，哑着嗓子呜咽求饶：</p>
        <p class="story-para story-dialogue-pink">“够、够了！师弟……我错了，求你停一下……别吸了，再吸真要死了……！”</p>
        <p class="story-para">你充耳不闻，就在神魂交融的顶峰，你头一次清晰地感应到了他丹田深处盘踞着的<span class="kw-clue" data-clue="yusuzhen_qi">【体内的那一缕“炁”】</span>——只要将其一口抽干，神与气合，你立刻就能一步登天，成为链气一层的正式弟子！</p>
      `;
    },
    choices() {
      const list = [
        {
          label: '毫不留情抽干那道“炁”，当场突破链气一层！',
          sub: '彻底榨死玉素真，以“三日破境”之姿风光晋升正式弟子（进入第三幕）',
          action: () => {
            Game.setRealm(Math.max(1, Game.run.realm));
            Game.go('act3_butian_guide');
          }
        }
      ];

      if (Game.hasMetaItem('xiantian_qi')) {
        list.unshift({
          label: '【亮底牌 · 苟道破局】将玉素真的元阳全喂给体内的【先天真炁】，死死压住境界！',
          sub: '不露锋芒避开刘信的狩猎，等替死鬼秦宇出头后再低调晋升内门',
          style: 'trump-card',
          action: () => Game.go('act2_lay_low')
        });
      }

      if (Game.hasClue('yusuzhen_death') || Game.hasClue('liuxin_trap')) {
        list.push({
          label: '【BL 隐藏路线】留玉素真一口残息，以《阴阳大乐赋》种下心志烙印审讯暗账',
          sub: '不急着杀他，听听这位合欢殿老油条跪在榻上哭着交出什么秘密',
          style: 'bl-route',
          action: () => Game.go('act2_yusuzhen_branch')
        });
      }
      return list;
    }
  },

  act2_yusuzhen_branch: {
    act: '第二幕 · 隐藏支线',
    title: '榻上审讯 · 合欢殿的肮脏名册',
    location: '合欢殿静室',
    time: '第三日深夜',
    onEnter() {
      Game.unlockClue('yusuzhen_secret', false);
      Game.meta.npcData.yusuzhen.sealed = true;
      Game.save();
    },
    paragraphs() {
      return `
        <p class="story-para">你在最后一刻收了手，只留给玉素真一缕吊命的元气，顺手借着《阴阳大乐赋》的魔功诡异，在他颤抖的神魂深处种下一枚主仆烙印。</p>
        <p class="story-para">这位平日里目中无人的妖冶师兄瘫软在你怀中，泪水顺着精致的下颌滚落，原本怨毒的眸子渐渐化作迷离与顺从。你挑起他的下巴，低声套问内门接引的门道。</p>
        <p class="story-para story-dialogue-pink">“师弟……不，主人……”玉素真呼吸微弱，靠在你肩头低语，“千万小心补天峰的刘信师兄……这三年来，凡是在合欢殿势头太猛、三天两头就破境的俊俏苗子，都被他笑着领进了补天峰……可奴家从未在善功楼见过那些人再出来过……”</p>
        <p class="story-para">你眼底寒光微闪。玉素真此刻已彻底沦为你的裙下之臣，接下来，你打算如何收尾？</p>
      `;
    },
    choices() {
      const list = [
        {
          label: '听完情报便不再留情，抽干那缕“炁”直接突破链气',
          sub: '既然知道刘信有问题，偏要会一会他（进入第三幕）',
          action: () => {
            Game.setRealm(Math.max(1, Game.run.realm));
            Game.go('act3_butian_guide');
          }
        }
      ];
      if (Game.hasMetaItem('xiantian_qi')) {
        list.unshift({
          label: '【亮底牌】将余下元阳喂给【先天真炁】，压境苟住避开刘信',
          sub: '顺手把瘫软的玉师兄丢在静室里，稳妥等秦宇替自己当出头鸟',
          style: 'trump-card',
          action: () => Game.go('act2_lay_low')
        });
      }
      return list;
    }
  },

  act2_lay_low: {
    act: '第二幕 · 苟道破局',
    title: '潜龙蛰伏 · 秦宇替死',
    location: '外门合欢殿',
    time: '一月后',
    onEnter() {
      Game.markCleared('inner_hub');
      Game.meta.endings['NE_INNER'] = true;
      Game.save();
      SoundFX.victory();
    },
    paragraphs() {
      return `
        <p class="story-para">你将玉素真一身雄厚积累全数喂给了丹田里的【先天真炁】，自身境界纹丝不动。当你装作精疲力竭推开静室门时，守在门外的黑衣道人刘信扫了你一眼，见你并未突破，眼底闪过一丝明显的失望，甩袖扬长而去。</p>
        <p class="story-para">你老老实实在合欢殿蛰伏起来。十几天后，殿内一位名叫“秦宇”的师弟意气风发地突破了链气一层——你躲在廊柱阴影里，亲眼看着闻讯赶来的刘信春风满面地拍着秦宇的肩膀，兴高采烈地将其带上了补天峰。</p>
        <p class="story-para">又过数日，刘信宣布闭关冲关。你仍按兵不动，足足多等了一个月，确认新换的接引师兄敷衍嫌弃、毫无热情之后，才低调引动体内真炁踏入链气一层，顺理成章被领入内门藏书阁！</p>
        <p class="story-para story-notice story-notice-gold">✦ 【第一章 · 普通通关：苟入内门】达成！已解锁【一键托管复刻】至内门筹备！但刘信此仇未报，且他身上藏着对抗筑基大能推算的关键奇宝——你可立即开启【内门筹备支线】，攒齐反杀刘信的终极底牌！</p>
      `;
    },
    choices() {
      return [
        {
          label: '【继续本世】踏入内门藏书阁与善功楼，筹备反杀刘信的底牌！',
          sub: '体验魔门“高利贷老赖流”与“自残炼宝流”，白嫖顶级神通与阵宝',
          style: 'trump-card',
          action: () => {
            Game.setRealm(Math.max(1, Game.run.realm));
            Game.go('inner_hub');
          }
        },
        {
          label: '查看【百世因果树】，或重新谋划其他分支',
          sub: '打开右侧控制台检视当前收集进度',
          action: () => {
            UI.switchConsoleTab('tree');
            UI.switchMobilePane('console');
          }
        }
      ];
    }
  },

  /* ---------------- 第三幕：补天接引（刘信杀局与证伪） ---------------- */
  act3_butian_guide: {
    act: '第三幕',
    title: '补天接引 · 温柔乡里的磨刀石',
    location: '补天峰 · 外门四殿',
    time: '晋升正式弟子当日',
    onEnter() {
      Game.markCleared('act3_butian_guide');
      Game.meta.npcData.liuxin.met = true;
      Game.learnTech('xiantian_daoshu', true);
      Game.save();
    },
    paragraphs() {
      const canAmbush = Game.hasMetaItem('xueyang_jianwan');
      return `
        <p class="story-para">推开合欢殿静室的门，你一眼撞进了一双笑眯眯的眸子。竟是削峰点名那位阴戾黑衣道人——<span class="kw-clue kw-char" data-clue="liuxin_identity" data-char="liuxin">【刘信】</span>。</p>
        <p class="story-para">“整整三日，连门外都听得见玉素真的叫声。师弟好体力，未来必是我圣宗栋梁。”他拍着你的肩，语气亲昵得像亲兄长，领你改录内门命灯、领 50 贡献点，又带你去四殿白嫖新人四件套。</p>
        <p class="story-para">在炼宝殿，执事陈皓殷勤推开一间修炼静室，里面苦修三年的师兄猛地睁眼狂喜大喊“道爷我成啦！”——下一瞬却轰然炸成满天血肉，倒卷融入骷髅，化作一口晶莹剔透的<span class="kw-clue danger" data-clue="guyu_sword">【骨玉剑】</span>落入你手中。刘信甚至专门叮嘱执事：“把最上乘的法器拿给吕师弟！”</p>
        <p class="story-para">安顿进补天峰偏僻洞府后，刘信亲切地将一枚玉简塞进你手心，指腹有意无意擦过你的掌纹：“这是我补天峰秘传《先天道书》上半部。炼成后可逆反先天、化去肉身成先天真炁，道法难伤。师弟好生闭关，过几日师兄再来看你。”</p>
        ${canAmbush ? `<p class="story-para story-notice story-notice-gold">✦ 【前世底牌共鸣】你丹田中的顶级阵宝【血阳剑丸】正发出嗜血轻鸣！你比谁都清楚，十日后月黑风高，刘信会哼着小曲亲自送上门来……</p>` : ''}
      `;
    },
    choices() {
      const list = [];
      if (Game.hasMetaItem('xueyang_jianwan')) {
        list.push({
          label: '【亮底牌 · 钓鱼反杀】不练《先天道书》！提前在洞府门口埋下【血洗天河剑阵】',
          sub: '盘坐蒲团静候刘信深夜上门自投罗网（进入第四幕：地狱真通关路线）',
          style: 'trump-card',
          action: () => {
            Game.run.flags.arrayPlanted = true;
            Game.go('act4_ambush_start');
          }
        });
      }
      list.push({
        label: '将《先天道书》上半部悉心研读，闭关十日修炼“逆反先天”',
        sub: '这门六品真功法术齐全，练成后便能化去凡胎',
        action: () => Game.go('act3_cultivate')
      });
      return list;
    }
  },

  act3_cultivate: {
    act: '第三幕',
    title: '灵台警兆 · 因果证伪',
    location: '补天峰洞府',
    time: '闭关十日后',
    onEnter() {
      Game.run.hasDisease = false;
      Game.unlockClue('daoshu_heal', true);
    },
    paragraphs() {
      return `
        <p class="story-para">十日后，洞府内白炁蒸腾氤氲，聚散无常。你凭虚踏空，竟真的化去了五脏六腑与皮肉筋骨，将自身炼成了一道飘逸如仙的【先天真炁】！</p>
        <p class="story-para">更令你惊喜的是，连原身那缠绵难愈的花柳恶疾也在<span class="kw-clue" data-clue="daoshu_heal">【十日蜕形化炁后不药而愈】</span>，整个人神清气爽，仿佛脱胎换骨。</p>
        <p class="story-para story-dialogue-amber">“……嗯？等等，不对。”</p>
        <p class="story-para">志得意满的瞬间，一丝寒意毫无征兆地窜上你的脊背。这一世顺利得太诡异了——似乎有一处极致命的逻辑漏洞被你忽略了！</p>
        <p class="story-para story-muted">就在此时，洞府石门外，突然响起了刘信熟悉而温柔的轻唤：“吕师弟，出关了吗？师兄来看你了。”</p>
      `;
    },
    customWidget() {
      const clueCards = Game.meta.clues.map(cid => {
        const c = CLUES_DB[cid];
        if (!c) return '';
        const sel = Game.deductionPicks.includes(cid);
        return `
          <button type="button" onclick="Game.toggleDeductionClue('${cid}')" class="clue-pick-btn ${sel ? 'selected' : ''}">
            <div class="clue-pick-title">${sel ? '◉ ' : '○ '}${c.title}</div>
            <div class="clue-pick-text">${c.text}</div>
          </button>
        `;
      }).join('');

      return `
        <div class="widget-box widget-box-amber">
          <div class="widget-head">
            <span class="widget-title-amber">⚡ 灵台警兆 · 因果证伪（选出两条互相矛盾的线索）</span>
            <span class="widget-hint">已选 ${Game.deductionPicks.length} / 2</span>
          </div>
          <div class="deduction-grid">
            ${clueCards}
          </div>
          <button type="button" onclick="Game.submitDeduction()" class="btn-primary btn-full" style="min-height:40px;font-size:13px;">
            推演因果 · 识破破绽
          </button>
        </div>
      `;
    },
    choices() {
      return [
        {
          label: '不疑有他，欢喜起身打开洞府石门迎接刘师兄',
          sub: '刘师兄如此厚爱，定是来传授下半部筑基秘法的！',
          action: () => Game.triggerDeath('BE4')
        }
      ];
    }
  },

  act3_truth_revealed: {
    act: '第三幕',
    title: '如坠冰窟 · 人药陷阱',
    location: '补天峰洞府',
    time: '石门之外',
    paragraphs() {
      return `
        <p class="story-para" style="color:#fca5a5;font-weight:600;">电光石火间，你彻底如坠冰窟！</p>
        <p class="story-para">第一世，玉素真同样晋升了正式弟子，可他却因花柳病卧床数月惨死！《先天道书》短短十日就能蜕形化炁、令恶疾不药而愈，玉素真为何不练？除非——正式弟子根本不发《先天道书》！这是刘信专门为你一个人准备的陷阱！</p>
        <p class="story-para">难怪他在炼宝殿特意让陈皓给你挑最好的骨玉剑！等你死了，你的肉身真炁归他突破，你的全套新人福利也全进他的腰包！</p>
        <p class="story-para">“咔嚓！”话音未落，洞府阵法轰然爆裂，一道剑光撕开石门。刘信衣袂飘飞踱步而入，看着你露出丰收般病态的狂喜：“师弟果然是个人才……”</p>
      `;
    },
    choices() {
      return [
        {
          label: '暴起炸开先天真炁，裹挟骨玉剑全力偷袭刘信！',
          sub: '既然横竖难逃，拼死也要试出他的真实底细！',
          style: 'trump-card',
          action: () => Game.triggerDeath('BE5')
        },
        {
          label: '干脆躺平放弃反抗，冷笑记下此仇等待翻页',
          sub: '“你能骗我一次，可我还有无数次！”',
          action: () => Game.triggerDeath('BE5')
        }
      ];
    }
  },

  /* ---------------- 内门筹备支线（毒副作用白嫖流） ---------------- */
  inner_hub: {
    act: '内门筹备支线',
    title: '牛马修仙传 · 毒副作用白嫖流',
    location: '补天峰 · 善功楼与藏书阁',
    time: '晋升内门首月',
    paragraphs() {
      const loaned = Game.run.flags.tookLoans;
      return `
        <p class="story-para">低调踏入内门后，现实立刻给了你一记重拳：修炼洞府月租 30 贡献点，藏书阁功法贷年利率高达 36%（贷 1000 还 4600），善功楼那位笑面执事【赵旭河】更是殷勤塞给你三河会 500 贡献点高利贷，忽悠你买种子种阴阳仙葩。</p>
        <p class="story-para">你拨着算盘一算，好家伙——老实打工种花一年，房租加本息刚好把收入啃得一干二净，纯纯魔门牛马！</p>
        ${loaned
          ? `<p class="story-para story-notice story-notice-gold">✦ 你已施展【魔门老赖流】白嫖贷款嗑药冲破至 <strong>链气四层（中期）</strong>，反杀了夜闯洞府的三名黑衣惯犯，缴获隐匿奇功《敛气决》与自爆神通《杀生咒》，更打探到了刘信深夜杀新弟子前【必亲手布设隔音幻阵】的习惯！如今还款期限将至，你打算如何利用这一世的剩余价值？</p>`
          : `<p class="story-para">然而，你眼神骤亮：高利贷对别人是天坑，对拥有【百世书】的你来说，上辈子的债关下辈子什么事？你完全可以把这一世当作“无本白嫖实验田”！</p>`
        }
      `;
    },
    choices() {
      const list = [];
      if (!Game.run.flags.tookLoans) {
        list.push({
          label: '【魔门老赖流】全款背债白嫖《神霄御剑真决》+ 贷款买丹药硬冲链气中期！',
          sub: '不种花、不还债，顺手钓鱼反杀窥伺你丹药的黑衣惯犯',
          style: 'trump-card',
          action: () => {
            Game.run.flags.tookLoans = true;
            Game.setRealm(Math.max(4, Game.run.realm));
            Game.learnTech('lianqi_jue', false);
            Game.learnTech('shasheng_zhou', false);
            Game.learnTech('longhu_fu', true);
            Game.unlockClue('liuxin_array', false);
            UI.toast('⚡ 破境与缴获', '借助【先天真炁】冲破中期瓶颈达链气四层！缴获《敛气决》《杀生咒》与刘信暗账！', 'gold');
            UI.renderScene();
          }
        });
        list.push({
          label: '老实人路线：按赵旭河说的买十枚阴阳仙葩种子，起早贪黑种花还贷',
          sub: '勤劳致富，争取早日成为优秀魔门员工',
          action: () => Game.triggerDeath('END_NIUMA')
        });
      } else {
        list.push({
          label: '【自残炼宝流】修炼活剥人皮的禁术《天魔化血神光》+ 死磕阵法二十年！',
          sub: '反正这世要重开！舍弃寿命与仙途，坐化前炼出顶级阵宝【血阳剑丸】带回下世',
          style: 'trump-card',
          action: () => Game.go('inner_refine')
        });
        list.push({
          label: '【体面老赖跑路】直接催动《杀生咒》自爆重开，带回链气四层修为',
          sub: '把满屋高利贷欠条炸成飞灰（适合先体验带修为重开）',
          action: () => Game.triggerDeath('END_SELF_BOOM')
        });
      }
      return list;
    }
  },

  inner_refine: {
    act: '内门筹备支线',
    title: '活剥人皮 · 二十年铸阵宝',
    location: '万宝峰地火炉 → 外门破洞府',
    time: '二十年弹指过',
    onEnter() {
      Game.learnTech('jianzhen_tu', true);
      Game.setRealm(Math.max(7, Game.run.realm));
    },
    paragraphs() {
      return `
        <p class="story-para">你从藏书阁老前辈王柏荣口中得知了一门副作用大到无人敢练的绝世魔功——《天魔化血神光》。需以飞剑活剥自身人皮血祭九九八十一日，炼成后化身血影、寿命减半、修为永停，自绝仙途。</p>
        <p class="story-para">“这世的副作用，关下世的我什么事？”你往嘴里塞块破布，连麻沸散都不服，硬生生熬过八十一日剧痛，将血影融进本命剑丸，甚至在剧痛磨砺下冲破链气七层！</p>
        <p class="story-para">此后二十年，你干脆退了内门高价洞府，窝在外门啃透了《阵宝秘解》那宛若天道屎山代码的阵纹。直到四十岁大限将至、血影几近溃散的最后一刹那，你嘴角咧开疯狂的弧度——</p>
        <p class="story-para" style="color:#fcd34d;font-weight:700;">“哈哈哈！《血洗天河剑阵图》，成了！血阳剑丸，随我入百世书！”</p>
      `;
    },
    choices() {
      return [{
        label: '含笑坐化 · 结算带回顶级阵宝【血阳剑丸】',
        sub: '务必在结算界面选【一、保留宝物】！下一世回去找刘信算总账！',
        style: 'trump-card',
        action: () => Game.triggerDeath('END_REFINE')
      }];
    }
  },

  /* ---------------- 第四幕：地狱真通关（洞府反杀刘信 & 欺天窃命） ---------------- */
  act4_ambush_start: {
    act: '第四幕 · 终局反杀',
    title: '月黑风高 · 瓮中捉鳖',
    location: '补天峰洞府',
    time: '十日后子夜',
    onEnter() {
      Game.markCleared('act4_ambush_start');
    },
    paragraphs() {
      return `
        <p class="story-para">十日之期一到，月黑风高。你早就料到刘信的德行——门外传来轻微的阵旗落地声，他正哼着小曲、一丝不苟地在你洞府外布设隔音与幻象大阵，生怕待会儿里面传出半分动静。</p>
        <p class="story-para">“咔嚓！”剑光撕裂石门，刘信志得意满踱步而入，唇角挂着那副令你记忆犹新的温柔冷笑：“吕师弟，别躲了，师兄我就需要你这样的人材……！？”</p>
        <p class="story-para">声音戛然而止。洞府蒲团之上，你衣袍齐整、似笑非笑地抬起眼，哪有半分炼化肉身的虚弱模样！刘信瞳孔骤缩，袖中一杆漆黑旗幡几乎要脱手而出！</p>
      `;
    },
    choices() {
      return [
        {
          label: '【亮底牌 · 一瞬绝杀】猛然引爆门槛预埋的【血阳剑丸 · 血洗天河剑阵图】！',
          sub: '不给他摇幡的机会！借他自己布的隔音阵关门打狗！',
          style: 'trump-card',
          action: () => Game.go('act4_interrogate')
        },
        {
          label: '光明正大亮出底牌，与他堂堂正正斗法一雪前耻',
          sub: '给他一个呼吸的喘息之机，看看他袖中究竟藏着什么',
          action: () => Game.triggerDeath('BE6')
        }
      ];
    }
  },

  act4_interrogate: {
    act: '第四幕 · BL高能审讯',
    title: '角色互换 · 谁才是人材',
    location: '补天峰洞府 · 血河剑阵内',
    time: '子夜',
    onEnter() {
      UI.fxShake();
      UI.fxVignette('blood', 950);
      Game.meta.npcData.liuxin.caibu = 80;
      Game.meta.npcData.liuxin.alert = 100;
      Game.save();
    },
    paragraphs() {
      return `
        <p class="story-para">猩红阵纹自他脚下轰然炸开！血河天降，天魔化血神光在阵内如影随形、根本避无可避！刘信引以为傲的隔音阵反倒彻底封死了他的求救声，短短一瞬，他一身链气六层的雄浑真气与气血就被抽干大半，狼狈不堪地跪摔在你身前！</p>
        <p class="story-para">黑衣道袍凌乱散开，平日里游刃有余、把新人当药渣把玩的笑面虎师兄此刻苍白如雪、冷汗顺着紧绷的脖颈滑入领口，眼底满是惊骇与难以置信。</p>
        <p class="story-para story-dialogue-pink">“你……你到底是谁！？”他死死撑着地面发颤，声音嘶哑却仍试图拿筹码诱你，“别杀我！我对你有用……我有一门直指筑基的道书，我袖中的万灵幡里还藏着圣宗真传的天大隐秘！只要你放我一马，这些全都是你的——”</p>
        <p class="story-para">你缓步走到他身前蹲下，指尖轻挑起他染血的下颌，看着那双昔日俯视自己的阴戾眸子此刻盛满卑微求饶。</p>
      `;
    },
    choices() {
      return [
        {
          label: '冷笑：“糊涂，杀了你，那些照样是我的——连你也是我的！”',
          sub: '催动化血神光吸干刘信，夺取【万灵幡】与【先天神符】，将他炼入幡中！',
          style: 'trump-card',
          action: () => {
            if (!Game.meta.items.includes('wanling_fan')) Game.meta.items.push('wanling_fan');
            if (!Game.meta.items.includes('shenfu')) Game.meta.items.push('shenfu');
            Game.meta.npcData.liuxin.enslaved = true;
            Game.meta.npcData.liuxin.caibu = 100;
            Game.save();
            UI.toast('🎁 夺获绝世奇宝', '获得【先天一炁万灵幡】与【先天混元一炁神符】！', 'gold');
            Game.go('act4_banner_test');
          }
        },
        {
          label: '念他长得俊俏又有底细，心软签下法契放他一马',
          sub: '留他活口，也许他会知恩图报？',
          style: 'bl-route',
          action: () => Game.triggerDeath('BE7')
        }
      ];
    }
  },

  act4_banner_test: {
    act: '第四幕 · 欺天窃命',
    title: '幡中恶鬼 · 天机验真',
    location: '补天峰洞府',
    time: '黎明前夕',
    onEnter() {
      Game.meta.npcData.chenxinan.met = true;
      Game.unlockClue('chenxinan_soul', true);
      Game.save();
    },
    paragraphs() {
      return `
        <p class="story-para">红光散尽，刘信化作一张空荡人皮。你探手夺过【先天一炁万灵幡】与他贴身藏着的泛黄符纸——【先天混元一炁神符】，随即摇动黑幡，故意保留了他生前的全部记忆，将他重新显化出来。</p>
        <p class="story-para">“吕师弟……不可能！你怎么懂得催动万灵幡？！”刘信刚一苏醒便目眦欲裂，可你只是冷冷一句“需要我教教你怎么当幡灵吗”，他便双腿一软直挺挺跪倒在地，满腔怨毒瞬间被法宝扭曲成扭曲的狂热忠诚，俯首低声颤唤：“大人饶命！刘信见过大人！”（万灵幡996画符流水线员工+1）</p>
        <p class="story-para">你再度轻抖黑幡。一袭黑袍猎猎的俊朗青年踱步而出——正是补天峰主失踪多年的亲传之子【陈信安】。他见刘信跪伏如狗，顿时仰天大笑，随后转头风流一笑，冲你抛出重磅诱饵：</p>
        <p class="story-para story-dialogue-amber">“不愧是我圣宗师弟！你替我杀了刘信解了心头大恨，我送你云海葫芦岛一座密藏，乃至一桩筑基机缘作为报答，如何？留我一命，日后我必助你扶摇直上。”</p>
      `;
    },
    choices() {
      return [
        {
          label: '【真结局抉择】冷笑拍散陈信安真灵，握紧【先天混元一炁神符】静坐验天机！',
          sub: '“少给自己脸上贴金了，圣宗哪有好人！”顺便拿补天峰主测一测神符的成色！',
          style: 'trump-card',
          action: () => Game.go('act4_true_ending')
        },
        {
          label: '心动于筑基机缘，留陈信安一命并记下葫芦岛密藏坐标',
          sub: '多一个真传师兄指路，何乐而不为？',
          action: () => Game.triggerDeath('BE7b')
        }
      ];
    }
  },

  act4_true_ending: {
    act: '第一章 · 地狱真通关',
    title: '欺天窃命 · 筑基之眸',
    location: '补天峰洞府',
    time: '晨曦微露',
    onEnter() {
      Game.meta.endings['TE_CH1'] = true;
      Game.meta.trueEndingUnlocked = true;
      Game.meta.npcData.chenxinan.shattered = true;
      Game.save();
      SoundFX.pressure();
      UI.fxShake();
      UI.fxVignette('true-man', 2600);
      setTimeout(() => SoundFX.victory(), 1600);
    },
    paragraphs() {
      return `
        <p class="story-para">“不——！”在陈信安惊恐不甘的惨叫中，你毫不犹豫抬手一掌，直接拍散了他寄托在万灵幡上的真灵！</p>
        <p class="story-para">补天峰主在高维因果上居高临下视凡修如草芥，今日你便先灭他爱子真灵、再借他威压验你手里的神符！你收起万灵幡，握紧胸口泛黄的【先天混元一炁神符】，端坐蒲团静静等待。</p>
        <p class="story-para story-danger-bold">轰隆——！！整座补天峰骤然剧震！</p>
        <p class="story-para">苍穹之上，仿佛有一双皓如日月、不怒自威的巨大眼眸无声睁开！泰山压顶般的恐怖神识如狂涛巨浪扫过整座山峰，无数正在闭关的正式弟子纷纷呕血跪伏。筑基真人——补天峰主正在借杀子因果横推天机，搜捕真凶！</p>
        <p class="story-para">你配合着装出一副惊惧瑟缩的模样，冷汗浸湿中衣，胸口的【先天混元一炁神符】却散发着微不可察的温润微光。整整半个时辰，那足以一指碾死你的真君级威压反复扫过你的洞府，最终竟毫无所获地怒极退去！</p>
        <p class="story-para story-notice story-notice-gold">✦ 【第一章 · 地狱真通关：欺天窃命】达成！你以数世轮回之血，硬生生在筑基大能眼皮底下撕开了因果封锁。自此，万灵幡归你、神符归你，三品真功与天道果位的棋盘正式向你敞开！</p>
      `;
    },
    choices() {
      return [
        {
          label: '✦ 展开【天道果位谱（初探）】与第二章预告',
          sub: '查看补天峰主、鸿运道人、城头土与覆灯火背后的因果大局',
          style: 'trump-card',
          action: () => UI.openCodex()
        },
        {
          label: '重开新的一世（保留全部跨世底牌，查漏补缺收集所有 BE 结局）',
          sub: '不消耗百世书页数，自由回溯第一章探索未解锁支线',
          action: () => Game.startNewRun(true)
        }
      ];
    }
  }
};

/*************************************************************************
 * 6. UI 渲染器（隐藏目录 + 居中线索框 + 遇选项弹框）
 *************************************************************************/
const UI = {
  choiceAutoPopped: false,
  _eventsBound: false,
  _codexOpen: false,

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    const bindBackdropClose = (id, closer) => {
      const el = document.getElementById(id);
      if (el && typeof el.addEventListener === 'function') {
        el.addEventListener('click', (e) => {
          if (e.target === el) closer();
        });
      }
    };
    bindBackdropClose('menuModal', () => this.closeMenuModal());
    bindBackdropClose('choiceModal', () => this.closeChoiceModal());
    bindBackdropClose('clueModal', () => this.closeClueModal());
    bindBackdropClose('codexModal', () => this.closeCodex());
    bindBackdropClose('resetModal', () => this.closeResetModal());
  },

  hasBlockingModal() {
    const ids = ['menuModal', 'choiceModal', 'clueModal', 'deathModal', 'codexModal', 'resetModal', 'gameOverModal'];
    return ids.some(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
  },

  fxShake() {
    const root = document.getElementById('appRoot');
    root.classList.remove('shake-heavy');
    void root.offsetWidth;
    root.classList.add('shake-heavy');
  },

  fxVignette(type, duration = 1200) {
    const ov = document.getElementById('vignetteOverlay');
    ov.className = '';
    void ov.offsetWidth;
    ov.classList.add(type);
    setTimeout(() => { ov.className = ''; }, duration);
  },

  toast(title, desc, style = 'normal') {
    const box = document.getElementById('toastContainer');
    const el = document.createElement('div');
    const styleCls = style === 'gold' ? 'toast-gold' : (style === 'red' ? 'toast-red' : '');
    el.className = `toast-item ${styleCls}`;
    el.innerHTML = `<div style="font-size:12px;font-weight:700;margin-bottom:2px;">${title}</div><div style="font-size:11.5px;opacity:0.9;line-height:1.55;">${desc}</div>`;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 320);
    }, 3800);
  },

  openMenuModal() {
    SoundFX.click();
    const m = document.getElementById('menuModal');
    if (m) m.classList.remove('hidden');
    const dot = document.getElementById('mobileClueDot');
    if (dot) dot.classList.add('hidden');
    this.renderConsole();
  },

  closeMenuModal() {
    const m = document.getElementById('menuModal');
    if (m) m.classList.add('hidden');
  },

  openChoiceModal() {
    SoundFX.click();
    const scene = SCENES[Game.run.node];
    const titleEl = document.getElementById('choiceModalTitle');
    if (titleEl && scene) titleEl.textContent = `${scene.act} · 面临抉择`;
    const m = document.getElementById('choiceModal');
    if (m) m.classList.remove('hidden');
  },

  closeChoiceModal() {
    const m = document.getElementById('choiceModal');
    if (m) m.classList.add('hidden');
  },

  openClueModal(clue, isNew) {
    if (!clue) return;
    document.getElementById('clueModalBadge').textContent = isNew ? '✨ 新收录天机' : '🔍 内视批注';
    document.getElementById('clueModalTag').textContent = clue.tag;
    document.getElementById('clueModalTitle').textContent = clue.title;
    document.getElementById('clueModalText').textContent = clue.text;
    const btnConfirm = document.getElementById('btnConfirmClue');
    if (btnConfirm) btnConfirm.textContent = '收入手札';
    const m = document.getElementById('clueModal');
    if (m) m.classList.remove('hidden');
  },

  openCharIntroModal(charKey) {
    const info = CHAR_INTRO_DB[charKey];
    if (!info) return;
    SoundFX.click();
    document.getElementById('clueModalBadge').textContent = info.badge;
    document.getElementById('clueModalTag').textContent = info.tag;
    document.getElementById('clueModalTitle').textContent = info.title;
    document.getElementById('clueModalText').textContent = info.text;
    const btnConfirm = document.getElementById('btnConfirmClue');
    if (btnConfirm) btnConfirm.textContent = '知晓';
    const m = document.getElementById('clueModal');
    if (m) m.classList.remove('hidden');
  },

  closeClueModal() {
    const m = document.getElementById('clueModal');
    if (m) m.classList.add('hidden');
  },

  switchMobilePane(pane) {
    Game.mobilePane = pane;
    if (pane === 'console') {
      this.closeChoiceModal();
      this.openMenuModal();
    } else {
      this.closeMenuModal();
    }
  },

  switchConsoleTab(tab) {
    Game.consoleTab = tab;
    SoundFX.click();
    ['cards', 'grimoire', 'tree'].forEach(t => {
      const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
      if (!btn) return;
      btn.classList.toggle('active', t === tab);
    });
    this.renderConsole();
  },

  renderScene() {
    const scene = SCENES[Game.run.node];
    if (!scene) return;

    document.getElementById('stageAct').textContent = scene.act;
    document.getElementById('stageTitle').textContent = scene.title;
    document.getElementById('stageLocation').textContent = `📍 ${scene.location}`;
    document.getElementById('stageTime').textContent = `⏳ ${scene.time}`;

    const choices = scene.choices();
    const hasWidget = typeof scene.customWidget === 'function';
    const enabledChoices = choices.filter(c => c && !c.disabled);
    const isSingleContinue = enabledChoices.length === 1 && !hasWidget;

    const topChoiceBtn = document.getElementById('btnTopChoice');
    if (topChoiceBtn) topChoiceBtn.classList.toggle('hidden', isSingleContinue);

    const vp = document.getElementById('storyViewport');
    const triggerHtml = isSingleContinue
      ? `
        <div id="chapterEndTrigger" class="chapter-end-trigger">
          <div class="chapter-end-line">—— 本节完 ——</div>
          <button id="btnOpenChoices" type="button" class="open-choices-btn">下一页 · ${enabledChoices[0].label} →</button>
        </div>
      `
      : `
        <div id="chapterEndTrigger" class="chapter-end-trigger">
          <div class="chapter-end-line">—— 本节完 · 面临抉择 ——</div>
          <button id="btnOpenChoices" type="button" class="open-choices-btn">⚔️ 面临抉择 · 展开选项</button>
        </div>
      `;
    vp.innerHTML = scene.paragraphs() + triggerHtml;

    const bindKeywordEl = (el) => {
      if (!el || el._kwBound) return;
      el._kwBound = true;
      const cid = el.dataset.clue;
      const charKey = el.dataset.char;
      if (cid && Game.hasClue(cid)) el.classList.add('collected');
      el.addEventListener('click', () => {
        if (charKey) {
          if (cid) Game.unlockClue(cid, true);
          UI.openCharIntroModal(charKey);
        } else if (cid) {
          Game.unlockClue(cid, false);
        }
      });
    };
    vp.querySelectorAll('.kw-clue').forEach(bindKeywordEl);
    vp.querySelectorAll('.kw-char').forEach(bindKeywordEl);

    const openBtn = document.getElementById('btnOpenChoices');
    if (openBtn && typeof openBtn.addEventListener === 'function') {
      openBtn.addEventListener('click', () => {
        if (isSingleContinue) {
          SoundFX.click();
          enabledChoices[0].action();
        } else {
          UI.openChoiceModal();
        }
      });
    }

    const deck = document.getElementById('actionDeck');
    let html = '';
    if (hasWidget) {
      html += scene.customWidget();
    }
    choices.forEach((ch, idx) => {
      const styleClass = ch.style === 'trump-card' ? 'trump-card' : (ch.style === 'bl-route' ? 'bl-route' : '');
      html += `
        <button type="button" data-cidx="${idx}" ${ch.disabled ? 'disabled' : ''} class="choice-btn ${styleClass}">
          <div class="choice-label">${ch.label}</div>
          ${ch.sub ? `<div class="choice-sub">${ch.sub}</div>` : ''}
        </button>
      `;
    });
    deck.innerHTML = html;

    deck.querySelectorAll('button[data-cidx]').forEach(btn => {
      const idx = Number(btn.dataset.cidx);
      btn.addEventListener('click', () => {
        if (choices[idx] && !choices[idx].disabled) {
          const prevNode = Game.run.node;
          SoundFX.click();
          choices[idx].action();
          if (Game.pendingDeath || Game.run.node !== prevNode || UI._codexOpen) {
            UI.closeChoiceModal();
          }
        }
      });
    });
  },

  renderConsole() {
    document.getElementById('statPages').textContent = Game.meta.pagesLeft;
    document.getElementById('statCycle').textContent = `第 ${Game.meta.cycle} 世`;
    document.getElementById('statRealm').textContent = REALM_NAMES[Game.run.realm] || '凡人';
    document.getElementById('clueBadge').textContent = Game.meta.clues.length;

    const codexBtn = document.getElementById('btnFruitCodex');
    if (Game.meta.trueEndingUnlocked) codexBtn.classList.remove('hidden');
    else codexBtn.classList.add('hidden');

    const tagsEl = document.getElementById('statusTags');
    const tags = [];
    if (Game.run.hasDisease) tags.push('<span class="status-pill pill-red">☣ 花柳恶疾</span>');
    else tags.push('<span class="status-pill pill-green">✦ 恶疾已除</span>');
    if (Game.run.isStealth) tags.push('<span class="status-pill pill-indigo">🌑 已敛息</span>');
    if (Game.hasMetaItem('shenfu')) tags.push('<span class="status-pill pill-gold">🛡 天机已蔽</span>');
    tagsEl.innerHTML = tags.join('');

    const artsEl = document.getElementById('quickArts');
    const arts = [];
    if (Game.hasTech('lianqi_jue') && Game.run.realm > 0) {
      arts.push(`<button type="button" onclick="Game.toggleStealth();UI.closeMenuModal();" class="btn-tool" style="border-color:rgba(129,140,248,0.55);color:#c7d2fe;">${Game.run.isStealth ? '撤敛气' : '运敛气决'}</button>`);
    }
    if (Game.hasTech('shasheng_zhou')) {
      arts.push(`<button type="button" onclick="Game.triggerSelfBoom()" class="btn-tool btn-tool-danger" title="催动杀生咒自爆，立刻翻页重开">💥 杀生自爆</button>`);
    }
    artsEl.innerHTML = arts.join('');

    const body = document.getElementById('consoleBody');
    if (Game.consoleTab === 'cards') {
      body.innerHTML = this.buildCardsTab();
    } else if (Game.consoleTab === 'grimoire') {
      body.innerHTML = this.buildGrimoireTab();
    } else {
      body.innerHTML = this.buildTreeTab();
    }
  },

  buildCardsTab() {
    const talentHtml = Game.meta.talents.length
      ? Game.meta.talents.map(tid => {
          const t = TALENTS_DB[tid];
          return `<div class="ink-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-weight:700;color:#fef3c7;">${t.name}</span><span class="status-pill ${t.color}">${t.tier}</span></div><p style="margin:0;font-size:12px;color:#a8a29e;">${t.desc}</p></div>`;
        }).join('')
      : '<div class="empty-note">尚未觉醒跨世天赋（提示：在合欢殿以弱杀强后选择觉醒天赋）</div>';

    const itemHtml = Game.meta.items.length
      ? Game.meta.items.map(iid => {
          const it = ITEMS_DB[iid];
          return `<div class="ink-card" style="border-color:rgba(212,175,55,0.38);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-weight:700;color:#fcd34d;">✦ ${it.name}</span><span class="status-pill pill-red">${it.tier}</span></div><p style="margin:0;font-size:12px;color:#a8a29e;">${it.desc}</p></div>`;
        }).join('')
      : '<div class="empty-note">尚未带回永久宝物</div>';

    const techHtml = Game.meta.techniques.length
      ? Game.meta.techniques.map(k => {
          const tc = TECHNIQUES_DB[k];
          return `<div class="ink-card" style="padding:9px 11px;"><div style="font-size:12.5px;font-weight:700;color:#e7e5e4;">${tc.name}</div><div style="font-size:11.5px;color:#a8a29e;margin-top:3px;">${tc.desc}</div></div>`;
        }).join('')
      : '<div class="empty-note">尚未习得记忆功法</div>';

    return `
      <div>
        <h3 class="section-heading">✦ 永久天赋</h3>
        <div class="stack-sm">${talentHtml}</div>
      </div>
      <div>
        <h3 class="section-heading">✦ 跨世宝物</h3>
        <div class="stack-sm">${itemHtml}</div>
      </div>
      <div>
        <h3 class="section-heading">✦ 记忆功法（零成本永存）</h3>
        <div class="stack-sm">${techHtml}</div>
      </div>
    `;
  },

  buildGrimoireTab() {
    const clueHtml = Game.meta.clues.length
      ? Game.meta.clues.map(cid => {
          const c = CLUES_DB[cid];
          return `
            <div class="ink-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:700;font-size:12.5px;color:#fde68a;">${c.title}</span>
                <span class="status-pill pill-gold">${c.tag}</span>
              </div>
              <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">${c.text}</p>
            </div>
          `;
        }).join('')
      : '<div class="empty-note">尚无情报。请点击正文中的高亮词收集线索！</div>';

    const npcHtml = Object.keys(NPCS_DB).map(nid => {
      const base = NPCS_DB[nid];
      const st = Game.meta.npcData[nid];
      if (!st.met) {
        return `<div class="ink-card" style="font-size:12px;color:#78716c;">【？？？】尚未遭遇此人</div>`;
      }
      const truthRevealed = Game.hasClue(base.truthClue);
      const statusNote = st.enslaved ? '已炼为忠心幡灵' : (st.sealed ? '已种下双修烙印' : (st.shattered ? '真灵已拍散' : '活跃中'));
      return `
        <div class="ink-card" style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="font-weight:700;color:#fef3c7;">${base.name}</span>
              <span style="font-size:11px;color:#f9a8d4;margin-left:6px;">${base.role}</span>
            </div>
            <span class="status-pill" style="background:#292524;color:#d6d3d1;">${statusNote}</span>
          </div>
          <div style="font-size:12px;color:#a8a29e;"><strong style="color:#d6d3d1;">表面画皮：</strong>${base.surface}</div>
          <div style="font-size:12px;color:${truthRevealed ? '#fca5a5' : '#78716c'};font-style:${truthRevealed ? 'normal' : 'italic'};">
            <strong>撕开真相：</strong>${truthRevealed ? base.truth : '尚未识破其致命底细（死一次或审讯可解锁）'}
          </div>
          <div class="progress-grid">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#f9a8d4;"><span>走肾/采补度</span><span>${st.caibu}%</span></div>
              <div class="progress-track"><div class="progress-fill-pink" style="width:${st.caibu}%"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#fcd34d;"><span>警觉/掌控度</span><span>${st.alert}%</span></div>
              <div class="progress-track"><div class="progress-fill-amber" style="width:${st.alert}%"></div></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <h3 class="section-heading section-heading-pink">✦ BL 人物暗账</h3>
        <div class="stack-sm">${npcHtml}</div>
      </div>
      <div>
        <h3 class="section-heading">✦ 前世情报手札 (${Game.meta.clues.length})</h3>
        <div class="stack-sm">${clueHtml}</div>
      </div>
    `;
  },

  buildTreeTab() {
    const jumps = [
      { key: 'act2_hehuan_reverse', label: '直奔合欢殿 · 反杀玉素真', req: () => Game.meta.clearedNodes.includes('act2_hehuan_reverse') && Game.hasTalent('shuangxiu') },
      { key: 'act3_butian_guide', label: '直奔补天接引 · 应对刘信', req: () => Game.meta.clearedNodes.includes('act3_butian_guide') && Game.hasTalent('shuangxiu') },
      { key: 'inner_hub', label: '直奔内门筹备 · 老赖与炼宝', req: () => Game.meta.clearedNodes.includes('inner_hub') && Game.hasMetaItem('xiantian_qi') },
      { key: 'act4_ambush_start', label: '直奔洞府剑阵 · 终局反杀刘信', req: () => Game.meta.clearedNodes.includes('act4_ambush_start') && Game.hasMetaItem('xueyang_jianwan') }
    ];

    const jumpHtml = jumps.map(j => {
      const ok = j.req();
      return ok
        ? `<button type="button" onclick="Game.quickJump('${j.key}')" class="choice-btn" style="min-height:40px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;"><span style="color:#fde68a;font-weight:700;">⚡ ${j.label}</span><span style="color:#fbbf24;font-size:11px;">一键复刻 →</span></button>`
        : `<div class="ending-row"><span>🔒 ${j.label}</span><span>未打通前置</span></div>`;
    }).join('');

    const mainEndings = [
      { id: 'BE0', label: 'BE0 · 匹夫怀璧', type: 'be' },
      { id: 'BE1', label: 'BE1 · 天生灵童', type: 'be' },
      { id: 'BE2', label: 'BE2 · 干枯药渣', type: 'be' },
      { id: 'BE3', label: 'BE3 · 顺天易，逆天难', type: 'be' },
      { id: 'BE4', label: 'BE4 · 人药嫁衣', type: 'be' },
      { id: 'BE5', label: 'BE5 · 待宰人材', type: 'be' },
      { id: 'END_NIUMA', label: '番外 · 魔门老实人', type: 'be' },
      { id: 'END_REFINE', label: '炼宝 · 疯魔阵痴坐化', type: 'gold' },
      { id: 'NE_INNER', label: '普通通关 · 苟入内门', type: 'gold' },
      { id: 'BE6', label: 'BE6 · 真传压顶', type: 'be' },
      { id: 'BE7', label: 'BE7 · 农夫与蛇', type: 'be' },
      { id: 'BE7b', label: 'BE7b · 引狼入室', type: 'be' },
      { id: 'TE_CH1', label: '地狱真通关 · 欺天窃命', type: 'te' }
    ];

    const unlockedCount = mainEndings.filter(e => Game.meta.endings[e.id]).length;
    const endHtml = mainEndings.map(e => {
      const got = !!Game.meta.endings[e.id];
      if (!got) {
        return `<div class="ending-row"><span>${e.id.startsWith('BE') ? e.id + ' · ？？？' : '？？？'}</span><span>未触发</span></div>`;
      }
      const badge = e.type === 'te' ? '👑 真通关' : (e.type === 'gold' ? '✦ 达成' : '💀 已踩坑');
      return `<div class="ending-row ${e.type}"><span>${e.label}</span><span>${badge}</span></div>`;
    }).join('');

    return `
      <div>
        <h3 class="section-heading">⚡ 一键托管复刻（跳过已通流程）</h3>
        <div class="stack-sm">${jumpHtml}</div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h3 class="section-heading section-heading-red" style="margin:0;">💀 百世因果与结局收集</h3>
          <span style="font-size:12px;color:#a8a29e;">${unlockedCount} / ${mainEndings.length}</span>
        </div>
        <div class="stack-sm">${endHtml}</div>
      </div>
    `;
  },

  openDeathModal(beId) {
    const data = ENDINGS_DB[beId];
    if (!data) return;
    const modal = document.getElementById('deathModal');
    document.getElementById('deathCode').textContent = data.code;
    document.getElementById('deathTag').textContent = data.tag;
    document.getElementById('deathTitle').textContent = data.title;
    document.getElementById('deathPagesInfo').textContent = `残页 ${Game.meta.pagesLeft} → ${Math.max(0, Game.meta.pagesLeft - 1)}`;
    document.getElementById('deathAftermath').textContent = data.aftermath;
    document.getElementById('deathVerdict').textContent = data.verdict;

    const isBurned = Game.meta.burnedHints.includes(beId);
    const btnBurn = document.getElementById('btnBurnHint');
    const directEl = document.getElementById('deathDirectHint');
    const deathCnt = Game.meta.endingCounts[beId] || 1;

    if (isBurned) {
      btnBurn.classList.add('hidden');
      directEl.classList.remove('hidden');
      directEl.textContent = data.directHint;
    } else {
      btnBurn.classList.remove('hidden');
      directEl.classList.add('hidden');
      btnBurn.classList.toggle('pulse-crimson', deathCnt >= 2);
      btnBurn.textContent = deathCnt >= 2
        ? '🔥 卡关推荐 · 焚页叩天机（耗 1 页）'
        : '🔥 焚页叩天机（耗 1 页百世书）';
    }

    const specialItemKey = data.specialItem || (Game.run.runItems.length ? Game.run.runItems[Game.run.runItems.length - 1] : null);
    const canItem = !!(specialItemKey && !Game.meta.items.includes(specialItemKey));
    const canRealm = Game.run.runPeakRealm > Game.meta.maxRealm;
    const canTalent = !!(data.guaranteedTalent && !Game.meta.talents.includes(data.guaranteedTalent));

    const cards = [
      {
        type: 'item',
        title: '一、保留一件宝物',
        enabled: canItem,
        glow: canItem,
        desc: canItem
          ? `【可带回】${ITEMS_DB[specialItemKey].name}（${ITEMS_DB[specialItemKey].tier}）`
          : (specialItemKey ? `已永久持有【${ITEMS_DB[specialItemKey].name}】` : '本世未获得可带回的稀有宝物')
      },
      {
        type: 'realm',
        title: '二、保留巅峰修为',
        enabled: canRealm,
        glow: canRealm && Game.hasTech('lianqi_jue'),
        desc: canRealm
          ? `【可带回】${REALM_NAMES[Game.run.runPeakRealm]}${!Game.hasTech('lianqi_jue') ? '（⚠️未习敛气决需防BE0）' : ''}`
          : '本世修为未超过已继承的最高境界'
      },
      {
        type: 'life',
        title: '三、保留寿元余泽',
        enabled: false,
        glow: false,
        desc: '本世寿元无盈余，暂无法选择'
      },
      {
        type: 'talent',
        title: '四、放弃所有收获，觉醒天赋',
        enabled: true,
        glow: canTalent,
        desc: canTalent
          ? '✨ 检测到逆天壮举！必觉醒专属神技天赋！'
          : '根据前世经历重开（无新逆天壮举时仅留存记忆）'
      }
    ];

    if (canItem) Game.selectedInherit = 'item';
    else if (canTalent) Game.selectedInherit = 'talent';
    else if (canRealm && Game.hasTech('lianqi_jue')) Game.selectedInherit = 'realm';
    else Game.selectedInherit = 'talent';

    const grid = document.getElementById('inheritGrid');
    grid.innerHTML = cards.map(c => `
      <div data-type="${c.type}" onclick="${c.enabled ? `Game.selectInheritOption('${c.type}')` : ''}" class="inherit-card ${c.enabled ? '' : 'disabled'} ${c.glow ? 'pulse-gold' : ''} ${Game.selectedInherit === c.type ? 'selected' : ''}">
        <div style="font-weight:700;font-size:13.5px;color:${c.glow ? '#fcd34d' : '#f5f5f4'};">${c.title}</div>
        <div style="font-size:11.5px;color:#a8a29e;margin-top:4px;line-height:1.5;">${c.desc}</div>
      </div>
    `).join('');

    Game.selectInheritOption(Game.selectedInherit);
    modal.classList.remove('hidden');
  },

  openCodex() {
    SoundFX.click();
    this._codexOpen = true;
    const m = document.getElementById('codexModal');
    if (m) m.classList.remove('hidden');
  },
  closeCodex() {
    this._codexOpen = false;
    const m = document.getElementById('codexModal');
    if (m) m.classList.add('hidden');
  },
  openResetModal() {
    SoundFX.click();
    const m = document.getElementById('resetModal');
    if (m) m.classList.remove('hidden');
  },
  closeResetModal() {
    const m = document.getElementById('resetModal');
    if (m) m.classList.add('hidden');
  }
};

function bootstrapApp() {
  if (window.__APP_BOOTSTRAPPED__) return;
  window.__APP_BOOTSTRAPPED__ = true;
  SoundFX.bindUnlock();
  UI.bindEvents();
  Game.init();
}

window.Game = Game;
window.UI = UI;
window.SoundFX = SoundFX;
window.onload = bootstrapApp;

if (typeof document.addEventListener === 'function') {
  if (document.readyState && document.readyState !== 'loading') {
    bootstrapApp();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  }
}
