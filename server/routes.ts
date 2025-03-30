import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRuleSchema, updateRuleSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app.route('/api');

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

      // Return success message with execution details
      res.json({ 
        message: 'Rule triggered successfully', 
        rule: updatedRule,
        executionDetails: {
          trigger: rule.trigger,
          action: rule.action,
          actionType: rule.actionType,
          executedAt: new Date(),
          ...(rule.actionType === 'scheduled' ? {
            scheduledFor: new Date(Date.now() + rule.scheduleDelay * 60 * 1000)
          } : {})
        }
      });
    } catch (error) {
      console.error('Error triggering rule:', error);
      res.status(500).json({ message: 'Failed to trigger rule' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
