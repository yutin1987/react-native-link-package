const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const pretty = require('android-pretty-manifest');

function unmountCompiles(gradle, config) {
  return _.forEach(config.compiles, (item) => {
    gradle.replace(new RegExp(` *compile "${item}" *\n`, 'i'), '');
  });
}

function unmountPermissions(manifest, config) {
  _.forEach(config.permissions, (name) => {
    const dupe = _.find(manifest('uses-permission'), { attribs: { 'android:name': `android.permission.${name}` } });
    if (dupe) manifest(dupe).remove();
  });
}

function unmountActivities(manifest, config) {
  _.forEach(config.activities, (obj, name) => {
    const application = manifest('application');
    const dupe = _.find(application.find('activity'), { attribs: { 'android:name': name } });
    if (dupe) manifest(dupe).remove();
  });
}

function unmountParams(manifest, params) {
  const meta = manifest('meta-data');
  _.forEach(params, (data) => {
    const param = _.assign({}, data, data.ios);
    const { name } = param;

    const handler = _.find(['unlinkAndroid', 'handlerAndroid', 'unlink', 'handler'], value => _.has(param, value));
    if (handler) return param[handler](manifest);

    const dupe = _.find(meta, { attribs: { 'android:name': name } });
    if (dupe) manifest(dupe).remove();
    return true;
  });
}

module.exports = function postlink(manifestPath, data) {
  const configs = _.assign({}, data, data.android);
  const manifest = cheerio.load(fs.readFileSync(manifestPath, 'utf8'), { xmlMode: true });
  const gradlePath = path.join(path.dirname(manifestPath), '../../build.gradle');
  const gradle = {
    data: fs.readFileSync(gradlePath, 'utf8'),
    replace: (search, replace) => { gradle.data = gradle.data.replace(search, replace); },
  };

  return Promise.resolve()
    .then(() => (configs.compiles ? unmountCompiles(gradle, configs) : false))
    .then(() => (configs.permissions ? unmountPermissions(manifest, configs) : false))
    .then(() => (configs.activities ? unmountActivities(manifest, configs) : false))
    .then(() => (configs.params ? unmountParams(manifest, _.clone(configs.params)) : false))
    .then(() => ({
      manifestPath,
      manifest: pretty(manifest.xml()),
      gradlePath,
      gradle: gradle.data,
    }));
};
