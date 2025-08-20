import { pgTable, text, serial, integer, boolean, timestamp, varchar, json, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums
export const runStatusEnum = pgEnum('run_status', ['pending', 'running', 'completed', 'failed']);
export const emailStatusEnum = pgEnum('email_status', ['valid', 'invalid', 'risky', 'unknown']);
export const messageStatusEnum = pgEnum('message_status', ['draft', 'sent', 'failed']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical']);

// Main tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const companies = pgTable("companies", {
  company_id: varchar("company_id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  linkedin: text("linkedin"),
  size: text("size"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  run_id: varchar("run_id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  params: json("params").notNull(),
  status: runStatusEnum("status").default('pending').notNull(),
  stats: json("stats").notNull().default('{}'),
  search_id: varchar("search_id"),
  view_token: text("view_token"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  job_id: varchar("job_id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  company_name: text("company_name").notNull(),
  company_id: varchar("company_id"),
  location: text("location"),
  salary: text("salary"),
  posted_at: timestamp("posted_at"),
  source: text("source"),
  source_type: text("source_type"),
  link: text("link"),
  function: text("function"),
  schedule_type: text("schedule_type"),
  tags: text("tags").array(),
  relevance_score: numeric("relevance_score"),
  run_id: varchar("run_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
  scraped_at: timestamp("scraped_at").notNull(),
});

export const contacts = pgTable("contacts", {
  contact_id: varchar("contact_id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  email_status: emailStatusEnum("email_status"),
  linkedin: text("linkedin"),
  phone: text("phone"),
  company_id: varchar("company_id"),
  job_id: varchar("job_id"),
  source: text("source"),
  confidence: numeric("confidence"),
  notes: text("notes"),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const searches = pgTable("searches", {
  search_id: varchar("search_id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  location: text("location").notNull(),
  params: json("params").default('{}'),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  message_id: varchar("message_id").primaryKey().default(sql`gen_random_uuid()`),
  contact_id: varchar("contact_id"),
  job_id: varchar("job_id"),
  subject: text("subject"),
  body: text("body"),
  channel: text("channel").notNull(),
  tone: text("tone"),
  quality_score: numeric("quality_score"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const outreach_messages = pgTable("outreach_messages", {
  message_id: varchar("message_id").primaryKey().default(sql`gen_random_uuid()`),
  contact_id: varchar("contact_id"),
  job_id: varchar("job_id"),
  company_id: varchar("company_id"),
  subject: text("subject"),
  body: text("body"),
  preview_text: text("preview_text"),
  tone: text("tone"),
  template_version: text("template_version"),
  variant: integer("variant"),
  channel: text("channel").default('email'),
  status: messageStatusEnum("status").default('draft'),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const domains = pgTable("domains", {
  domain: text("domain").primaryKey(),
  company_id: varchar("company_id"),
});

export const job_search_map = pgTable("job_search_map", {
  job_id: varchar("job_id").notNull(),
  search_id: varchar("search_id").notNull(),
  first_seen_at: timestamp("first_seen_at").defaultNow().notNull(),
  last_seen_at: timestamp("last_seen_at").defaultNow().notNull(),
});

export const contact_sources = pgTable("contact_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contact_id: varchar("contact_id"),
  provider: text("provider").notNull(),
  provider_id: text("provider_id"),
  payload: json("payload"),
  found_at: timestamp("found_at").defaultNow().notNull(),
});

export const provider_calls = pgTable("provider_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  endpoint: text("endpoint").notNull(),
  request: json("request"),
  response: json("response"),
  status_code: integer("status_code"),
  duration_ms: integer("duration_ms"),
  cost: numeric("cost"),
  run_id: varchar("run_id"),
  search_id: varchar("search_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const qa_flags = pgTable("qa_flags", {
  flag_id: varchar("flag_id").primaryKey().default(sql`gen_random_uuid()`),
  entity_type: text("entity_type").notNull(),
  entity_id: varchar("entity_id").notNull(),
  flag: text("flag").notNull(),
  severity: severityEnum("severity").default('medium').notNull(),
  notes: text("notes"),
  resolved_at: timestamp("resolved_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const enrichment_events = pgTable("enrichment_events", {
  event_id: varchar("event_id").primaryKey().default(sql`gen_random_uuid()`),
  event_type: text("event_type").notNull(),
  job_id: varchar("job_id"),
  run_id: varchar("run_id"),
  input: json("input"),
  patch: json("patch"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Schema exports for Zod validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type OutreachMessage = typeof outreach_messages.$inferSelect;
