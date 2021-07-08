"use strict";

const expect = require("chai").expect;

const Msg = require("../../src/models/msg");
const User = require("../../src/models/user");

describe("Msg", function () {
	["from", "target"].forEach((prop) => {
		it(`should keep a copy of the original user in the \`${prop}\` property`, function () {
			const prefixLookup = {modeToSymbol: {a: "&", o: "@"}};
			const user = new User(
				{
					modes: ["o"],
					nick: "foo",
				},
				prefixLookup
			);
			const msg = new Msg({[prop]: user});

			// Mutating the user
			user.setModes(["a"], prefixLookup);
			user.nick = "bar";

			// Message's `.from`/etc. should still refer to the original user
			expect(msg[prop]).to.deep.equal({mode: "@", nick: "foo"});
		});
	});

	describe("#findPreview(link)", function () {
		const msg = new Msg({
			previews: [
				{
					body: "",
					head: "Example Domain",
					link: "https://example.org/",
					thumb: "",
					type: "link",
					shown: true,
				},
				{
					body: "",
					head: "The Lounge",
					link: "https://thelounge.chat/",
					thumb: "",
					type: "link",
					shown: true,
				},
			],
		});

		it("should find a preview given an existing link", function () {
			expect(msg.findPreview("https://thelounge.chat/").head).to.equal("The Lounge");
		});

		it("should not find a preview that does not exist", function () {
			expect(msg.findPreview("https://github.com/thelounge/thelounge")).to.be.undefined;
		});
	});
});
