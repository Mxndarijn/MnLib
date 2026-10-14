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
    customLaunchers: {
      // Narrow viewport so the mobile bottom-sheet media query (< 640px) matches.
      // Used to verify the sheet slide-up/slide-down animations specifically:
      //   npx ng test mn-angular-lib --browsers=ChromeHeadlessNarrow \
      //     --include='**/sheet-animation.spec.ts'
      ChromeHeadlessNarrow: {
        base: 'ChromeHeadless',
        flags: ['--window-size=375,667'],
      },
    },
    browsers: ['ChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true,
    coverageReporter: {
      dir: require('path').join(__dirname, '../../coverage/mn-angular-lib'),
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
      // Only enforced with --code-coverage (as pr-checks.yml runs it). Set ~2 points under the
      // measured coverage (76.6/65.7/77.7/78.2) so a normal PR has headroom; ratchet up by hand
      // when coverage goes up, never lower to make a PR pass.
      check: {
        global: { statements: 74, branches: 63, functions: 75, lines: 76 },
      },
      fixWebpackSourcePaths: true
    }
  });
};
