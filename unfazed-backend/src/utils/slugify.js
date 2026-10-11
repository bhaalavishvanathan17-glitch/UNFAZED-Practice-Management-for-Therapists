const Therapist = require('../models/Therapist');

/**
 * Generates a clean URL slug from a name and ensures uniqueness.
 * Examples: "Dr. Ananya Sharma" -> "dr-ananya-sharma"
 * If "dr-ananya-sharma" exists, appends numbers like "dr-ananya-sharma-2"
 */
const generateUniqueSlug = async (name, currentTherapistId = null) => {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .replace(/[\s_-]+/g, '-')  // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');   // trim hyphens

  if (!baseSlug) {
    baseSlug = 'therapist';
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Therapist.findOne({ slug });
    // If not found, or found the exact therapist we're currently updating, it's valid
    if (!existing || (currentTherapistId && existing._id.toString() === currentTherapistId.toString())) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

module.exports = {
  generateUniqueSlug,
};
