const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(process.cwd(), 'src/shiyan/ShiyanRecordingScreens.tsx'),
  'utf8',
);
const homeSource = source.slice(
  source.indexOf('export function ShiyanHomeScreen()'),
  source.indexOf('export function ShiyanSceneSelectScreen()'),
);

describe('MOB-030 Shiyan home interaction contract', () => {
  it('keeps one direct recording path with the current selected scene', () => {
    expect(homeSource).toContain("navigation.navigate('ShiyanRecord', {");
    expect(homeSource).toContain('sceneId: selectedScene.id');
    expect(homeSource).toContain('sceneName: selectedScene.name');
    expect(homeSource).not.toContain("navigation.navigate('ShiyanSceneSelect')");
  });

  it('selects a scene in the sheet and closes immediately without a confirm step', () => {
    expect(homeSource).toContain('setSelectedSceneId(scene.id);');
    expect(homeSource).toContain('setSceneSheetOpen(false);');
    expect(homeSource).not.toContain('确定');
  });

  it('uses the unified records path instead of separate local-draft and Cloud-history home actions', () => {
    expect(homeSource).toContain('loadUnifiedRecords()');
    expect(homeSource).toContain('result.records.slice(0, 3)');
    expect(homeSource).toContain("navigation.navigate('ShiyanHistory')");
    expect(homeSource).not.toContain("navigation.navigate('ShiyanLocalDrafts')");
  });
});
