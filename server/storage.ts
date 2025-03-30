import { rules, type Rule, type InsertRule, type UpdateRule } from "@shared/schema";

export interface IStorage {
  getAllRules(): Promise<Rule[]>;
  getRuleById(id: number): Promise<Rule | undefined>;
  createRule(rule: InsertRule): Promise<Rule>;
  updateRule(id: number, rule: UpdateRule): Promise<Rule | undefined>;
  deleteRule(id: number): Promise<boolean>;
  toggleRuleActive(id: number): Promise<Rule | undefined>;
  updateRuleLastTriggered(id: number): Promise<Rule | undefined>;
}

export class MemStorage implements IStorage {
  private rules: Map<number, Rule>;
  private currentId: number;

  constructor() {
    this.rules = new Map();
    this.currentId = 1;
    this.seedInitialData();
  }

  private seedInitialData() {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    this.createRule({
      name: "Guest Check-in Notification",
      description: "Sends a welcome email to guests immediately after check-in",
      trigger: "Guest checks in",
      triggerConditions: [],
      action: "Send email",
      actionType: "immediate",
      actionDetails: {
        recipient: "guest@example.com",
        subject: "Welcome to your stay!",
        message: "Welcome! We're delighted to have you staying with us."
      },
      isActive: true,
      scheduleDelay: 0
    }).then(rule => {
      this.updateRuleLastTriggered(rule.id, twoHoursAgo);
    });

    this.createRule({
      name: "Cleaning Reminder",
      description: "Creates a cleaning task 3 hours after guest check-out",
      trigger: "Guest checks out",
      triggerConditions: [],
      action: "Create task",
      actionType: "scheduled",
      actionDetails: {
        taskName: "Room cleaning",
        assignee: "Cleaning staff",
        priority: "High"
      },
      isActive: true,
      scheduleDelay: 180 // 3 hours in minutes
    }).then(rule => {
      this.updateRuleLastTriggered(rule.id, yesterday);
    });

    this.createRule({
      name: "Maintenance Alert",
      description: "Alerts maintenance team when a guest reports an issue",
      trigger: "Issue reported",
      triggerConditions: [],
      action: "Send Slack notification",
      actionType: "immediate",
      actionDetails: {
        channel: "#maintenance",
        message: "New maintenance issue reported!"
      },
      isActive: false,
      scheduleDelay: 0
    }).then(rule => {
      this.updateRuleLastTriggered(rule.id, threeDaysAgo);
    });
  }

  async getAllRules(): Promise<Rule[]> {
    return Array.from(this.rules.values()).sort((a, b) => a.id - b.id);
  }

  async getRuleById(id: number): Promise<Rule | undefined> {
    return this.rules.get(id);
  }

  async createRule(ruleData: InsertRule): Promise<Rule> {
    const id = this.currentId++;
    const now = new Date();
    const rule: Rule = {
      ...ruleData,
      id,
      createdAt: now,
      lastTriggered: null
    };
    this.rules.set(id, rule);
    return rule;
  }

  async updateRule(id: number, ruleData: UpdateRule): Promise<Rule | undefined> {
    const existingRule = this.rules.get(id);
    if (!existingRule) return undefined;

    const updatedRule: Rule = {
      ...existingRule,
      ...ruleData,
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteRule(id: number): Promise<boolean> {
    return this.rules.delete(id);
  }

  async toggleRuleActive(id: number): Promise<Rule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updatedRule: Rule = {
      ...rule,
      isActive: !rule.isActive
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async updateRuleLastTriggered(id: number, timestamp?: Date): Promise<Rule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updatedRule: Rule = {
      ...rule,
      lastTriggered: timestamp || new Date()
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }
}

export const storage = new MemStorage();
