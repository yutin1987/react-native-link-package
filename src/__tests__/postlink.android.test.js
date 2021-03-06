jest.mock('inquirer');

const inquirer = require('inquirer');
const postlink = require('../postlink.android');

const path = 'link_sample/android/app/src/main/AndroidManifest.xml';

describe('postlink android', () => {
  it('mount compiles', () => (
    postlink(path, {
      packageName: 'rn-package',
      compiles: ['com.facebook.android:account-kit-sdk:4.+'],
    })
    .then((result) => {
      expect(result.gradle).toMatchSnapshot();
      expect(result.gradle).toContain('compile "com.facebook.android:account-kit-sdk:4.+"');
    })
  ));

  it('mount permissions', () => (
    postlink(path, {
      packageName: 'rn-package',
      permissions: ['RECEIVE_SMS', 'SYSTEM_ALERT_WINDOW'],
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).toContain('<uses-permission android:name="android.permission.RECEIVE_SMS" />');
      expect(result.manifest).toContain('<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />');
    })
  ));

  it('mount activity', () => (
    postlink(path, {
      packageName: 'rn-package',
      activities: {
        'com.facebook.accountkit.ui.AccountKitEmailRedirectActivity': {
          action: ['VIEW'],
          category: ['DEFAULT', 'BROWSABLE'],
        },
        'com.facebook.AppActivity': {
          action: ['VIEW'],
          category: ['BROWSABLE'],
        },
      },
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).toContain('com.facebook.accountkit.ui.AccountKitEmailRedirectActivity');
      expect(result.manifest).toContain('android.intent.action.VIEW');
      expect(result.manifest).toContain('android.intent.category.DEFAULT');
      expect(result.manifest).toContain('android.intent.category.BROWSABLE');
    })
  ));

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
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).toContain('android:name="APP_KEY"');
      expect(result.manifest).toContain('android:value="594f5212-3d66-45d9-a992-ad94263cf318"');
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
        handler: (manifest, input) => {
          const elem = manifest('<data>').attr('android:scheme', `ak${input}`);
          manifest('application activity').eq(0).find('intent-filter').append(elem);
        },
      }],
    })
    .then((result) => {
      expect(result.manifest).toMatchSnapshot();
      expect(result.manifest).toContain(`<data android:scheme="ak${value}" />`);
    });
  });
});
