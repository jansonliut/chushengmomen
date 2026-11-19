import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DIST_HTML_PATH = path.join(ROOT_DIR, 'dist', 'index.html');
export const PAGES_HTML_PATH = path.join(ROOT_DIR, 'index.html');

export async function buildSingleFile() {
  const templatePath = path.join(ROOT_DIR, 'src', 'template.html');
  const cssPath = path.join(ROOT_DIR, 'src', 'styles', 'main.css');
  const jsPath = path.join(ROOT_DIR, 'src', 'main.js');

  const template = fs.readFileSync(templatePath, 'utf8');
  const cssRaw = fs.readFileSync(cssPath, 'utf8');
  const jsRaw = fs.readFileSync(jsPath, 'utf8');

  const cssRes = await esbuild.transform(cssRaw, {
    loader: 'css',
    minify: true
  });

  const jsRes = await esbuild.transform(jsRaw, {
    loader: 'js',
    minify: false,
    target: 'es2020'
  });

  if (!template.includes('/* __INLINE_CSS__ */') || !template.includes('/* __INLINE_JS__ */')) {
    throw new Error('src/template.html 缺少内联占位符 /* __INLINE_CSS__ */ 或 /* __INLINE_JS__ */');
  }

  const outputHtml = template
    .replace('/* __INLINE_CSS__ */', () => cssRes.code.trim())
    .replace('/* __INLINE_JS__ */', () => jsRes.code);

  if (/https?:\/\//i.test(outputHtml)) {
    throw new Error('构建产物中包含 http:// 或 https:// 外部链接，违反离线无外链约束');
  }

  fs.mkdirSync(path.dirname(DIST_HTML_PATH), { recursive: true });
  fs.writeFileSync(DIST_HTML_PATH, outputHtml, 'utf8');
  fs.writeFileSync(PAGES_HTML_PATH, outputHtml, 'utf8');

  return {
    distPath: DIST_HTML_PATH,
    pagesPath: PAGES_HTML_PATH,
    bytes: Buffer.byteLength(outputHtml, 'utf8')
  };
}

if (path.resolve(process.argv[1] || '') === __filename) {
  const res = await buildSingleFile();
  console.log(`构建完成：${path.relative(ROOT_DIR, res.distPath)} 与 ${path.relative(ROOT_DIR, res.pagesPath)}（${res.bytes} 字节，0 外链）`);
}
