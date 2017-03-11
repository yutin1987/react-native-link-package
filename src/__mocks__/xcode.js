const xcode = require('xcode');

xcode.project.prototype.generateUuid = jest.fn();

module.exports = xcode;
