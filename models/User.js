const User = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin') DEFAULT 'admin',
    status ENUM('active', 'inactive') DEFAULT 'active',
    hashed_password BLOB,
    salt BLOB,
    isVerified BOOLEAN DEFAULT FALSE,
    verificationToken VARCHAR(255),
    resetPasswordToken VARCHAR(255),
    resetPasswordExpires VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`
module.exports = User;