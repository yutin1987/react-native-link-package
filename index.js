const _ = require('lodash');
const glob = require('glob');
const fs = require('fs');
const inquirer = require('inquirer');
const postlinkAndroid = require('./src/postlink.android');
const postlinkIos = require('./src/postlink.ios');
const postunlinkAndroid = require('./src/postunlink.android');
const postunlinkIos = require('./src/postunlink.ios');

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

module.exports = {
  link: configs => (Promise
    .resolve()
    .then(() => postlinkAndroid(glob.sync('**/AndroidManifest.xml', option)[0], configs))
    .then(({ manifestPath, manifest, gradlePath, gradle }) => {
      fs.writeFileSync(manifestPath, manifest);
      fs.writeFileSync(gradlePath, gradle);
    })
    .then(() => postlinkIos(glob.sync('**/*.pbxproj', option)[0], configs))
    .then(({ pbxprojPath, pbxproj, plistPath, plist }) => {
      fs.writeFileSync(pbxprojPath, pbxproj);
      fs.writeFileSync(plistPath, plist);
    })
  ),
  unlink: configs => (Promise
    .resolve()
    .then(() => postunlinkAndroid(glob.sync('**/AndroidManifest.xml', option)[0], configs))
    .then(({ manifestPath, manifest, gradlePath, gradle }) => {
      fs.writeFileSync(manifestPath, manifest);
      fs.writeFileSync(gradlePath, gradle);
    })
    .then(() => postunlinkIos(glob.sync('**/*.pbxproj', option)[0], configs))
    .then(({ pbxprojPath, pbxproj, plistPath, plist }) => {
      fs.writeFileSync(pbxprojPath, pbxproj);
      fs.writeFileSync(plistPath, plist);
    })
  ),
};
