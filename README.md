# ⭐ Polaris: Real-time microservice

This is our internal real-time messaging micro-service which allows us to transmit events with ease. 

### How does it work?
Polaris has no built-in authorization, it relies on the API integrating with it to provide authorization. The idea is that you must submit a token to the API, then the end user can submit the same token to the WebSocket. This allows Polaris to be authorization agnostic without data being public.

1) User connects to Polaris
2) User requests a token from your API
3) Your API sends a subscribe event to Polaris with the channel name and a secret token you generate
   - POST /v1/realtime/subscribe -> `{ "channel_name": "example", "token": "rtm_000000" }`
5) The user then provides this token to Polaris and is then allowed to view events in that channel
   - WebSocket message -> `{ "action": "SUB", "token": "rtm_000000" }`

### Why?
Existing solutions are either too complex, require us to use their authorization system, or cost too much to operate. Polaris is designed to be a simple RTM microservice, using uWS.js to enable high-speed, high-throughput messages.

### Credits
Created by Cerulean for ConstellationsDB
![](https://s3.us-west-000.backblazeb2.com/constellationsdb/marketing/web/png/black.png)