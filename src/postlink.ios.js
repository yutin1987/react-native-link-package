const _ = require('lodash');
const xcode = require('xcode');
const inquirer = require('inquirer');
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
    project.addFramework(`${frameworkPath}/${file}`, { customFramework: true });
  });

  const INHERITED = '"$(inherited)"';

  _.forEach(
    _.filter(project.pbxXCBuildConfigurationSection(), (obj, key) => key.indexOf('_comment') === -1),
    ({ buildSettings }) => {
      if (buildSettings.PRODUCT_NAME) {
        let searchPaths = _.get(buildSettings, 'FRAMEWORK_SEARCH_PATHS', [INHERITED]);
        if (searchPaths === INHERITED) searchPaths = [INHERITED];
        searchPaths.push(`"\\"${frameworkPath}\\""`);

        _.set(buildSettings, 'FRAMEWORK_SEARCH_PATHS', _.uniq(searchPaths));
      }
    });
}

function mountParams(plist, params) {
  const param = _.pullAt(params, 0)[0];
  const { name, message } = param;

  return inquirer
    .prompt({
      type: 'input',
      name: 'value',
      message,
    })
    .then((answer) => {
      const handler = _.find(['linkIos', 'handlerIos', 'link', 'handler'], value => _.has(param, value));
      if (handler) return param[handler](plist, answer);

      if (plist[name]) {
        return console.log(`"${name}" already specified in the plist file.`);
      }

      return _.set(plist, name, answer.value || `${name} in here`);
    })
    .then(() => (params.length ? mountParams(plist, params) : false));
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
