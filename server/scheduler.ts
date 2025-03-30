import { storage } from './storage';
import { activityLogs } from '@shared/schema';
import { log } from './vite';

/**
 * Scheduler service for managing scheduled actions
 */
class SchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs = 10000; // Check every 10 seconds by default
  
  /**
   * Start the scheduler service
   */
  start(intervalMs?: number) {
    if (this.isRunning) {
      log('Scheduler is already running', 'scheduler');
      return;
    }
    
    if (intervalMs) {
      this.intervalMs = intervalMs;
    }
    
    log(`Starting scheduler service with interval of ${this.intervalMs}ms`, 'scheduler');
    
    this.isRunning = true;
    this.schedulerInterval = setInterval(() => this.processScheduledActions(), this.intervalMs);
    
    // Run immediately on start
    this.processScheduledActions();
  }
  
  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning || !this.schedulerInterval) {
      log('Scheduler is not running', 'scheduler');
      return;
    }
    
    log('Stopping scheduler service', 'scheduler');
    clearInterval(this.schedulerInterval);
    this.isRunning = false;
    this.schedulerInterval = null;
  }
  
  /**
   * Process any pending scheduled actions
   */
  private async processScheduledActions() {
    try {
      const pendingActions = await storage.getPendingScheduledActions();
      
      if (pendingActions.length === 0) {
        return;
      }
      
      log(`Processing ${pendingActions.length} scheduled actions`, 'scheduler');
      
      for (const action of pendingActions) {
        await this.executeAction(action.id);
      }
    } catch (error) {
      log(`Error processing scheduled actions: ${error}`, 'scheduler');
    }
  }
  
  /**
   * Schedule a new action for execution
   */
  async scheduleAction(ruleId: number, delayMinutes: number, details: Record<string, any> = {}) {
    const now = new Date();
    const scheduleTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
    
    log(`Scheduling action for rule ${ruleId} at ${scheduleTime.toISOString()}`, 'scheduler');
    
    // Create an activity log entry for the scheduled action
    const activityLog = await storage.createActivityLog({
      ruleId,
      status: 'scheduled',
      details,
      scheduleTime,
      triggeredAt: now,
    });
    
    return activityLog;
  }
  
  /**
   * Execute a scheduled action
   */
  private async executeAction(activityLogId: number) {
    try {
      // Get the activity log
      const logs = await storage.getActivityLogsByStatus('scheduled');
      const activityLog = logs.find(log => log.id === activityLogId);
      
      if (!activityLog) {
        log(`Activity log ${activityLogId} not found`, 'scheduler');
        return;
      }
      
      // Get the rule
      const rule = await storage.getRuleById(activityLog.ruleId);
      if (!rule) {
        // Rule may have been deleted, mark as failed
        await storage.markActivityLogAsExecuted(activityLogId, 'failed', {
          error: 'Rule not found',
          status: 'canceled'
        });
        return;
      }
      
      // Check if rule is active
      if (!rule.isActive) {
        await storage.markActivityLogAsExecuted(activityLogId, 'failed', {
          error: 'Rule is inactive',
          status: 'canceled'
        });
        return;
      }
      
      // Get the action
      const action = await storage.getActionById(rule.actionId);
      if (!action) {
        await storage.markActivityLogAsExecuted(activityLogId, 'failed', {
          error: 'Action not found'
        });
        return;
      }
      
      log(`Executing scheduled action for rule "${rule.name}" (ID: ${rule.id})`, 'scheduler');
      
      // MOCK EXECUTION: In a real application, we'd actually perform the action
      // based on action.name and rule.actionDetails
      const executionResult = await this.mockExecuteAction(action.name, rule.actionDetails);
      
      // Update rule's last triggered timestamp
      await storage.updateRuleLastTriggered(rule.id);
      
      // Update activity log
      await storage.markActivityLogAsExecuted(
        activityLogId,
        executionResult.success ? 'success' : 'failed',
        {
          ...activityLog.details,
          execution: executionResult
        }
      );
      
    } catch (error) {
      log(`Error executing action ${activityLogId}: ${error}`, 'scheduler');
      
      // Log the error
      await storage.markActivityLogAsExecuted(activityLogId, 'failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Mock execution of an action (for demo purposes)
   */
  private async mockExecuteAction(actionName: string, actionDetails: Record<string, any>) {
    // Simulate a slight delay for the action execution
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Randomly succeed or fail (90% success rate)
    const success = Math.random() > 0.1;
    
    // Generate a mock result based on the action type
    const mockResult: Record<string, any> = {
      success,
      executedAt: new Date().toISOString(),
    };
    
    if (success) {
      switch (actionName) {
        case 'Send email':
          mockResult.messageId = `msg_${Math.random().toString(36).substring(2, 10)}`;
          mockResult.recipient = actionDetails.recipient || 'default@example.com';
          mockResult.subject = actionDetails.subject || 'Notification';
          break;
          
        case 'Send Slack notification':
          mockResult.messageId = `slack_${Math.random().toString(36).substring(2, 10)}`;
          mockResult.channel = actionDetails.channel || '#general';
          break;
          
        case 'Create task':
          mockResult.taskId = `task_${Math.random().toString(36).substring(2, 10)}`;
          mockResult.taskName = actionDetails.taskName || 'New Task';
          mockResult.assignee = actionDetails.assignee || 'Unassigned';
          break;
          
        default:
          mockResult.actionResult = `Executed "${actionName}" successfully`;
      }
    } else {
      mockResult.error = `Mock failure: Could not execute "${actionName}"`;
      mockResult.errorCode = 'MOCK_ERROR';
    }
    
    return mockResult;
  }
  
  /**
   * Trigger an immediate action
   */
  async triggerImmediateAction(ruleId: number) {
    const rule = await storage.getRuleById(ruleId);
    if (!rule) {
      throw new Error(`Rule with ID ${ruleId} not found`);
    }
    
    if (!rule.isActive) {
      throw new Error(`Rule with ID ${ruleId} is inactive`);
    }
    
    const action = await storage.getActionById(rule.actionId);
    if (!action) {
      throw new Error(`Action with ID ${rule.actionId} not found`);
    }
    
    log(`Triggered immediate action for rule "${rule.name}" (ID: ${ruleId})`, 'scheduler');
    
    // Execute the action
    const executionResult = await this.mockExecuteAction(action.name, rule.actionDetails);
    
    // Create activity log entry with execution details
    const now = new Date();
    const executionStart = Date.now();
    const executionEnd = Date.now();
    const executionDuration = executionEnd - executionStart;
    
    // Create activity log with properly structured details
    const activityLog = await storage.createActivityLog({
      ruleId,
      status: executionResult.success ? 'success' : 'failed',
      triggeredAt: now,
      executedAt: now,
      executionDuration,
      details: {
        executedAt: now.toISOString(),
        triggerTime: now.toISOString(),
        actionName: action.name,
        executionResult
      }
    });
    
    // Update rule's last triggered timestamp
    await storage.updateRuleLastTriggered(rule.id);
    
    return activityLog;
  }
}

// Create a singleton instance
export const scheduler = new SchedulerService();