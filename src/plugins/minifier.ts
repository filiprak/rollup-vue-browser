import type { Plugin } from "@rollup/browser";
import { minify } from "./esm";

export const minifier = (enabled?: boolean): Plugin => {
    return {
        name: "js-minifier",

        async renderChunk(code) {
            if (enabled) {
                const result = await minify(code);

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