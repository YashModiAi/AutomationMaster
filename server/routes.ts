import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRuleSchema, updateRuleSchema, insertTriggerSchema, 
  insertActionSchema, insertActivityLogSchema 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with default data
  await (storage as any).seedInitialData();

  // ===== TRIGGER ENDPOINTS =====
  
  // Get all triggers
  app.get('/api/triggers', async (req: Request, res: Response) => {
    try {
      const triggers = await storage.getAllTriggers();
      res.json(triggers);
    } catch (error) {
      console.error('Error fetching triggers:', error);
      res.status(500).json({ message: 'Failed to fetch triggers' });
    }
  });

  // Get trigger by ID
  app.get('/api/triggers/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid trigger ID' });
      }

      const trigger = await storage.getTriggerById(id);
      if (!trigger) {
        return res.status(404).json({ message: 'Trigger not found' });
      }

      res.json(trigger);
    } catch (error) {
      console.error('Error fetching trigger:', error);
      res.status(500).json({ message: 'Failed to fetch trigger' });
    }
  });

  // Create a new trigger
  app.post('/api/triggers', async (req: Request, res: Response) => {
    try {
      const validationResult = insertTriggerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const newTrigger = await storage.createTrigger(validationResult.data);
      res.status(201).json(newTrigger);
    } catch (error) {
      console.error('Error creating trigger:', error);
      res.status(500).json({ message: 'Failed to create trigger' });
    }
  });

  // ===== ACTION ENDPOINTS =====
  
  // Get all actions
  app.get('/api/actions', async (req: Request, res: Response) => {
    try {
      const actions = await storage.getAllActions();
      res.json(actions);
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({ message: 'Failed to fetch actions' });
    }
  });

  // Get action by ID
  app.get('/api/actions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid action ID' });
      }

      const action = await storage.getActionById(id);
      if (!action) {
        return res.status(404).json({ message: 'Action not found' });
      }

      res.json(action);
    } catch (error) {
      console.error('Error fetching action:', error);
      res.status(500).json({ message: 'Failed to fetch action' });
    }
  });

  // Create a new action
  app.post('/api/actions', async (req: Request, res: Response) => {
    try {
      const validationResult = insertActionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const newAction = await storage.createAction(validationResult.data);
      res.status(201).json(newAction);
    } catch (error) {
      console.error('Error creating action:', error);
      res.status(500).json({ message: 'Failed to create action' });
    }
  });

  // ===== RULE ENDPOINTS =====
  
  // Get all rules
  app.get('/api/rules', async (req: Request, res: Response) => {
    try {
      const rules = await storage.getAllRules();
      res.json(rules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      res.status(500).json({ message: 'Failed to fetch rules' });
    }
  });

  // Get rule by ID
  app.get('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const rule = await storage.getRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      res.json(rule);
    } catch (error) {
      console.error('Error fetching rule:', error);
      res.status(500).json({ message: 'Failed to fetch rule' });
    }
  });

  // Create a new rule
  app.post('/api/rules', async (req: Request, res: Response) => {
    try {
      const validationResult = insertRuleSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const newRule = await storage.createRule(validationResult.data);
      res.status(201).json(newRule);
    } catch (error) {
      console.error('Error creating rule:', error);
      res.status(500).json({ message: 'Failed to create rule' });
    }
  });

  // Update a rule
  app.patch('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const validationResult = updateRuleSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const updatedRule = await storage.updateRule(id, validationResult.data);
      if (!updatedRule) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      res.json(updatedRule);
    } catch (error) {
      console.error('Error updating rule:', error);
      res.status(500).json({ message: 'Failed to update rule' });
    }
  });

  // Delete a rule
  app.delete('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const success = await storage.deleteRule(id);
      if (!success) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting rule:', error);
      res.status(500).json({ message: 'Failed to delete rule' });
    }
  });

  // Toggle rule active status
  app.post('/api/rules/:id/toggle', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const updatedRule = await storage.toggleRuleActive(id);
      if (!updatedRule) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      res.json(updatedRule);
    } catch (error) {
      console.error('Error toggling rule active status:', error);
      res.status(500).json({ message: 'Failed to toggle rule active status' });
    }
  });

  // Simulate rule trigger
  app.post('/api/rules/:id/trigger', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const rule = await storage.getRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      if (!rule.isActive) {
        return res.status(400).json({ message: 'Cannot trigger inactive rule' });
      }

      // Simulate rule execution
      const updatedRule = await storage.updateRuleLastTriggered(id);

      // Create activity log entry
      const logStatus = rule.actionType === 'immediate' ? 'success' : 'scheduled';
      const executionTime = new Date();
      const scheduleDelay = rule.scheduleDelay || 0;
      const scheduledTime = rule.actionType === 'scheduled' ? 
        new Date(executionTime.getTime() + scheduleDelay * 60 * 1000) : null;

      // Store all details as a proper Record<string, any>
      const logDetails: Record<string, any> = {
        executedAt: executionTime.toISOString(),
        scheduledFor: scheduledTime ? scheduledTime.toISOString() : null,
        triggerConditions: Array.isArray(rule.triggerConditions) ? rule.triggerConditions : [],
        actionDetails: rule.actionDetails || {}
      };
      
      await storage.createActivityLog({
        ruleId: rule.id,
        status: logStatus,
        details: logDetails
      });

      // Return success message with execution details
      res.json({ 
        message: 'Rule triggered successfully', 
        rule: updatedRule,
        executionDetails: {
          executedAt: executionTime,
          status: logStatus,
          ...(scheduledTime ? { scheduledFor: scheduledTime } : {})
        }
      });
    } catch (error) {
      console.error('Error triggering rule:', error);
      res.status(500).json({ message: 'Failed to trigger rule' });
    }
  });

  // ===== ACTIVITY LOG ENDPOINTS =====
  
  // Get activity logs for a rule
  app.get('/api/rules/:id/activity', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }

      const rule = await storage.getRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: 'Rule not found' });
      }

      const logs = await storage.getActivityLogsByRuleId(id);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}