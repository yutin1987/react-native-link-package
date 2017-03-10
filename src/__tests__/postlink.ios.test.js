jest.mock('inquirer');

const _ = require('lodash');
const glob = require('glob');
const inquirer = require('inquirer');
const postlink = require('../postlink.ios');

const option = { ignore: ['node_modules/**', '**/build/**'], realpath: true };

describe('postlink ios', () => {
  it('mount framework', () => (
    postlink(glob.sync('**/*.pbxproj', option)[0], {
      packageName: 'rn-package',
      framework: {
        path: 'ios/Frameworksa/',
        files: ['appkey.framework'],
      },
    })
    .then((result) => {
      expect(result.pbxproj).toContain('../../node_modules/rn-package/ios/Frameworksa/appkey.framework');
      expect(result.pbxproj).toContain('appkey.framework in Frameworks');
      expect(result.pbxproj).toContain('\\"../../node_modules/rn-package/ios/Frameworksa\\"');
    })
  ));

  it('mount params', () => {
    const value = '594f5212-3d66-45d9-a992-ad94263cf318';
    inquirer.prompt.mockReturnValueOnce(Promise.resolve({ value }));

    return postlink(glob.sync('**/*.pbxproj', option)[0], {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
      }],
    })
    .then((result) => {
      expect(result.plist).toMatchSnapshot();
      expect(result.plist).toContain('APP_KEY');
      expect(result.plist).toContain(value);
    });
  });

  it('mount params when setup handler', () => {
    const value = '594f5212-3d66-45d9-a992-ad94263cf318';
    inquirer.prompt.mockReturnValueOnce(Promise.resolve({ value }));

    return postlink(glob.sync('**/*.pbxproj', option)[0], {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
        handler: (plist, answer) => {
          const CFBundleURLSchemes = _.get(plist, 'CFBundleURLTypes.CFBundleURLSchemes', []);
          CFBundleURLSchemes.push(`ak${answer.value || 'APP_KEY in here'}`);
          _.set(plist, 'CFBundleURLTypes.CFBundleURLSchemes', CFBundleURLSchemes);
        },
      }],
    })
    .then((result) => {
      expect(result.plist).toMatchSnapshot();
      expect(result.plist).toContain('CFBundleURLSchemes');
      expect(result.plist).toContain(`ak${value}`);
    });
  });
});
