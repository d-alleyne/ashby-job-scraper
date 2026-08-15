# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1] - 2026-08-15

### Fixed
- Team filters now match postings on nested sub-teams. Postings hang off the child team, so filtering by a parent team (e.g. "Engineering" above "Americas Engineering" and "EMEA Engineering") matched nothing and the run succeeded with zero jobs. `parentTeamId` was already fetched but never used; it is now walked downwards so a parent selects its whole subtree.

## [1.3.0] - 2026-06-16

### Fixed
- `maxJobs` is now applied to stored jobs after the `daysBack` date filter, not as an upfront slice of the board list, so recent jobs beyond the first N are no longer missed when both filters are set.
- Null/missing posting detail is skipped with a warning instead of crashing the job.
- `locations` no longer contains null/empty entries (filtered and de-duplicated).
- Unknown employment types keep their raw value instead of being mislabeled "Full-time".
- JSON-LD parsing also reads a `JobPosting` nested in an `@graph` array, recovering `locationRequirements` (applicant eligibility) on more postings.
- `daysBack` excludes undated postings and accepts a stringified value (e.g. `"14"`).

### Changed
- `publishedAt` normalized to ISO 8601 (UTC).
- All HTTP requests have a 30-second timeout.
- The run fails if every board errors and nothing is stored (a legitimately empty filtered result still succeeds).

## [1.2.0] - 2026-06-11

### Added
- `locationRequirements` output field: country-level applicant eligibility extracted from each posting's schema.org JSON-LD (not available via Ashby's GraphQL API)
- `compensationSummary` output field: Ashby's compensation tier summary where published

### Fixed
- Removed unsupported `compensationTiers` selection from the GraphQL query

### Changed
- Documentation overhaul: pricing guide, FAQ, AI agent (MCP) usage section, legality note, corrected license reference (MIT)
- Store listing refresh: new title (Ashby Job Scraper & API), description, SEO metadata, and Automation category

## [1.1.3] - 2026-02-01

### Fixed
- Normalize employment type from Ashby format ("FullTime") to standard format ("Full-time") to match expected output schema

## [1.1.2] - 2026-02-01

### Added
- OUTPUT_SCHEMA.json defining the output format for dataset results
- Schema documentation for all output fields with examples

## [1.1.1] - 2026-02-01

### Changed
- README now recommends `daysBack` for incremental scraping (pay-per-result pricing means filtered jobs don't count)
- Updated all examples to include `daysBack` parameter
- Reordered use cases to emphasize incremental scraping as the primary pattern

### Fixed
- Clarified that pay-per-result pricing only charges for final dataset results, not intermediate API calls
- Removed misleading warnings about `daysBack` inefficiency

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
