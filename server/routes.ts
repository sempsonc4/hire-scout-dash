import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { runs, jobs, contacts, outreach_messages } from "@shared/schema";
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

  const httpServer = createServer(app);

  return httpServer;
}
