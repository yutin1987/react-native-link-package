const _ = require('lodash');
const glob = require('glob');
const postlinkAndroid = require('./src/postlink.android');
const postlinkIos = require('./src/postlink.ios');

const option = { ignore: ['node_modules/**', '**/build/**'], realpath: true };

// {
//   packageName: '',
//   framework: {
//     path: '',
//     files: [],
//   },
//   compiles: ['com.facebook.android:account-kit-sdk:4.+'],
//   permissions: ['RECEIVE_SMS'],
//   android: {
//     params: [{
//       name: 'APP_KEY',
//       message: 'What\'s your app key for android ?',
//     }],
//     activities: {
//       'com.facebook.accountkit.ui.AccountKitEmailRedirectActivity': {
//         action: ['VIEW'],
//         category: ['DEFAULT', 'BROWSABLE'],
//       },
//     },
//   }
//   ios: {
//     params: [{
//       name: 'APP_KEY',
//       message: 'What\'s your app key for ios ?',
//     }],
//   }
// }

module.expect = {
  postlink: (configs) => {
    const android = _.get(configs, 'android', {});
    postlinkAndroid(glob.sync('**/AndroidManifest.xml', option)[0], { ...configs, ...android });
    const ios = _.get(configs, 'ios', {});
    postlinkIos(glob.sync('**/*.pbxproj', option)[0], { ...configs, ...ios });
  },
  postunlink: () => {
  },
};
