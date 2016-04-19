## Penalty Box - A redis backed rate limiter service
[![Github License](https://img.shields.io/github/license/gamechanger/.svg)](https://github.com/gamechanger/penalty-box/blob/master/LICENSE)

### Installation
Penalty Box is a Node.js service. After cloning the repository, you can run it with:
```
npm install
node penalty-box.js
```

### Getting Started
Penalty Box relies on a redis instance and can send metrics to a datadog server.
Penalty Box knows about the following configuration variables (defaults in parentheses):
```
debug: if True, enables additional debug information in logs (false)
log_requests: if True, logs info on each HTTP request to stdout
port: port on which to run the Penalty Box HTTP API (80)
redis_host: host of the underlying Redis instance (localhost)
redis_port: port of the underlying Redis instance (6379)
port: port on which to run the Penalty Box HTTP API (80)
datadog_host: host of the datadog server (localhost)
datadog_port: port to connect to on the datadog host (8135)
```

### Example Usage
Penalty Box is an independent service which can be used to keep track of requests and inform clients when a request should be rate limited.
Lets say you are working on a web application and you want to rate limit by user_id. You can post a request like the following to Penalty Box:
```
POST /rate-limit
{
    appName: "web"
    key: "<user_id>"
    cost: 1
    rateLimit: 60
}
```
These four arguments are the only ones that rate limit accepts.  They describe a unique name space (using appName and key), provide the cost for the request (cost), and how many requests are allowed per minute (rateLimit).

Penalty Box will respond with a response as follows:
```
200 Success
{
    limit: 60
    remaining: 59
    is_rate_limted: false
    reset: <epoch_time_in_ms_till_rate_limit_is_reset>
}
```

Some important information on the response body:
```
limit - once set will not change
remaining - tells clients how many requests left they have for the current minute
is_rate_limited - will return false as long as the cost does not exceed the amount of requests remaining
reset - epoch time in milliseconds when your current rate limiting window resets
```

### Edge Cases
#### Cost > Remaining and Remaining != 0
Lets say you are making a request and your previous response from Penalty Box was:
```
200 Success
{
    limit: 60
    remaining: 10
    is_rate_limted: false
    reset: <epoch_time_in_ms_till_rate_limit_is_reset>
}
```

If you make a new requests to Penalty Box:
```
POST /rate-limit
{
    appName: "web"
    key: "<user_id>"
    cost: 20
    rateLimit: 60
}
```

Your response will be:
```
    limit: 60
    remaining: 10
    is_rate_limted: true
    reset: <epoch_time_in_ms_till_rate_limit_is_reset>
```

It is important to note that `remaining` is still at ten. If your cost was greater than remaining we do not remove any requests from remaining, we simply tell you your request has been rate limited.
