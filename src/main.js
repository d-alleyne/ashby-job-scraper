import { Actor } from 'apify';

const GQL = 'https://jobs.ashbyhq.com/api/non-user-graphql';
const FETCH_TIMEOUT_MS = 30_000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch() with retry on transient failures: rate limits (429), server errors (5xx),
 * and network/timeout errors. Other 4xx are permanent (404 = the board no longer
 * exists), so they come straight back rather than burning retries on a lost cause.
 *
 * Returns the Response whenever one was obtained — including a non-OK one, so the
 * caller keeps its own `!res.ok` handling. Only a network/timeout error with every
 * attempt exhausted throws.
 *
 * @param {string} url
 * @param {RequestInit} [init] fetch options; `signal` is always set by this helper
 * @param {number} [attempts]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, init = {}, attempts = RETRY_ATTEMPTS) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        if (i > 0) await sleep(RETRY_BASE_MS * 2 ** (i - 1));
        try {
            const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
            const transient = response.status === 429 || response.status >= 500;
            if (!transient || i === attempts - 1) return response;
            lastError = new Error(`Request failed: ${response.status} ${response.statusText}`);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

/** Extract company identifier from an Ashby job board URL. */
function extractCompanyName(url) {
    const match = (url || '').match(/jobs\.ashbyhq\.com\/([^\/?]+)/);
    return match ? match[1] : null;
}

/** Normalize a date to ISO 8601, or null if missing/invalid (never throws). */
function toIso(s) {
    if (!s) return null;
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function gql(op, query, variables) {
    const response = await fetchWithRetry(`${GQL}?op=${op}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: op, variables, query }),
    });
    if (!response.ok) throw new Error(`${op} request failed: ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    return data.data;
}

/** Fetch all job postings + teams for a company. Throws if the board can't be read. */
async function fetchJobBoard(companyName) {
    const query = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
        jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
            teams { id name parentTeamId }
            jobPostings { id title teamId locationId locationName employmentType secondaryLocations { locationId locationName } compensationTierSummary }
        }
    }`;
    const data = await gql('ApiJobBoardWithTeams', query, { organizationHostedJobsPageName: companyName });
    if (!data?.jobBoard) throw new Error(`No jobBoard in response for ${companyName}`);
    return data.jobBoard;
}

/** Fetch a single posting's detail. Returns null if the posting is missing. */
async function fetchJobDetails(companyName, jobId) {
    const query = `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
        jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
            id title teamNames locationName employmentType descriptionHtml publishedDate
        }
    }`;
    const data = await gql('ApiJobPosting', query, { organizationHostedJobsPageName: companyName, jobPostingId: jobId });
    return data?.jobPosting ?? null;
}

function shouldIncludeJob(teamId, teamFilters) {
    if (!teamFilters || teamFilters.length === 0) return true;
    return teamFilters.includes(teamId);
}

/** Normalize Ashby employment type; keep the raw value (or null) when unknown. */
function normalizeEmploymentType(employmentType) {
    const typeMap = { FullTime: 'Full-time', PartTime: 'Part-time', Contract: 'Contract', Internship: 'Internship', Temporary: 'Temporary' };
    return typeMap[employmentType] || employmentType || null;
}

/** Pull country-level applicant eligibility from a single JSON-LD JobPosting node. */
function countriesFromNode(node) {
    if (!node || node['@type'] !== 'JobPosting' || !node.applicantLocationRequirements) return null;
    const reqs = Array.isArray(node.applicantLocationRequirements)
        ? node.applicantLocationRequirements
        : [node.applicantLocationRequirements];
    const countries = reqs.filter((r) => r['@type'] === 'Country' && r.name).map((r) => r.name);
    return countries.length > 0 ? countries : null;
}

/**
 * Applicant location requirements from the rendered page's JSON-LD. Handles both a
 * top-level JobPosting and one nested inside an `@graph` array (a common layout).
 */
async function fetchLocationRequirements(companyName, jobId) {
    try {
        const response = await fetchWithRetry(`https://jobs.ashbyhq.com/${companyName}/${jobId}`, {
            headers: { Accept: 'text/html' },
        });
        if (!response.ok) return null;
        const html = await response.text();
        const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = re.exec(html)) !== null) {
            try {
                const data = JSON.parse(match[1]);
                const nodes = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
                for (const node of nodes) {
                    const c = countriesFromNode(node);
                    if (c) return c;
                }
            } catch { /* skip malformed JSON-LD block */ }
        }
    } catch { /* page fetch failed, non-critical */ }
    return null;
}

function formatJobOutput(briefJob, detailJob, companyName, locationRequirements) {
    const postingUrl = `https://jobs.ashbyhq.com/${companyName}/${briefJob.id}`;
    const locations = [...new Set(
        [briefJob.locationName, ...(briefJob.secondaryLocations || []).map((l) => l.locationName)].filter(Boolean),
    )];
    return {
        id: briefJob.id,
        type: normalizeEmploymentType(briefJob.employmentType),
        title: briefJob.title,
        description: detailJob.descriptionHtml || '',
        locations,
        locationRequirements: locationRequirements || null,
        department: detailJob.teamNames?.[0] || null,
        companyName,
        postingUrl,
        applyUrl: `${postingUrl}/application`,
        publishedAt: toIso(detailJob.publishedDate),
        compensationSummary: briefJob.compensationTierSummary || null,
    };
}

/** True if the posting is within daysBack. Undated postings are excluded when filtering. */
function isWithinDateRange(publishedDate, daysBack) {
    if (daysBack === null || daysBack === undefined) return true;
    const days = parseInt(daysBack, 10); // coerce stringified "14"
    if (!Number.isInteger(days) || days <= 0) return true;
    const t = publishedDate ? Date.parse(publishedDate) : NaN;
    if (Number.isNaN(t)) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return t >= cutoff.getTime();
}

await Actor.main(async () => {
    const input = await Actor.getInput() || {};
    const urls = input.urls || input.requestListSources || [];
    if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('No URLs provided. Add Ashby job board URLs to the "urls" field.');
    }

    const results = [];
    let boardErrors = 0;

    for (const urlConfig of urls) {
        const url = typeof urlConfig === 'string' ? urlConfig : urlConfig.url;
        const teamFilters = (urlConfig && (urlConfig.teams || urlConfig.departments)) || [];
        const maxJobs = (urlConfig && urlConfig.maxJobs) || null;
        const daysBack = (urlConfig && urlConfig.daysBack) || null;

        const companyName = extractCompanyName(url);
        if (!companyName) {
            console.log(`⚠️  Invalid Ashby URL: ${url} (expected https://jobs.ashbyhq.com/company-name)`);
            boardErrors++;
            continue;
        }

        console.log(`\n📋 Scraping: ${companyName}`);
        if (teamFilters.length > 0) console.log(`   🎯 Team filters: ${teamFilters.length} team(s)`);
        if (daysBack) console.log(`   📅 Date filter: last ${daysBack} days`);

        try {
            const jobBoard = await fetchJobBoard(companyName);
            let postings = jobBoard.jobPostings || [];
            if (teamFilters.length > 0) postings = postings.filter((j) => shouldIncludeJob(j.teamId, teamFilters));

            // Walk the team-filtered list; apply daysBack first, then cap STORED jobs at maxJobs.
            // (maxJobs must not slice before the date filter, or recent jobs past N are missed.)
            let boardCount = 0;
            for (const briefJob of postings) {
                if (maxJobs && boardCount >= maxJobs) break;
                try {
                    const detailJob = await fetchJobDetails(companyName, briefJob.id);
                    if (!detailJob) {
                        console.log(`   ⚠️  No detail returned for job ${briefJob.id}; skipping`);
                        continue;
                    }
                    if (!isWithinDateRange(detailJob.publishedDate, daysBack)) continue;

                    const locationRequirements = await fetchLocationRequirements(companyName, briefJob.id);
                    results.push(formatJobOutput(briefJob, detailJob, companyName, locationRequirements));
                    boardCount++;
                } catch (error) {
                    console.log(`   ⚠️  Error on job ${briefJob.id}: ${error.message}`);
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            console.log(`   ✅ Stored ${boardCount} job(s) after filtering`);
        } catch (error) {
            boardErrors++;
            console.log(`   ❌ Error scraping ${companyName}: ${error.message}`);
        }
    }

    if (results.length) await Actor.pushData(results);

    // Surface total failure: if every board errored and nothing was stored, fail the run.
    if (boardErrors > 0 && results.length === 0) {
        throw new Error(`All ${boardErrors} board(s) failed and no jobs were stored.`);
    }
    console.log(`\n✅ Scraping complete! Stored ${results.length} job(s) from ${urls.length} board(s).`);
});
