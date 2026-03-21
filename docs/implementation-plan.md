# Search Rewrite Implementation Plan

## Rewrite Order

1. Delete the legacy public search behavior and all hybrid-search-specific copy.
2. Define the new public contract in docs.
3. Write brand-new failing tests for parser, backend, HTTP, and web.
4. Implement the replacement parser and unified search path.
5. Rebuild the web search experience around the rewritten contract.
6. Refactor only after the new test suite is green.

## Contract To Implement

- one public search model
- semantic-first retrieval for descriptive queries
- query-language constraints inside `q`
- external `tag` merged into the same constraint model
- no public hybrid mode
- no legacy lexical-first contract

## Required Parser Behavior

- parse `tag:`
- parse `author:`
- parse `title:`
- parse `body:`
- preserve `"exact phrase"`
- extract `-term`
- parse `has:answers`
- parse `score:`
- parse `answers:`
- separate semantic intent from hard constraints
- handle malformed operators deterministically

## Required Backend Behavior

- semantic intent drives descriptive-query retrieval
- hard constraints filter candidates after retrieval
- operator-only queries use constrained non-semantic matching in the same path
- semantic retrieval only considers the active embedding model
- writes stay fail-open when embedding generation fails
- semantic recall is fail-closed on reads

## Required Tests

### Parser

- each operator parses correctly
- mixed free text plus operators
- quoted phrase preservation
- excluded-term extraction
- malformed operator handling

### Backend

- semantic-first retrieval for descriptive queries
- `tag:` and external `tag` constrain the same path
- `author:`, `title:`, `body:`, `"phrase"`, `-term`, `has:answers`,
  `score:`, and `answers:` act as hard constraints
- active embedding model filtering applies
- operator-only queries work without semantic retrieval
- empty results are returned when constraints remove all candidates
- embedding failure does not block writes and disables semantic recall for that
  read

### HTTP

- response shape remains stable
- search accepts the rewritten contract only
- old hybrid and lexical-first expectations are removed

### Web

- the rewritten search page renders
- advanced query help is visible
- no hybrid wording remains
- result states match the new contract
