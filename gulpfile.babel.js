import gulpLoadPlugins from 'gulp-load-plugins';
import sourceMaps from 'gulp-sourcemaps';
import runSequence from 'run-sequence';
import ts from 'gulp-typescript';
import gulp from 'gulp';
import path from 'path';
import del from 'del';

const plugins = gulpLoadPlugins();

// Clean up dist and coverage directory
gulp.task('clean', () =>
  del.sync(['dist/**', 'dist/.*', 'coverage/**', '!dist', '!coverage'])
);

// Compile Typescript
gulp.task('ts', () => {
  const res = gulp.src(['src/**/*.ts'])
    .pipe(sourceMaps.init())
    .pipe(ts.createProject('tsconfig.json')());

  return res.js.pipe(sourceMaps.write('.', {
    includeContent: false,
    sourceRoot: ""
  })).pipe(gulp.dest('dist'));
});

// Start server with restart on file changes
gulp.task('nodemon', ['ts'], () =>
  plugins.nodemon({
    script: path.join('dist', 'server', 'index.js'),
    ext: 'js',
    ignore: ['node_modules/**/*.js', 'dist/**/*.js'],
    tasks: ['ts']
  })
);

// gulp serve for development
gulp.task('serve', ['clean'], () => runSequence('nodemon'));

// default task: clean dist, compile js files
gulp.task('default', ['clean'], () => {
  runSequence(
    ['ts']
  );
});
