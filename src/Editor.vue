<template>
    <div ref="editor"
         class="ace-editor"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

import ace from "ace-builds/src-noconflict/ace";

ace.config.set(
    "basePath",
    "/node_modules/ace-builds/src-noconflict"
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
    language: {
        type: String,
        default: "javascript",
    },
    theme: {
        type: String,
        default: "monokai",
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update:modelValue"]);

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
        fontSize: 14,
        tabSize: 2,
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
    height: 400px;
}
</style>