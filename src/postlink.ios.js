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

  const target = project.getFirstTarget().uuid;

  _.forEach(framework.files, (file) => {
    project.addFramework(`${frameworkPath}/${file}`, { target, customFramework: true });
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

function mountResources(project, config) {
  const { packageName, resource } = config;

  const resourcePath = `../node_modules/${packageName}/${resource.path}`.replace(/\/+$/i, '');
  const mainGroup = project.getFirstProject().firstProject.mainGroup;
  if (!project.pbxGroupByName('Resources')) {
    const uuid = project.pbxCreateGroup('Resources', '""');
    project.getPBXGroupByKey(mainGroup).children.push({
      value: uuid, comment: 'Resources',
    });
  }

  const target = project.getFirstTarget().uuid;

  _.forEach(resource.files, (file) => {
    project.addResourceFile(`${resourcePath}/${file}`, { target });
  });
}

function mountParams(plist, params) {
  const data = _.pullAt(params, 0)[0];
  const param = _.assign({}, data, data.ios);

  return Promise.resolve()
    .then(() => {
      if (param.value) return param.value;

      return inquirer.prompt({
        type: 'input',
        name: 'value',
        message: param.message,
      }).then(answer => answer.value);
    })
    .then((value) => {
      const { name } = param;

      const handler = param.link || param.handler;
      if (handler) return handler(plist, value);

      if (plist[name]) {
        return console.log(`"${name}" already specified in the plist file.`);
      }

      return _.set(plist, name, value || `${name} in here`);
    })
    .then(() => (params.length ? mountParams(plist, params) : false));
}

module.exports = function postlink(pbxprojPath, data) {
  const configs = _.assign({}, data, data.ios);
  const pbxproj = xcode.project(pbxprojPath).parseSync();
  const targetName = pbxproj.getFirstTarget().firstTarget.name;
  const plistPath = path.join(path.dirname(pbxprojPath), `../${targetName}/Info.plist`);
  const plist = plistParser.parse(fs.readFileSync(plistPath, 'utf8'));

  return Promise.resolve()
    .then(() => (configs.framework ? mountFrameworks(pbxproj, configs) : false))
    .then(() => (configs.resource ? mountResources(pbxproj, configs) : false))
    .then(() => (configs.params ? mountParams(plist, _.assign(configs.params, _.get(configs.params, 'ios', {}))) : false))
    .then(() => ({
      pbxprojPath,
      pbxproj: pbxproj.writeSync(),
      plistPath,
      plist: plistParser
        .build(plist)
        .replace(/key>(\n *)<key/, (match, value) => `key>${value}<string></string>${value}<key`),
    }));
};
