"use strict";

var expect = require("chai").expect;

var Chan = require("../../src/models/chan");
var Network = require("../../src/models/network");

describe("Network", function() {
	describe("#export()", function() {

		it("should produce an valid object", function() {
			var network = new Network({name: "networkName"});
			network.setNick("chillin`");
			network.channels.push(new Chan({name: "#thelounge"}));
			network.channels.push(new Chan({name: "&foobar"}));
			network.channels.push(new Chan({name: "Lobby", type: Chan.Type.LOBBY}));
			network.channels.push(new Chan({name: "PrivateChat", type: Chan.Type.QUERY}));

			expect(network.export()).to.deep.equal({
				name: "networkName",
				host: "",
				port: 6667,
				tls: false,
				password: "",
				username: "",
				realname: "",
				commands: [],
				encoding: "utf8",
				nick: "chillin`",
				ip: null,
				hostname: null,
				channels: [
					{"name": "#thelounge"},
					{"name": "&foobar"},
				]
			});
		});
	});
});
