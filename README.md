# Ashby Job Scraper

Fast, reliable scraper for Ashby job boards. Extract job listings with optional team/department filtering, date ranges, and result limits.

## Features

- ✅ **API-based** - Fast and reliable (no browser required)
- 🎯 **Team filtering** - Filter jobs by specific teams/departments
- 📅 **Date filtering** - Only fetch recent jobs (e.g., last 7 days)
- 🔢 **Result limits** - Control how many jobs to fetch per board
- 🏢 **Multi-company** - Scrape multiple Ashby job boards in one run
- 💰 **Pay-per-result** - Only pay for the jobs you extract

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
      "maxJobs": 10,
      "daysBack": 7
    },
    {
      "url": "https://jobs.ashbyhq.com/revenuecat",
      "maxJobs": 20,
      "daysBack": 14
    }
  ]
}
```

### Finding Team IDs

Team IDs are the department/team filters on Ashby job boards:

1. Visit the company's job board (e.g., `https://jobs.ashbyhq.com/ashby`)
2. Open browser DevTools → Network tab
3. Refresh the page
4. Look for the `ApiJobBoardWithTeams` GraphQL request
5. In the response, find the `teams` array with IDs and names

**Example teams for Ashby:**
- Engineering: `2c32d70f-d7cb-4a06-bd87-048084e3eb10`
- Design: `44367da2-a8d8-4fe3-a46f-04ddca4b37a4`
- Customer Success: `a23149a4-6817-4900-942c-6545eab16818`

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

- **`teams`** (optional) - Array of team IDs to filter by. Only jobs from these teams will be included.
- **`maxJobs`** (optional) - Maximum number of jobs to fetch for this board (applied before fetching details).
- **`daysBack`** (optional) - Only include jobs published within the last N days.

## Output Format

Each job posting includes:

```json
{
  "id": "1c2921b8-f532-434b-bd41-d28a2a820f8a",
  "company": "ashby",
  "title": "Senior Software Engineer",
  "location": "Remote - North America",
  "locations": ["Remote - North America"],
  "isRemote": true,
  "employmentType": "FullTime",
  "teams": ["Engineering"],
  "compensation": "$160K – $200K • Offers Equity",
  "description": "<p>Full job description HTML...</p>",
  "postingUrl": "https://jobs.ashbyhq.com/ashby/1c2921b8-f532-434b-bd41-d28a2a820f8a",
  "publishedAt": "2025-11-15"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique Ashby job posting ID |
| `company` | string | Company identifier (from URL) |
| `title` | string | Job title |
| `location` | string | Primary location |
| `locations` | array | All locations (primary + secondary) |
| `isRemote` | boolean | Whether the job is remote |
| `employmentType` | string | Employment type (e.g., "FullTime", "PartTime") |
| `teams` | array | Team/department names |
| `compensation` | string | Compensation range (if provided) |
| `description` | string | Full job description (HTML) |
| `postingUrl` | string | Direct link to the job posting |
| `publishedAt` | string | Publication date (YYYY-MM-DD format) |

## Use Cases

### 1. Job Aggregation
Scrape jobs from multiple companies to build a job board:

```json
{
  "urls": [
    { "url": "https://jobs.ashbyhq.com/buffer", "daysBack": 7 },
    { "url": "https://jobs.ashbyhq.com/zapier", "daysBack": 7 },
    { "url": "https://jobs.ashbyhq.com/revenuecat", "daysBack": 7 }
  ]
}
```

### 2. Engineering Jobs Only
Filter for specific teams across multiple companies:

```json
{
  "urls": [
    {
      "url": "https://jobs.ashbyhq.com/ashby",
      "teams": [
        "2c32d70f-d7cb-4a06-bd87-048084e3eb10",
        "d22def71-84b4-4837-b73f-854a46fdb3fc"
      ]
    }
  ]
}
```

### 3. Recent Jobs with Limits
Fetch the latest 10 jobs from each company:

```json
{
  "urls": [
    { "url": "https://jobs.ashbyhq.com/buffer", "maxJobs": 10, "daysBack": 30 },
    { "url": "https://jobs.ashbyhq.com/kit", "maxJobs": 10, "daysBack": 30 }
  ]
}
```

## Performance

- **No browser required** - Uses Ashby's GraphQL API directly
- **Fast** - Typically processes 50-100 jobs/minute
- **Cost-effective** - API-based = lower compute costs

## Technical Details

- Uses Ashby's public GraphQL API
- Two-step process:
  1. Fetch all job listings + teams
  2. Fetch detailed job data for filtered results
- Rate-limited to avoid overwhelming the API (100ms delay between detail requests)

## Pricing

Pay-per-result pricing at **$2.00 per 1,000 results**.

Example costs:
- 50 jobs = $0.10
- 500 jobs = $1.00
- 5,000 jobs = $10.00

## Limitations

- Ashby's API is public but may have undocumented rate limits
- Team IDs must be found manually (no public team directory)
- Published dates may not be available for all jobs

## Support

- **Issues**: [GitHub Issues](https://github.com/d-alleyne/ashby-job-scraper/issues)
- **Contact**: dalleyne on Apify

## License

Apache-2.0
