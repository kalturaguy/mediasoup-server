'use strict';

//process.env.DEBUG = "mediasoup*";


const https = require('https');
const express = require('express');
const Promise = require('bluebird');
const socketIO = require('socket.io');
const EventEmitter = require('events');
const bodyParser     =        require("body-parser");

const mediasoup = require('mediasoup');

const WebRtcRoom = require('./room.js');
const WebRtcConnection = require('./connection.js');

class WebRtcServer extends EventEmitter {
	constructor(){
		super();

		this.rooms = {};
		this.roomsList = {};
	}

	getRoomsList() {
		return this.roomsList;
	}

	getRoom(id) {
		return this.rooms[id];
	}

	addRoom(name) {
		let room = new WebRtcRoom(this.mediaServer, name);
		this.rooms[room.id] = room;
		this.roomsList[room.id] = room.name;

		return room.init();
	}

	setWebServer(webServer) {
		this.webServer = webServer;
		return this;
	}

	listen(options) {
		this.options = options;

		this.mediaServer = mediasoup.Server(options);

		if(!this.webServer) {
			this.startWebServer();
		}

		this.startSocketIoServer();

		setTimeout(() => {
			this.emit('listen');
		}, 0);

		return this;
	}

	startWebServer() {
		const app = express();

		this.webServer = https.createServer(this.options, app).listen(this.options.port, () => {
			this.emit('web-listen', this.options.port);
		});
		app.use(bodyParser.json());

        app.use(express.static(this.options.path));
        app.get('/room/:id',  (req, res)=> {
            res.send(this.roomsList)
        })
        app.post('/room',  (req, res)=> {

			this.addRoom(req.body.name)
				.then((room) => {
					res.send( {
						id: room.id,
						name: room.name
					});
				});
		});
	}

	startSocketIoServer() {
		this.io = socketIO(this.webServer);
		this.io.on('connection', (socket) => {
			const connection = new WebRtcConnection(this, socket);
			this.emit('new-connection', connection);
		});
	}
}

module.exports = WebRtcServer;
