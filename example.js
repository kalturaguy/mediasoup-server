'use strict';

process.env.DEBUG = "mediasoup*";

const fs = require('fs');
const ip = require('ip');
const path = require('path');

const {WebRtcServer, RtspServer, SingleRoomServer} = require('./index.js');

const recordingsPath = path.join(__dirname, "recordings");
const ipAddress = ip.address();

const webRtcServer = new SingleRoomServer();
webRtcServer
.listen({
	enableDebug: true,
	key: fs.readFileSync('keys/server.key'),
	cert: fs.readFileSync('keys/server.crt'),
	port: 3888,
	path: 'public',
})