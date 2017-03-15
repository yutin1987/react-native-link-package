const _ = require('lodash');
const xcode = require('xcode');
const path = require('path');
const plistParser = require('plist');
const fs = require('fs');

function unmountFrameworks(project, config) {
  const { packageName, framework } = config;

  const frameworkPath = `../node_modules/${packageName}/${framework.path}`.replace(/\/+$/i, '');

  const target = project.getFirstTarget().uuid;

  _.forEach(framework.files, (file) => {
    project.removeFramework(`${frameworkPath}/${file}`, { target, customFramework: true });
  });

  return _.forEach(
    _.filter(project.pbxXCBuildConfigurationSection(), (obj, key) => key.indexOf('_comment') === -1),
    ({ buildSettings }) => {
      if (buildSettings.PRODUCT_NAME) {
        const searchPaths = _.get(buildSettings, 'FRAMEWORK_SEARCH_PATHS');
        if (searchPaths && _.isArray(searchPaths)) {
          _.set(buildSettings, 'FRAMEWORK_SEARCH_PATHS', _.pull(searchPaths, `"\\"${frameworkPath}\\""`));
        }
      }
    });
}

function unmountResources(project, config) {
  const { packageName, resource } = config;

  const resourcesPath = `../node_modules/${packageName}/${resource.path}`.replace(/\/+$/i, '');

  const target = project.getFirstTarget().uuid;

  _.forEach(resource.files, (file) => {
    project.removeResourceFile(`${resourcesPath}/${file}`, { target });
  });
}

function unmountParams(plist, params) {
  _.forEach(params, (data) => {
    const param = _.assign({}, data, data.ios);
    const { name } = param;

    const handler = _.find(['unlinkIos', 'handlerIos', 'unlink', 'handler'], value => _.has(param, value));
    if (handler) return param[handler](plist);

    return _.unset(plist, name);
  });
}

module.exports = function postlink(pbxprojPath, data) {
  const configs = _.assign({}, data, data.ios);
  const pbxproj = xcode.project(pbxprojPath).parseSync();
  const targetName = pbxproj.getFirstTarget().firstTarget.name;
  const plistPath = path.join(path.dirname(pbxprojPath), `../${targetName}/Info.plist`);
  const plist = plistParser.parse(fs.readFileSync(plistPath, 'utf8'));

  return Promise.resolve()
    .then(() => (configs.framework ? unmountFrameworks(pbxproj, configs) : false))
    .then(() => (configs.resource ? unmountResources(pbxproj, configs) : false))
    .then(() => (configs.params ? unmountParams(plist, _.clone(configs.params)) : false))
    .then(() => ({
      pbxprojPath,
      pbxproj: pbxproj.writeSync(),
      plistPath,
      plist: plistParser
        .build(plist)
        .replace(/key>(\n *)<key/, (match, value) => `key>${value}<string></string>${value}<key`),
    }));
};
