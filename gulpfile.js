var gulp = require('gulp');
var typedoc = require('gulp-typedoc');

gulp.task('typedoc', function() {
  return gulp.src(['src/**/*.ts']).pipe(
    typedoc({
      // TypeScript options (see typescript docs)
      module: 'commonjs',
      target: 'ES6',
      includeDeclarations: true,

      // Output options (see typedoc docs)
      out: './docs',
      mode: 'file',
      json: './docs/output.json',
      excludePrivate: true,
      excludeExternals: true,

      // TypeDoc options (see typedoc docs)
      name: 'dynamodb-simple-model',
      ignoreCompilerErrors: false,
      readme: './README.md',
      entryPoint: 'guzmonne.github.io',
      version: true
    })
  );
});
