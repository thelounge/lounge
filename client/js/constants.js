"use strict";

const commands = [
	"/away",
	"/back",
	"/banlist",
	"/close",
	"/connect",
	"/deop",
	"/devoice",
	"/disconnect",
	"/invite",
	"/join",
	"/kick",
	"/leave",
	"/me",
	"/mode",
	"/msg",
	"/nick",
	"/notice",
	"/op",
	"/part",
	"/query",
	"/quit",
	"/raw",
	"/say",
	"/send",
	"/server",
	"/slap",
	"/topic",
	"/voice",
	"/whois"
];

var handledTypes = [
	"ban_list",
	"invite",
	"join",
	"mode",
	"kick",
	"nick",
	"part",
	"quit",
	"topic",
	"topic_set_by",
	"action",
	"whois",
	"ctcp",
	"channel_list",
];
var condensedTypes = [
	"join",
	"mode",
	"nick",
	"part",
	"quit",
	"popin",
	"ripout",
];

module.exports = {
	commands,
	condensedTypes,
	handledTypes
};
