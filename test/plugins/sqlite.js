"use strict";

const fs = require("fs");
const path = require("path");
const expect = require("chai").expect;
const util = require("../util");
const Msg = require("../../src/models/msg");
const Helper = require("../../src/helper");
const MessageStorage = require("../../src/plugins/messageStorage/sqlite.js");

describe("SQLite Message Storage", function () {
	// Increase timeout due to unpredictable I/O on CI services
	this.timeout(util.isRunningOnCI() ? 25000 : 5000);
	this.slow(300);

	const expectedPath = path.join(Helper.getHomePath(), "logs", "testUser.sqlite3");
	let store;

	before(function (done) {
		store = new MessageStorage({
			name: "testUser",
			idMsg: 1,
		});

		// Delete database file from previous test run
		if (fs.existsSync(expectedPath)) {
			fs.unlink(expectedPath, done);
		} else {
			done();
		}
	});

	after(function (done) {
		// After tests run, remove the logs folder
		// so we return to the clean state
		fs.unlinkSync(expectedPath);
		fs.rmdir(path.join(Helper.getHomePath(), "logs"), done);
	});

	it("should resolve an empty array when disabled", function (done) {
		store.getMessages(null, null).then((messages) => {
			expect(messages).to.be.empty;
			done();
		});
	});

	it("should create database file", function () {
		expect(store.isEnabled).to.be.false;
		expect(fs.existsSync(expectedPath)).to.be.false;

		store.enable();

		expect(store.isEnabled).to.be.true;
	});

	it("should create tables", function (done) {
		const rows = store.database
			.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'table'")
			.all();

		expect(rows).to.deep.equal([
			{
				name: "options",
				tbl_name: "options",
				sql:
					"CREATE TABLE options (name TEXT, value TEXT, CONSTRAINT name_unique UNIQUE (name))",
			},
			{
				name: "messages",
				tbl_name: "messages",
				sql:
					"CREATE TABLE messages (network TEXT, channel TEXT, time INTEGER, type TEXT, msg TEXT)",
			},
		]);

		done();
	});

	it("should insert schema version to options table", function (done) {
		const row = store.database
			.prepare("SELECT value FROM options WHERE name = 'schema_version'")
			.get();
		expect(row.value).to.equal("1520239200");
		done();
	});

	it("should store a message", function (done) {
		store.index(
			{uuid: "this-is-a-network-guid"},
			{name: "#thisISaCHANNEL"},
			new Msg({
				time: 123456789,
				text: "Hello from sqlite world!",
			})
		);

		done();
	});

	it("should retrieve previously stored message", function (done) {
		store
			.getMessages({uuid: "this-is-a-network-guid"}, {name: "#thisisaCHANNEL"})
			.then((messages) => {
				expect(messages).to.have.lengthOf(1);

				const msg = messages[0];

				expect(msg.text).to.equal("Hello from sqlite world!");
				expect(msg.type).to.equal(Msg.Type.MESSAGE);
				expect(msg.time.getTime()).to.equal(123456789);

				done();
			});
	});

	it("should close database", function (done) {
		store.close((err) => {
			expect(err).to.be.undefined;
			expect(fs.existsSync(expectedPath)).to.be.true;
			done();
		});
	});
});
