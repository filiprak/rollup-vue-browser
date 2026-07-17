import { rollup } from '@rollup/browser';
import { Volume } from 'memfs-browser';
import { css } from './plugins/css';
import { createApp } from 'vue';
import App from './App.vue';

const vol = Volume.fromJSON({
    '/main.js': "import foo from './foo.js'; import './style.css'; import './other.css'; console.log(foo);",
    '/foo.js': 'export default () => 42;',
    '/style.css': 'body { color: red; }',
    '/other.css': 'button { color: black; }',
});

const bundle = await rollup({
    input: '/main.js',
    // @ts-expect-error
    fs: vol.promises,
    output: {
        entryFileNames: 'remoteEntry.js',
    },
    plugins: [
        css(),
    ],
});

const { output } = await bundle.generate({ format: 'esm' });

output.forEach(o => {
    console.log('File', o.fileName)

    if (o.type == 'chunk') {
        console.log(o.code)
    }
    if (o.type == 'asset') {
        console.log(o.source)
    }
})

createApp(App).mount('#app');
