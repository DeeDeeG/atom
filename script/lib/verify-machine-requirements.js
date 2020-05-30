'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = require('../config');

module.exports = function(ci) {
  verifyNode();
  verifyNpm(ci);
  verifyPython();
};

function verifyNode() {
  const fullVersion = process.versions.node;
  const majorVersion = fullVersion.split('.')[0];
  if (majorVersion >= 6) {
    console.log(`Node:\tv${fullVersion}`);
  } else if (majorVersion >= 4) {
    console.log(`Node:\tv${fullVersion}`);
    console.warn(
      '\tWarning: Building on Node below version 6 is deprecated. Please use Node 6.x+ to build Atom.'
    );
  } else {
    throw new Error(
      `node v4+ is required to build Atom. node v${fullVersion} is installed.`
    );
  }
}

function verifyNpm(ci) {
  const stdout = childProcess.execFileSync(
    CONFIG.getNpmBinPath(ci),
    ['--version'],
    { env: process.env }
  );
  const fullVersion = stdout.toString().trim();
  const majorVersion = fullVersion.split('.')[0];
  const oldestMajorVersionSupported = ci ? 6 : 3;
  if (majorVersion >= oldestMajorVersionSupported) {
    console.log(`Npm:\tv${fullVersion}`);
  } else {
    throw new Error(
      `npm v${oldestMajorVersionSupported}+ is required to build Atom. npm v${fullVersion} was detected.`
    );
  }
}

function verifyPython() {
  // This function essentially re-implements node-gyp's "find-python.js" library,
  // but in a synchronous, bootstrap-script-friendly way.
  // It is based off of the logic of the file from node-gyp v5.x:
  // https://github.com/nodejs/node-gyp/blob/v5.1.1/lib/find-python.js
  // This node-gyp is the version in use by current npm (in mid 2020).
  //
  // TODO: If apm ships a newer version of node-gyp (v6.x or later), please update this script.
  // Particularly, node-gyp v6.x looks for python3 first, then python, then python2.
  // (In contrast: node-gyp v5.x looks for python first, then python2, then python3.)
  // Also, node-gyp v7.x or later will probably drop the "-2" flag from "py.exe",
  // so as to allow finding Python 3 as well, not just Python 2.
  // https://github.com/nodejs/node-gyp/pull/2124#issuecomment-633812957

  var stdout;
  var fullVersion;
  var usablePythonWasFound;

  function verifyBinary(binary, prependFlag) {
    if (binary && !usablePythonWasFound) {
      let allFlags = ['-c', 'import platform\nprint(platform.python_version())'];
      if (prependFlag) {
        // prependFlag is an optional argument,
        // used to prepend "-2" for the "py.exe" launcher.
        // TODO: Refactor by eliminating prependFlag
        // once apm updates to node-gyp v7.x+, when it is anticipated
        // that the "-2" flag will be dropped for invoking the py launcher.
        allFlags.unshift(prependFlag);
      }

      try {
        stdout = childProcess.execFileSync(
          binary,
          allFlags,
            { env: process.env }
        );
      } catch {
      }

      if (stdout) {
        if (stdout.indexOf('+') !== -1) stdout = stdout.toString().replace(/\+/g, '');
        if (stdout.indexOf('rc') !== -1) stdout = stdout.toString().replace(/rc(.*)$/gi, '');
        fullVersion = stdout.toString().trim();
      }

      if (fullVersion) {
        var versionComponents = fullVersion.split('.');
        var majorVersion = Number(versionComponents[0]);
        var minorVersion = Number(versionComponents[1]);
        if (majorVersion === 2 && minorVersion === 7 || majorVersion === 3 && minorVersion >= 5) {
          usablePythonWasFound = true;
        } else {
          stdout = '';
        }
      }
    }
  }

  function verifyForcedBinary(binary) {
    if (binary.length > 0) {
      verifyBinary(binary);
      if (!usablePythonWasFound){
        throw new Error(
          `NODE_GYP_FORCE_PYTHON is set to: "${binary}", but this is not a valid Python.\n` +
            'Please set NODE_GYP_FORCE_PYTHON to something valid, or unset it entirely.\n' +
              '(Python 2.7 or 3.5+ is required to build Atom.)\n'
        );
      }
    }
  }

  // These first two checks do nothing if the relevant
  // environment variables aren't set.
  verifyForcedBinary(process.env.NODE_GYP_FORCE_PYTHON);
  // All the following checks will no-op if a previous check has succeeded.
  verifyBinary(process.env.PYTHON);
  verifyBinary('python');
  verifyBinary('python2');
  verifyBinary('python3');
  if (process.platform === 'win32') {
    verifyBinary('py.exe', '-2');
    verifyBinary(path.join(process.env.SystemDrive || 'C:', 'Python27', 'python.exe'));
    verifyBinary(path.join(process.env.SystemDrive || 'C:', 'Python37', 'python.exe'));
  }

  if (usablePythonWasFound) {
    console.log(`Python:\tv${fullVersion}`);
  } else {
    throw new Error(
      'Python 2.7 or 3.5+ is required to build Atom.\n' +
        'verify-machine-requirements.js was unable to find such a version of Python.\n' +
          "Set the PYTHON env var to e.g. 'C:/path/to/Python27/python.exe'\n" +
            'if your Python is installed in a non-default location.\n'
    );
  }
}
