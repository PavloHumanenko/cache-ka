'use strict';

const redis = require('async-redis');
const defaultOptions = { host: '127.0.0.1', port: 6379 };

class CacheFlow {
    constructor(options = {}) {
        if (options.redisClient) {
            this._redisClient = redis.decorate(options.redisClient);
        } else if (options.redisClientAsync) {
            this._redisClient = options.redisClientAsync;
        } else {
            options = Object.assign(defaultOptions, options);
            this._redisClient = redis.createClient(options);
        }
    }

    async get(key, prefix = ''){
        const fullKey = createFullKey(prefix, key);

        const response = await this._redisClient.get(fullKey);

        return JSON.parse(response);
    }

    set(key, value, ttl = 60, prefix = ''){
        if (ttl === 0) ttl = -1;

        value = JSON.stringify(value);

        const fullKey = createFullKey(prefix, key);

        return this._redisClient.set(fullKey, value, 'EX', ttl);
    }

    del(key, prefix = ''){
        const fullKey = createFullKey(prefix, key);

        return this._redisClient.del(fullKey);
    }

    async delByPrefix(prefix) {
        const keys = await this._redisClient.keys(prefix + '__*');

        if (keys.length) return this._redisClient.del(keys);
    }

    clear(){
        return this._redisClient.flushdb();
    }
}

module.exports = options => new CacheFlow(options);

function createFullKey(prefix, key){
    return (prefix ? prefix + '__' : '') + key;
}
