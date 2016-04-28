local rlKey = KEYS[1]
local tokenKey = KEYS[2]
local epochKey = KEYS[3]
local currentEpoch = tonumber(ARGV[1])
local requestCost = tonumber(ARGV[2])
local rateLimit = tonumber(ARGV[3])
local keyTimeout = ARGV[4]

local secondsInMinute = 60
local millisecondsInSecond = 1000
local returnStatus = 0

local storedRateLimit = redis.call('get', rlKey)
if storedRateLimit == false then
    storedRateLimit = rateLimit
    redis.call('set', rlKey, storedRateLimit, 'EX', keyTimeout)
else
    storedRateLimit = tonumber(storedRateLimit)
end

local storedEpoch = redis.call('get', epochKey)
local currentTokens = 0
if storedEpoch == false or (currentEpoch - tonumber(storedEpoch)) > (secondsInMinute * millisecondsInSecond) then
    redis.call('set', epochKey, currentEpoch, 'EX', keyTimeout)
    currentTokens = storedRateLimit
else
    currentTokens = redis.call('get', tokenKey)
    if currentTokens == false then
        redis.call('set', tokenKey, storedRateLimit, 'EX', keyTimeout)
        currentTokens = storedRateLimit
    else
        currentTokens = tonumber(currentTokens)
    end
end

if ((currentTokens <= 0) or (requestCost > currentTokens)) then
    returnStatus = -1
else
    currentTokens = math.max(currentTokens - requestCost, 0)
    redis.call('set', tokenKey, currentTokens, 'EX', keyTimeout)
end

return {returnStatus, currentTokens}
