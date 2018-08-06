var backstopjs = require('backstopjs');
var civicrmScssRoot = require('civicrm-scssroot')();
var Promise = require('es6-promise').Promise;
var fs = require('fs');
var gulp = require('gulp');
var clean = require('gulp-clean');
var color = require('gulp-color');
var file = require('gulp-file');
var bulk = require('gulp-sass-bulk-import');
var sass = require('gulp-sass');
var _ = require('lodash');
var argv = require('yargs').argv;

/**
 * Sass tasks
 */
(function () {
  gulp.task('sass', function () {
    return civicrmScssRoot.update()
      .then(function () {
        return gulp.src('scss/*.scss')
          .pipe(bulk())
          .pipe(sass({
            includePaths: civicrmScssRoot.getPath(),
            outputStyle: 'compressed'
          }).on('error', sass.logError))
          .pipe(gulp.dest('css/'));
      });
  });
}());

/**
 * BackstopJS tasks
 */
(function () {
  var backstopDir = 'backstop_data/';
  var files = { config: 'site-config.json', tpl: 'backstop.tpl.json' };
  var configTpl = {
    'url': 'http://%{site-host}',
    'credentials': { 'name': '%{user-name}', 'pass': '%{user-password}' }
  };

  gulp.task('backstopjs:reference', function (done) {
    runBackstopJS('reference').then(done);
  });

  gulp.task('backstopjs:test', function (done) {
    runBackstopJS('test').then(done);
  });

  gulp.task('backstopjs:report', function (done) {
    runBackstopJS('openReport').then(done);
  });

  gulp.task('backstopjs:approve', function (done) {
    runBackstopJS('approve').then(done);
  });

  /**
   * Checks if the site config file is in the backstopjs folder
   * If not, it creates a template for it
   *
   * @return {Boolean} [description]
   */
  function isConfigFilePresent () {
    var check = true;

    try {
      fs.readFileSync(backstopDir + files.config);
    } catch (err) {
      fs.writeFileSync(backstopDir + files.config, JSON.stringify(configTpl, null, 2));
      check = false;
    }

    return check;
  }

  /**
   * Runs backstopJS with the given command.
   *
   * @param  {string} command
   * @return {Promise}
   */
  function runBackstopJS (command) {
    var destFile = 'backstop.temp.json';

    if (!isConfigFilePresent()) {
      console.log(color(
        'No site-config.json file detected!\n' +
        'One has been created for you under ' + backstopDir + '\n' +
        'Please insert the real value for each placholder and try again', 'RED'
      ));

      return Promise.reject(new Error());
    }

    return new Promise(function (resolve) {
      gulp.src(backstopDir + files.tpl)
        .pipe(file(destFile, tempFileContent()))
        .pipe(gulp.dest(backstopDir))
        .on('end', function () {
          var promise = backstopjs(command, {
            configPath: backstopDir + destFile,
            filter: argv.filter
          })
            .catch(_.noop).then(function () { // equivalent to .finally()
              gulp.src(backstopDir + destFile, { read: false }).pipe(clean());
            });

          resolve(promise);
        });
    });
  }

  /**
   * Creates the content of the config temporary file that will be fed to BackstopJS
   * The content is the mix of the config template and the list of scenarios
   * under the scenarios/ folder
   *
   * @return {string}
   */
  function tempFileContent () {
    var config = JSON.parse(fs.readFileSync(backstopDir + files.config));
    var tpl = JSON.parse(fs.readFileSync(backstopDir + files.tpl));

    tpl.scenarios = tpl.scenarios.map(function (scenario) {
      scenario.url = config.url + '/' + scenario.url;

      return scenario;
    });

    return JSON.stringify(tpl);
  }
}());

gulp.task('watch', function () {
  gulp.watch('scss/**/*.scss', gulp.parallel('sass'));
});

gulp.task('default', gulp.parallel('sass'));
