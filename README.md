![](https://s3.us-west-000.backblazeb2.com/constellationsdb/marketing/web/png/color.png)
# Polaris: Simple real-time messaging

This is our internal real-time messaging micro-service which allows us to transmit messages around the world.

### How to use
Polaris has no internal authorization, it relies on the project integrating with it to provide authorization. The basic idea is that you must submit a token to the API, then the end user can submit the same token to the WebSocket. This allows Polaris to be authorization independent without having security issues.

### Why?
Existing solutions are either too complex, require us to use their authorization system, or cost too much to operate. Polaris is designed to be a simple RTM microservice, using uWS.js to enable high-speed, high-throughput messages.