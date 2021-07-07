"use strict";

const _ = require("lodash");
const log = require("./log");
const pkg = require("../package.json");
const Client = require("./client");
const ClientManager = require("./clientManager");
const express = require("express");
const fs = require("fs");
const path = require("path");
const io = require("socket.io");
const dns = require("dns");
const Uploader = require("./plugins/uploader");
const Helper = require("./helper");
const colors = require("chalk");
const net = require("net");
const Identification = require("./identification");
const changelog = require("./plugins/changelog");
const inputs = require("./plugins/inputs");
const Auth = require("./plugins/auth");

const themes = require("./plugins/packages/themes");
themes.loadLocalThemes();

const packages = require("./plugins/packages/index");

// A random number that will force clients to reload the page if it differs
const serverHash = Math.floor(Date.now() * Math.random());

let manager = null;

module.exports = function (options = {}) {
	log.info(`The Lounge ${colors.green(Helper.getVersion())} \
(Node.js ${colors.green(process.versions.node)} on ${colors.green(process.platform)} ${
		process.arch
	})`);
	log.info(`Configuration file: ${colors.green(Helper.getConfigPath())}`);

	const staticOptions = {
		redirect: false,
		maxAge: 86400 * 1000,
	};

	const app = express();

	if (options.dev) {
		require("./plugins/dev-server.js")(app);
	}

	app.set("env", "production")
		.disable("x-powered-by")
		.use(allRequests)
		.get("/", indexRequest)
		.get("/service-worker.js", forceNoCacheRequest)
		.get("/js/bundle.js.map", forceNoCacheRequest)
		.get("/css/style.css.map", forceNoCacheRequest)
		.use(express.static(path.join(__dirname, "..", "public"), staticOptions))
		.use("/storage/", express.static(Helper.getStoragePath(), staticOptions));

	if (Helper.config.fileUpload.enable) {
		Uploader.router(app);
	}

	// This route serves *installed themes only*. Local themes are served directly
	// from the `public/themes/` folder as static assets, without entering this
	// handler. Remember this if you make changes to this function, serving of
	// local themes will not get those changes.
	app.get("/themes/:theme.css", (req, res) => {
		const themeName = req.params.theme;
		const theme = themes.getByName(themeName);

		if (theme === undefined) {
			return res.status(404).send("Not found");
		}

		return res.sendFile(theme.filename);
	});

	app.get("/packages/:package/:filename", (req, res) => {
		const packageName = req.params.package;
		const fileName = req.params.filename;
		const packageFile = packages.getPackage(packageName);

		if (!packageFile || !packages.getFiles().includes(`${packageName}/${fileName}`)) {
			return res.status(404).send("Not found");
		}

		const packagePath = Helper.getPackageModulePath(packageName);
		return res.sendFile(path.join(packagePath, fileName));
	});

	let server = null;

	if (Helper.config.public && (Helper.config.ldap || {}).enable) {
		log.warn(
			"Server is public and set to use LDAP. Set to private mode if trying to use LDAP authentication."
		);
	}

	if (!Helper.config.https.enable) {
		server = require("http");
		server = server.createServer(app);
	} else {
		const keyPath = Helper.expandHome(Helper.config.https.key);
		const certPath = Helper.expandHome(Helper.config.https.certificate);
		const caPath = Helper.expandHome(Helper.config.https.ca);

		if (!keyPath.length || !fs.existsSync(keyPath)) {
			log.error("Path to SSL key is invalid. Stopping server...");
			process.exit();
		}

		if (!certPath.length || !fs.existsSync(certPath)) {
			log.error("Path to SSL certificate is invalid. Stopping server...");
			process.exit();
		}

		if (caPath.length && !fs.existsSync(caPath)) {
			log.error("Path to SSL ca bundle is invalid. Stopping server...");
			process.exit();
		}

		server = require("https");
		server = server.createServer(
			{
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(certPath),
				ca: caPath ? fs.readFileSync(caPath) : undefined,
			},
			app
		);
	}

	let listenParams;

	if (typeof Helper.config.host === "string" && Helper.config.host.startsWith("unix:")) {
		listenParams = Helper.config.host.replace(/^unix:/, "");
	} else {
		listenParams = {
			port: Helper.config.port,
			host: Helper.config.host,
		};
	}

	server.on("error", (err) => log.error(`${err}`));

	server.listen(listenParams, () => {
		if (typeof listenParams === "string") {
			log.info("Available on socket " + colors.green(listenParams));

			if (Helper.config.chmod) {
				fs.chmod(listenParams, Helper.config.chmod, (err) => {
					if (err) {
						log.error(`fs chmod error: ${err}. Stopping server...`);
						process.exit();
					}
				});
			}
		} else {
			const protocol = Helper.config.https.enable ? "https" : "http";
			const address = server.address();

			if (address.family === "IPv6") {
				address.address = "[" + address.address + "]";
			}

			log.info(
				"Available at " +
					colors.green(`${protocol}://${address.address}:${address.port}/`) +
					` in ${colors.bold(Helper.config.public ? "public" : "private")} mode`
			);
		}

		const sockets = io(server, {
			wsEngine: "ws",
			cookie: false,
			serveClient: false,
			transports: Helper.config.transports,
			pingTimeout: 60000,
		});

		sockets.on("connect", (socket) => {
			socket.on("error", (err) => log.error(`io socket error: ${err}`));

			if (Helper.config.public) {
				performAuthentication.call(socket, {});
			} else {
				socket.on("auth:perform", performAuthentication);
				socket.emit("auth:start", serverHash);
			}
		});

		manager = new ClientManager();
		packages.loadPackages();

		const defaultTheme = themes.getByName(Helper.config.theme);

		if (defaultTheme === undefined) {
			log.warn(
				`The specified default theme "${colors.red(
					Helper.config.theme
				)}" does not exist, verify your config.`
			);
			Helper.config.theme = "default";
		} else if (defaultTheme.themeColor) {
			Helper.config.themeColor = defaultTheme.themeColor;
		}

		new Identification((identHandler) => {
			manager.init(identHandler, sockets);
		});

		// Handle ctrl+c and kill gracefully
		let suicideTimeout = null;

		const exitGracefully = function () {
			if (suicideTimeout !== null) {
				return;
			}

			log.info("Exiting...");

			// Close all client and IRC connections
			manager.clients.forEach((client) => client.quit());

			if (Helper.config.prefetchStorage) {
				log.info("Clearing prefetch storage folder, this might take a while...");

				require("./plugins/storage").emptyDir();
			}

			// Forcefully exit after 3 seconds
			suicideTimeout = setTimeout(() => process.exit(1), 3000);

			// Close http server
			server.close(() => {
				clearTimeout(suicideTimeout);
				process.exit(0);
			});
		};

		process.on("SIGINT", exitGracefully);
		process.on("SIGTERM", exitGracefully);

		// Clear storage folder after server starts successfully
		if (Helper.config.prefetchStorage) {
			require("./plugins/storage").emptyDir();
		}

		changelog.checkForUpdates(manager);
	});

	return server;
};

function getClientLanguage(socket) {
	const acceptLanguage = socket.handshake.headers["accept-language"];

	if (typeof acceptLanguage === "string" && /^[\x00-\x7F]{1,50}$/.test(acceptLanguage)) {
		// only allow ASCII strings between 1-50 characters in length
		return acceptLanguage;
	}

	return null;
}

function getClientIp(socket) {
	let ip = socket.handshake.address || "127.0.0.1";

	if (Helper.config.reverseProxy) {
		const forwarded = (socket.handshake.headers["x-forwarded-for"] || "")
			.split(/\s*,\s*/)
			.filter(Boolean);

		if (forwarded.length && net.isIP(forwarded[0])) {
			ip = forwarded[0];
		}
	}

	return ip.replace(/^::ffff:/, "");
}

function getClientSecure(socket) {
	let secure = socket.handshake.secure;

	if (Helper.config.reverseProxy && socket.handshake.headers["x-forwarded-proto"] === "https") {
		secure = true;
	}

	return secure;
}

function allRequests(req, res, next) {
	res.setHeader("X-Content-Type-Options", "nosniff");
	return next();
}

function forceNoCacheRequest(req, res, next) {
	// Intermittent proxies must not cache the following requests,
	// browsers must fetch the latest version of these files (service worker, source maps)
	res.setHeader("Cache-Control", "no-cache, no-transform");
	return next();
}

function indexRequest(req, res) {
	const policies = [
		"default-src 'none'", // default to nothing
		"base-uri 'none'", // disallow <base>, has no fallback to default-src
		"form-action 'self'", // 'self' to fix saving passwords in Firefox, even though login is handled in javascript
		"connect-src 'self' ws: wss:", // allow self for polling; websockets
		"style-src 'self' https: 'unsafe-inline'", // allow inline due to use in irc hex colors
		"script-src 'self'", // javascript
		"worker-src 'self'", // service worker
		"manifest-src 'self'", // manifest.json
		"font-src 'self' https:", // allow loading fonts from secure sites (e.g. google fonts)
		"media-src 'self' https:", // self for notification sound; allow https media (audio previews)
	];

	// If prefetch is enabled, but storage is not, we have to allow mixed content
	// - https://user-images.githubusercontent.com is where we currently push our changelog screenshots
	// - data: is required for the HTML5 video player
	if (Helper.config.prefetchStorage || !Helper.config.prefetch) {
		policies.push("img-src 'self' data: https://user-images.githubusercontent.com");
		policies.unshift("block-all-mixed-content");
	} else {
		policies.push("img-src http: https: data:");
	}

	res.setHeader("Content-Type", "text/html");
	res.setHeader("Content-Security-Policy", policies.join("; "));
	res.setHeader("Referrer-Policy", "no-referrer");

	return fs.readFile(
		path.join(__dirname, "..", "client", "index.html.tpl"),
		"utf-8",
		(err, file) => {
			if (err) {
				throw err;
			}

			const config = getServerConfiguration();
			config.cacheBust = Helper.getVersionCacheBust();

			res.send(_.template(file)(config));
		}
	);
}

function initializeClient(socket, client, token, lastMessage, openChannel) {
	socket.off("auth:perform", performAuthentication);
	socket.emit("auth:success");

	client.clientAttach(socket.id, token);

	// Client sends currently active channel on reconnect,
	// pass it into `open` directly so it is verified and updated if necessary
	if (openChannel) {
		client.open(socket.id, openChannel);

		// If client provided channel passes checks, use it. if client has invalid
		// channel open (or windows like settings) then use last known server active channel
		openChannel = client.attachedClients[socket.id].openChannel || client.lastActiveChannel;
	} else {
		openChannel = client.lastActiveChannel;
	}

	if (Helper.config.fileUpload.enable) {
		new Uploader(socket);
	}

	socket.on("disconnect", function () {
		process.nextTick(() => client.clientDetach(socket.id));
	});

	socket.on("input", (data) => {
		if (_.isPlainObject(data)) {
			client.input(data);
		}
	});

	socket.on("more", (data) => {
		if (_.isPlainObject(data)) {
			const history = client.more(data);

			if (history !== null) {
				socket.emit("more", history);
			}
		}
	});

	socket.on("network:new", (data) => {
		if (_.isPlainObject(data)) {
			// prevent people from overriding webirc settings
			data.uuid = null;
			data.commands = null;
			data.ignoreList = null;

			client.connect(data);
		}
	});

	socket.on("network:get", (data) => {
		if (typeof data !== "string") {
			return;
		}

		const network = _.find(client.networks, {uuid: data});

		if (!network) {
			return;
		}

		socket.emit("network:info", network.exportForEdit());
	});

	socket.on("network:edit", (data) => {
		if (!_.isPlainObject(data)) {
			return;
		}

		const network = _.find(client.networks, {uuid: data.uuid});

		if (!network) {
			return;
		}

		network.edit(client, data);
	});

	socket.on("history:clear", (data) => {
		if (_.isPlainObject(data)) {
			client.clearHistory(data);
		}
	});

	if (!Helper.config.public && !Helper.config.ldap.enable) {
		socket.on("change-password", (data) => {
			if (_.isPlainObject(data)) {
				const old = data.old_password;
				const p1 = data.new_password;
				const p2 = data.verify_password;

				if (typeof p1 === "undefined" || p1 === "" || p1 !== p2) {
					socket.emit("change-password", {
						error: "",
						success: false,
					});
					return;
				}

				Helper.password
					.compare(old || "", client.config.password)
					.then((matching) => {
						if (!matching) {
							socket.emit("change-password", {
								error: "password_incorrect",
								success: false,
							});
							return;
						}

						const hash = Helper.password.hash(p1);

						client.setPassword(hash, (success) => {
							const obj = {success: false};

							if (success) {
								obj.success = true;
							} else {
								obj.error = "update_failed";
							}

							socket.emit("change-password", obj);
						});
					})
					.catch((error) => {
						log.error(`Error while checking users password. Error: ${error}`);
					});
			}
		});
	}

	socket.on("open", (data) => {
		client.open(socket.id, data);
	});

	socket.on("sort", (data) => {
		if (_.isPlainObject(data)) {
			client.sort(data);
		}
	});

	socket.on("names", (data) => {
		if (_.isPlainObject(data)) {
			client.names(data);
		}
	});

	socket.on("changelog", () => {
		Promise.all([changelog.fetch(), packages.outdated()]).then(
			([changelogData, packageUpdate]) => {
				changelogData.packages = packageUpdate;
				socket.emit("changelog", changelogData);
			}
		);
	});

	socket.on("msg:preview:toggle", (data) => {
		if (!_.isPlainObject(data)) {
			return;
		}

		const networkAndChan = client.find(data.target);
		const newState = Boolean(data.shown);

		if (!networkAndChan) {
			return;
		}

		// Process multiple message at once for /collapse and /expand commands
		if (Array.isArray(data.messageIds)) {
			for (const msgId of data.messageIds) {
				const message = networkAndChan.chan.findMessage(msgId);

				for (const preview of message.previews) {
					preview.shown = newState;
				}
			}

			return;
		}

		const message = networkAndChan.chan.findMessage(data.msgId);

		if (!message) {
			return;
		}

		const preview = message.findPreview(data.link);

		if (preview) {
			preview.shown = newState;
		}
	});

	socket.on("mentions:get", () => {
		socket.emit("mentions:list", client.mentions);
	});

	socket.on("mentions:hide", (msgId) => {
		if (typeof msgId !== "number") {
			return;
		}

		client.mentions.splice(
			client.mentions.findIndex((m) => m.msgId === msgId),
			1
		);
	});

	socket.on("mentions:hide_all", () => {
		client.mentions = [];
	});

	if (!Helper.config.public) {
		socket.on("push:register", (subscription) => {
			if (!Object.prototype.hasOwnProperty.call(client.config.sessions, token)) {
				return;
			}

			const registration = client.registerPushSubscription(
				client.config.sessions[token],
				subscription
			);

			if (registration) {
				client.manager.webPush.pushSingle(client, registration, {
					type: "notification",
					timestamp: Date.now(),
					title: "The Lounge",
					body: "🚀 Push notifications have been enabled",
				});
			}
		});

		socket.on("push:unregister", () => client.unregisterPushSubscription(token));
	}

	const sendSessionList = () => {
		const sessions = _.map(client.config.sessions, (session, sessionToken) => ({
			current: sessionToken === token,
			active: _.reduce(
				client.attachedClients,
				(count, attachedClient) => count + (attachedClient.token === sessionToken ? 1 : 0),
				0
			),
			lastUse: session.lastUse,
			ip: session.ip,
			agent: session.agent,
			token: sessionToken, // TODO: Ideally don't expose actual tokens to the client
		}));

		socket.emit("sessions:list", sessions);
	};

	socket.on("sessions:get", sendSessionList);

	if (!Helper.config.public) {
		socket.on("setting:set", (newSetting) => {
			if (!_.isPlainObject(newSetting)) {
				return;
			}

			if (
				typeof newSetting.value === "object" ||
				typeof newSetting.name !== "string" ||
				newSetting.name[0] === "_"
			) {
				return;
			}

			// We do not need to do write operations and emit events if nothing changed.
			if (client.config.clientSettings[newSetting.name] !== newSetting.value) {
				client.config.clientSettings[newSetting.name] = newSetting.value;

				// Pass the setting to all clients.
				client.emit("setting:new", {
					name: newSetting.name,
					value: newSetting.value,
				});

				client.save();

				if (newSetting.name === "highlights" || newSetting.name === "highlightExceptions") {
					client.compileCustomHighlights();
				} else if (newSetting.name === "awayMessage") {
					if (typeof newSetting.value !== "string") {
						newSetting.value = "";
					}

					client.awayMessage = newSetting.value;
				}
			}
		});

		socket.on("setting:get", () => {
			if (!Object.prototype.hasOwnProperty.call(client.config, "clientSettings")) {
				socket.emit("setting:all", {});
				return;
			}

			const clientSettings = client.config.clientSettings;
			socket.emit("setting:all", clientSettings);
		});

		socket.on("search", (query) => {
			client.search(query).then((results) => {
				socket.emit("search:results", results);
			});
		});
	}

	socket.on("sign-out", (tokenToSignOut) => {
		// If no token provided, sign same client out
		if (!tokenToSignOut || typeof tokenToSignOut !== "string") {
			tokenToSignOut = token;
		}

		if (!Object.prototype.hasOwnProperty.call(client.config.sessions, tokenToSignOut)) {
			return;
		}

		delete client.config.sessions[tokenToSignOut];

		client.save();

		_.map(client.attachedClients, (attachedClient, socketId) => {
			if (attachedClient.token !== tokenToSignOut) {
				return;
			}

			const socketToRemove = manager.sockets.of("/").sockets.get(socketId);

			socketToRemove.emit("sign-out");
			socketToRemove.disconnect();
		});

		// Do not send updated session list if user simply logs out
		if (tokenToSignOut !== token) {
			sendSessionList();
		}
	});

	socket.join(client.id);

	const sendInitEvent = (tokenToSend) => {
		socket.emit("init", {
			active: openChannel,
			networks: client.networks.map((network) =>
				network.getFilteredClone(openChannel, lastMessage)
			),
			token: tokenToSend,
		});
		socket.emit("commands", inputs.getCommands());
	};

	if (Helper.config.public) {
		sendInitEvent(null);
	} else if (token === null) {
		client.generateToken((newToken) => {
			token = client.calculateTokenHash(newToken);
			client.attachedClients[socket.id].token = token;

			client.updateSession(token, getClientIp(socket), socket.request);

			sendInitEvent(newToken);
		});
	} else {
		client.updateSession(token, getClientIp(socket), socket.request);
		sendInitEvent(null);
	}
}

function getClientConfiguration() {
	const config = _.pick(Helper.config, ["public", "lockNetwork", "useHexIp", "prefetch"]);

	config.fileUpload = Helper.config.fileUpload.enable;
	config.ldapEnabled = Helper.config.ldap.enable;

	if (!config.lockNetwork) {
		config.defaults = _.clone(Helper.config.defaults);
	} else {
		// Only send defaults that are visible on the client
		config.defaults = _.pick(Helper.config.defaults, [
			"name",
			"nick",
			"username",
			"password",
			"realname",
			"join",
		]);
	}

	config.isUpdateAvailable = changelog.isUpdateAvailable;
	config.applicationServerKey = manager.webPush.vapidKeys.publicKey;
	config.version = pkg.version;
	config.gitCommit = Helper.getGitCommit();
	config.themes = themes.getAll();
	config.defaultTheme = Helper.config.theme;
	config.defaults.nick = Helper.getDefaultNick();
	config.defaults.sasl = "";
	config.defaults.saslAccount = "";
	config.defaults.saslPassword = "";

	if (Uploader) {
		config.fileUploadMaxFileSize = Uploader.getMaxFileSize();
	}

	return config;
}

function getServerConfiguration() {
	const config = _.clone(Helper.config);

	config.stylesheets = packages.getStylesheets();

	return config;
}

function performAuthentication(data) {
	if (!_.isPlainObject(data)) {
		return;
	}

	const socket = this;
	let client;
	let token = null;

	const finalInit = () =>
		initializeClient(socket, client, token, data.lastMessage || -1, data.openChannel);

	const initClient = () => {
		// Configuration does not change during runtime of TL,
		// and the client listens to this event only once
		if (!data.hasConfig) {
			socket.emit("configuration", getClientConfiguration());

			socket.emit(
				"push:issubscribed",
				token && client.config.sessions[token].pushSubscription ? true : false
			);
		}

		client.config.browser = {
			ip: getClientIp(socket),
			isSecure: getClientSecure(socket),
			language: getClientLanguage(socket),
		};

		// If webirc is enabled perform reverse dns lookup
		if (Helper.config.webirc === null) {
			return finalInit();
		}

		reverseDnsLookup(client.config.browser.ip, (hostname) => {
			client.config.browser.hostname = hostname;

			finalInit();
		});
	};

	if (Helper.config.public) {
		client = new Client(manager);
		manager.clients.push(client);

		socket.on("disconnect", function () {
			manager.clients = _.without(manager.clients, client);
			client.quit();
		});

		initClient();

		return;
	}

	if (typeof data.user !== "string") {
		return;
	}

	const authCallback = (success) => {
		// Authorization failed
		if (!success) {
			if (!client) {
				log.warn(
					`Authentication for non existing user attempted from ${colors.bold(
						getClientIp(socket)
					)}`
				);
			} else {
				log.warn(
					`Authentication failed for user ${colors.bold(data.user)} from ${colors.bold(
						getClientIp(socket)
					)}`
				);
			}

			socket.emit("auth:failed");
			return;
		}

		// If authorization succeeded but there is no loaded user,
		// load it and find the user again (this happens with LDAP)
		if (!client) {
			client = manager.loadUser(data.user);
		}

		initClient();
	};

	client = manager.findClient(data.user);

	// We have found an existing user and client has provided a token
	if (client && data.token) {
		const providedToken = client.calculateTokenHash(data.token);

		if (Object.prototype.hasOwnProperty.call(client.config.sessions, providedToken)) {
			token = providedToken;

			return authCallback(true);
		}
	}

	// Perform password checking
	Auth.auth(manager, client, data.user, data.password, authCallback);
}

function reverseDnsLookup(ip, callback) {
	dns.reverse(ip, (reverseErr, hostnames) => {
		if (reverseErr || hostnames.length < 1) {
			return callback(ip);
		}

		dns.resolve(hostnames[0], net.isIP(ip) === 6 ? "AAAA" : "A", (resolveErr, resolvedIps) => {
			if (resolveErr || resolvedIps.length < 1) {
				return callback(ip);
			}

			for (const resolvedIp of resolvedIps) {
				if (ip === resolvedIp) {
					return callback(hostnames[0]);
				}
			}

			return callback(ip);
		});
	});
}
