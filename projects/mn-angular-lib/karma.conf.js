// Karma configuration for mn-angular-lib
// See https://karma-runner.github.io for config options
// Angular builder: https://angular.dev/tools/cli/test

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true,
    coverageReporter: {
      dir: require('path').join(__dirname, '../../coverage/mn-angular-lib'),
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
      fixWebpackSourcePaths: true
    }
  });
};
