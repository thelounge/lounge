"use strict";

const expect = require("chai").expect;
const messageMatchFilters = require("../../../../client/js/helpers/messageMatchFilters").default;

describe("messageMatchFilters helper", function () {
	const hidePreviewFilters = "foo, bar,   ns fw   , 고";

	it("should NOT match a filter", function () {
		const teststrings = [
			"http://url.com/nsfw.png", // Only "ns fw" was provided, the space was not removed
			"nsfw http://url.com/image.gif",
			"ns http://url.com/pic.png fw",
			"http://url.com/link.png",
			"hey check this out http://url.com/link.ogg",
			"this is sfw http://url.com/sfw.mp4",
			"foö http://url.com/link.mp4",
			"win http://url.com/song.mp3 dows",
		];

		for (const teststring of teststrings) {
			expect(messageMatchFilters(teststring, hidePreviewFilters)).to.be.false;
		}
	});

	it("should match a filter", function () {
		const teststrings = [
			"this http://www.bar.com/link.png should be filtered",
			"foo http://url.com/image.gif bar",
			"고 http://url.com/pic.png",
			"ns fw http://url.com/video.mp4",
			"http://url.com/pic.png bar",
			"this is a long string lets talk about foo and also paste in http://url.com/pic.gif this gif",
			"foö http://url.com/bar.mp4",
		];

		for (const teststring of teststrings) {
			expect(messageMatchFilters(teststring, hidePreviewFilters)).to.be.true;
		}
	});
});
