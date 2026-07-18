<template>
    <div class="editor">
        <div class="title">
            <span>{{ title }}</span>
            <div style="display: flex; gap: 10px">
                <div v-if="show_ssr"
                     style="line-height: 1; display: flex; align-items: center; gap: 5px">
                    <label for="ssr"
                           style="font-size: 10px;">SSR</label>
                    <input id="ssr"
                           type="checkbox"
                           style="margin: 0;"
                           :checked="ssr"
                           @change="emit('update:ssr', $event.target.checked)">
                </div>
                <div v-if="show_minify"
                     style="line-height: 1; display: flex; align-items: center; gap: 5px">
                    <label for="minify"
                           style="font-size: 10px;">Minify</label>
                    <input id="minify"
                           type="checkbox"
                           style="margin: 0;"
                           :checked="minify"
                           @change="emit('update:minify', $event.target.checked)">
                </div>
            </div>
        </div>
        <div ref="editor"
             :style="{ height }"
             class="ace-editor">
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

import ace from "ace-builds/src-noconflict/ace";

ace.config.set(
    "basePath",
    "https://cdn.jsdelivr.net/npm/ace-builds@1.44.0/src-min-noconflict/"
);

// Theme
import "ace-builds/src-noconflict/theme-monokai";
// Language
import "ace-builds/src-noconflict/mode-javascript";
// Optional features
import "ace-builds/src-noconflict/ext-language_tools";

const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
    show_minify: {
        type: Boolean,
        default: false,
    },
    show_ssr: {
        type: Boolean,
        default: false,
    },
    minify: {
        type: Boolean,
        default: false,
    },
    ssr: {
        type: Boolean,
        default: false,
    },
    language: {
        type: String,
        default: "javascript",
    },
    theme: {
        type: String,
        default: "monokai",
    },
    title: {
        type: String,
        default: 'file.js'
    },
    height: {
        type: String,
        default: '400px'
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update:modelValue", "update:minify", "update:ssr"]);

const editor = ref();
let aceEditor;

onMounted(() => {
    aceEditor = ace.edit(editor.value);

    aceEditor.setTheme(`ace/theme/${props.theme}`);
    aceEditor.session.setMode(`ace/mode/${props.language}`);

    aceEditor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        fontSize: 12,
        tabSize: 4,
        useSoftTabs: true,
        showPrintMargin: false,
        wrap: true,
        readOnly: props.readOnly,
    });

    aceEditor.setValue(props.modelValue, -1);

    aceEditor.session.on("change", () => {
        emit("update:modelValue", aceEditor.getValue());
    });
});

watch(
    () => props.modelValue,
    (value) => {
        if (!aceEditor) return;
        if (aceEditor.getValue() !== value) {
            aceEditor.setValue(value, -1);
        }
    }
);

watch(
    () => props.language,
    (lang) => {
        aceEditor?.session.setMode(`ace/mode/${lang}`);
    }
);

watch(
    () => props.theme,
    (theme) => {
        aceEditor?.setTheme(`ace/theme/${theme}`);
    }
);

watch(
    () => props.readOnly,
    (value) => {
        aceEditor?.setReadOnly(value);
    }
);

onBeforeUnmount(() => {
    aceEditor?.destroy();
});
</script>

<style scoped>
.ace-editor {
    width: 100%;
}

.title {
    padding: 5px 10px;
    display: flex;
    justify-content: space-between;
}
</style>