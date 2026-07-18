import type { Plugin } from "@rollup/browser";
// @ts-expect-error
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import * as esbuild from "esbuild-wasm";

let initialized = false;

async function initEsbuild() {
    if (initialized) {
        return;
    }

    await esbuild.initialize({
        wasmURL,
    });

    initialized = true;
}

export async function compileTs(id: string, code: string) {
    await initEsbuild();
    return esbuild.transform(code, {
        loader: id.endsWith(".tsx") ? "tsx" : "ts",
        format: "esm",
        sourcefile: id,
        target: "es2020",
    });
}

export async function minify(code: string) {
    await initEsbuild();
    return esbuild.transform(code, {
        format: "esm",
        target: "esnext",
        minify: true,
    });
}

export const esm = (): Plugin => {
    return {
        name: "esbuild-browser",

        async transform(code, id) {
            if (!/\.(ts|tsx)$/.test(id)) {
                return null;
            }

            const result = await compileTs(id, code);

            return {
                code: result.code,
            };
        },
    };
};