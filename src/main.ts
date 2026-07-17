import { rollup } from '@rollup/browser';
import { Volume } from 'memfs-browser';

const vol = Volume.fromJSON({
    '/main.js': "import foo from './foo.js'; console.log(foo);",
    '/foo.js': 'export default 42;'
});

const bundle = await rollup({
    input: '/main.js',
    // @ts-expect-error
    fs: vol.promises,
    plugins: [
        {
            name: 'test',
            transform(code, id, options) {
                throw new Error
            },
        }
    ],
});

const { output } = await bundle.generate({ format: 'esm' });

console.log(output[0].code)
