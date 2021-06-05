"use strict";

const expect = require("chai").expect;
const TextFileMessageStorage = require("../../src/plugins/messageStorage/text");

describe("TextFileMessageStorage", function () {
	const store = new TextFileMessageStorage();

	it("should combine network name and uuid into a safe name", function () {
		expect(
			store._getNetworkFolderName({
				name: "Freenode",
				uuid: "f9042ec9-4016-45e0-a8a8-d378fb252628",
			})
		).to.equal("freenode-4016-45e0-a8a8-d378fb252628");
	});

	it("network name should be cleaned up and lowercased", function () {
		expect(
			store._getNetworkFolderName({
				name: '@ TeSt ../..\\<>:"/\\|?*',
				uuid: "f9042ec9-4016-45e0-a8a8-d378fb252628",
			})
		).to.equal("@-test-.._..--45e0-a8a8-d378fb252628");
	});

	it("folder name may contain two dashes if on boundary", function () {
		expect(
			store._getNetworkFolderName({
				name: "Freenod",
				uuid: "f9042ec9-4016-45e0-a8a8-d378fb252628",
			})
		).to.equal("freenod--4016-45e0-a8a8-d378fb252628");
	});

	it("should limit network name length", function () {
		expect(
			store._getNetworkFolderName({
				name: "This network name is longer than the uuid itself but it should be limited",
				uuid: "f9042ec9-4016-45e0-a8a8-d378fb252628",
			})
		).to.equal("this-network-name-is-lo-d378fb252628");
	});
});
