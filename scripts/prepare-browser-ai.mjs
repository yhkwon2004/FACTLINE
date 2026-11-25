import {build} from 'esbuild';
import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/onnx',{recursive:true});
for(const file of await readdir('node_modules/onnxruntime-web/dist'))if(/ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(file))await copyFile('node_modules/onnxruntime-web/dist/'+file,'public/onnx/'+file);
await build({entryPoints:['src/infrastructure/ai/browser-speech.worker.ts'],bundle:true,format:'esm',platform:'browser',outfile:'public/device-speech.js',minify:true,define:{'process.env.NODE_ENV':'"production"'}});

await mkdir('public/ocr/core',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const file of await readdir('node_modules/tesseract.js-core'))if(/\.(wasm|js)$/.test(file))await copyFile('node_modules/tesseract.js-core/'+file,'public/ocr/core/'+file);
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf.worker.min.mjs');
