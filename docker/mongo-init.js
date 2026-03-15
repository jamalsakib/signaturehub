// MongoDB initialization — creates indexes and a default admin user seed
db = db.getSiblingDB('email_signature_platform');

// Create indexes
db.users.createIndex({ azureId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ department: 1, businessUnit: 1 });

db.signaturetemplates.createIndex({ businessUnit: 1, isActive: 1 });
db.campaigns.createIndex({ businessUnit: 1, status: 1, startDate: 1, endDate: 1 });
db.rules.createIndex({ priority: 1, isActive: 1 });
db.clickevents.createIndex({ campaign: 1, createdAt: -1 });

print('MongoDB initialized: indexes created');
