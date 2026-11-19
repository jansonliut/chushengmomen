import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_BASELINE_PATH,
  DEFAULT_DEMO_PATH,
  runFullScan,
  runMatrixScan,
  runMultiCycleBfs
} from '../tools/scan.js';

const baseline = JSON.parse(fs.readFileSync(DEFAULT_BASELINE_PATH, 'utf8'));

test('demo-mobile.html 全状态组合与跨周目通关扫描应 0 异常 0 死路并严格匹配锁定基线', () => {
  const report = runFullScan(DEFAULT_DEMO_PATH);

  assert.equal(report.summary.totalExceptions, 0, '不应有任何运行时异常');
  assert.equal(report.summary.totalDeadEnds, 0, '不应有任何死路场景');
  assert.equal(report.summary.totalInvalidTargets, 0, '不应有任何无效跳转出口');

  assert.equal(report.summary.sceneCount, 15);
  assert.equal(report.summary.definedEndingCount, 14);
  assert.equal(report.summary.cycle1EndingCount, 3);
  assert.equal(report.summary.multiCycleEndingCount, 14);
  assert.equal(report.summary.unreachableEndingCount, 0);

  const actualSnapshot = {
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

  assert.deepEqual(actualSnapshot, baseline);
});

test('负面检出：删掉某个场景的全部出口后，矩阵扫描与 BFS 均能检出死路', () => {
  const matrixDead = runMatrixScan(DEFAULT_DEMO_PATH, ({ SCENES }) => {
    SCENES.act2_hehuan_drained.choices = () => [];
  });
  assert.ok(matrixDead.deadEnds.length > 0, '矩阵扫描应检出死路');
  assert.ok(
    matrixDead.deadEnds.some(d => d.sceneId === 'act2_hehuan_drained'),
    '死路报告应准确指向 act2_hehuan_drained'
  );

  const bfsDisabledDead = runMultiCycleBfs(DEFAULT_DEMO_PATH, ({ SCENES }) => {
    SCENES.act1_plaza.choices = () => [
      { label: '被锁死的占位选项', disabled: true, action: () => {} }
    ];
  });
  assert.ok(bfsDisabledDead.deadEnds.length > 0, '全部选项 disabled 时 BFS 应检出死路');
  assert.ok(
    bfsDisabledDead.deadEnds.some(d => d.sceneId === 'act1_plaza'),
    '死路报告应准确指向 act1_plaza'
  );
});

test('负面检出：选项跳转到不存在的场景时，扫描器能准确报错检出无效出口', () => {
  const brokenMutator = ({ Game, SCENES }) => {
    SCENES.act1_plaza.choices = () => [
      { label: '断链测试出口', action: () => Game.go('non_existent_scene') }
    ];
  };

  const matrixBroken = runMatrixScan(DEFAULT_DEMO_PATH, brokenMutator);
  assert.ok(matrixBroken.invalidTargets.length > 0, '矩阵扫描应检出无效场景跳转');
  assert.ok(
    matrixBroken.invalidTargets.some(t => t.target === 'scene:non_existent_scene'),
    '矩阵扫描应指出缺失的目标 scene:non_existent_scene'
  );

  const bfsBroken = runMultiCycleBfs(DEFAULT_DEMO_PATH, brokenMutator);
  assert.ok(bfsBroken.invalidTargets.length > 0, 'BFS 应检出无效场景跳转');
  assert.ok(
    bfsBroken.invalidTargets.some(t => t.target === 'scene:non_existent_scene'),
    'BFS 应指出缺失的目标 scene:non_existent_scene'
  );
});
