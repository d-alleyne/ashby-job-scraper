import { Actor } from 'apify';

/**
 * Extract company name from Ashby job board URL
 * @param {string} url - Full Ashby URL (e.g., https://jobs.ashbyhq.com/ashby)
 * @returns {string|null} Company identifier or null if invalid
 */
function extractCompanyName(url) {
    const match = url.match(/jobs\.ashbyhq\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
}

/**
 * Fetch all job postings and teams for a company via GraphQL
 * @param {string} companyName - Company identifier (e.g., "ashby")
 * @returns {Promise<{jobPostings: Array, teams: Array}>}
 */
async function fetchJobBoard(companyName) {
    const query = `
        query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
            jobBoard: jobBoardWithTeams(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
            ) {
                teams {
                    id
                    name
                    parentTeamId
                }
                jobPostings {
                    id
                    title
                    teamId
                    locationId
                    locationName
                    employmentType
                    secondaryLocations {
                        locationId
                        locationName
                    }
                    compensationTierSummary
                }
            }
        }
    `;

    const response = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            operationName: 'ApiJobBoardWithTeams',
            variables: { organizationHostedJobsPageName: companyName },
            query,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch job board for ${companyName}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.jobBoard;
}

/**
 * Fetch detailed job posting data via GraphQL
 * @param {string} companyName - Company identifier
 * @param {string} jobId - Job posting ID
 * @returns {Promise<Object>}
 */
async function fetchJobDetails(companyName, jobId) {
    const query = `
        query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
            jobPosting(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
                jobPostingId: $jobPostingId
            ) {
                id
                title
                teamNames
                locationName
                employmentType
                descriptionHtml
                publishedDate
            }
        }
    `;

    const response = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            operationName: 'ApiJobPosting',
            variables: {
                organizationHostedJobsPageName: companyName,
                jobPostingId: jobId,
            },
            query,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch job details for ${jobId}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.jobPosting;
}

/**
 * Check if a job should be included based on team/department filters
 * @param {string} teamId - Job's team ID
 * @param {Array<string>} teamFilters - Array of team IDs to filter by
 * @returns {boolean}
 */
function shouldIncludeJob(teamId, teamFilters) {
    if (!teamFilters || teamFilters.length === 0) {
        return true; // No filters = include all
    }
    return teamFilters.includes(teamId);
}

/**
 * Check if job location indicates remote work
 * @param {string} locationName - Primary location name
 * @param {Array} secondaryLocations - Array of secondary location objects
 * @returns {boolean}
 */
function isRemoteJob(locationName, secondaryLocations = []) {
    const allLocations = [locationName, ...secondaryLocations.map(loc => loc.locationName)];
    return allLocations.some(loc => 
        loc && loc.toLowerCase().includes('remote')
    );
}

/**
 * Normalize employment type from Ashby format to standard format
 * @param {string} employmentType - Employment type from Ashby (e.g., "FullTime", "PartTime")
 * @returns {string} Normalized employment type (e.g., "Full-time", "Part-time")
 */
function normalizeEmploymentType(employmentType) {
    const typeMap = {
        'FullTime': 'Full-time',
        'PartTime': 'Part-time',
        'Contract': 'Contract',
        'Internship': 'Internship',
        'Temporary': 'Temporary',
    };
    return typeMap[employmentType] || 'Full-time';
}

/**
 * Process job posting and return standardized output
 * @param {Object} briefJob - Job brief from initial API call
 * @param {Object} detailJob - Detailed job data from second API call
 * @param {string} companyName - Company identifier
 * @returns {Object} Standardized job object
 */
function formatJobOutput(briefJob, detailJob, companyName) {
    const postingUrl = `https://jobs.ashbyhq.com/${companyName}/${briefJob.id}`;
    const applyUrl = `${postingUrl}/application`;
    
    // Collect all locations
    const locations = [briefJob.locationName];
    if (briefJob.secondaryLocations) {
        briefJob.secondaryLocations.forEach(loc => {
            if (loc.locationName && !locations.includes(loc.locationName)) {
                locations.push(loc.locationName);
            }
        });
    }

    return {
        id: briefJob.id,
        type: normalizeEmploymentType(briefJob.employmentType),
        title: briefJob.title,
        description: detailJob.descriptionHtml || '',
        locations,
        department: detailJob.teamNames?.[0] || 'Unknown', // Primary team as department
        companyName: companyName,
        postingUrl,
        applyUrl,
        publishedAt: detailJob.publishedDate || null,
        compensationSummary: briefJob.compensationTierSummary || null,
    };
}

/**
 * Filter jobs by publish date
 * @param {Object} job - Job object with publishedAt field
 * @param {number} daysBack - Number of days to look back
 * @returns {boolean}
 */
function isWithinDateRange(job, daysBack) {
    if (!daysBack || !job.publishedAt) {
        return true; // No filter or no date = include
    }

    const publishDate = new Date(job.publishedAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    return publishDate >= cutoffDate;
}

await Actor.main(async () => {
    const input = await Actor.getInput() || {};
    
    // Support both formats: array of strings OR array of objects
    const urls = input.urls || input.requestListSources || [];
    
    if (!urls || urls.length === 0) {
        throw new Error('No URLs provided. Add Ashby job board URLs to the "urls" field.');
    }

    let totalProcessed = 0;
    const results = [];

    for (const urlConfig of urls) {
        // Handle both string URLs and object configs
        const url = typeof urlConfig === 'string' ? urlConfig : urlConfig.url;
        const teamFilters = urlConfig.teams || urlConfig.departments || []; // Support "departments" alias
        const maxJobs = urlConfig.maxJobs || null;
        const daysBack = urlConfig.daysBack || null;

        const companyName = extractCompanyName(url);
        
        if (!companyName) {
            console.log(`⚠️  Invalid Ashby URL: ${url} (expected format: https://jobs.ashbyhq.com/company-name)`);
            continue;
        }

        console.log(`\n📋 Scraping: ${companyName}`);
        if (teamFilters.length > 0) {
            console.log(`   🎯 Team filters: ${teamFilters.length} team(s)`);
        }
        if (daysBack) {
            console.log(`   📅 Date filter: last ${daysBack} days`);
        }

        try {
            // Fetch all jobs + teams
            const jobBoard = await fetchJobBoard(companyName);
            
            if (!jobBoard || !jobBoard.jobPostings) {
                console.log(`   ⚠️  No jobs found (company may have no active postings)`);
                continue;
            }
            
            let filteredJobs = jobBoard.jobPostings;

            // Apply team filter
            if (teamFilters.length > 0) {
                filteredJobs = filteredJobs.filter(job => shouldIncludeJob(job.teamId, teamFilters));
            }

            // Apply maxJobs limit
            if (maxJobs && filteredJobs.length > maxJobs) {
                filteredJobs = filteredJobs.slice(0, maxJobs);
            }

            console.log(`   ✅ Found ${filteredJobs.length} job(s) after filtering`);

            // Fetch details for each job
            for (const briefJob of filteredJobs) {
                try {
                    const detailJob = await fetchJobDetails(companyName, briefJob.id);
                    const formattedJob = formatJobOutput(briefJob, detailJob, companyName);

                    // Apply date filter
                    if (!isWithinDateRange(formattedJob, daysBack)) {
                        continue;
                    }

                    results.push(formattedJob);
                    totalProcessed++;
                } catch (error) {
                    console.log(`   ⚠️  Error fetching details for job ${briefJob.id}: ${error.message}`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (error) {
            console.log(`   ❌ Error scraping ${companyName}: ${error.message}`);
        }
    }

    console.log(`\n✅ Scraping complete! Processed ${totalProcessed} job(s) from ${urls.length} board(s).`);

    // Push all results to dataset
    await Actor.pushData(results);
});
