local rlKey = KEYS[1]
local tokenKey = KEYS[2]
local epochKey = KEYS[3]
local currentEpoch = ARGV[1]
local rateLimit = ARGV[2]
local keyTimeout = ARGV[3]

if redis.call('get', rlKey) == false then
    redis.call('setex', rlKey, keyTimeout, rateLimit)
end

if redis.call('get', tokenKey) == false then
    redis.call('setex', tokenKey, keyTimeout, rateLimit)
end

if redis.call('get', epochKey) == false then
    redis.call('setex', epochKey, keyTimeout, currentEpoch)
end
