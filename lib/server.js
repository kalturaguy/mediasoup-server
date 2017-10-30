'use strict';

//process.env.DEBUG = "mediasoup*";


const https = require('https');
const express = require('express');
const Promise = require('bluebird');
const socketIO = require('socket.io');
const EventEmitter = require('events');
const bodyParser     =        require("body-parser");

const Rooms = require('./Rooms.js');


let log=console;

class WebRtcServer  {
	constructor(){
	}


	listen(options) {
		this.options = options;

		this._rooms=new Rooms(options);


        if(!this.webServer) {
			this.startWebServer();
		}

		log.info(`Listen to port ${options.port}`)
		return this;
	}

	startWebServer() {
		const app = express();

		this.webServer = https.createServer(this.options, app).listen(this.options.port, () => {
		});
		app.use(bodyParser.json());

        app.use(express.static(this.options.path));

        app.get('/room/:id',  (req, res)=> {
        	if (req.params.id==="*") {
                res.send(this._rooms.list())
			}
			else {
                this._rooms.get(req.params.id).then( room => {
                	console.warn(`Added room: ${room}`)
                    res.send(room);
                });
			}
        })
	}
}

module.exports = WebRtcServer;
