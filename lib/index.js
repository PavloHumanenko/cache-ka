'use strict';

let isInitialized = false;
let cache;

module.exports = function init(mongoose, cacheOptions = {}) {
    if (typeof mongoose.Model.hydrate !== 'function') {
        throw new Error('Mongoose version with "model.hydrate" method support is required');
    }

    if (isInitialized) return;

    cache = require('./CacheFlow')(cacheOptions);

    require('./aggregate')(mongoose, cache);
    require('./query')(mongoose, cache);

    isInitialized = true;
};

module.exports.clearCache = (prefix = '', key = '', cb = null) => {
    return (async function(){
        const isCb = typeof cb === 'function';
        try {
            if (prefix && key) {
                await cache.del(key, prefix);
            } else if (prefix) {
                await cache.delByPrefix(prefix);
            } else {
                await cache.clear();
            }

            if (isCb) cb(null);
        } catch (err) {
            if (!isCb) throw err;
            cb(err);
        }
    })();
};

