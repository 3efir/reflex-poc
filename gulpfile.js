const gulp = require('gulp');
const newer = require('gulp-newer');
const browserSync = require('browser-sync').create();
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const del = require('del');
const inject = require('gulp-inject');
const environments = require('gulp-environments');
const sequence = require('run-sequence');
const sourcemaps = require('gulp-sourcemaps');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const htmlmin = require('gulp-htmlmin');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const imagemin = require('gulp-imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const pngquant = require('imagemin-pngquant');
 
const { development, production } = environments;
 
const paths = (function (source = 'src', destination = 'dist') {
  return {
    project: {
      src: `${source}`,
      dest: `${destination}`,
    },
    templates: {
      glob: `${source}/*.html`,
      dest: `${destination}`,
    },
    styles: {
      entry: `${source}/styles.scss`,
      glob: `${source}/styles/**/*.+(scss|css)`,
      dest: `${destination}/styles`,
      output: `${destination}/styles/*.css`,
    },
    scripts: {
      entry: `${source}/scripts/scripts.js`,
      glob: `${source}/scripts/**/*.js`,
      dest: `${destination}/scripts`,
      output: `${destination}/scripts/*.js`,
    },
    images: {
      glob: `${source}/img/**/*`,
      dest: `${destination}/img`,
    },
    fonts: {
      glob: `${source}/fonts/**/*`,
      dest: `${destination}/fonts`,
    },
  };
}('src', 'dist'));
 
const webpackConfig = (function (isDevelopment = true) {
  function getPlugins() {
    const plugins = [];
 
    const providePlugin = new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      'window.$': 'jquery',
    });
 
    const uglifyJSPlugin = new UglifyJSPlugin({
      parallel: true,
      sourceMap: true,
    });
 
    if (isDevelopment) {
      plugins.push(providePlugin);
    } else {
      plugins.push(providePlugin, uglifyJSPlugin);
    }
 
    return plugins;
  }
 
  return {
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['env', {
              targets: {
                browsers: ['last 2 versions'],
              },
            }]],
            plugins: [
              'lodash',
            ],
          },
        },
      }],
    },
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    plugins: getPlugins(),
    output: {
      filename: isDevelopment ? 'scripts.js' : 'scripts.min.js',
    },
  };
}(development()));
 
gulp.task('templates', () => gulp.src(paths.templates.glob)
  .pipe(production(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') })))
  .pipe(inject(gulp.src([paths.styles.output, paths.scripts.output], { read: false }), {
    ignorePath: paths.project.dest,
  }))
  .pipe(production(htmlmin({ collapseWhitespace: true, removeComments: true })))
  .pipe(gulp.dest(paths.templates.dest)));
 
gulp.task('styles', () => gulp.src(paths.styles.entry)
  .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
  .pipe(development(sourcemaps.init()))
  .pipe(sass({ outputStyle: 'expanded' }))
  .pipe(production(autoprefixer({ browsers: ['last 2 versions'] })))
  .pipe(production(cssnano()))
  .pipe(production(rename({ suffix: '.min' })))
  .pipe(development(sourcemaps.write()))
  .pipe(gulp.dest(paths.styles.dest)));
 
gulp.task('scripts', () => gulp.src(paths.scripts.entry)
  .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
  .pipe(webpackStream(webpackConfig, webpack))
  .pipe(gulp.dest(paths.scripts.dest)));
 
gulp.task('images', () => gulp.src(paths.images.glob)
  .pipe(newer(paths.images.dest))
  .pipe(imagemin([
    imagemin.gifsicle({ interlaced: true }),
    mozjpeg({ quality: 90 }),
    pngquant({ speed: 1, quality: 98 }),
    imagemin.svgo({ plugins: [{ removeViewBox: true }] }),
  ]))
  .pipe(gulp.dest(paths.images.dest)));
 
gulp.task('fonts', () => gulp.src(paths.fonts.glob)
  .pipe(newer(paths.fonts.dest))
  .pipe(gulp.dest(paths.fonts.dest)));
 
gulp.task('watch', () => {
  gulp.watch(paths.templates.glob, ['templates', browserSync.reload]);
  gulp.watch(paths.styles.glob, ['styles', browserSync.reload]);
  gulp.watch(paths.scripts.glob, ['scripts', browserSync.reload]);
  gulp.watch(paths.images.glob, ['images', browserSync.reload]);
  gulp.watch(paths.fonts.glob, ['fonts', browserSync.reload]);
});
 
gulp.task('serve', () => {
  browserSync.init({
    server: paths.project.dest,
    port: 3010,
  });
});
 
gulp.task('clean', () => del.sync(paths.project.dest));
 
gulp.task('default', () => {
  sequence('clean', ['styles', 'scripts', 'images', 'fonts'], 'templates', ['serve', 'watch']);
});