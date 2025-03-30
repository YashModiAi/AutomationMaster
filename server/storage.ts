import { 
  rules, triggers, actions, activityLogs,
  type Rule, type InsertRule, type UpdateRule,
  type Trigger, type InsertTrigger,
  type Action, type InsertAction,
  type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // Trigger operations
  getAllTriggers(): Promise<Trigger[]>;
  getTriggerById(id: number): Promise<Trigger | undefined>;
  getTriggerByName(name: string): Promise<Trigger | undefined>;
  createTrigger(trigger: InsertTrigger): Promise<Trigger>;
  ensureDefaultTriggers(): Promise<void>;

  // Action operations
  getAllActions(): Promise<Action[]>;
  getActionById(id: number): Promise<Action | undefined>;
  getActionByName(name: string): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  ensureDefaultActions(): Promise<void>;

  // Rule operations
  getAllRules(): Promise<Rule[]>;
  getRuleById(id: number): Promise<Rule | undefined>;
  createRule(rule: InsertRule): Promise<Rule>;
  updateRule(id: number, rule: UpdateRule): Promise<Rule | undefined>;
  deleteRule(id: number): Promise<boolean>;
  toggleRuleActive(id: number): Promise<Rule | undefined>;
  updateRuleLastTriggered(id: number): Promise<Rule | undefined>;

  // Activity log operations
  getActivityLogsByRuleId(ruleId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getPendingScheduledActions(): Promise<ActivityLog[]>;
  markActivityLogAsExecuted(id: number, status: 'success' | 'failed', details?: Record<string, any>): Promise<ActivityLog | undefined>;
  getActivityLogsByStatus(status: 'success' | 'failed' | 'scheduled' | 'canceled'): Promise<ActivityLog[]>;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  // Trigger operations
  async getAllTriggers(): Promise<Trigger[]> {
    return db.select().from(triggers).orderBy(triggers.name);
  }

  async getTriggerById(id: number): Promise<Trigger | undefined> {
    const [trigger] = await db.select().from(triggers).where(eq(triggers.id, id));
    return trigger;
  }

  async getTriggerByName(name: string): Promise<Trigger | undefined> {
    const [trigger] = await db.select().from(triggers).where(eq(triggers.name, name));
    return trigger;
  }

  async createTrigger(triggerData: InsertTrigger): Promise<Trigger> {
    const [trigger] = await db.insert(triggers).values(triggerData).returning();
    return trigger;
  }

  async ensureDefaultTriggers(): Promise<void> {
    const defaultTriggers = [
      { name: "Guest checks in", description: "Triggered when a guest checks in" },
      { name: "Guest checks out", description: "Triggered when a guest checks out" },
      { name: "Booking confirmed", description: "Triggered when a booking is confirmed" },
      { name: "Cleaning completed", description: "Triggered when cleaning is completed" },
      { name: "Issue reported", description: "Triggered when an issue is reported" },
      { name: "Maintenance scheduled", description: "Triggered when maintenance is scheduled" },
      { name: "Payment received", description: "Triggered when a payment is received" },
    ];

    for (const trigger of defaultTriggers) {
      const existing = await this.getTriggerByName(trigger.name);
      if (!existing) {
        await this.createTrigger(trigger);
      }
    }
  }

  // Action operations
  async getAllActions(): Promise<Action[]> {
    return db.select().from(actions).orderBy(actions.name);
  }

  async getActionById(id: number): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.id, id));
    return action;
  }

  async getActionByName(name: string): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.name, name));
    return action;
  }

  async createAction(actionData: InsertAction): Promise<Action> {
    const [action] = await db.insert(actions).values(actionData).returning();
    return action;
  }

  async ensureDefaultActions(): Promise<void> {
    const defaultActions = [
      { name: "Send email", description: "Sends an email notification" },
      { name: "Send Slack notification", description: "Sends a notification to a Slack channel" },
      { name: "Send native notification", description: "Sends a native notification" },
      { name: "Create task", description: "Creates a task in the task management system" },
      { name: "Turn on device", description: "Turns on a connected device" },
      { name: "Turn off device", description: "Turns off a connected device" },
    ];

    for (const action of defaultActions) {
      const existing = await this.getActionByName(action.name);
      if (!existing) {
        await this.createAction(action);
      }
    }
  }

  // Rule operations
  async getAllRules(): Promise<Rule[]> {
    return db.select().from(rules).orderBy(desc(rules.createdAt));
  }

  async getRuleById(id: number): Promise<Rule | undefined> {
    const [rule] = await db.select().from(rules).where(eq(rules.id, id));
    return rule;
  }

  async createRule(ruleData: InsertRule): Promise<Rule> {
    // Ensure triggerConditions is a proper string array
    let triggerConditions: string[] = [];
    if (ruleData.triggerConditions) {
      if (Array.isArray(ruleData.triggerConditions)) {
        triggerConditions = ruleData.triggerConditions.map(item => String(item));
      }
    }

    // Convert actionDetails to a proper object if needed
    const actionDetails = ruleData.actionDetails || {};
    
    const [rule] = await db.insert(rules).values({
      name: ruleData.name,
      description: ruleData.description || null,
      triggerId: ruleData.triggerId,
      actionId: ruleData.actionId,
      triggerConditions,
      actionType: ruleData.actionType,
      actionDetails,
      userType: ruleData.userType || 'admin', // Include user type
      isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
      scheduleDelay: ruleData.scheduleDelay || 0
    }).returning();
    
    return rule;
  }

  async updateRule(id: number, ruleData: UpdateRule): Promise<Rule | undefined> {
    // Fetch the existing rule to use as a base
    const existingRule = await this.getRuleById(id);
    if (!existingRule) {
      return undefined;
    }
    
    // Build the update object with only the fields provided in the ruleData
    const updates: Record<string, any> = {};
    
    // Handle primitive fields
    if (ruleData.name !== undefined) updates.name = ruleData.name;
    if (ruleData.description !== undefined) updates.description = ruleData.description;
    if (ruleData.triggerId !== undefined) updates.triggerId = ruleData.triggerId;
    if (ruleData.actionId !== undefined) updates.actionId = ruleData.actionId;
    if (ruleData.isActive !== undefined) updates.isActive = ruleData.isActive;
    if (ruleData.scheduleDelay !== undefined) updates.scheduleDelay = ruleData.scheduleDelay;
    if (ruleData.userType !== undefined) updates.userType = ruleData.userType;
    
    // Handle enum field
    if (ruleData.actionType !== undefined) {
      // Ensure actionType is one of the allowed values
      if (ruleData.actionType === "immediate" || ruleData.actionType === "scheduled") {
        updates.actionType = ruleData.actionType;
      }
    }
    
    // Handle complex fields
    if (ruleData.triggerConditions !== undefined) {
      // Convert to string array
      if (Array.isArray(ruleData.triggerConditions)) {
        updates.triggerConditions = ruleData.triggerConditions.map(item => String(item));
      } else {
        updates.triggerConditions = [];
      }
    }
    
    if (ruleData.actionDetails !== undefined) {
      updates.actionDetails = ruleData.actionDetails || {};
    }
    
    const [updatedRule] = await db
      .update(rules)
      .set(updates)
      .where(eq(rules.id, id))
      .returning();
    
    return updatedRule;
  }

  async deleteRule(id: number): Promise<boolean> {
    const result = await db.delete(rules).where(eq(rules.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async toggleRuleActive(id: number): Promise<Rule | undefined> {
    const rule = await this.getRuleById(id);
    if (!rule) return undefined;

    const [updatedRule] = await db
      .update(rules)
      .set({ isActive: !rule.isActive })
      .where(eq(rules.id, id))
      .returning();
    
    return updatedRule;
  }

  async updateRuleLastTriggered(id: number): Promise<Rule | undefined> {
    const [updatedRule] = await db
      .update(rules)
      .set({ lastTriggered: new Date() })
      .where(eq(rules.id, id))
      .returning();
    
    return updatedRule;
  }

  // Activity log operations
  async getActivityLogsByRuleId(ruleId: number): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.ruleId, ruleId))
      .orderBy(desc(activityLogs.triggeredAt));
  }

  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(logData).returning();
    return log;
  }
  
  // Get pending scheduled actions that need to be executed
  async getPendingScheduledActions(): Promise<ActivityLog[]> {
    const now = new Date();
    
    // We need to manually filter by scheduleTime since Drizzle doesn't support lt on timestamp in this context
    const scheduledActions = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.status, 'scheduled'));
    
    // Filter out actions where scheduleTime is in the future or not set
    return scheduledActions.filter(action => 
      action.scheduleTime !== null && 
      new Date(action.scheduleTime) <= now
    );
  }
  
  // Update activity log to mark it as executed
  async markActivityLogAsExecuted(id: number, status: 'success' | 'failed', details?: Record<string, any>): Promise<ActivityLog | undefined> {
    const startTime = Date.now();
    const now = new Date();
    
    const [updatedLog] = await db
      .update(activityLogs)
      .set({
        status: status,
        executedAt: now,
        executionDuration: Date.now() - startTime,
        ...(details ? { details: details } : {})
      })
      .where(eq(activityLogs.id, id))
      .returning();
    
    return updatedLog;
  }
  
  // Get activity logs by status
  async getActivityLogsByStatus(status: 'success' | 'failed' | 'scheduled' | 'canceled'): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.status, status))
      .orderBy(desc(activityLogs.triggeredAt));
  }

  // For development - seed some initial data
  async seedInitialData(): Promise<void> {
    // Make sure default triggers and actions exist
    await this.ensureDefaultTriggers();
    await this.ensureDefaultActions();

    // Get trigger and action IDs
    const guestCheckinTrigger = await this.getTriggerByName("Guest checks in");
    const guestCheckoutTrigger = await this.getTriggerByName("Guest checks out");
    const issueReportedTrigger = await this.getTriggerByName("Issue reported");

    const sendEmailAction = await this.getActionByName("Send email");
    const createTaskAction = await this.getActionByName("Create task");
    const slackNotificationAction = await this.getActionByName("Send Slack notification");

    if (!guestCheckinTrigger || !guestCheckoutTrigger || !issueReportedTrigger ||
        !sendEmailAction || !createTaskAction || !slackNotificationAction) {
      return; // Skip if default data doesn't exist
    }

    // Check for existing rules before creating
    const existingRules = await this.getAllRules();
    if (existingRules.length > 0) {
      return; // Don't seed if rules already exist
    }

    // Create example rules
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const rule1Id = await db.insert(rules)
      .values({
        name: "Guest Check-in Notification",
        description: "Sends a welcome email to guests immediately after check-in",
        triggerId: guestCheckinTrigger.id,
        actionId: sendEmailAction.id,
        triggerConditions: [],
        actionType: "immediate",
        actionDetails: {
          recipient: "guest@example.com",
          subject: "Welcome to your stay!",
          message: "Welcome! We're delighted to have you staying with us."
        },
        isActive: true,
        scheduleDelay: 0
      })
      .returning({ id: rules.id })
      .then(result => result[0]?.id);

    const rule2Id = await db.insert(rules)
      .values({
        name: "Cleaning Reminder",
        description: "Creates a cleaning task 3 hours after guest check-out",
        triggerId: guestCheckoutTrigger.id,
        actionId: createTaskAction.id,
        triggerConditions: [],
        actionType: "scheduled",
        actionDetails: {
          taskName: "Room cleaning",
          assignee: "Cleaning staff",
          priority: "High"
        },
        isActive: true,
        scheduleDelay: 180 // 3 hours in minutes
      })
      .returning({ id: rules.id })
      .then(result => result[0]?.id);

    const rule3Id = await db.insert(rules)
      .values({
        name: "Maintenance Alert",
        description: "Alerts maintenance team when a guest reports an issue",
        triggerId: issueReportedTrigger.id,
        actionId: slackNotificationAction.id,
        triggerConditions: [],
        actionType: "immediate",
        actionDetails: {
          channel: "#maintenance",
          message: "New maintenance issue reported!"
        },
        isActive: false,
        scheduleDelay: 0
      })
      .returning({ id: rules.id })
      .then(result => result[0]?.id);

    // Update the last triggered times
    if (rule1Id && rule2Id && rule3Id) {
      await db
        .update(rules)
        .set({ lastTriggered: twoHoursAgo })
        .where(eq(rules.id, rule1Id));

      await db
        .update(rules)
        .set({ lastTriggered: yesterday })
        .where(eq(rules.id, rule2Id));

      await db
        .update(rules)
        .set({ lastTriggered: threeDaysAgo })
        .where(eq(rules.id, rule3Id));
    }
  }
}

// Create a new DatabaseStorage instance
export const storage = new DatabaseStorage();