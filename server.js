"use strict";

const express = require("express");
const socket = require("socket.io");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
const PORT = process.env.PORT || 5000;

let rooms = new Map();

// catch-all handler to send back React's index.html file.
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

io.on("connection", (mySocket) => {
    // allow users to join a room
    mySocket.on("join room", (roomID) => {
        if (rooms.has(roomID)) {
            // room already exists
            const currRoom = rooms.get(roomID);
            currRoom.push(mySocket.id);
        } else {
            // create room
            rooms.set(roomID, mySocket.id);
        }

        // is there another id in the arr that is not my own?
        const otherUser = rooms.get(roomID)
                               .find((id) => id !== mySocket.id);

        if (otherUser) {
            // tell ourself that there is another user here with this id
            mySocket.emit("other user", otherUser);
            // to other user that is here, someone has joined with this id
            mySocket.to(otherUser).emit("user joined", mySocket.id);
        }
    });

    mySocket.on("offer", (payload) => {
        // send to person I am trying to call
        // payload includes who I am as the caller as well as the offer obj for WebRTC
        io.to(payload.target).emit("offer", payload);
    });

    mySocket.on("answer", (payload) => {
        // respond with an answer to the original caller
        io.to(payload.target).emit("answer", payload);
    });

    mySocket.on("ice-candidate", (incoming) => {
        // have both peers agree on a server candidate that works for them
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });
});

server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));