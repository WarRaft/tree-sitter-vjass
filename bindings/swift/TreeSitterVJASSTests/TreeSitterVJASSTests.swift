import XCTest
import SwiftTreeSitter
import TreeSitterVjass

final class TreeSitterVjassTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_vjass())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading VJASS grammar")
    }
}
