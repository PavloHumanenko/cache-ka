# cache-ka #

## About ##

A Mongoose caching library based on redis engine. 

## Usage ##

Add `.cache()` method to query you want to cache. Works well with `select`, `skip`, `limit` ,`lean`, `sort`, and other query modifiers.

```javascript
const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

cacheKa(mongoose, {    
  host: '127.0.0.1',    // Redis host. Defaut value is 127.0.0.1.
  port: 6379            // Redis port. Default value is 6379.
});

Item
  .find({ yourQuery: true })
  .cache(20) // The number of seconds to cache the query. Defaults value is 60 seconds.

Item
  .aggregate()
  .group({ total: { $sum: '$yourField' } })
  .cache(0) // If ttl is set to 0 will store cache indefinetely.
```

Cache-ka allows you to store your cache with a custom prefix, that allows you to manage group of cached data. 
```javascript

const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

cacheKa(mongoose, {    
  host: '127.0.0.1',   
  port: 6379        
});

Item
  .find({ yourQuery: true })
  .cache(40, 'cool_items') // Will create a redis entry with prefix cool_items.
                            

Item
  .find({yourOtherQuery: true})
  .sort('name')
  .cache(60, 'cool_items') // Creates one more entry with prefix cool_items.


//Clean cache for all queries with "cool_items" prefix.
cacheKa.clearCache('cool_items', null, function() {
//Your flow logic
});
```

Cache-ka also works with custom keys in your `.cache()` query that allows you to remove cache by key.

```javascript
const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

cacheKa(mongoose, {    
  host: '127.0.0.1',   
  port: 6379        
});

const parentID = '12052020';

Item
  .find({ parentID })
  .cache(0, null, userId + '_custom') // Will create a redis entry with key - 12052020_custom



ItemSchema.post('save', function(item) {
  // Clear the parent's cache when item is added/updated
  cacheKa.clearCache(null, item.parentID + '_custom', function() {
     //Your flow logic
  });
});
```

## Clearing the cache ##

You can clean cache for a query with custom key, group of queries with a custom prefix and clean entire cache.

```javascript
//For all queries related to prefix 
cacheKa.clearCache('prefix', null, function(){
    //Your flow logic
});

//For custom key. 
cacheKa.clearCache(null, 'key', function(){
    //Your flow logic
});

//Entire cache
cacheKa.clearCache(null, null, function(){
    //Your flow logic
});
```

## Connecting to redis ##
Add you redis `host` and `port` as properties to options object of cache-ka initialisation. 
It will create new redis client and connect it to your redis.

```javascript
const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

cacheKa(mongoose, {    
  host: '127.0.0.1',    // Redis host. Defaut value is 127.0.0.1.
  port: 6379            // Redis port. Default value is 6379.
});
```
If you already has redis client you want to use you can pass it as `redisClient` property ot options object

```javascript
const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

const redis = require('redis');

const redisClient = redis.createClint({    
    host: '127.0.0.1', 
    port: 6379 
})

cacheKa(mongoose, { redisClient });
```

If you are using `async-redis` library use `redisClientAsync` property instead

```javascript
const mongoose = require('mongoose');
const cacheKa = require('cache-ka');

const redis = require('async-redis');

const redisClientAsync = redis.createClint({    
    host: '127.0.0.1', 
    port: 6379 
})

cacheKa(mongoose, { redisClientAsync });
```

## Caching populated documents ##

When a document returns from the cache, cache-ka [hydrate](http://mongoosejs.com/docs/api.html#model_Model.hydrate) it, which initializes its methods and virtuals. Hydrating a populated document will discard any populated fields (see [Automattic/mongoose#4727](https://github.com/Automattic/mongoose/issues/4727)). To cache populated documents without losing child items, use `.lean()`, but it returns a plain object, so you will not be able to use methods and virtuals.
