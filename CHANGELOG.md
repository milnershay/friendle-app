# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Daily routines with custom game sequences
- Stats tracking per category (language + word length)
- Auto-advance between routine games
- Results modal after each game
- Daily round counter
- Automatic room cleanup (cron job)
- Comprehensive test coverage (37% overall)
- Version display in UI
- Complete JSDoc documentation

### Fixed
- Multiplayer sync bugs using Firebase runTransaction
- Routine index zero calculation error
- Firebase credentials in GitHub CI
- Test failures (localStorage mock, waitFor import)
- All lint warnings and errors

## [0.1.0] - 2024-05-22
### Added
- Initial release
