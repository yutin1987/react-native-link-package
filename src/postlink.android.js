const _ = require('lodash');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const pretty = require('android-pretty-manifest');

function mountCompiles(gradle, config) {
  return _.forEach(config.compiles, (item) => {
    gradle.replace(/.+com.facebook.react:react-native.+\n?/, match => (`${match}    compile "${item}"\n`));
  });
}

function mountPermissions(manifest, config) {
  _.forEach(config.permissions, (name) => {
    const perms = manifest('uses-permission');
    const dupe = _.find(perms, { attribs: { 'android:name': `android.permission.${name}` } });
    if (!dupe) {
      const elem = manifest('<uses-permission>').attr('android:name', `android.permission.${name}`);
      if (perms.length) {
        perms.last().after(elem);
      } else {
        manifest('manifest').prepend(elem);
      }
    }
  });
}

function mountActivities(manifest, config) {
  _.forEach(config.activities, (obj, name) => {
    const application = manifest('application');
    let activity = manifest(_.find(application.find('activity'), { attribs: { 'android:name': name } }));
    if (!activity.length) {
      activity = manifest('<activity>').attr('android:name', name);
      application.append(activity);
    }

    _.forEach(_.omit(obj, ['action', 'category']), (value, key) => {
      activity.attr(`android:${key}`, value);
    });

    if (obj.action || obj.category) {
      let intent = activity.find('intent-filter');
      if (!intent.length) {
        intent = manifest('<intent-filter>');
        activity.append(intent);
      }

      if (obj.action) {
        _.forEach(obj.action, (actionName) => {
          const dupe = _.find(intent.find('action'), {
            attribs: { 'android:name': `android.intent.action.${actionName}` },
          });
          if (!dupe) {
            intent.append(manifest('<action>').attr('android:name', `android.intent.action.${actionName}`));
          }
        });
      }

      if (obj.category) {
        _.forEach(obj.category, (categoryName) => {
          const dupe = _.find(intent.find('category'), {
            attribs: { 'android:name': `android.intent.category.${categoryName}` },
          });
          if (!dupe) {
            intent.append(manifest('<category>').attr('android:name', `android.intent.category.${categoryName}`));
          }
        });
      }
    }
  });
}

function mountParams(manifest, params) {
  const data = _.pullAt(params, 0)[0];
  const param = _.assign({}, data, data.android);

  const dupe = _.find(manifest('meta-data'), { attribs: { 'android:name': param.name } });
  const meta = _.get(dupe, 'attribs.android:value', '');

  return Promise.resolve()
    .then(() => (param.value || meta))
    .then(def => (inquirer.prompt({
      type: 'input',
      name: 'value',
      message: `${param.message}${def ? ` (${def})` : ''}`,
    })))
    .then(answer => (answer.value || param.value || meta))
    .then((value) => {
      const { name } = param;

      data.value = value;

      const handler = param.link || param.handler;
      if (handler) return handler(manifest, value);

      if (dupe) {
        return manifest(dupe).attr('android:value', value || `${name}`);
      }

      return manifest('application')
        .prepend(manifest('<meta-data>')
        .attr('android:name', name)
        .attr('android:value', value || `${name}`));
    })
    .then(() => (params.length ? mountParams(manifest, params) : false));
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
    .then(() => (configs.compiles ? mountCompiles(gradle, configs) : false))
    .then(() => (configs.permissions ? mountPermissions(manifest, configs) : false))
    .then(() => (configs.activities ? mountActivities(manifest, configs) : false))
    .then(() => (configs.params ? mountParams(manifest, _.concat(_.get(data, 'params', []), _.get(data, 'android.params', []))) : false))
    .then(() => ({
      manifestPath,
      manifest: pretty(manifest.xml()),
      gradlePath,
      gradle: gradle.data,
    }));
};
