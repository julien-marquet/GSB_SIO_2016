
var User = require('mongoose').model('User');

module.exports = function(server) {
	var io = require('socket.io')(server);
	var socketioJwt = require('socketio-jwt');
	var jwt = require('jsonwebtoken');
	var myEvent = require('./app/controllers/event');

	/*
		Set token syntax
	 */
	var config = require("./config/env/development");
	var jwtKey = config.jwtKey;
	var connectedUsers = [];

	io.use(socketioJwt.authorize({
		secret: jwtKey,
		handshake: true
	}));

	myEvent.on('pushTicket', function(data) {
		io.sockets.emit('pushTicket', data);
		
	});



	io.sockets.on('connection', function(socket) {
		// Connection confirmed to the user	
		socket.join("main");
		myEvent.on('pushChat', function(data) {
			for (var f = 0; f < connectedUsers.length; f++) {
				if (connectedUsers[f].user == data.receiver) {
					var clientID = connectedUsers[f].id;
					clientID.emit('receiveMessage', data);
				}
			}

			socket.emit('pushChat', data);
		});
		User.find({
			username: socket.decoded_token
		}, function(err, user) {
			console.log(user[0]);
			if (err) {
				console.log("erreur Admission Admin : " + err);
			} else if (!user[0])
				console.log("error: no user found during admission");
			else {
				connectedUsers.push({
					user: socket.decoded_token,
					id: socket.id,
					accessLevel: user[0].accessLevel
				});
				console.log(connectedUsers);
			}
			listUserConnected();
		});



		socket.emit('main', {
			message: 'Connection au socket main réussie'
		});
		// Send regular event TEST
		function sendTime() {
			io.emit('time', {
				time: new Date().toJSON()
			});
		}
		setInterval(sendTime, 10000);

		socket.on('disconnect', function() {
			console.log(socket.decoded_token + ' Got disconnect!');
			var i = connectedUsers.indexOf(socket.decoded_token);
			connectedUsers.splice(i, 1);
			listUserConnected();
			socket.disconnect();
		});

		socket.on('listActiveUser', function() {
			socket.emit('listActiveUser', {
				"success": true,
				"list": connectedUsers
			});
		});

		var userController = require('./app/webSocketControllers/user.webSocket.controller')(socket);
		var ticketController = require('./app/webSocketControllers/ticket.webSocket.controller')(socket);
		var scheduleController = require('./app/webSocketControllers/schedule.webSocket.controller')(socket);
		var vehicleRouteController = require('./app/webSocketControllers/vehicleRoute.webSocket.controller')(socket);
		var chatController = require('./app/webSocketControllers/chat.webSocket.controller')(socket);

		function listUserConnected() {
			var stringUser = "list = ";
			for (var j = 0; j < connectedUsers.length; j++) {
				stringUser += (connectedUsers[j].user + " Access Level = " + connectedUsers[j].accessLevel + " , ");
			}
			console.log(stringUser);
		}

	});

	module.exports.connectedUsers = connectedUsers;
};