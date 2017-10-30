'use strict';

const udid = require('udid');
const path = require('path');
const Promise = require('bluebird');
const roomOptions = require('../data/options').roomOptions;

const mediasoup = require('mediasoup');

let mediaServer = null;

const log=console;


class MediaSoupRoom {

	static init(options) {
        mediaServer = mediasoup.Server(options);
        mediaServer.on('newroom', (room) =>
        {
            room.on('newpeer', (peer) =>
            {


                peer.on('newtransport', (transport) =>
                {
                });

                peer.on('newproducer', (producer) =>
                {
                });

                peer.on('newconsumer', (consumer) =>
                {
                });
            });
        });

	}

	constructor(id){
		this.id=id;
		this.requestId=0;
	}

	init() {
		this.mediaRoom=mediaServer.Room(roomOptions.mediaCodecs);
/*
        let request =  {
            method: 'queryRoom',
            target: 'room'
        }

        this.receiveRequest(request);*/

		return Promise.resolve(this);
	}

    receiveRequest(request) {
        let requestId= this.requestId++;
        log.warn("request #"+requestId+": "+JSON.stringify(request));

        return this.mediaRoom.receiveRequest(request)
            .then( response=> {

                console.warn("response #"+requestId+": ",JSON.stringify(response));

                return response;
            });
    }


}

module.exports = MediaSoupRoom;