You are a senior full-stack software architect and developer.

I want to build an internal enterprise email signature management platform that integrates with Microsoft 365 (Exchange Online) and replaces third-party tools like CodeTwo or Exclaimer.

Goal:
Develop a centralized email signature system that dynamically generates signatures for users based on Azure AD attributes and business unit branding.

Environment:
- Microsoft 365 / Exchange Online
- Azure AD (Entra ID)
- Microsoft Graph API
- Node.js backend
- React frontend
- MongoDB database
- Azure Functions or Docker deployment

System Requirements:

1. User Data Integration
- Pull user attributes from Microsoft Graph API
- Sync attributes such as:
  - displayName
  - jobTitle
  - department
  - company
  - phone
  - officeLocation
  - email
- Store synced user data in MongoDB.

2. Signature Template Engine
Create an HTML template engine that supports dynamic placeholders such as:

{{displayName}}
{{jobTitle}}
{{department}}
{{phone}}
{{email}}

Allow multiple signature templates.

3. Multi-Business Branding
Support multiple brands/business units.

Each business should have:
- Logo
- Signature template
- Banner campaigns
- Social media links

Example structure:

Business Unit
- Retail
- Shopping Malls
- Corporate
- Hospitality

Each business can have a different signature design.

4. Banner Campaign Engine
Allow marketing teams to schedule banner campaigns.

Campaign properties:
- campaign name
- business unit
- banner image URL
- start date
- end date
- redirect link

Rules:
If the campaign date is active, show the banner in the email signature.

5. Signature Rule Engine
Automatically assign signature templates based on:

- business unit
- department
- email domain
- group membership

Example:

IF department = "Retail"
Apply Retail signature template

IF department = "Corporate"
Apply Corporate template

6. Outlook Integration
Provide 2 deployment options:

Option 1:
Outlook Web Add-in that automatically inserts the correct signature when composing emails.

Option 2:
API endpoint that generates the signature HTML for Outlook clients.

7. Admin Dashboard
Create an admin portal with the following capabilities:

- Manage users
- Create signature templates
- Upload logos
- Upload marketing banners
- Configure business units
- Schedule campaigns
- Assign templates to groups
- Preview signatures
- View campaign analytics

8. Database Design

Collections should include:

users
business_units
signature_templates
campaigns
rules
assets

9. Security

Implement:
- Microsoft OAuth authentication
- Role based access (Admin / Marketing / Viewer)
- Secure Graph API token handling

10. Deployment

Prepare deployment options:

- Azure Functions
- Docker container
- Azure App Service

Provide infrastructure architecture.

11. Bonus Features

If possible include:
- Banner click tracking
- Signature preview generator
- Signature testing tool
- QR code generator
- Social media icons
- Multi-language signatures

Deliverables:

- Full system architecture
- Folder structure
- Backend API code (Node.js / Express)
- MongoDB schema
- React admin dashboard
- Outlook Add-in code
- Deployment instructions
- Setup guide

The system must be scalable for 5,000+ Microsoft 365 users.

Make the code modular, well documented, and production ready.