import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Rule schema
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  triggerConditions: json("trigger_conditions").$type<string[]>().default([]),
  action: text("action").notNull(),
  actionType: text("action_type").notNull().default("immediate"), // 'immediate' or 'scheduled'
  actionDetails: json("action_details").$type<Record<string, any>>().notNull().default({}),
  scheduleDelay: integer("schedule_delay").default(0), // In minutes, for scheduled actions
  isActive: boolean("is_active").notNull().default(true),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRuleSchema = createInsertSchema(rules).omit({
  id: true,
  createdAt: true,
  lastTriggered: true,
});

export const updateRuleSchema = insertRuleSchema.partial();

export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type UpdateRule = z.infer<typeof updateRuleSchema>;

// Available trigger types
export const triggerTypes = [
  "Guest checks in",
  "Guest checks out",
  "Booking confirmed",
  "Cleaning completed",
  "Issue reported",
  "Maintenance scheduled",
  "Payment received"
] as const;

// Available action types
export const actionTypes = [
  "Send email",
  "Send Slack notification",
  "Send native notification",
  "Create task",
  "Turn on device",
  "Turn off device"
] as const;

export const actionTypeSchema = z.enum([...actionTypes] as [string, ...string[]]);
export const triggerTypeSchema = z.enum([...triggerTypes] as [string, ...string[]]);
