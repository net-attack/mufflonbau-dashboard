import { build, context } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { previewConfig, previewHass } from './preview-fixture.mjs';
const root = new URL('../', import.meta.url);
export const output = new URL('test-results/spatial-poc/build/', root);
const options = { absWorkingDir: fileURLToPath(root), entryPoints: ['src/dev/spatial-poc/index.js', 'src/dev/spatial-poc/mock.js'], bundle: true,
  format: 'esm', splitting: true, platform: 'browser', target: 'es2022', sourcemap: true, minify: true,
  metafile: true, outdir: fileURLToPath(output), logLevel: 'warning' };
export async function buildPoc() {
  await mkdir(output, { recursive: true });
  const result = await build(options);
  const sizes = [];
  for (const [path, meta] of Object.entries(result.metafile.outputs)) {
    if (!path.endsWith('.js')) continue;
    const bytes = await readFile(new URL(path, root));
    sizes.push({ file: path.split('/').pop(), bytes: bytes.length, gzip: gzipSync(bytes).length,
      pixiBytes: Object.entries(meta.inputs).filter(([name]) => name.includes('node_modules/')).reduce((sum, [, input]) => sum + input.bytesInOutput, 0) });
  }
  await writeFile(new URL('../bundle-sizes.json', output), JSON.stringify(sizes, null, 2));
  return sizes;
}
export async function startPoc({ port = 4173, watch = false, profileFile } = {}) {
  await buildPoc();
  const watcher = watch ? await context(options) : null;
  if (watcher) await watcher.watch();
  const routes = new Map([
    ['/dev/spatial-poc', new URL('src/dev/spatial-poc/index.html', root)],
    ['/dev/spatial-poc/', new URL('src/dev/spatial-poc/index.html', root)],
    ['/dev/spatial-poc/mock', new URL('src/dev/spatial-poc/mock.html', root)],
    ['/dev/spatial-poc/production.js', new URL('mufflonbau-dashboard.js', root)],
    ['/dev/spatial-poc/styles.css', new URL('src/dev/spatial-poc/styles.css', root)],
    ['/dev/spatial-poc/bundle-sizes.json', new URL('../bundle-sizes.json', output)],
    ['/dev/spatial-poc/gallery', new URL('../index.html', output)],
    ['/dev/spatial-poc/gallery/', new URL('../index.html', output)],
  ]);
  if(profileFile) routes.set('/dev/spatial-poc/profile.local.json',new URL(profileFile,root));
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if(path === '/dev/spatial-poc/mock-fixture.json') { res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({config:previewConfig,hass:previewHass}));return; }
    const galleryAsset = /^\/dev\/spatial-poc\/gallery\/([a-z0-9-]+\.png|measurements\.json|bundle-sizes\.json)$/.test(path);
    const file = routes.get(path) ?? (galleryAsset ? new URL(`../${path.split('/').pop()}`, output) : /^\/dev\/spatial-poc\/[\w.-]+\.js(?:\.map)?$/.test(path) ? new URL(path.split('/').pop(), output) : null);
    try {
      if (!file) throw new Error('Not found');
      const data = await readFile(file);
      res.setHeader('Content-Type', file.pathname.endsWith('.html') ? 'text/html; charset=utf-8' : file.pathname.endsWith('.css') ? 'text/css' : file.pathname.endsWith('.js') ? 'text/javascript' : 'application/json');
      res.setHeader('Cache-Control', 'no-store'); res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}/dev/spatial-poc`,
    close: async () => { await watcher?.dispose(); await new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--build')) console.log(JSON.stringify(await buildPoc(), null, 2));
  else {
    const app = await startPoc({ port: Number(process.env.SPATIAL_POC_PORT ?? 4173), watch: true, profileFile:process.env.SPATIAL_POC_PROFILE });
    console.log(`Spatial Lab: ${app.url}\nDev only · synthetic states · reload after source changes`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
  }
}
