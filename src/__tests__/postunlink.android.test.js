const _ = require('lodash');
const glob = require('glob');
const postunlink = require('../postunlink.android');

const option = { ignore: ['node_modules/**', '**/build/**', 'link_sample/**'], realpath: true };

describe('postunlink android', () => {
  it('mount compiles', () => (
    postunlink(glob.sync('**/AndroidManifest.xml', option)[0], {
      packageName: 'rn-package',
      compiles: ['com.facebook.android:account-kit-sdk:4.+'],
    })
    .then((result) => {
      expect(result.gradle).toMatchSnapshot();
      expect(result.gradle).not.toContain('compile "com.facebook.android:account-kit-sdk:4.+"');
    })
  ));

  it('mount permissions', () => (
    postunlink(glob.sync('**/AndroidManifest.xml', option)[0], {
      packageName: 'rn-package',
      permissions: ['RECEIVE_SMS', 'SYSTEM_ALERT_WINDOW'],
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).not.toContain('android.permission.RECEIVE_SMS');
      expect(result.manifest).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    })
  ));

  it('mount activity', () => (
    postunlink(glob.sync('**/AndroidManifest.xml', option)[0], {
      packageName: 'rn-package',
      activities: {
        'com.facebook.AppActivity': {
          action: ['VIEW'],
          category: ['BROWSABLE'],
        },
      },
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).not.toContain('com.facebook.AppActivity');
    })
  ));

  it('mount params', () => (
    postunlink(glob.sync('**/AndroidManifest.xml', option)[0], {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
      }],
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).not.toContain('android:name="APP_KEY"');
    })
  ));

  it('mount params when setup handler', () => (
    postunlink(glob.sync('**/AndroidManifest.xml', option)[0], {
      packageName: 'rn-package',
      params: [{
        name: 'APP_KEY',
        message: 'What\'s your app key ?',
        handler: (manifest) => {
          const activity = _.find(manifest('application activity'), { attribs: { 'android:name': 'com.facebook.AppActivity' } });
          const dupe = _.find(manifest(activity).find('intent-filter data'), {
            attribs: { 'android:scheme': 'ak12345' },
          });
          if (dupe) manifest(dupe).remove();
        },
      }],
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).not.toContain('<data android:scheme="ak12345" />');
    })
  ));
});
