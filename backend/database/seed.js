const { pool, initializeDatabase } = require('./db');

const features = [
  {
    name: 'Create Group',
    category: 'Groups',
    purpose: 'Admins can create groups inside an organization to organize members, share updates, and collaborate on church activities.',
    steps: ['Navigate to the Groups section', 'Click the "Create Group" button', 'Enter the group name and description', 'Set group visibility (Public or Private)', 'Assign moderators to the group', 'Click "Create" to finalize'],
    permissions: ['Admin', 'Global Admin'],
    keywords: 'create group new group add group make group groups section organize members',
    related_questions: ['How to assign moderators?', 'What is a private group?', 'Can members create groups?']
  },
  {
    name: 'Manage Group Members',
    category: 'Groups',
    purpose: 'Manage who is in a group — add members, remove members, or assign roles within the group.',
    steps: ['Open the group you want to manage', 'Go to the "Members" tab', 'Click "Add Members" to invite people', 'Select members from the organization list', 'To remove, click on a member and select "Remove"', 'To assign moderator role, select "Make Moderator"'],
    permissions: ['Admin', 'Group Moderator'],
    keywords: 'manage members add members remove members group members invite members moderator assign',
    related_questions: ['Who can add members?', 'How to make someone a moderator?']
  },
  {
    name: 'Prayer Requests',
    category: 'Prayer & Devotions',
    purpose: 'Members can submit prayer requests within groups. Other members can pray for and respond to these requests, building a supportive community.',
    steps: ['Open a group', 'Navigate to the "Prayer Requests" section', 'Click "New Prayer Request"', 'Enter your prayer title and description', 'Choose visibility (group only or public)', 'Submit the request', 'Other members can click "Pray" or leave a comment'],
    permissions: ['Member', 'Moderator', 'Admin'],
    keywords: 'prayer request pray devotion submit prayer create prayer request prayer support intercession',
    related_questions: ['Can non-members see prayer requests?', 'How to respond to a prayer request?']
  },
  {
    name: 'Events Management',
    category: 'Events',
    purpose: 'Create and manage church events like services, meetings, workshops, and special programs. Members can view events and RSVP.',
    steps: ['Go to the Events section', 'Click "Create Event"', 'Enter event title, description, date, and time', 'Set event location (physical or virtual)', 'Add event category (Sermon, Workshop, Meeting, etc.)', 'Set RSVP options', 'Publish the event'],
    permissions: ['Admin', 'Global Admin'],
    keywords: 'events create event sermon service meeting workshop schedule calendar church events rsvp',
    related_questions: ['How to edit an existing event?', 'Can members create events?', 'How to send event reminders?']
  },
  {
    name: 'Member Directory',
    category: 'Members',
    purpose: 'View and manage all members of the organization. Admins can see member profiles, roles, and activity status.',
    steps: ['Navigate to the Members section', 'Browse the member list or use search', 'Click on a member to view their profile', 'View their role, groups, and activity', 'Admins can edit roles or remove members'],
    permissions: ['Admin', 'Global Admin'],
    keywords: 'members directory member list view members search members profiles member management',
    related_questions: ['How to change a member\'s role?', 'How to deactivate a member?']
  },
  {
    name: 'Invite Members',
    category: 'Members',
    purpose: 'Invite new people to join the organization. Invitations can be sent via email, link, or QR code.',
    steps: ['Go to Members section', 'Click "Invite Members"', 'Choose invitation method: Email, Link, or QR Code', 'For email: enter email addresses', 'For link: copy and share the invite link', 'For QR: download and share the QR code', 'Invited users join by clicking the link or scanning QR'],
    permissions: ['Admin', 'Global Admin'],
    keywords: 'invite members invitation join invite email link qr code add new members onboard',
    related_questions: ['Can members invite others?', 'How to revoke an invitation?']
  },
  {
    name: 'Announcements',
    category: 'Communication',
    purpose: 'Send important announcements to all members or specific groups. Announcements appear prominently in the app.',
    steps: ['Go to the Announcements section', 'Click "Create Announcement"', 'Enter title and message', 'Choose audience: All members or specific groups', 'Add attachments if needed', 'Click "Publish"'],
    permissions: ['Admin', 'Global Admin'],
    keywords: 'announcement announcements broadcast message notify notification communicate news updates',
    related_questions: ['Can moderators create announcements?', 'How to schedule announcements?']
  },
  {
    name: 'Donations & Tithes',
    category: 'Finance',
    purpose: 'Manage church donations and tithes. Members can give online, and admins can track all financial contributions.',
    steps: ['Members: Go to Giving section', 'Select donation type (Tithe, Offering, Special)', 'Enter amount', 'Choose payment method', 'Complete the transaction', 'Admins: View donation reports in Finance section'],
    permissions: ['Member', 'Admin', 'Global Admin'],
    keywords: 'donation tithe offering give money finance payment contribute giving church fund',
    related_questions: ['Is online giving secure?', 'How to view donation history?', 'Can I set up recurring donations?']
  },
  {
    name: 'Messaging & Chat',
    category: 'Communication',
    purpose: 'Send direct messages or group chats within the platform. Communicate privately with other members.',
    steps: ['Go to Messages section', 'Click "New Message"', 'Search and select a member', 'Type your message', 'Send the message', 'For group chat: click "New Group Chat" and add members'],
    permissions: ['Member', 'Moderator', 'Admin'],
    keywords: 'message chat direct message dm inbox conversation group chat communicate talk',
    related_questions: ['Can I block someone?', 'How to create a group chat?', 'Are messages encrypted?']
  },
  {
    name: 'Organization Settings',
    category: 'Administration',
    purpose: 'Configure your organization profile, branding, and general settings like name, logo, contact info, and timezone.',
    steps: ['Go to Settings', 'Click "Organization Settings"', 'Update organization name and description', 'Upload organization logo', 'Set contact information', 'Configure timezone and language preferences', 'Save changes'],
    permissions: ['Global Admin'],
    keywords: 'settings organization config configure profile branding logo name timezone admin setup',
    related_questions: ['Who can access settings?', 'How to change the organization logo?']
  }
];

const faqs = [
  { question: 'How do I create a new group?', answer: 'Go to the Groups section, click "Create Group", fill in the details like name and description, set visibility, assign moderators, and click Create. Only Admins and Global Admins can create groups.', category: 'Groups', keywords: 'create group new group add group' },
  { question: 'Why can\'t I create a group?', answer: 'Only Admins and Global Admins have permission to create groups. If you are a regular member, you need to contact your organization admin to either create a group for you or upgrade your role.', category: 'Groups', keywords: 'cannot create group permission denied member role' },
  { question: 'How do I invite members to my church?', answer: 'Go to the Members section, click "Invite Members". You can invite via Email, shareable Link, or QR Code. Share the invite link or QR code with people you want to join. They simply click the link or scan the code to join your organization.', category: 'Members', keywords: 'invite members add people join church onboard' },
  { question: 'How do I reset my password?', answer: 'On the login screen, click "Forgot Password". Enter your registered email address. You will receive a password reset link via email. Click the link and set a new password. If you don\'t receive the email, check your spam folder.', category: 'Account', keywords: 'reset password forgot password change password login issue' },
  { question: 'What roles exist in Ark Connect?', answer: 'There are 4 main roles: 1) Global Admin — full control over the organization, 2) Admin — can manage most features, 3) Moderator — manages specific groups, 4) Member — basic access to view and participate. Each role has different permissions.', category: 'Permissions', keywords: 'roles permissions admin moderator member global admin access' },
  { question: 'How do prayer requests work?', answer: 'Any member can create a prayer request within a group. Go to the group, open Prayer Requests, and submit your prayer. Other members can click "Pray" to show support or leave encouraging comments. Prayer requests can be set to visible within the group only or publicly.', category: 'Prayer & Devotions', keywords: 'prayer request how pray support devotion' },
  { question: 'Can I use Ark Connect in my language?', answer: 'Yes! Ark Connect supports multiple languages. You can change your language preference in Settings. The AI assistant can also respond in any language you type in — Tamil, Spanish, Hindi, or any other language.', category: 'General', keywords: 'language multilingual translation tamil hindi spanish' },
  { question: 'How to create an event?', answer: 'Go to the Events section, click "Create Event". Fill in the title, description, date, time, and location. Choose the event type (Sermon, Workshop, Meeting, etc.) and set RSVP options. Click Publish to make it visible to members.', category: 'Events', keywords: 'create event add event new event schedule' },
  { question: 'How do I manage donations?', answer: 'Members can give tithes and offerings through the Giving section. Select the type of donation, enter the amount, and complete the payment. Admins can view all donation reports and financial summaries in the Finance section.', category: 'Finance', keywords: 'donation tithe offering give money finance' },
  { question: 'Is my data secure?', answer: 'Yes. Ark Connect uses industry-standard encryption for all data. Your personal information, messages, and financial transactions are protected. We follow best practices for data security and privacy.', category: 'Security', keywords: 'security data privacy safe encryption protection' },
  { question: 'How to contact support?', answer: 'You can use this AI assistant for most questions. For issues the assistant cannot resolve, go to Settings > Help & Support > Contact Us. You can also email our support team directly.', category: 'Support', keywords: 'support help contact us issue problem' },
  { question: 'How do I set up my church on Ark Connect?', answer: 'Follow the Church Onboarding process: 1) Sign up as an organization admin, 2) Go to Organization Setup, 3) Enter your church name, address, and details, 4) Upload verification documents, 5) Invite your admins and members. The platform will guide you through each step.', category: 'Onboarding', keywords: 'setup church onboard organization register create church new church' },
  { question: 'What is the difference between Admin and Global Admin?', answer: 'Global Admin has the highest level of access — they can manage organization settings, billing, and all admin functions. Regular Admins can manage most day-to-day operations like creating groups, events, and managing members, but cannot access billing or organization-level settings.', category: 'Permissions', keywords: 'admin global admin difference role permission access' },
  { question: 'How do I send an announcement?', answer: 'Go to Announcements, click "Create Announcement", enter your title and message, choose the audience (all members or specific groups), add any attachments, and click Publish. The announcement will appear prominently for all selected recipients.', category: 'Communication', keywords: 'announcement create send broadcast notify' }
];

const onboardingSteps = [
  { flow: 'Church Onboarding', step: 1, title: 'Create Your Account', description: 'Sign up on Ark Connect with your email address. Verify your email to activate your account. You will be the Global Admin of your organization.', requirements: 'Valid email address' },
  { flow: 'Church Onboarding', step: 2, title: 'Set Up Organization', description: 'Enter your church/organization name, address, phone number, and a brief description. Upload your church logo for branding.', requirements: 'Church name, address, logo image' },
  { flow: 'Church Onboarding', step: 3, title: 'Upload Verification Documents', description: 'Upload your organization\'s verification documents such as registration certificate or church incorporation papers. This helps verify your organization\'s authenticity.', requirements: 'Registration certificate or incorporation document' },
  { flow: 'Church Onboarding', step: 4, title: 'Configure Settings', description: 'Set your timezone, language preferences, and notification settings. Configure your organization\'s privacy and security preferences.', requirements: null },
  { flow: 'Church Onboarding', step: 5, title: 'Add Admin Team', description: 'Invite your leadership team as Admins. They will help manage the platform. Go to Members > Invite and assign them the Admin role.', requirements: 'Admin email addresses' },
  { flow: 'Church Onboarding', step: 6, title: 'Create Groups', description: 'Set up your church groups like Youth Group, Worship Team, Bible Study, etc. Assign moderators to each group to manage daily activities.', requirements: null },
  { flow: 'Church Onboarding', step: 7, title: 'Invite Members', description: 'Share the invite link or QR code with your congregation. Members can join by clicking the link or scanning the QR code from their phone.', requirements: null },
  { flow: 'Church Onboarding', step: 8, title: 'Start Using!', description: 'Your church is now set up! Start creating events, sharing announcements, and building your community on Ark Connect.', requirements: null },
  { flow: 'Member Onboarding', step: 1, title: 'Join Organization', description: 'Click the invitation link or scan the QR code shared by your church admin. This will open the Ark Connect signup page.', requirements: 'Invitation link or QR code' },
  { flow: 'Member Onboarding', step: 2, title: 'Create Your Profile', description: 'Enter your name, email, and create a password. Add a profile picture. Fill in any required information your church has set up.', requirements: 'Name, email, password' },
  { flow: 'Member Onboarding', step: 3, title: 'Join Groups', description: 'Browse available groups in your organization and join the ones relevant to you. Some groups may require admin approval.', requirements: null },
  { flow: 'Member Onboarding', step: 4, title: 'Explore Features', description: 'Check out Events for upcoming activities, Prayer Requests to support others, Messages to connect with members, and Announcements for important updates.', requirements: null }
];

const rolesPermissions = [
  {
    role: 'Global Admin',
    description: 'The highest authority in the organization. Full control over all settings, members, and features. Typically the church pastor or main administrator.',
    capabilities: ['Manage organization settings', 'Manage billing and subscriptions', 'Create and manage all admins', 'Access all features', 'View analytics and reports', 'Delete organization', 'Manage security settings']
  },
  {
    role: 'Admin',
    description: 'Organization-level administrator. Can manage most features and members but cannot access billing or organization-level settings.',
    capabilities: ['Create and manage groups', 'Create and manage events', 'Invite and manage members', 'Create announcements', 'View reports', 'Manage moderators', 'Access member directory']
  },
  {
    role: 'Moderator',
    description: 'Group-level manager. Responsible for managing activities within assigned groups.',
    capabilities: ['Manage posts in assigned groups', 'Manage prayer requests', 'Approve group join requests', 'Remove group members', 'Pin important posts', 'Manage group settings']
  },
  {
    role: 'Member',
    description: 'Regular member of the organization. Can participate in groups, events, and community activities.',
    capabilities: ['View and join public groups', 'Create prayer requests', 'RSVP to events', 'Send messages', 'View announcements', 'Make donations', 'Update own profile']
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  // Initialize tables
  await initializeDatabase();

  const client = await pool.connect();
  try {
    // Clear existing data
    await client.query('TRUNCATE features, faqs, onboarding_steps, roles_permissions RESTART IDENTITY CASCADE');
    console.log('🗑️  Cleared existing data');

    // Seed features
    for (const f of features) {
      await client.query(
        'INSERT INTO features (name, category, purpose, steps, permissions, keywords, related_questions) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [f.name, f.category, f.purpose, JSON.stringify(f.steps), JSON.stringify(f.permissions), f.keywords, JSON.stringify(f.related_questions)]
      );
    }
    console.log(`✅ Seeded ${features.length} features`);

    // Seed FAQs
    for (const faq of faqs) {
      await client.query(
        'INSERT INTO faqs (question, answer, category, keywords) VALUES ($1, $2, $3, $4)',
        [faq.question, faq.answer, faq.category, faq.keywords]
      );
    }
    console.log(`✅ Seeded ${faqs.length} FAQs`);

    // Seed onboarding steps
    for (const step of onboardingSteps) {
      await client.query(
        'INSERT INTO onboarding_steps (flow_name, step_number, title, description, requirements) VALUES ($1, $2, $3, $4, $5)',
        [step.flow, step.step, step.title, step.description, step.requirements]
      );
    }
    console.log(`✅ Seeded ${onboardingSteps.length} onboarding steps`);

    // Seed roles
    for (const role of rolesPermissions) {
      await client.query(
        'INSERT INTO roles_permissions (role_name, description, capabilities) VALUES ($1, $2, $3)',
        [role.role, role.description, JSON.stringify(role.capabilities)]
      );
    }
    console.log(`✅ Seeded ${rolesPermissions.length} roles\n`);

    console.log('🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DB: ark_connect_assistant');
    console.log('Port: 5433');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Seed error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
