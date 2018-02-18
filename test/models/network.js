"use strict";

const {expect} = require("chai");
const Chan = require("../../src/models/chan");
const Msg = require("../../src/models/msg");
const User = require("../../src/models/user");
const Network = require("../../src/models/network");

describe("Network", function() {
	describe("#export()", function() {
		it("should produce an valid object", function() {
			var network = new Network({
				awayMessage: "I am away",
				name: "networkName",
				channels: [
					new Chan({name: "#thelounge", key: ""}),
					new Chan({name: "&foobar", key: ""}),
					new Chan({name: "#secret", key: "foo"}),
					new Chan({name: "&secure", key: "bar"}),
					new Chan({name: "Channel List", type: Chan.Type.SPECIAL}),
					new Chan({name: "PrivateChat", type: Chan.Type.QUERY}),
				],
			});
			network.setNick("chillin`");

			expect(network.export()).to.deep.equal({
				awayMessage: "I am away",
				name: "networkName",
				host: "",
				port: 6667,
				tls: false,
				password: "",
				username: "",
				realname: "",
				commands: [],
				nick: "chillin`",
				ip: null,
				hostname: null,
				channels: [
					{name: "#thelounge", key: ""},
					{name: "&foobar", key: ""},
					{name: "#secret", key: "foo"},
					{name: "&secure", key: "bar"},
					{name: "PrivateChat", type: "query"},
				],
			});
		});

		it("lobby should be at the top", function() {
			var network = new Network({
				name: "Super Nice Network",
				channels: [
					new Chan({name: "AAAA!", type: Chan.Type.QUERY}),
					new Chan({name: "#thelounge"}),
					new Chan({name: "&foobar"}),
				],
			});
			network.channels.push(new Chan({name: "#swag"}));

			expect(network.channels[0].name).to.equal("Super Nice Network");
			expect(network.channels[0].type).to.equal(Chan.Type.LOBBY);
		});

		it("should maintain channel reference", function() {
			var chan = new Chan({
				name: "#506-bug-fix",
				messages: [
					new Msg({
						text: "message in constructor",
					}),
				],
			});

			var network = new Network({
				name: "networkName",
				channels: [
					chan,
				],
			});

			chan.messages.push(new Msg({
				text: "message in original instance",
			}));

			network.channels[1].messages.push(new Msg({
				text: "message after network creation",
			}));

			expect(network.channels[1].messages).to.have.lengthOf(3);
			expect(network.channels[1].messages[0].text).to.equal("message in constructor");
			expect(network.channels[1].messages[1].text).to.equal("message in original instance");
			expect(network.channels[1].messages[2].text).to.equal("message after network creation");
		});
	});

	describe("#getFilteredClone(lastActiveChannel, lastMessage)", function() {
		it("should filter channels", function() {
			const chan = new Chan();
			chan.setUser(new User({nick: "test"}));

			const network = new Network({
				channels: [
					chan,
				],
			});

			expect(network.channels[0].users).to.be.empty;
		});

		it("should keep necessary properties", function() {
			const network = new Network();

			expect(network.getFilteredClone()).to.be.an("object").that.has.all.keys(
				"channels",
				"commands",
				"host",
				"hostname",
				"id",
				"ip",
				"name",
				"port",
				"realname",
				"serverOptions",
				"tls",
				"username"
			);
		});
	});
});
