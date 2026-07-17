<template>
    <div :class="{ 'message': true, 'error': !!error }">{{ error ?? 'No compile errors' }}</div>
    <div class="app">
        <Editor v-model="view_code"
                language="html" />
        <Editor v-model="handler_code"
                language="javascript" />
        <Editor v-model="style_code"
                language="css" />
        <div class="out">
            <pre><code>{{ entry_out }}</code></pre>
        </div>
        <div class="out">
            <pre><code>{{ css_out }}</code></pre>
        </div>
        <div class="out">
            <pre><code></code></pre>
        </div>
    </div>
</template>
<script setup lang="ts">
import { rollup } from '@rollup/browser';
import { Volume } from 'memfs-browser';
import { css } from './plugins/css';
import { onMounted, ref, watch } from 'vue';
import Editor from './Editor.vue';

const view_code = ref(`
<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg" />
</template>
<script setup>
import './styles.css';
import { ref } from 'vue'

const msg = ref('Hello World!')
\<\/script>
`.trim());

const handler_code = ref(`
export default class MyHandler extends IkAppHandler { }
`.trim());

const style_code = ref(`
body { color: red }
`.trim());

const entry_out = ref('');
const css_out = ref('');
const error = ref<string>();

async function doCompile() {
    error.value = undefined;

    const vol = Volume.fromJSON({
        '/View.vue': view_code.value,
        '/handler.js': handler_code.value,
        '/styles.css': style_code.value,
        '/index.js': `
            import View from './View.vue';
            import Handler from './styles.css';
            export const view = View;
            export const handler = Handler;
        `.trim(),
    });

    try {
        const bundle = await rollup({
            input: './index.js',
            // @ts-expect-error
            fs: vol.promises,
            output: {
                entryFileNames: 'remoteEntry.js',
            },
            plugins: [
                css({ chunkName: 'index.css' }),
            ],
        });

        const { output } = await bundle.generate({ format: 'esm' });
        const assets = output.filter(i => i.type == 'asset');
        const chunks = output.filter(i => i.type == 'chunk');

        entry_out.value = chunks[0].code;
        css_out.value = assets[1]?.source.toString() || '';
    } catch (e) {
        error.value = String(e);
    }
}

onMounted(() => {
    doCompile();
});

watch(view_code, doCompile);
watch(handler_code, doCompile);
watch(style_code, doCompile);
</script>
<style scoped>
:global(body),
:global(html) {
    padding: 0;
    margin: 0;
}

.app {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
}

.out {
    height: 400px;
    background-color: black;
    color: white;
}

.message {
    color: white;
    padding: 5px 10px;
    font-family: monospace;
    background-color: rgb(3, 157, 96);
}

.message.error {
    background-color: rgb(153, 0, 0);
}
</style>