const Form = `CREATE TABLE IF NOT EXISTS form (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    profileId INT NOT NULL,
    questions JSON,
    discords JSON,
    emails JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
);`


module.exports = Form;