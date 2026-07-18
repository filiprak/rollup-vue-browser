<template>
    <div :class="{ 'message': true, 'error': !!error }">{{ error ?? 'No compile errors' }}</div>
    <div class="app">
        <Editor v-model="view_code"
                language="html" />
        <Editor v-model="handler_code"
                language="typescript" />
        <Editor v-model="style_code"
                language="css" />
        <div class="out"
             style="grid-column: span 2;">
            <Editor v-model="entry_out"
                    read-only
                    language="javascript" />
        </div>
        <div class="out"
             style="grid-column: span 1;">
            <Editor v-model="css_out"
                    read-only
                    language="css" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { rollup } from '@rollup/browser';
import { Volume } from 'memfs-browser';
import { css } from './plugins/css';
import { onMounted, ref, watch } from 'vue';
import Editor from './Editor.vue';
import { vue } from './plugins/vue.ts';
import { esm } from './plugins/esm.ts';

const view_code = ref(`
<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg" />
</template>
<script setup lang="ts">
import './styles.css';
import { ref } from 'vue'

const msg = ref<string>('Hello World!')
\<\/script>
`.trim());

const handler_code = ref(`
export default class MyHandler extends IkAppHandler {
    async load() {
        const id: number = 77;
    }
}
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
        '/handler.ts': handler_code.value,
        '/styles.css': style_code.value,
        '/index.ts': `
            import View from './View.vue';
            import Handler from './handler.ts';
            export const view = View;
            export const handler = Handler;
        `.trim(),
    });

    try {
        const bundle = await rollup({
            input: './index.ts',
            // @ts-expect-error
            fs: vol.promises,
            output: {
                entryFileNames: 'remoteEntry.js',
            },
            plugins: [
                vue(),
                css({ chunkName: 'index.css' }),
                esm(),
            ],
        });

        const { output } = await bundle.generate({ format: 'esm' });
        const assets = output.filter(i => i.type == 'asset');
        const chunks = output.filter(i => i.type == 'chunk');

        entry_out.value = chunks[0].code;
        css_out.value = assets[0]?.source.toString() || '';
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
    grid-template-columns: 33.333% 33.333% 33.333%;
}

.out {
    min-height: 400px;
    border-top: 2px dashed grey;
    padding-top: 10px;
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