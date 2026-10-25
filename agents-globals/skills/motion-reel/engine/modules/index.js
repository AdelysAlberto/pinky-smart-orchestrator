// Module registry. Add a module here to make it addressable by a preset's `modules` list.
import * as mark from './mark.js';
import * as fragments from './fragments.js';
import * as kineticType from './kinetic-type.js';
import * as wordFlip from './word-flip.js';
import * as telemetry from './telemetry.js';
import * as lockup from './lockup.js';

export const MODULES = {
  mark,
  fragments,
  'kinetic-type': kineticType,
  'word-flip': wordFlip,
  telemetry,
  lockup,
};

export const AVAILABLE = Object.keys(MODULES);
