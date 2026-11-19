import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { buildSingleFile, DIST_HTML_PATH, PAGES_HTML_PATH, ROOT_DIR } from '../tools/build.js';
import { DEFAULT_BASELINE_PATH, runFullScan } from '../tools/scan.js';

const baseline = JSON.parse(fs.readFileSync(DEFAULT_BASELINE_PATH, 'utf8'));
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'test-results');

async function assertVisibleAndClickable(page, selector, viewport) {
  const loc = page.locator(selector);
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const box = await loc.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, `${selector} 应有有效宽高`);
  assert.ok(box.x >= -1 && box.y >= -1, `${selector} 左/上边界不应超出屏幕: ${JSON.stringify(box)}`);
  assert.ok(
    box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
    `${selector} 右/下边界不应掉出屏幕 (${viewport.width}x${viewport.height}): ${JSON.stringify(box)}`
  );

  const hitOk = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return !!(hit && (hit === el || el.contains(hit)));
  }, selector);
  assert.ok(hitOk, `${selector} 中心点命中测试被上层元素遮挡`);
  return box;
}

test('步骤 2 构建产物应存在、完全一致且不含任何 http/https 外链', async () => {
  const res = await buildSingleFile();
  assert.ok(res.bytes > 10000);
  const distHtml = fs.readFileSync(DIST_HTML_PATH, 'utf8');
  const pagesHtml = fs.readFileSync(PAGES_HTML_PATH, 'utf8');
  assert.equal(distHtml, pagesHtml, 'dist/index.html 与根目录 index.html 应保持一致');
  assert.equal(/https?:\/\//i.test(distHtml), false, '离线单文件 HTML 不应包含任何 http/https 外链');
});

test('步骤 2 去外链与三类弹框改造后，通关扫描与锁定基线 100% 行为等价', () => {
  const report = runFullScan(DIST_HTML_PATH);
  assert.equal(report.summary.totalExceptions, 0);
  assert.equal(report.summary.totalDeadEnds, 0);
  assert.equal(report.summary.totalInvalidTargets, 0);

  // 因移除第一幕【黑衣道人】与第二幕初见【玉素真】上的剧透线索触发点，前两幕减少 27 个提前携线索态（13728 -> 13701）
  assert.equal(report.summary.bfsVisitedStates, 13701, '去剧透后跨周目 BFS 搜索态应精确为 13701');

  const actualSummaryNoBfsCount = { ...report.summary };
  delete actualSummaryNoBfsCount.bfsVisitedStates;
  const baselineSummaryNoBfsCount = { ...baseline.summary };
  delete baselineSummaryNoBfsCount.bfsVisitedStates;

  const comparableActual = {
    summary: actualSummaryNoBfsCount,
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

  const comparableBaseline = { ...baseline, summary: baselineSummaryNoBfsCount };
  delete comparableBaseline.sourceFile;

  assert.deepEqual(comparableActual, comparableBaseline);
});

test('Playwright 三视口（360x640 / 390x844 / 768x1024）断网冒烟、正文占屏与三类弹框层级验收', async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const fileUrl = pathToFileURL(DIST_HTML_PATH).href;
  const viewports = [
    { name: 'small-phone', width: 360, height: 640 },
    { name: 'phone', width: 390, height: 844 },
    { name: 'ipad', width: 768, height: 1024 }
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: true
      });
      const blockedExternalRequests = [];
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:')) {
          return route.continue();
        }
        blockedExternalRequests.push(url);
        return route.abort();
      });

      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
      await page.locator('#storyViewport .story-para').first().waitFor({ state: 'visible' });

      // 1. 无外部请求、无脚本异常、无横向滚动溢出、max-width <= 680
      assert.equal(blockedExternalRequests.length, 0, `${vp.name} 不应发起任何外部请求: ${blockedExternalRequests.join(', ')}`);
      assert.equal(pageErrors.length, 0, `${vp.name} 不应有任何 JS 错误: ${pageErrors.join(', ')}`);

      const metrics = await page.evaluate(() => {
        const appRect = document.getElementById('appRoot').getBoundingClientRect();
        const storyRect = document.getElementById('storyViewport').getBoundingClientRect();
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          appWidth: appRect.width,
          storyHeight: storyRect.height
        };
      });
      assert.ok(metrics.scrollWidth <= metrics.innerWidth + 1, `${vp.name} 不应有横向溢出`);
      assert.ok(metrics.appWidth <= 680.5, `${vp.name} 主内容宽度应 <= 680px，实际 ${metrics.appWidth}`);
      const storyRatio = metrics.storyHeight / vp.height;
      assert.ok(storyRatio >= 0.80, `${vp.name} 正文区占屏应 >= 80%，实际 ${(storyRatio * 100).toFixed(1)}%`);

      if (vp.name === 'phone') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-reading-390x844.png') });
      }

      // 2. 点击正文高亮词，居中弹出线索框并可点 ✕ 关闭
      await page.locator('.kw-clue[data-clue="hualiu"]').click();
      const clueCardBox = await assertVisibleAndClickable(page, '#clueModal .modal-card', vp);
      assert.ok(clueCardBox.height <= vp.height * 0.86, `${vp.name} 线索弹窗高度应 <= 85dvh`);
      await assertVisibleAndClickable(page, '#btnCloseClue', vp);
      if (vp.name === 'phone') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-clue-modal-390x844.png') });
      }
      await page.locator('#btnCloseClue').click();
      await page.locator('#clueModal').waitFor({ state: 'hidden' });

      // 3. 滑到底部不应自动弹窗打断阅读，仅主动点击文末按钮才弹出抉择框，且可点 ✕ 关闭
      await page.locator('#btnOpenChoices').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const isChoiceOpenAfterScroll = await page.evaluate(() => !document.getElementById('choiceModal').classList.contains('hidden'));
      assert.equal(isChoiceOpenAfterScroll, false, `${vp.name} 滑到底部不应自动弹出抉择框`);
      await page.locator('#btnOpenChoices').click();
      await assertVisibleAndClickable(page, '#choiceModal .modal-card', vp);
      await assertVisibleAndClickable(page, '#btnCloseChoices', vp);
      if (vp.name === 'phone') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-choice-modal-390x844.png') });
      }
      await page.locator('#btnCloseChoices').click();
      await page.locator('#choiceModal').waitFor({ state: 'hidden' });

      // 从顶栏快捷按钮重开抉择框并选择 BE1，验证死亡结算弹窗主按钮不出屏且无遮挡
      await page.locator('#btnTopChoice').click();
      await assertVisibleAndClickable(page, '#actionDeck button[data-cidx="0"]', vp);
      await page.locator('#actionDeck button[data-cidx="0"]').click();
      await assertVisibleAndClickable(page, '#deathModal .modal-card', vp);
      await assertVisibleAndClickable(page, '#btnConfirmReincarnate', vp);
      if (vp.name === 'phone') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-death-modal-390x844.png') });
      }

      await page.locator('#btnConfirmReincarnate').click();
      await page.locator('#deathModal').waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !document.getElementById('pageFlipOverlay').classList.contains('active'), null, { timeout: 5000 });

      // 4. 隐藏目录打开 -> 焚毁存档重置弹窗浮于目录之上 -> 取消关闭
      await page.locator('#btnToggleMenu').click();
      await assertVisibleAndClickable(page, '#menuModal .modal-card', vp);
      await assertVisibleAndClickable(page, '#btnOpenReset', vp);
      await page.locator('#btnOpenReset').click();
      await assertVisibleAndClickable(page, '#resetModal .modal-card', vp);
      await assertVisibleAndClickable(page, '#btnCancelReset', vp);
      await assertVisibleAndClickable(page, '#btnConfirmReset', vp);
      if (vp.name === 'phone') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-menu-reset-390x844.png') });
      }
      await page.locator('#btnCancelReset').click();
      await page.locator('#resetModal').waitFor({ state: 'hidden' });
      await page.locator('#btnCloseMenu').click();
      await page.locator('#menuModal').waitFor({ state: 'hidden' });

      // 5. 人名点击弹出当幕人物介绍，不剧透后续周目情节
      await page.locator('.kw-char[data-char="heiyi_daoren"]').click();
      await assertVisibleAndClickable(page, '#clueModal .modal-card', vp);
      const act1Badge = await page.locator('#clueModalBadge').textContent();
      const act1Title = await page.locator('#clueModalTitle').textContent();
      const act1Text = await page.locator('#clueModalText').textContent();
      assert.ok(act1Badge.includes('人物介绍'), '第一幕点黑衣道人应显示人物介绍徽标');
      assert.equal(act1Title, '高台黑衣道人');
      assert.equal(act1Text.includes('刘信'), false, '第一幕黑衣道人介绍不应剧透刘信姓名');
      await page.locator('#btnCloseClue').click();
      await page.locator('#clueModal').waitFor({ state: 'hidden' });

      await page.locator('#btnTopChoice').click();
      await assertVisibleAndClickable(page, '#actionDeck button[data-cidx="1"]', vp);
      await page.locator('#actionDeck button[data-cidx="1"]').click();
      await page.locator('#choiceModal').waitFor({ state: 'hidden' });

      await page.locator('.kw-char[data-char="yusuzhen"]').click();
      await assertVisibleAndClickable(page, '#clueModal .modal-card', vp);
      const act2Badge = await page.locator('#clueModalBadge').textContent();
      const act2Tag = await page.locator('#clueModalTag').textContent();
      const act2Title = await page.locator('#clueModalTitle').textContent();
      const act2Text = await page.locator('#clueModalText').textContent();
      assert.ok(act2Badge.includes('人物介绍'), '第二幕点玉素真应显示人物介绍徽标');
      assert.equal(act2Title, '玉素真');
      assert.equal(act2Tag.includes('审讯秘闻'), false, '初见玉素真不应显示审讯秘闻标签');
      assert.equal(act2Text.includes('养蛊') || act2Text.includes('刘信'), false, '初见玉素真不应剧透后续审讯内容');
      await page.locator('#btnCloseClue').click();
      await page.locator('#clueModal').waitFor({ state: 'hidden' });

      // 6. 单选项且无交互面板的过场页应隐藏顶栏抉择按钮，文末直接“下一页”跳转，不弹出单选项框
      await page.evaluate(() => window.Game.go('inner_refine'));
      const topChoiceHidden = await page.evaluate(() => document.getElementById('btnTopChoice').classList.contains('hidden'));
      assert.equal(topChoiceHidden, true, `${vp.name} 单选项页应隐藏顶栏抉择按钮`);
      const nextBtnText = await page.locator('#btnOpenChoices').textContent();
      assert.ok(nextBtnText.startsWith('下一页 ·'), `单选项页文末按钮应直接显示“下一页”，实际: ${nextBtnText}`);
      await page.locator('#btnOpenChoices').scrollIntoViewIfNeeded();
      await page.locator('#btnOpenChoices').click();
      const choiceModalHiddenAfterSingle = await page.evaluate(() => document.getElementById('choiceModal').classList.contains('hidden'));
      assert.equal(choiceModalHiddenAfterSingle, true, '单选项页点下一页不应弹出抉择框');
      await assertVisibleAndClickable(page, '#deathModal .modal-card', vp);

      assert.equal(pageErrors.length, 0, `${vp.name} 交互全流程不应产生 JS 错误`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
