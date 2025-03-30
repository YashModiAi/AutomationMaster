import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertRuleSchema, updateRuleSchema, insertTriggerSchema, 
  insertActionSchema, insertActivityLogSchema 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { generateRuleSuggestions } from "./ai";
import { scheduler } from "./scheduler";
import { log } from "./vite";

/**
 * @swagger
 * tags:
 *   - name: Triggers
 *     description: API endpoints for managing triggers
 *   - name: Actions
 *     description: API endpoints for managing actions
 *   - name: Rules
 *     description: API endpoints for managing automation rules
 *   - name: Activity
 *     description: API endpoints for monitoring rule execution
 *   - name: Settings
 *     description: API endpoints for application configuration
 * 
 * components:
 *   schemas:
 *     Trigger:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the trigger
 *         name:
 *           type: string
 *           description: The name of the trigger
 *         description:
 *           type: string
 *           nullable: true
 *           description: A description of what the trigger does
 *         userType:
 *           type: string
 *           enum: [admin, security, maintenance, host, guest]
 *           description: User role category the trigger is for
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the trigger was created
 */

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with default data
  await (storage as any).seedInitialData();

  // ===== TRIGGER ENDPOINTS =====
  
  /**
   * @swagger
   * /triggers:
   *   get:
   *     summary: Retrieve a list of all triggers
   *     tags: [Triggers]
   *     responses:
   *       200:
   *         description: A list of triggers
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Trigger'
   *       500:
   *         description: Server error
   *   post:
   *     summary: Create a new trigger
   *     tags: [Triggers]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Trigger'
   *     responses:
   *       201:
   *         description: Trigger created successfully
   *       400:
   *         description: Invalid request body
   *       500:
   *         description: Server error
   * 
   * /triggers/{id}:
   *   get:
   *     summary: Get trigger by ID
   *     tags: [Triggers]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Trigger details
   *       404:
   *         description: Trigger not found
   *       500:
   *         description: Server error
   * 
   * /actions:
   *   get:
   *     summary: Retrieve a list of all actions
   *     tags: [Actions]
   *     responses:
   *       200:
   *         description: A list of actions
   *       500:
   *         description: Server error
   * 
   * /rules:
   *   get:
   *     summary: Retrieve all automation rules
   *     tags: [Rules]
   *     responses:
   *       200:
   *         description: A list of rules
   *       500:
   *         description: Server error
   * 
   * /rules/{id}/activity:
   *   get:
   *     summary: Get activity logs for a specific rule
   *     tags: [Activity]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Activity logs for the rule
   *       404:
   *         description: Rule not found
   *       500:
   *         description: Server error
   * 
   * /ai/generate-rule:
   *   post:
   *     summary: Generate rule suggestions using AI
   *     tags: [Rules]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               prompt:
   *                 type: string
   *     responses:
   *       200:
   *         description: AI-generated rule suggestions
   *       500:
   *         description: Server error
   */
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

      const now = new Date();
      let result;
      let status: 'success' | 'scheduled';

      if (rule.actionType === 'immediate') {
        // Execute the action immediately
        log(`Executing immediate action for rule ${rule.id}`, 'routes');
        result = await scheduler.triggerImmediateAction(rule.id);
        status = 'success';
      } else {
        // Schedule the action for later execution
        const scheduleDelay = rule.scheduleDelay || 0;
        const scheduledTime = new Date(now.getTime() + scheduleDelay * 60 * 1000);
        
        log(`Scheduling action for rule ${rule.id} at ${scheduledTime.toISOString()}`, 'routes');
        
        result = await scheduler.scheduleAction(rule.id, scheduleDelay, {
          triggerTime: now.toISOString(),
          rule: {
            name: rule.name,
            description: rule.description,
            actionDetails: rule.actionDetails
          }
        });
        
        status = 'scheduled';
      }

      // Return success message with execution details
      res.json({ 
        message: 'Rule triggered successfully', 
        rule: await storage.getRuleById(id),
        executionDetails: {
          status,
          executedAt: now,
          ...(status === 'scheduled' ? { 
            scheduledFor: result.scheduleTime 
          } : {})
        }
      });
    } catch (error) {
      console.error('Error triggering rule:', error);
      res.status(500).json({ 
        message: `Failed to trigger rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // ===== AI ENDPOINTS =====
  
  // Generate rule suggestions using AI
  app.post('/api/ai/generate-rule', async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          message: 'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.' 
        });
      }
      
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: 'Valid prompt is required' });
      }
      
      const suggestions = await generateRuleSuggestions(prompt);
      res.json(suggestions);
    } catch (error) {
      console.error('Error generating rule suggestions:', error);
      res.status(500).json({ 
        message: `Failed to generate rule suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // ===== SETTINGS ENDPOINTS =====
  
  /**
   * @swagger
   * /settings/openai-key-status:
   *   get:
   *     summary: Check if OpenAI API key is configured
   *     tags: [Settings]
   *     responses:
   *       200:
   *         description: Status of OpenAI API key configuration
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 hasKey:
   *                   type: boolean
   *                   description: Whether an OpenAI API key is configured
   */
  app.get('/api/settings/openai-key-status', async (req: Request, res: Response) => {
    try {
      // Check if OPENAI_API_KEY exists in the environment
      const hasKey = !!process.env.OPENAI_API_KEY;
      res.json({ hasKey });
    } catch (error) {
      console.error('Error checking OpenAI API key status:', error);
      res.status(500).json({ 
        message: 'Failed to check API key status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * @swagger
   * /settings/openai-key:
   *   post:
   *     summary: Update the OpenAI API key
   *     tags: [Settings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - apiKey
   *             properties:
   *               apiKey:
   *                 type: string
   *                 description: The OpenAI API key
   *     responses:
   *       200:
   *         description: API key updated successfully
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Server error
   */
  app.post('/api/settings/openai-key', async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ message: 'Valid API key is required' });
      }
      
      // Validate that the API key has the expected format
      if (!apiKey.startsWith('sk-') || apiKey.length < 30) {
        return res.status(400).json({ message: 'Invalid API key format' });
      }
      
      // In a production environment, this would be stored securely
      // For this demo, we're setting it to the environment variable
      process.env.OPENAI_API_KEY = apiKey;
      
      res.json({ success: true, message: 'API key updated successfully' });
    } catch (error) {
      console.error('Error updating OpenAI API key:', error);
      res.status(500).json({ 
        message: 'Failed to update API key',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
  
  // Get all activity logs with optional status filter
  app.get('/api/activity', async (req: Request, res: Response) => {
    try {
      const status = req.query.status as 'success' | 'failed' | 'scheduled' | 'canceled' | undefined;
      
      let logs;
      if (status) {
        logs = await storage.getActivityLogsByStatus(status);
      } else {
        // Get all logs from all statuses (would need to implement this in storage)
        logs = [
          ...(await storage.getActivityLogsByStatus('success')),
          ...(await storage.getActivityLogsByStatus('failed')),
          ...(await storage.getActivityLogsByStatus('scheduled'))
        ];
      }
      
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}