const Lead = `
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  profileId INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  booking TIMESTAMP DEFAULT NULL,
  questions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
);
`

module.exports = {Lead}
