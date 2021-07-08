"use strict";

const expect = require("chai").expect;
const Chan = require("../../src/models/chan");
const Msg = require("../../src/models/msg");
const User = require("../../src/models/user");

describe("Chan", function () {
	const network = {
		network: {
			options: {
				PREFIX: [
					{symbol: "~", mode: "q"},
					{symbol: "&", mode: "a"},
					{symbol: "@", mode: "o"},
					{symbol: "%", mode: "h"},
					{symbol: "+", mode: "v"},
				],
			},
		},
	};

	const prefixLookup = {modeToSymbol: {}};

	network.network.options.PREFIX.forEach((mode) => {
		prefixLookup.modeToSymbol[mode.mode] = mode.symbol;
	});

	describe("#findMessage(id)", function () {
		const chan = new Chan({
			messages: [
				new Msg({id: 1}),
				new Msg({
					id: 2,
					text: "Message to be found",
				}),
				new Msg(),
			],
		});

		it("should find a message in the list of messages", function () {
			expect(chan.findMessage(2).text).to.equal("Message to be found");
		});

		it("should not find a message that does not exist", function () {
			expect(chan.findMessage(42)).to.be.undefined;
		});
	});

	describe("#setUser(user)", function () {
		it("should make key lowercase", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "TestUser"}));

			expect(chan.users.has("testuser")).to.be.true;
		});

		it("should update user object", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "TestUser"}, prefixLookup));
			chan.setUser(new User({nick: "TestUseR", modes: ["o"]}, prefixLookup));
			const user = chan.getUser("TestUSER");

			expect(user.mode).to.equal("@");
		});
	});

	describe("#getUser(nick)", function () {
		it("should returning existing object", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "TestUseR", modes: ["o"]}, prefixLookup));
			const user = chan.getUser("TestUSER");

			expect(user.mode).to.equal("@");
		});

		it("should make new User object if not found", function () {
			const chan = new Chan();
			const user = chan.getUser("very-testy-user");

			expect(user.nick).to.equal("very-testy-user");
		});
	});

	describe("#getSortedUsers(irc)", function () {
		const getUserNames = function (chan) {
			return chan.getSortedUsers(network).map((u) => u.nick);
		};

		it("returns unsorted list on null irc object", function () {
			const chan = new Chan();
			["JocelynD", "YaManicKill", "astorije", "xPaw", "Max-P"].forEach((nick) =>
				chan.setUser(new User({nick}))
			);

			expect(chan.getSortedUsers().map((u) => u.nick)).to.deep.equal([
				"JocelynD",
				"YaManicKill",
				"astorije",
				"xPaw",
				"Max-P",
			]);
		});

		it("should sort a simple user list", function () {
			const chan = new Chan();
			["JocelynD", "YaManicKill", "astorije", "xPaw", "Max-P"].forEach((nick) =>
				chan.setUser(new User({nick}, prefixLookup))
			);

			expect(getUserNames(chan)).to.deep.equal([
				"astorije",
				"JocelynD",
				"Max-P",
				"xPaw",
				"YaManicKill",
			]);
		});

		it("should group users by modes", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "JocelynD", modes: ["a", "o"]}, prefixLookup));
			chan.setUser(new User({nick: "YaManicKill", modes: ["v"]}, prefixLookup));
			chan.setUser(new User({nick: "astorije", modes: ["h"]}, prefixLookup));
			chan.setUser(new User({nick: "xPaw", modes: ["q"]}, prefixLookup));
			chan.setUser(new User({nick: "Max-P", modes: ["o"]}, prefixLookup));

			expect(getUserNames(chan)).to.deep.equal([
				"xPaw",
				"JocelynD",
				"Max-P",
				"astorije",
				"YaManicKill",
			]);
		});

		it("should sort a mix of users and modes", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "JocelynD"}, prefixLookup));
			chan.setUser(new User({nick: "YaManicKill", modes: ["o"]}, prefixLookup));
			chan.setUser(new User({nick: "astorije"}, prefixLookup));
			chan.setUser(new User({nick: "xPaw"}, prefixLookup));
			chan.setUser(new User({nick: "Max-P", modes: ["o"]}, prefixLookup));

			expect(getUserNames(chan)).to.deep.equal([
				"Max-P",
				"YaManicKill",
				"astorije",
				"JocelynD",
				"xPaw",
			]);
		});

		it("should be case-insensitive", function () {
			const chan = new Chan();
			["aB", "Ad", "AA", "ac"].forEach((nick) =>
				chan.setUser(new User({nick}, prefixLookup))
			);

			expect(getUserNames(chan)).to.deep.equal(["AA", "aB", "ac", "Ad"]);
		});

		it("should parse special characters successfully", function () {
			const chan = new Chan();
			[
				"[foo",
				"]foo",
				"(foo)",
				"{foo}",
				"<foo>",
				"_foo",
				"@foo",
				"^foo",
				"&foo",
				"!foo",
				"+foo",
				"Foo",
			].forEach((nick) => chan.setUser(new User({nick}, prefixLookup)));

			expect(getUserNames(chan)).to.deep.equal([
				"!foo",
				"&foo",
				"(foo)",
				"+foo",
				"<foo>",
				"@foo",
				"[foo",
				"]foo",
				"^foo",
				"_foo",
				"Foo",
				"{foo}",
			]);
		});
	});

	describe("#getFilteredClone(lastActiveChannel, lastMessage)", function () {
		it("should send empty user list", function () {
			const chan = new Chan();
			chan.setUser(new User({nick: "test"}));

			expect(chan.getFilteredClone().users).to.be.empty;
		});

		it("should keep necessary properties", function () {
			const chan = new Chan();

			expect(chan.getFilteredClone())
				.to.be.an("object")
				.that.has.all.keys(
					"firstUnread",
					"highlight",
					"id",
					"key",
					"messages",
					"totalMessages",
					"name",
					"state",
					"topic",
					"type",
					"unread",
					"users"
				);
		});

		it("should send only last message for non active channel", function () {
			const chan = new Chan({
				id: 1337,
				messages: [
					new Msg({id: 10}),
					new Msg({id: 11}),
					new Msg({id: 12}),
					new Msg({id: 13}),
				],
			});

			expect(chan.id).to.equal(1337);

			const messages = chan.getFilteredClone(999).messages;

			expect(messages).to.have.lengthOf(1);
			expect(messages[0].id).to.equal(13);
		});

		it("should send more messages for active channel", function () {
			const chan = new Chan({
				id: 1337,
				messages: [
					new Msg({id: 10}),
					new Msg({id: 11}),
					new Msg({id: 12}),
					new Msg({id: 13}),
				],
			});

			expect(chan.id).to.equal(1337);

			const messages = chan.getFilteredClone(1337).messages;

			expect(messages).to.have.lengthOf(4);
			expect(messages[0].id).to.equal(10);
			expect(messages[3].id).to.equal(13);

			expect(chan.getFilteredClone(true).messages).to.have.lengthOf(4);
		});

		it("should only send new messages", function () {
			const chan = new Chan({
				id: 1337,
				messages: [
					new Msg({id: 10}),
					new Msg({id: 11}),
					new Msg({id: 12}),
					new Msg({id: 13}),
					new Msg({id: 14}),
					new Msg({id: 15}),
				],
			});

			expect(chan.id).to.equal(1337);

			const messages = chan.getFilteredClone(1337, 12).messages;

			expect(messages).to.have.lengthOf(3);
			expect(messages[0].id).to.equal(13);
			expect(messages[2].id).to.equal(15);
		});
	});
});
