import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

/**
 * Configure Swagger documentation for the API
 * @param app Express application instance
 */
export function setupSwagger(app: Express) {
  const options = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'Automation Rules API',
        version: '1.0.0',
        description: 'RESTful API for managing business automation rules',
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: '/api',
          description: 'API Server',
        },
      ],
      components: {
        schemas: {
          UserType: {
            type: 'string',
            enum: ['admin', 'security', 'maintenance', 'host', 'guest'],
            description: 'User role category for organizing automation rules',
          },
          Trigger: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the trigger',
              },
              name: {
                type: 'string',
                description: 'Name of the trigger',
              },
              description: {
                type: 'string',
                nullable: true,
                description: 'Description of the trigger',
              },
              userType: {
                $ref: '#/components/schemas/UserType',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
              },
            },
          },
          Action: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the action',
              },
              name: {
                type: 'string',
                description: 'Name of the action',
              },
              description: {
                type: 'string',
                nullable: true,
                description: 'Description of the action',
              },
              userType: {
                $ref: '#/components/schemas/UserType',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
              },
            },
          },
          Rule: {
            type: 'object',
            required: ['id', 'name', 'triggerId', 'actionId', 'actionType'],
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the rule',
              },
              name: {
                type: 'string',
                description: 'Name of the rule',
              },
              description: {
                type: 'string',
                nullable: true,
                description: 'Description of the rule',
              },
              triggerId: {
                type: 'integer',
                description: 'ID of the associated trigger',
              },
              actionId: {
                type: 'integer',
                description: 'ID of the associated action',
              },
              triggerConditions: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Additional conditions for trigger activation',
              },
              actionType: {
                type: 'string',
                enum: ['immediate', 'scheduled'],
                description: 'Whether the action runs immediately or is scheduled',
              },
              actionDetails: {
                type: 'object',
                description: 'Custom details for action execution',
              },
              scheduleDelay: {
                type: 'integer',
                description: 'Delay in minutes for scheduled actions',
              },
              userType: {
                $ref: '#/components/schemas/UserType',
              },
              isActive: {
                type: 'boolean',
                description: 'Whether the rule is currently active',
              },
              lastTriggered: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Last time the rule was triggered',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
              },
            },
          },
          ActivityLog: {
            type: 'object',
            required: ['id', 'ruleId', 'triggeredAt', 'status'],
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the activity log',
              },
              ruleId: {
                type: 'integer',
                description: 'ID of the rule that was triggered',
              },
              triggeredAt: {
                type: 'string',
                format: 'date-time',
                description: 'When the rule was triggered',
              },
              status: {
                type: 'string',
                enum: ['success', 'failed', 'scheduled', 'canceled'],
                description: 'Status of the action execution',
              },
              details: {
                type: 'object',
                description: 'Additional details about the execution',
              },
              scheduleTime: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'When a scheduled action will execute',
              },
              executedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'When the action was actually executed',
              },
              executionDuration: {
                type: 'integer',
                nullable: true,
                description: 'Duration of execution in milliseconds',
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message',
              },
              status: {
                type: 'integer',
                description: 'HTTP status code',
              },
            },
          },
        },
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./server/routes.ts'], // Path to the API routes
  };

  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  
  console.log('Swagger API documentation available at /api-docs');
}