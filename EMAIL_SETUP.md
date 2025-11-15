# Email Setup Guide

This guide explains how to set up and use the email functionality in your backend application.

## Prerequisites

1. **Gmail Account**: You'll need a Gmail account to send emails
2. **App Password**: Generate an app password for your Gmail account (don't use your regular password)

## Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# Test email for testing the email service
TEST_EMAIL=test@example.com
```

## Gmail App Password Setup

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled
4. Go to App passwords
5. Generate a new app password for "Mail"
6. Use this generated password as your `EMAIL_PASSWORD`

## API Endpoints

### Test Email

- **GET** `/api/email/test` - Send a test email to verify the service is working

### Send Simple Email

- **POST** `/api/email/send`
- **Body**: `{ "to": "recipient@example.com", "subject": "Subject", "text": "Plain text", "html": "<h1>HTML content</h1>" }`

### Send Welcome Email

- **POST** `/api/email/welcome`
- **Body**: `{ "to": "user@example.com", "username": "John Doe" }`

### Send Ticket Notification

- **POST** `/api/email/ticket-notification`
- **Body**: `{ "to": "user@example.com", "ticketId": "TICKET-001", "ticketTitle": "Bug Report", "status": "In Progress" }`

### Send Project Assignment

- **POST** `/api/email/project-assignment`
- **Body**: `{ "to": "user@example.com", "projectName": "Website Redesign", "role": "Developer" }`

### Send Password Reset

- **POST** `/api/email/password-reset`
- **Body**: `{ "to": "user@example.com", "resetToken": "abc123..." }`

### Send Bulk Emails

- **POST** `/api/email/bulk`
- **Body**: `{ "recipients": ["user1@example.com", "user2@example.com"], "subject": "Newsletter", "text": "Content", "html": "<h1>Content</h1>" }`

## Usage Examples

### Testing the Email Service

```bash
curl -X GET http://localhost:8000/api/email/test
```

### Sending a Welcome Email

```bash
curl -X POST http://localhost:8000/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "username": "John Doe"
  }'
```

### Sending a Simple Email

```bash
curl -X POST http://localhost:8000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from Backend",
    "text": "This is a plain text email",
    "html": "<h1>Hello!</h1><p>This is an HTML email.</p>"
  }'
```

## Integration with Existing Controllers

You can now integrate email functionality into your existing controllers:

```javascript
import EmailService from '../services/emailService.js';

// In your project controller
static async createProject(req, res) {
  try {
    // ... create project logic ...

    // Send notification email
    await EmailService.sendProjectAssignment(
      userEmail,
      projectName,
      userRole
    );

    res.status(201).json({ success: true, project });
  } catch (error) {
    // ... error handling ...
  }
}
```

## Troubleshooting

1. **Authentication Error**: Make sure you're using an app password, not your regular Gmail password
2. **Connection Error**: Check if your Gmail account has 2FA enabled
3. **Email Not Sent**: Check the console logs for detailed error messages
4. **CORS Issues**: Ensure your frontend domain is in the allowed origins list

## Security Notes

- Never commit your `.env` file to version control
- Use app passwords instead of regular passwords
- Consider rate limiting for email endpoints in production
- Validate email addresses on the frontend and backend
