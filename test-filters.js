// Test filtering functionality
import { Actor } from 'apify';

// Mock Actor.getInput and Actor.pushData for local testing
const testInput = {
    urls: [
        {
            url: "https://jobs.ashbyhq.com/ashby",
            teams: ["2c32d70f-d7cb-4a06-bd87-048084e3eb10"], // Engineering only
            maxJobs: 3,
            daysBack: 90
        }
    ]
};

const results = [];

// Mock Apify SDK
global.Actor = {
    main: async (fn) => fn(),
    getInput: async () => testInput,
    pushData: async (data) => {
        results.push(...data);
        console.log(`\n✅ Pushed ${data.length} jobs to dataset`);
    }
};

// Import and run the main script
await import('./src/main.js');

// Check results
console.log(`\n📊 Test Results:`);
console.log(`Total jobs extracted: ${results.length}`);
console.log(`\n🔍 Sample job:`);
console.log(JSON.stringify(results[0], null, 2));

// Check format compatibility with global-dev-flow
console.log(`\n🔬 Format Check:`);
const job = results[0];
const requiredFields = ['title', 'company', 'postingUrl', 'locations', 'description'];
const missingFields = requiredFields.filter(f => !job[f]);
const extraNeeded = [];

if (!job.companyName) extraNeeded.push('companyName (needs company → companyName)');
if (!job.applyUrl) extraNeeded.push('applyUrl');
if (job.employmentType && !job.type) extraNeeded.push('type (has employmentType)');

if (missingFields.length === 0 && extraNeeded.length === 0) {
    console.log('✅ All required fields present and compatible!');
} else {
    if (missingFields.length) console.log(`❌ Missing: ${missingFields.join(', ')}`);
    if (extraNeeded.length) console.log(`⚠️  Needs adjustment: ${extraNeeded.join(', ')}`);
}
