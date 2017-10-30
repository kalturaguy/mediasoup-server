
let socket = null;
let localVideo = null;
let remoteContainer = null;
let stateSpan = null;
let localStream = null;
let peerConnection = null;
let usePlanB = false;
let roomId = null;
let room=null;

//var mediasoupClient = require('mediasoup-client.js')
//import * as mediasoupClient from './mediasoup-client/dist/mediasoup-client.js'

let peerConnectionRx = null;

 function init() {
    localVideo = document.getElementById('local_video');
    remoteContainer = document.getElementById('remote_container');
    stateSpan = document.getElementById('state_span');

    if (window.window.webkitRTCPeerConnection) {
        usePlanB = true;
    }

    navigator.getUserMedia	= navigator.getUserMedia
        || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia
        || navigator.msGetUserMedia;

    RTCPeerConnection = window.RTCPeerConnection
        || window.webkitRTCPeerConnection
        || window.mozRTCPeerConnection;

    RTCSessionDescription = window.RTCSessionDescription
        || window.webkitRTCSessionDescription
        || window.mozRTCSessionDescription;


    listRooms().then ( (rooms)=> {
        if (rooms.length>0) {
            joinRoom(rooms[0])
        }
    })


    updateView();
}

function joinRemoteRoom() {
    // Join the remote Room.
    room.join(socket.id)
        .then((peers) =>
        {
            // Handle Peers already in to the Room.
            for (const peer of peers)
            {
                //handlePeer(peer);
            }
        })
        .then(() =>
        {
            // Get our mic and webcam.
            return navigator.mediaDevices.getUserMedia(
                {
                    audio : true,
                    video : true
                });
        })
        .then((stream) =>
        {
            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];

            // Create Producers for audio and video.
            const audioProducer = room.createProducer(audioTrack);
            const videoProducer = room.createProducer(videoTrack);


            // Create a Transport for receiving media from remote Peers.
            const recvTransport = room.createTransport('recv');

            // Create a Transport for sending our media.
            const sendTransport = room.createTransport('send');

            // Send our audio.
            audioProducer.send(sendTransport)
                .then(() => console.log('sending our mic'));

            // Send our video.
            videoProducer.send(sendTransport)
                .then(() => console.log('sending our webcam'));
        }).catch(e=> {
        console.warn(e);
    });
}

function initSocketIo(url) {

    room = new mediasoupClient.Room();


    // Be ready to send mediasoup client requests to our remote mediasoup Peer in
// the server, and also deal with their associated responses.
    room.on('request', (request, callback, errback) =>
    {
        sendRoomRequest("https://localhost:3888",request )
            .then((response) =>
            {
                // Success response, so pass the mediasoup response to the local Room.
                callback(response);
            })
            .catch((error) =>
            {
                // Error response, so pass the error to the local Room.
                errback(error);
            });
    });


// Be ready to send mediasoup client notifications to our remote mediasoup
// Peer in the server
    room.on('notify', (notification) =>
    {
        channel.send({ type: 'mediasoup-notification', body: notification });
    });


    socket = io(url);


// Be ready to receive mediasoup notifications from our remote mediasoup Peer
// in the server.
    socket.on('message', (message) =>
    {
        if (message.type === 'mediasoup-notification')
        {
            // Pass the mediasoup notification to the local Room.
            room.receiveNotification(message.body);
        }
        else
        {
            // Handle here app custom messages (chat, etc).
        }
    });

    socket.on('connect', ()=> {
        joinRemoteRoom();
    });

    socket.on('error', function (err) {
        console.error('Socket.io error:', err);
    });


    socket.on('offer', function (sdp) {
        console.log('Receive [offer]: ', sdp);
        let offer = new RTCSessionDescription({
            type: 'offer',
            sdp: sdp
        });
        setOffer(offer);
    });

    socket.on('answer', function (sdp) {
        console.log('Receive [answer]: ', sdp);
        let answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdp
        });
        setAnswer(answer);
    });




}
function sendOffer(sdp) {
    send('publish', {
        planb: usePlanB,
        roomId: roomId,
        sdp: sdp
    });
}

function sendAnswer(answer) {
    send('request-view', answer);
}

function send(type, data) {
    console.log('Sending [' + type + ']: ', data);
    socket.emit(type, data);
};


function joinRoom(room) {
    initSocketIo(room.url);
    window.room = room;
    updateView();
    //publishVideo();
}



function publishVideo() {
    getDeviceStream({video: true, audio: true})
        .then(function (stream) { // success
            localStream = stream;
            logStream('Local stream', stream);
            playVideo(localVideo, stream);
            connect();
            updateView();
        }).catch(function (error) { // error
        console.error('getUserMedia error:', error);
        return;
    });
}

function stopVideo() {
    pauseVideo(localVideo);
    stopLocalStream(localStream);
    localStream = null;

    updateView();
}

function stopLocalStream(stream) {
    let tracks = stream.getTracks();
    if (! tracks) {
        console.warn('NO tracks');
        return;
    }

    for (let track of tracks) {
        track.stop();
    }
}

function getDeviceStream(option) {
    if ('getUserMedia' in navigator.mediaDevices) {
        return navigator.mediaDevices.getUserMedia(option);
    }
    else {
        return new Promise(function(resolve, reject){
            navigator.getUserMedia(option,
                resolve,
                reject
            );
        });
    }
}

function playVideo(element, stream) {
    if ('srcObject' in element) {
        element.srcObject = stream;
    }
    else {
        element.src = window.URL.createObjectURL(stream);
    }
    element.play();
    element.volume = 0;
}

function pauseVideo(element) {
    element.pause();
    if ('srcObject' in element) {
        element.srcObject = null;
    }
    else {
        if (element.src && (element.src !== '') ) {
            window.URL.revokeObjectURL(element.src);
        }
        element.src = '';
    }
}

function prepareNewConnection() {
    let pc_config = {'iceServers':[]};
    let peer = new RTCPeerConnection(pc_config);

    if ('ontrack' in peer) {
        peer.ontrack = function(event) {
            let stream = event.streams[0];
            logStream('Remote stream on track', stream);
            if ( (stream.getVideoTracks().length > 0) && (stream.getAudioTracks().length > 0) ) {
                addRemoteVideo(stream.id, stream);
            }

        };
    }
    else {
        peer.onaddstream = function(event) {
            let stream = event.stream;
            logStream('Remote stream added', stream);

            addRemoteVideo(stream.id, stream);
        };
    }

    peer.onicecandidate = function (evt) {
        if (evt.candidate) {
            console.log(evt.candidate);
        } else {
            console.log('Empty ICE event');
        }
    };
    peer.onnegotiationneeded = function(evt) {
        console.log('Negotiation needed');
    };

    peer.onicecandidateerror = function (evt) {
        console.error('ICE candidate ERROR:', evt);
    };
    peer.onsignalingstatechange = function() {
        console.log('Signaling state changed: ' + peer.signalingState);
    };
    peer.oniceconnectionstatechange = function() {
        console.log('ICE connection state changed: ' + peer.iceConnectionState);
        showState('ICE connection state changed: ' + peer.iceConnectionState);
        if (peer.iceConnectionState === 'disconnected') {
            console.log('ICE disconnected');
            hangUp();
        }
    };
    peer.onicegatheringstatechange = function() {
        console.log('ICE gathering state changed: ' + peer.iceGatheringState);
    };

    peer.onconnectionstatechange = function() {
        console.log('Connection state changed: ' + peer.connectionState);
    };
    peer.onremovestream = function(event) {
        console.log('Stream removed');
        let stream = event.stream;
        removeRemoteVideo(stream.id, stream);
    };

    if (localStream) {
        console.log('Adding local stream');
        peer.addStream(localStream);
    }
    else {
        console.warn('No local stream found, continue anyway.');
    }
    return peer;
}

function makeOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.createOffer({
        offerToReceiveAudio : 1,
        offerToReceiveVideo : 1
    })
        .then(function (sessionDescription) {
            console.log('Offer created');
            sendOffer(sessionDescription.sdp);
        })
        .catch(function(err) {
            console.error(err);
        });
}

function setOffer(sessionDescription) {
    if (peerConnection) {
        console.log('Peer connection alreay exist, reuse it');
    }
    else {
        console.log('Create new Peer connection');
        peerConnection = prepareNewConnection();
    }
    peerConnection.setRemoteDescription(sessionDescription)
        .then(function() {
            console.log('Set remote description');
            makeAnswer();
        }).catch(function(err) {
        console.error('Set remote description error: ', err);
    });
}

function subscribeVideo() {
    peerConnectionRx = prepareNewConnection();
    send('request-view');
    //makeAnswer();
}
function makeAnswer() {
    console.log('Create remote session description' );
    if (! peerConnectionRx) {
        console.error('Peer connection doesn\'t exist');
        return;
    }

    peerConnectionRx.createAnswer()
        .then(function (sessionDescription) {
            console.log('Create answer');
            return peerConnectionRx.setLocalDescription(sessionDescription);
        }).then(function() {
        let answer = peerConnectionRx.localDescription;
        sendAnswer(answer);
    }).catch(function(err) {
        console.error(err);
    });
}

function setAnswer(sessionDescription) {
    if (! peerConnectionRx) {
        console.error('Peer connection doesn\'t exist');
        return;
    }
    peerConnectionRx.setRemoteDescription(sessionDescription)
        .then(function() {
            console.log('Set remote description');
        }).catch(function(err) {
        console.error('Set remote description error: ', err);
    });
}

function connect() {
    makeOffer();
    updateView();
}

function dissconnect() {
    send('quit');

    if (peerConnection) {
        console.log('Quiting');
        peerConnection.close();
        peerConnection = null;

        removeAllRemoteVideo();
    }
    else {
        console.warn('Peer doesn\'t exist');
    }

    stopVideo();
    updateView();
}

function showState(state) {
    stateSpan.innerText = state;
}

function logStream(msg, stream) {
    console.log(msg + ': id: ' + stream.id);

    let videoTracks = stream.getVideoTracks();
    if (videoTracks) {
        console.log('Video tracks length: ' + videoTracks.length);
        videoTracks.forEach(function(track) {
            console.log(' track id: ' + track.id);
        });
    }

    let audioTracks = stream.getAudioTracks();
    if (audioTracks) {
        console.log('Audio tracks length: ' + audioTracks.length);
        audioTracks.forEach(function(track) {
            console.log(' track id: ' + track.id);
        });
    }
}

function addRemoteVideo(id, stream) {
    let element = document.createElement('video');
    remoteContainer.appendChild(element);
    element.id = 'remote_' + id;
    element.width = 640;
    element.height = 480;
    element.srcObject = stream;
    element.play();
    element.volume = 0;
    element.controls = true;
}

function removeRemoteVideo(id, stream) {
    console.log('Remote video removed id: ' + id);
    let element = document.getElementById('remote_' + id);
    if (element) {
        element.pause();
        element.srcObject = null;
        remoteContainer.removeChild(element);
    }
    else {
        console.log('Remote video element not found');
    }
}

function removeAllRemoteVideo() {
    while (remoteContainer.firstChild) {
        remoteContainer.firstChild.pause();
        remoteContainer.firstChild.srcObject = null;
        remoteContainer.removeChild(remoteContainer.firstChild);
    }
}

function updateView() {
    if (window.room) {
        hideElement('roomsSelect');
        showElement('conference');
        enabelElement('disconnect_button');
    }
    else {
        showElement('roomsSelect');
        hideElement('conference');
        disableElement('disconnect_button');
    }
}

function enabelElement(id) {
    let element = document.getElementById(id);
    if (element) {
        element.removeAttribute('disabled');
    }
}

function disableElement(id) {
    let element = document.getElementById(id);
    if (element) {
        element.setAttribute('disabled', '1');
    }
}

function hideElement(id) {
    let element = document.getElementById(id);
    if (element) {
        element.style.display = 'none';
    }
}

function showElement(id) {
    let element = document.getElementById(id);
    if (element) {
        element.style.display = 'block';
    }
}