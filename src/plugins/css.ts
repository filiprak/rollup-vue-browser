import type { Plugin } from "@rollup/browser";

export const css = (options?: { chunkName?: string }): Plugin => {
    const files = new Map<string, string>();

    return {
        name: "css",

        async load(id) {
            if (!id.endsWith(".css")) return null;

            files.set(id, await this.fs.readFile(id, { encoding: 'utf8' }));

            return "export default undefined;";
        },

        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: options?.chunkName ?? "index.css",
                source: [...files.values()].join("\n"),
            });
        },
    };
};