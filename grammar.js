/**
 * @file Vjass grammar for tree-sitter
 * @author nazarpunk <nazarpunk@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "vjass",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
