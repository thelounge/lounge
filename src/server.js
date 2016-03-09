var _ = require("lodash");
var bcrypt = require("bcrypt-nodejs");
var Client = require("./client");
var ClientManager = require("./clientManager");
var express = require("express");
var fs = require("fs");
var io = require("socket.io");
var Helper = require("./helper");
var ldap = require("ldapjs");
var config = {};

var manager = new ClientManager();
var ldapclient = null;
var authFunction = localAuth;

module.exports = function(options) {
	config = Helper.getConfig();
	config = _.extend(config, options);

	var app = express()
		.use(index)
		.use(express.static("client"));

	app.enable("trust proxy");

	var server = null;
	var https = config.https || {};
	var protocol = https.enable ? "https" : "http";
	var port = config.port;
	var host = config.host;
	var transports = config.transports || ["websocket", "polling"];

	if (config.public && (config.ldap || {}).enable) {
		throw "Server is public and set to use LDAP. Please disable public if trying to use LDAP authentication.";
	}

	if (!https.enable){
		server = require("http");
		server = server.createServer(app).listen(port, host);
	} else {
		server = require("https");
		server = server.createServer({
			key: fs.readFileSync(https.key),
			cert: fs.readFileSync(https.certificate)
		}, app).listen(port, host);
	}

	if ((config.identd || {}).enable) {
		require("./identd").start(config.identd.port);
	}

	if ((config.ldap || {}).enable) {
		ldapclient = ldap.createClient({
			url: config.ldap.url
		});
		authFunction = ldapAuth;
	}

	var sockets = io(server, {
		transports: transports
	});

	sockets.on("connect", function(socket) {
		if (config.public) {
			auth.call(socket);
		} else {
			init(socket);
		}
	});

	manager.sockets = sockets;

	console.log("");
	console.log("The Lounge is now running on " + protocol + "://" + config.host + ":" + config.port + "/");
	console.log("Press ctrl-c to stop");
	console.log("");

	if (!config.public) {
		manager.loadUsers();
		if (config.autoload) {
			manager.autoload();
		}
	}
};

function index(req, res, next) {
	if (req.url.split("?")[0] !== "/") return next();
	return fs.readFile("client/index.html", "utf-8", function(err, file) {
		var data = _.merge(
			require("../package.json"),
			config
		);
		var template = _.template(file);
		res.setHeader("Content-Type", "text/html");
		res.writeHead(200);
		res.end(template(data));
	});
}

function init(socket, client, token) {
	if (!client) {
		socket.emit("auth");
		socket.on("auth", auth);
	} else {
		socket.on(
			"input",
			function(data) {
				client.input(data);
			}
		);
		socket.on(
			"more",
			function(data) {
				client.more(data);
			}
		);
		socket.on(
			"conn",
			function(data) {
				client.connect(data);
			}
		);
		if (!config.public && !config.ldap.enable) {
			socket.on(
				"change-password",
				function(data) {
					var old = data.old_password;
					var p1 = data.new_password;
					var p2 = data.verify_password;
					if (typeof old === "undefined" || old === "") {
						socket.emit("change-password", {
							error: "Please enter your current password"
						});
						return;
					}
					if (typeof p1 === "undefined" || p1 === "") {
						socket.emit("change-password", {
							error: "Please enter a new password"
						});
						return;
					}
					if (p1 !== p2) {
						socket.emit("change-password", {
							error: "Both new password fields must match"
						});
						return;
					}
					if (!bcrypt.compareSync(old || "", client.config.password)) {
						socket.emit("change-password", {
							error: "The current password field does not match your account password"
						});
						return;
					}
					var salt = bcrypt.genSaltSync(8);
					var hash = bcrypt.hashSync(p1, salt);
					if (client.setPassword(hash)) {
						socket.emit("change-password", {
							success: "Successfully updated your password"
						});
						return;
					}
					socket.emit("change-password", {
						error: "Failed to update your password"
					});
				}
			);
		}
		socket.on(
			"open",
			function(data) {
				client.open(data);
			}
		);
		socket.on(
			"sort",
			function(data) {
				client.sort(data);
			}
		);
		socket.on(
			"names",
			function(data) {
				client.names(data);
			}
		);
		socket.join(client.id);
		socket.emit("init", {
			active: client.activeChannel,
			networks: client.networks,
			token: token || ""
		});
	}
}

function localAuth(client, user, password, callback) {
	var result = false;
	try {
		result = bcrypt.compareSync(password || "", client.config.password);
	} catch (error) {
		if (error === "Not a valid BCrypt hash.") {
			console.error("User (" + user + ") with no local password set tried signed in. (Probably a ldap user)");
		}
		result = false;
	} finally {
		callback(result);
	}
}

function ldapAuth(client, user, password, callback) {
	var bindDN = config.ldap.primaryKey + "=" + user + "," + config.ldap.baseDN;

	ldapclient.bind(bindDN, password, function(err) {
		if (!err && !client) {
			if (!manager.addUser(user, null)) {
				console.log("Unable to create new user", user);
			}
		}
		callback(!err);
	});
}

function auth(data) {
	var socket = this;
	var client;
	if (config.public) {
		client = new Client(manager);
		manager.clients.push(client);
		socket.on("disconnect", function() {
			manager.clients = _.without(manager.clients, client);
			client.quit();
		});
		init(socket, client);
	} else {
		client = manager.findClient(data.user, data.token);
		var signedIn = data.token && client && client.token === data.token;
		var token;

		if (data.remember || data.token) {
			token = client.token;
		}

		var authCallback = function(success) {
			if (success) {
				if (!client) {
					// LDAP just created a user
					manager.loadUser(data.user);
					client = manager.findClient(data.user);
				}
				init(socket, client, token);
			} else {
				socket.emit("auth");
			}
		};

		if (signedIn) {
			authCallback(true);
		} else {
			authFunction(client, data.user, data.password, authCallback);
		}
	}
}
