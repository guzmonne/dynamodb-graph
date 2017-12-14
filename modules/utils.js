'use strict';

var _ = require('lodash');
var chance = require('chance').Chance();

module.exports = {
  randomMac
};

// ---
/**
 * List of valid hexadecimal values.
 * @type {array}
 */
const HEXA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 'A', 'B', 'C', 'D', 'F'];
/**
 * Returns a random MAC number.
 * @returns {string} New random mac.
 */
function randomMac() {
  return _.chunk(_.range(12).map(i => chance.pickone(HEXA)), 2)
    .join(':')
    .replace(/,/g, '')
    .toLowerCase();
}
