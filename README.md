# AutomationMaster: Business Automation Rules Platform

A powerful web application for creating, managing, and automating business workflows through an intuitive rule-based interface with AI-assisted rule creation and comprehensive monitoring capabilities.

## Features

- **Rule-Based Automation**: Create automation rules with triggers and actions
- **AI-Powered Rule Creation**: Use natural language to describe rules and get intelligent suggestions
- **Scheduled Actions**: Support for both immediate and time-delayed actions
- **Activity Monitoring**: Track execution of automation rules with detailed logs
- **User-Type Categorization**: Organize rules by user roles (Admin, Security, Maintenance, Host, Guest)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: 
  - React with TypeScript
  - TailwindCSS and ShadcnUI for styling
  - React Query for data fetching
  - React Hook Form for form handling

- **Backend**:
  - Node.js/Express API server
  - PostgreSQL database with Drizzle ORM
  - OpenAI integration for AI capabilities
  - Scheduler service for delayed actions

## API Documentation

The API is documented using Swagger. When the application is running, you can access the API documentation at:

```
/api-docs
```

This provides a complete reference of all available endpoints, request/response formats, and testing capabilities.

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- OpenAI API key (for AI-based rule creation)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/automationmaster.git
   cd automationmaster
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/automationmaster"
   OPENAI_API_KEY="your-openai-api-key"
   ```

4. Initialize the database:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Project Structure

- `/client`: React frontend
  - `/src/components`: Reusable UI components
  - `/src/pages`: Application pages
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions

- `/server`: Node.js backend
  - `/routes.ts`: API endpoints
  - `/storage.ts`: Data access layer
  - `/scheduler.ts`: Scheduler service
  - `/ai.ts`: OpenAI integration

- `/shared`: Code shared between frontend and backend
  - `/schema.ts`: Database schema and type definitions

## License

This project is licensed under the MIT License - see the LICENSE file for details.
