const _ = require('lodash');
const xcode = require('xcode');
const path = require('path');
const plistParser = require('plist');
const fs = require('fs');

function mountFrameworks(project, config) {
  const { packageName, framework } = config;

  const frameworkPath = `../node_modules/${packageName}/${framework.path}`.replace(/\/+$/i, '');
  const mainGroup = project.getFirstProject().firstProject.mainGroup;
  if (!project.pbxGroupByName('Frameworks')) {
    const uuid = project.pbxCreateGroup('Frameworks', '""');
    project.getPBXGroupByKey(mainGroup).children.push({
      value: uuid, comment: 'Frameworks',
    });
  }

  _.forEach(framework.files, (file) => {
    project.removeFramework(`${frameworkPath}/${file}`, { customFramework: true });
  });

  _.forEach(
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

function mountParams(plist, params) {
  _.forEach(params, (param) => {
    const { name } = param;

    const handler = _.find(['unlinkIos', 'handlerIos', 'unlink', 'handler'], value => _.has(param, value));
    if (handler) return param[handler](plist);

    return _.unset(plist, name);
  });
}

module.exports = function postlink(pbxprojPath, config) {
  const pbxproj = xcode.project(pbxprojPath).parseSync();
  const targetName = pbxproj.getFirstTarget().firstTarget.name;
  const plistPath = path.join(path.dirname(pbxprojPath), `../${targetName}/Info.plist`);
  const plist = plistParser.parse(fs.readFileSync(plistPath, 'utf8'));

  return Promise.resolve()
    .then(() => (config.framework ? mountFrameworks(pbxproj, config) : false))
    .then(() => (config.params ? mountParams(plist, _.clone(config.params)) : false))
    .then(() => ({
      pbxprojPath,
      pbxproj: pbxproj.writeSync(),
      plistPath,
      plist: plistParser.build(plist),
    }));
};
