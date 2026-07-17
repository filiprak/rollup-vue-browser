import type { Plugin } from "@rollup/browser";
import {
    parse,
    compileScript,
    compileTemplate,
} from "@vue/compiler-sfc";

export const vue = (): Plugin => {
    const files = new Map<string, string>();

    return {
        name: "vue-browser",

        resolveId(source, importer) {
            if (!source.endsWith(".vue")) {
                return null;
            }

            if (source.startsWith(".")) {
                const base = importer
                    ? importer.substring(0, importer.lastIndexOf("/"))
                    : "";

                const resolved = normalizePath(`${base}/${source}`);

                if (files.has(resolved)) {
                    return resolved;
                }
            }

            if (files.has(source)) {
                return source;
            }

            return null;
        },

        load(id) {
            if (!id.endsWith(".vue")) {
                return null;
            }

            const code = files.get(id);

            if (!code) {
                return null;
            }

            const { descriptor, errors } = parse(code, {
                filename: id,
            });

            if (errors.length) {
                throw errors[0];
            }

            let script = "";

            if (descriptor.script || descriptor.scriptSetup) {
                const compiled = compileScript(descriptor, {
                    id: hash(id),
                    inlineTemplate: true,
                    genDefaultAs: "__sfc__",
                });

                script = compiled.content;
            } else {
                script = "const __sfc__ = {};";
            }

            let template = "";

            if (descriptor.template) {
                const compiled = compileTemplate({
                    id: hash(id),
                    filename: id,
                    source: descriptor.template.content,
                });

                if (compiled.errors.length) {
                    throw compiled.errors[0];
                }

                template = compiled.code;
            }

            return `
${script}
${template}

__sfc__.render = render;

export default __sfc__;
`;
        },

        api: {
            setFile(id: string, source: string) {
                files.set(normalizePath(id), source);
            },

            deleteFile(id: string) {
                files.delete(normalizePath(id));
            },

            getFile(id: string) {
                return files.get(normalizePath(id));
            },
        },
    } as Plugin & {
        api: {
            setFile(id: string, source: string): void;
            deleteFile(id: string): void;
            getFile(id: string): string | undefined;
        };
    };
};

function normalizePath(path: string): string {
    return path
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/\/\.\//g, "/");
}

function hash(value: string): string {
    let h = 0;

    for (let i = 0; i < value.length; i++) {
        h = (h << 5) - h + value.charCodeAt(i);
        h |= 0;
    }

    return Math.abs(h).toString(36);
}