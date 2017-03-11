jest.mock('inquirer');

const _ = require('lodash');
const xcode = require('xcode');
const inquirer = require('inquirer');
const postlink = require('../postlink.ios');

const generateUuid = xcode.project.prototype.generateUuid;

const path = 'link_sample/ios/sample.xcodeproj/project.pbxproj';

describe('postlink ios', () => {
  it('mount framework', () => {
    generateUuid.mockReturnValueOnce('E77F019A5F934FC8BADCD2DA');
    generateUuid.mockReturnValueOnce('7EC55606029D4633B56B87AB');
    generateUuid.mockReturnValueOnce('E733E413F91D4CBDB8C24C76');
    return postlink(path, {
      packageName: 'rn-package',
      framework: {
        path: 'ios/Frameworks/',
        files: ['appkey.framework'],
      },
    })
    .then((result) => {
      expect(result.pbxproj).toMatchSnapshot();
      expect(result.pbxproj).toContain('../node_modules/rn-package/ios/Frameworks/appkey.framework');
      expect(result.pbxproj).toContain('appkey.framework in Frameworks');
      expect(result.pbxproj).toContain('\\"../node_modules/rn-package/ios/Frameworks\\"');
    });
  });

  it('mount params', () => {
    const value = '594f5212-3d66-45d9-a992-ad94263cf318';
    inquirer.prompt.mockReturnValueOnce(Promise.resolve({ value }));

    return postlink(path, {
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

    return postlink(path, {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
        handler: (plist, answer) => {
          const CFBundleURLSchemes = _.get(plist, 'CFBundleURLTypes[0].CFBundleURLSchemes', []);
          CFBundleURLSchemes.push(`ak${answer.value || 'APP_KEY in here'}`);
          _.set(plist, 'CFBundleURLTypes[0].CFBundleURLSchemes', CFBundleURLSchemes);
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
