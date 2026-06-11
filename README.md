# Ashby Job Scraper & API

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/dalleyne/ashby-job-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Scrape Ashby ATS job boards via API and get clean, structured job data with **team filtering applied before anything is stored**. Pull live roles from Buffer, Zapier, RevenueCat, Kit, and the fast-growing startups that run on Ashby. No browser, no HTML parsing, 100% open source. Built for job boards, AI agents, and hiring research.

It also extracts **applicant location requirements** (country-level eligibility) from each posting's structured data, information that is not available through Ashby's GraphQL API at all.

## What can Ashby Job Scraper & API do?

- ✅ **API-based** - Fast and reliable, no browser required
- 🎯 **Team filtering** - Filter jobs by specific teams/departments before storing, so you only pay for jobs you keep
- 🌍 **Location requirements** - Country-level applicant eligibility extracted from each posting's JSON-LD
- 💵 **Compensation summary** - Ashby's posted compensation tier summary where available
- 📅 **Date filtering** - Only fetch recent jobs (e.g., last 7 days) for scheduled runs
- 🔢 **Result limits** - Control how many jobs to fetch per board
- 🏢 **Multi-company** - Scrape multiple Ashby job boards in one run
- ✅ **95%+ run success rate** - The live stat is visible right on this page
- ✅ **100% open source (MIT)** - Audit the code on [GitHub](https://github.com/d-alleyne/ashby-job-scraper)

## Why filtering before storing saves you money

Most scrapers fetch every job on a board and leave the filtering to you. With pay-per-result pricing, you pay for Sales, Operations, and Support listings you never wanted.

This actor filters by team and date **before** results reach your dataset. If a startup lists 80 jobs and you only want Engineering, you store 12 and pay for 12. Cheaper-per-row scrapers that store all 80 cost more per job you actually use, and you still have to clean the data afterwards.

## Pricing

**$2.00 per 1,000 results**, pay per event. You are only charged for jobs that survive your filters.

- 50 jobs = $0.10
- 500 jobs = $1.00
- 5,000 jobs = $10.00

## How to Use

### Basic Usage

Add Ashby job board URLs to scrape:

```json
{
  "urls": [
    { "url": "https://jobs.ashbyhq.com/buffer" },
    { "url": "https://jobs.ashbyhq.com/ashby" },
    { "url": "https://jobs.ashbyhq.com/zapier" }
  ]
}
```

### Per-URL Configuration

Each URL can have its own filters:

```json
{
  "urls": [
    {
      "url": "https://jobs.ashbyhq.com/buffer",
      "teams": [
        "2c32d70f-d7cb-4a06-bd87-048084e3eb10",
        "44367da2-a8d8-4fe3-a46f-04ddca4b37a4"
      ],
      "maxJobs": 50,
      "daysBack": 14
    },
    {
      "url": "https://jobs.ashbyhq.com/revenuecat",
      "teams": ["8dcde971-b533-404f-8e67-e94e5f89b590"],
      "maxJobs": 50,
      "daysBack": 7
    }
  ]
}
```

**💡 Tip:** With pay-per-result pricing, you only pay for jobs that make it to the final dataset. Use `daysBack` to filter out old jobs and keep your data fresh.

### Finding Team IDs

Team IDs are the department/team filters on Ashby job boards:

1. Visit the company's job board (e.g., `https://jobs.ashbyhq.com/ashby`)
2. Open browser DevTools → Network tab
3. Refresh the page
4. Look for the `ApiJobBoardWithTeams` GraphQL request
5. In the response, find the `teams` array with IDs and names

**Example teams for Ashby (your results will vary by company):**
- Engineering: `2c32d70f-d7cb-4a06-bd87-048084e3eb10`
- Design: `44367da2-a8d8-4fe3-a46f-04ddca4b37a4`
- Customer Success: `a23149a4-6817-4900-942c-6545eab16818`
- Marketing: `b67880f0-4e2f-4352-8f74-9e49582a0dbf`
- Sales: `bb71410b-bb42-46c8-beb7-1f0f91547f3e`

## Input Parameters

### `urls` (required)

Array of Ashby job board URLs or configuration objects.

**Simple format:**
```json
["https://jobs.ashbyhq.com/company"]
```

**Extended format with filters:**
```json
[
  {
    "url": "https://jobs.ashbyhq.com/company",
    "teams": ["team-id-1", "team-id-2"],
    "maxJobs": 50,
    "daysBack": 7
  }
]
```

#### Per-URL Options

- **`teams`** (optional) - Array of team IDs to filter by. Only jobs from these teams will be included. **Recommended** for cost efficiency.
- **`maxJobs`** (optional) - Maximum number of jobs to fetch for this board (applied before fetching details).
- **`daysBack`** (optional) - Only include jobs published within the last N days. Useful for incremental scraping (e.g., bi-weekly runs).

## Output Format

Each job posting includes:

```json
{
  "id": "1c2921b8-f532-434b-bd41-d28a2a820f8a",
  "type": "Full-time",
  "title": "Senior Software Engineer",
  "description": "<p>Full job description HTML...</p>",
  "locations": ["Remote - North America"],
  "locationRequirements": ["United States", "Canada"],
  "department": "Engineering",
  "companyName": "ashby",
  "postingUrl": "https://jobs.ashbyhq.com/ashby/1c2921b8-f532-434b-bd41-d28a2a820f8a",
  "applyUrl": "https://jobs.ashbyhq.com/ashby/1c2921b8-f532-434b-bd41-d28a2a820f8a/application",
  "publishedAt": "2025-11-15",
  "compensationSummary": "$140K – $180K • Offers Equity"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique Ashby job posting ID |
| `type` | string | Employment type (e.g., "Full-time", "Part-time", "Contract") |
| `title` | string | Job title |
| `description` | string | Full job description (HTML) |
| `locations` | array | All locations (primary + secondary) |
| `locationRequirements` | array\|null | Country-level applicant eligibility from the posting's JSON-LD (e.g., `["United States", "Canada"]`), null if unrestricted or not published |
| `department` | string | Primary team/department name |
| `companyName` | string | Company identifier (from URL) |
| `postingUrl` | string | Direct link to the job posting |
| `applyUrl` | string | Direct link to the application page |
| `publishedAt` | string | Publication date (YYYY-MM-DD format, may be null) |
| `compensationSummary` | string\|null | Ashby's compensation tier summary where the company publishes one |

### Why `locationRequirements` matters

"Remote" on a job board rarely means remote from anywhere. Ashby embeds the real country-level restrictions in each posting page's schema.org JSON-LD, and this actor fetches and parses that for every job. If you run a job board or match candidates to roles, this field answers the eligibility question that `locations` alone can't.

## Use Cases

### 1. Incremental Scraping (Recommended)
Scrape recent jobs for regular updates (e.g., bi-weekly runs):

```json
{
  "urls": [
    {
      "url": "https://jobs.ashbyhq.com/buffer",
      "maxJobs": 100,
      "daysBack": 14
    },
    {
      "url": "https://jobs.ashbyhq.com/zapier",
      "maxJobs": 100,
      "daysBack": 14
    },
    {
      "url": "https://jobs.ashbyhq.com/revenuecat",
      "maxJobs": 100,
      "daysBack": 14
    }
  ]
}
```

### 2. Team/Department Filtering
Filter for specific teams to reduce costs and get only relevant jobs:

```json
{
  "urls": [
    {
      "url": "https://jobs.ashbyhq.com/ashby",
      "teams": [
        "2c32d70f-d7cb-4a06-bd87-048084e3eb10",
        "44367da2-a8d8-4fe3-a46f-04ddca4b37a4"
      ],
      "maxJobs": 100,
      "daysBack": 7
    }
  ]
}
```

### 3. One-Time Full Scrape
Get all available jobs from a company (no date filter):

```json
{
  "urls": [
    { "url": "https://jobs.ashbyhq.com/buffer", "maxJobs": 200 },
    { "url": "https://jobs.ashbyhq.com/kit", "maxJobs": 100 }
  ]
}
```

## Use it with AI agents

This actor works as a tool for AI agents through the [Apify MCP server](https://mcp.apify.com). Connect your agent (Claude, or any MCP-compatible framework) to the Apify MCP server and it can discover and call `dalleyne/ashby-job-scraper` with the same JSON input shown above. The single-array input schema keeps agent tool calls reliable.

Typical agent patterns:
- Career chatbots that answer "which Ashby startups are hiring engineers eligible from my country?"
- Talent-market research that tracks startup hiring by team
- Job board pipelines that refresh listings on a schedule without scraping infrastructure

## Is it legal to scrape Ashby job listings?

This actor reads public job postings through Ashby's public job board API and each posting's public structured data, the same information anyone can see in a browser without logging in. It collects no personal data. You are responsible for how you use the data; if in doubt, review Ashby's terms and the rules that apply to your use case.

## Performance and Technical Details

- **No browser required** - Uses Ashby's public GraphQL API directly
- **Fast** - Typically processes 50-100 jobs/minute
- Two-step process:
  1. Fetch all job listings + teams for each board
  2. Fetch detailed job data only for jobs that pass your filters
- Location requirements come from a lightweight fetch of each posting's JSON-LD
- Rate-limited to avoid overwhelming the API (100ms delay between detail requests)

## FAQ

### How much does a typical run cost?

A scheduled run pulling new engineering jobs from 5 startups typically stores 10 to 40 jobs, which costs $0.02 to $0.08. Because filtering happens before storage, board size doesn't drive your bill.

### How do I keep a job board updated automatically?

Create a Schedule in Apify Console pointing at this actor and set `daysBack` to match your cadence (7 for weekly, 14 for bi-weekly). Each run only fetches and charges for recent jobs.

### What is `locationRequirements` and why is it sometimes null?

It's the country-level eligibility list a company publishes in the posting's structured data. Null means the company didn't publish restrictions (or the posting is genuinely unrestricted). See [Why locationRequirements matters](#why-locationrequirements-matters).

### How do I find a company's team IDs?

Through the board's GraphQL response in DevTools. The [step-by-step guide](#finding-team-ids) above has details.

### Can AI agents run this actor?

Yes. It's callable through the Apify MCP server like any store actor. See [Use it with AI agents](#use-it-with-ai-agents).

### Is this actor maintained?

Yes. It powers [GlobalRemote](https://jobs.alleyne.dev), the author's own job board, twice a week. If the scraper breaks, his site breaks, so it gets fixed fast. Report anything via the Issues tab or [GitHub Issues](https://github.com/d-alleyne/ashby-job-scraper/issues).

## Limitations

- Ashby's API is public but may have undocumented rate limits
- Team IDs must be found manually (no public team directory)
- Published dates may not be available for all jobs
- `locationRequirements` depends on the company publishing structured data on the posting page

## Changelog

See [CHANGELOG.md](https://github.com/d-alleyne/ashby-job-scraper/blob/main/CHANGELOG.md). Latest: applicant location requirements extraction and documentation overhaul (June 2026).

## Related Scrapers

Looking for other ATS platforms?

- **[Greenhouse Job Scraper & API](https://apify.com/dalleyne/greenhouse-job-scraper)** - Scrape Greenhouse job boards (Automattic, GitLab, Speechify, etc.) with department filtering

## Found this useful?

If this actor saves you money or time, a review on the store page helps other people find it. It takes 30 seconds and makes a real difference for independent developers.

## Support

- **Issues**: [GitHub Issues](https://github.com/d-alleyne/ashby-job-scraper/issues)
- **Contact**: dalleyne on Apify

## License

MIT
