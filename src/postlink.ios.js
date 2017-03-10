const _ = require('lodash');
const xcode = require('xcode');
const inquirer = require('inquirer');
const path = require('path');
const plistParser = require('plist');
const fs = require('fs');

function mountFrameworks(project, config) {
  const { packageName, framework } = config;

  const frameworkPath = `../../node_modules/${packageName}/${framework.path}`;
  const mainGroup = project.getFirstProject().firstProject.mainGroup;
  if (!project.pbxGroupByName('Frameworks')) {
    const uuid = project.pbxCreateGroup('Frameworks', '""');
    project.getPBXGroupByKey(mainGroup).children.push({
      value: uuid, comment: 'Frameworks',
    });
  }

  const target = project.getFirstTarget().uuid;

  _.forEach(framework.files, (file) => {
    project.addFramework(`${frameworkPath}${file}`, { target, customFramework: true });
  });
}

function mountParams(plist, config) {
  const { params } = config;
  return Promise.all(params.map((param) => {
    const { name, message, handler } = param;

    return inquirer.prompt({
      type: 'input',
      name: 'value',
      message,
    }).then((answer) => {
      if (handler) {
        return handler(plist, answer);
      }

      if (plist[name]) {
        return console.log(`"${name}" already specified in the plist file.`);
      }

      return _.set(plist, name, answer.value || `${name} in here`);
    });
  }));
}

module.exports = function postlink(pbxprojPath, config) {
  const pbxproj = xcode.project(pbxprojPath).parseSync();
  const targetName = pbxproj.getFirstTarget().firstTarget.name;
  const plistPath = path.join(path.dirname(pbxprojPath), `../${targetName}/Info.plist`);
  const plist = plistParser.parse(fs.readFileSync(plistPath, 'utf8'));

  return Promise.resolve()
    .then(() => (config.framework ? mountFrameworks(pbxproj, config) : false))
    .then(() => (config.params ? mountParams(plist, config) : false))
    .then(() => ({
      pbxprojPath,
      pbxproj: pbxproj.writeSync(),
      plistPath,
      plist: plistParser.build(plist),
    }));
};
