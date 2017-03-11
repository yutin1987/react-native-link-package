jest.mock('inquirer');

const _ = require('lodash');
const postunlink = require('../postunlink.ios');

const path = 'unlink_sample/ios/sample.xcodeproj/project.pbxproj';

describe('postunlink ios', () => {
  it('mount framework', () => (
    postunlink(path, {
      packageName: 'rn-package',
      framework: {
        path: 'ios/Frameworks/',
        files: ['appkey.framework', 'appkey.bundle'],
      },
    })
    .then((result) => {
      expect(result.pbxproj).toMatchSnapshot();
      expect(result.pbxproj).not.toContain('../node_modules/rn-package/ios/Frameworks/appkey.framework');
      expect(result.pbxproj).not.toContain('appkey.bundle');
      expect(result.pbxproj).not.toContain('appkey.framework in Frameworks');
      expect(result.pbxproj).not.toContain('\\"../node_modules/rn-package/ios/Frameworks\\"');
    })
  ));

  it('mount params', () => (
    postunlink(path, {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
      }],
    })
    .then((result) => {
      expect(result.plist).toMatchSnapshot();
      expect(result.plist).not.toContain('APP_KEY');
    })
  ));

  it('mount params when setup handler', () => (
    postunlink(path, {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
        handler: (plist) => {
          const CFBundleURLSchemes = _.get(plist, 'CFBundleURLTypes[0].CFBundleURLSchemes', []);
          _.set(plist, 'CFBundleURLTypes[0].CFBundleURLSchemes', _.pull(CFBundleURLSchemes, 'ak12345'));
        },
      }],
    })
    .then((result) => {
      expect(result.plist).toMatchSnapshot();
      expect(result.plist).not.toContain('ak12345');
    })
  ));
});
