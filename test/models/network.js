"use strict";

const expect = require("chai").expect;
const Chan = require("../../src/models/chan");
const Msg = require("../../src/models/msg");
const User = require("../../src/models/user");
const Network = require("../../src/models/network");
const Helper = require("../../src/helper");

describe("Network", function () {
	describe("#export()", function () {
		it("should produce an valid object", function () {
			const network = new Network({
				uuid: "hello world",
				awayMessage: "I am away",
				name: "networkName",
				sasl: "plain",
				saslAccount: "testaccount",
				saslPassword: "testpassword",
				channels: [
					new Chan({name: "#thelounge", key: "", muted: false}),
					new Chan({name: "&foobar", key: "", muted: false}),
					new Chan({name: "#secret", key: "foo", muted: false}),
					new Chan({name: "&secure", key: "bar", muted: true}),
					new Chan({name: "Channel List", type: Chan.Type.SPECIAL}),
					new Chan({name: "PrivateChat", type: Chan.Type.QUERY, muted: true}),
				],
			});
			network.setNick("chillin`");

			expect(network.export()).to.deep.equal({
				uuid: "hello world",
				awayMessage: "I am away",
				name: "networkName",
				host: "",
				port: 6667,
				tls: false,
				userDisconnected: false,
				rejectUnauthorized: false,
				password: "",
				username: "",
				realname: "",
				leaveMessage: "",
				sasl: "plain",
				saslAccount: "testaccount",
				saslPassword: "testpassword",
				commands: [],
				nick: "chillin`",
				proxyEnabled: false,
				proxyHost: "",
				proxyPort: 1080,
				proxyUsername: "",
				channels: [
					{name: "#thelounge", key: "", muted: false},
					{name: "&foobar", key: "", muted: false},
					{name: "#secret", key: "foo", muted: false},
					{name: "&secure", key: "bar", muted: true},
					{name: "PrivateChat", type: "query", muted: true},
				],
				ignoreList: [],
			});
		});

		it("validate should set correct defaults", function () {
			Helper.config.defaults.nick = "";

			const network = new Network({
				host: "localhost",
			});

			expect(network.validate()).to.be.true;
			expect(network.nick).to.equal("thelounge");
			expect(network.username).to.equal("thelounge");
			expect(network.realname).to.equal("The Lounge User");
			expect(network.port).to.equal(6667);

			const network2 = new Network({
				host: "localhost",
				nick: "@Invalid Nick?",
			});
			expect(network2.validate()).to.be.true;
			expect(network2.username).to.equal("InvalidNick");
		});

		it("lockNetwork should be enforced when validating", function () {
			Helper.config.lockNetwork = true;

			// Make sure we lock in private mode
			Helper.config.public = false;

			const network = new Network({
				host: "",
				port: 1337,
				tls: false,
				rejectUnauthorized: false,
			});
			expect(network.validate()).to.be.true;
			expect(network.host).to.equal("irc.example.com");
			expect(network.port).to.equal(6697);
			expect(network.tls).to.be.true;
			expect(network.rejectUnauthorized).to.be.true;

			// Make sure we lock in public mode (also resets public=true for other tests)
			Helper.config.public = true;

			const network2 = new Network({
				host: "some.fake.tld",
			});
			expect(network2.validate()).to.be.true;
			expect(network2.host).to.equal("irc.example.com");

			Helper.config.lockNetwork = false;
		});

		it("editing a network should enforce correct types", function () {
			let saveCalled = false;
			let nameEmitCalled = false;

			const network = new Network();
			network.edit(
				{
					emit(name, data) {
						if (name === "network:name") {
							nameEmitCalled = true;
							expect(data.uuid).to.equal(network.uuid);
							expect(data.name).to.equal("Lounge Test Network");
						}
					},
					save() {
						saveCalled = true;
					},
				},
				{
					nick: "newNick",
					host: "new.tld",
					name: "Lounge Test Network",
					port: "1337",
					tls: undefined,
					rejectUnauthorized: undefined,
					username: 1234,
					password: 4567,
					realname: 8901,
					sasl: "something",
					saslAccount: 1337,
					saslPassword: 1337,
					commands: "/command 1 2 3\r\n/ping HELLO\r\r\r\r/whois test\r\n\r\n",
					ip: "newIp",
					hostname: "newHostname",
					uuid: "newuuid",
				}
			);

			expect(saveCalled).to.be.true;
			expect(nameEmitCalled).to.be.true;
			expect(network.uuid).to.not.equal("newuuid");
			expect(network.ip).to.be.undefined;
			expect(network.hostname).to.be.undefined;

			expect(network.name).to.equal("Lounge Test Network");
			expect(network.channels[0].name).to.equal("Lounge Test Network");

			expect(network.nick).to.equal("newNick");
			expect(network.host).to.equal("new.tld");
			expect(network.port).to.equal(1337);
			expect(network.tls).to.be.false;
			expect(network.rejectUnauthorized).to.be.false;
			expect(network.username).to.equal("1234");
			expect(network.password).to.equal("4567");
			expect(network.realname).to.equal("8901");
			expect(network.sasl).to.equal("");
			expect(network.saslAccount).to.equal("1337");
			expect(network.saslPassword).to.equal("1337");
			expect(network.commands).to.deep.equal([
				"/command 1 2 3",
				"/ping HELLO",
				"/whois test",
			]);
		});

		it("should generate uuid (v4) for each network", function () {
			const network1 = new Network();
			const network2 = new Network();

			expect(network1.uuid).to.have.lengthOf(36);
			expect(network2.uuid).to.have.lengthOf(36);
			expect(network1.uuid).to.not.equal(network2.uuid);
		});

		it("lobby should be at the top", function () {
			const network = new Network({
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

		it("should maintain channel reference", function () {
			const chan = new Chan({
				name: "#506-bug-fix",
				messages: [
					new Msg({
						text: "message in constructor",
					}),
				],
			});

			const network = new Network({
				name: "networkName",
				channels: [chan],
			});

			chan.messages.push(
				new Msg({
					text: "message in original instance",
				})
			);

			network.channels[1].messages.push(
				new Msg({
					text: "message after network creation",
				})
			);

			expect(network.channels[1].messages).to.have.lengthOf(3);
			expect(network.channels[1].messages[0].text).to.equal("message in constructor");
			expect(network.channels[1].messages[1].text).to.equal("message in original instance");
			expect(network.channels[1].messages[2].text).to.equal("message after network creation");
		});
	});

	describe("#getFilteredClone(lastActiveChannel, lastMessage)", function () {
		it("should filter channels", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "test"}));

			const network = new Network({
				channels: [chan],
			});

			expect(network.channels[0].users).to.be.empty;
		});

		it("should keep necessary properties", function () {
			const network = new Network();
			const clone = network.getFilteredClone();

			expect(clone)
				.to.be.an("object")
				.that.has.all.keys("channels", "status", "nick", "name", "serverOptions", "uuid");

			expect(clone.status).to.be.an("object").that.has.all.keys("connected", "secure");
		});
	});

	describe("#addChannel(newChan)", function () {
		it("should add channel", function () {
			const chan = new Chan({name: "#thelounge"});

			const network = new Network({
				channels: [chan],
			});
			// Lobby and initial channel
			expect(network.channels.length).to.equal(2);

			const newChan = new Chan({name: "#foo"});
			network.addChannel(newChan);

			expect(network.channels.length).to.equal(3);
		});

		it("should add channel alphabetically", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#thelounge"});
			const chan3 = new Chan({name: "#zero"});

			const network = new Network({
				channels: [chan1, chan2, chan3],
				name: "foo",
			});

			const newChan = new Chan({name: "#foo"});
			network.addChannel(newChan);

			expect(network.channels[0].name).to.equal("foo");
			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(newChan);
			expect(network.channels[3]).to.equal(chan2);
			expect(network.channels[4]).to.equal(chan3);
		});

		it("should sort case-insensitively", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#THELOUNGE"});

			const network = new Network({
				channels: [chan1, chan2],
			});

			const newChan = new Chan({name: "#foo"});
			network.addChannel(newChan);

			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(newChan);
			expect(network.channels[3]).to.equal(chan2);
		});

		it("should sort users separately from channels", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#THELOUNGE"});

			const network = new Network({
				channels: [chan1, chan2],
			});

			const newUser = new Chan({name: "mcinkay", type: Chan.Type.QUERY});
			network.addChannel(newUser);

			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(chan2);
			expect(network.channels[3]).to.equal(newUser);
		});

		it("should sort users alphabetically", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#THELOUNGE"});
			const user1 = new Chan({name: "astorije", type: Chan.Type.QUERY});
			const user2 = new Chan({name: "xpaw", type: Chan.Type.QUERY});

			const network = new Network({
				channels: [chan1, chan2, user1, user2],
			});

			const newUser = new Chan({name: "mcinkay", type: Chan.Type.QUERY});
			network.addChannel(newUser);

			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(chan2);
			expect(network.channels[3]).to.equal(user1);
			expect(network.channels[4]).to.equal(newUser);
			expect(network.channels[5]).to.equal(user2);
		});

		it("should not sort special channels", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#THELOUNGE"});
			const user1 = new Chan({name: "astorije", type: Chan.Type.QUERY});
			const user2 = new Chan({name: "xpaw", type: Chan.Type.QUERY});

			const network = new Network({
				channels: [chan1, chan2, user1, user2],
			});

			const newBanlist = new Chan({name: "Banlist for #THELOUNGE", type: Chan.Type.SPECIAL});
			network.addChannel(newBanlist);

			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(chan2);
			expect(network.channels[3]).to.equal(user1);
			expect(network.channels[4]).to.equal(user2);
			expect(network.channels[5]).to.equal(newBanlist);
		});

		it("should not compare against special channels", function () {
			const chan1 = new Chan({name: "#abc"});
			const chan2 = new Chan({name: "#THELOUNGE"});
			const user1 = new Chan({name: "astorije", type: Chan.Type.QUERY});

			const network = new Network({
				channels: [chan1, chan2, user1],
			});

			const newBanlist = new Chan({name: "Banlist for #THELOUNGE", type: Chan.Type.SPECIAL});
			network.addChannel(newBanlist);
			const newUser = new Chan({name: "mcinkay", type: Chan.Type.QUERY});
			network.addChannel(newUser);

			expect(network.channels[1]).to.equal(chan1);
			expect(network.channels[2]).to.equal(chan2);
			expect(network.channels[3]).to.equal(user1);
			expect(network.channels[4]).to.equal(newUser);
			expect(network.channels[5]).to.equal(newBanlist);
		});

		it("should insert before first special channel", function () {
			const banlist = new Chan({name: "Banlist for #THELOUNGE", type: Chan.Type.SPECIAL});
			const chan1 = new Chan({name: "#thelounge"});
			const user1 = new Chan({name: "astorije", type: Chan.Type.QUERY});

			const network = new Network({
				channels: [banlist, chan1, user1],
			});

			const newChan = new Chan({name: "#foo"});
			network.addChannel(newChan);

			expect(network.channels[1]).to.equal(newChan);
			expect(network.channels[2]).to.equal(banlist);
			expect(network.channels[3]).to.equal(chan1);
			expect(network.channels[4]).to.equal(user1);
		});

		it("should never add something in front of the lobby", function () {
			const network = new Network({
				name: "foo",
				channels: [],
			});

			const newUser = new Chan({name: "astorije"});
			network.addChannel(newUser);

			expect(network.channels[1]).to.equal(newUser);
		});
	});
});
