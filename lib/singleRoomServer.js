const MediaSoupRoom = require('./MediaSoupRoom.js')
const socketIO = require('socket.io');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');


const log=console

class SingleRoomServer {

    constructor(){
        this.room=null;
    }


    listen(options) {
        this.options = options;
        this.peers=new Map();

        MediaSoupRoom.init(this.options.mediaRoom)

        this.createRoom(1);

        if(!this.webServer) {
            this.startWebServer();
        }

        log.info(`Listen to port ${options.port}`)
        log.info(`Open https://localhost:${options.port}`)

        return this;
    }

    startWebServer() {
        const app = express();
        app.use(bodyParser.json());

        this.webServer = https.createServer(this.options, app).listen(this.options.port, () => {
        });

        app.use(express.static(this.options.path));
        app.get('/room/:id',  (req, res)=> {
            if (req.params.id==="*") {
                res.send( [ { id: "a", url: "wss://localhost:3888"}])
            }
        })

        app.post('/mediasoup-request',  (req, res)=> {
            log.info("got mediasoup-request "+JSON.stringify(req.body))
            return this.room.internalRoom.receiveRequest(req.body).then (response=> {
                log.info("returned mediasoup-request "+JSON.stringify(response))
                return res.send(response);
            })
        });

        this.io = socketIO().listen(this.webServer);



        this.io.on('connect', (client)=>{

            this.peers.set(client.id,client);

            log.info(`Peer ${client.id} connected!`);

            client.on('mediasoup-request', (message)=>{

            });

            client.on('disconnect', (reason)=> {
                log.info(`Peer ${client.id} Disconnected!`);

                this.peers.delete(client.id);

            });
        });

    }



    createRoom(id) {
        let sfuRoom = new MediaSoupRoom(id);
        return sfuRoom.init().then( (sfuRoom)=> {

            let room = {
                id: id,
                isLocal: true,
                url: "ws://localhost:3888/"+id,
                internalRoom: sfuRoom,
                toJSON: function() {
                    return {
                        id: this.id,
                        url: this.url
                    };
                }
            };


            this.room=room;


            console.warn(`room: ${room}`)

            return Promise.resolve(room);

        }).catch(err=> {
            console.warn(err);
        });
    }
}

module.exports=SingleRoomServer;
