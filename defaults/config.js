"use strict";

module.exports = {
	// ## Server settings

	// ### `public`
	//
	// When set to `true`, The Lounge starts in public mode. When set to `false`,
	// it starts in private mode.
	//
	// - A **public server** does not require authentication. Anyone can connect
	//   to IRC networks in this mode. All IRC connections and channel
	//   scrollbacks are lost when a user leaves the client.
	// - A **private server** requires users to log in. Their IRC connections are
	//   kept even when they are not using or logged in to the client. All joined
	//   channels and scrollbacks are available when they come back.
	//
	// This value is set to `false` by default.
	public: false,

	// ### `host`
	//
	// IP address or hostname for the web server to listen to. For example, set it
	// to `"127.0.0.1"` to accept connections from localhost only.
	//
	// For UNIX domain sockets, use `"unix:/absolute/path/to/file.sock"`.
	//
	// This value is set to `undefined` by default to listen on all interfaces.
	host: undefined,

	// ### `port`
	//
	// Set the port to listen to.
	//
	// This value is set to `9000` by default.
	port: 9000,

	// ### `chmod`
	//
	// Set the permissions of the UNIX domain socket.
	//
	// This value is set to `0o660` by default.
	chmod: 0o660,

	// ### `bind`
	//
	// Set the local IP to bind to for outgoing connections.
	//
	// This value is set to `undefined` by default to let the operating system
	// pick its preferred one.
	bind: undefined,

	// ### `reverseProxy`
	//
	// When set to `true`, The Lounge is marked as served behind a reverse proxy
	// and will honor the `X-Forwarded-For` header.
	//
	// This value is set to `false` by default.
	reverseProxy: false,

	// ### `maxHistory`
	//
	// Defines the maximum number of history lines that will be kept in memory per
	// channel/query, in order to reduce the memory usage of the server. Setting
	// this to `-1` will keep unlimited amount.
	//
	// This value is set to `10000` by default.
	maxHistory: 10000,

	// ### `https`
	//
	// These settings are used to run The Lounge's web server using encrypted TLS.
	//
	// If you want more control over the webserver,
	// [use a reverse proxy instead](https://thelounge.chat/docs/guides/reverse-proxies).
	//
	// The available keys for the `https` object are:
	//
	// - `enable`: when set to `false`, HTTPS support is disabled
	//    and all other values are ignored.
	// - `key`: Path to the private key file.
	// - `certificate`: Path to the certificate.
	// - `ca`: Path to the CA bundle.
	//
	// The value of `enable` is set to `false` to disable HTTPS by default, in
	// which case the other two string settings are ignored.
	https: {
		enable: false,
		key: "",
		certificate: "",
		ca: "",
	},

	// ## Client settings

	// ### `theme`
	//
	// Set the default theme to serve to new users. They will be able to select a
	// different one in their client settings among those available.
	//
	// The Lounge ships with two themes (`default` and `morning`) and can be
	// extended by installing more themes. Read more about how to manage them
	// [here](https://thelounge.chat/docs/guides/theme-creation).
	//
	// This value needs to be the package name and not the display name. For
	// example, the value for Morning would be `morning`, and the value for
	// Solarized would be `thelounge-theme-solarized`.
	//
	// This value is set to `"default"` by default.
	theme: "default",

	// ### `prefetch`
	//
	// When set to `true`, The Lounge will load thumbnails and site descriptions
	// from URLs posted in channels and private messages.
	//
	// This value is set to `false` by default.
	prefetch: false,

	// ### `disableMediaPreview`
	//
	// When set to `true`, The Lounge will not preview media (images, video and
	// audio) hosted on third-party sites. This ensures the client does not
	// make any requests to external sites. If `prefetchStorage` is enabled,
	// images proxied via the The Lounge will be previewed.
	//
	// This has no effect if `prefetch` is set to `false`.
	//
	// This value is set to `false` by default.
	disableMediaPreview: false,

	// ### `prefetchStorage`

	// When set to `true`, The Lounge will store and proxy prefetched images and
	// thumbnails on the filesystem rather than directly display the content at
	// the original URLs.
	//
	// This option primarily exists to resolve mixed content warnings by not
	// loading images from http hosts. This option does not work for video
	// or audio as The Lounge will only load these from https hosts.
	//
	// If storage is enabled, The Lounge will fetch and store images and thumbnails
	// in the `${THELOUNGE_HOME}/storage` folder.
	//
	// Images are deleted when they are no longer referenced by any message
	// (controlled by `maxHistory`), and the folder is cleaned up when The Lounge
	// restarts.
	//
	// This value is set to `false` by default.
	prefetchStorage: false,

	// ### `prefetchMaxImageSize`
	//
	// When `prefetch` is enabled, images will only be displayed if their file
	// size does not exceed this limit.
	//
	// This value is set to `2048` kilobytes by default.
	prefetchMaxImageSize: 2048,

	// ### prefetchMaxSearchSize
	//
	// This value sets the maximum request size made to find the Open Graph tags
	// for link previews. For some sites like YouTube this can easily exceed 300
	// kilobytes.
	//
	// This value is set to `50` kilobytes by default.
	prefetchMaxSearchSize: 50,

	// ### `fileUpload`
	//
	// Allow uploading files to the server hosting The Lounge.
	//
	// Files are stored in the `${THELOUNGE_HOME}/uploads` folder, do not expire,
	// and are not removed by The Lounge. This may cause issues depending on your
	// hardware, for example in terms of disk usage.
	//
	// The available keys for the `fileUpload` object are:
	//
	// - `enable`: When set to `true`, files can be uploaded on the client with a
	//   drag-and-drop or using the upload dialog.
	// - `maxFileSize`: When file upload is enabled, users sending files above
	//   this limit will be prompted with an error message in their browser. A value of
	//   `-1` disables the file size limit and allows files of any size. **Use at
	//   your own risk.** This value is set to `10240` kilobytes by default.
	// - `baseUrl`: If you want change the URL where uploaded files are accessed,
	//   you can set this option to `"https://example.com/folder/"` and the final URL
	//   would look like `"https://example.com/folder/aabbccddeeff1234/name.png"`.
	//   If you use this option, you must have a reverse proxy configured,
	//   to correctly proxy the uploads URLs back to The Lounge.
	//   This value is set to `null` by default.
	fileUpload: {
		enable: false,
		maxFileSize: 10240,
		baseUrl: null,
	},

	// ### `transports`
	//
	// Set `socket.io` transports.
	//
	// This value is set to `["polling", "websocket"]` by default.
	transports: ["polling", "websocket"],

	// ### `leaveMessage`
	//
	// Set users' default `quit` and `part` messages if they are not providing
	// one.
	//
	// This value is set to `"The Lounge - https://thelounge.chat"` by
	// default.
	leaveMessage: "The Lounge - https://thelounge.chat",

	// ## Default network

	// ### `defaults`
	//
	// Specifies default network information that will be used as placeholder
	// values in the *Connect* window.
	//
	// The available keys for the `defaults` object are:
	//
	// - `name`: Name to display in the channel list of The Lounge. This value is
	//   not forwarded to the IRC network.
	// - `host`: IP address or hostname of the IRC server.
	// - `port`: Usually 6667 for unencrypted connections and 6697 for
	//   connections encrypted with TLS.
	// - `password`: Connection password. If the server supports SASL capability,
	//   then this password will be used in SASL authentication.
	// - `tls`: Enable TLS connections
	// - `rejectUnauthorized`: Whether the server certificate should be verified
	//   against the list of supplied Certificate Authorities (CAs) by your
	//   Node.js installation.
	// - `nick`: Nick name. Percent signs (`%`) will be replaced by random
	//   numbers from 0 to 9. For example, `Guest%%%` may become `Guest123`.
	// - `username`: User name.
	// - `realname`: Real name.
	// - `leaveMessage`: Network specific leave message (overrides global leaveMessage)
	// - `join`: Comma-separated list of channels to auto-join once connected.
	//
	// This value is set to connect to the official channel of The Lounge on
	// Libera.Chat by default:
	//
	// ```js
	// defaults: {
	//   name: "Libera.Chat",
	//   host: "irc.libera.chat",
	//   port: 6697,
	//   password: "",
	//   tls: true,
	//   rejectUnauthorized: true,
	//   nick: "thelounge%%",
	//   username: "thelounge",
	//   realname: "The Lounge User",
	//   join: "#thelounge"
	// }
	// ```
	defaults: {
		name: "Libera.Chat",
		host: "irc.libera.chat",
		port: 6697,
		password: "",
		tls: true,
		rejectUnauthorized: true,
		nick: "thelounge%%",
		username: "thelounge",
		realname: "The Lounge User",
		join: "#thelounge",
		leaveMessage: "",
	},

	// ### `lockNetwork`
	//
	// When set to `true`, users will not be able to modify host, port and TLS
	// settings and will be limited to the configured network.
	// These fields will also be hidden from the UI.
	//
	// This value is set to `false` by default.
	lockNetwork: false,

	// ## User management

	// ### `messageStorage`

	// The Lounge can log user messages, for example to access them later or to
	// reload messages on server restart.

	// Set this array with one or multiple values to enable logging:
	// - `text`: Messages per network and channel will be stored as text files.
	//   **Messages will not be reloaded on restart.**
	// - `sqlite`: Messages are stored in SQLite database files, one per user.
	//
	// Logging can be disabled globally by setting this value to an empty array
	// `[]`. Logging is also controlled per user individually in the `log` key of
	// their JSON configuration file.
	//
	// This value is set to `["sqlite", "text"]` by default.
	messageStorage: ["sqlite", "text"],

	// ### `useHexIp`
	//
	// When set to `true`, users' IP addresses will be encoded as hex.
	//
	// This is done to share the real user IP address with the server for host
	// masking purposes. This is encoded in the `username` field and only supports
	// IPv4.
	//
	// This value is set to `false` by default.
	useHexIp: false,

	// ## WEBIRC support
	//
	// When enabled, The Lounge will pass the connecting user's host and IP to the
	// IRC server. Note that this requires to obtain a password from the IRC
	// network that The Lounge will be connecting to and generally involves a lot
	// of trust from the network you are connecting to.
	//
	// There are 2 ways to configure the `webirc` setting:
	//
	// - **Basic**: an object where keys are IRC hosts and values are passwords.
	//   For example:
	//
	//   ```json
	//   webirc: {
	//     "irc.example.net": "thisiswebircpassword1",
	//     "irc.example.org": "thisiswebircpassword2",
	//   },
	//   ```
	//
	// - **Advanced**: an object where keys are IRC hosts and values are functions
	//   that take two arguments (`webircObj`, `network`) and return an
	//   object to be directly passed to `irc-framework`. `webircObj` contains the
	//   generated object which you can modify. For example:
	//
	//   ```js
	//   webirc: {
	//     "irc.example.com": (webircObj, network) => {
	//       webircObj.password = "thisiswebircpassword";
	//       webircObj.hostname = `webirc/${webircObj.hostname}`;
	//       return webircObj;
	//     },
	//   },
	//   ```
	//
	// This value is set to `null` to disable WEBIRC by default.
	webirc: null,

	// ## identd and oidentd support

	// ### `identd`
	//
	// Run The Lounge with `identd` support.
	//
	// The available keys for the `identd` object are:
	//
	// - `enable`: When `true`, the identd daemon runs on server start.
	// - `port`: Port to listen for ident requests.
	//
	// The value of `enable` is set to `false` to disable `identd` support by
	// default, in which case the value of `port` is ignored. The default value of
	// `port` is 113.
	identd: {
		enable: false,
		port: 113,
	},

	// ### `oidentd`
	//
	// When this setting is a string, this enables `oidentd` support using the
	// configuration file located at the given path.
	//
	// This is set to `null` by default to disable `oidentd` support.
	oidentd: null,

	// ## LDAP support

	// These settings enable and configure LDAP authentication.
	//
	// They are only being used in private mode. To know more about private mode,
	// see the `public` setting above.

	//
	// The authentication process works as follows:
	//
	// 1. The Lounge connects to the LDAP server with its system credentials.
	// 2. It performs an LDAP search query to find the full DN associated to the
	//    user requesting to log in.
	// 3. The Lounge tries to connect a second time, but this time using the
	//    user's DN and password. Authentication is validated if and only if this
	//    connection is successful.
	//
	// The search query takes a couple of parameters in `searchDN`:
	//
	// - a base DN `searchDN/base`. Only children nodes of this DN will be likely
	//   be returned;
	// - a search scope `searchDN/scope` (see LDAP documentation);
	// - the query itself, built as `(&(<primaryKey>=<username>) <filter>)`
	//   where `<username>` is the user name provided in the log in request,
	//   `<primaryKey>` is provided by the config and `<filter>` is a filtering
	//   complement also given in the config, to filter for instance only for
	//   nodes of type `inetOrgPerson`, or whatever LDAP search allows.
	//
	// Alternatively, you can specify the `bindDN` parameter. This will make The
	// Lounge ignore `searchDN` options and assume that the user DN is always
	// `<bindDN>,<primaryKey>=<username>`, where `<username>` is the user name
	// provided in the log in request, and `<bindDN>` and `<primaryKey>` are
	// provided by the configuration.
	//
	// The available keys for the `ldap` object are:
	ldap: {
		// - `enable`: when set to `false`, LDAP support is disabled and all other
		//   values are ignored.
		enable: false,

		// - `url`: A url of the form `ldaps://<ip>:<port>`.
		//   For plain connections, use the `ldap` scheme.
		url: "ldaps://example.com",

		// - `tlsOptions`: LDAP connection TLS options (only used if scheme is
		//   `ldaps://`). It is an object whose values are Node.js' `tls.connect()`
		//   options. It is set to `{}` by default.
		//   For example, this option can be used in order to force the use of IPv6:
		//   ```js
		//   {
		//     host: 'my::ip::v6',
		//     servername: 'example.com'
		//   }
		//   ```
		tlsOptions: {},

		// - `primaryKey`: LDAP primary key. It is set to `"uid"` by default.
		primaryKey: "uid",

		// - `baseDN`: LDAP base DN, alternative to `searchDN`. For example, set it
		//   to `"ou=accounts,dc=example,dc=com"`.
		//   When unset, the LDAP auth logic with use `searchDN` instead to locate users.

		// - `searchDN`: LDAP search DN settings. This defines the procedure by
		//   which The Lounge first looks for the user DN before authenticating them.
		//   It is ignored if `baseDN` is specified. It is an object with the
		//   following keys:
		searchDN: {
			//   - `rootDN`: This bind DN is used to query the server for the DN of
			//     the user. This is supposed to be a system user that has access in
			//     read-only to the DNs of the people that are allowed to log in.
			//     It is set to `"cn=thelounge,ou=system-users,dc=example,dc=com"` by
			//     default.
			rootDN: "cn=thelounge,ou=system-users,dc=example,dc=com",

			//   - `rootPassword`: Password of The Lounge LDAP system user.
			rootPassword: "1234",

			//   - `ldapFilter`: it is set to `"(objectClass=person)(memberOf=ou=accounts,dc=example,dc=com)"`
			//     by default.
			filter: "(objectClass=person)(memberOf=ou=accounts,dc=example,dc=com)",

			//   - `base`: LDAP search base (search only within this node). It is set
			//     to `"dc=example,dc=com"` by default.
			base: "dc=example,dc=com",

			//   - `scope`: LDAP search scope. It is set to `"sub"` by default.
			scope: "sub",
		},
	},

	// ## Debugging settings

	// The `debug` object contains several settings to enable debugging in The
	// Lounge. Use them to learn more about an issue you are noticing but be aware
	// this may produce more logging or may affect connection performance so it is
	// not recommended to use them by default.
	//
	// All values in the `debug` object are set to `false`.
	debug: {
		// ### `debug.ircFramework`
		//
		// When set to true, this enables extra debugging output provided by
		// [`irc-framework`](https://github.com/kiwiirc/irc-framework), the
		// underlying IRC library for Node.js used by The Lounge.
		ircFramework: false,

		// ### `debug.raw`
		//
		// When set to `true`, this enables logging of raw IRC messages into each
		// server window, displayed on the client.
		raw: false,
	},
};
