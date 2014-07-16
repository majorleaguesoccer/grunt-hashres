/*
 * grunt-hashres
 * https://github.com/luismahou/grunt-hashres
 *
 * Copyright (c) 2013 Luismahou
 * Licensed under the MIT license.
 */

'use strict';

var fs    = require('fs'),
    path  = require('path'),
    utils = require('./hashresUtils');

exports.hashAndSub = function(grunt, options) {

  var src              = options.src,
      dest             = options.dest,
      encoding         = options.encoding,
      fileNameFormat   = options.fileNameFormat,
      renameFiles      = options.renameFiles,
      nameToHashedName = {},
      nameToNameSearch = {},
      formatter        = null,
      searchFormatter  = null;

  grunt.log.debug('files: ' + options.files);
  grunt.log.debug('Using encoding ' + encoding);
  grunt.log.debug('Using fileNameFormat ' + fileNameFormat);
  grunt.log.debug(renameFiles ? 'Renaming files' : 'Not renaming files');

  formatter = utils.compileFormat(fileNameFormat);
  searchFormatter = utils.compileSearchFormat(fileNameFormat);

  if (options.files) {
    // get common directory path
    var mergedFilePaths = [];
    options.files.forEach(function(f) {
      mergedFilePaths = mergedFilePaths.concat(f.src.map(function(src) {
        return path.dirname(src);
      }));
    });
    var commonpath = options.root || utils.findCommonPath(mergedFilePaths);
    grunt.log.debug('common path: ' + commonpath);

    options.files.forEach(function(f) {
      f.src.forEach(function(src) {
        var md5        = utils.md5(src).slice(0, 8),
            fileName   = path.basename(src),
            filePath   = path.dirname(src).replace(commonpath, ''),
            key        = path.join(filePath, fileName),
            lastIndex  = fileName.lastIndexOf('.'),
            renamed    = formatter({
              hash: md5,
              name: fileName.slice(0, lastIndex),
              ext : fileName.slice(lastIndex + 1, fileName.length),
              path: filePath
            }),
            nameSearch = searchFormatter({
              hash: /[0-9a-f]{8}/,
              name: fileName.slice(0, lastIndex),
              ext: fileName.slice(lastIndex + 1, fileName.length),
              path: filePath
            });

        // Mapping the original name with hashed one for later use.
        nameToHashedName[key] = renamed;
        nameToNameSearch[key] = nameSearch;

        // Renaming the file
        if (renameFiles) {
          fs.renameSync(src, path.resolve(path.dirname(src), path.basename(renamed)));
        }
        grunt.log.write(src + ' ').ok(renamed);
      });

      // sort by length
      // It is very useful when we have bar.js and foo-bar.js
      // @crodas
      var files = [];
      for (var src in nameToHashedName) {
        files.push([src, nameToHashedName[src]]);
      }
      files.sort(function(a, b) {
        return b[0].length - a[0].length;
      });



      // Substituting references to the given files with the hashed ones.
      grunt.file.expand(f.dest).forEach(function(f) {
        grunt.log.subhead(f);
        var destContents = fs.readFileSync(f, encoding);
        files.forEach(function(value) {
          grunt.log.debug('Substituting ' + nameToNameSearch[value[0]] + ' by ' + value[1]);
          destContents = destContents.replace(new RegExp('([\'"])' + nameToNameSearch[value[0]] + '([\'"])', "g"), function (match, p1, p2) {
            grunt.log.write(nameToNameSearch[value[0]] + ' ').ok(value[1]);
            return p1 + value[1] + p2;
          });

          grunt.log.debug('Substituting ' + value[0] + ' by ' + value[1]);
          destContents = destContents.replace(new RegExp('([\'"])' + utils.preg_quote(value[0])+'(\\?[0-9a-z]+)?([\'"])', 'g'), function (match, p1, p2, p3) {
            grunt.log.write(value[0] + ' ').ok(value[1]);
            return p1 + value[1] + p3;
          });
        });
        grunt.log.debug('Saving the updated contents of the destination file');
        fs.writeFileSync(f, destContents, encoding);
      });
    });
  }
};
