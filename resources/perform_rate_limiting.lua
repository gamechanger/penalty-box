local rlKey = KEYS[1]
local tokenKey = KEYS[2]
local epochKey = KEYS[3]

local currentEpoch = tonumber(ARGV[1])
local requestCost = tonumber(ARGV[2])

local rateLimitPerHour = tonumber(redis.call('get', rlKey))
local currentTokens = tonumber(redis.call('get', tokenKey))
local pastEpoch = tonumber(redis.call('get', epochKey))
local epochDiffSec = (currentEpoch - pastEpoch) / 1000

if (epochDiffSec > 180) then
    local addTokens = epochDiffSec * rateLimitPerHour / 3600
    currentTokens = math.min(currentTokens + addTokens, rateLimitPerHour)
    redis.call('set', tokenKey, tostring(currentTokens))
end

if (currentTokens <= 0) then
    return -1
else
    currentTokens = math.max(currentTokens - requestCost, 0)
    redis.call('set', tokenKey, tostring(currentTokens))
    return currentTokens
end
