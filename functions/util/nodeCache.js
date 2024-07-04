const NodeCache = require("node-cache");
const cache = new NodeCache({
    stdTTL: 600
}); // Default cache expiration: 10 minutes

// Function to set a cache entry with custom key and expiration
exports.setCache = (key, value, ttl = cache.options.stdTTL) => {
    cache.set(key, value, ttl);
}

// Function to get a cached value by key
exports.getCache = (key) => {
    return cache.get(key);
}

// Function to delete a cache entry by key
exports.deleteCache = (key) => {
    cache.del(key);
}