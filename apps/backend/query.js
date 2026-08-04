require('dotenv').config();
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => client.query('SELECT name, "githubUrl" FROM "Project"')).then(res => { 
  console.log(res.rows); 
  client.end(); 
}).catch(console.error);
