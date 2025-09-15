const generateCode = require('./generateCode');

/**
 * Generates a unique code for a given Mongoose model and field.
 * It keeps generating codes until it finds one that doesn't already exist in the database.
 * @param {mongoose.Model} model The Mongoose model to check against (e.g., Quiz, Poll).
 * @param {string} field The field to check for uniqueness (e.g., 'code').
 * @returns {Promise<string>} A promise that resolves to a unique code.
 */
const generateUniqueCode = async (model, field) => {
  let code;
  let exists = true;
  while (exists) {
    code = generateCode();
    const query = { [field]: code };
    const existingDoc = await model.findOne(query);
    exists = !!existingDoc;
  }
  return code;
};

module.exports = generateUniqueCode;