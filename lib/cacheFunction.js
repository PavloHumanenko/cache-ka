'use strict';

module.exports = function(ttl = 60, prefix = '', customKey = '') {
    if (typeof ttl === 'string') {
        prefix = ttl;
        ttl = 60;
    }

    this._ttl = ttl;
    this._key = customKey;
    this._prefix = prefix;
    this._isCached = true;

    return this;
};
