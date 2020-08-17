'use strict';

const jsoSort = require('jsosort');
const sha1 = require('sha1');

module.exports = (object) => {
    const sortedObj = jsoSort(object);

    const objectString = JSON.stringify(sortedObj, (key, val) => val instanceof RegExp ? String(val) : val);

    return sha1(objectString);
};
