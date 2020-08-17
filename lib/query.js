'use strict';

const keyGenerator = require('./keyGenerator');
const cacheFunc = require('./cacheFunction');

module.exports = function(mongoose, cache) {
    const exec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = function(op, callback = function() { }) {
        if (!this.hasOwnProperty('_isCached')) return exec.apply(this, arguments);

        if (typeof op === 'function') {
            callback = op;
            op = null;
        } else if (typeof op === 'string') {
            this.op = op;
        }

        const key = this._key || this.getCacheKey();
        const isCountType = ['count', 'countDocuments', 'estimatedDocumentCount'].includes(this.op);
        const isLean = this._mongooseOptions.lean;
        const model = this.model.modelName;

        const _this = this;

        return (async () => {
            try {
                let result = await cache.get(key, _this._prefix);

                if (result == null) {
                    result = await exec.call(_this);

                    await cache.set(key, result, _this._ttl, _this._prefix);
                    callback(null, result);
                    return result;
                }

                if (isCountType) {
                    callback(null, result);
                    return result;
                }

                if (!isLean) {
                    const constructor = mongoose.model(model);
                    result = Array.isArray(result)
                        ? result.map(hydrateModel(constructor))
                        : hydrateModel(constructor)(result);
                }

                callback(null, result);
                return result;
            } catch (err) {
                callback(err);
                throw err;
            }
        })();
    };

    mongoose.Query.prototype.cache = cacheFunc;

    mongoose.Query.prototype.getCacheKey = function() {
        return keyGenerator({
            model: this.model.modelName,
            op: this.op,
            skip: this.options.skip,
            limit: this.options.limit,
            sort: this.options.sort,
            _options: this._mongooseOptions,
            _conditions: this._conditions,
            _fields: this._fields,
            _path: this._path,
            _distinct: this._distinct,
        });
    };
};

function hydrateModel(constructor) {
    return (data) => {
        return constructor.hydrate(data);
    };
}
