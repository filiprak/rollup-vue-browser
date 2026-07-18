import type { Plugin } from "@rollup/browser";
import { minify } from "./esm";

export const minifier = (options?: { ssr?: boolean, enabled?: boolean }): Plugin => {
    return {
        name: "js-minifier",

        async renderChunk(code) {
            if (options?.enabled) {
                const result = await minify(code, options.ssr);

                if (!result.code) {
                    return null;
                }

                return {
                    code: result.code,
                    // no sourcemap
                };
            }
        },
    };
};