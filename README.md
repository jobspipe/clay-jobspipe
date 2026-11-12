# JobsPipe × Clay Integration Kit

> Add live hiring data to your Clay tables in minutes.

This repository contains everything GTM teams and Clay power users need to enrich tables with [JobsPipe](https://jobspipe.dev)'s job posting and company hiring data.

## What is JobsPipe?

JobsPipe is a jobs-data API that returns live job postings from 30+ sources (LinkedIn, Indeed, company career pages, etc.) through one normalized endpoint. It provides:

- **Job Search:** Find open roles by company, title, location, salary, skills, and more
- **Hiring Signals:** Track which companies are actively hiring and how their hiring velocity is changing
- **Tech Stack Detection:** Scan company websites to detect the technologies they use
- **Company Enrichment:** Get headcount, location, LinkedIn, and business details

**Perfect for:**
- Outbound sales teams targeting companies hiring specific roles
- Recruiters building candidate lists for active job openings
- Market researchers tracking hiring trends by industry or technology

## What's Included

- **6 Clay HTTP API Configs** — Drop-in JSON configs for the most useful JobsPipe endpoints
- **CSV Template** — Starter table for "companies hiring SDRs/engineers" use case
- **Column Guide** — Step-by-step setup and output column mappings
- **Validation Script** — Ensures configs stay valid against the JobsPipe OpenAPI spec

## Quick Start

### 1. Get a JobsPipe API Key

1. Sign up at [jobspipe.dev](https://jobspipe.dev)
2. Go to your [Dashboard](https://jobspipe.dev/dashboard)
3. Create an API key
4. Copy the key (starts with `jp_live_...`)

**Pricing:**
- **Free:** 1,000 credits (test with ~1,000 job results)
- **Seeker:** $19.60/mo for 10,000 credits
- **Builder:** $49/mo for 25,000 credits

One credit = one unique job returned (or one company/scan, depending on endpoint). Jobs already paid for this month are free on subsequent calls.

### 2. Import a Template into Clay

1. Download [`templates/companies-hiring-template.csv`](./templates/companies-hiring-template.csv)
2. In Clay, create a new table and import the CSV
3. You'll see columns: `company_domain`, `company_name`, `target_role`, `country_filter`

### 3. Add Your First Enrichment

Let's check if each company is hiring for your target role:

1. In your Clay table, click **"+ Add Enrichment" → "HTTP API"**
2. Open [`clay-configs/check-hiring-for-role.json`](./clay-configs/check-hiring-for-role.json) and copy its contents
3. In Clay's HTTP API form, switch to "Import JSON" and paste
4. Replace `YOUR_JOBSPIPE_API_KEY` in the Authorization header with your actual key
5. Map inputs:
   - `{{company_domain}}` → Your table's `company_domain` column
   - `{{job_title}}` → Your table's `target_role` column
6. Add output columns:
   - `is_hiring` → `$.metadata.total_results > 0` (boolean)
   - `number_of_openings` → `$.metadata.total_results`
   - `job_titles` → `$.data[*].job_title` (array)
   - `job_urls` → `$.data[*].url` (array)
7. Run the enrichment on 2-3 rows first to test

### 4. Filter & Export

- Add a **Filter** to keep only rows where `is_hiring = true`
- **Export** your enriched list to CSV or push to your CRM

## Available Configs

All configs live in [`clay-configs/`](./clay-configs/).

| Config File | Endpoint | Use Case | Cost |
|------------|----------|----------|------|
| [`find-open-roles-by-company.json`](./clay-configs/find-open-roles-by-company.json) | `POST /v1/jobs/search` | Get all open roles at a company | 1 credit/job |
| [`check-hiring-for-role.json`](./clay-configs/check-hiring-for-role.json) | `POST /v1/jobs/search` | Check if company hiring for specific role | 1 credit/job |
| [`company-hiring-signals.json`](./clay-configs/company-hiring-signals.json) | `POST /v1/jobs/companies/hiring` | Get hiring velocity & open job count | 1 credit/company |
| [`search-companies-hiring-for-role.json`](./clay-configs/search-companies-hiring-for-role.json) | `POST /v1/jobs/companies/hiring` | Find ALL companies hiring for a role | 1 credit/company |
| [`detect-company-tech-stack.json`](./clay-configs/detect-company-tech-stack.json) | `POST /v1/stack/scan` | Scan website for technologies used | 1 credit/scan |
| [`get-company-enrichment.json`](./clay-configs/get-company-enrichment.json) | `GET /v1/companies/{domain}` | Enrich company (headcount, LinkedIn, etc.) | 1 credit/lookup |

## Setup Steps by Config

### Check if Hiring for Role

**When to use:** You have a list of companies and want to know which are actively hiring for a specific role (e.g., "Are these companies hiring SDRs right now?").

**Steps:**
1. Use [`check-hiring-for-role.json`](./clay-configs/check-hiring-for-role.json)
2. Map `{{company_domain}}` to your domain column
3. Map `{{job_title}}` to your target role (or hardcode it in the body)
4. Key outputs: `is_hiring`, `number_of_openings`, `job_urls`

**Example output:**
```json
{
  "is_hiring": true,
  "number_of_openings": 5,
  "job_titles": ["Sales Development Representative", "SDR - East Coast"],
  "job_urls": ["https://...", "https://..."]
}
```

### Get Hiring Signals

**When to use:** You want to gauge a company's overall hiring velocity—not just one role, but total open positions and when they last posted.

**Steps:**
1. Use [`company-hiring-signals.json`](./clay-configs/company-hiring-signals.json)
2. Map `{{company_domain}}` to your domain column
3. Key outputs: `total_open_jobs`, `last_posted`, `employee_count`

**Use case:** Prioritize companies with `total_open_jobs > 10` for high-velocity sales outreach.

### Detect Tech Stack

**When to use:** You want to personalize outreach based on the technologies a company uses (e.g., "We saw you're using Salesforce and Hubspot...").

**Steps:**
1. Use [`detect-company-tech-stack.json`](./clay-configs/detect-company-tech-stack.json)
2. Map `{{company_domain}}` to your domain column
3. Key outputs: `technologies_found`, `technology_categories`

**Example:** Detect if a company uses your competitor's product, then personalize your pitch.

### Search Companies Hiring for Role

**When to use:** You're building a prospecting list from scratch and want to find ALL companies hiring for a specific role (e.g., "Show me every company hiring software engineers in the US").

**Steps:**
1. Use [`search-companies-hiring-for-role.json`](./clay-configs/search-companies-hiring-for-role.json)
2. Hardcode `{{job_title}}` in the body (e.g., `"software engineer"`)
3. Adjust `job_country_code_or` and `limit` as needed
4. Key outputs: `company_names`, `company_domains`, `open_positions_per_company`

**Tip:** Run this once to generate a list, then use other configs to enrich each company.

### Get Company Enrichment

**When to use:** You need basic company details—headcount, location, LinkedIn, description.

**Steps:**
1. Use [`get-company-enrichment.json`](./clay-configs/get-company-enrichment.json)
2. Map `{{company_domain}}` directly in the URL path
3. Key outputs: `company_name`, `employee_count`, `linkedin_url`, `founded_year`

**Note:** This is a GET request. In Clay, replace `{{company_domain}}` in the URL itself with a column reference.

## Example Workflow: Outbound to Companies Hiring SDRs

**Goal:** Build a list of 100 companies hiring SDRs to pitch your sales enablement tool.

1. **Find companies:**
   - Use `search-companies-hiring-for-role.json` with `job_title = "sales development representative"`
   - Get back 100 companies with their domains and open SDR positions

2. **Enrich details:**
   - Use `company-hiring-signals.json` to get total open jobs and employee count
   - Use `detect-company-tech-stack.json` to see if they use Salesforce, Outreach, etc.

3. **Personalize outreach:**
   - Filter to companies with `total_open_jobs > 5` (high-growth signal)
   - Use Claygent to write personalized emails mentioning their tech stack and hiring velocity

4. **Export & send:**
   - Push to Salesforce, HubSpot, or export as CSV for your email tool

**Estimated cost:** ~100 credits for company search + ~100 for enrichment = 200 credits (~$1 on Seeker plan).

## Claygent Prompts

Combine JobsPipe data with Claygent for AI-powered personalization.

### Prompt 1: Personalized Cold Email

```
Write a personalized cold email to {{company_name}}.

Context:
- They're hiring for: {{job_titles}}
- Total open positions: {{total_open_jobs}}
- Tech stack: {{technologies_found}}
- Employee count: {{employee_count}}

Pitch: Our product helps scaling teams hire faster by automating candidate sourcing.

Tone: Professional, concise, value-focused.
```

### Prompt 2: Hiring Velocity Insights

```
Analyze this company's hiring activity:
- Company: {{company_name}}
- Open roles: {{total_open_jobs}}
- Last posted: {{last_posted}}
- Industry: {{industry}}

Question: Is this a good time for outbound sales outreach? 
What angle should we take given their hiring velocity?
```

### Prompt 3: Tech Stack Relevance

```
This company uses: {{technologies_found}}

Our product integrates with: Salesforce, HubSpot, Slack, Greenhouse.

Task: Identify which of their tools we integrate with and write 
a one-sentence value prop for our product based on their stack.
```

## Credit Costs & Optimization

| Action | Cost | Notes |
|--------|------|-------|
| Search jobs | 1 credit/job | Only charged for unique jobs you haven't seen this month |
| Company lookup | 1 credit/company | Free if already paid this month |
| Tech stack scan | 1 credit/scan | Per domain scanned |
| Company enrichment | 1 credit | 404s (not found) are free |

### Tips to Optimize Costs

1. **Filter first:** Use `posted_at_max_age_days: 30` to limit results to recent postings
2. **Adjust limits:** Set `limit: 10` instead of `25` if you don't need all results
3. **Re-run monthly:** Jobs/companies already paid for this month are free on repeat calls
4. **Test small:** Always run on 5-10 rows before scaling to hundreds
5. **Use the sandbox:** Hit `/v1/sandbox/jobs/search` (no key required) to test your setup

## Column Mapping Reference

See [`templates/COLUMN-GUIDE.md`](./templates/COLUMN-GUIDE.md) for detailed JSONPath mappings and output column examples.

### Common JSONPath Patterns

| What You Want | JSONPath |
|--------------|----------|
| Total number of results | `$.metadata.total_results` |
| Credits charged for this call | `$.metadata.credits_charged` |
| Array of job titles | `$.data[*].job_title` |
| First job's URL | `$.data[0].url` |
| All job URLs as array | `$.data[*].url` |
| Company name from first result | `$.data[0].company` |
| Check if any results exist | `$.metadata.total_results > 0` |

## Validation Script

Run `validate-configs.js` to verify all Clay configs match the JobsPipe OpenAPI spec:

```bash
node validate-configs.js
```

This script:
- Loads the OpenAPI spec from `https://jobspipe.dev/openapi.json`
- Validates each config's endpoint, method, and required fields
- Ensures JSONPath output mappings reference valid schema fields

**No API key needed**—it validates against the spec, not live data.

## Troubleshooting

### "401 Unauthorized" Error
- Your API key is missing or invalid
- Check you've replaced `YOUR_JOBSPIPE_API_KEY` in the Authorization header
- Verify your key at [jobspipe.dev/dashboard](https://jobspipe.dev/dashboard)

### "402 Payment Required" Error
- You've hit your monthly credit limit
- Upgrade your plan at [jobspipe.dev/pricing](https://jobspipe.dev/pricing)
- Credits reset on the 1st of each month

### "No results returned"
- The company may not be hiring for that role right now
- Try widening your search: increase `posted_at_max_age_days` or broaden `job_title_or`
- Check the `total_results` field—if it's 0, no matches exist

### "Invalid domain" Error
- Ensure domain format is `example.com` (no `https://` or `www.`)
- JobsPipe matches on the registrable domain (e.g., `careers.google.com` → `google.com`)

### Clay shows empty columns
- Check your JSONPath syntax matches the API response structure
- Run the request in Postman or `curl` first to see the actual response shape
- Use Clay's "Show API Response" to debug the raw output

## Resources

- **JobsPipe Docs:** https://docs.jobspipe.dev
- **JobsPipe OpenAPI Spec:** https://jobspipe.dev/openapi.json
- **JobsPipe Dashboard:** https://jobspipe.dev/dashboard
- **Clay Help Center:** https://clay.com/help
- **This Repo's Issues:** [Report problems or request features](../../issues)

## Who Is This For?

This kit was built for:

- **Sales teams** doing outbound to companies with active hiring (a signal they're growing and have budget)
- **Recruiters** sourcing candidates for roles at companies with open positions
- **Clay power users** (hi, The Kiln and Growth Engine X 👋) building custom GTM workflows
- **Agencies** packaging JobsPipe + Clay into repeatable playbooks for clients

## Contributing

Found a better way to structure a config? Have a new use case? PRs welcome!

1. Fork this repo
2. Add your config to `clay-configs/`
3. Update this README with usage steps
4. Run `node validate-configs.js` to ensure it's valid
5. Submit a PR

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Questions?** Open an issue or email [support@jobspipe.dev](mailto:support@jobspipe.dev).
