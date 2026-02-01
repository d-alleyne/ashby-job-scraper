# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-02-01

### Changed
- **BREAKING**: Standardized output format for better integration compatibility
  - `company` → `companyName`
  - `employmentType` → `type` (e.g., "FullTime" → "Full-time")
  - `teams` array → `department` string (first team name)
  - Added `applyUrl` field
- README updated to discourage `daysBack` filter (applies after fetching, not cost-effective)
- All examples now use team filtering instead of date filtering

### Removed
- `isRemote` field (not valuable for remote-first companies)
- `compensation` field (simplified output schema)

### Fixed
- Graceful handling when company has no active job postings (null check)
- Input schema path in actor.json

### Added
- `INPUT-OPTIMIZED.json` - Production config with team filters for 6 companies
- Comprehensive team filtering examples in README
- Cost optimization guidance

## [1.0.0] - 2026-02-01

### Added
- Initial release
- GraphQL-based Ashby job board scraper
- Team/department filtering support
- Date range filtering (daysBack)
- Result limits (maxJobs)
- Per-URL configuration
- Standardized output format
