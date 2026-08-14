import type { Plugin } from "@rollup/browser";
// @ts-expect-error
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import * as esbuild from "esbuild-wasm";

let initialized = false;

export const target_web = [
    'chrome126',
    'edge126',
    'firefox126',
    'safari16',
    'ios16',
];

export const target_ssr = [
    'node22'
];

async function initEsbuild() {
    if (initialized) {
        return;
    }

    await esbuild.initialize({
        wasmURL,
    });

    initialized = true;
}

export async function compileTs(id: string, code: string, ssr?: boolean) {
    await initEsbuild();
    return esbuild.transform(code, {
        loader: id.endsWith(".tsx") ? "tsx" : "ts",
        format: "esm",
        sourcefile: id,
        target: ssr ? target_web : target_ssr,
    });
}

export async function minify(code: string, ssr?: boolean) {
    await initEsbuild();
    return esbuild.transform(code, {
        format: ssr ? "cjs" : "esm",
        target: ssr ? target_web : target_ssr,
        minify: true,
    });
}

export const esm = (options?: { ssr?: boolean }): Plugin => {
    return {
        name: "esbuild-browser",

        async transform(code, id) {
            if (!/\.(ts|tsx)$/.test(id)) {
                return null;
            }

            const result = await compileTs(id, code, options?.ssr);

            return {
                code: result.code,
            };
        },
    };
};