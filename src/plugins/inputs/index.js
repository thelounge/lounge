const passThroughCommands = [
	"/as",
	"/bs",
	"/cs",
	"/ho",
	"/hs",
	"/join",
	"/ms",
	"/ns",
	"/os",
	"/rs",
];

const userInputs = [
	"action",
	"away",
	"ban",
	"connect",
	"ctcp",
	"disconnect",
	"ignore",
	"invite",
	"kick",
	"kill",
	"list",
	"mode",
	"msg",
	"nick",
	"notice",
	"part",
	"quit",
	"raw",
	"rejoin",
	"topic",
	"whois",
].reduce(function (plugins, name) {
	const plugin = require(`./${name}`);
	plugin.commands.forEach((command) => plugins.set(command, plugin));
	return plugins;
}, new Map());

const pluginCommands = new Map();

const getCommands = () =>
	Array.from(userInputs.keys())
		.concat(Array.from(pluginCommands.keys()))
		.map((command) => `/${command}`)
		.concat(passThroughCommands)
		.sort();

const addPluginCommand = (packageInfo, command, func) => {
	func.packageInfo = packageInfo;
	pluginCommands.set(command, func);
};

module.exports = {
	addPluginCommand,
	getCommands,
	pluginCommands,
	userInputs,
};
