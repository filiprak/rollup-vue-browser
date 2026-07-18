import type { Plugin } from "@rollup/browser";
import {
    parse,
    compileScript,
} from "@vue/compiler-sfc";
import { compileTs } from "./esm";

export const vue = (options?: { ssr?: boolean }): Plugin => {
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

                return normalizePath(`${base}/${source}`);
            }

            return normalizePath(source);
        },

        async load(id) {
            if (!id.endsWith(".vue")) {
                return null;
            }

            const code = await this.fs.readFile(id, { encoding: 'utf8' });

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
                    isProd: true,
                    templateOptions: { ssr: options?.ssr, },
                });

                script = compiled.content;
            } else {
                script = "const __sfc__ = {};";
            }

            if (descriptor.scriptSetup?.lang == 'ts') {
                const result = await compileTs(id + '.ts', script);
                script = result.code;
            }

            return `${script}\nexport default __sfc__;`;
        },
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