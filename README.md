# react-native-link-package

When you need to do a custom package for react-native, and you have some advanced settings on native as add framework into ios, you will like it.

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![NPM version](https://img.shields.io/npm/v/react-native-link-package.svg?style=flat-square)](https://www.npmjs.com/package/react-native-link-package)

# build status

[![Build Status](https://travis-ci.org/yutin1987/react-native-link-package.svg?branch=master)](https://travis-ci.org/yutin1987/react-native-link-package)
[![codecov](https://codecov.io/gh/yutin1987/react-native-link-package/branch/master/graph/badge.svg)](https://codecov.io/gh/yutin1987/react-native-link-package)

# user guide

## step 1: setup commands into package.json

ex: [package.json](https://github.com/yutin1987/react-native-bridge-firebase/blob/master/package.json#L22)

```
  "rnpm": {
    "commands": {
      "postlink": "node node_modules/${packageName}/script/postlink",
      "postunlink": "node node_modules/${packageName}/script/postunlink"
    }
  }
```

## stup 2: call react-native-link-package and setup configs

`postlink.js` or `postunlink.js`

```
const rnlp = require('react-native-link-package');

rnlp.link({
  packageName: '',
  framework: {
    path: '',
    files: [],
  },
  compiles: ['com.facebook.android:account-kit-sdk:4.+'],
  permissions: ['RECEIVE_SMS'],
  android: {
    params: [{
      name: 'APP_KEY',
      message: 'What\'s your app key for android ?',
    }],
    activities: {
      'com.facebook.accountkit.ui.AccountKitEmailRedirectActivity': {
        action: ['VIEW'],
        category: ['DEFAULT', 'BROWSABLE'],
      },
    },
  }
  ios: {
    params: [{
      name: 'APP_KEY',
      message: 'What\'s your app key for ios ?',
      link: () => {},
      unlink: () => {},
    }],
  }
});
```
