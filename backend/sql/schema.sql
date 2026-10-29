CREATE DATABASE IF NOT EXISTS campaign_hub;
USE campaign_hub;

CREATE TABLE IF NOT EXISTS campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  status ENUM('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaigns_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  first_name VARCHAR(80) NULL,
  company VARCHAR(120) NULL,
  status ENUM('pending','sent','replied','bounced','unsubscribed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- data integrity: the same email can't be added twice to one campaign
  UNIQUE KEY uq_campaign_email (campaign_id, email),
  -- performance: stats and filtered lead listings hit this index
  INDEX idx_leads_campaign_status (campaign_id, status),
  CONSTRAINT fk_leads_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;
