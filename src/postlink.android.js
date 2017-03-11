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
  const param = _.pullAt(params, 0)[0];
  const { name, message } = param;

  return inquirer
    .prompt({
      type: 'input',
      name: 'value',
      message,
    })
    .then((answer) => {
      const handler = _.find(['linkAndroid', 'handlerAndroid', 'link', 'handler'], value => _.has(param, value));
      if (handler) return param[handler](manifest, answer);

      const dupe = _.find(manifest('meta-data'), { attribs: { 'android:name': name } });

      if (dupe) {
        return console.log(`"${name}" already specified in the AndroidManifest.xml file.`);
      }

      return manifest('manifest')
        .prepend(manifest('<meta-data>')
        .attr('android:name', name)
        .attr('android:value', answer.value || `${name}-in-here`));
    })
    .then(() => (params.length ? mountParams(manifest, params) : false));
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
    .then(() => (config.params ? mountParams(manifest, _.clone(config.params)) : false))
    .then(() => ({
      manifestPath,
      manifest: pretty(manifest.xml()),
      gradlePath,
      gradle: gradle.data,
    }));
};
