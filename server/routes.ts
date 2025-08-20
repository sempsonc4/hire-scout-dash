import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { runs, jobs, contacts, outreach_messages, companies } from "@shared/schema";
import { eq, sql, and, like, gte, lte, gt, desc, asc } from "drizzle-orm";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Webhook endpoint for job search start
  app.post("/webhook/search/start", async (req, res) => {
    try {
      const { query, params } = req.body;
      
      if (!query || !params) {
        return res.status(400).json({ error: "Missing query or params" });
      }
      
      const parsedParams = typeof params === 'string' ? JSON.parse(params) : params;
      
      // Generate unique IDs for run and view token
      const run_id = crypto.randomUUID();
      const view_token = crypto.randomBytes(32).toString('hex');
      const search_id = crypto.randomUUID();
      
      // Create run record
      await db.insert(runs).values({
        run_id,
        query,
        params: parsedParams,
        status: 'pending',
        stats: {},
        search_id,
        view_token,
      });
      
      // Generate JWT-like token for frontend (simplified)
      const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
      const supabase_jwt = Buffer.from(JSON.stringify({
        view_token,
        exp,
        sub: run_id,
        iat: Math.floor(Date.now() / 1000)
      })).toString('base64');
      
      res.json({
        run_id,
        search_id,
        supabase_jwt,
        exp
      });
      
    } catch (error) {
      console.error("Search start error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Webhook endpoint for company search
  app.post("/webhook/company-search/start", async (req, res) => {
    try {
      const { company } = req.body;
      
      if (!company) {
        return res.status(400).json({ error: "Missing company parameter" });
      }
      
      // Generate unique IDs
      const run_id = crypto.randomUUID();
      const view_token = crypto.randomBytes(32).toString('hex');
      
      // Create run record for company search
      await db.insert(runs).values({
        run_id,
        query: `Company: ${company}`,
        params: { company },
        status: 'pending',
        stats: {},
        view_token,
      });
      
      const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      const supabase_jwt = Buffer.from(JSON.stringify({
        view_token,
        exp,
        sub: run_id,
        iat: Math.floor(Date.now() / 1000)
      })).toString('base64');
      
      res.json({
        run_id,
        supabase_jwt,
        exp
      });
      
    } catch (error) {
      console.error("Company search start error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to get jobs with filtering and pagination
  app.get("/api/jobs", async (req, res) => {
    try {
      const {
        run_id,
        page = 1,
        limit = 20,
        search,
        company,
        dateFrom,
        dateTo,
        location,
        source,
        hasContacts
      } = req.query;

      let query = db.select().from(jobs);
      const conditions = [];

      if (run_id) {
        conditions.push(eq(jobs.run_id, run_id as string));
      }
      if (search) {
        conditions.push(
          sql`(${jobs.title} ILIKE ${`%${search}%`} OR ${jobs.company_name} ILIKE ${`%${search}%`})`
        );
      }
      if (company) {
        conditions.push(like(jobs.company_name, `%${company}%`));
      }
      if (dateFrom) {
        conditions.push(gte(jobs.posted_at, new Date(dateFrom as string)));
      }
      if (dateTo) {
        conditions.push(lte(jobs.posted_at, new Date(dateTo as string)));
      }
      if (location) {
        conditions.push(like(jobs.location, `%${location}%`));
      }
      if (source) {
        conditions.push(
          sql`(${jobs.source} ILIKE ${`%${source}%`} OR ${jobs.source_type} ILIKE ${`%${source}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const offset = ((page as number) - 1) * (limit as number);
      const results = await query
        .limit(limit as number)
        .offset(offset)
        .orderBy(desc(jobs.created_at));

      // Get total count for pagination
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(jobs);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }
      const [{ count }] = await countQuery;

      res.json({
        data: results,
        total: count,
        page: page as number,
        limit: limit as number
      });

    } catch (error) {
      console.error("Jobs API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to get contacts for a company
  app.get("/api/contacts", async (req, res) => {
    try {
      const { company_id } = req.query;

      if (!company_id) {
        return res.status(400).json({ error: "Missing company_id parameter" });
      }

      const results = await db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, company_id as string))
        .orderBy(asc(contacts.title));

      res.json({ data: results });

    } catch (error) {
      console.error("Contacts API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to get run status
  app.get("/api/runs/:run_id", async (req, res) => {
    try {
      const { run_id } = req.params;

      const [run] = await db
        .select()
        .from(runs)
        .where(eq(runs.run_id, run_id));

      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }

      res.json(run);

    } catch (error) {
      console.error("Run API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Webhook endpoint for message generation
  app.post("/webhook/generate-message", async (req, res) => {
    try {
      const { contact_id, job_id, tone = "professional" } = req.body;

      if (!contact_id || !job_id) {
        return res.status(400).json({ error: "Missing contact_id or job_id" });
      }

      // Get contact and job info for context
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.contact_id, contact_id));

      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.job_id, job_id));

      if (!contact || !job) {
        return res.status(404).json({ error: "Contact or job not found" });
      }

      // Generate a simple message (in real app this would use AI)
      const subject = `Application for ${job.title} position`;
      const body = `Dear ${contact.name},

I am writing to express my interest in the ${job.title} position at ${job.company_name}. I believe my skills and experience would be a great fit for this role.

I would welcome the opportunity to discuss how I can contribute to your team.

Best regards,
[Your Name]`;

      const message_id = crypto.randomUUID();

      // Save the message
      await db.insert(outreach_messages).values({
        message_id,
        contact_id,
        job_id,
        company_id: contact.company_id,
        subject,
        body,
        tone,
        status: 'draft'
      });

      res.json({
        message_id,
        success: true
      });

    } catch (error) {
      console.error("Message generation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to upsert jobs (for n8n workflow)
  app.post("/api/jobs/upsert", async (req, res) => {
    try {
      const jobData = req.body;
      
      // Insert or update job
      const [job] = await db
        .insert(jobs)
        .values({
          job_id: jobData.job_id,
          title: jobData.title,
          company_name: jobData.company_name,
          company_id: jobData.company_id,
          location: jobData.location,
          salary: jobData.salary,
          posted_at: jobData.posted_at ? new Date(jobData.posted_at) : null,
          source: jobData.source,
          source_type: jobData.source_type,
          link: jobData.link,
          function: jobData.function,
          schedule_type: jobData.schedule_type,
          tags: jobData.tags,
          relevance_score: jobData.relevance_score,
          run_id: jobData.run_id,
          scraped_at: jobData.scraped_at ? new Date(jobData.scraped_at) : new Date(),
        })
        .onConflictDoUpdate({
          target: jobs.job_id,
          set: {
            title: jobData.title,
            company_name: jobData.company_name,
            company_id: jobData.company_id,
            location: jobData.location,
            salary: jobData.salary,
            posted_at: jobData.posted_at ? new Date(jobData.posted_at) : null,
            source: jobData.source,
            source_type: jobData.source_type,
            link: jobData.link,
            function: jobData.function,
            schedule_type: jobData.schedule_type,
            tags: jobData.tags,
            relevance_score: jobData.relevance_score,
            run_id: jobData.run_id,
            updated_at: new Date(),
          },
        })
        .returning();

      res.json({ success: true, job_id: job.job_id });

    } catch (error) {
      console.error("Job upsert error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to update run status
  app.put("/api/runs/:run_id", async (req, res) => {
    try {
      const { run_id } = req.params;
      const { status, stats } = req.body;

      await db
        .update(runs)
        .set({
          status: status as any,
          stats: stats || {},
          updated_at: new Date(),
        })
        .where(eq(runs.run_id, run_id));

      res.json({ success: true });

    } catch (error) {
      console.error("Run update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to upsert companies
  app.post("/api/companies/upsert", async (req, res) => {
    try {
      const companyData = req.body;

      const [company] = await db
        .insert(companies)
        .values({
          company_id: companyData.company_id,
          name: companyData.name,
          domain: companyData.domain,
          industry: companyData.industry,
          linkedin: companyData.linkedin,
          size: companyData.size,
        })
        .onConflictDoUpdate({
          target: companies.company_id,
          set: {
            name: companyData.name,
            domain: companyData.domain,
            industry: companyData.industry,
            linkedin: companyData.linkedin,
            size: companyData.size,
          },
        })
        .returning();

      res.json({ success: true, company_id: company.company_id });

    } catch (error) {
      console.error("Company upsert error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to upsert contacts
  app.post("/api/contacts/upsert", async (req, res) => {
    try {
      const contactData = req.body;

      const [contact] = await db
        .insert(contacts)
        .values({
          contact_id: contactData.contact_id,
          name: contactData.name,
          title: contactData.title,
          email: contactData.email,
          email_status: contactData.email_status as any,
          linkedin: contactData.linkedin,
          phone: contactData.phone,
          company_id: contactData.company_id,
          job_id: contactData.job_id,
          source: contactData.source,
          confidence: contactData.confidence,
          notes: contactData.notes,
        })
        .onConflictDoUpdate({
          target: contacts.contact_id,
          set: {
            name: contactData.name,
            title: contactData.title,
            email: contactData.email,
            email_status: contactData.email_status as any,
            linkedin: contactData.linkedin,
            phone: contactData.phone,
            company_id: contactData.company_id,
            job_id: contactData.job_id,
            source: contactData.source,
            confidence: contactData.confidence,
            notes: contactData.notes,
          },
        })
        .returning();

      res.json({ success: true, contact_id: contact.contact_id });

    } catch (error) {
      console.error("Contact upsert error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to get companies by run_id (for your SQL query step)
  app.get("/api/runs/:run_id/companies", async (req, res) => {
    try {
      const { run_id } = req.params;

      const companies_list = await db
        .select({
          company_name: jobs.company_name,
          company_id: jobs.company_id,
        })
        .from(jobs)
        .where(eq(jobs.run_id, run_id))
        .groupBy(jobs.company_name, jobs.company_id);

      res.json({ data: companies_list });

    } catch (error) {
      console.error("Companies by run error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoint to resolve company and get contact counts
  app.get("/api/companies/resolve/:company_name", async (req, res) => {
    try {
      const { company_name } = req.params;
      const { do_contacts, do_jobs } = req.query;

      // Find company by name
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.name, company_name))
        .limit(1);

      // Count existing contacts
      const [contactCount] = company ? await db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(eq(contacts.company_id, company.company_id)) : [{ count: 0 }];

      res.json({
        company_name,
        company_id: company?.company_id || null,
        org_id: company?.apollo_org_id || null,
        domain: company?.domain || null,
        contacts_total: contactCount.count,
        do_contacts: do_contacts === 'true',
        do_jobs: do_jobs === 'true'
      });

    } catch (error) {
      console.error("Resolve company error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
