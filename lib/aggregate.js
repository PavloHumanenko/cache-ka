'use strict';

const keyGenerator = require('./keyGenerator');
const cacheFunc = require('./cacheFunction');

let isExpanded = false;

module.exports = function(mongoose, cache) {
    const aggregate = mongoose.Model.aggregate;

    mongoose.Model.aggregate = function() {
        const response = aggregate.apply(this, arguments);

        if (!isExpanded && response.constructor && response.constructor.name === 'Aggregate') {
            expand(response.constructor);
            isExpanded = true;
        }

        return response;
    };

    function expand(Aggregate) {
        const exec = Aggregate.prototype.exec;

        Aggregate.prototype.exec = function(callback = function() { }) {
            if (!this.hasOwnProperty('_isCached')) return exec.apply(this, arguments);

            const key = this._key || this.getKeyForCache();
            const _this = this;

            return (async () => {
                try {
                    let result = await cache.get(key, _this._prefix);

                    if (result != null) {
                        callback(null, result);
                        return result;
                    }

                    result = await exec.call(_this);

                    await cache.set(key, result, _this._ttl, _this._prefix);
                    callback(null, result);
                    return result;
                } catch (err) {
                    callback(err);
                    throw err;
                }
            })();
        };

        Aggregate.prototype.cache = cacheFunc;

        Aggregate.prototype.getKeyForCache = function() {
            return keyGenerator(this._pipeline);
        };
    }
};
