export function getGlobalCtx () {
    if (import.meta.env.SSR) {
        const store = globalThis.__async_storage?.getStore();
        if (!store) {
            throw new Error('@ikol/federation: SSR Async storage not found!');
        }
        return store;
    } else {
        return globalThis;
    }
}

export function getGlobal () {
    const glob_this_ctx = getGlobalCtx();
    if (!glob_this_ctx.__federation__) {
        glob_this_ctx.__federation__ = { // Notice: glob_this_ctx.__federation__ mark is used in rollup-plugin-federation.mjs plugin
            shared: '<REPLACE_SHARED_MAP>',
            remotes: {},
            events: {},
        };
    }

    return glob_this_ctx.__federation__;
}

function getNodeRunCache() {
    globalThis.__runcache = globalThis.__runcache || {};
    return globalThis.__runcache;
}

export async function loadAndRunNode (url) {
    const cache = getNodeRunCache();

    if (!cache[url]) {
        const res = await fetch(url);
        const code = await res.text();
        const _exports = {};
        const _shared = [];
    
        const _requireShared = (name) => {
            if (_shared.indexOf(name) < 0) {
                _shared.push(name);
            }
            return requireShared(name);
        }
    
        await eval(`
            (async function (requireShared, exports) {
                ${code}
            });
        `)(_requireShared, _exports);
    
        cache[url] = {
            shared: _shared,
            exports: _exports,
        };
    } else {
        cache[url].shared.forEach(i => triggerEvent('load-shared', i));
    }
    return cache[url].exports;
}

export function destroy () {
    const ctx = getGlobalCtx();
    delete ctx.__federation__;
}

export function addRemote (options) {
    const f = getGlobal();

    const config = {
        ...options,
        getGlobalName: () => `__${options.name}`,
        async load () {
            const glob_name = config.getGlobalName();

            let app_module;

            if (!import.meta.env.DEV) {
                if (import.meta.env.SSR) {
                    app_module = await loadAndRunNode(config.url);
                } else {
                    app_module = await import(/* @vite-ignore */ config.url);
                }
            } else {
                // dev server mode
                if (import.meta.env.SSR) {
                    app_module = await globalThis.__vite_ssrLoadModule(config.url);
                } else {
                    app_module = await import(/* @vite-ignore */ config.url.replace('@ikol/website/', '/website/src/'));
                }
            }
            triggerEvent('load-remote', options.name);

            return app_module;
        },
    };
    f.remotes[options.name] = config;
}

export function registerRemotes (remotes) {
    remotes.forEach((i) => {
        addRemote(i);
    });
}

export async function loadShared (name) {
    const f = getGlobal();

    if (!f.shared[name].cache) {
        f.shared[name].cache = f.shared[name]
            .load()
            .then(result => {
                triggerEvent('load-shared', name);
                return result;
            });
    }

    return f.shared[name].cache;
}

/* used on ssr node env */
export function requireShared (name) {
    const f = getGlobal();

    if (!f.shared[name].cache) {
        f.shared[name].cache = f.shared[name].load();
        triggerEvent('load-shared', name);
    }

    return f.shared[name].cache;
}

/* used in browser env */
export async function importShared (name) {
    return loadShared(name);
}

export async function loadRemote (name) {
    const f = getGlobal();

    if (!f.remotes[name].cache) {
        f.remotes[name].cache = f.remotes[name].load();
    }

    return f.remotes[name].cache;
}

export async function triggerEvent (event, params) {
    const f = getGlobal();

    if (f.events[event]) {
        f.events[event].forEach((cb) => {
            cb(params);
        });
    }
}

export async function onFederationEvent (event, cb) {
    const f = getGlobal();

    if (!f.events[event]) {
        f.events[event] = [];
    }
    if (f.events[event].indexOf(cb) < 0) {
        f.events[event].push(cb);
    }
}

export async function offFederationEvent (event, cb) {
    const f = getGlobal();

    f.events[event] = f.events[event]?.filter(i => i !== cb);
}
