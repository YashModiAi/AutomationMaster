import { pgTable, text, serial, integer, boolean, json, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
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

/**
 * User type enum for categorizing triggers and actions based on user roles
 * This helps organize automation rules based on who they are relevant to
 */
export const userTypeEnum = pgEnum("user_type", [
  "admin",       // Admin/Business Owner
  "security",    // Security Team
  "maintenance", // Housekeeping & Maintenance
  "host",        // Host/Property Manager
  "guest"        // Guest
]);

// Trigger schema
export const triggers = pgTable("triggers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  userType: userTypeEnum("user_type").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTriggerSchema = createInsertSchema(triggers).omit({
  id: true,
  createdAt: true,
});

export type Trigger = typeof triggers.$inferSelect;
export type InsertTrigger = z.infer<typeof insertTriggerSchema>;

// Action schedule type enum
export const actionScheduleEnum = pgEnum("action_schedule_type", ["immediate", "scheduled"]);

// Action schema
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  userType: userTypeEnum("user_type").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
});

export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

// Rule schema
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  triggerId: integer("trigger_id").notNull().references(() => triggers.id),
  actionId: integer("action_id").notNull().references(() => actions.id),
  triggerConditions: json("trigger_conditions").$type<string[]>().default([]),
  actionType: actionScheduleEnum("action_type").notNull().default("immediate"),
  actionDetails: json("action_details").$type<Record<string, any>>().notNull().default({}),
  scheduleDelay: integer("schedule_delay").default(0), // In minutes, for scheduled actions
  userType: userTypeEnum("user_type").notNull().default("admin"), // Primary user type this rule is for
  isActive: boolean("is_active").notNull().default(true),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity type enum
export const activityStatusEnum = pgEnum("activity_status", ["success", "failed", "scheduled", "canceled"]);

// Activity logs schema
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull().references(() => rules.id),
  triggeredAt: timestamp("triggered_at").defaultNow(),
  status: activityStatusEnum("status").notNull(),
  details: json("details").$type<Record<string, any>>().default({}),
  scheduleTime: timestamp("schedule_time"),
  executedAt: timestamp("executed_at"),
  executionDuration: integer("execution_duration"), // in milliseconds
});

// Define relations
export const rulesRelations = relations(rules, ({ one }) => ({
  trigger: one(triggers, {
    fields: [rules.triggerId],
    references: [triggers.id],
  }),
  action: one(actions, {
    fields: [rules.actionId],
    references: [actions.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  rule: one(rules, {
    fields: [activityLogs.ruleId],
    references: [rules.id],
  }),
}));

// Create schemas for Zod validation
export const insertRuleSchema = createInsertSchema(rules).omit({
  id: true,
  createdAt: true,
  lastTriggered: true,
});

export const updateRuleSchema = insertRuleSchema.partial();

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
});

// Export types
export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type UpdateRule = z.infer<typeof updateRuleSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

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