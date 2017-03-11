const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const pretty = require('android-pretty-manifest');

function mountCompiles(gradle, config) {
  return _.forEach(config.compiles, (item) => {
    gradle.replace(new RegExp(` *compile "${item}" *\n`, 'i'), '');
  });
}

function mountPermissions(manifest, config) {
  _.forEach(config.permissions, (name) => {
    const dupe = _.find(manifest('uses-permission'), { attribs: { 'android:name': `android.permission.${name}` } });
    if (dupe) manifest(dupe).remove();
  });
}

function mountActivities(manifest, config) {
  _.forEach(config.activities, (obj, name) => {
    const application = manifest('application');
    const dupe = _.find(application.find('activity'), { attribs: { 'android:name': name } });
    if (dupe) manifest(dupe).remove();
  });
}

function mountParams(manifest, config) {
  const meta = manifest('meta-data');
  _.forEach(config.params, ({ name, handler }) => {
    if (handler) {
      return handler(manifest);
    }

    const dupe = _.find(meta, { attribs: { 'android:name': name } });
    if (dupe) manifest(dupe).remove();
    return true;
  });
}

module.exports = function postlink(manifestPath, config) {
  const manifest = cheerio.load(fs.readFileSync(manifestPath, 'utf8'), { xmlMode: true });
  const gradlePath = path.join(path.dirname(manifestPath), '../../build.gradle');
  const gradle = {
    data: fs.readFileSync(gradlePath, 'utf8'),
    replace: (search, replace) => { gradle.data = gradle.data.replace(search, replace); },
  };

  return Promise.resolve()
    .then(() => (config.compiles ? mountCompiles(gradle, config) : false))
    .then(() => (config.permissions ? mountPermissions(manifest, config) : false))
    .then(() => (config.activities ? mountActivities(manifest, config) : false))
    .then(() => (config.params ? mountParams(manifest, config) : false))
    .then(() => ({
      manifestPath,
      manifest: pretty(manifest.xml()),
      gradlePath,
      gradle: gradle.data,
    }));
};
