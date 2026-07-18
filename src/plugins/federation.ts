import type { Plugin } from "@rollup/browser";
import { parse } from "acorn";
import { simple as walk } from "acorn-walk";
import MagicString from "magic-string";

function isExternalImport(source: string) {
    return (
        !source.startsWith(".") &&
        !source.startsWith("/") &&
        !source.startsWith("#")
    );
}

export const federation = (): Plugin => {
    return {
        name: "federation",

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

                    const importExpr = `await importShared(${JSON.stringify(source)})`;

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

            if (!s.hasChanged()) {
                return null;
            }

            return {
                code: `function importShared () {}\n\n${s.toString()}`,
            };
        },
    };
};