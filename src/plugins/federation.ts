import type { Plugin } from "@rollup/browser";
import { parse } from "acorn";
import { simple as walk } from "acorn-walk";
import MagicString from "magic-string";
// @ts-expect-error
import runtimeSource from './federation-runtime.mjs?raw';
// @ts-expect-error
import vitePreloadSource from './vite-preload.mjs?raw';

function isExternalImport(source: string) {
    return (
        !source.startsWith(".") &&
        !source.startsWith("/") &&
        !source.startsWith("#")
    );
}

export const federation = (options?: { ssr?: boolean }): Plugin => {
    return {
        name: "federation",

        resolveId(id) {
            if (id === '@ikol/federation') {
                return '\0@ikol/federation';
            }
            if (id === 'vite-preload') {
                return '\0vite-preload';
            }
        },

        load(id) {
            if (id === '\0@ikol/federation') {
                return { code: runtimeSource.replace('\'<REPLACE_SHARED_MAP>\'', '{}') };
            }
            if (id === '\0vite-preload') {
                return { code: vitePreloadSource };
            }
            return null;
        },

        transform(code, id) {
            const ast = parse(code, {
                ecmaVersion: "latest",
                sourceType: "module",
            });

            const s = new MagicString(code);

            walk(ast as any, {
                ImportDeclaration(node: any) {
                    const source = node.source.value;

                    if (!isExternalImport(source)) {
                        return;
                    }

                    const importExpr = options?.ssr ?
                        `requireShared(${JSON.stringify(source)})` :
                        `await importShared(${JSON.stringify(source)})`;

                    let replacement: string | undefined;

                    if (node.specifiers.length === 0) {
                        replacement = `${importExpr};`;
                    } else {
                        const bindings: string[] = [];

                        for (const spec of node.specifiers) {
                            switch (spec.type) {
                                case "ImportDefaultSpecifier":
                                    bindings.push(`default: ${spec.local.name}`);
                                    break;

                                case "ImportSpecifier":
                                    bindings.push(
                                        spec.imported.name === spec.local.name
                                            ? spec.local.name
                                            : `${spec.imported.name}: ${spec.local.name}`
                                    );
                                    break;

                                case "ImportNamespaceSpecifier":
                                    replacement = `const ${spec.local.name} = ${importExpr};`;
                                    break;
                            }
                        }

                        if (!replacement) {
                            replacement = `const { ${bindings.join(", ")} } = ${importExpr};`;
                        }
                    }

                    s.overwrite(node.start, node.end, replacement);
                },
            });
            const info = this.getModuleInfo(id);
            if (info?.isEntry) {
                if (!options?.ssr) {
                    s.prepend(`import { __vitePreload } from 'vite-preload';`)
                }
                s.append(`const __federation_manifest__ = { entry_css: ['index.css'] };\n`)
                if (!options?.ssr) {
                    s.append(`await __vitePreload(()=>Promise.resolve({}), __federation_manifest__.entry_css);\n`);
                }
                s.append(`export { __federation_manifest__ };\n`);
            }

            if (!s.hasChanged()) {
                return null;
            } else {
                s.prepend(`import { importShared, requireShared } from '@ikol/federation';`)
            }

            return {
                code: s.toString(),
            };
        },
    };
};