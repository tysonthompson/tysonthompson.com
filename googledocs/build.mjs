import { build } from 'esbuild';
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'assets/app.js', sourcemap: false, legalComments: 'eof' });
console.log('Built assets/app.js');
