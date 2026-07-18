<template>
    <div :class="{ 'message': true, 'error': !!error }">{{ error ?? 'No compile errors' }}</div>
    <div class="app">
        <Editor v-model="view_code"
                title="View.vue"
                language="html" />
        <Editor v-model="handler_code"
                title="handler.ts"
                language="typescript" />
        <Editor v-model="style_code"
                title="styles.css"
                language="css" />
        <div class="out"
             style="grid-column: span 2;">
            <Editor v-model="entry_out"
                    show_minify
                    height="800px"
                    title="remoteEntry.js"
                    read-only
                    theme="dracula"
                    v-model:minify="minify_js"
                    language="javascript" />
        </div>
        <div class="out"
             style="grid-column: span 1;">
            <Editor v-model="css_out"
                    height="800px"
                    theme="dracula"
                    title="index.css"
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
import { federation } from './plugins/federation.ts';
import { minifier } from './plugins/minifier.ts';

const minify_js = ref(true);

const view_code = ref(`
<template>
    <div class="my-app">
        <div v-for="p in handler.products.value">
            {{ p.name }}
        </div>
    </div>
</template>
<script setup lang="ts">
import './styles.css';
import { ref } from 'vue'
import { useAppHandler } from "@ikol/website/core";

const handler = useAppHandler();
\<\/script>
`.trim());

const handler_code = ref(`
import { ref } from "vue";
import { IkAppHandler, usePrefetch } from "@ikol/website/core";
import { IkApiProducts } from "@ikol/website/api";

export default class MyHandler extends IkAppHandler {
    products = ref([]);

    async load() {
        const { data, error } = await usePrefetch('my-data', () => {
            return IkApiProducts.list();
        });
    }
}
`.trim());

const style_code = ref(`
.my-app { color: red }
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
                federation(),
                minifier(minify_js.value),
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
watch(minify_js, doCompile);
</script>
<style scoped>
:global(body),
:global(html) {
    padding: 0;
    margin: 0;
    font-family: monospace;
}

.app {
    display: grid;
    grid-template-columns: 33.333% 33.333% 33.333%;
}

.out {
    min-height: 600px;
    border-top: 2px dashed grey;
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