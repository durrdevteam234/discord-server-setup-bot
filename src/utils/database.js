const mongoose = require('mongoose');

// Generic schema matching your collection framework
const genericSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, 
    value: { type: mongoose.Schema.Types.Mixed, required: true }, 
  },
  { collection: undefined, strict: false } 
);

// Cache models per collection name
const modelCache = {};

function getModel(fileName) {
  const collectionName = fileName.replace(/\.json$/i, '');
  if (!modelCache[collectionName]) {
    modelCache[collectionName] = mongoose.model(
      collectionName,
      genericSchema,
      collectionName 
    );
  }
  return modelCache[collectionName];
}

async function readData(fileName) {
  try {
    const Model = getModel(fileName);
    const docs = await Model.find().lean();
    const result = {};
    for (const doc of docs) {
      result[doc._id] = doc.value;
    }
    return result;
  } catch (error) {
    console.error(`Error reading ${fileName} from MongoDB:`, error.message);
    return {};
  }
}

async function writeData(fileName, data) {
  try {
    const Model = getModel(fileName);
    const keys = Object.keys(data);

    const bulkOps = keys.map((key) => ({
      updateOne: {
        filter: { _id: key },
        update: { $set: { value: data[key] } },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Model.bulkWrite(bulkOps);
    }
    await Model.deleteMany({ _id: { $nin: keys } });
  } catch (error) {
    console.error(`Error writing to ${fileName} in MongoDB:`, error.message);
  }
}

// AUTOMATIC COMPATIBILITY PATCH:
// This function intercepts "database.findOne()" from your old code and handles it safely
async function findOne(query = {}) {
  try {
    // Try to safely deduce which collection is requested from query fields, defaulting to 'levels'
    const targetCollection = query.collectionName || 'levels'; 
    const targetId = query.userId || query.guildId || query._id || Object.values(query)[0];

    if (!targetId) return null;

    const Model = getModel(targetCollection);
    const doc = await Model.findOne({ _id: String(targetId) }).lean();
    
    // Return a structured fallback object containing your inner value variables
    return doc ? { ...doc, ...doc.value } : null;
  } catch (error) {
    console.error("Error running global database compatibility findOne routine:", error.message);
    return null;
  }
}

// Export the new global fallback along with your existing schema methods
module.exports = { readData, writeData, getModel, findOne };
