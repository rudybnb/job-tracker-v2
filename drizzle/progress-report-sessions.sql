-- Progress Report Conversation Sessions
-- Tracks multi-step conversation state for each contractor

CREATE TABLE IF NOT EXISTS progressReportSessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chatId VARCHAR(50) NOT NULL UNIQUE,
  contractorId INT,
  step VARCHAR(50) NOT NULL DEFAULT 'idle',
  
  -- Collected data
  workCompleted TEXT,
  progressPercentage INT,
  issues TEXT,
  materials TEXT,
  
  -- Metadata
  startedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP,
  
  INDEX idx_chatId (chatId),
  INDEX idx_step (step),
  INDEX idx_expiresAt (expiresAt)
);
