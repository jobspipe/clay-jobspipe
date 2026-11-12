# Clay Table Column Guide

This guide explains how to set up your Clay table columns for JobsPipe enrichments.

## Input Columns

These are the columns you'll import from the CSV template or create manually:

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `company_domain` | Text | Company website domain | `stripe.com` |
| `company_name` | Text | Company name (optional, for reference) | `Stripe` |
| `target_role` | Text | Job title or role to search for | `software engineer` |
| `country_filter` | Text | Country code for filtering (ISO 2-letter) | `US` |

## Enrichment Columns (Add via HTTP API)

After importing your input data, add these enrichment columns using the JobsPipe HTTP API configs:

### 1. Check if Hiring for Target Role

**Config to use:** `check-hiring-for-role.json`

| Output Column | JSONPath | Description |
|--------------|----------|-------------|
| `is_hiring` | `$.metadata.total_results > 0` | Boolean: true if company has matching openings |
| `number_of_openings` | `$.metadata.total_results` | Count of open positions for target role |
| `job_titles` | `$.data[*].job_title` | Array of matching job titles |
| `job_urls` | `$.data[*].url` | Array of application URLs |
| `seniority_levels` | `$.data[*].seniority` | Seniority levels (junior, mid, senior, etc.) |

**How to add:**
1. In Clay, click "+ Add Enrichment" → "HTTP API"
2. Import or paste the `check-hiring-for-role.json` config
3. Map `company_domain` input column to `{{company_domain}}`
4. Map `target_role` input column to `{{job_title}}`
5. Create output columns for each JSONPath mapping you want

### 2. Get Hiring Signals

**Config to use:** `company-hiring-signals.json`

| Output Column | JSONPath | Description |
|--------------|----------|-------------|
| `total_open_jobs` | `$.data[0].jobs` | Total number of open positions across all roles |
| `last_posted` | `$.data[0].last_posted` | Date of most recent job posting |
| `employee_count` | `$.data[0].employee_count` | Company headcount |
| `industry` | `$.data[0].industry` | Company industry |
| `hq_location` | `$.data[0].hq_city` | Headquarters city |

**When to use:**
- To gauge overall hiring velocity
- To identify fast-growing companies
- To filter by company size or industry

### 3. Detect Tech Stack

**Config to use:** `detect-company-tech-stack.json`

| Output Column | JSONPath | Description |
|--------------|----------|-------------|
| `technologies_found` | `$.detected[*].name` | Array of detected technologies |
| `technology_categories` | `$.detected[*].categories` | Categories (e.g., Analytics, CRM, Hosting) |
| `technology_slugs` | `$.detected[*].slug` | Machine-readable tech identifiers |

**When to use:**
- To personalize outreach based on tech stack
- To find companies using specific technologies
- To identify technical fit for your product

### 4. Get Company Details

**Config to use:** `get-company-enrichment.json`

| Output Column | JSONPath | Description |
|--------------|----------|-------------|
| `company_name` | `$.name` | Official company name |
| `employee_count` | `$.employee_count` | Company headcount |
| `linkedin_url` | `$.linkedin_url` | Company LinkedIn page |
| `description` | `$.description` | Company description |
| `founded_year` | `$.founded` | Year company was founded |
| `hq_location` | `$.location.city` | Headquarters city |

## Example Workflow

1. **Import the CSV template** into a new Clay table
2. **Add enrichment 1:** Check if each company is hiring for your target role
3. **Filter:** Keep only rows where `is_hiring = true`
4. **Add enrichment 2:** Get hiring signals to prioritize by `total_open_jobs`
5. **Add enrichment 3:** Detect tech stack to personalize outreach
6. **Export** your enriched list for outbound campaigns

## Credit Costs

| Enrichment | Cost per Row | Notes |
|-----------|--------------|-------|
| Check hiring for role | 1 credit per unique job | First time seeing each job this month |
| Hiring signals | 1 credit per company | Free if company already paid this month |
| Tech stack scan | 1 credit per scan | One-time per domain |
| Company enrichment | 1 credit per lookup | 404s (not found) are free |

### Example Cost Calculation

For a 100-row table checking if companies are hiring for SDRs:
- **Scenario 1:** Each company has 3 matching jobs = ~300 credits
- **Scenario 2:** Half have 0 matches, half have 2 matches = ~100 credits
- **Note:** Jobs you've already paid for this month are free

**Free tier:** 1,000 credits (enough for 1,000 job results or 1,000 company lookups)

## Tips

- **Start small:** Test on 5-10 rows before running on your full list
- **Use filters:** Apply `posted_at_max_age_days: 30` to get recent postings only
- **Combine signals:** Use `is_hiring + total_open_jobs` to prioritize hot leads
- **Re-run monthly:** JobsPipe charges per unique job per month, so re-enriching is cheaper
- **Handle nulls:** Some companies may return empty results—use Clay's "Skip empty" option

## Advanced: Claygent Prompts

If using Claygent with JobsPipe data:

**Prompt 1: Personalized Outreach**
```
Based on this company data:
- Company: {{company_name}}
- They're hiring for: {{job_titles}}
- Tech stack: {{technologies_found}}
- Total openings: {{total_open_jobs}}

Write a personalized cold email suggesting our [your product] 
could help them scale their {{target_role}} team.
```

**Prompt 2: Hiring Velocity Analysis**
```
This company has {{total_open_jobs}} open positions and last posted 
on {{last_posted}}. Analyze their hiring velocity and suggest the 
best timing and angle for outbound sales outreach.
```

## Need Help?

- **JobsPipe Docs:** https://docs.jobspipe.dev
- **Clay Support:** https://clay.com/help
- **Issues with this kit:** Open an issue in this repository
