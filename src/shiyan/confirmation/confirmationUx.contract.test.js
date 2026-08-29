const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const readSource = path => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Shiyan confirmation UX wiring', () => {
  it('keeps the Cloud config entry on the Shiyan home header', () => {
    const home = readSource('src/shiyan/ShiyanRecordingScreens.tsx');
    const app = readSource('App.tsx');

    expect(home).toContain("navigation.navigate('ShiyanCloudConfig')");
    expect(home).toContain('accessibilityLabel="配置拾言 Cloud"');
    expect(app).toContain(
      '<Stack.Screen name="ShiyanCloudConfig" component={ShiyanCloudConfigScreen} />',
    );
  });

  it('removes the drifted Cloud settings button from the submit page header', () => {
    const submit = readSource('src/shiyan/ShiyanCaptureSubmitScreen.tsx');
    expect(submit).not.toContain('Settings2');
    expect(submit).not.toContain('可点右上角设置');
    expect(submit).toContain('可回到拾言主页右上角配置');
  });

  it('wires the local playback adapter into the confirmation page', () => {
    const submit = readSource('src/shiyan/ShiyanCaptureSubmitScreen.tsx');
    expect(submit).toContain("from './playback/PlaybackAdapter'");
    expect(submit).toContain('playbackAdapter.load(');
    expect(submit).toContain('playbackAdapter.dispose()');
  });

  it('stops playback before deleting the local recording file', () => {
    const submit = readSource('src/shiyan/ShiyanCaptureSubmitScreen.tsx');
    const disposeIndex = submit.indexOf('playbackAdapter\n            .dispose()');
    const deleteIndex = submit.indexOf('localCaptureRepository.delete(capture.id)');
    expect(disposeIndex).toBeGreaterThan(-1);
    expect(deleteIndex).toBeGreaterThan(disposeIndex);
  });

  it('picks scenes through a single-choice bottom sheet instead of flat buttons', () => {
    const submit = readSource('src/shiyan/ShiyanCaptureSubmitScreen.tsx');
    expect(submit).toContain('setSceneSheetOpen(true)');
    expect(submit).toContain('setSceneSheetOpen(false)');
    expect(submit).toContain('setSceneId(scene.id);');
    expect(submit).not.toContain('styles.sceneList');
  });

  it('shares one scene truth through the confirmation helpers', () => {
    const submit = readSource('src/shiyan/ShiyanCaptureSubmitScreen.tsx');
    const helpers = readSource('src/shiyan/confirmation/sceneConfirmation.ts');
    expect(submit).toContain('selectableScenesForCapture(');
    expect(submit).toContain('confirmableSceneOrThrow(');
    expect(helpers).toContain('canonicalShiyanSceneId');
  });
});
