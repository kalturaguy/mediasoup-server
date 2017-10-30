

function listRooms() {
    return fetch('/room/*').then((response)=> {
        return response.json();
    }).then ( rooms=> {
        rooms.forEach( room=> {
            appendRoom(room);
        });

        return rooms;
    })
}

function appendRoom(room) {
    let roomsDiv = document.getElementById('rooms');

    let newTr = document.createElement("tr");
    newTr.classList.add('room');
    newTr.onclick = function(){
        joinRoom(room);
    };
    newTr.innerHTML=`<td>${room.id}</td><td>${room.url}</td>`
    roomsDiv.appendChild(newTr);
}

function createRoom() {
    let element = document.getElementById('newRoom');
    let name = element.value;
    if(!name.length) {
        return alert('Please specify room name');
    }

    fetch('/room/'+name+'?token=456').then((response)=> {
        return response.json();
    }).then ( room=> {
        console.log('Receive [room-created]: ', room);
        appendRoom(room);
    })
}

function sendRoomRequest(url,payload) {

    let data = new FormData();
    data.append( "json", JSON.stringify( payload ) );


    return fetch(url+"/mediasoup-request/",
    {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)

    }).then((response)=> {
        return response.json();
    }).then ( room=> {
        console.log('Receive [room-created]: ', room);
        return room;
    })
}