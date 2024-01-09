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
  phone VARCHAR(255),
  fb_link VARCHAR(255),
  insta_link VARCHAR(255),
  personal_link VARCHAR(255),
  linkedin_link VARCHAR(255),
  views INT DEFAULT 0,
  client_id INT NOT NULL,
  template_selected INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
`;

const Link = `
CREATE TABLE IF NOT EXISTs links(
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(10),
  link TEXT,
  name VARCHAR(255),
  click_count INT DEFAULT 0,
  heading VARCHAR(255),
  sort_order INT,
  profilesId int NOT NULL,
  FOREIGN KEY (profilesId) REFERENCES profiles(id) ON DELETE CASCADE
);
`


module.exports = {Client, Profile, Link}
