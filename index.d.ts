declare module 'mongoose' {
    interface DocumentQuery<T, DocType extends Document, QueryHelpers = {}>  {
        cache(ttl?: number | string, prefix?: string | null, customKey?: string): this
    }
    interface Aggregate<T> {
        cache(ttl?: number | string, prefix?: string | null, customKey?: string): this
    }
}

declare module 'cache-ka' {
    import { Mongoose } from 'mongoose';

    function cacheKa(mongoose: Mongoose, cacheOptions?: cacheKa.Types.IOptions): void

    namespace cacheKa {
        namespace Types {
            interface IOptions {
                port?: number;
                host?: string;
                redisClient?: any;
                redisClientAsync?: any;
            }
        }

        function clearCache(prefix?: string | null, customKey?: string | null, cb?: (err?: Error) => void): void;
    }

    export = cacheKa;
}
