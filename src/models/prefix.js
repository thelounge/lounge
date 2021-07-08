"use strict";

class Prefix {
	constructor(prefix) {
		this.prefix = prefix || []; // [{symbol: "@", mode: "o"}, ... ]
		this.modeToSymbol = {};
		this.symbols = [];
		this._update_internals();
	}

	_update_internals() {
		// clean out the old cruft
		this.modeToSymbol = {};
		this.symbols = [];

		const that = this;
		this.prefix.forEach(function (p) {
			that.modeToSymbol[p.mode] = p.symbol;
			that.symbols.push(p.symbol);
		});
	}

	update(prefix) {
		this.prefix = prefix || [];
		this._update_internals();
	}

	forEach(f) {
		return this.prefix.forEach(f);
	}
}

module.exports = Prefix;
