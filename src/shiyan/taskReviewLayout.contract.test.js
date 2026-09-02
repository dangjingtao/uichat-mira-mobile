const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const readSource = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = readSource('src/shiyan/ShiyanTaskDetailScreen.tsx');

describe('MOB-032 Shiyan result-first review layout contract', () => {
  it('puts the organized result before processing details', () => {
    const resultIndex = source.indexOf('>整理稿</Text>');
    const processingIndex = source.indexOf('>处理详情</Text>');

    expect(resultIndex).toBeGreaterThan(-1);
    expect(processingIndex).toBeGreaterThan(resultIndex);
  });

  it('keeps transcript and processing details collapsed by default', () => {
    expect(source).toContain(
      "const [transcriptOpen, setTranscriptOpen] = useState(false);",
    );
    expect(source).toContain(
      "const [processingOpen, setProcessingOpen] = useState(false);",
    );
    expect(source).toContain('{processingOpen ? (');
  });

  it('uses the review-result selector instead of flattening draft semantics in the screen', () => {
    expect(source).toContain('selectShiyanReviewResult(content, candidate)');
    expect(source).toContain('selectShiyanFinalEditorSeed(content, candidate, preferCandidate)');
    expect(source).toContain('用候选继续编辑');
  });

  it('protects dirty Final Draft edits before navigation or editor close', () => {
    expect(source).toContain("navigation.addListener('beforeRemove'");
    expect(source).toContain('放弃未保存修改？');
    expect(source).toContain('保存完成后再离开');
  });

  it('keeps transcript as a read-only evidence layer', () => {
    expect(source).toContain("<Text selectable style={[styles.readonlyText");
    expect(source).not.toContain('value={transcript.value.text}');
  });
});
