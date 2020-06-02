const { spawn } = require('child_process');
const npmlog = require('npmlog');

const electronVersion = require('./config').appMetadata.electronVersion;

if (process.env.ELECTRON_CUSTOM_VERSION !== electronVersion) {
  npmlog.info(
    `env var ELECTRON_CUSTOM_VERSION is either not set,\n` +
      `or doesn't match electronVersion in ../package.json.\n` +
      `(is: "${process.env.ELECTRON_CUSTOM_VERSION}", wanted: "${electronVersion}").\n` +
      `re-downloading chromedriver and mksnapshot.\n`
  );

  process.env.ELECTRON_CUSTOM_VERSION = electronVersion;
  const nodePath = process.env.npm_node_execpath;
  const chromedriverDownloaderPath = require.resolve('electron-chromedriver/download-chromedriver.js');
  const mksnapshotDownloaderPath = require.resolve('electron-mksnapshot/download-mksnapshot.js');
  const chromedriverDownload = spawn(nodePath, [chromedriverDownloaderPath]);
  const mksnapshotDownload = spawn(nodePath, [mksnapshotDownloaderPath]);
  var exitStatus;

  chromedriverDownload.stdout.on('data', (data) => {
    npmlog.info(`${data}`);
  });

  chromedriverDownload.stderr.on('data', (data) => {
    npmlog.error(`${data}`);
  });

  chromedriverDownload.on('close', (code) => {
    if (code === 0) {
      exitStatus = "success";
    } else {
      exitStatus = "error";
    }

    npmlog.info(`Done re-downloading chromedriver. Status: ${exitStatus}`);
  });

  mksnapshotDownload.stdout.on('data', (data) => {
    npmlog.info(`${data}`);
  });

  mksnapshotDownload.stderr.on('data', (data) => {
    npmlog.error(`${data}`);
  });

  mksnapshotDownload.on('close', (code) => {
    if (code === 0) {
      exitStatus = "success";
    } else {
      exitStatus = "error";
    }

    npmlog.info(`Done re-downloading mksnapshot. Status: ${exitStatus}`);
  });

} else {
  npmlog.info('env var "ELECTRON_CUSTOM_VERSION" was set correctly.\n(No need to re-download chromedriver or mksnapshot). Skipping.\n');
}
