// const dotenv = require('dotenv');
// dotenv.config();
const axios = require('axios')
const uWS = require('uWebSockets.js') 
const port = process.env.PORT || 5000 // by default, it will run on port 5000 however set the PORT env var and it will run there.
const key = process.env.KEY
const createNanoEvents = require('nanoevents').createNanoEvents
const emitter = createNanoEvents()

const readJson = require('./utils')

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

var clients = []

var SUB_STORE = {}

const HISTORY = []

const add_to_history = (obj) => {
    if (HISTORY.length > 1000) {
        HISTORY = HISTORY.splice(0, 1)
    }

    HISTORY.push(obj)
}

const replay_history = (ws, channel) => {
    HISTORY.forEach(obj => {
        if (obj.channel == channel) {
            ws.send_raw(obj)
        }
    })
}

const log = (msg) => {
    console.log(msg)
}

log('Server is starting...')

const app = uWS.App({})
.ws('/v1/realtime', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 120,
    /* Handlers */
    async upgrade(res, req, ctx) {
        res.onAborted(() => {
            res.aborted = true
        })

        var ip = req.getHeader('x-real-ip')

        const url = req.getUrl();
        const secWebSocketKey = req.getHeader('sec-websocket-key');
        const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
        const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

        log(`New connection from ${ip}`)

        if (!res.aborted) {
            res.upgrade(
                {
                    url,
                    ip
                },
                secWebSocketKey,
                secWebSocketProtocol,
                secWebSocketExtensions,
                ctx
            );
        }
    },
    open: (ws) => {
        ws.send('{"action": "HELLO", "data": "© ConstellationsDB - Data, but realtime! Powered by 🍕"}')

        // Small helper function to forward DATA payloads to the client
        ws.send_raw = (d) => {
            d.action = 'DATA'
            return ws.send(JSON.stringify(d))
        }

        ws.listeners = {}
        ws.listeners[`global`] = emitter.on(`global`, ws.send_raw)

        ws.latency = 0 // milliseconds
        ws.latency_history = []
        ws.latency_loop = setInterval(() => {
            ws.send(JSON.stringify({action: 'PING'}))
            ws.__latency_last_date = new Date()
        }, 30000)

        ws.unsubscribe =  async (channel) => {
            if (ws.listeners[channel]) {
                ws.listeners[channel]()
            }
            
            delete ws.listeners[channel]
            return ws.send(JSON.stringify({channel, event: 'subscription.removed', data: {}}))
        }

        clients.push(ws)
    },
    message: async (ws, message, isBinary) => {
        var incoming = ab2str(message)
        var data

        try {
            data = JSON.parse(incoming)
        } catch (e) {
            ws.send(JSON.stringify({success: false, error: 'Invalid JSON was sent.'}))
        }

        if (data.action == 'PONG') {
            var last = (ws.__latency_last_date || new Date()).getTime()
            var now = new Date().getTime()
            ws.latency = (now - last)
        }

        if (data.action == 'SUB') {
            // user signals intent to subscribe to event.
            var id = data.token

            console.log(SUB_STORE)
            var sub_entry = SUB_STORE[id]
            log(`Sub req using ${id}`)

            if (!sub_entry) {
                return ws.send(JSON.stringify({success: false, error: 'Token is invalid'}))
            }

            var listener = ws.listeners[sub_entry.channel]
            if (listener) {
                return ws.send(JSON.stringify({channel: sub_entry.channel, event: 'subscription.successful', data: { message: 'Already subscribed.' }}))
            }

            ws.listeners[sub_entry.channel] = emitter.on(sub_entry.channel, ws.send_raw)
            delete SUB_STORE[id]

            replay_history(
                ws,
                sub_entry.channel
            )

            return ws.send(JSON.stringify({channel: sub_entry.channel, event: 'subscription.successful', data: {}}))
        }

        if (data.action == 'UNSUB') {
            // run the unbind func
            return ws.unsubscribe(data.channel)
        }
    },
    drain: (ws) => {
    },
    close: (ws, code, message) => {
        log(`Connection closed for ${ws.ip}`)

        for(var i in clients) {
            if(clients[i]._id == ws._id) {
                clients.splice(i,1);
                break;
            }
        }

        if (ws.listeners) {
            Object.values(ws.listeners).forEach(l => {
                if (l) {
                    l()
                }
            })
        }

        clearInterval(ws.latency_loop)
    }
})

.post('/v1/inbound', (res, req) => {
    res.onAborted(() => {
        res.aborted = true
    })

    readJson(res).then((obj) => {
        if (obj.key != key) {
            return res.end(JSON.stringify({success: false, error: 'Key is not correct' }))
        }

        delete obj.key

        emitter.emit(obj.channel, obj)
        add_to_history(obj)
        res.end('Thanks for this json!')
    });
})

.post('/v1/realtime/subscribe', (res, req) => {
    res.onAborted(() => {
        res.aborted = true
    })

    readJson(res).then((obj) => {
        if (obj.key != key) {
            return res.end(JSON.stringify({success: false, error: 'Key is not correct' }))
        }

        delete obj.key

        SUB_STORE[obj.secret_key] = obj
        res.end('Thanks for this json!')
    })
})

.get('/', (res) => {
    res.end('Woof')
})

.any('/*', (res, req) => {
    res.end('🚀');
})

.listen(port, (token) => {
    console.log(token)
})

console.log('END')