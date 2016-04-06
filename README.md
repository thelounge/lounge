[![#thelounge IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23thelounge%20on%20freenode-blue.svg)](https://webchat.freenode.net/?nick=Lounge-user&channels=#thelounge)
[![npm version](https://img.shields.io/npm/v/thelounge.svg)](https://www.npmjs.org/package/thelounge)
[![Build Status](https://travis-ci.org/thelounge/lounge.svg?branch=master)](https://travis-ci.org/thelounge/lounge)
[![Dependency Status](https://david-dm.org/thelounge/lounge.svg)](https://david-dm.org/thelounge/lounge)
[![devDependency Status](https://david-dm.org/thelounge/lounge/dev-status.svg)](https://david-dm.org/thelounge/lounge#info=devDependencies)

# The Lounge

__What is it?__

The Lounge is a web IRC client that you host on your own server.

*This is the official, community-managed fork of @erming's great initiative, the [Shout](https://github.com/erming/shout) project.*

[Try the demo](http://avatar.playat.ch:1000)

__What features does it have?__

- Multiple user support
- Stays connected even when you close the browser
- Connect from multiple devices at once
- Responsive layout — works well on your smartphone
- _.. and more!_

__Why the fork?__

We felt that the original [Shout](https://github.com/erming/shout) project
"stagnated" a little because its original author wanted it to remain his pet
project (which is a perfectly fine thing!).

A bunch of people, excited about doing things a bit differently than the upstream
project forked it under a new name: “The Lounge”.

This fork aims to be community managed, meaning that the decisions are taken
in a collegial fashion, and that a bunch of maintainers should be able to make
the review process quicker and more streamlined.

## Install

```
sudo npm install -g thelounge
```

## Usage

When the install is complete, go ahead and run this in your terminal:

```
lounge --help
```

For more information, read the [documentation](https://thelounge.github.io/docs/).

## Development setup

To run the app from source, just clone the code and run this in your terminal:

```
npm install
npm start
```

You will have to run `npm run build` if you change or add anything in
`client/js/libs` or `client/views.`

## License

Available under the [MIT License](http://mths.be/mit).

Some fonts licensed under [SIL OFL](http://scripts.sil.org/OFL) and the [Apache License](http://www.apache.org/licenses/).
