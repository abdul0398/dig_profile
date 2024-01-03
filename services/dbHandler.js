const mysql = require('mysql2/promise');
const {User,Client, Link, Profile, Form, Lead} = require("../models");

async function setupDb() {
    const pool = await mysql.createPool({
        host:process.env.db_HOST,
        user: process.env.db_USER,
        database: process.env.DB,
        password:process.env.db_PASS
    });
    Object.defineProperty(global, '__pool', {
        value: pool,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    console.log("#####  MYSQL Connection Established Successfully #####")
    await createTables();
}



async function createTables() {
    await __pool.query(User);
    await __pool.query(Client);
    await __pool.query(Profile);
    await __pool.query(Link);
    await __pool.query(Form);
    await __pool.query(Lead);
}


module.exports = setupDb;