package tree_sitter_vjass_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_vjass "github.com/tree-sitter/tree-sitter-vjass/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_vjass.Language())
	if language == nil {
		t.Errorf("Error loading VJASS grammar")
	}
}
