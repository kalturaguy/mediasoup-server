const Promise = require('bluebird');
const MediaSoupRoom = require('./mediaSoupRoom.js');


class Rooms {

    constructor(options){
        this._rooms=new Map();
        MediaSoupRoom.init(options);

    }

    lock(id) {
        return Promise.resolve();
    }
    unlock(id) {
    }
    get(id) {
        return this.lock(id).then( ()=> {
            let room= this._rooms.get(id);
            if (room) {
                return Promise.resolve(room);
            }
            return this.createRoom(id);

        }).finally( ()=> {
            this.unlock(id);
        });
    }
    list() {
        let obj = Object.create(null);
        for (let [k,room] of  this._rooms) {
            obj[k] =  room
        }
        return obj;
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
            this._rooms.set(id, room);

            console.warn(`room: ${room}`)

            return Promise.resolve(room);

        }).catch(err=> {
            console.warn(err);
        });
    }

}
module.exports = Rooms;

