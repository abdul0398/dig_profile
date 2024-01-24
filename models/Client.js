const Client = `
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  hashed_password BLOB DEFAULT NULL,
  salt BLOB DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  role ENUM('user') DEFAULT 'user',
  isVerified BOOLEAN DEFAULT FALSE,
  verificationToken VARCHAR(255),
  resetPasswordToken VARCHAR(255),
  resetPasswordExpires VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (email)

);
`;
const Profile = `
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  profile_img_path VARCHAR(255),
  description VARCHAR(255),
  appointment_hidden BOOLEAN DEFAULT FALSE,
  lead_hidden  BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  client_id INT NOT NULL,
  template_selected INT DEFAULT 1,
  section_ordering JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
`;

const Section = `
CREATE TABLE IF NOT EXISTS sections(
  id INT AUTO_INCREMENT PRIMARY KEY,
  heading VARCHAR(255),
  hidden BOOLEAN DEFAULT FALSE,
  type VARCHAR(255) DEFAULT 'dynamic',
  isDynamic BOOLEAN DEFAULT FALSE,
  permanent BOOLEAN DEFAULT TRUE,
  profileId int NOT NULL,
  FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
);
`
const Link = `
CREATE TABLE IF NOT EXISTS links(
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(255),
  name VARCHAR(255),
  link VARCHAR(255) DEFAULT '#',
  hidden BOOLEAN DEFAULT FALSE,
  disabled BOOLEAN DEFAULT FALSE,
  permanent BOOLEAN DEFAULT TRUE,
  sectionId int NOT NULL,
  FOREIGN KEY (sectionId) REFERENCES sections(id) ON DELETE CASCADE
);
`

module.exports = {Client, Profile, Link, Section}
