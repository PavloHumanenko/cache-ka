'use strict';

require('should');

const mongoose = require('mongoose');
const cacheKa = require('../lib');
const Schema = mongoose.Schema;

let TestItemSchema;
let TestItem;
let db;

describe('cache-ka', () => {
    before((done) => {
        cacheKa(mongoose);

        mongoose.connect('mongodb://127.0.0.1/mongoose-testing', { useUnifiedTopology: true, useNewUrlParser: true  });
        db = mongoose.connection;

        db.on('error', done);
        db.on('open', done);

        TestItemSchema = new Schema({
            num: Number,
            str: String,
            date: {
                type: Date,
                default: Date.now
            }
        });

        TestItem = mongoose.model('TestItem', TestItemSchema);
    });

    beforeEach(() => {
        return createItems(10);
    });

    afterEach((done) => {
        TestItem.deleteMany(() => {
            cacheKa.clearCache(null, null, done);
        });
    });

    it('should work with callbacks', (done) => {
        getAll(60, (err, response) => {
            if (err) return done(err);

            response.length.should.equal(10);

            createItems(10).then(() => {
                getAll(60, (err, response) => {
                    if (err) return done(err);
                    response.length.should.equal(10);
                    done();
                });
            });
        });
    });

    it('should work with promises', async () => {
        const response = await getAll(60);
        response.length.should.equal(10);

        await createItems(10);
        const cachedRes = await getAll(60);
        cachedRes.length.should.equal(10);
    });

    it('should work with prefixes', async () => {
        const response = await getAllPrefix(60, 'TEST');
        response.length.should.equal(10);

        await createItems(10);
        const cachedRes = await getAllPrefix(60, 'TEST');
        cachedRes.length.should.equal(10);
    });

    it('should not cache the same query if cache is not added to chain', async () => {
        const response = await getAll(60);
        response.length.should.equal(10);

        await createItems(10);

        const noCache = await getAllWithoutCache();
        noCache.length.should.equal(20);
    });

    it('should return a Mongoose model from cached and non-cached results', (done) => {
        getAll(60, (err, response) => {
            if (err) return done(err);

            const first = response[0];

            getAll(60, (err, response2) => {
                if (err) return done(err);

                const cachedFirst = response2[0];
                first.constructor.name.should.equal('model');
                cachedFirst.constructor.name.should.equal('model');

                response[0].isNew.should.be.false;
                response2[0].isNew.should.be.false;

                done();
            });
        });
    });

    it('should return lean models from cached and non-cached results', async () => {
        const lean = await getAllLean(10);
        lean.length.should.equal(10);

        await createItems(10);

        const cachedLean = await getAllLean(10);
        cachedLean.length.should.equal(10);

        lean[0].constructor.name.should.not.equal('model');
        cachedLean[0].constructor.name.should.not.equal('model');
    });

    it('should works with query that returns no results', async () => {
        const empty = await getNone(60);
        empty.length.should.equal(0);

        await createItems(10);

        const cachedEmpty = await getNone(60);
        cachedEmpty.length.should.equal(0);
    });

    it('should distinguish between lean and non lean for the same conditions', async () => {
        const response = await getAll(60);
        response.length.should.equal(10);

        await createItems(10);

        const cachedRes = await getAll(60);
        cachedRes.length.should.equal(10);

        const nonCachedLean = await getAllLean(60);
        nonCachedLean[0].constructor.name.should.not.equal('model');
    });

    it('should work with the same query but with different condition order', async () => {
        const response = await getAndUnorderedQuery(60, true);
        response.length.should.equal(10);

        await createItems(10);

        const cached = await getAndUnorderedQuery(60, false);
        cached.length.should.equal(10);
    });

    it('should work with skip', async () => {
        const response = await getAndSkip(1, 60);
        response.length.should.equal(9);

        await createItems(10);

        const cachedRes = await getAndSkip(1, 60);
        cachedRes.length.should.equal(9);

        const nonCached = await getAndSkip(2, 60);
        nonCached.length.should.equal(18);
    });

    it('should work with limit', async () => {
        const response = await getAndLimit(5, 60);
        response.length.should.equal(5);

        await TestItem.deleteMany({});

        const cached = await getAndLimit(5, 60);
        cached.length.should.equal(5);

        await createItems(10);

        const nonCached = await getAndLimit(4, 60);
        nonCached.length.should.equal(4);
    });

    it('should work findOne query', async () => {
        const one = await getOne(60);
        Boolean(one).should.be.true;

        await TestItem.deleteMany({});

        const cachedOne = await getOne(60);
        Boolean(cachedOne).should.be.true;
    });

    it('should work regex properly', async () => {
        const response = await getAllWithRegex(60);
        response.length.should.equal(10);

        await createItems(10);

        const cached = await getAllWithRegex(60);
        cached.length.should.equal(10);

        const nonCached = await getNoneWithRegex(60);
        nonCached.length.should.equal(0);
    });

    it('should cache a query rerun many times', async () => {
        const response = await getAll(60);
        response.length.should.equal(10);

        await createItems(10);

        await Promise.all(new Array(20).join('.').split('').map(() => getAll(60)));

        const cached = await getAll(60);
        cached.length.should.equal(10);
    });

    it('should expire the cache', (done) => {
        getAll(1, () => {
            createItems(10).then(() => {
                setTimeout(() => {
                    getAll(1, (err, response) => {
                        if (err) return done(err);

                        response.length.should.equal(20);
                        done();
                    });
                }, 1200);
            });
        });
    });

    it('should expire the cache in case of nested storing', (done) => {
        getAllPrefix(1, 'test',() => {
            createItems(10).then(() => {
                setTimeout(() => {
                    getAllPrefix(1, 'test',(err, response) => {
                        if (err) return done(err);

                        response.length.should.equal(20);
                        done();
                    });
                }, 1200);
            });
        });
    });

    it('should work with aggregate on callbacks', (done) => {
        aggregate(60, (err, response) => {
            if (err) return done(err);

            response[0].total.should.equal(45);

            createItems(10).then(() => {
                aggregate(60, (err, cached) => {
                    if (err) return done(err);

                    cached[0].total.should.equal(45);
                    done();
                });
            });
        });
    });

    it('should work with aggregate on Promise', async () => {
        const [response] = await aggregate(60);
        response.total.should.equal(45);

        await createItems(10);

        const [cached] = await aggregate(60);
        cached.total.should.equal(45);
    });


    it('should work with aggregate and prefix', async () => {
        const [response] = await aggregateWithPrefix(60, 'TEST');
        response.total.should.equal(45);

        await createItems(10);

        const [cached] = await aggregateWithPrefix(60, 'TEST');
        cached.total.should.equal(45);
    });

    it('should clear a prefix', async () => {
        const response = await getAllPrefix(60, 'PREFIX');
        response.length.should.equal(10);

        await createItems(10);

        const cached = await getAllPrefix(60, 'PREFIX');
        cached.length.should.equal(10);

        await cacheKa.clearCache('PREFIX');

        const notCached = await getAllPrefix(60, 'PREFIX');
        notCached.length.should.equal(20);
    });

    it('should clear a custom key', async () => {
        const response = await getAllCustomKey(60, 'custom-key');
        response.length.should.equal(10);

        await createItems(10);

        const cached = await getAllCustomKey(60, 'custom-key');
        cached.length.should.equal(10);

        cacheKa.clearCache('','custom-key');

        const notCached = await getAllCustomKey(60, 'custom-key');
        notCached.length.should.equal(20);
    });

    it('should work with a count query', async () => {
        const response = await count(60);
        response.should.equal(10);

        await createItems(10);

        const cached = await count(60);
        cached.should.equal(10);
    });

    it('should work with count query in case of 0 response', async () => {
        await TestItem.deleteMany({});

        const response = await count(60);
        response.should.equal(0);

        await createItems(2);
        const cached = await count(60);

        cached.should.equal(0);
    });
    it('should work with countDocuments query', async () => {
        const response = await countDocuments(60);
        response.should.equal(10);

        await createItems(10);

        const cached = await countDocuments(60);
        cached.should.equal(10);
    });

    it('should work with countDocuments query in case of 0 response', async () => {
        await TestItem.deleteMany({});

        const response = await countDocuments(60);
        response.should.equal(0);

        await createItems(2);
        const cached = await countDocuments(60);

        cached.should.equal(0);
    });
    it('should work with estimatedDocumentCount query', async () => {
        const response = await estimatedDocumentCount(60);
        response.should.equal(10);

        await createItems(10);

        const cached = await estimatedDocumentCount(60);
        cached.should.equal(10);
    });

    it('should work with estimatedDocumentCount query in case of 0 response', async () => {
        await TestItem.deleteMany({});

        const response = await estimatedDocumentCount(60);
        response.should.equal(0);

        await createItems(2);
        const cached = await estimatedDocumentCount(60);

        cached.should.equal(0);
    });

    it('should work with sort order', async () => {
        const response = await getAllSorted({ num: 1 });
        response.length.should.equal(10);

        await createItems(10);

        const cached = await getAllSorted({ num: 1 });
        cached.length.should.equal(10);

        const diffSort = await getAllSorted({ num: -1 });
        diffSort.length.should.equal(20);
    });

    it('should throw an error if no hydrate method available', () => {
        const mongoose = { Model: { hydrate: undefined } };
        (() => cacheKa(mongoose)).should.throw();
    });

    it('should not throw an error if the hydrate method exists in mongoose.Model', () => {
        (() => cacheKa(mongoose)).should.not.throw();
    });

    it('should have cache method after initialization', () => {
        TestItem.find({}).cache.should.be.a.Function;
    });
});

function getAll(ttl, cb) {
    return TestItem.find({}).cache(ttl).exec(cb);
}

function getAllCustomKey(ttl, key, cb) {
    return TestItem.find({}).cache(ttl, '', key).exec(cb);
}

function getAllPrefix(ttl, prefix, cb) {
    return TestItem.find({}).cache(ttl, prefix).exec(cb);
}

function getAllWithoutCache(cb) {
    return TestItem.find({}).exec(cb);
}

function getAllLean(ttl, cb) {
    return TestItem.find({}).lean().cache(ttl).exec(cb);
}

function getOne(ttl, cb) {
    return TestItem.findOne({ num: { $gt: 2 } }).cache(ttl).exec(cb);
}

function getAndSkip(skip, ttl, cb) {
    return TestItem.find({}).skip(skip).cache(ttl).exec(cb);
}

function getAndLimit(limit, ttl, cb) {
    return TestItem.find({}).limit(limit).cache(ttl).exec(cb);
}

function getNone(ttl, cb) {
    return TestItem.find({ notFound: true }).cache(ttl).exec(cb);
}

function getAllWithRegex(ttl, cb) {
    return TestItem.find({ str: { $regex: /\d/ } }).cache(ttl).exec(cb);
}

function getNoneWithRegex(ttl, cb) {
    return TestItem.find({ str: { $regex: /\d\d/ } }).cache(ttl).exec(cb);
}

function getAndUnorderedQuery(ttl, reverse, cb) {
    if (reverse) {
        return TestItem.find({ num: { $exists: true }, str: { $exists: true } }).cache(ttl).exec(cb);
    } else {
        return TestItem.find({ str: { $exists: true }, num: { $exists: true } }).cache(ttl).exec(cb);
    }
}

function getAllSorted(sortObj) {
    return TestItem.find({}).sort(sortObj).cache(60).exec();
}

function count(ttl, cb) {
    return TestItem.find({})
        .count()
        .cache(ttl)
        .exec(cb);
}

function estimatedDocumentCount(ttl, cb) {
    return TestItem.find({})
        .estimatedDocumentCount()
        .cache(ttl)
        .exec(cb);
}

function countDocuments(ttl, cb) {
    return TestItem.find({})
        .countDocuments()
        .cache(ttl)
        .exec(cb);
}

function aggregate(ttl, cb) {
    return TestItem.aggregate()
        .group({ _id: null, total: { $sum: '$num' } })
        .cache(ttl)
        .exec(cb);
}

function aggregateWithPrefix(ttl, prefix, cb) {
    return TestItem.aggregate()
        .group({ _id: null, total: { $sum: '$num' } })
        .cache(ttl, prefix)
        .exec(cb);
}

function createItems(amount) {
    const items = [];

    for (let i = 0; i < amount; i++) {
        items.push({num: i, str: i.toString()});
    }

    return TestItem.create(items);
}
