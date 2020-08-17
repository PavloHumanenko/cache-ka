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

module.exports.clearCache = (prefix = '', key = '', cb = () => {}) => {
    if (prefix && key) return cache.del(key, prefix).then(() => cb(null));
    if (prefix) return cache.delByPrefix(prefix).then(() => cb(null));

    return cache.clear().then(() => cb(null));
};
