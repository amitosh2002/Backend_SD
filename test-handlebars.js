import EmailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

// Test Handlebars template compilation
async function testHandlebarsTemplates() {
  console.log('🧪 Testing Handlebars Template Integration...\n');

  // Check if environment variables are set
  if (!process.env.FRONTEND_URL) {
    console.log('⚠️  FRONTEND_URL not set, using default values');
  }

  try {
    // Test 1: Test template compilation
    console.log('🔧 Test 1: Testing template compilation...');
    
    // Test verification OTP template
    const verificationData = {
      user_name: 'John Doe',
      otp_code: '123456',
      expiry_time: '10 minutes',
      verification_url: 'https://hora.com/verify?email=john@example.com&otp=123456',
      support_email: 'support@hora.com',
      app_url: 'https://hora.com',
      help_url: 'https://hora.com/help',
      contact_url: 'https://hora.com/contact',
      privacy_url: 'https://hora.com/privacy',
      twitter_url: 'https://twitter.com/hora',
      linkedin_url: 'https://linkedin.com/company/hora',
      github_url: 'https://github.com/hora',
      company_address: '123 Time Street, Productivity City, PC 12345'
    };

    try {
      const verificationHtml = EmailService.compileTemplate('verificationOTP', verificationData);
      console.log('✅ Verification OTP template compiled successfully!');
      console.log(`   HTML length: ${verificationHtml.length} characters`);
      console.log(`   Contains OTP: ${verificationHtml.includes('123456') ? 'Yes' : 'No'}`);
      console.log(`   Contains user name: ${verificationHtml.includes('John Doe') ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('❌ Verification OTP template compilation failed:', error.message);
    }

    console.log('');

    // Test 2: Test password reset OTP template
    console.log('🔧 Test 2: Testing password reset OTP template...');
    
    const resetData = {
      user_name: 'Jane Smith',
      otp_code: '789012',
      expiry_time: '10 minutes',
      reset_url: 'https://hora.com/reset?email=jane@example.com&otp=789012',
      support_email: 'support@hora.com',
      app_url: 'https://hora.com',
      help_url: 'https://hora.com/help',
      contact_url: 'https://hora.com/contact',
      privacy_url: 'https://hora.com/privacy',
      twitter_url: 'https://twitter.com/hora',
      linkedin_url: 'https://linkedin.com/company/hora',
      github_url: 'https://github.com/hora',
      company_address: '123 Time Street, Productivity City, PC 12345'
    };

    try {
      const resetHtml = EmailService.compileTemplate('resetPasswordOTP', resetData);
      console.log('✅ Password reset OTP template compiled successfully!');
      console.log(`   HTML length: ${resetHtml.length} characters`);
      console.log(`   Contains OTP: ${resetHtml.includes('789012') ? 'Yes' : 'No'}`);
      console.log(`   Contains user name: ${resetHtml.includes('Jane Smith') ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('❌ Password reset OTP template compilation failed:', error.message);
    }

    console.log('');

    // Test 3: Test ticket status template
    console.log('🔧 Test 3: Testing ticket status template...');
    
    const ticketData = {
      user_name: 'Bob Wilson',
      ticket_id: 'TKT-001',
      ticket_subject: 'Login Issue',
      ticket_status: 'In Progress',
      status_bg_color: '#3182ce',
      status_text_color: 'white',
      ticket_priority: 'High',
      last_updated: '2024-01-15 10:30:00',
      assigned_to: 'Support Team',
      latest_comment: 'Working on the issue',
      commenter_name: 'Support Agent',
      comment_time: '2024-01-15 10:30:00',
      ticket_url: 'https://hora.com/tickets/TKT-001',
      app_url: 'https://hora.com',
      help_url: 'https://hora.com/help',
      contact_url: 'https://hora.com/contact',
      privacy_url: 'https://hora.com/privacy',
      twitter_url: 'https://twitter.com/hora',
      linkedin_url: 'https://linkedin.com/company/hora',
      github_url: 'https://github.com/hora',
      company_address: '123 Time Street, Productivity City, PC 12345'
    };

    try {
      const ticketHtml = EmailService.compileTemplate('ticketStatus', ticketData);
      console.log('✅ Ticket status template compiled successfully!');
      console.log(`   HTML length: ${ticketHtml.length} characters`);
      console.log(`   Contains ticket ID: ${ticketHtml.includes('TKT-001') ? 'Yes' : 'No'}`);
      console.log(`   Contains status: ${ticketHtml.includes('In Progress') ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('❌ Ticket status template compilation failed:', error.message);
    }

    console.log('');
    console.log('🎉 Handlebars template testing completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Test the authentication endpoints');
    console.log('   3. Check your email for beautiful Handlebars templates!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testHandlebarsTemplates();
