import type { Plugin } from "@rollup/browser";

export const core = (options: { ssr?: boolean } = {}): Plugin => {
    const ssr = options.ssr ?? false;

    return {
        name: "core",

        transform(code, id) {
            if (/\.css$/.test(id)) {
                return null;
            }

            const replaced = code.replace(
                /\bimport\.meta\.env\.SSR\b/g,
                ssr ? 'true' : 'false'
            );

            if (replaced === code) {
                return null;
            }

            return {
                code: replaced,
            };
        },
    };
};