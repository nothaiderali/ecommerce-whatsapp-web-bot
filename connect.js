const { MongoClient } = require("mongodb");

// for localhost use "mongodb://0.0.0.0:27017"
const url = "mongodb://0.0.0.0:27017"; //process.env.DB
const dbclient = new MongoClient(url);

async function connectDB() {
  await dbclient.connect();
  return dbclient.db("whatsapp-service-bot");
}

module.exports = { connectDB, dbclient };
