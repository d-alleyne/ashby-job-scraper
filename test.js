// Quick test script
const testConfig = {
    urls: [
        {
            url: "https://jobs.ashbyhq.com/ashby",
            maxJobs: 3
        }
    ]
};

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

    const data = await response.json();
    return data.data.jobBoard;
}

async function test() {
    console.log('Testing Ashby scraper...');
    const jobBoard = await fetchJobBoard('ashby');
    console.log(`Found ${jobBoard.jobPostings.length} jobs`);
    console.log(`Found ${jobBoard.teams.length} teams`);
    console.log('\nFirst 3 jobs:');
    jobBoard.jobPostings.slice(0, 3).forEach(job => {
        console.log(`- ${job.title} (${job.locationName})`);
    });
}

test().catch(console.error);
